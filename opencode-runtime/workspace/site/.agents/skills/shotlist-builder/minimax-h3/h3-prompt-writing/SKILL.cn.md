---
name: h3-prompt-writing
description: MiniMax H3 视频扩写 Prompt 编写，支持 T2VA、I2VA、FL2VA、L2VA 与全能参考 Ref2VA 五种模式。当需要把多模态生成需求改写为 H3 结构、组装 integrated_multimodal_description / overall_soundscape / non_diegetic_music、构建六段式全能参考扩写、对齐关键帧或定义图片/视频/音频引用标签时使用。
compatibility: 可移植到任何能读取本地文件的 Agent——无需外部 API 调用、MiniMax Hub 工具或专有运行时。agents/openai.yaml 仅为可选的 ChatGPT/Codex 界面元数据，不会把技能限制为 OpenAI 专用。
---

# H3 提示词编写

面向 H3 的 Prompt 写作要从「描述一个画面」升级为「组织一段视听内容」：把开放、零散、非结构化的用户输入，整理成模型可理解、可执行、可控的多模态视频生成指令。

## 工作流

1. 判定输入模式：T2VA / I2VA / FL2VA / L2VA / 全能参考 Ref2VA（见下方决策表）。
2. 选择模块语言：`references/en/` 或 `references/cn/`（跟随用户语言）。
3. 按「加载索引」只读取当前模式与内容需要的模块。
4. 严格保留所读模块中的字段名、段落顺序、引用标签与时间戳写法。

## 模式决策表

| 用户输入 | 模式 |
| --- | --- |
| 只有文字 | T2VA |
| 文字 + 首帧图 | I2VA |
| 文字 + 首帧图和尾帧图 | FL2VA |
| 文字 + 尾帧图 | L2VA |
| 复用 / 编辑 / 续写已有图片、视频或音频作为参考 | Ref2VA（全能参考） |

## 输出骨架

**基础四模式**（T2VA / I2VA / FL2VA / L2VA）：固定的一行图片对齐 instruction（T2VA 没有；精确模板见 `base-structure.md`），随后是三个主体字段：

```text
integrated_multimodal_description: ...

overall_soundscape: ...

non_diegetic_music: ...
```

**全能参考模式**（Ref2VA）：六段正文，顺序固定：

```text
subject_definitions / summary / retention_analysis / detailed_description / overall_soundscape / non_diegetic_music
```

## 硬性规则

- 扩写正文使用英文；台词、歌词和画面可见文字保留原始语言（`<d>` 内与双引号内）。
- 描述总时长与请求的视频时长一致（4–15 秒）；切镜时间戳严格递增且在时长范围内。
- 引用标签在所有段落保持同一含义（`<Subject N>`、`<Picture N>`、`<Video N>`、`<Audio N>`）。
- 用具体的视听细节替代 cinematic、beautiful 之类的抽象词。
- 使用关键帧（I2VA / FL2VA / L2VA）时，写清首帧和/或尾帧如何接入时间线。

## 加载索引（按需读取）

| 条件 | 读取（位于 `references/<lang>/`，lang = `en` 或 `cn`） |
| --- | --- |
| 基础模式——必读 | `base-structure.md` |
| 多镜头或有运镜 | + `base-camera.md` |
| 有台词、画外音或画面文字 | + `base-dialogue.md` |
| 需要完整范例 | + `base-cases.md` |
| 全能参考模式——必读 | `ref-structure.md` + `ref-labels.md` + `ref-retention.md` + `ref-description.md` |
| 需要完整成例对照 | + `ref-example.md` |

## 延伸资料

- 用户向 H3 使用手册（飞书）：[🐚MiniMax H3 模型 - 使用手册](https://vrfi1sk8a0.feishu.cn/wiki/FIWjwgL33ipnkekzk30crmKUnIh)
- 英文版入口：[`SKILL.md`](SKILL.md)
