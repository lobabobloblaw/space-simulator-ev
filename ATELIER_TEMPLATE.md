# Atelier template — asset provenance log

> Imported reference from the sibling dog-park project ("Time For Park"): its asset
> provenance log, kept as the methodology template for Galaxy Trader's atelier
> pipeline (roadmap P2 / REMEDIATION_PLAN_2.md). When generation starts in this repo,
> Galaxy Trader gets its own fresh `SOURCES.md` in this format. Everything below is
> the original document, verbatim.

Every file under `assets/` is generated content, curated by the user and
committed here (the repo is the source of truth; `deploy.sh` mirrors this
folder to `website/park/assets/`). Log each adopted asset when it lands:

```
## assets/<path>
- model: <owner/name on Replicate>
- prediction: <prediction id>            (lets us re-download or re-run)
- prompt: <the exact prompt>
- post: <local processing, e.g. "ffmpeg loop-trim + aac 128k">
- license note: <model output license situation>
- adopted: <date>
```

Rules (see CLAUDE.md → Atelier):
- Nothing lands without the user hearing/seeing it first (curation gate).
- Audio ships as m4a (AAC) or mp3 — never ogg (Safari/iOS can't decode it).
- The game must stay fully playable if every asset 404s (fallback doctrine).

## Adopted assets

### assets/music/dawn.m4a
- model: `stability-ai/stable-audio-2.5`
- prediction: `jth6zm9td9rmr0cz6d9s3s6a9c` (batch 3, candidate "V")
- prompt: "tiptoe pizzicato strings and marimba sneaking-around tune, bouncy
  staccato, quirky toy orchestra, playful, warm and silly, sparse, lo-fi charm,
  seamless loop, instrumental, no drums, no vocals" (32s, steps 8, cfg 6)
- post: −3.45dB static gain to −18 LUFS (static, not loudnorm, to keep the seam
  symmetric); 2s qsin crossfade loop-author (tail 30–32s blended over head
  0–2s) → 30.000s seamless loop; aac 160k m4a. Chrome decodes exactly 30.0000s
  (encoder padding stripped) — gapless verified headless.
- license note: Stability AI Community License output; personal non-commercial
  page use.
- adopted: 2026-07-05 — user picked the concept in batch 2 ("tiptoe pizzicato")
  and this execution in batch 3; **stable-audio-2.5 is the house model** for
  the remaining beds (day/dusk/night/rain) and the fanfare.

### assets/models/doghouse.glb
- model: `firtoz/trellis` (image→3D); final prediction `s01bc96vthrn80cz6dsbapthtm`
  (texture 1024, mesh_simplify 0.98, seed 42 → 1.72MB / 28.6k tris)
- concept chain: `google/nano-banana-pro` `zjtbjvhyadrmy0cz6dgbh9sapw`
  (nameplate version — user flagged the baked text as garbled) → edit
  `351agaxz2xrmw0cz6drrr3xepm` removed the nameplate → re-TRELLIS. Earlier
  GLBs: `k7rwvmd5c5rna0cz6dh94gz2ec` (2048/0.95: 5.05MB / 54.5k, over budget),
  `3ph24bz5v1rnc0cz6djaxs6km0` (nameplate bake garbled AND duplicated).
- **doctrine lesson: never bake text into generated assets** — image→3D
  reconstruction turns text to mush (and can duplicate it). Names/labels are
  runtime `CanvasTexture` plates drawn in the UI font (`buildDoghousePlate`),
  redrawn on `document.fonts.ready` so they're real Chicago.
- integration gotchas: TRELLIS GLBs ship **without vertex normals** (their
  material flat-shades in-shader) — `computeVertexNormals()` before the
  Lambert swap or the mesh lights to black. The GLB's true front ≈ local +z
  (+0.04 rad) — discovered by **raycast-scanning the wall**, not screenshots
  (oblique shots misled to a bogus −0.56 offset first). `ry: 3.65` faces the
  door at the spawn meadow; plate rides the true normal at standoff 0.80.
- license note: TRELLIS is MIT; output used on a personal non-commercial page.
- adopted: 2026-07-05 — first 3D set piece; placed at (8, 12), collider r 1.25,
  bird perch on the ridge.

### assets/music/{day,dusk,night,rain,fanfare}.m4a — the full score
- model: `stability-ai/stable-audio-2.5` (the house model, per the dawn pick);
  all steps 8, cfg 6; beds 32s → 30.000s authored loops (dawn recipe: static
  gain to −18 LUFS, 2s qsin tail→head crossfade), fanfare 8s + 0.4s fade-out.
- predictions: day `wsvm569m8srmy0cz6e19b80adc`, dusk `br0t86a8dxrmy0cz6e190d0e4g`,
  night `ttzr4haq65rmt0cz6e18cv22k4`, rain `2mqc0yk1mhrmy0cz6e1b7bxnhg`,
  fanfare `rhrjhzvr9xrmt0cz6e1ba4f5b4`
- prompts: mood-variations of the winning "tiptoe pizzicato toy orchestra"
  brief — day strolling/sunny, dusk winding-down/golden, night music-box
  lullaby, rain muted/indoors, fanfare triumphant flourish.
- license note: Stability AI Community License outputs; personal page use.
- adopted: 2026-07-05 — completes Phase 1; every zone of `musicZone()` and the
  PERFECT DAY hook now have a voice. Shipped to the atelier preview for the
  user's ears; production merge on their approval.

## Candidate batches (not yet adopted)

### 2026-07-05 — dawn theme, first batch
- `andreasjansson/musicgen-looper` prediction `nzbjmda4ysrna0cz6ctsb4xykr`
  (4 variations, 16s loops @ 84bpm; two duplicate runs `qhpzy40szsrn80cz6cvr793xt0`
  and `xjx0661chnrnc0cz6cv9w4yv1g` exist from an MCP retry — unused)
- `google/lyria-2` prediction `ema7qd8ck5rmw0cz6cw8xd7zar` (~30s, 48kHz stereo)
- `stability-ai/stable-audio-2.5` prediction `e06wfkm535rmy0cz6cw8pfm280` (48s)
- shared prompt idea: "gentle cozy morning waltz for a wholesome dog park game
  at sunrise — music box, soft nylon-string guitar, glockenspiel, warm, hopeful,
  sparse, toy-like, calm, no drums, no vocals"
- user verdict: long tracks "too pharmaceutical-ad or church band"; the four
  same-prompt looper variations too similar to choose between → batch 2.

### 2026-07-05 — dawn theme, batch 2 ("weirder, quirkier"; one idea per candidate)
- `andreasjansson/musicgen-looper`, 1 variation each:
  - `ez3t47bb2xrne0cz6d4bwra6f8` wonky toy piano waltz + kazoo hums, 90bpm
  - `yeke6mvzs5rnc0cz6d4bhb26a4` music box + melodica + slide whistle, 68bpm
  - `xnsc2cc57srn80cz6d49stm1nm` tiptoe pizzicato + marimba, 100bpm
  - `n13vzvwsaxrnc0cz6d4adp0e3c` front-porch whistling + lazy banjo, 80bpm
- `google/lyria-2` `ry3xzrq8dxrmy0cz6d4ajmjmgc` — wonky toy orchestra, negative
  prompt bans corporate/worship/cinematic/polish
- `stability-ai/stable-audio-2.5` `wqw68ctjnxrmt0cz6d4rcx03rw` — off-kilter
  wonky waltz, 40s, cfg 6
- `lucataco/ace-step` `w3hdaeezzxrmy0cz6d480gkg1c` — tags-driven toy orchestra,
  40s, `[inst]`
- user verdict: **"tiptoe pizzicato" (xnsc2cc57srn80cz6d49stm1nm) is the keeper
  concept** for the dawn bed; batch 3 = same idea, best-execution shootout.

### 2026-07-05 — model recon (catalog snapshot before batch 3)
- `google/lyria-3` + `google/lyria-3-pro` shipped 2026-06-19 (30s clips / 3min;
  text OR image prompts; no negative_prompt input) — supersede lyria-2.
- `fishaudio/ace-step-1.5` (2026-03) supersedes lucataco/ace-step 1.0: bpm,
  key_scale, time_signature (3=3/4), duration, batch_size≤4 — the modern
  loop-author; may retire `musicgen-looper` (2023 MusicGen under the hood).
- `minimax/music-2.6` (2026-04): `is_instrumental` flag. `elevenlabs/music`
  (Music v2): `force_instrumental` + exact `music_length_ms`.
- Not on Replicate: Suno v5 (quality ELO leader), Udio — proprietary; outside
  our pipeline.

### 2026-07-05 — doghouse (first 3D set piece)
- concept art: `google/nano-banana-pro` ×2 —
  `zjtbjvhyadrmy0cz6dgbh9sapw` (honey wood + red shingle roof + CHOUQUETTE
  nameplate; **chosen** — matches the park's bench palette, name renders clean)
  and `nhw4gpajq9rmr0cz6dgabnh604` (pastel cream + awning, no text; rejected —
  navy door rim off-palette, reads birdhouse-modern)
- image→3D: `firtoz/trellis` `k7rwvmd5c5rna0cz6dh94gz2ec` (texture 2048,
  mesh_simplify 0.95, chained from the concept's replicate.delivery URL)

### 2026-07-05 — dawn theme, batch 3 (pizzicato shootout: one brief, five models)
Shared brief: "tiptoe pizzicato strings and marimba sneaking-around tune,
bouncy staccato, quirky toy orchestra, playful, warm and silly" (~100bpm).
- `andreasjansson/musicgen-looper` `5nbwjc0cnhrnc0cz6d9s2fabrm` — 4 variations,
  16s loops @ 100bpm (execution re-roll of the batch-2 winner recipe)
- `fishaudio/ace-step-1.5` `dzhz1rrmp5rmr0cz6d9v6x0dgg` — batch of 2, 26s,
  bpm 100, 4/4, [Instrumental], turbo defaults
- `google/lyria-3` `8hw745rzkhrmy0cz6d9rmpg9sg` — 30s house length
- `elevenlabs/music` `mseyjchhe9rmt0cz6d9vwh9he8` — force_instrumental, 24s exact
- `stability-ai/stable-audio-2.5` `jth6zm9td9rmr0cz6d9s3s6a9c` — 32s, cfg 6

## assets/ui/share.png
- model: none — captured from the game itself (headless Chrome, title screen
  at 1200x630, `#versionTag` hidden via a scratch copy so the card stays evergreen)
- prediction: n/a
- prompt: n/a
- post: none (PNG as captured, ~416KB — flat colors + text keep PNG crisp where JPEG smears)
- license note: own work (a screenshot of this repo's build, v1.7.2)
- adopted: 2026-07-06 — the link-share card (`og:image`/`twitter:card` in the head);
  recapture whenever the title screen changes materially
