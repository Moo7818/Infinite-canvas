# Seedance ↔ H3 Structural Mapping

How the shotlist building blocks translate when the selected engine is **MiniMax H3**. Content-layer knowledge (blocking, camera-emotion, micro-beats, density) comes from this folder's existing references; only the **syntax layer** changes. Field names, label rules, and timestamp notation come from `minimax-h3/h3-prompt-writing/` — when this file and this bundle disagree, the bundle wins.

## Shot rows → timeline

| Shotlist concept | Seedance 2.0 | H3 |
| --- | --- | --- |
| Grouped 15s prompt | one 提示词 block with 【镜头N】 sections | one prompt with `[Shot 1]`, `[Shot 2]`… |
| First shot | first 【镜头1】 block | `[Shot 1]` — **no timestamp** |
| Later shots | 【镜头N】 header | `[Shot N] At 00:0X.XXX, the camera cuts to…` — strictly increasing, all < 15.00 |
| Internal beat | 机位 / 背景 / 动作 / 微表演细节 sub-blocks | continuous prose along the timeline inside `integrated_multimodal_description` |
| Duration footer | `15秒。` (no ratio) | timestamps already encode 15s; keyframe modes carry the fixed instruction line with `S.SS` = 15.00 |

## Mode-specific assembly

- **T2VA** — no instruction line; start directly with the three fields.
- **I2VA** — first line is the fixed instruction (`For the target video, at 0.00 seconds… <Picture 1> (from [Shot 1]) is fully referenced.`), then the three fields; `[Shot 1]` opens by anchoring the picture's style, subject, and composition, then develops forward.
- **FL2VA** — fixed two-picture alignment instruction; body describes the path from first frame to last frame (prefer a single shot); no aspect-ratio wording.
- **L2VA** — fixed last-frame alignment instruction; body infers a plausible earlier state and converges to the picture in the final `[Shot N]`.
- **Ref2VA** — six sections in order: `subject_definitions`, `summary`, `retention_analysis`, `detailed_description`, `overall_soundscape`, `non_diegetic_music`. Exact templates: `minimax-h3/h3-prompt-writing/references/<lang>/ref-structure.md` etc., per its Load Index.

## Handles & assets

| Seedance | H3 base modes | H3 Ref2VA |
| --- | --- | --- |
| `@image1`, re-declared per prompt | `<Picture 1>` only where a keyframe exists (I2VA/FL2VA/L2VA instruction + body) | Phase 3 filename mapping drafts `<Subject N>` (characters/locations/props) and `<Picture N>` (frame anchors); `<Video N>` / `<Audio N>` for source media |
| handles renumber per prompt | labels consistent **within** one prompt | labels consistent across all six sections of one prompt |

Never carry label numbering across separate prompts — each 15s prompt is standalone for both engines.

## Style & cinematography rendering

| Content-layer rule (shared) | Seedance rendering | H3 rendering |
| --- | --- | --- |
| House style block (STYLE_BLOCK.md) | verbatim Chinese style block | style opening inside `[Shot 1]` after the shot marker (base modes) or 1–2 English sentences **before** `[Shot 1]` (Ref2VA) |
| Lens & camera-emotion (CAMERA_EMOTION.md) | 机位 line, Chinese camera verbs | natural English camera motion inside the shot, using the motion-type + amplitude + speed pattern — load `base-camera.md` |
| Micro-beats (MICRO_BEATS.md) | 中文微表演细节 sub-block | English prose in the timeline: muscles, breath, eye-line, weight shift |
| Dialogue & speakers | Chinese prompt, dialogue quoted in English `"line"` | stable `(S1)` speaker IDs, `<d>[Language] …</d>` verbatim, off-screen/`<scenetrans>`/`<cutoff>` rules — load `base-dialogue.md` when dialogue exists |
| Soundscape / music | 音效 & 配乐 lines in the style block | separate `overall_soundscape` + `non_diegetic_music` fields (English, 1–4 / 1–3 sentences) |
| Spatial blocking schema (Phase 3 SVG) | translates to 机位/背景 distances | translates to prose spatial relationships in the description — same SVG, same approval flow |
| Failure-mode warnings | `⚠️` inside the prompt | **outside the prompt body** — HTML cell UI layer only; prompt stays clean model input |
| Practicals-only lighting | style block line | explicit source-by-source lighting prose in the description (windows, practicals, screens; no fill light) |

## On-screen Chinese text in H3 prompts

Visible scene text (signs, screens, handwritten notes) goes in English double quotes inside the body, original language preserved:

```text
A red neon sign reading "营业中" glows above the doorway.
```

Dialogue/lyrics stay inside `<d>[Chinese] …</d>` — never translated.

## HTML cell differences (see templates/HTML_TEMPLATE.md)

- Prompt header badge shows the engine: `[Seedance 2.0]` or `[H3 · T2VA]` … `[H3 · Ref2VA]`.
- `{PROMPT_BODY}` is Chinese for Seedance, English for H3; Copy button copies body verbatim.
- Cell meta line carries duration only (`15秒`); aspect ratio never appears in the prompt or its footer.
- H3 warnings render as a muted note line under the badge, never inside the copied body.
