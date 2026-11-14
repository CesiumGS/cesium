# Risk: indirect draws on Intel integrated GPUs (found 2026-11-08)

**What this holds:** A risk found 2026-11-08 and what was measured. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

Not yet tested. Intel's article 000102979 ("Simple WebGPU application Hangs with Indirect Draw Calls on UHD 700 and Iris Xe iGPUs", last reviewed July 2026) reports a hang with `DXGI_ERROR_DEVICE_REMOVED` on Windows 11, with no fix or workaround, and no driver or draw pattern named. This engine renders with indirect draws by default. All results so far come from two adapters, an NVIDIA RTX 3000 Ada laptop and an Apple M2, with none from Intel or AMD. Do before relying on any reach claim:

- Run the engine on UHD 7xx and Iris Xe under Windows 11, with Chrome and Edge, and record driver versions and any device loss. Find out whether Chrome already works around it.
- Check whether `SubmissionMode = "direct"` avoids the hang and covers every draw path, and what it costs. If so, fall back per adapter.
- Add Intel integrated and AMD machines to the bench's coverage.

**First result (owner, 2026-11-08):** `spikes/gpu-check.html` passed all its steps on an Intel adapter reporting architecture xe-lpg, with no device loss. Driver version and full report still to record. Xe-LPG is a newer architecture than the Xe-LP (UHD 7xx, Iris Xe) that the article names, so that case is still untested.
