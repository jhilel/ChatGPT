# Brief-driven programming rules

## Implemented design choices

Corporate multi-color briefs create white stage wash and speech lighting, separate brand-color looks, and simultaneous alternating decorative colors for walk-in, speeches, break and walk-out. Decorative fixtures are ordered by room X, then depth, then head number. Without coordinates, head order is used. Intensity percentages are starting levels, not exposure or illuminance predictions.

Requested dimmer chases use decorative fixtures and existing intensity FX export. Stage wash remains on its own playback. Release conflicting looks when reducing HTP intensity. Static-only and negative effect instructions override requests.

Ballyhoo is recognized but remains pending native export. No circle is substituted. Saved project notes carry a structured program; the current preview displays static looks and decisions.

## Research and application

Primary source: [ChamSys MagicQ FX Engine](https://docs.chamsys.co.uk/magicq/1.9.9.x/manual/FX_engine.html), consulted 2026-10-13.

The manual distinguishes intensity, position and color effects, explains base positions, spread, parts and segments, and describes independent position and effect playbacks. Those concepts guide separate programming layers and spatial ordering. The alternating brand arrangement and corporate intensity defaults are application design choices, not settings prescribed by ChamSys.

The consulted manual is 1.9.9.x; the project's reference console is 1.9.8.3. New native encodings must be verified against that version.

## Next implementation work

- Native ballyhoo waveform, independently verified rather than renamed circle.
- Explicit chase direction, speed, width and crossfade controls.
- Effect stop/release behavior for speeches.
- Editable program preview and per-attribute transitions.
- Capability warnings and fixture-specific movement bounds.

Automated tests establish numerical allocation and export structure. They do not establish MagicQ playback behavior, physical focus, camera exposure or artistic quality.
