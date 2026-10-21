# HTML Template

The output is a single self-contained HTML file. Use the exact CSS/JS from the team's house template (the one in `Shotlist_21_23_EN.html` you generated previously is canonical).

## Engine parameterization

Placeholders that depend on the selected prompt engine (see [references/PROMPT_ENGINES.md](../references/PROMPT_ENGINES.md)):

| Placeholder | Seedance 2.0 | MiniMax H3 | Wan 3.0 |
| --- | --- | --- | --- |
| `{ENGINE}` | `Seedance 2.0` | `MiniMax H3 · T2VA` / `· I2VA` / `· FL2VA` / `· L2VA` / `· Ref2VA` | `Wan 3.0` |
| `{ENGINE_BADGE}` | `Seedance 2.0` | e.g. `H3 · FL2VA` | `Wan 3.0` |
| `{PROMPT_BODY}` | Chinese prompt (verbatim house pattern) | English structured prompt (instruction + fields, or six sections) | Chinese five-section request body (【核心任务】【情节概要】【音频风格】【运镜与核心约束】【负面提示词】) |
| `{H3_WARNINGS_UI}` | empty (warnings, if any, are inside the Chinese prompt) | muted amber note lines with `⚠️` warnings — **outside** the copied body | empty (a Wan reply is the request body alone; only a trailing `素材提示：`/`补充说明：` line may follow) |
| Filename | `Shotlist_<scope>_EN.html` | `Shotlist_<scope>_H3.html` | `Shotlist_<scope>_WAN.html` |

**Cell meta line:** duration only (`15秒` in the meta span). Aspect-ratio notation (any `N:N` string) is permanently banned from every prompt body, footer, style block, and instruction line — it may appear nowhere except, at most, the page header stats area outside any copyable text.

## Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Shotlist — Scenes {SCOPE} (with {ENGINE} 提示词)</title>
  <style>{HOUSE_CSS}</style>
</head>
<body>
<div class="container">
  <header class="top">
    <h1>Shotlist — <span>Scenes {SCOPE} (with {ENGINE} 提示词)</span></h1>
    <div class="sub">Prepared for {USERNAME} · {N_SHOTS} shots across {N_SCENES} scenes · with detailed cinematic prompts ({ENGINE})</div>
    <div class="stats">
      <div class="stat"><div class="v">{N_SCENES}</div><div class="l">scenes</div></div>
      <div class="stat"><div class="v">{N_SHOTS}</div><div class="l">total shots</div></div>
      <div class="stat"><div class="v">{N_PLANS}</div><div class="l">plan types</div></div>
    </div>
  </header>

  <div class="toolbar">
    <input type="text" id="search" placeholder="Search by text, dialogue, locations...">
    <select id="planFilter">
      <option value="">All plans</option>
      {PLAN_OPTIONS}
    </select>
    <button onclick="window.print()">🖨 Print / PDF</button>
    <button class="clear" onclick="resetFilters()">Reset</button>
  </div>

  <div class="toc">
    <div class="toc-row"><span class="toc-label">Scenes</span>{TOC_LINKS}</div>
  </div>

  <h2 class="block-title first">Scenes {SCOPE}</h2>

  {SCENE_BLOCKS}

  <div class="empty-state" id="emptyState" style="display:none;">Nothing found. Try resetting the filters.</div>
</div>
<script>{HOUSE_JS}</script>
</body>
</html>
```

## Per-scene block

```html
<section class="scene pal-red" id="sc{N}">
  <div class="scene-head">
    <div class="scene-num-row">
      <span class="scene-num">SCENE {N}</span>
    </div>
    <h2 class="scene-title">{INT_EXT_HEADER}</h2>
    <div class="scene-meta">
      <span><b>Location:</b> {LOCATION_DESC}</span>
      <span><b>Mood:</b> <i>{MOOD}</i></span>
      <span class="shot-count">{N_SHOTS} shots</span>
    </div>
  </div>
  <div class="table-wrap">
    <table class="shotlist">
      <colgroup>
        <col style="width:60px"><col style="width:140px"><col style="width:140px"><col style="width:auto"><col style="width:30%"><col style="width:35%">
      </colgroup>
      <thead>
        <tr><th>#</th><th>Plan</th><th>Camera</th><th>Action</th><th>Scene text</th><th>{ENGINE} 提示词</th></tr>
      </thead>
      <tbody>
        {SHOT_ROWS_WITH_PROMPTS}
      </tbody>
    </table>
  </div>
