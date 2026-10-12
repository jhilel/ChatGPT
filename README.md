# Rig to Show

An experimental local MagicQ show generator for Windows and macOS. Choose fixtures, modes and quantities, describe the event, and download a native `.shw` without uploading a starting show.

## Download and open

Download the `rig-to-show` branch ZIP from GitHub, **extract the entire ZIP**, and open `public/rig-to-show.html` in current Chrome, Edge or Safari. Keep `public/profiles` beside the HTML: the app loads selected fixture definitions from that folder. No Node.js, Python, account, network service or show upload is needed to use the extracted app.

Workspace chat links are not reliable downloads in this client. The app is delivered through the GitHub branch, not a hosted website.

## Use

1. Search the library by manufacturer, fixture and mode; add each fixture type and set its quantity.
2. Assign **Stage** for key lighting or **Decorative** for color/effects lighting.
3. Enter the event brief and room dimensions. Click fixture markers to change Truss/Floor assignments.
4. Generate the `.shw`, then download project notes for the DMX patch and compiler warnings.
5. Load the show in MagicQ and verify personalities, patch addresses, groups, colors, dimmers, movement and playbacks before using it on a gig.

The allocator starts at universe 1/address 1 and starts a new universe before a fixture would cross address 512. Export permits 1–512 fixtures per rig row, up to 6,144 heads and 48 universes. Those are capacity limits, not requirements to own specific fixture quantities.

## Current behavior and limits

The fixture library contains 69,583 modes from 955 manufacturers. Native personality packs include parsed attribute flags, locate defaults, ranges, colors and full personality records. Older compatible personality records are upgraded to the reference show's field layout. Unsupported legacy extensions and parent/compound definitions retain their identities and display a specific remaining compiler limitation.

The compiler rebuilds personality, head, logical-channel, group, palette, cue, stack and playback records for the selected rig. It does not rename the fixtures in a fixed 4/8-head template. Stage/decorative roles drive event intensities and colors; movement effects require pan/tilt and chases require dimmer attributes. RGB, CMY, available wheel ranges and fine intensity channels are mapped from the fixture definitions. Unsupported colors retain the locate color. Page 1 contains eight event looks; page 2 contains available selected effects. Control/reset channels are excluded from generated static values.

**Experimental compatibility:** successful parsing or a download is not proof of console compatibility for every mode. Existing Storm group/static/FX prototypes were user-tested in MagicQ Demo mode. This generalized compiler passes structural and browser checks, including changed quantities, mixed Generic/Robe rigs and universe rollover; it still needs MagicQ 1.9.8.3/MQ70 loading and output validation. Complex cell mapping, virtual channels and legacy geometry extensions need further characterization. New rigs must be checked in MagicQ.

Room dimensions produce a schematic, not calibrated native focus positions. Event planning uses local rules, not an AI lighting designer or photometric simulation. Native grandMA2/3 exporters, floor-plan extraction, timed cue sequences and strobe generation remain unimplemented.

## Development

Node.js 20+ and Python 3 are required for development:

```sh
npm run build
npm test
python3 test/index-heads.py
python3 test/profile-packs.py
npm start
```

The server serves the app and local personality packs on port 3000 (`PORT` overrides it). Source files are under `src`; `src/build.py` generates the HTML. `src/native-runtime.js` also retains the original fixed-rig implementation for historical characterization tests; new exports use `src/rig-compiler.js` through `src/brief.js`.

The user-supplied seven-part archive was reassembled and CRC-verified. `heads.all` is decoded by `tools/decode_magicq_library.c`; `tools/index_heads.py` preserves full definitions in SQLite. `tools/build_profile_packs.py` packages supported definitions as local gzip/base64 JavaScript data packs. Pack scripts carry data only; the UI decompresses and parses JSON. Source checksums and indexing evidence are recorded in `src/library-manifest.json`.

To regenerate from the cached library in this development environment:

```sh
cc -O2 -Wall -Wextra tools/decode_magicq_library.c -o /tmp/decode_magicq_library
/tmp/decode_magicq_library /workspace/shared/magicq-library/heads.all /workspace/shared/magicq-library/heads.decoded
python3 tools/index_heads.py /workspace/shared/magicq-library/heads.decoded --output public/fixture-library.json --database /workspace/shared/magicq-library/profiles.sqlite --report /workspace/shared/magicq-library/index-report.json
python3 tools/build_profile_packs.py /workspace/shared/magicq-library/profiles.sqlite --catalog public/fixture-library.json --output public/profiles
npm run build
```

The app and its committed packs work without the SQLite cache. Tests cover reference integrity, personality upgrading against a console-saved dimmer, catalog selection, variable-rig channel references, event programming, color mappings, capacity limits and patch rollover. Earlier upload-based tools remain as development experiments.

## Room layout editor (draft)

Fixture markers can be dragged, with exact X/depth/height and rotation fields. Positions are stored in metres and displayed in the selected room units. Stable fixture keys preserve positions as rig quantities change. Save rig project or download the coordinate CSV to retain the draft.

These coordinates are not yet serialized into MagicVis, and movement cues still use the existing uncalibrated positions. The UI and exported notes explicitly report this. Native transform encoding needs comparison against a MagicQ-saved reference with known positions and rotations; focus generation also needs fixture orientation and focus targets. The layout CSV is a reference document, not an IMPORT HEADS/MVR file. The official 1.9.8.x documentation confirms MVR import adds heads to the patch, so importing a second rig is not used as a substitute for updating the current show's positions.
