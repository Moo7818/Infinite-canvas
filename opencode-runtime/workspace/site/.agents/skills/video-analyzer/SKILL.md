---
name: video-analyzer
description: "Native multimodal video analysis using MiMo-V2.5 API. Produces a comprehensive multi-dimensional analysis report combining content overview, script breakdown, shot language, cinematography style, aesthetics, and competitor analysis. Also supports focused script breakdown and competitor analysis modes. Invoke when user wants to analyze video content, produce a full film study of a video, breakdown a video into a script, or do competitor analysis. Triggers: 分析视频, 视频分析, 视频拆解, 镜头分析, 摄影分析, 美学分析, 剧本提取, 竞品分析, 拆解视频, video analysis"
---

# Video Analyzer

Use MiMo-V2.5's native multimodal API to analyze video content. Unlike frame extraction (which loses temporal and audio info), this provides true multimodal understanding — video, audio, text, and visual style simultaneously.

## Prerequisites

API key 已配置在本技能目录的 `.token` 文件里（已被同目录 `.gitignore` 排除），脚本会自动读取，无需每次传参。

密钥读取优先级：`--api-key` > 环境变量 `MIMO_API_KEY` > `<技能目录>/.token`。

更换密钥直接改写 `.token`（纯密钥一行，不带 `Bearer ` 前缀）即可：

```powershell
$env:MIMO_API_KEY = "your-api-key"   # 可选，仅用于临时覆盖
```

Get API key at: https://platform.xiaomimimo.com/console/api-keys

## Analysis Modes

| Mode | Name | Use Case |
|------|------|----------|
| `general` (default) | 全维度立体分析报告 | 内容概览+剧本拆解+镜头语言+摄影风格+美学+竞品六大维度综合分析 |
| `script` | 剧本拆解 | 逐镜头剧本表+旁白文本+节奏分析 |
| `competitor` | 竞品分析 | 营销策略拆解+创意评分+差异化建议 |

## 全维度立体分析报告输出结构 (默认模式)

The `general` mode outputs a structured 6-section report:

1. **内容概览** — 视频主题与场景、核心信息与目的、整体类型与风格定位
2. **剧本/分镜拆解** — 逐镜头剧本表(镜头号|时长|景别|画面内容|台词|音效|备注)、旁白/对白文本、叙事结构、节奏与情绪曲线
3. **镜头语言分析** — 景别运用、拍摄角度、镜头运动、构图方式、剪辑节奏与转场
4. **摄影风格分析** — 光线方案、色彩运用、曝光与画质、质感与纹理、整体视觉风格
5. **美学分析** — 视觉语言统一性、情绪与氛围、节奏美学、风格归类与参考、借鉴与改进点
6. **竞品/营销分析** — 品牌与产品识别、营销策略拆解、创意评分、制作水准、差异化建议

## Workflow

1. **Identify input**: URL video or local file path
2. **Select mode**: general / script / competitor (default: general)
3. **Run script**: `python scripts/mimo_video_analyze.py`
4. **Report results**: present structured analysis to user

## Quick Start

### 全维度立体分析报告（默认）

```powershell
python scripts/mimo_video_analyze.py --url "https://example.com/video.mp4"
```

### 本地文件分析

```powershell
python scripts/mimo_video_analyze.py --file "C:\path\to\video.mp4"
```

### 剧本拆解模式

```powershell
python scripts/mimo_video_analyze.py --url "https://example.com/video.mp4" --mode script
```

### 竞品分析模式

```powershell
python scripts/mimo_video_analyze.py --file "video.mp4" --mode competitor
```

### 自定义分析prompt

```powershell
python scripts/mimo_video_analyze.py --url "https://example.com/video.mp4" --prompt "只分析视频中的光线运用"
```

### 保存结果到文件

```powershell
python scripts/mimo_video_analyze.py --url "https://example.com/video.mp4" --save "output/analysis.md"
```

### JSON结构化输出

```powershell
python scripts/mimo_video_analyze.py --url "https://example.com/video.mp4" --json-output
```

## Script Arguments

| Argument | Default | Description |
|---|---|---|
| `--url` | - | 视频URL (http/https) |
| `--file` | - | 本地视频文件路径 |
| `--mode` | `general` | 分析模式: general/script/competitor |
| `--prompt` | - | 自定义分析prompt (覆盖--mode) |
| `--api-key` | `.token` / `$MIMO_API_KEY` | MiMo API key，默认自动读取 |
| `--fps` | `2` | 视频采样FPS |
| `--save` | - | 将结果保存到指定文件路径 |
| `--json-output` | false | 输出JSON格式 |
| `--timeout` | `300` | API超时秒数 |

**Note**: `--url` 或 `--file` 必须提供其一。`--prompt` 会覆盖 `--mode` 的默认prompt。

## Auto-Compression

Local files exceeding 50MB (MiMo's base64 limit) are automatically compressed:
- Scale to 320px width, CRF 35, audio copied without re-encoding
- Compressed temp file is deleted after analysis

## Error Handling

- **400 size limit**: File too large even after compression — try splitting the video
- **401 unauthorized**: Invalid or missing API key
- **Timeout**: Increase `--timeout` for very long videos
- **Network error**: Check connectivity to api.xiaomimimo.com

## Resources

- **scripts/mimo_video_analyze.py** — Main analysis script (requires `requests` library)
