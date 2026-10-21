#!/usr/bin/env python3
"""Submit an H3 prompt + reference images to autodl.art workflow minimax_h3_zm_u24.

Default is dry-run. Only --submit spends money.
"""
import argparse
import base64
import html
import json
import mimetypes
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://autodl.art"
WORKFLOW = "minimax_h3_zm_u24"
SUBMIT_URL = f"{BASE}/api/v1/comfyui/comfyui_workflow/{WORKFLOW}"
RESULT_URL = f"{BASE}/api/v1/comfyui/comfyui_workflow/result/"

RESOLUTIONS = ["480p竖", "768p竖", "480p横", "768p横", "480p(1:1)", "768p(1:1)"]
PRICE_PER_SEC = {"480p": 0.04, "768p": 0.06}  # 文生视频牌价，仅作数量级参考
DONE, FAILED = "SUCCESS", ("FAILED", "ERROR")
MAX_IMAGES, MAX_AUDIOS, PROMPT_MAX = 9, 3, 20000
POLL_INTERVAL, POLL_TIMEOUT = 4, 1200
JPEG_QUALITY = 98
SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def die(msg):
    print(f"错误：{msg}", file=sys.stderr)
    sys.exit(1)


def load_token():
    tok = os.environ.get("AUTODL_TOKEN", "").strip()
    if not tok:
        path = os.path.join(SKILL_DIR, ".token")
        if os.path.isfile(path):
            tok = open(path, encoding="utf-8").read().strip()
    if not tok:
        die("找不到 Token。放 .token 到技能目录，或设环境变量 AUTODL_TOKEN。")
    if tok.lower().startswith("bearer "):
        die("Token 不应带 'Bearer ' 前缀，去掉它（上游要求原始 Token）。")
    return tok


def extract_prompt(path, index):
    text = open(path, encoding="utf-8").read()
    blocks = re.findall(r'<div class="prompt-block">(.*?)</div>', text, re.S)
    if not blocks:
        die(f"{os.path.basename(path)} 里找不到 .prompt-block")
    if index >= len(blocks):
        die(f"提示词序号 {index} 超出范围（共 {len(blocks)} 块）")
    return html.unescape(blocks[index]).strip()


def to_dataurl(path, reencode=True):
    """Return (dataURL, bytes_reported). Default: re-encode to q98 JPEG at ORIGINAL size (no downscaling)."""
    if not os.path.isfile(path):
        die(f"素材不存在：{path}")
    raw = open(path, "rb").read()
    if not raw:
        die(f"素材为空文件：{path}")
    if reencode:
        raw, mime = to_jpeg(raw, path)
    else:
        mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
    return f"data:{mime};base64," + base64.b64encode(raw).decode("ascii"), len(raw)


def to_jpeg(raw, path):
    """Re-encode a bitmap to quality-98 JPEG keeping the original pixel size.

    Transparent pixels are composited onto white. Non-bitmaps (audio etc.) pass
    through untouched with their true MIME, so the data URL never lies about
    its payload format.
    """
    mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
    try:
        from io import BytesIO
        from PIL import Image
    except ImportError:
        print(f"  提示：未安装 Pillow，{os.path.basename(path)} 原样上传（MIME={mime}）。建议 pip install Pillow", file=sys.stderr)
        return raw, mime
    try:
        img = Image.open(BytesIO(raw))
        img.load()
    except Exception:
        return raw, mime  # 非位图素材（如音频）原样传
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        img = img.convert("RGBA")
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[-1])
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")
    out = BytesIO()
    img.save(out, "JPEG", quality=JPEG_QUALITY, subsampling=0)
    return out.getvalue(), "image/jpeg"


def to_audio_dataurl(path):
    if not os.path.isfile(path):
        die(f"素材不存在：{path}")
    raw = open(path, "rb").read()
    if not raw:
        die(f"素材为空文件：{path}")
    mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
    return f"data:{mime};base64," + base64.b64encode(raw).decode("ascii"), len(raw)


def check_label_coverage(prompt, n_images):
    """ref_image_N maps to <Picture N+1>; flag labels the payload cannot satisfy."""
    used = {int(m) for m in re.findall(r"<Picture (\d+)>", prompt)}
    if not used:
        return ["提示词里没有 <Picture N> 标签，参考图可能不会被引用（确认是否该用六段结构正文）"]
    missing = sorted(n for n in used if n > n_images)
    notes = []
    if missing:
        notes.append(f"提示词引用了 <Picture {missing}>，但只给了 {n_images} 张图（ref_image_0..{n_images - 1}）")
    unused = sorted({n for n in range(1, n_images + 1)} - used)
    if unused:
        notes.append(f"传了图但提示词未引用：{['<Picture %d>' % n for n in unused]}")
    return notes


