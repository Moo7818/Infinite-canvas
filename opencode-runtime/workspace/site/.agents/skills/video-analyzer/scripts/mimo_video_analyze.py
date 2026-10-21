#!/usr/bin/env python3
"""
MiMo-V2.5 Video Analyzer
Native multimodal video analysis via MiMo-V2.5 API.
Supports URL and local file input with auto-compression.
"""

import argparse
import base64
import json
import os
import subprocess
import sys
import tempfile

try:
    import requests
except ImportError:
    print("Installing requests library...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "-q"])
    import requests

API_BASE = "https://api.xiaomimimo.com/v1/chat/completions"
MAX_BASE64_SIZE_MB = 50
SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_api_key(cli_value: str = "") -> str:
    """API key resolution: --api-key > MIMO_API_KEY env > <skill>/.token file."""
    for key in (cli_value, os.environ.get("MIMO_API_KEY", "")):
        key = (key or "").strip()
        if key:
            return key
    path = os.path.join(SKILL_DIR, ".token")
    if os.path.isfile(path):
        with open(path, encoding="utf-8") as f:
            return f.read().strip()
    return ""


# ============================================================
# 分析模式定义
# ============================================================

PROMPT_GENERAL = """你是一位资深的影视分析与竞品研究专家。请对以下视频输出一份全维度立体分析报告，涵盖内容、剧本、镜头、摄影、美学、竞品六大维度。要求结构清晰、内容详细、条目具体，全部基于视频实际内容，不要臆测。

## 一、内容概览
1. 视频主题与展示场景
2. 核心信息与传达目的
3. 整体类型与风格定位

## 二、剧本/分镜拆解
1. 逐镜头剧本表（按"镜头号 | 时长 | 景别 | 画面内容 | 台词/旁白 | 音效 | 备注"格式逐镜头列出）
2. 完整旁白/对白文本
3. 叙事结构分析（起承转合）
4. 节奏划分与情绪曲线

## 三、镜头语言分析
1. 景别运用（远景/全景/中景/近景/特写/大特写的分布与作用）
2. 拍摄角度（平视/仰角/俯角/过肩/主观镜头等）
3. 镜头运动（固定/推拉摇移跟/升降/手持/斯坦尼康等）
4. 构图方式（三分法/对称/框架/引导线/留白/中心构图等）
5. 剪辑节奏与转场（镜头时长、切点逻辑、硬切/淡入淡出/叠化/匹配剪辑）

## 四、摄影风格分析
1. 光线方案（自然光/人造光、硬光/软光、光比、光源方向、色温）
2. 色彩运用（主色调、色板、饱和度、明度、对比度、调色风格）
3. 曝光与画质（曝光倾向、景深控制、焦段带来的透视感）
4. 质感与纹理（颗粒/胶片感/数字锐利度/高光阴影处理）
5. 整体视觉风格（写实/广告片/电影感/纪实/未来感等）

## 五、美学分析
1. 视觉语言统一性（画面元素、材质、色彩、动效的整体一致性）
2. 情绪与氛围传达（配乐、镜头、色彩共同营造的基调）
3. 节奏美学（张弛、留白、顿挫感）
4. 风格归类与参考（可归入何种美学流派，给出风格关键词）
5. 值得借鉴与可改进之处

## 六、竞品/营销分析
1. 品牌及产品识别
2. 营销策略拆解（定价、促销、渠道）
3. 内容创意评分（1-10）及理由
4. 视觉制作水准评估
5. 可借鉴的优点
6. 可改进的不足
7. 同类差异化建议

请用中文回答，输出结构清晰、内容详细。"""

PROMPT_SCRIPT = """你是一位专业短视频编剧。请将这个视频转化为一份标准的短视频剧本。
输出格式：
1. 视频基本信息（时长、类型、风格）
2. 逐镜头剧本表（镜头号 | 时长 | 景别 | 画面内容 | 台词 | 音效 | 备注）
3. 完整旁白/对白文本
4. 分镜节奏分析
5. 可复用的叙事模板提取
用中文回答。"""

PROMPT_COMPETITOR = """你是一位电商竞品分析师。请分析这个视频并输出：
1. 品牌及产品识别
2. 营销策略拆解（定价、促销、渠道）
3. 内容创意评分（1-10）及理由
4. 视觉制作水准评估
5. 可借鉴的优点
6. 可改进的不足
7. 如果我要做同类竞品视频，关键差异化建议
用中文回答。"""

MODES = {
    "general": ("全维度立体分析报告", PROMPT_GENERAL),
    "script": ("剧本拆解", PROMPT_SCRIPT),
    "competitor": ("竞品分析", PROMPT_COMPETITOR),
}


# ============================================================
# 视频压缩
# ============================================================

def compress_video(input_path: str) -> str:
    """Compress video to fit under 50MB for base64 upload."""
    output_path = os.path.join(tempfile.gettempdir(), "mimo_compressed.mp4")
    cmd = [
        "ffmpeg", "-i", input_path,
        "-vf", "scale=320:-2",
        "-c:v", "libx264", "-crf", "35",
        "-preset", "fast",
        "-c:a", "copy",
        "-y", output_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Compression failed: {result.stderr}", file=sys.stderr)
        return input_path
    return output_path


def prepare_video(source: str, is_url: bool) -> str:
    """Prepare video for API upload. Returns base64 data URI."""
    if is_url:
        return f"data:video/mp4;base64,"  # URL passed directly

    file_size = os.path.getsize(source)
    target = source

    if file_size > MAX_BASE64_SIZE_MB * 1024 * 1024:
        print(f"File is {file_size / 1024 / 1024:.1f}MB, compressing...")
        target = compress_video(source)
        new_size = os.path.getsize(target)
        print(f"Compressed to {new_size / 1024 / 1024:.1f}MB")

        if new_size > MAX_BASE64_SIZE_MB * 1024 * 1024:
            print("ERROR: File still too large after compression.", file=sys.stderr)
            sys.exit(1)

    with open(target, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")

    if target != source and os.path.exists(target):
        os.remove(target)

    return f"data:video/mp4;base64,{b64}"


# ============================================================
# API 调用
# ============================================================

def analyze_video(
    video_source: str,
    is_url: bool,
    api_key: str,
    prompt: str,
    fps: int = 2,
    timeout: int = 300,
    json_output: bool = False,
    save_to: str = None,
) -> dict:
    """Send video to MiMo-V2.5 for native multimodal analysis."""

    if is_url:
        video_content = {
            "type": "video_url",
            "video_url": {"url": video_source},
            "fps": fps,
            "media_resolution": "default"
        }
    else:
        data_uri = prepare_video(video_source, is_url)
        video_content = {
            "type": "video_url",
            "video_url": {"url": data_uri},
            "fps": fps,
            "media_resolution": "default"
        }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "mimo-v2.5",
        "messages": [
            {
                "role": "user",
                "content": [
                    video_content,
                    {"type": "text", "text": prompt}
                ]
            }
        ],
        "max_completion_tokens": 16384,
        "stream": False,
        "extra_body": {"thinking": {"type": "disabled"}}
    }

    response = requests.post(API_BASE, headers=headers, json=payload, timeout=timeout)

    if response.status_code != 200:
        error_msg = f"API Error {response.status_code}: {response.text}"
        if json_output:
            return {"error": error_msg}
        print(error_msg, file=sys.stderr)
        sys.exit(1)

    result = response.json()
    content = result["choices"][0]["message"]["content"]
    usage = result.get("usage", {})

    # 保存结果到文件
    if save_to:
        os.makedirs(os.path.dirname(save_to), exist_ok=True)
        with open(save_to, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Result saved to: {save_to}")

    if json_output:
        return {
            "content": content,
            "usage": usage,
            "model": result.get("model", "mimo-v2.5")
        }

    return {"content": content, "usage": usage}


# ============================================================
# 主入口
# ============================================================

def main():
    mode_list = " | ".join([f"{k}({v[0]})" for k, v in MODES.items()])

    parser = argparse.ArgumentParser(
        description="MiMo-V2.5 Video Analyzer - 全维度视频分析",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
分析模式 (--mode):
  {mode_list}

示例:
  # 全维度立体分析报告（默认模式）
  python mimo_video_analyze.py --url "https://example.com/video.mp4"

  # 本地文件剧本拆解
  python mimo_video_analyze.py --file "video.mp4" --mode script

  # 竞品分析并保存结果
  python mimo_video_analyze.py --url "https://example.com/video.mp4" --mode competitor --save "analysis.md"

  # 自定义prompt
  python mimo_video_analyze.py --url "https://example.com/video.mp4" --prompt "你的自定义分析指令"
        """
    )

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--url", help="视频URL (http/https)")
    group.add_argument("--file", help="本地视频文件路径")

    parser.add_argument("--mode", default="general", choices=list(MODES.keys()),
                        help=f"分析模式 (默认: general)")
    parser.add_argument("--prompt", default=None, help="自定义分析prompt (覆盖--mode)")
    parser.add_argument("--api-key", default=None,
                        help="MiMo API key (默认读取 MIMO_API_KEY 环境变量或技能目录下的 .token)")
    parser.add_argument("--fps", type=int, default=2, help="视频采样FPS (默认: 2)")
    parser.add_argument("--json-output", action="store_true", help="输出JSON格式")
    parser.add_argument("--save", default=None, help="将分析结果保存到指定文件")
    parser.add_argument("--timeout", type=int, default=300, help="API超时秒数 (默认: 300)")

    args = parser.parse_args()

    args.api_key = load_api_key(args.api_key)

    if not args.api_key:
        print("ERROR: 未找到API Key。请设置 MIMO_API_KEY 环境变量、使用 --api-key 参数，"
              "或将密钥写入技能目录下的 .token 文件。", file=sys.stderr)
        sys.exit(1)

    # 确定prompt
    if args.prompt:
        prompt = args.prompt
        mode_label = "自定义分析"
    else:
        mode_label, prompt = MODES[args.mode]

    is_url = args.url is not None
    source = args.url or args.file

    if not is_url and not os.path.exists(source):
        print(f"ERROR: 文件不存在: {source}", file=sys.stderr)
        sys.exit(1)

    print(f"分析模式: {mode_label}")
    print(f"视频来源: {'URL' if is_url else '本地文件'}")
    if not is_url:
        print(f"文件大小: {os.path.getsize(source) / 1024 / 1024:.1f} MB")
    print("正在调用 MiMo-V2.5 API...")

    result = analyze_video(
        video_source=source,
        is_url=is_url,
        api_key=args.api_key,
        prompt=prompt,
        fps=args.fps,
        timeout=args.timeout,
        json_output=args.json_output,
        save_to=args.save,
    )

    if args.json_output:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print("\n" + "=" * 60)
        print(f"MiMo-V2.5 视频分析结果 [{mode_label}]")
        print("=" * 60)
        print(result["content"])
        print("=" * 60)
        usage = result.get("usage", {})
        if usage:
            details = usage.get("prompt_tokens_details", {})
            print(f"\nToken用量: 总计{usage.get('total_tokens', 'N/A')} "
                  f"(视频{details.get('video_tokens', 'N/A')} + "
                  f"音频{details.get('audio_tokens', 'N/A')} + "
                  f"文本{details.get('cached_tokens', 'N/A')}缓存)")


if __name__ == "__main__":
    main()
