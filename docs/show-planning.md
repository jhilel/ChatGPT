# Using the new planning tools

Open `public/rig-to-show.html` from the fully extracted ZIP. Processing is offline. The app restores its last valid layout from local autosave; **Save rig project** creates a portable JSON backup.

## Mounting and focus

Select a head and choose Hanging, Upright on floor, Sideways left/right or Custom. Presets set the native Euler rotations and the front/side orientation diagram shows the neutral beam direction. Explicit rotations in existing saved rigs are preserved. New floor fixtures start upright; new truss fixtures start hanging. Presets are mathematical mounting conventions, not physical confirmation for every fixture personality.

Use **Add focus preset** to create Stage wash, Mirrored fan, Podium, Dance floor or Audience targets. Assign fixtures using the selection list or **Assign all fixtures**. A target may use a shared point, evenly spaced line, rectangular area or mirrored angular fan. Width/depth follow the selected room units; fan spread uses degrees. The guide lines show each fixture's actual calculated target. Regenerate after edits.

## Operating pages

Enable **Build separate intensity, color, position and movement pages**. Event looks stay on page 1, effects on page 2 when present. Subsequent pages contain intensity, colors, positions and movement presets, with no more than ten controls per page. **Download playback map** lists exact page, slot, stack and cue names.

Intensity controls are independent HTP intensity playbacks, **not multiplicative group masters**. Release conflicting event looks when using them to lower intensity. Color controls do not include dimmer, pan, tilt, shutter or control/reset channels. Positions also populate native position palettes starting at the first position slot.

Movement speed multiplier and circle size alter the generated effects. Slow/small, medium and fast/wide circles are additional presets; **live speed and size masters are not implemented**. DMX travel is bounded, but world-space movement containment and fixture behavior still need console validation. Unreachable canned position presets are omitted with a project-note warning.

## Venue geometry

Expand **Room and truss geometry**. Add truss boxes and podium/screen/reference boxes; enter exact positions, dimensions and rotation. Stage height describes the actual deck height. **Download venue scene .mvr** creates an MVR 1.6 archive with floor, stage, trusses and reference objects.

The archive follows the published MVR specification: root-level resources, persistent UUIDs, right-handed Z-up matrices in millimetres and 3DS models with 1 unit = 1 mm. It contains **no Fixture nodes**. It is intended as a scene-only import beside the generated show, not a replacement show file. **MagicVis import is not yet confirmed**; test against a copy of the show. Native `.shw` fixture positions remain included as before. Truss geometry does not automatically attach/move existing heads.

## Validation and console support

Four controlled test rigs are included in `public/validation-rigs`, with a manifest identifying exact Storm Profile, Storm BeamWash, Martin Viper and Robe Spiider modes. New tools have mathematical/export regression coverage for these families; only the previously confirmed Storm Profile reference rig has actual MagicVis confirmation. Generated test files are not proof of console or physical behavior.

MagicQ export remains the supported show-file format. **grandMA2/3 native exporters are not implemented.** The exact current versions, native fixture types and an accessible MA test environment/reference export are still needed to validate separate adapters. The MA download sites were inaccessible from this cloud environment. No interchange or renamed file is represented as a native grandMA show.