def build_body(args):
    if args.prompt_file:
        prompt = open(args.prompt_file, encoding="utf-8").read().strip()
    else:
        prompt = extract_prompt(args.shotlist, args.prompt_index)
    if not prompt:
        die("提示词为空")
    if len(prompt) > PROMPT_MAX:
        die(f"提示词 {len(prompt)} 字符，超过上限 {PROMPT_MAX}")
    if not args.images:
        die("至少需要 1 张参考图（ref_image_0 为必填）")
    if len(args.images) > MAX_IMAGES:
        die(f"参考图最多 {MAX_IMAGES} 张，当前 {len(args.images)} 张")
    if args.audio and len(args.audio) > MAX_AUDIOS:
        die(f"参考音频最多 {MAX_AUDIOS} 个")

    body = {
        "prompt": prompt,
        "duration": args.duration,
        "resolution": args.resolution,
        "seed": args.seed if args.seed is not None else int.from_bytes(os.urandom(6), "big") % 10**15,
    }
    manifest = []
    for i, p in enumerate(args.images):
        body[f"ref_image_{i}"], n = to_dataurl(p, reencode=not args.no_compress)
        manifest.append((f"ref_image_{i}", p, os.path.getsize(p), n))
    for j, p in enumerate(args.audio or []):
        body[f"ref_audio_{j}"], n = to_audio_dataurl(p)
        manifest.append((f"ref_audio_{j}", p, os.path.getsize(p), n))
    return body, prompt, manifest


def request_json(url, token, data=None, timeout=60):
    headers = {"Content-Type": "application/json", "Authorization": token}
    req = urllib.request.Request(url, headers=headers, method="POST" if data else "GET")
    if data:
        req.data = json.dumps(data, ensure_ascii=False).encode("utf-8")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        try:
            p = json.loads(raw)
            msg = p.get("msg") or p.get("message") or raw[:300]
        except Exception:
            msg = raw[:300]
        die(f"HTTP {e.code} 于 {url}\n  上游信息：{msg}")
    except urllib.error.URLError as e:
        die(f"网络失败：{e.reason}")


def unwrap(payload):
    """Accept {code,data:{...}} or a bare payload; results hold str or {url}."""
    body = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    code = str(payload.get("code", ""))
    if code and "success" not in code.lower():
        die(f"上游返回失败 code={code} msg={payload.get('msg')}")
    status = str(body.get("status", "")).upper()
    items = body.get("results") or body.get("urls") or []
    urls = [(x if isinstance(x, str) else (x or {}).get("url")) for x in items]
    return status, [u for u in urls if u], body


def download(urls, out_dir, stem):
    os.makedirs(out_dir, exist_ok=True)
    saved = []
    for u in urls:
        ext = os.path.splitext(u.split("?")[0])[1] or ".mp4"
        dest = next_path(out_dir, stem, ext)
        req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=300) as r, open(dest, "wb") as f:
            f.write(r.read())
        saved.append(dest)
    return saved


def report(paths, task_id, seed):
    print("\n=== 完成 ===")
    print(f"  task_id : {task_id}")
    if seed is not None:
        print(f"  seed    : {seed}")
    for p in paths:
        print(f"  本地文件: {p}  ({os.path.getsize(p) / 1024 / 1024:.2f} MB)")


def poll(task_id, token, out_dir, stem):
    url = RESULT_URL + urllib.parse.quote(task_id)
    start = time.time()
    while time.time() - start < POLL_TIMEOUT:
        time.sleep(POLL_INTERVAL)
        status, urls, _ = unwrap(request_json(url, token))
        if status == DONE:
            if not urls:
                die(f"状态 {DONE} 但 results 为空，task_id={task_id}")
            report(download(urls, out_dir, stem), task_id, None)
            return
        if status in FAILED:
            die(f"任务失败（{status}），task_id={task_id}。先读上游 msg，勿盲目重试。")
        print(f"  [{time.time() - start:5.0f}s] {status or 'QUEUED'} …", flush=True)
    die(f"轮询超时 {POLL_TIMEOUT // 60} 分钟，task_id={task_id}。用 --resume {task_id} 继续查，别重复提交。")


