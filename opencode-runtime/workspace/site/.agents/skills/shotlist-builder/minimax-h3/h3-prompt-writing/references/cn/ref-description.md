# 详细描述（detailed_description）

这是全能参考模式扩写稿的主体，按目标视频播放顺序逐镜描述画面、动作、声音和台词，并在相关位置插入引用标签。

## 1. 基础格式

- **基础写法框架如下**（镜头、切镜与运镜见 `base-camera.md`，说话人、台词与画面文字见 `base-dialogue.md`，整体结构见 `base-structure.md`）：

    - 正文使用英文；台词、歌词和画面文字保留原始语言。

    - `[Shot 1]` 表示起始镜头，不带时间戳；后续镜头使用 `[Shot N] At MM:SS.mmm, ...` 标记切镜时间。

    - 运镜作为当前镜头中的自然英文描述，包含需要表达的类型、幅度和速度。

    - 发声者使用 `(S1)`、`(S2)` 等稳定编号，台词和歌词写作 `<d>[Language] ...</d>`。

    - 跨镜头台词、结尾截断和声音连续性分别使用 `<scenetrans>`、`<cutoff>` 及对应的连续性描述。

- **运镜词汇、群体发声、画外音、跨镜头台词和画面文字等相关规则及示例如下：**

    - **常用的规范运镜词汇**

    |类型|词汇|
    |---|---|
    |焦距变化|`Zoom In`、`Zoom Out`|
    |前后移动|`Push In`、`Pull Out`|
    |水平转动|`Pan Left`、`Pan Right`|
    |水平平移|`Truck Left`、`Truck Right`|
    |垂直转动|`Tilt Up`、`Tilt Down`|
    |垂直移动|`Pedestal Up`、`Pedestal Down`|
    |环绕与跟随|`Arc Shot`、`Tracking Shot`|
    |静止与抖动|`Static Shot`、`Shake Slightly`、`Shake Strongly`|
    |特殊视角|`POV`、`Roll Clockwise`、`Roll Counterclockwise`|

    - **群体发声**

    a. 群体始终统一发声，且没有成员单独说话或演唱时，整个群体作为一个说话人，共用一个编号：

    ```text
    the youth group (S1) chants together, <d>[English] Save the planet! Protect the trees! Keep the oceans clean!</d>
    ```

    b. 多个已有各自编号的说话人临时同时发声时，使用组合编号：

    ```text
    the three youths (S2,S3,S4) respond in unison, <d>[English] Yes! Ready!</d>
    ```

    - **画外音和内心独白**

    画外音、旁白和内心独白同样使用稳定的说话人编号与 `<d>`，并使用 `off-screen` 或 `voice-over` 说明声音位置。声音表达某个画面内人物的想法、但并非由其嘴部发出时，写清声音与该人物的关系；需要消除歧义时，可补充人物嘴部保持静止。纯画外说话人没有可见嘴部，不写闭嘴描述：

    ```text
    an adult male off-screen narrator with a deep, magnetic voice (S1) says, <d>[English] In the quiet embrace of autumn, a tiny squirrel embarked on its daily quest.</d>
    ```

    - **跨镜头台词与画内声音**

    a. 完整台词在切镜前已经结束时，新镜头直接开始：

    ```text
    [Shot 1] ... the team leader (S1) shouts, <d>[English] Ready, team?</d> [Shot 2] At 00:02.500, the camera cuts to the waiting youth group.
    ```

    b. 同一句台词跨越切镜时，前半句结尾和后半句开头分别使用 `<scenetrans>`，并在新镜头中说明声音从上一镜连续过来：

    ```text
    [Shot 1] ... the off-screen narrator (S1) continues, <d>[English] Beneath the rustling leaves, it unearthed a secret,<scenetrans></d> [Shot 2] At 00:04.500, the shot cuts to an extreme close-up of the glowing gear. The audio seamlessly continues from the previous shot. The same off-screen narrator (S1) concludes, <d>[English] <scenetrans>a glimmering relic of an unknown world.</d>
    ```

    c. 可使用的音频连续性表达包括：

    ```text
    The audio from the [source] continues uninterrupted over this visual.
    The audio seamlessly continues from the previous shot.
    The audio from the previous shot continues over the transition.
    ... continues seamlessly over the cut, transitioning from [A] to [B].
    The off-screen [singer / speaker] (Sx) ... continues [her/his] vocal line from the previous shot.
    [action] is heard off-screen, [continuation] from the previous shot.
    ```

    d. 画内演唱、乐器、广播、电视、手机音乐或动作声跨越切镜连续时，同样使用上述音频连续性表达。`<scenetrans>` 只用于同一句台词或同一行歌词在切镜处被分成两段的情况。

    同一句台词或歌词连续跨越两次切镜时，中间镜头中的 `<d>` 同时以 `<scenetrans>` 开头和结尾：

    ```text
    <d>[English] <scenetrans>it unearthed a secret<scenetrans></d>
    ```

    e. 视频结尾截断

    台词因视频结束而未说完时，在最后一句末尾使用 `<cutoff>`：

    ```text
    <d>[English] Save the planet! Protect the trees! Keep the oceans<cutoff></d>
    ```

    `<scenetrans>` 表示同一句台词跨切镜连续，`<cutoff>` 表示台词被整段视频的结束边界截断。

    - **画面文字**

    画面中实际可见的横幅、招牌、标识或霓虹文字使用双引号标出，保留原始语言和原始内容，不进行翻译：

    ```text
    a red neon sign reading "营业中" glows above the doorway
    ```

