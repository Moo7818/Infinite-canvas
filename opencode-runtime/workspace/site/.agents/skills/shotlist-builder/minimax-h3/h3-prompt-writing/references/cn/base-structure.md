# 基础四模式：Prompt 结构与核心字段（T2VA / I2VA / FL2VA / L2VA）

本模块说明基础四模式的任务定义、最终 Prompt 结构、关键帧写法，以及三个主体字段中多模态描述与声音段落的写法。镜头、切镜与运镜见 `base-camera.md`，说话人、台词与画面文字见 `base-dialogue.md`，完整案例见 `base-cases.md`。

## 1. 任务介绍

- **T2VA**：根据文字构建完整的视听时间线。

- **I2VA**：T2VA 主体 + 首帧 instruction + 从首帧继续发展的画面路径。

- **FL2VA**：T2VA 主体 + 首尾帧 instruction + 从首帧到尾帧的连续路径。

- **L2VA**：T2VA 主体 + 尾帧 instruction + 从合理的前置状态收敛到尾帧的路径。

## 2. 最终 Prompt 结构

### 2.1 第一部分是 instruction

**T2VA** 没有图片对齐 instruction，直接从三个主体字段开始。

**I2VA** 固定使用：

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.
```

**FL2VA** 固定使用：

```text
How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot N) aligns with the S.SS-second mark of the target video.
```

**L2VA** 固定使用：

```text
How the reference pictures align with the target video — <Picture 1> (from [Shot N]) aligns with the S.SS-second mark of the target video.
```

其中，`N` 是最后一个实际镜头的编号；`S.SS` 是视频有效时长，固定保留两位小数。instruction 必须位于最终 Prompt 的第一行，后面空一行再写主体字段。

### 2.2 第二部分是三个主体字段

```text
integrated_multimodal_description: [Shot 1] ...

overall_soundscape: ...

non_diegetic_music: ...
```

- **integrated_multimodal_description**：沿时间线描述画面、动作、镜头、说话人、台词、演唱和场景内声音。

- **overall_soundscape**：概括整段视频的环境声、物理动作声和非语言人声。

- **non_diegetic_music**：描述角色听不到、只有观众能听到的背景配乐。

## 3. 如何把关键帧写进多模态描述

### 3.1 I2VA：从图片开始，再向后发展

`<Picture 1>` 是视频 0.00 秒的真实首帧，属于 `[Shot 1]`。描述先建立图片中的风格、主体、构图与场景锚点，再写下一步动作。人物身份、服装、颜色、关键物体和空间关系应保持一致。

推荐结构：**首帧锚点 → 动作起点 → 连续变化 → 结果或反应**。

### 3.2 FL2VA：描述首帧到尾帧之间的路径

Picture 1 是开头，Picture 2 是结尾。主要集中描述：主体如何位移、姿态如何变化、物体如何被操作、构图如何变化，以及场景或光线如何过渡。

FL2VA 通常优先单镜头，让模型连续地从首帧插值到尾帧；只有明确指定多个镜头时才按指定镜头写。尾帧必须由最后一个 `[Shot N]` 在视频结束时到达。

推荐结构：**首帧状态 → 可观察的中间变化 → 差异逐步缩小 → 尾帧状态**。

### 3.3 L2VA：反推开头，并在结尾落到图片

`<Picture 1>` 是视频最后一帧，属于最后一个 `[Shot N]`，不是天然属于 Shot 1。先根据用户意图和尾帧反推一个合理的早期状态，再描述人物、物体、相机和场景如何逐步接近参考图。

推荐结构：**合理前态 → 明确的动作与变化路径 → 最后一个镜头逐步收敛 → 尾帧落点**。

## 4. 多模态描述按时间线展开

`integrated_multimodal_description` 是扩写主体。每条信息都应对应到可以看见或听见的内容：视觉风格、初始构图、主体外观和位置、场景与关键道具、动作及反应、镜头变化、人物语言和同步发生的场景内声音。

`[Shot 1]` 的开头先写整体风格与初始构图。常见风格包括 `Cinematic`、`live-action`、`2D-animated`、`3D CG`、`claymation`、`watercolor` 和 `vintage film`。关键帧任务的风格应从参考图中提取；T2VA 则根据用户文字选择。

```text
[Shot 1] Live-action, cinematic, a medium-wide shot frames...
```

第一镜不写时间戳。

## 5. overall_soundscape

使用 1–4 句英文，在一个连续段落中概括贯穿整段视频的环境声、物理动作声和非语言人声，例如风雨、交通、脚步、衣料摩擦、碰撞、呼吸、笑声或喘息。对白、演唱和场景内音乐已经写在多模态描述中，不在这里重复。只有用户明确要求整段静音时才写 `N/A`。

```text
overall_soundscape: Steady rain taps against the café windows while low room ambience continues underneath. The entrance bell rings once, followed by wet footsteps and the soft scrape of a chair.
```

## 6. non_diegetic_music

使用 1–3 句英文描述角色听不到、只有观众能听到的背景配乐。重点写乐器、速度、节奏和动态变化，不写抽象情绪词或配乐的情感功能。角色能听见的演唱、乐器、广播、电视或手机音乐属于场景内事件，应写入多模态描述。没有画外配乐时写 `N/A`。

```text
non_diegetic_music: Sparse piano notes at a slow tempo, joined by sustained low strings that gradually increase in volume before fading out.
```