def resolve_out(args):
    """Videos belong next to the shotlist that produced them, not inside the skill."""
    if args.out:
        return args.out
    src = args.shotlist or args.prompt_file
    if src:
        return os.path.join(os.path.dirname(os.path.abspath(src)), "生成")
    return os.path.join(SKILL_DIR, "out")


def resolve_stem(args, task_id):
    """Shotlist_08_H3.html -> 08, matching the house 生成/08.mp4 convention."""
    src = args.shotlist or args.prompt_file or ""
    m = re.search(r"(\d{1,3})", os.path.basename(src))
    return m.group(1).zfill(2) if m else task_id[:8]


def next_path(out_dir, stem, ext):
    """Never overwrite an existing take; follow the 08.mp4 -> 08.1.mp4 pattern."""
    cand = os.path.join(out_dir, f"{stem}{ext}")
    n = 1
    while os.path.exists(cand):
        cand = os.path.join(out_dir, f"{stem}.{n}{ext}")
        n += 1
    return cand


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="AutoDL minimax_h3_zm_u24 提交 / 轮询 / 下载")
    src = ap.add_mutually_exclusive_group()
    src.add_argument("--shotlist", help="含 .prompt-block 的 HTML")
    src.add_argument("--prompt-file", help="纯文本提示词文件")
    ap.add_argument("--prompt-index", type=int, default=0, help="取第几个提示词块，默认 0")
    ap.add_argument("--images", nargs="+", default=[], help="按序对应 ref_image_0..8 / <Picture 1..9>")
    ap.add_argument("--audio", nargs="*", default=[])
    ap.add_argument("--duration", type=int, default=15)
    ap.add_argument("--resolution", default="480p竖", choices=RESOLUTIONS)
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--no-compress", action="store_true", help="跳过重编码，按原始字节与真实 MIME 上传")
    ap.add_argument("--out", default=None, help="默认落在提示词文件同级的 视频/ 目录")
    ap.add_argument("--resume", help="已有 task_id：只查询并下载，不新提交")
    ap.add_argument("--submit", action="store_true", help="真正提交（会扣费）")
    args = ap.parse_args()

    if not 1 <= args.duration <= 15:
        die("duration 必须在 1–15 秒")
    token = load_token()

    out_dir = resolve_out(args)
    print(f"输出目录    : {out_dir}")

    if args.resume:
        poll(args.resume, token, out_dir, resolve_stem(args, args.resume))
        return
    if not (args.shotlist or args.prompt_file):
        die("需要 --shotlist 或 --prompt-file")

    body, prompt, manifest = build_body(args)
    tier = args.resolution[:4]
    est = PRICE_PER_SEC.get(tier, 0.06) * args.duration

    print("=== 将要提交的内容 ===")
    print(f"  工作流       : {WORKFLOW}")
    print(f"  prompt       : {len(prompt)} 字符 / 上限 {PROMPT_MAX}")
    print(f"  duration     : {args.duration} 秒")
    print(f"  resolution   : {args.resolution}")
    print(f"  seed         : {body['seed']}")
    print(f"  字段清单     : {', '.join(sorted(body))}")
    print(f"  参考素材     : {len(manifest)} 项")
    for label, path, orig, sent in manifest:
        arrow = "" if sent == orig else f" → {sent / 1024:.0f} KB"
        print(f"    {label:<13} {os.path.basename(path):<46} {orig / 1024:6.0f} KB{arrow}")
    print(f"  请求体总大小 : {len(json.dumps(body)) / 1024 / 1024:.2f} MB")
    print(f"  费用估算     : 约 ¥{est:.2f}（{tier} 参考价，以控制台实际牌价为准）")
    for note in check_label_coverage(prompt, len(args.images)):
        print(f"  ⚠ {note}")

    if not args.submit:
        print("\n干跑结束。确认无误后加 --submit 才会真正提交扣费。")
        return

    print("\n提交中…")
    status, urls, data = unwrap(request_json(SUBMIT_URL, token, body, timeout=180))
    task_id = data.get("task_id") or ""
    if not task_id:
        die(f"响应里没有 task_id：{json.dumps(data, ensure_ascii=False)[:400]}")
    print(f"  task_id = {task_id}  status = {status or '未知'}")
    stem = resolve_stem(args, task_id)
    if status == DONE:
        report(download(urls, out_dir, stem), task_id, body["seed"])
        return
    poll(task_id, token, out_dir, stem)


if __name__ == "__main__":
    main()
