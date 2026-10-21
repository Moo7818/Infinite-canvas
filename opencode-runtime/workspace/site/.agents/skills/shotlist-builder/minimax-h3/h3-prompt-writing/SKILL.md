---
name: h3-prompt-writing
description: Write MiniMax H3 video generation prompts for T2VA, I2VA, FL2VA, L2VA, and full-reference Ref2VA. Use when rewriting multimodal requests into H3 prompt structures, composing integrated_multimodal_description, overall_soundscape, and non_diegetic_music, building the six-section full-reference format, aligning keyframes, or defining reference labels for pictures, videos, and audio.
compatibility: Portable to any agent that can read local files — no external API calls, MiniMax Hub tools, or proprietary runtime required. The agents/openai.yaml file only adds optional ChatGPT/Codex UI metadata; it does not restrict the skill to OpenAI agents.
---

# H3 Prompt Writing

Prompt writing for H3 upgrades from "describing a picture" to "organizing an audiovisual sequence": turn open, scattered, unstructured user input into instructions the model can understand, execute, and control.

## Workflow

1. Identify the input mode: T2VA, I2VA, FL2VA, L2VA, or full-reference Ref2VA (decision table below).
2. Pick the module language: `references/en/` or `references/cn/` (match the user's language).
3. Load only the modules listed in the Load Index for your mode and content.
4. Preserve exact field names, section order, labels, and timing notation from the loaded modules.

## Mode Decision

| User input | Mode |
| --- | --- |
| Text only | T2VA |
| Text + first-frame image | I2VA |
| Text + first-frame and last-frame images | FL2VA |
| Text + last-frame image | L2VA |
| Reuse, edit, or continue existing images / videos / audio as references | Ref2VA (full-reference) |

## Output Skeleton

**Base modes** (T2VA / I2VA / FL2VA / L2VA): a fixed one-line image-alignment instruction (none for T2VA; exact templates in `base-structure.md`), then three core fields:

```text
integrated_multimodal_description: ...

overall_soundscape: ...

non_diegetic_music: ...
```

**Full-reference mode** (Ref2VA): six sections in this fixed order:

```text
subject_definitions / summary / retention_analysis / detailed_description / overall_soundscape / non_diegetic_music
```

## Hard Rules

- Rewrite sections in English; preserve dialogue, lyrics, and visible scene text in their original language (inside `<d>` and double quotes).
- Match the total described duration to the requested video length (4–15 seconds); cut timestamps are strictly increasing and within duration.
- Keep reference labels consistent across every section (`<Subject N>`, `<Picture N>`, `<Video N>`, `<Audio N>`).
- Prefer concrete visual and audio details over abstract words like "cinematic" or "beautiful".
- When using keyframes (I2VA / FL2VA / L2VA), state exactly how the first and/or last frame connects to the timeline.

## Load Index (read only what you need)

| Condition | Read (under `references/<lang>/`, lang = `en` or `cn`) |
| --- | --- |
| Base mode — always | `base-structure.md` |
| Multiple shots or camera motion | + `base-camera.md` |
| Dialogue, voice-over, or on-screen text | + `base-dialogue.md` |
| Need worked examples | + `base-cases.md` |
| Full-reference mode — always | `ref-structure.md` + `ref-labels.md` + `ref-retention.md` + `ref-description.md` |
| Need a complete worked example | + `ref-example.md` |

## More

- User-facing H3 manual (Chinese): [MiniMax H3 模型 - 使用手册](https://vrfi1sk8a0.feishu.cn/wiki/FIWjwgL33ipnkekzk30crmKUnIh)
- Chinese version of this entry: [`SKILL.cn.md`](SKILL.cn.md)
