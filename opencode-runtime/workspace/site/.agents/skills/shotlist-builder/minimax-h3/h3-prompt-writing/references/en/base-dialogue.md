# Speakers, Dialogue & On-Screen Text

## 1. Speakers, Dialogue, and Singing

Subjects who speak, sing, or produce an off-screen human voice use stable IDs such as `(S1)` and `(S2)`. When multiple already-numbered speakers speak or sing together, use a compound ID such as `(S1,S2)`. A speaker keeps the same ID across shots; characters who never vocalize receive no speaker ID.

When a speaker first appears, provide enough information from the visual and audio context to establish a stable identity, such as character type, age, gender, whether the person is on-screen, pitch, timbre, speaking rate, or accent. Place the speaker's identifying phrase, ID, action, and delivery outside `<d>`. Inside `<d>`, include only the language tag and the actual user-provided spoken content. Preserve every original word and punctuation mark verbatim; do not translate or rewrite them.

```text
The young woman with a quiet, breathy voice (S1) says: <d>[English] I get off at the next station.</d>
The two children (S1,S2) shout together, <d>[English] Wait for us!</d>
```

For voiceover, use the exact phrase `says in an off-screen voiceover`. Immediately after every voiceover `<d>` block, state that the corresponding on-screen character's lips remain closed:

```text
The man (S1) says in an off-screen voiceover: <d>[English] I still remember that road.</d> while his lips remain completely closed.
```

When the same line of dialogue or lyrics crosses a cut, use `<scenetrans>` at the connecting points in both parts and explicitly state that the audio continues across the cut. Use `<cutoff>` when speech is truncated by the end of the video. Continuity may be expressed with `continues seamlessly across the cut`, `continues uninterrupted into the next shot`, `carries over from the previous shot`, or `remains audible across the transition`.

## 2. On-Screen Text

Place any banner, sign, label, subtitle, or neon text that is actually visible on screen in English double quotation marks. Preserve the original text and punctuation verbatim, without translation.

```text
A red neon sign reading "营业中" glows above the doorway.
```
