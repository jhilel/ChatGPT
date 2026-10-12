# Rig-aware lighting show generator

The requested product is a generator that accepts fixture models, fixture modes, quantities, an event brief, room dimensions and a floor plan, then produces console-loadable programming. The user must not have to supply a source show. The current implementation removes that upload and uses a built-in reference assembled from the definitions and programming already tested with the user.

## Current implementation and evidence

The standalone `public/rig-to-show.html` contains its catalog, reference data, native runtime, and UI. It requires no network, service, account, or source-show selection. Windows/macOS browsers can run it. Corporate, gala, expo, and band briefs select rules-based templates; known color words and movement/chase exclusions modify output. Room dimensions produce a schematic and placement changes update native groups and FX subsets. Native focus positions are not calculated.

The verified catalog is limited to four Storm 2 Profiles in 32ch and eight Storm 2 BeamWash in Single Basic1 (31 channels). Those exact quantities are a compatibility constraint of the current reference-based adapter, not a general lighting rule. Other fixture types/counts are explicitly blocked. The output contains eight generated static cues/stacks and selected scoped effects, with event looks on page 1 and effects on page 2. Developer test cues/stacks and their old page are removed.

Previous group/static/effect exports were user-confirmed in MagicQ Demo mode. The new no-upload output, page remapping and cleanup pass structural and browser tests, but require MagicQ loading and playback validation. MQ70 hardware validation and grandMA2/3 output have not occurred. This is not a universally validated professional automatic designer.

## Production architecture

1. **Project model.** Console/version, fixture identities and modes, quantities, DMX universes/addresses, physical positions, mounting orientation, room/stage geometry, target focus points, event schedule, brand colors, operator preferences and constraints. Save this as portable project data, separate from any console serialization.
2. **Verified fixture catalog.** Vendor personalities and/or GDTF, version and checksum pinned. Normalize attribute identities, ranges, fine channels, cells/rings, color mixing, dimmer/shutter behavior, pan/tilt travel, and supported effects. Preserve manufacturer-specific controls rather than treating all RGB/CMY or moving fixtures as interchangeable. Missing profiles stop native export until verified.
3. **Rig compiler.** Allocate non-overlapping addresses within 512-channel universes. Instantiate head and personality records and translate all channel references. This replaces the fixed-quantity reference adapter. Native MagicQ head serialization and cached structures must be characterized and tested with multiple independent configurations before arbitrary-count support is enabled.
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

Replace the fixed-quantity patch with a tested fixture/head serializer for the two existing catalog modes. Then add geometrically defined position palettes and multi-cue event stacks. Broaden the catalog only as mode data and adapter tests become available. In parallel, research supported grandMA2/3 import/plugin interfaces using the user's target software versions. The currently implemented local brief parser can be replaced with a constrained planner after the native compiler supports the resulting scene graph.

## Library ingestion milestone

The supplied MagicQ heads library has been decoded and indexed without skipping any `.hed` files: 69,583 fixture/mode entries from 955 manufacturers. Native personality bodies and channel declarations are cached in SQLite for the rig compiler. The Storm modes' names, flags, and attribute IDs match the user-tested show's channel declarations exactly. Search and rig selection now cover the full library, while native export support remains explicit and restricted.

This removes missing catalog data as the immediate obstacle to broader fixture selection. The remaining obstacle is compiling and validating arbitrary personality/head/channel records, virtual and compound heads, physical DMX footprints, palettes, and effects in a native show. Merely copying a P record does not instantiate a correctly patched fixture or produce professional programming. Those compiler operations need independent test configurations and MagicQ loading/output checks.
