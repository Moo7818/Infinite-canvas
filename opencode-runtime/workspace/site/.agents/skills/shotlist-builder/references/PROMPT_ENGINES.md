# Prompt Engines

This skill supports three prompt engines. One engine is selected per run; the whole shotlist is produced in that engine only.

| Engine | Prompt language | Structure |
| --- | --- | --- |
| Seedance 2.0 (default) | Chinese | 【镜头N】 blocks + house style block (this folder's patterns) |
| MiniMax H3 | English body; dialogue, lyrics, and on-screen text keep original language | Per-mode structure defined in `minimax-h3/h3-prompt-writing/` |
| Wan 3.0 | Follows the user's main instruction language; dialogue / lyrics / on-screen text keep original | Fixed five sections — 【核心任务】【情节概要】【音频风格】【运镜与核心约束】【负面提示词】 — defined in `wan3-pe/SKILL.md`; shotlist translation per `WAN_MAPPING.md`. **Duration ceiling is 30 s per request (not 15 s)** — regroup envelopes per `WAN_MAPPING.md` §3.1 |

## Content layer vs syntax layer — the hard split

**Engine selection changes only the syntax layer (Phase 4 output format). The content layer is identical in every run and mandatory for all three engines.**

| Layer | Modules | When it runs |
| --- | --- | --- |
| **Content** — engine-independent, always required | `PLAN_TYPES.md` (shot-size taxonomy: WS / MS / CU / ECU / MACRO, plus the camera-column vocabulary) · `SPATIAL_BLOCKING.md` (top-down schema + concrete spatial relationships and distances) · `CAMERA_EMOTION.md` (camera-emotion sync, lens/aperture selection, shot-duration rules) · `MICRO_BEATS.md` (performance beats decomposed by emotion) · `PROMPT_DENSITY.md` (action density and grouping) | Phases 1–3 and the planning part of Phase 4 — **before any prompt is written** |
| **Syntax** — engine-specific | Seedance 2.0: house patterns + style block · MiniMax H3: the `h3-prompt-writing/` modules · Wan 3.0: `wan3-pe/SKILL.md` + `WAN_MAPPING.md` | Phase 4 rendering only |

Three consequences worth stating plainly:

1. **An engine is a delivery format, not a workflow.** Whether the run is Seedance, H3 or Wan, the shot plan must carry shot size, lens, camera movement + the emotion it tracks, per-shot blocking, performance beats and duration. Only their *expression* changes.
2. **Engine format work never substitutes for the content layer.** Time spent on handles, labels, footers, style blocks or five-section structure is overhead on top of the content layer — it does not replace a single one of those modules.
3. **A content module cited in an adapter file must be loaded, not noted.** `H3_MAPPING.md`, `WAN_MAPPING.md` and this file all reference the content modules by name; each reference is a load instruction. Trimming the content layer "because the engine's manual doesn't mention it" inverts the dependency — the engine manual governs syntax, never content.

## Engine selection (ask once, at the end of Phase 1)

Ask **after** reading the script and **before** producing the Phase 2 asset list — the selected mode determines which images the user must generate.

**Q1 — Engine**

> Which prompt engine should I build with?
> 1. **Seedance 2.0** (default) — existing house patterns, Chinese prompts
> 2. **MiniMax H3** — structured multimodal prompts, 5 generation modes
> 3. **Wan 3.0** — five-section request formatting (【核心任务】【情节概要】【音频风格】【运镜与核心约束】【负面提示词】), image/video/audio references

**Q2 — Mode (only if H3 is selected)**

> Which H3 mode?
> 1. **T2VA** — text only, no images required
> 2. **I2VA** — first-frame anchored; needs first-frame images
> 3. **FL2VA** — first + last frame anchored; needs both per prompt unit
> 4. **L2VA** — last-frame anchored; needs last-frame images
> 5. **Ref2VA (full-reference)** — multi-asset reference rewrite; needs the full asset set

Rules:
- If the user already named the engine or mode in their initial request, **confirm instead of asking**.
- If the user does not answer, default to **Seedance 2.0**.
- Never ask twice; record the choice and carry it through Phase 2–4.

## Mode → asset requirements (drives Phase 2)

| Engine / mode | Character & location refs | Keyframe images | Source video / audio | Notes |
| --- | --- | --- | --- | --- |
| Seedance 2.0 | Yes (full list) | No | No | unchanged behavior |
| H3 · T2VA | No | No | No | script-only run; optional style reference image |
| H3 · I2VA | Recommended | First frame per prompt unit | No | request keyframe images per scene beat in Phase 2; align to 15s units in Phase 4 |
| H3 · FL2VA | Recommended | First **and** last frame per prompt unit | No | same alignment flow as I2VA |
| H3 · L2VA | Recommended | Last frame per prompt unit | No | same alignment flow |
| H3 · Ref2VA | Yes (full list) | As needed per prompt | Optional | filename → `<Subject N>` / `<Picture N>` draft mapping happens in Phase 3 |
| Wan 3.0 | Yes (full list, split by modality) | As frame anchors if the user wants them | Yes (video: action/motion/rhythm or a full splice segment; audio: voice/ambience/segment) | references declared centrally in 【核心任务】; modality numbering by upload order (图N / 视频N / 音频N). **Intake limits**: images ≤10 (`reference_image`, ≤20 MB each); video ≤5 clips (`reference_video`, total ≤15 s, ≥16 fps, ≤100 MB each); audio ≤5 clips (`reference_audio`, total ≤15 s, ≤15 MB each) — see `WAN_MAPPING.md` §3.2 |

Phase 2 output format stays identical (Characters / Locations / Props / Style references), with one adjustment per mode:

- **T2VA:** replace the asset list with: *"No image assets required — this is a text-only run. Tell me which scenes to build prompts for (and optionally upload one style reference)."*
- **Keyframe modes (I2VA / FL2VA / L2VA):** add a **Keyframes** section listing one line per intended prompt unit: `Scene N beat: <description of the frame>` with start/end frames for FL2VA.
- **Ref2VA:** full list plus an optional **Source media** section (source video to edit / continue, audio to reuse or reference).
- **Wan 3.0:** same full list (Characters / Locations / Props / Style references) plus an optional **Source media** section (video to reference for action/motion/rhythm or to splice as a segment; audio for voice/ambience/segment). Number every asset per modality in upload order — that numbering becomes 图N / 视频N / 音频N in the request, and the upload list doubles as the numbering draft for Phase 3.

## Output contract per engine

| Contract | Seedance 2.0 | H3 (all modes) | Wan 3.0 |
| --- | --- | --- | --- |
| Duration expression | trailing `15秒。` footer inside the prompt | shot timestamps strictly increasing, last event ≤ 15.00s; keyframe modes also carry the fixed instruction line with `S.SS` = 15.00 | never written in the body — interface parameter only; **may run up to 30 s per request** (vs the 15 s ceiling of the other engines); grouped rows become numbered plot nodes in 【情节概要】 |
| Aspect ratio | **never inside the prompt** — HTML cell meta line only | **never inside the prompt** — HTML cell meta line only | **never inside the prompt** — interface parameter only |
| Warnings (`⚠️`) | may appear inside the prompt | **outside** the prompt body, in the HTML cell UI layer only | **none in the output** — the reply is the request body only; a trailing `素材提示：` / `补充说明：` line is the sole exception |
| Handles / labels | `@image1` style, re-declared per prompt | per-prompt labels (`<Picture N>`, `<Subject N>…`), consistent within the prompt | 图N / 视频N / 音频N, numbered per modality by upload order; the user's original numbering is preserved verbatim |
| Output filename | `Shotlist_<scope>_EN.html` | `Shotlist_<scope>_H3.html` | `Shotlist_<scope>_WAN.md` (or `.html` when HTML output is enabled) |

> **Permanent rule:** no aspect-ratio notation (any `N:N` string) may ever appear in a prompt body, footer, or style block. Ratio metadata lives only in HTML headers/cell meta.

## Optional: hub style-skill suggestions (Phase 1, non-blocking)

The bundled hub at `minimax-h3/` contains 8 content-production skills. If the script genre matches one, mention it as an optional reference in one line — do not let it derail the main flow:

| Script genre | Optional reference |
| --- | --- |
| Product / e-commerce promo | `minimax-h3/minimalist-product-ad-generator/` |
| Brand / website launch film | `minimax-h3/brand-promo-video-generator/` |
| Narrative 3D animation | `minimax-h3/3d-animation-short-generator/` |
| Science / education explainer (papercraft) | `minimax-h3/papercraft-stop-motion-explainer/` |
| Knowledge / opinion explainer (collage) | `minimax-h3/paper-collage-explainer-generator/` |
| Music video with lyrics | `minimax-h3/music-video-subtitle-generator/` |
| Game menu / intro | `minimax-h3/co-op-game-intro-generator/` |
| Hand-drawn × live-action experiment | `minimax-h3/handdrawn-live-video-generator/` |

## H3 knowledge loading

H3 rules live in `minimax-h3/h3-prompt-writing/`. Follow its L1 entry (`SKILL.md` or `SKILL.cn.md`, match the user's language) and its **Load Index**: read only the modules the current content requires (`base-structure` always for base modes; `base-camera` for multi-shot/camera motion; `base-dialogue` for dialogue/voice-over/on-screen text; `ref-*` set for Ref2VA; case/example modules only when a worked example helps). Do not bulk-load all 18 modules.

## Wan knowledge loading

Wan rules live in `wan3-pe/SKILL.md` — read it **in full** before writing any Wan request (single-file skill, migrated verbatim with checksum verification). Then apply this folder's `WAN_MAPPING.md` to translate shot rows, style and constraints into the five-section structure. Never import Seedance or H3 prompt syntax into a Wan request — no trailing style block, no 【镜头N】 headers, no `<Picture N>` labels, no in-body `⚠️` markers; the reply is the request body alone.
