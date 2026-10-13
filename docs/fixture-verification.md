# Fixture-library audit

The audit covers all 69,583 fixture modes from the provided MagicQ library. It does not run MagicQ/MagicVis or certify physical output. The corrected Storm 2 Profile 32ch reference rig is the only mode with user-confirmed MagicVis evidence after the native-axis correction.

| Result | Modes |
| --- | ---: |
| Source identity/checksum and catalog metadata checked | 69,583 |
| Native export structural checks passed | 66,484 |
| Source definitions failed range-reference checks | 81 |
| Parser/module/oversized-mode support unavailable | 3,018 |
| Mathematical aiming and focused static/FX exports passed | 8,282 |
| Structurally valid modes with incomplete/ambiguous aiming data | 11,917 |
| Structurally valid modes without conventional primary pan/tilt | 46,060 |
| Structurally valid modes whose travel excluded all test targets | 225 |
| Physical output verified | 0 |

The four aiming categories partition the 66,484 structurally valid modes. Of the 8,282 modes with successful mathematical and focused-export checks, 6,587 have fine pan and tilt channels; 1,695 have coarse or mixed resolution. Coarse channels inherently limit focus precision.

## What was checked

Source-body SHA-256 identity, catalog metadata and channel declarations; packaged personality identity and locate/color/range offsets; two-head native show generation; head/channel/personality/group/palette/cue/stack/page references; blackout programming; intensity/circle FX structure; patch allocation across a universe boundary; six target/fixture combinations for usable conventional pan/tilt data; and actual static/circle cue serialization of reachable focus values for all 8,282 eligible modes.

Patch checks use native logical channel counts. They do not independently establish manufacturer DMX footprints, virtual-channel behavior, emitter/cell geometry, mechanical range/zero/inversion, photometric behavior or console acceptance. Mathematical consistency is not runtime or hardware validation. The 225 limited-travel modes were not declared defective because the chosen targets can legitimately be unreachable.

## Changes applied

- Failed range-reference definitions cannot be exported through the app.
- Oversized modes no longer advertise compiler support.
- Modes lacking usable/unique pan and tilt data block target aiming with a specific explanation; checked static export remains available when aiming is disabled.
- LED modes without a dimmer scale white/amber/UV emitters consistently with additive RGB, including unflagged supplemental channels. Blackout selects declared Closed shutter ranges.
- The app displays verification scope and links a per-mode CSV report.

## Reports and repeatable commands

`public/fixture-verification.json` contains every mode's checks, limitations, pack checksums and evidence level. `public/fixture-verification.csv` is a spreadsheet version. `public/fixture-library.json` carries the resulting classifications used by the app.

```sh
python tools/audit_source_library.py --database /workspace/shared/magicq-library/profiles.sqlite
node tools/audit_fixture_library.mjs
node tools/audit_focused_exports.mjs
node tools/publish_fixture_verification.mjs
npm run build
npm test
python test/index-heads.py
python test/profile-packs.py
```

The SQLite source database is a workspace artifact, not part of the download. The Node export audits use the committed profile packs. Rebuilding profile packs should be followed by a fresh audit; stale audit classifications must not be treated as current verification.
