# Reference Labels & Definitions (subject_definitions)

Full-reference rewrites use four types of labels to identify the source and role of referenced content:

| Label | Meaning |
| --- | --- |
| `<Subject N>` | Visible content abstracted from reference assets that can be reused or modified in the target video |
| `<Picture N>` | A reference image used as a concrete target frame or shot-planning anchor |
| `<Video N>` | A reference video that provides an editing source, continuation starting point, or whole-video temporal structure |
| `<Audio N>` | An audio signal that is copied or referenced |

> Once a reference label is assigned to a piece of content, it keeps the same meaning across `subject_definitions`, `summary`, `retention_analysis`, `detailed_description`, and the audio sections.

`subject_definitions` defines each piece of referenced content that must be tracked separately later, such as a person, an environment, a source video's structure, or an audio track. Give each item its own line and explain what its label denotes, its reference role, and the main features to follow; name the corresponding source asset when its provenance needs to be made explicit. If `<Picture N>` or `<Video N>` only identifies the source of another referenced item and will not be analyzed or used separately later, cite it inside that item's definition without adding a separate line. `retention_analysis` records where each referenced item appears and whether it is fully preserved, partially preserved, transferred, or reused.

## 1. `<Subject N>`

`<Subject N>` is used for reusable visible content, including:

- People, animals, or objects
- Scenes, backgrounds, or environments
- Clothing, props, interfaces, or visual effects
- Styles, actions, expressions, or poses

It represents a content unit that will actually be used in the target video, rather than the source file itself. One subject may be defined by multiple reference assets, and one reference asset may provide multiple subjects.

```text
<Subject 1> is the young woman in <Picture 1>, with long dark hair, a blue cardigan, and a thin silver necklace.
```

When the same subject comes from multiple assets, combine the sources and state what each asset provides:

```text
<Subject 1> is the woman whose appearance comes from <Picture 1> and whose walking motion comes from <Video 1>.
```

## 2. `<Picture N>`

Use a standalone `<Picture N>` when the reference image itself serves as a shot's first frame, keyframe, last frame, edited keyframe, or composition anchor:

```text
<Picture 2> is the first frame of [Shot 1], showing a woman seated beside a café window.
```

If an image is used only to define a character, scene, costume, or style, do not create a standalone picture entry. Instead, cite the image source inside the corresponding `<Subject N>` definition.

When an image acts as a storyboard or shot-planning reference, state which shots it maps to and what planning information it provides:

```text
<Picture 3> is a storyboard reference for [Shot 1] and [Shot 2], defining their viewpoint, subject placement, and shot order.
```

## 3. `<Video N>`

`<Video N>` is reserved for whole-video relationships, such as:

- Editing an original video
- Continuing from the end of an original video
- Referencing the original video's camera movement, cuts, rhythm, or temporal structure

```text
<Video 1> is the source video for the target video edit.
```

If a person, object, scene, action, or effect from a reference video is reused as visible content, it still belongs under `<Subject N>`. `<Video N>` identifies the asset or structural source and does not replace subject labels.

## 4. `<Audio N>`

`<Audio N>` represents a standalone audio asset or an enabled synchronized audio track from a reference video. Common uses include:

- Copying all or part of an audio signal
- Referencing a background-music style
- Referencing a speaker's voice timbre and delivery
- Using dialogue, lyrics, or sound effects from the original audio
- Referencing beat, rhythm, or audio continuity

When an `<Audio N>` explicitly corresponds to a target speaker, reuse that speaker's global ID in the definition: write `<Subject N> (Sx)` when the speaker maps to a defined subject, or use a stable voice description followed by `(Sx)` otherwise. The ID comes from the target video's global speaker order and is not independently assigned or renumbered in the audio definition. See Section 5.4 for the speaker-numbering rules:

```text
<Audio 1> is the voice-timbre reference for <Subject 1> (S1).
```

When one audio asset serves multiple roles, describe those roles in one natural sentence rather than creating additional subsections.

## 5. Visual and Audio Tracks from the Same Reference Video

`<Video N>` and `<Audio N>` are numbered independently. Each index indicates only the label's order within its own category and does not encode a pairing between the two categories. The same reference video may therefore correspond to `<Video 1>` and `<Audio 2>`; different indices do not prevent them from coming from the same source asset.

An ordinary reference video does not create `<Audio N>` merely because the file contains sound.

An `<Audio N>` definition primarily states the audio's role and does not have to name the `<Video N>` it comes from. State the shared source only when needed to remove provenance ambiguity, for example:

```text
<Video 1> is the source video for the target video edit.
<Audio 2> is the synchronized audio track of <Video 1> and is reused in the target video.
```
