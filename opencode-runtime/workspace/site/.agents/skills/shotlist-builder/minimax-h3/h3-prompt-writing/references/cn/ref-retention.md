# 保留分析（retention_analysis）

本模块说明 `retention_analysis` 段落的写法：逐项说明每项参考内容在目标视频中的保留、迁移、复制或参考关系。每个引用标签使用一行，并沿用 `subject_definitions` 中已经确定的含义（标签定义见 `ref-labels.md`）。

## 1. 可见内容

`<Subject N>`、`<Picture N>` 和 `<Video N>` 使用以下关系标记。这些标记是格式中的固定英文取值：

|关系标记|含义|
|---|---|
|`fully_preserved`|对应参考内容的既定作用被完整保留|
|`partially_preserved`|对应参考内容仍被使用，但已定义的部分特征发生变化或只保留一部分|
|`attribute_transfer`|参考特征被迁移到另一个可独立识别的目标载体|
|`weak_reference`|只保留宽泛的风格、类别、构图或氛围相似性|

主体条目写法：

```text
<Subject 1> (appears in [Shot 1], [Shot 3]): fully_preserved - ...
```

图片条目写法：

```text
<Picture 2> ([Shot 1] first frame): fully_preserved - ...
```

视频结构条目写法：

```text
<Video 1> (cut and pacing structure): weak_reference - ...
```

## 2. 音频

`<Audio N>` 使用以下关系标记：

|关系标记|含义|
|---|---|
|`fully_copy`|完整源音频作为目标视频的完整最终音轨|
|`partially_copy`|只复制部分时间段或音频层，或者复制后又增加、删除、替换了其他声音|
|`reference`|不直接复制信号，只参考音色、节奏、音乐风格、台词内容或声音质感|
|`weak_reference`|只保留宽泛的类别或氛围相似性|

```text
<Audio 1>: fully_copy - <Audio 1> is reused 1:1 as the target video's complete final audio track.
```

```text
<Audio 2>: reference - the target speaker follows <Audio 2>'s voice timbre and measured delivery without copying the original signal.
```

关系标记以该标签在 `subject_definitions` 中已经定义的参考作用为判断范围，不把目标视频中新加入的动作、背景或剧情误写成参考损失。
