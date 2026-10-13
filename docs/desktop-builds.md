# Desktop application

The Electron app uses the offline planner, with Node integration disabled, context isolation and renderer sandboxing enabled. Saved rig JSON and local autosave retain layouts, targets, mounting, operating options and venue geometry. **Check for releases** opens this repository's release page; automatic update installation is not configured.

## Download workflow

After the branch is pushed, open the repository's **Actions -> Desktop installers** workflow. Successful Windows jobs publish an NSIS installer; successful macOS jobs publish Intel and Apple Silicon DMGs. Artifacts are retained for seven days. Workflow runs may also be started manually after the workflow is available on the default branch.

**Installers are unsigned.** Apple/Windows signing credentials and notarization are not configured. Platform launch/install approval may therefore be required. The cloud cannot confirm the GitHub run status because GitHub API access was denied. No released installer is claimed available until its build completes.

## Build locally

Node 22.12+ and Python 3 are required for development only. Installed apps do not require them.

```sh
npm ci
npm run build
npm test
npm run desktop
```

On Windows use `python src/build.py` if `python3` is not available. Build the installer on Windows using `npm run package:win`; build macOS DMGs on macOS using `npm run package:mac`. The workflow performs those steps on their native platforms. Cross-built Windows portable and macOS app ZIPs can be produced with `electron-builder --win zip` and `electron-builder --mac zip --x64 --arm64`; a macOS DMG needs macOS tooling, and NSIS cross-building from Linux needs Wine.

`npm run test:desktop` tests the actual Electron window and exports. Linux needs an X display (a virtual Xvfb display is sufficient). `RIG_PACKAGED_EXECUTABLE` selects a packaged executable for the same test. On Windows/macOS this test runs before packaging in CI.

## Evidence and remaining limits

The Linux desktop renderer passed mounting/pattern editing, rig save/autorestore, venue MVR export, native show generation and playback-map downloads. Linux directory packaging, Windows portable ZIP packaging and Intel/Apple Silicon macOS app ZIP packaging succeeded. These cross-built archives have not been launched on Windows/macOS. A Linux NSIS attempt failed because Wine is absent; the Windows-native workflow avoids that prerequisite.

Signed/notarized public releases and automatic updates need release/signing configuration. Current artifacts and workflows are build outputs, not a claim that those release steps have completed.
