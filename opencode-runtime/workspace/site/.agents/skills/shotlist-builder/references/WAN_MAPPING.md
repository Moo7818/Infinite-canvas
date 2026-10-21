# Seedance / H3 ↔ Wan 3.0 Structural Mapping

How the shotlist building blocks translate when the selected engine is **Wan 3.0**, adapted onto this skill's existing prompt-engineering design (STYLE_BLOCK.md's style system, PROMPT_PATTERNS.md's constraint system and rule-replacement hierarchy, H3_MAPPING.md's content-layer/syntax-layer split).

Content-layer knowledge (blocking, camera-emotion, micro-beats, density) still comes from this folder's existing references — only the **syntax layer** changes. Field names, five-section structure, material-mapping rules, sanitization and delivery rules come from `wan3-pe/SKILL.md` — when this file and that skill disagree, **the skill wins**.

## 1. Integration positioning

- `wan3-pe/SKILL.md` is the syntax-layer authority for Wan 3.0 (five-section template, material responsibility, mapping certainty, sanitization, delivery contract). Migrated verbatim (346 lines, checksum-verified).
- This file is the **mapping/adapter layer**, mirroring the role `H3_MAPPING.md` plays for H3.
- Default engine stays **Seedance 2.0**. Three engines coexist: Seedance 2.0 / MiniMax H3 / Wan 3.0. One engine per run.

## 2. Shot rows → timeline

