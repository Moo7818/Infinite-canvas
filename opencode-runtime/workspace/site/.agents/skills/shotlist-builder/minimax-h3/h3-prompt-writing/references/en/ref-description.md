# Detailed Description

This is the main body of a full-reference rewrite. It describes visuals, actions, sound, and dialogue shot by shot in target-video playback order and inserts reference labels where they apply.

## 1. Basic Format

The basic format follows the base-mode modules (`base-structure.md`, `base-camera.md`, `base-dialogue.md`) in this folder:

- Write the body in English. Preserve the original language of dialogue, lyrics, and visible text.
- `[Shot 1]` marks the opening shot and has no timestamp. Later shots use `[Shot N] At MM:SS.mmm, ...` to mark cut times.
- Write camera movement as natural English within the current shot, including movement type, amplitude, and speed when they need to be expressed.
- Give vocal sources stable `(S1)`, `(S2)`, and subsequent IDs. Write dialogue and lyrics as `<d>[Language] ...</d>`.
- Use `<scenetrans>`, `<cutoff>`, and the corresponding continuity descriptions for dialogue crossing a cut, speech truncated by the video ending, and continuous audio across shots.

For complete rules and examples covering camera vocabulary, group speech, voice-over, dialogue across cuts, and visible text, see the base-mode modules (`base-camera.md`, `base-dialogue.md`, `base-structure.md`) in this folder.

## 2. Full-Reference Mode Differences

| Dimension | T2VA | Full-reference mode |
| --- | --- | --- |
| Main field | `integrated_multimodal_description` | `detailed_description` |
| Style opening | Written after `[Shot 1]` | Established in one or two English sentences before `[Shot 1]` |
| Reference information | Does not use full-reference labels | Inserts `<Subject N>`, `<Picture N>`, `<Video N>`, and `<Audio N>` at their first appearance and where their roles apply |
| Audio relationships | Describes the target video's own sound | Cites `<Audio N>` in the corresponding shot or audio phase and states whether the signal is copied or referenced |

Opening example:

```text
The target video is in a cinematic, literary music-video style with soft lighting and a slightly desaturated color palette.
[Shot 1] The scene opens in a crowded urban street...
[Shot 2] At 00:09.000, the shot cuts to an extreme close-up...
```

For generation tasks, `detailed_description` is normally 350-500 English words. Dialogue-dense content prioritizes fitting the complete spoken timeline rather than mechanically reaching a word count. Video-editing descriptions scale with the complexity of the source video and do not have to follow the generation-task range. A single shot does not automatically justify a shorter description; distribute detail across multiple shots according to their information load.

## 3. Using Reference Labels in Shots

At the first clear appearance of an important `<Subject N>`, describe its referenced characteristics, position in the frame, and current action within what is actually visible in the shot. Continue using the same label in later shots without redefining what the label represents.

Use natural phrasing for concrete frame anchors:

```text
the shot begins from <Picture 1>
the shot's keyframe corresponds to <Picture 2>
the shot ends on <Picture 3>
```

When editing or continuing an original video, cite `<Video N>` naturally where its source state, structure, or continuation relationship applies. Cite `<Audio N>` in the shot or semantic phase where the audio relationship is active.

## 4. Speakers, Audio Sources, and Dialogue

The basic speaker-ID and `<d>` formats follow T2VA. When a referenced subject physically speaks, retain both the visual reference label and the speaker ID:

```text
<Subject 2> (S1) turns toward the woman and says, <d>[English] Last summer, I went to my grandfather's house. He talked about you.</d>
```

`<Subject N>` identifies the referenced subject, while `(Sx)` identifies the actual speaker. When the subject speaks, write `<Subject N> (Sx)`. If the same subject speaks off-screen, keep the same form and mark it as `off-screen`. When the speaker does not correspond to a defined subject, use a stable voice description followed by `(Sx)`.

When verbal content is only a cue within a directly reused BGM or complete soundtrack, and no person, character, narrator, or other independent vocal source physically produces it, use `<Audio N>` as the audible source and do not invent an additional `(Sx)`. If a concrete person, character, narrator, or other independent vocal source produces the voice, assign and reuse `(Sx)` for that source:

```text
When <Audio 1> reaches the phrase <d>[English] I'm lonely lonely lonely lonely lonely I'm lonely</d>, <Subject 1> performs the corresponding hand gesture without becoming a separate speaker source.
```

When dialogue, narration, or lyrics from reference audio are directly reused, or when the input prompt explicitly requests their reperformance, preserve the exact source words and original language inside `<d>`. Write `[unclear]` for unintelligible spans instead of guessing or paraphrasing them. Standardize punctuation to the basic written marks needed to express the sentence, such as `,`, `.`, `?`, and `!`; remove repeated tildes, emoji, bullets, and repeated or decorative punctuation. End complete statements, questions, and exclamations with `.`, `?`, or `!` respectively before `</d>`.

When only timbre, rhythm, emotion, or delivery is referenced, do not carry the original dialogue from the reference audio into the target video.

Assign `(Sx)` once according to the order of actual vocal events in the target video. Reuse the corresponding ID at every actual vocal event in `detailed_description`; an `<Audio N>` definition bound to a target speaker in `subject_definitions` also reuses the same `(Sx)` but never assigns a new one independently. Do not write `(Sx)` in `retention_analysis`. Verbal cues that exist only within a directly reused BGM or complete soundtrack use `<Audio N>`; voices physically produced by a concrete person, character, narrator, or other independent vocal source use `(Sx)`.
