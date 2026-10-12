# Rig to Show

A local, experimental MagicQ show generator. Enter a rig and event brief and download a native `.shw` without uploading a starting show. It includes an internal reference built from the fixture definitions and programming already tested with the user.

## Download and open

On GitHub, open the `rig-to-show` branch, choose **Code → Download ZIP**, and extract it. Open `public/rig-to-show.html` in Edge or Chrome on Windows, or a current browser on macOS. The HTML is self-contained; you do not need Node.js, Python, the original heads library, or an uploaded show file to use it.

The app is not a published website. Workspace links in the chat do not provide a reliable download in this client.

## Use

Open `public/rig-to-show.html` in a current Windows/macOS browser. It is self-contained and processes everything locally. No installation, network or `.shw` input is needed.

For development, use Node.js 20+ and Python 3:

```sh
npm start
npm test
npm run build
```

The server serves the same standalone app on port 3000; `PORT` overrides it. Edit `src/app-shell.html`, `src/app-ui.js`, `src/brief.js` and `src/native-runtime.js`, then rebuild the generated HTML. The source seed metadata has machine/path comments sanitized; the original uploaded files are unchanged.

## What works now

- Verified catalog: 4 Maverick Storm 2 Profiles in 32ch plus 8 Maverick Storm 2 BeamWash in Single Basic1 (31 channels).
- Corporate, gala, expo and band/DJ briefs choose local rules-based templates.
- Known color words and movement/chase exclusions affect generated programming.
- Room/stage dimensions produce a schematic; changing Truss/Floor assignments updates native groups and effect selections.
- Output has eight static event looks on page 1 and selected scoped FX on page 2.
- Factory test programming is removed from the generated output.
- Browser-native `.shw` and project-notes downloads, without source-file upload.

## What remains

This is not yet an arbitrary-rig or fully automatic professional lighting designer. Other models/modes/counts are blocked until the catalog and native patch compiler support them. Room dimensions do not generate console focus positions; floor-plan geometry extraction is not implemented. Event inference uses explicit local rules, not an AI model or photometric simulation. Native grandMA2/3 exporters, timed cue sequences and strobe generation are not implemented.

The user verified earlier native group, static, and scoped FX exports in MagicQ Demo mode. The new no-upload export and page/test-program cleanup pass structural/browser tests but still need MagicQ loading and playback validation. MQ70 hardware validation remains outstanding. Focus, beam settings, intensity/exposure and operation need venue review.

See `docs/generator-architecture.md` for the intended production architecture and acceptance gates. Earlier upload-based tools are retained as development/characterization experiments, not the default user flow.

## MagicQ heads library

The user-supplied seven-part ZIP was reassembled and CRC-verified. Its 398,171,866-byte `heads.all` bundle was decoded and indexed: **69,583 fixture/mode entries, 955 manufacturers, 22,337 manufacturer/model pairs**. All personality files are represented; three non-personality bundle files are excluded. Parent/media-server and compound definitions are retained explicitly. Logical-channel counts are not treated as universally verified physical DMX footprints.

The standalone app now includes the searchable metadata catalog. Search by manufacturer, model and mode, add any entry to a rig, and save a rig project JSON. An unsupported profile is retained, but native `.shw` export is blocked until its patch/programming adapter is implemented and validated. Only the two matching Storm profiles currently have verified export support. Library selection is not equivalent to all-fixture native generation.

- `public/fixture-library.json`: searchable metadata, bundled into the standalone HTML during build.
- `tools/decode_magicq_library.c`: reproducible bundle decoder; resets the rolling key after bundle-file headers.
- `tools/index_heads.py`: parses personalities/attributes and preserves each body in SQLite for compiler development.
- `src/library-manifest.json`: source checksums, coverage, and integrity evidence.
- `/workspace/shared/magicq-library/profiles.sqlite`: full cached profiles/attributes, outside the checkout.

To regenerate from the cached encoded library:

```sh
cc -O2 -Wall -Wextra tools/decode_magicq_library.c -o /tmp/decode_magicq_library
/tmp/decode_magicq_library /workspace/shared/magicq-library/heads.all /workspace/shared/magicq-library/heads.decoded
python3 tools/index_heads.py /workspace/shared/magicq-library/heads.decoded --output public/fixture-library.json --database /workspace/shared/magicq-library/profiles.sqlite --report /workspace/shared/magicq-library/index-report.json
npm run build
```

`npm test` covers catalog search/identity and export gates. `python3 test/index-heads.py` checks parsing of single, parent, compound, and malformed definitions. Browser checks confirm selecting and saving an unverified Robe mode blocks native export, while the previously tested Storm adapter still exports normally. The catalog is metadata only; full fixture bodies are not executed or embedded into the browser UI.