| Shotlist concept | Seedance 2.0 | H3 | Wan 3.0 |
| --- | --- | --- | --- |
| Grouped 15s prompt | one prompt block with 【镜头N】 sections | one prompt with `[Shot 1]`, `[Shot 2]`… | **one request = one video**. Grouped rows become numbered plot nodes in 【情节概要】 (`1.` `2.` `3.`) |
| Duration expression | trailing `15秒。` footer | strictly increasing `At MM:SS.mmm`, ≤15.00 | **never written in the request body** — duration/aspect are page/interface parameters, used only to plan event density (wan3-pe hard rule 7). **Wan 3.0 supports up to 30 s per request — do not inherit the 15 s ceiling from the other engines** |
| Internal beat | 机位 / 背景 / 动作 / 微表演细节 sub-blocks | continuous prose along the timeline | node carries the plot beat (who + does what + event) **and its own camera demand whenever the approved shot plan specifies one**; per-shot camera design is preserved at full resolution (wan3-pe's story contract requires extracting 镜头诉求 verbatim), never flattened into a single global sentence. Micro-beats per MICRO_BEATS.md externalized as observable detail inside the node |
| Camera motion | 机位 line | natural English camera motion | 【运镜与核心约束】section (global lens style, movement, cutting rhythm) |
| Warning markers | `⚠️` inside the prompt | outside the prompt body | **absent from output** — the reply is the request body only (wan3-pe hard rule 9) |

## 3. Handles & assets

| Seedance | H3 | Wan 3.0 |
| --- | --- | --- |
| `@image1` re-declared per prompt | `<Picture N>` / `<Subject N>` / `<Audio N>` within one prompt | **图N / 视频N / 音频N** — numbered per modality by upload order; the number identifies the asset only, never its order of appearance |
| handles describe appearance head-to-toe | `subject_definitions` block | references are declared **centrally in 【核心任务】**; per-entity bindings read out along plot nodes. One binding per entity: `人物A对应图1，采用五官、发型和服装。` |
| — | — | Video assets follow wan3-pe's "视频区间入片" rules (action/motion/rhythm reference, or a complete segment spliced as the opening/middle/ending segment) |
| — | — | Multiple refs for one entity must state which view/attribute each supplies and that they define a single instance |

**Pipeline rule:** the asset upload list this skill produces IS the modality numbering — deliver a two-column mapping (upload order ↔ 图N/视频N/音频N) alongside the request.

## 3.1 Grouping envelopes: Wan runs on a 30-second ceiling

This is the one structural difference that changes the shot plan itself, not just its formatting:

| Engine | Per-prompt ceiling | Grouping consequence |
| --- | --- | --- |
| Seedance 2.0 | 15 s | shot rows grouped into 15 s envelopes |
| MiniMax H3 | 15 s (timestamps ≤ 15.00) | shot rows grouped into 15 s envelopes |
| **Wan 3.0** | **30 s** | shot rows may be grouped into **30 s envelopes** — merge what the other engines must split |

Rules for regrouping onto 30 s:

1. **Regroup from the shot table, not from the finished 15 s prompts.** Start from the approved shot rows; apply the PROMPT_DENSITY.md heuristic with the ceiling raised to 30 s. Do not concatenate two 15 s prompts that were split only by the old ceiling.
2. **A 30 s envelope must still be one continuous emotional/temporal unit** (same characters, no time skip). Location normally stays the same or a location-subset — **except for deliberate match-cut / montage units, where crossing locations IS the design intent**. There the continuity carrier is the **action phase and emotion**, not the location (e.g. matching body position, direction and step beat across cuts). Density per node stays guided by PROMPT_DENSITY.md — a longer envelope means more nodes, not faster cuts.
3. **Do not force every request to 30 s.** 4–30 s is a range; short emotional beats stay short (a 5 s insert is still a 5 s request). Length is planned from content, then carried as the interface parameter.
4. **When the project plan was written in 15 s units** (e.g. an existing shotlist), deliver a regrouping table: `old 15s prompt(s) → new Wan request → duration`. Keep the shot rows untouched; only the envelope boundaries move.
5. **Cross-engine mixing is not allowed inside one envelope** — a Wan request never references another engine's prompt numbering.

## 3.2 Reference intake limits (platform hard constraints)

Reference media is submitted with an explicit `type` field per asset. Check every asset against these limits **before** submission:

| Modality | `type` value | Max assets | Per-file limit | Duration limit | Extra |
| --- | --- | --- | --- | --- | --- |
| Image | `reference_image` | 10 | ≤ 20 MB | — | JPG / PNG etc. |
| Video | `reference_video` | 5 | ≤ 100 MB | **total ≤ 15 s across all clips** | frame rate ≥ 16 fps |
| Audio | `reference_audio` | 5 | ≤ 15 MB | **total ≤ 15 s across all clips** | — |

Rules:

1. **Two different 15 s ceilings — never conflate them.** The 15 s here caps **reference media intake** (the video/audio clips uploaded as references). The **generation** ceiling is 30 s per request (§3.1). They are independent.
2. **Trim references to the needed span.** Only the referenced passage matters, and the 15 s budget is shared across all clips of that modality — a 3-clip video reference must total ≤ 15 s.
3. **Frame rate floor.** Any reference video below 16 fps is rejected; check before upload.
4. **Ten image slots (one more than H3's nine).** Enough to carry a character sheet plus several scene references in one request — e.g. a hybrid-route prompt can hold both a live-action plate and a stylized scene image without running out of slots.

## 4. Style layer mapping (onto STYLE_BLOCK.md's system)

| Layer | Seedance 2.0 | H3 | Wan 3.0 |
| --- | --- | --- | --- |
| Style container | trailing standalone style block (`风格：…`) | 1–2 sentence preamble before `[Shot 1]` | **a global-tone sentence closing 【核心任务】** (`全片采用<全局风格基调>。`) for genre / palette / atmosphere only; **per-shot camera design is NOT part of this compression** — it is carried at full resolution into 【运镜与核心约束】 and the nodes |
| Project style compression | see project style doc §9 | natural-language style sentence | compress only the atmosphere layer into: (a) one tone sentence — e.g. `全片采用王家卫式大反差光影与皮克斯《心灵奇旅》式写实3D动画风格，青绿、钨丝金、秦淮蓝三色基调，大气薄雾质感`; (b) global camera/constraint paragraph in 【运镜与核心约束】. The shot plan's per-shot camera design (framing, lens, movement per shot) passes through **unabridged** — see §5 |
| Lighting | practicals-only clause in style block | folded into prose | positive clause in 【运镜与核心约束】; prohibitions go to 【负面提示词】 |
| 60:30:10 palette | inside style block | inside style sentence | folded into the global-tone sentence |

## 5. Constraint layer mapping (onto PROMPT_PATTERNS.md §10 + rule-replacement hierarchy)

| Engine | Where the constraint block lives |
| --- | --- |
| Seedance 2.0 | forbid block inside the prompt (trailing) |
| H3 | outside the body (document checklist, body stays clean) |
| **Wan 3.0** | **【负面提示词】section carries prohibitions (explicit strategy, user-confirmed); 【运镜与核心约束】 carries positive constraints** |

wan3-pe's §8 "don't add constraints the user didn't ask for" is reconciled as follows: this project's global constraints have been explicitly confirmed by the user as required exclusions, so every Wan request emits them in 【负面提示词】.

**Standard negative-prompt lists — the pattern, with the current project's two route lists as the worked example** (derived from PROMPT_PATTERNS §10 forbid block + rule-replacement direction; comma-separated). **The art route decides which list is emitted.** These lists are *project configuration, not engine machinery* — another project writes its own two lists by the same pattern:

*Route A — full 3D animation (all elements belong to one 3D world):*

```
实拍视频质感、真人实拍素材、真人写实面孔、游戏引擎质感、低质量游戏CG过场质感、塑料质感、补光、正面光、侧面补光、反光板、柔光箱、LED灯带、画面外光源、可见光束（god rays）、光学畸变、桶形畸变、枕形畸变、鱼眼、广角变形、漂浮道具、身份漂移、服装漂移、镜头抖动、画面字幕、画面文字、水印、Logo、配乐、背景音乐、BGM
```

*Route B — 3D cartoon characters × photorealistic live-action environment (hybrid):*

```
背景3D渲染感、环境卡通化、环境游戏引擎质感、低质量游戏CG过场质感、背景塑料质感、场景纸片感、角色真人化、角色写实面孔、补光、正面光、侧面补光、反光板、柔光箱、LED灯带、画面外光源、可见光束（god rays）、光学畸变、桶形畸变、枕形畸变、鱼眼、广角变形、漂浮道具、身份漂移、服装漂移、镜头抖动、画面字幕、画面文字、水印、Logo、配乐、背景音乐、BGM
```

In the current project, Route B additionally carries two body rules: (a) environment references use the **original live-action plates**, never the stylized 3D versions; (b) 【运镜与核心约束】 states that the character is the only 3D element and that its lighting direction, colour temperature, contact shadows, grade and grain match the plate exactly.

**Rule-replacement hierarchy retained** (state replacements explicitly, never silently):
- 霓虹 —— scene-inherent neon/lantern sources are allowed, but never as fill light and never allowed to color-cast onto the character's skin.
- 3D rendering —— direction depends on the art route: **Route A** inverts it (禁实拍质感 / 禁真人素材 / 禁游戏CG质感); **Route B** keeps `禁3D渲染` scoped to the environment layer only (backgrounds must stay photoreal — never the character), and adds 角色真人化 / 角色写实面孔 to protect the cartoon characters.

**Positive constraints (【运镜与核心约束】) carry two levels — both are written:**

- **Global level** (from the project style doc §5): low-dynamic baseline (static / slow slider / breathing handheld; no high-dynamic moves), shade-side framing, close-ups and tight shots as the rule for character shots, signature shots (match-cut walk, POV pull-back to half-subjective, rack-focus reveal), aerial limited to hover/straight slow moves. Practicals-only light sources and atmospheric haze also sit here.
- **Per-shot level**: every camera demand of the approved shot plan, written shot-by-shot and aligned to the node numbers — framing, lens feel, movement, focus behaviour, e.g. `镜头1：侧面跟拍缓慢平移；镜头2：低角度特写，固定机位；镜头3：固定特写`. Photography terminology (lens, shot size, movement type, focus pull) is fully supported here.

**Adaptation red line — do not thin out camera design.** wan3-pe's story contract explicitly requires extracting 镜头 / 声音 / 台词 / 字幕 demands (step 1); a per-shot camera design present in the approved plan is *user-given creative content*, not a "generic constraint" that hard rule 8 asks us to trim. Compressing it into one global sentence violates faithful transcription (hard rule 1). Brevity applies **only** to the global tone sentence and to generic quality/watermark-style constraints.

## 6. On-screen text

Wan: on-screen subtitles are written **only when the user explicitly asks**. This project burns subtitles in post → not written, and 画面字幕/画面文字 sit in 【负面提示词】. Scene-inherent signage (e.g. a wooden plaque reading "老门东") is scene dressing, not a subtitle — describe it plainly as part of the node/constraint text instead.

## 7. Where warnings and notes go

| Seedance | H3 | Wan 3.0 |
| --- | --- | --- |
| `⚠️` inside prompt | outside body (HTML/doc UI layer) | **nothing inside the body; the whole reply is the request body** (wan3-pe hard rule 9 / delivery contract). Only a trailing `素材提示：` or `补充说明：` line is permitted for asset-limit notices |

## 8. Output contract

| Contract | Wan 3.0 |
| --- | --- |
| Prompt language | follows the user's main instruction language (this project: Chinese); dialogue / lyrics / on-screen text keep original wording |
| Duration & aspect ratio | never in the body — interface parameters only; **duration may run up to 30 s** (the engine's structural difference from the 15 s ceilings of Seedance / H3 — plan envelopes per §3.1) |
| Reference numbering | user's original numbering preserved verbatim; modality numbering by upload order |
| Warnings | none in the body |
| Delivery shape | five sections in fixed order: 【核心任务】【情节概要】【音频风格】【运镜与核心约束】【负面提示词】; 【核心任务】+【情节概要】always present; 【音频风格】【运镜与核心约束】short or omitted if the input doesn't warrant them; 【负面提示词】only with confirmed exclusions (this project: always, per §5) |
| Generation channel | TBD — the prompt layer is ready, but a generation platform must actually expose a Wan 3.0 workflow/API for requests to be submitted (e.g. whether the platform used for H3, `minimax_h3_zm_u24` on autodl.art, adds a Wan workflow alongside it). Confirm the channel before wiring any submission script |

## 9. Load index

**Gate: every line below marked Required must be loaded before a single Wan request is written. The five-section format replaces the syntax layer only — the content layer is loaded in full, exactly as it would be for a Seedance or H3 run.** A Wan request rendered without the content layer is an empty container: five correctly ordered sections describing nothing.

- **Syntax layer — Required:** `wan3-pe/SKILL.md` (read in full — five-section template, material responsibility rules, mapping certainty tiers, sanitization, delivery checklist).
- **Content layer — Required (not optional, and not merely "unchanged"):** this folder's `PLAN_TYPES.md` (shot-size taxonomy), `SPATIAL_BLOCKING.md` (approved top-down blocking + concrete spatial relationships), `CAMERA_EMOTION.md` (camera-emotion sync, lens/aperture selection, shot-duration rules), `MICRO_BEATS.md` (performance beats, externalized as observable detail inside each plot node), `PROMPT_DENSITY.md` (density and rhythm). These are the same modules a Seedance or H3 run loads. **Being cited in passing inside this file (§2 "Micro-beats per MICRO_BEATS.md", §5 "per-shot camera design") is a load instruction, not a mention.**
- **Project style source:** the project's own style document — compress the atmosphere layer only (§4); per-shot camera design passes through unabridged (§5 red line).
- **Not used for Wan:** `PROMPT_PATTERNS.md`'s in-body forbid block and `STYLE_BLOCK.md`'s Chinese style block — their content is remapped per §4–§5 above.

## 10. Worked sample (P01 excerpt, H3 → Wan)

From the H3 six-section prompt (station silhouette / suitcase wheel / platform clock, 15s) the Wan request reads:

```text
【核心任务】
生成一段城市情感题材短片开场，3D动画角色吉小泰（3D卡通形象，形象对应图1）拉着行李箱走过雨夜车站站台，场景氛围参考图2。全片采用王家卫式大反差光影与皮克斯《心灵奇旅》式写实3D动画风格，冷灰蓝基调配车灯暖黄点缀，大气薄雾质感。

【情节概要】
1. 吉小泰拉着行李箱侧身走过雾蓝色站台，身影在车头灯逆光中呈剪影，步伐缓慢均匀。
2. 行李箱轮碾过湿润地砖接缝，水面映出拉长的灯光条纹。
3. 站台圆钟特写，秒针扫过雾气，身后发车牌泛着微光。

【运镜与核心约束】
逐镜机位：
镜头1：35mm广角感，侧面跟拍缓慢平移，人物居于画面右三分之一，画面带呼吸感微晃；
镜头2：低角度特写，固定机位，焦点锁定箱轮与地砖接缝；
镜头3：固定特写，焦点锁定钟面。
全局：镜头运动平缓稳定，不使用高动态运镜；摄影机始终处于人物阴影侧；仅用场景内的车站灯光、离站列车车头灯与发光车牌，无补光设备；全程大气薄雾。

【负面提示词】
实拍视频质感、真人实拍素材、真人写实面孔、游戏引擎质感、低质量游戏CG过场质感、塑料质感、补光、反光板、柔光箱、画面外光源、可见光束（god rays）、光学畸变、桶形畸变、枕形畸变、鱼眼、广角变形、漂浮道具、身份漂移、服装漂移、镜头抖动、画面字幕、画面文字、水印、Logo、配乐、背景音乐、BGM
```
