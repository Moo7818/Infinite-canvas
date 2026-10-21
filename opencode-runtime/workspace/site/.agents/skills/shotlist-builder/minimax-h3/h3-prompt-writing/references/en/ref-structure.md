# Full-Reference Mode: Structure, Summary & Sound

This guide explains how rewrite outputs are organized and written in full-reference mode.

Write all six rewrite sections in English. Preserve the original language only for dialogue and lyrics inside `<d>` and for text visibly present in the scene.

**Description detail:** Make `detailed_description` as detailed and explicit as possible. For each shot, clearly establish the current composition, subject appearance and position, environment and lighting, actions and state changes, camera movement, current sound, and the points where referenced content actually appears or takes effect. Avoid reducing the description to a plot summary or a list of reference relationships.

> The basic formats for shots, camera movement, speakers, dialogue, and ordinary sound are shared with the base-mode modules (`base-camera.md`, `base-dialogue.md`, `base-structure.md`) in this folder. This guide focuses on the reference labels, analysis sections, and format differences specific to full-reference mode.

## 1. Overall Structure

A complete rewrite output consists of six sections in the following order:

| Section | Purpose |
| --- | --- |
| `subject_definitions` | Defines referenced content and its reference labels |
| `summary` | Summarizes the task type, target video, and main reference relationships |
| `retention_analysis` | Describes how referenced content is preserved, transferred, or reused |
| `detailed_description` | Describes visuals, actions, shots, sound, and dialogue in playback order |
| `overall_soundscape` | Summarizes ambience and physical sounds |
| `non_diegetic_music` | Describes background music audible only to the audience |

## 2. `summary`

This section uses one short English paragraph to summarize the target video and its reference relationships. It begins with a square-bracketed task-type prefix:

```text
[reference generation] ...
[video editing + reference generation + audio reuse] ...
```

Choose task types according to the actual role each reference asset plays in the target video:

| Task type | When to use it |
| --- | --- |
| `keyframe completion` | An image serves as the target video's first frame, keyframe, last frame, edited keyframe, or another concrete frame anchor |
| `reference generation` | An image, video, or audio asset provides generation guidance for a character, scene, style, action, camera movement, storyboard, and so on, without serving as a concrete frame or as the source video being edited or continued |
| `video editing` | An existing source video is directly modified; editing an image or generating between still keyframes does not belong to this type |
| `video continuation` | New content continues, extends, resumes, or transitions from an existing source video |
| `audio reuse` | The same audio signal is reused in full or in part |
| `audio reference` | The audio signal is not copied directly; only its music style, timbre, dialogue or lyric content, sound-effect texture, beat, or continuity is referenced |

When a task satisfies multiple relationships, combine the task types with ` + ` and do not repeat a type. For example, continuing from a source video while using an image as the last frame is written as `[video continuation + keyframe completion]`. Editing a source video while retaining its original audio may be written as `[video editing + audio reuse]`.

The mere presence of video or audio does not automatically create a corresponding task type. If a reference video provides only camera movement, cuts, or rhythm, it normally belongs to `reference generation`. Use `video editing` or `video continuation` only when that video is directly edited or continued.

When editing a source video, use `audio reuse` as well if its original audio remains audible. When continuing a source video without directly copying the audio signal, use `audio reference` if the new audio only continues the original track's audible characteristics.

The summary uses the previously defined `<Subject N>`, `<Picture N>`, `<Video N>`, and `<Audio N>` labels to describe the main subjects, shot flow, and roles of the reference assets. Do not introduce new reference labels in this section.

For video-editing tasks, begin the summary after the task-type prefix with:

```text
The target video is an edited version of <Video 1>.
```

## 3. `overall_soundscape` and `non_diegetic_music`

The definitions of these two sound categories follow `base-structure.md`.

`overall_soundscape` summarizes ambience and physical sounds across the full video. Dialogue, singing, and sound events synchronized to a particular shot remain in `detailed_description`:

```text
overall_soundscape: Quiet indoor room tone and a low ventilation hum continue throughout the video.
```

`non_diegetic_music` describes background music that the characters cannot hear and that is audible only to the audience. When music is present, state its instrumentation, tempo, and dynamic development:

```text
non_diegetic_music: A restrained solo-piano score at a slow tempo, with sustained low cello underneath and no swell.
```

When reference audio is used, state its copy or reference relationship only in the section that matches the audible layer: ambience and sound effects belong in `overall_soundscape`, while audience-only score belongs in `non_diegetic_music`. If the same audio provides both kinds of content, describe the corresponding relationship in each section:

```text
overall_soundscape: The copied ambience layer from <Audio 1> continues throughout the target video.
non_diegetic_music: <Audio 2> is directly reused as the complete audience-only score.
```

Write complete dialogue and lyrics only inside `<d>` in `detailed_description`; do not repeat them in these two sections.
