---
name: autodl-h3-video
description: 通过 autodl.art 的 ComfyUI 工作流 minimax_h3_zm_u24 把 shotlist 提示词生成为视频。当需要把 H3 Ref2VA 提示词与参考图提交到真实生成、轮询任务、下载成片时使用。涉及 AutoDL、comfyui_workflow、ref_image、付费视频生成时优先读本技能。
---

# AutoDL H3 视频生成

把 `shotlist-builder` 产出的提示词正文 + 参考图，提交到 autodl.art 的 `minimax_h3_zm_u24` 工作流（H3 多图多音频生视频·升级画质，最长 15 秒），轮询到完成后**立即下载落盘**。

## 四个会直接导致失败的点

1. **`Authorization` 传原始 Token，不带 `Bearer ` 前缀。** 官方文档页写的是 Bearer，实测相反。Token 在 <https://autodl.art/large-model/tokens> 创建，**分组必须选 ComfyUI**，选错分组调用不通。
2. **请求体字段严格。** 只允许 `prompt`、`duration`、`resolution`、`seed`、`ref_image_0..8`、`ref_audio_0..2`。**多一个未定义字段上游直接 400 拒绝** —— 不要加 `model`、`replyType`、`webhook` 之类。
3. **状态值全大写**：`QUEUED`、`RUNNING` 为进行中，`SUCCESS` 成功，`FAILED` 失败。`results` 元素可能是字符串，也可能是 `{url: ...}` 对象，两种都要吃。查询路径确认就是文档那条 `/comfyui_workflow/result/{task_id}`（其余变体一律 404）；用不存在的 task_id 打它会返回 HTTP 200 + `{"code":"InternalError","msg":"工作流不可用"}`，**这是未知任务的通用报错，既不代表 URL 写错，也不代表工作流没开通**，别照着它去改路径。同理，GET 查询对 `Bearer` 前缀不敏感（加与不加返回一致），所以第 1 条的裸 Token 只能以提交接口为准。
4. **输出 URL 很快过期。** 必须在同一进程内下载完，不要把 URL 交回对话再取。
5. **图片统一重编码为 q98 JPEG，不缩放尺寸。** 脚本把每张参考图转为 quality 98、色度抽样 4:4:4 的 JPEG，**保持原始像素尺寸（不再缩到 1280）**；PNG 透明区域合成到白底。dataURL 的 MIME 前缀按实际编码结果写（`image/jpeg`），不再硬编码为 webp——旧版在 `--no-compress` 时会把 PNG 原字节错标成 `image/webp`，上游可能静默丢弃参考图。参考图多且大时请求体仍可能偏大（9 张 2K 图 ≈ 7–9 MB），若遇 413 请改用更小的素材或分批提交。加 `--no-compress` 可跳过重编码，按原始字节与真实 MIME 上传。重编码依赖 Pillow（`pip install Pillow`），缺库时脚本会提示并退回原图。

## 参数取值

| 字段 | 约束 |
| --- | --- |
| `prompt` | 必填，1–20000 字符 |
| `duration` | 选填整数，1–15 秒，默认 5 |
| `resolution` | 选填，`480p竖` / `768p竖` / `480p横` / `768p横` / `480p(1:1)` / `768p(1:1)`，默认 `768p竖` |
| `ref_image_0` | **必填**，JPG/PNG/WebP，dataURL(base64) 或 URL |
| `ref_image_1..8` | 选填，同上 |
| `ref_audio_0..2` | 选填，MP3/WAV/MP4/FLAC，无音频就不要传 |
| `seed` | 选填整数；同参数同 seed 结果相近，复盘时固定 seed |

## 参考图与标签的对应约定

`ref_image_N` 对应提示词里的 `<Picture N+1>`。所以 `ref_image_0` 必须是 `<Picture 1>`。

**未验证项**：工作流是否真的按序号自动解析 `<Picture N>` 标签。画布版实现在画布层做映射，直连 API 时映射可能发生在工作流内部。第一次实测必须用最小成本参数验证（见下），不要直接出终稿。

## 用法

Token 放在本目录 `.token`（已被 `.gitignore` 排除），或用环境变量 `AUTODL_TOKEN` 覆盖。

```bash
PY=/c/Users/Administrator/AppData/Local/Programs/Python/Python312/python.exe

# 1) 干跑：只校验并打印将要提交的内容，不花钱（默认行为）
"$PY" scripts/gen.py \
  --shotlist "路径/Shotlist_03_H3.html" \
  --images 图片资产/儿童-v1.png 图片资产/产品-整车-斜前视角-灯亮-C9069.png ... \
  --duration 15 --resolution 480p竖

# 2) 确认无误后真正提交（唯一花钱的开关）
... --submit

# 3) 查已提交任务并下载，不产生新费用
... --resume <task_id>
```

图片顺序就是 `--images` 的顺序，一次传满 9 张。顺序与提示词里的 `<Picture N>` 一一对应，脚本会交叉校验：提示词引用了 `<Picture 7>` 却只给 6 张图，干跑阶段就会报警。

**输出位置**：默认落在**提示词文件同级的 `生成/` 目录**，文件名取提示词文件里的编号（`Shotlist_08_H3.html` → `生成/08.mp4`），已存在则顺延为 `08.1.mp4`、`08.2.mp4`，**不覆盖旧成片**；取不到编号才退回 `task_id` 前 8 位。用 `--out` 可覆盖；`--resume` 若不带 `--shotlist` 则退回技能目录下的 `out/`。每次运行都会先打印解析出的输出目录。

依赖：Python 3.12（`C:\Users\Administrator\AppData\Local\Programs\Python\Python312\python.exe`）+ Pillow。仅用标准库发请求，不需要 requests。

## 省钱默认

首次探路用 `480p竖` + `--duration 5`，只为验证链路。构图与产品信息确认后再上 `768p竖` + 15 秒出终稿。参考价：480p 约 ¥0.04/秒、768p 约 ¥0.06/秒（**这是文生视频工作流的牌价，`zm_u24` 标了"升级画质"，以控制台"价格：点击查看"实际数字为准**）。

## 交付纪律

- 生成前必须已经有一份通过校验的 H3 提示词（六段结构、时间码递增、正文无宽高比记号）。
- 每次付费调用后，把本地 mp4 路径、`task_id`、`seed`、参数一并回报，便于复现和对比。
- 失败时先读响应里的 `msg`，不要盲目重试 —— 400 多半是字段问题，重试只是再烧一次钱。
