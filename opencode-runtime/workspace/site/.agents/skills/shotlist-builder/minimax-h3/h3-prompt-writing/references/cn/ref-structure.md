# 全能参考模式：整体结构、摘要与声音

本文说明全能参考模式下扩写结果的组织方式与书写格式。

扩写的六个段落正文统一使用英文；只有 `<d>` 中的台词、歌词以及画面中实际可见的文字保留原始语言。

**描述详细度：** `detailed_description` 应尽量详细、明确，逐镜交代当前构图、主体外观与位置、环境与光线、动作及状态变化、相机运动、当下声音，以及参考内容实际出现或生效的位置，避免只概括剧情或引用关系。

> 镜头、运镜的基础写法见 `base-camera.md`，说话人、台词与画面文字的基础写法见 `base-dialogue.md`，整体结构与声音段落的基础写法见 `base-structure.md`。以下重点说明全能参考模式独有的引用标签、分析段落和格式差异。

## 1. 整体结构

一份完整扩写结果由六个段落组成，按以下顺序排列：

|段落|作用|
|---|---|
|`subject_definitions`|定义参考内容及其引用标签|
|`summary`|概括任务类型、目标视频和主要引用关系|
|`retention_analysis`|说明参考内容的保留、迁移或复用关系|
|`detailed_description`|按播放顺序描述画面、动作、镜头、声音和台词|
|`overall_soundscape`|概括环境声和物理声音|
|`non_diegetic_music`|描述只有观众能够听到的背景配乐|

引用标签与定义的完整写法见 `ref-labels.md`，保留分析见 `ref-retention.md`，详细描述见 `ref-description.md`。

## 2. `summary`

这一段用一个简短英文段落概括目标视频及其引用关系。开头使用方括号标记任务类型：

```text
[reference generation] ...
[video editing + reference generation + audio reuse] ...
```

根据参考素材在目标视频中的实际作用选择任务类型：

|任务类型|使用场景|
|---|---|
|`keyframe completion`|图片作为目标视频的首帧、关键帧、尾帧、编辑后关键帧或其他具体帧锚点|
|`reference generation`|图片、视频或音频提供人物、场景、风格、动作、运镜、分镜规划等生成参考，但不直接作为具体帧或待编辑、续写的源视频|
|`video editing`|直接修改一段已有的源视频；仅编辑图片或在静态关键帧之间生成不属于这一类型|
|`video continuation`|从已有源视频继续、延长、恢复或转接出新的内容|
|`audio reuse`|完整或部分复用同一段音频信号|
|`audio reference`|不直接复制音频信号，只参考配乐风格、音色、台词或歌词内容、音效质感、节拍或声音连续性|

同一任务同时满足多个关系时，使用加号组合，且加号前后各保留一个空格，不重复同一类型。例如，从源视频继续生成并以一张图片作为尾帧时，写作 `[video continuation + keyframe completion]`；编辑源视频并保留原音轨时，可写作 `[video editing + audio reuse]`。

素材中存在视频或音频并不自动产生对应类型。参考视频只提供运镜、切镜或节奏时，通常属于 `reference generation`；只有直接编辑或续写该视频时，才使用 `video editing` 或 `video continuation`。

编辑源视频时，如果原音轨继续可听，通常同时使用 `audio reuse`；续写源视频时，如果只延续原音轨的声音特征而不直接复制信号，通常使用 `audio reference`。

摘要使用前文已经定义的 `<Subject N>`、`<Picture N>`、`<Video N>` 和 `<Audio N>`，简要说明重要主体、镜头流程及素材作用，不在这里引入新的引用标签。

视频编辑类摘要在任务类型之后使用以下开头：

```text
The target video is an edited version of <Video 1>.
```

## 3. `overall_soundscape` 与 `non_diegetic_music`

- `overall_soundscape`：概括整段视频的环境声和物理声音。

台词、演唱以及与具体镜头同步的声音事件仍写在 `detailed_description` 中：

```text
overall_soundscape: Quiet indoor room tone and a low ventilation hum continue throughout the video.
```

*没有环境声时写：*

```text
overall_soundscape: N/A
```

- `non_diegetic_music`：描述角色听不到、只有观众能够听到的背景配乐，存在配乐时说明乐器、速度和动态变化：

```text
non_diegetic_music: A restrained solo-piano score at a slow tempo, with sustained low cello underneath and no swell.
```

*没有此类配乐时可写：*

```text
non_diegetic_music: N/A
```

使用参考音频时，只在与其实际声音层对应的段落中说明复制或参考关系：环境声和音效写在 `overall_soundscape`，只有观众能听到的配乐写在 `non_diegetic_music`；同一音频同时提供两类内容时，分别写入两段：

```text
overall_soundscape: The copied ambience layer from <Audio 1> continues throughout the target video.
non_diegetic_music: <Audio 2> is directly reused as the complete audience-only score.
```

完整台词和歌词只写在 `detailed_description` 的 `<d>` 中，不在这两个段落中重复。
