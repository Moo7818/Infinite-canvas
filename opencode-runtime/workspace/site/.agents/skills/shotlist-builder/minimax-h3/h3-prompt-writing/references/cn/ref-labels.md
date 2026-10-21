# 引用标签与定义（subject_definitions）

本模块说明全能参考模式中四类引用标签的含义、`subject_definitions` 段落的组织方式与逐项写法。

Ref 扩写使用四类标签标记参考内容的归属：

|标签|表示的内容|
|---|---|
|`<Subject N>`|从参考素材中抽象出的、可在目标视频中复用或修改的可见内容|
|`<Picture N>`|作为具体目标帧或镜头规划依据的参考图片|
|`<Video N>`|提供剪辑源、续写起点或整段时序结构的参考视频|
|`<Audio N>`|被复制或参考的音频信号|

> 某个引用标签一旦分配给一项内容，在 `subject_definitions`、`summary`、`retention_analysis`、`detailed_description` 和声音段落中始终沿用同一含义。

`subject_definitions` 逐项定义后文需要独立追踪的引用内容，例如一个人物、一处场景、一段源视频结构或一条音频。每项引用内容单独使用一行，说明其标签指代什么、承担什么参考作用，以及需要参考的主要特征；需要明确素材归属时，再写出对应的参考来源。如果 `<Picture N>` 或 `<Video N>` 只用于说明另一项引用内容的素材来源，而不会在后文被单独分析或使用，则只在对应定义中引用，不另起一行。各项引用内容出现在哪些镜头，以及被完整保留、部分保留、迁移或复用的情况，统一写在 `retention_analysis` 中。

## 1. `<Subject N>`

`<Subject N>` 用于可重复引用的可见内容，例如：

- 人物、动物或物体

- 场景、背景或环境

- 服装、道具、界面或视觉特效

- 风格、动作、表情或姿态

它表示目标视频实际要使用的内容单元，而不是原始文件本身。一个主体可以由多份参考素材共同定义，一份参考素材也可以提供多个主体。

```text
<Subject 1> is the young woman in <Picture 1>, with long dark hair, a blue cardigan, and a thin silver necklace.
```

同一主体来自多份素材时，合并来源并说明各素材提供的内容：

```text
<Subject 1> is the woman whose appearance comes from <Picture 1> and whose walking motion comes from <Video 1>.
```

## 2. `<Picture N>`

参考图片本身作为某个镜头的首帧、关键帧、尾帧、编辑后关键帧或构图锚点时，使用独立的 `<Picture N>`：

```text
<Picture 2> is the first frame of [Shot 1], showing a woman seated beside a café window.
```

图片只用于定义人物、场景、服装或风格时，不另外创建独立图片条目，而是在对应 `<Subject N>` 中引用图片来源。

图片作为故事板或镜头规划依据时，写清它对应哪些镜头以及提供什么规划信息：

```text
<Picture 3> is a storyboard reference for [Shot 1] and [Shot 2], defining their viewpoint, subject placement, and shot order.
```

## 3. `<Video N>`

`<Video N>` 只用于整段视频层面的关系，例如：

- 原视频剪辑

- 从原视频结尾继续生成

- 参考原视频的运镜、切镜、节奏或时序结构

```text
<Video 1> is the source video for the target video edit.
```

参考视频中的人物、物体、场景、动作或效果如果作为可见内容被复用，仍归入 `<Subject N>`；`<Video N>` 只作为素材来源或结构来源，不代替主体标签。

## 4. `<Audio N>`

`<Audio N>` 表示独立音频素材，或被启用的参考视频同步音轨。常见用途包括：

- 完整或部分复制音频

- 参考背景音乐风格

- 参考说话人的音色和表达方式

- 使用原音频中的台词、歌词或音效

- 参考节拍、节奏或声音连续性

`<Audio N>` 明确对应某个目标说话人时，在定义中沿用该说话人的全局编号：对应已定义主体时写作 `<Subject N> (Sx)`，否则使用稳定的声音称呼加 `(Sx)`。该编号来自目标视频统一的说话人顺序，不在音频定义中单独分配或重新编号；编号规则见 `ref-description.md` 的「说话人、音频来源与台词」：

```text
<Audio 1> is the voice-timbre reference for <Subject 1> (S1).
```

同一音频承担多个作用时，合并成一个自然句子描述，不拆成额外的小节。

## 5. 同一参考视频的画面轨与音频轨

`<Video N>` 与 `<Audio N>` 各自独立编号，序号只表示它们在所属标签类别中的顺序，不表示二者之间的配对关系。因此，同一份参考视频可以同时对应 `<Video 1>` 和 `<Audio 2>`，序号不同不影响它们来自同一份素材。

普通参考视频不会仅因文件带有声音而自动产生 `<Audio N>`。

`<Audio N>` 的定义主要说明音频用途，不要求固定声明它来自哪个 `<Video N>`。只有需要消除素材来源歧义时，才补充同源关系，例如：

```text
<Video 1> is the source video for the target video edit.
<Audio 2> is the synchronized audio track of <Video 1> and is reused in the target video.
```