</section>
```

## Shot row + prompt cell

The first row of a prompt group carries the rowspanned `c-script` and `c-prompt` cells. Subsequent rows in the same group only have `c-num`, `c-plan`, `c-cam`, `c-act`.

```html
<tr data-scene="{N}" data-plan="{PLAN_CODE}">
  <td class="c-num">{SHOT_NUM}</td>
  <td class="c-plan"><span class="badge p-{PLAN_CLASS}">{PLAN_LABEL}</span></td>
  <td class="c-cam">{CAMERA_NOTE}</td>
  <td class="c-act">{ACTION_BEAT_EN}</td>
  <td class="c-script" rowspan="{GROUP_SIZE}">
    <div class="script-inner">{FULL_SCENE_TEXT_EN}</div>
  </td>
  <td class="c-prompt" rowspan="{GROUP_SIZE}">
    <div style="font-size:11px; line-height:1.6;">
      {PROMPT_BLOCKS}
    </div>
  </td>
</tr>
{ADDITIONAL_ROWS_NO_RIGHT_CELLS}
```

## Prompt block (one per 15-sec prompt)

The Copy button reads `parentElement.nextElementSibling` — the prompt body **must** remain the element immediately after the header div. Warnings and meta stay inside the header div.

```html
<div style="border-top:1px solid #333; margin:12px 0 8px; padding-top:8px;">
  <b style="color:#22c55e;">提示词 {N}</b>
  <span style="color:#666; font-size:10px;">[{TAG}]</span>
  <span style="color:#a1a1aa; font-size:10px; border:1px solid #3f3f46; border-radius:4px; padding:1px 6px; margin-left:6px;">{ENGINE_BADGE}</span>
  <span style="color:#555; font-size:10px; margin-left:6px;">15秒</span>
  <button style="margin-left:8px;padding:2px 8px;background:#27272a;border:1px solid #3f3f46;border-radius:4px;color:#a1a1aa;font-size:10px;cursor:pointer" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.textContent)">Copy</button>
  {H3_WARNINGS_UI}
</div>
<div class="prompt-block">{PROMPT_BODY}</div>
```

- `{TAG}` is a short bracketed shorthand like `[MS-CU · door open + boots]` or `[ECU · polaroid + Roko face]` — describes the prompt at a glance.
- `{H3_WARNINGS_UI}`: for Seedance render nothing; for H3 render `<div style="color:#f59e0b; font-size:10px; margin-top:4px;">⚠️ handle contamination — …</div>` lines (one per warning). Never place H3 warnings inside `{PROMPT_BODY}`.
- The meta span shows duration only. No ratio strings, ever.

## CSS + JS

Reuse the team's house CSS/JS verbatim. Do not modify palettes, fonts, or layout. Director palette logic (`pal-black` / `pal-blue` / `pal-red`) defaults to `pal-red` for all scenes unless director assignment is explicitly requested.

**Note on plan codes:** the skill now uses English plan codes (`WS`, `MS`, `CU`, `ECU`, `MACRO`, `PAN`, `OS`, `VO`, `VO+MS`, `DISSOLVE`) for both the visible badge label and the `data-plan` attribute. The plan filter dropdown's `<option value>` should match. If reusing CSS from older Cyrillic-coded HTMLs, swap the badge classes (`p-op` → `p-ws`, `p-sp` → `p-ms`, `p-kp` → `p-cu`, `p-dkp` → `p-ecu`, `p-vyk` → `p-os`) — the colors stay the same; only class names change.

## Filter dropdown

```html
<select id="planFilter">
  <option value="">All plans</option>
  <option value="WS">Wide shot</option>
  <option value="MS">Medium shot</option>
  <option value="CU">Close-up</option>
  <option value="ECU">Extreme close-up</option>
  <option value="MACRO">Macro</option>
  <option value="PAN">Pan</option>
  <option value="OS">Off-screen sound</option>
  <option value="VO">Voice-over</option>
  <option value="VO+MS">VO · medium shot</option>
  <option value="DISSOLVE">Dissolve</option>
</select>
```
