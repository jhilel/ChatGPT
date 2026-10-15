# Lighting App 2: local AI and Lighting Plan v2

This update uses a downloaded, pretrained instruction model. It does not train a model, use the experimental 124M GPT, or claim that valid JSON guarantees professional lighting design. The existing MagicQ native compiler remains the only component that emits .shw bytes.

## M1 Mac with 16 GB RAM: setup

1. Install the current official [Ollama Mac app](https://ollama.com/download/mac).
2. In Terminal, disable cloud use and keep the service on loopback:
   
       launchctl setenv OLLAMA_NO_CLOUD 1
       launchctl setenv OLLAMA_HOST 127.0.0.1:11434

   Completely quit and reopen Ollama after setting these variables. They configure this user's Mac, not a cloud workspace.
3. Download the suggested pretrained model:

       ollama pull qwen3.5:4b

   The official model page lists the 4B Q4_K_M weights at about 3.3 GB plus ancillary model data. Disk size is not total inference RAM. We use a 16K context and a 6K output limit; leave memory for macOS and MagicQ. Actual speed, thermal behavior and artistic quality on this exact M1 have not been measured. No training is required.
4. For the source checkout, install Node.js 22.12+ and Python 3, then:

       npm run build
       npm start

   Open the printed http://127.0.0.1:3000 address. npm start has no npm runtime dependencies. The built preview ZIP includes server.mjs, src/local-ai-server.mjs and a Start-Lighting-App.command launcher; it needs Node.js but not Python. If macOS does not allow the launcher to run, use Terminal in the extracted folder and run node server.mjs. The desktop Electron app starts the same loopback server internally.
5. Add/load the rig, verify modes, lighting purposes, layout and targets, then select Local AI. Open Local AI connection and click Check connection. Model selection accepts a downloaded local model name. A missing model produces its pull command; the app does not download models or switch to cloud automatically.
6. Generate AI plan, review head selections, cue states, decisions and issues, then Export reviewed .shw. Save AI plan JSON and project notes to retain the proposal and evidence.

Opening public/rig-to-show.html directly supports explicitly selected Basic rules only. File-origin AI requests are blocked with an instruction to start the local app/server. The UI never labels rules as AI.

## Local-only connection

The browser calls a same-origin server, which calls only http://127.0.0.1:11434/api/tags, /api/show and /api/chat. The bridge listens only on 127.0.0.1, checks Host and Origin, follows no upstream redirects, rejects cloud-named or remote-backed models, and exposes no API credential field or arbitrary endpoint setting. Do not forward these ports or set wildcard origins. This is a local development/desktop service, not a public multi-user hosted AI service.

Inference is non-streaming with schema-constrained output, temperature 0, thinking disabled, bounded input/output, a 180-second timeout, cancel support, one generation at a time, and short model keep-alive. No additional model or rule-based retry is silently substituted. Busy, unreachable, missing-model, timeout, malformed JSON and validation errors are shown to the user.

## Plan contract and adapter

src/lighting-plan.js is the authoritative JSON Schema plus semantic validator. schemaVersion is 2 and targetVersion is 1.9.7.3. All objects reject unknown fields. The active UI rig is snapshotted before inference; only selected fixtures, quantities, modes, compiler-assigned patch, capabilities, room units and geometry are sent. The full library is not sent. The brief and names are user data in a user message, not authority to rewrite the system contract.

- groups: named sets of existing numeric head IDs, never new fixtures.
- cues: named manually selected playback states. Each state selects head IDs or groups, and specifies intensity, supported color and/or an existing target ID. Null means the attribute is not changed. Overlapping head selections in one cue are rejected.
- timing: explicitly declared. Only mode compilerDefault with null fadeSeconds/delaySeconds is supported. It preserves the inherited native timing records. Explicit fades/delays are rejected, not converted to guessed native values.
- trigger: manualPlayback only. Follow and timecode fields are recognized but explicitly rejected by this adapter.
- effects: circle or dimmerChase on a selected head subset, size where supported, speed multiplier, left/right ordering, manual start and stop.type manualRelease. These compile as separate native effect playbacks and are listed in the playback guide. Manual release is an operator action on that effect playback; a speech/static cue does not automatically stop it.
- issues: actionable missing information or unsupported requests. Issues remain reviewable but block show export.

Targets are resolved with the existing geometry solver; unknown/unreachable targets and unavailable pan/tilt/calibration are rejected. Circle requests require target aiming and cannot exceed the remaining coarse pan/tilt travel. AI effects exclude heads assigned People / stage wash; change the lighting purpose explicitly to use them for effects. A dimmer chase requires real dimmer channels; additive-only fixtures are not silently converted. Color requests require supported mappings. Control/reset channels, raw DMX, fixture personalities and replacement patch/geometry are not plan fields.

At present AI mode supports up to 128 heads, 32 groups, 30 cues and 10 effects. Larger inputs or a context over the configured budget are rejected before calling the model. Native output pages are split into ten controls. AI output contains only planned cue/effect playbacks, not the legacy automatically generated operating pages. Basic rules retains those old options.

## Legacy compatibility

Legacy projects, rig colors, layouts and the native compiler remain compatible. Users must explicitly select Basic rules for the earlier offline planner. The old four-field AI response (looks/circle/chase/decisions) is no longer accepted as AI output; requestLLMDesign/buildLLMRequest now use v2. This deliberate rejection prevents unsupported old fields being silently ignored. Existing plain compiler calls without plan/llm remain the explicit legacy API.

## MagicQ evidence

The target is MagicQ 1.9.7.3. The 1.9.7.x manual documents FX base positions, independent FX playbacks, offsets/spread and zero-size FX for overriding movement. This adapter does not invent an automatic zero-size override or release macro. It retains the existing native serialization and exposes only characterized fields. **Exact 1.9.7.3 loading/playback validation is pending**, including manual-release behavior, mixed RGB/CMY/wheel colors, coarse/fine aim, inherited timing and interaction with other playbacks. Automated structural/math checks and mocked model tests are not console or physical verification.

## Sources checked 2026-10-14

- https://ollama.com/library/qwen3.5:4b — model, quantization/download and license.
- https://docs.ollama.com/capabilities/structured-outputs — JSON Schema in format and independent response validation.
- https://docs.ollama.com/api/chat — chat endpoint and request options.
- https://docs.ollama.com/faq — loopback binding, Mac environment settings and OLLAMA_NO_CLOUD.
- https://docs.chamsys.co.uk/magicq/1.9.7.x/manual/FX_engine.html — FX base values, spread and zero-size behavior.

The design prompt's artistic priorities are application guidance, not a claim that these sources prescribe particular intensity levels for every event.

## Validation commands

    npm run build
    npm test
    npm ci
    xvfb-run -a npm run test:desktop

On macOS use npm run test:desktop without Xvfb. Model requests and server responses are mocked in tests: a running Ollama/model is not required. The desktop smoke exercises actual UI rig load, explicit legacy export, local model connection, review/export, stale plan invalidation, invalid response blocking and empty launch.
