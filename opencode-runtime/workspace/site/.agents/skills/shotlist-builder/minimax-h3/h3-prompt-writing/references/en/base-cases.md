# Cases

## Case 1: T2VA

With no reference image, construct the complete timeline directly from the text. You may add scene, character, action, and sound details that remain consistent with the user's intent.

```text
integrated_multimodal_description: [Shot 1] Live-action, cinematic, a medium-wide shot frames a baker opening the shutters of a small street bakery before sunrise. The camera pushes in with small amplitude at slow speed as the middle-aged baker with a calm, slightly raspy voice (S1) places a fresh loaf on the wooden counter and says: <d>[English] First batch of the morning.</d> [Shot 2] At 00:05.000, the camera cuts to a close-up of steam rising from the sliced bread while the baker's final words carry over from the previous shot.

overall_soundscape: Wooden shutters scrape open over a quiet street as trays clink softly inside the bakery. The doorbell rings once, followed by light footsteps and the crisp sound of bread being sliced.

non_diegetic_music: A soft acoustic-guitar pattern at a moderate tempo, joined by sparse upright-bass notes and a gentle fade at the end.
```

## Case 2: T2VA

With no reference image, build the complete timeline directly from the text. You may add scene, character, action, and sound details that remain consistent with the user's intent.

```text
integrated_multimodal_description: [Shot 1] Cinematic, medium-wide shot. The camera pulls out slowly inside a convenience store illuminated by harsh cool-white fluorescent lights. The glossy white tiled floor reflects the ceiling lights and a trail of rainwater from the glass entrance doors. In the midground, a young on-screen man with wet, shaggy blond hair, wearing a navy windbreaker over a faded grey t-shirt, stands before an open refrigerated display case. He hesitates, lifts a bright green plastic beverage bottle from a metal wire shelf, sets it down, and picks it up again. As he holds the bottle, an off-screen middle-aged man with a calm, deep voice (S1) says, <d>[English] We don't have money.</d> The visible blond man remains silent and keeps his lips closed. [Shot 2] At 00:04.500, the camera cuts to a medium close-up of the blond man and pans right to follow his sudden movement. His face tightens under the stark lighting and his body freezes while his right hand still grips the green bottle from Shot 1. He sharply pushes the bottle back into the empty slot, turns on his heel, lowers his gaze, and walks briskly out of frame to the right.


overall_soundscape: A continuous electrical buzz from the fluorescent lights blends with muffled heavy rain outside. A plastic bottle clatters twice against the metal wire shelf, wet rubber soles squeak on the tiled floor, and rapid footsteps recede down the aisle.


non_diegetic_music: A low, sustained electronic synth drone at a slow tempo, with subtle bass pulses and no swell.
```

## Case 3: I2VA

Write the first-frame instruction first, then use the subject, composition, and scene in Picture 1 as the starting point of Shot 1 before describing how the scene continues to develop.

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] Live-action, cinematic, the young woman shown in <Picture 1> remains beside the rain-covered train window, preserving her appearance, clothing, seat position, and the carriage layout. The camera trucks right with small amplitude at slow speed as she lifts her gaze from the folded letter toward the passing city lights. Her reflection moves across the glass while the quiet, breathy young woman (S1) says: <d>[English] I get off at the next station.</d> She folds the letter along its existing crease.

overall_soundscape: The train wheels produce a steady metallic rhythm beneath a low ventilation hum. Rain ticks against the window while paper rustles softly in her hands.

non_diegetic_music: Sustained cello notes at a slow tempo with widely spaced piano tones, gradually decreasing in volume.
```

## Case 4: FL2VA

The two images anchor the opening and ending respectively. The body should not repeat two static image descriptions; instead, it should supply the motion path that connects them. The following example is an eight-second single shot.

```text
How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 1) aligns with the 8.00-second mark of the target video.

integrated_multimodal_description: [Shot 1] Live-action, cinematic, a rain-soaked cyclist begins in the position and framing established by Picture 1, holding a closed black umbrella beside a silver bicycle. The camera pulls out with small amplitude at slow speed as she releases the bicycle handle, raises the umbrella above her shoulder, and presses the runner upward until the canopy opens. Water rolls from the expanding fabric while she steps beneath it, rotates the handle into the final angle, and settles into the pose, spacing, and composition established by Picture 2 at the end of the shot.

overall_soundscape: Rain falls steadily on the pavement, followed by the metallic click of the umbrella runner and the soft snap of the canopy opening. Water drips from the bicycle frame as distant traffic passes.

non_diegetic_music: N/A
```

## Case 5: L2VA

The image anchors only the final moment. First establish a compatible earlier state, then let the actions, object states, and composition gradually land on Picture 1 in the final shot. The following example is a six-second single shot.

```text
How the reference pictures align with the target video — <Picture 1> (from [Shot 1]) aligns with the 6.00-second mark of the target video.

integrated_multimodal_description: [Shot 1] Live-action, cinematic, a close shot begins with an intact drinking glass near the edge of a dark wooden table, while the same hand and sleeve visible in <Picture 1> approach from the right. The camera pushes in with small amplitude at slow speed as the fingertips strike the rim. The glass tips, falls, and hits the floor with a sharp impact; cracks spread through it as fragments slide outward. Toward the end, the moving pieces lose momentum and settle into the exact broken arrangement, hand position, camera angle, lighting, and final composition established by <Picture 1>.

overall_soundscape: Fingertips tap the glass before it scrapes across the tabletop, falls, and breaks with a sharp crash. Small fragments scatter and gradually stop sliding across the floor.

non_diegetic_music: A low electronic pulse at a slow tempo, ending immediately after the glass breaks.
```
