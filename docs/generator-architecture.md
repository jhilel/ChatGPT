# Rig-aware lighting show generator

The requested product is a generator that accepts fixture models, fixture modes, quantities, an event brief, room dimensions and a floor plan, then produces console-loadable programming. The user must not have to supply a source show. The current implementation removes that upload and uses a built-in reference assembled from the definitions and programming already tested with the user.

## Current implementation and evidence

The local `public/rig-to-show.html` embeds its searchable catalog, factory reference and UI; selected native definitions load from the adjacent `profiles` folder. Extract the complete distribution on Windows/macOS. No source-show upload is required. Corporate, gala, expo and band briefs select local templates. Room layout fixture transforms are now exported into MagicVis, with optional calibrated target aiming; room meshes are not generated.

The generalized compiler instantiates native personalities, heads and channels for selected quantities, allocates sequential addresses without crossing a universe, and rebuilds groups, colors, event cues, scoped effects, stacks and pages. Stage/Decorative roles replace the old head-number assumptions. Old profile tails are normalized when their schema is understood; unsupported legacy extensions and parent/compound definitions are explicitly blocked. Complex cell/virtual mappings remain experimental.

Structural and browser checks cover variable Storm quantities, mixed Generic/Robe rigs, fine dimmers, RGB/CMY colors and universe rollover. Earlier Storm prototypes were user-confirmed in MagicQ Demo mode. Generalized `.shw` loading/playback still needs validation in MagicQ 1.9.8.3 and on an MQ70. No grandMA exporter or professional on-site readiness claim is implied.

## Production architecture

1. **Project model.** Console/version, fixture identities and modes, quantities, DMX universes/addresses, physical positions, mounting orientation, room/stage geometry, target focus points, event schedule, brand colors, operator preferences and constraints. Save this as portable project data, separate from any console serialization.
2. **Verified fixture catalog.** Vendor personalities and/or GDTF, version and checksum pinned. Normalize attribute identities, ranges, fine channels, cells/rings, color mixing, dimmer/shutter behavior, pan/tilt travel, and supported effects. Preserve manufacturer-specific controls rather than treating all RGB/CMY or moving fixtures as interchangeable. Missing profiles stop native export until verified.
3. **Rig compiler.** Allocate non-overlapping addresses within 512-channel universes. Instantiate head and personality records and translate all channel references. The current compiler implements this for supported single-personality definitions. Console loading/output validation and special cell/virtual mappings remain required.
4. **Event design engine.** Convert a brief/run-of-show into a typed scene graph: groups, palettes, focus targets, static looks, transitions, cue stacks, effects, and playback assignments. Planning can use AI assistance, but output must be checked against catalog/rig capabilities and operator constraints. Do not write unconstrained model output directly into a show file.
5. **Geometry and focus solver.** Establish room/stage axes and fixture position, orientation, and target points. Compute world direction vectors, then convert to calibrated fixture pan/tilt ranges. Account for rigging orientation and inversion. Room width/depth alone do not uniquely determine focus. Floor plans need calibrated scale and confirmed stage/fixture locations; attaching a PDF is not evidence of correct geometry extraction.
6. **Console adapters.** A MagicQ adapter writes/validates native `.shw` records. grandMA2 and grandMA3 need separate documented import/plugin/automation adapters and their own native save workflows. `.shw` is a MagicQ format, not a shared console file. Preserve equivalent intent while translating console-specific FX, tracking, presets and playback behavior.
7. **Validation and delivery.** Structural validation plus real console software loading; fixture selection, DMX output, colors, timing, FX and playback behavior checks. Record adapter/version/rig verification status. Package a usable local app or publish an authorized hosted app; saving workspace files does not create a user-accessible website.

## Required acceptance gates

- No source-show upload in the end-user workflow.
- A supported fixture/mode/quantity rig builds without an existing customer show.
- Every head/address/reference and supported attribute resolves correctly.
- Event objectives actually affect scene/programming content; unsupported objectives are identified.
- Room/floor-plan information influences native focus only after the geometry solver is implemented and verified.
- Effects and cue transitions work in the target software, with operator intent preserved.
- MagicQ, grandMA2 and grandMA3 are each tested independently; successful one-format export does not imply another works.
- No claim of professional on-site readiness solely from a syntax test, saved file or browser download.

## Next implementation target

Validate the generalized compiler on MagicQ 1.9.8.3/MQ70 with varied real rigs and known DMX addresses. Characterize unsupported legacy geometry, virtual channels, compound fixtures and multi-universe modules. Target focus is now an experimental opt-in feature based on fixture travel and operator-supplied calibration. Verify nonzero rotation conventions and circle centring in MagicVis before relying on it, then add position palettes, multi-cue event stacks and independent grandMA2/3 adapters. Native focus requires confirmed fixture orientations and target geometry.