## 2. 全能参考模式的差异

|维度|T2VA|全能参考模式|
|---|---|---|
|主体字段|`integrated_multimodal_description`|`detailed_description`|
|风格开头|写在 `[Shot 1]` 后|在 `[Shot 1]` 前用 1—2 句英文建立全局视觉风格|
|引用信息|不使用全能参考模式的引用标签|在首次出现和实际作用位置插入 `<Subject N>`、`<Picture N>`、`<Video N>`、`<Audio N>`|
|音频关系|描述目标视频自身声音|在对应的镜头或声音阶段引用 `<Audio N>`，并说明复制或参考关系|

开头示例：

```text
The target video is in a cinematic, literary music-video style with soft lighting and a slightly desaturated color palette.
[Shot 1] The scene opens in a crowded urban street...
[Shot 2] At 00:09.000, the shot cuts to an extreme close-up...
```

生成类任务的 `detailed_description` 通常为 350—500 个英文单词。台词密集型内容以完整容纳台词时间线为先，不机械补足字数；视频编辑类内容则按源视频复杂度展开，不强制套用生成类区间。单镜头并不自动缩短篇幅，多镜头按各镜头的信息量分配细节。

## 3. 引用标签在镜头中的写法

重要 `<Subject N>` 第一次清晰出现时，在镜头实际可见范围内描述其参考特征、画面位置和当前动作；后续镜头继续使用同一标签，不重新定义该标签所指的内容。

具体帧锚点使用以下自然表达：

```text
the shot begins from <Picture 1>
the shot's keyframe corresponds to <Picture 2>
the shot ends on <Picture 3>
```

原视频编辑或续写时，在镜头描述中自然引用 `<Video N>` 的源状态、结构或延续关系。音频在某个镜头或时段实际生效时，在相应位置引用 `<Audio N>`。

## 4. 说话人、音频来源与台词

说话人编号及 `<d>` 的基础格式沿用 `base-dialogue.md` 的写法。参考主体实际开口时，同时保留视觉引用标签和说话人编号：

```text
<Subject 2> (S1) turns toward the woman and says, <d>[English] Last summer, I went to my grandfather's house. He talked about you.</d>
```

`<Subject N>` 表示引用主体，`(Sx)` 表示实际发声者。主体本人发声时写作 `<Subject N> (Sx)`；同一主体在画外发声时仍沿用该写法，并标明 `off-screen`。发声者不对应已定义主体时，使用稳定的声音称呼加 `(Sx)`。

当台词、歌词、口号等人声内容只是直接复用的 BGM 或完整 soundtrack 中的声音片段，且没有人物、角色或旁白实际发出该声音时，使用 `<Audio N>` 作为声音来源，不额外创造 `(Sx)`。如果声音由具体人物、角色、旁白或其他独立发声者实际发出，则仍为该发声者分配并沿用 `(Sx)`：

```text
When <Audio 1> reaches the phrase <d>[English] I'm lonely lonely lonely lonely lonely I'm lonely</d>, <Subject 1> performs the corresponding hand gesture without becoming a separate speaker source.
```

直接复用参考音频中的台词、旁白或歌词，或输入 prompt 明确要求复述这些内容时，`<d>` 内必须使用忠实的原始字词并保留原语言；无法辨认的部分写作 `[unclear]`，不猜测或改写。标点统一使用表达句意所需的基础书面标点，如 `,`、`.`、`?` 和 `!`；删除重复波浪号、emoji、项目符号以及重复或装饰性标点。完整的陈述句、疑问句和感叹句分别在 `</d>` 前以 `.`、`?` 或 `!` 结束。

仅参考音色、节奏、情绪或表达方式时，不应将参考音频中的原台词带入目标视频。

`(Sx)` 根据目标视频中的实际发声顺序统一分配。`detailed_description` 在每次实际发声位置沿用对应编号；`subject_definitions` 中与目标说话人绑定的 `<Audio N>` 定义也沿用同一个 `(Sx)`，但不独立分配新编号。`retention_analysis` 不写 `(Sx)`。直接复用的 BGM 或完整 soundtrack 中仅作为音轨内容出现的台词、歌词、口号等人声片段使用 `<Audio N>`；由具体人物、角色、旁白或其他独立发声者实际发出的声音使用 `(Sx)`。
