# Retention Analysis

This section describes how each piece of referenced content is preserved, transferred, copied, or referenced in the target video. Use one line for each reference label and preserve the meaning established in `subject_definitions`.

## 1. Visible Content

`<Subject N>`, `<Picture N>`, and `<Video N>` use the following relationship markers. These markers are fixed English values in the output format:

| Relationship marker | Meaning |
| --- | --- |
| `fully_preserved` | The defined role of the referenced content is fully preserved |
| `partially_preserved` | The referenced content is still used, but some defined characteristics are changed or only partially retained |
| `attribute_transfer` | Referenced characteristics are transferred to a different identifiable target subject |
| `weak_reference` | Only broad similarity in style, category, composition, or atmosphere is retained |

Subject entry:

```text
<Subject 1> (appears in [Shot 1], [Shot 3]): fully_preserved - ...
```

Picture entry:

```text
<Picture 2> ([Shot 1] first frame): fully_preserved - ...
```

Video-structure entry:

```text
<Video 1> (cut and pacing structure): weak_reference - ...
```

## 2. Audio

`<Audio N>` uses the following relationship markers:

| Relationship marker | Meaning |
| --- | --- |
| `fully_copy` | The complete source audio serves as the target video's complete final audio track |
| `partially_copy` | Only part of the timeline or selected audio layers are copied, or other sounds are added, removed, or replaced after copying |
| `reference` | The signal is not copied directly; only timbre, rhythm, music style, dialogue content, or sound texture is referenced |
| `weak_reference` | Only broad similarity in category or atmosphere is retained |

```text
<Audio 1>: fully_copy - <Audio 1> is reused 1:1 as the target video's complete final audio track.
```

```text
<Audio 2>: reference - the target speaker follows <Audio 2>'s voice timbre and measured delivery without copying the original signal.
```

Choose each relationship marker only within the reference role already defined for that label in `subject_definitions`. Do not treat newly added actions, backgrounds, or plot events in the target video as losses of reference fidelity.
