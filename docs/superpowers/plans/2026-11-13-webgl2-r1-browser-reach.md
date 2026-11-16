# WebGL 2 renderer, CS-43: the browsers without WebGPU

**Status (2026-11-13):** research note, reviewed: **the owner accepted all seven recommendations** (section 10) on 2026-11-13. The WebGL 2 plan carries them (floor, CS-44 order, personas, earlier steps). Which test devices are available (question 7) is still open. Nothing is implemented. It answers CS-43 of `docs/superpowers/plans/2026-11-13-webgl2-renderer.md` (section 8) and open question 1 of its section 9, "Which browsers the WebGL 2 renderer is for". Every figure has a source and the date it was read. All sources were read on 2026-11-13 unless a row says otherwise.

**Scope:** technical browser and device facts only. The plan's wording rules apply: no time estimates, and "accuracy" and "precision" are kept apart.

## 1. Summary

**How many browsers lack WebGPU.** Two public sources disagree, and each measures something different. So the answer is a range, not a number.

| Source                                                                             | Share with WebGPU                 | Share without                                     | What it measures                                                                                 |
| ---------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Can I use (StatCounter page views, by browser version), data file dated 2026-11-11 | 86.83% full, 3.32% partial        | 7.42% listed "no", plus part of the partial class | Whether the browser version ships it. Blind to hardware and OS gating, so it overstates          |
| Web3D Survey, undated                                                              | 81.86% returned a working adapter | 18.14% did not                                    | Whether `requestAdapter()` worked in a real browser. Its sample is whoever ran its report script |

- The share without WebGPU is somewhere between 7% and 18%. That range is the main uncertainty in this note, and neither source can narrow it. The partial class (3.32%) is browsers that enable it only on some OS or CPU families.
- WebGL 2 is almost universal. Can I use has 97.29% of page views with WebGL 2. Web3D Survey has 98.27% of tested reports, and 5.97% "may run with reduced performance" (software rendering).
- The people without WebGPU are a mix, not one browser:
  - Safari on iOS 18 and earlier and Safari on macOS older than 26.
  - Firefox on Linux and on Intel Macs. On Windows and Apple Silicon Macs it has WebGPU.
  - Chrome on Linux outside Intel Gen12+ and NVIDIA on Wayland.
  - Chrome on Android below Android 12, or on Samsung Xclipse GPUs.
  - Chrome on Windows with older GPUs or drivers.
  - Chrome versions before 113.

**What those browsers have.** One extension is universal, and the others split by browser:

- `EXT_color_buffer_float` is 99.95% overall and 99.67% on Linux, the lowest platform. It is a safe requirement.
- Firefox lacks `WEBGL_multi_draw` (1.43%), `KHR_parallel_shader_compile` (1.18%), `EXT_disjoint_timer_query_webgl2` (0.09%) and `WEBGL_clip_cull_distance` (1.42%). Firefox 159 (2026-10-27) added `EXT_clip_control`. Firefox is 37.9% of its own reports without WebGPU.
- Safari and iOS lack the timer query (0.2%), and their `OES_texture_float_linear` and `EXT_float_blend` sit at 53% to 58%.
- Chrome on Android has no timer query (0.45%) and no `KHR_parallel_shader_compile` (0.21%), and `EXT_clip_control` is 70.3%.
- Linux is the cleanest proxy for "no WebGPU": 80.6% of its reports lack it. Its extension rates are in section 5.

**Recommendations** (the reasons are in sections 6 to 8, the questions in section 10):

1. **Floor:** a WebGL 2 context, `EXT_color_buffer_float`, `MAX_TEXTURE_SIZE` at least 4096, `MAX_SAMPLES` at least 4, `MAX_DRAW_BUFFERS` at least 4, `MAX_UNIFORM_BLOCK_SIZE` at least 16384 and `MAX_VERTEX_TEXTURE_IMAGE_UNITS` at least 16. Every report in the survey meets all of them. Refuse anything else with a message that names the missing item.
2. **Everything else is a reported path with a fallback.** That covers `EXT_clip_control` (log depth), `WEBGL_multi_draw`, `OES_texture_float_linear`, `EXT_float_blend`, the timer query and parallel shader compile.
3. **CS-44 order:** FXAA, clips, depth-range readback, shadows, ambient occlusion, `moments16`, then `moments32` only where `EXT_float_blend` exists. Extensions don't decide the order, because nothing in CS-44 needs one beyond the floor except `moments32`. Section 7 has the reasons and each step's fallback.
4. **The probe checks framebuffer completeness** for the formats the renderer uses, not only extension names.
5. **The profiles plan's CS-30 holds** the extension set, the parameter set, the unmasked renderer string with the ANGLE backend, a software-renderer flag and the reason WebGPU wasn't chosen. Section 8 lists them.

## 2. Sources, and what each measures

| Source                                                                                                                                                                                                                                                                              | Read       | What it measures                                                                                                                                                                               | Bias and limits                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Can I use](https://caniuse.com/webgpu), from the [Fyrd/caniuse data file](https://github.com/Fyrd/caniuse) (`data.json`, updated 2026-11-11 05:48 UTC)                                                                                                                             | 2026-11-13 | Browser versions that ship a feature, weighted by StatCounter's global page-view share by browser and version. The file doesn't state the StatCounter month. The handbook records October 2026 | Counts page views, not people. Browser and version only, so it can't see the OS, GPU or driver gating that decides whether `requestAdapter()` works. Chrome for Android is one row (157) and counts as "yes" in full. The shares sum to 97.57%: the rest is not classified                                                                  |
| [Web3D Survey](https://web3dsurvey.com/webgpu) ([WebGL 2](https://web3dsurvey.com/webgl2))                                                                                                                                                                                          | 2026-11-13 | Reports from a script run in real browsers: whether the API returned a working adapter or context, and which extensions and limits it showed. Platform and browser are each a separate table   | Does not state a date or period. The sample is whoever ran the script, so it leans to developers, test sites and automated runs. The platform and browser tables are marginal: there is no cross-tab (without WebGPU by extension). Its pages for single extensions and parameters give per-platform and per-browser rows, and nothing else |
| [MDN browser-compat-data](https://github.com/mdn/browser-compat-data) 8.1.9 (built 2026-11-12)                                                                                                                                                                                      | 2026-11-13 | The version in which each browser first shipped an API                                                                                                                                         | Says nothing about hardware gating or how many users have it                                                                                                                                                                                                                                                                                |
| [gpuweb Implementation Status](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status) (raw wiki text; the plan records it as edited 2026-10-02)                                                                                                                               | 2026-11-13 | Which engines ship WebGPU, on which platforms                                                                                                                                                  | A community-edited wiki. Not dated by the text I read                                                                                                                                                                                                                                                                                       |
| [What's New in WebGPU, Chrome 121](https://developer.chrome.com/blog/new-in-webgpu-121), [122](https://developer.chrome.com/blog/new-in-webgpu-122), [146](https://developer.chrome.com/blog/new-in-webgpu-146), [147-148](https://developer.chrome.com/blog/new-in-webgpu-147-148) | 2026-11-13 | Chrome's own rollout statements                                                                                                                                                                | The 122 post's device shares are from early 2024                                                                                                                                                                                                                                                                                            |
| [Firefox 159 release notes (MDN)](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/159) and [Mozilla meta bug 1908745](https://bugzilla.mozilla.org/show_bug.cgi?id=1908745)                                                                                       | 2026-11-13 | Firefox's WebGL extension gaps                                                                                                                                                                 | The bug's gap list is from 2024 (Windows, against Chrome Canary of that time). The 159 notes update part of it                                                                                                                                                                                                                              |
| [Web features explorer, WebGPU](https://web-platform-dx.github.io/web-features-explorer/features/webgpu)                                                                                                                                                                            | 2026-11-13 | Chrome Platform Status's use counter: "~10.096% of page loads"                                                                                                                                 | A use counter, so pages that call the API. **Not** an availability figure. An earlier search snippet quoted "~0.721%" for the same page, so the figure moves and I don't use it                                                                                                                                                             |

Chrome Platform Status itself wasn't read. Its pages need a script and gave no figure for availability.

## 3. WebGPU availability, November 2026

### 3.1 By engine

From the gpuweb status page, with the Chrome posts above and Can I use's version rows.

| Engine                                           | Where WebGPU is on by default                                                                                                                                                                                                                                                          | Where it isn't                                                                                                                                                                                                                                                 |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chromium (Chrome, Edge, Opera, Samsung Internet) | macOS, Windows (x86 and x64) and ChromeOS from 113. Android 12 and later on ARM, Qualcomm and Intel GPUs from 121. Imagination GPUs on Android 16 and later from 139. Linux on Intel Gen12 and later from 144. Linux on NVIDIA drivers 535.183.01 and later under Wayland from 147-148 | Windows on ARM64: behind a flag. Linux elsewhere: behind a flag, and Can I use says "depends on hardware and drivers". Android Samsung Xclipse: "TBD" on the wiki. Android 11 and below: planned in the 121 post, no source says it shipped. Chrome before 113 |
| Firefox (Gecko, built on wgpu)                   | Windows from 141. Apple Silicon Macs on macOS 26 from 145, and all macOS versions on Apple Silicon from 147                                                                                                                                                                            | Intel Macs and Linux: Nightly only. Android: behind a flag. Web features explorer lists Firefox as "not supported" (the baseline blocker), Can I use lists 156 to 159 as partial                                                                               |
| Safari (WebKit)                                  | Safari 26 on macOS 26, iOS 26, iPadOS 26 and visionOS 26                                                                                                                                                                                                                               | Safari on iOS 18 and earlier, Safari 26 and 27 on macOS older than 26 (Can I use's partial class, 1.80% of page views), and everything before 26                                                                                                               |

Chromium's **compatibility mode** (`requestAdapter({ featureLevel: "compatibility" })`, OpenGL ES 3.1) shipped in Chrome 146 (2026-03-10) for Android. The 146 post names ChromeOS (OpenGL ES) and Windows (Direct3D 11) as "exploring". It's a restricted subset of WebGPU. This engine's renderer is GPU-driven from compute and storage buffers, which the mode limits, so I take it that it can't run the WebGPU renderer. That is my inference from the mode's limits, not something I tested. These devices stay on WebGL 2.

### 3.2 By platform

The Web3D Survey rows are "WebGPU returned a working adapter", per platform. "Without" is 100% minus that.

| Platform | With WebGPU (survey) | Without | Notes                                                                                                                                       |
| -------- | -------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Windows  | 84.43%               | 15.57%  | Chrome 122's post said "31% of Chrome users lack D3D11.1+" in early 2024. That is a device-capability gap, not a count of today's non-users |
| macOS    | 90.99%               | 9.01%   | Safari on macOS older than 26, and Firefox on Intel                                                                                         |
| Linux    | 19.39%               | 80.61%  | Chrome rollout began with Intel Gen12 and later (144). Firefox Linux is Nightly only                                                        |
| ChromeOS | 93.30%               | 6.70%   |                                                                                                                                             |
| Android  | 76.57%               | 23.43%  | Android 12 and later, ARM and Qualcomm GPUs. Chrome 122's post said 23% of Android devices lacked Vulkan 1.1 (early 2024)                   |
| iOS      | 88.00%               | 12.00%  | iOS 18 and earlier                                                                                                                          |

### 3.3 By browser, WebView and shell

| Browser                | With WebGPU (survey) | Can I use (page-view share, Nov 2026 data)                                                    | Notes                                                                                                                                                                                                                                                                                         |
| ---------------------- | -------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chrome and Chromium    | 82.11%               | Chrome desktop 23.61% yes, 1.35% no (versions below 113). Chrome for Android 44.02% yes       | The survey's Chrome row includes Android and Linux. Can I use counts all of Chrome for Android as yes                                                                                                                                                                                         |
| Edge                   | 92.89%               | 5.01% yes                                                                                     |                                                                                                                                                                                                                                                                                               |
| Firefox                | 62.11%               | Desktop: 1.52% partial, 0.60% no. Android: 0.38% no (version 160, flagged)                    |                                                                                                                                                                                                                                                                                               |
| Safari                 | 83.12%               | macOS: 1.80% partial, 1.11% no. iOS: 3.00% no (iOS 18 and earlier), 10.23% yes (26 and later) |                                                                                                                                                                                                                                                                                               |
| Samsung Internet       | 78.62%               | 1.91% yes (versions 28 to 30)                                                                 | The wiki lists Xclipse as TBD. A May 2026 community post, anecdotal, reports an Exynos 2400 phone failing WebGPU demos on One UI 8.5                                                                                                                                                          |
| Opera                  | 89.33%               | 0.89% yes                                                                                     |                                                                                                                                                                                                                                                                                               |
| Android WebView        | not reported         | not reported                                                                                  | A 2024 blink-dev thread says WebGPU is supported on Android WebView and lists "Shipping on Android 124". It isn't clear that the line refers to WebView. The compatibility mode intent lists WebView at 146. I found no WebView release note for core WebGPU, so treat WebView as unconfirmed |
| WKWebView (iOS, macOS) | not reported         | not reported                                                                                  | An Apple engineer said on the developer forums that WebGPU would work "when it's enabled by default", and that it is on in the iOS 26 beta. An older forum thread says "not supported". I found no release note for the final iOS 26. Unconfirmed                                             |
| Electron               | not reported         | not reported                                                                                  | Chromium-based, so it follows its Chromium version and its GPU gating. I found no Electron documentation on it and didn't read any. Unconfirmed                                                                                                                                               |

### 3.4 Adapter features and limits that commonly differ

From the Web3D Survey WebGPU page (undated, read 2026-11-13). These are rates among adapters that worked. They show which differences to expect on the WebGPU side, and they aren't about this note's population.

| Feature or limit                  | Rate                                                                            | Note                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `core-features-and-limits`        | 99.07%                                                                          | The marker that separates core adapters from compatibility ones                       |
| `float32-filterable`              | 91.27%                                                                          |                                                                                       |
| `float32-blendable`               | 94.04%                                                                          | The engine's moments format reads it (the profiles inventory, `RenderContext.ts:937`) |
| `clip-distances`                  | 82.27%                                                                          |                                                                                       |
| `dual-source-blending`            | 82.18%                                                                          |                                                                                       |
| `subgroups`                       | 68.25%                                                                          |                                                                                       |
| `shader-f16`                      | 94.05%                                                                          |                                                                                       |
| `texture-compression-bc`          | 87.01%                                                                          |                                                                                       |
| `texture-compression-astc`        | 47.21%                                                                          |                                                                                       |
| `texture-compression-etc2`        | 47.42%                                                                          |                                                                                       |
| `timestamp-query`                 | 98.80%                                                                          |                                                                                       |
| `maxStorageBuffersPerShaderStage` | at least 8: 100%. At least 16: 80%                                              |                                                                                       |
| `maxTextureDimension2D`           | at least 8192: 100%. At least 16384: 99%                                        |                                                                                       |
| `maxStorageBufferBindingSize`     | at least 134217728: 100%. At least 2147483647: 16%                              |                                                                                       |
| `maxBufferSize`                   | at least 268435456: 100%. At least 2147483647: 77%                              |                                                                                       |
| Vendors                           | Apple 32.69%, Intel 32.24%, NVIDIA 15.72%, AMD 8.67%, Arm 5.93%, Qualcomm 4.57% |                                                                                       |
| Fallback adapters                 | 0.04% of working adapters                                                       |                                                                                       |

## 4. The share without WebGPU

| Cut                                        | Figure                                                                                                              | Source                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Browser versions that Can I use marks "no" | 7.42% of page views                                                                                                 | Can I use, data 2026-11-11                                                        |
| Browser versions marked "partial"          | 3.32%                                                                                                               | Same. It enables WebGPU only on some OS or CPU families, so some of these have it |
| Browser versions marked "yes"              | 86.83%                                                                                                              | Same. Includes all of Chrome for Android (44.02%), which hardware gating shrinks  |
| Reports without a working adapter          | 18.14%                                                                                                              | Web3D Survey                                                                      |
| Without a working adapter, by platform     | Linux 80.6%, Android 23.4%, Windows 15.6%, iOS 12.0%, macOS 9.0%, ChromeOS 6.7%                                     | Web3D Survey                                                                      |
| Without a working adapter, by browser      | Firefox 37.9%, Samsung Internet 21.4%, Chrome and Chromium 17.9%, Other 17.3%, Safari 16.9%, Opera 10.7%, Edge 7.1% | Web3D Survey                                                                      |

**What lies behind the 7.42%:**

| Cohort (Can I use)                     | Share of page views |
| -------------------------------------- | ------------------- |
| Safari on iOS 18.x and earlier         | 3.00%               |
| Chrome 103 to 112 and other old Chrome | 1.35%               |
| Safari on macOS 18.x and earlier       | 1.11%               |
| Firefox desktop, old versions          | 0.60%               |
| UC Browser                             | 0.58%               |
| Firefox for Android                    | 0.38%               |
| IE (no WebGL 2 either)                 | 0.17%               |
| Other                                  | 0.23%               |

**The gap between the two sources** is the hardware gating that Can I use can't see (Android, Linux, older Windows GPUs). The survey's sample bias also moves the number, and I can't tell in which direction. I don't have a basis to pick a point inside 7% to 18%.

**The handbook's constant** (`WEBGPU_USAGE = "88.63%"`, read 2026-11-08, `handbook/src/sources.ts`) doesn't match the 86.83% "yes" in the data file I read on 2026-11-13. Either the file's StatCounter month moved between the two reads, or the handbook counted differently. I haven't changed it. I'd check it before the handbook cites a number.

## 5. WebGL 2 among the browsers without WebGPU

### 5.1 Availability

| Source                     | WebGL 2                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| Can I use, data 2026-11-11 | 97.29% of page views yes. 0.29% no, of which IE is 0.17%, Safari on iOS 0.07% and Safari on macOS 0.03% |
| Web3D Survey               | 98.27% of reports with the API tested. 5.97% "may run with reduced performance"                         |
| Survey by platform         | Android 99.44%, ChromeOS 99.90%, iOS 99.17%, Linux 88.85%, macOS 97.63%, Windows 99.04%                 |
| Survey by browser          | Chrome 98.36%, Edge 99.70%, Firefox 97.28%, Opera 99.31%, Safari 96.81%, Samsung 99.87%, Other 97.77%   |

The two sources use different denominators. If I assume everyone with WebGPU also has WebGL 2, then the share with WebGL 2 and no WebGPU is the difference: about 10.5 points on Can I use's "yes" row, and about 16.4 points on the survey. Linux is the weak platform for WebGL 2 itself (11.15% without). I don't know why, and the survey doesn't say.

**The software-rendering share.** 5.97% "may run with reduced performance" in the survey means a software or major-performance-caveat context. That share overlaps with Linux and virtual machines. It can still pass the floor, so the probe has to record it (section 8) instead of treating it as a failure.

### 5.2 Extensions, by platform

Web3D Survey, read 2026-11-13. Each cell is the share of reports (that tested the extension) on that platform that show it. This is the marginal for the platform, which includes people who have WebGPU. **For Linux, 80.6% of reports lack WebGPU, so its column is close to the no-WebGPU population.** For the other platforms it isn't. Android is 23% and Windows 16%, so the Android and Windows columns mostly describe people who have WebGPU.

| Extension                         | All   | Windows | macOS | Linux | Android | iOS   | ChromeOS |
| --------------------------------- | ----- | ------- | ----- | ----- | ------- | ----- | -------- |
| `EXT_color_buffer_float`          | 99.95 | 99.99   | 99.97 | 99.67 | 99.79   | 100   | 100      |
| `EXT_color_buffer_half_float`     | 91.75 | 92.39   | 94.00 | 61.68 | 87.27   | 99.99 | 100      |
| `OES_texture_float_linear`        | 90.55 | 99.99   | 87.24 | 97.49 | 76.52   | 53.16 | 84.82    |
| `EXT_float_blend`                 | 93.46 | 99.99   | 87.20 | 99.74 | 99.68   | 53.06 | 96.80    |
| `EXT_disjoint_timer_query_webgl2` | 62.84 | 81.18   | 60.62 | 42.79 | 0.45    | 0.19  | 99.22    |
| `KHR_parallel_shader_compile`     | 74.57 | 85.10   | 92.56 | 42.73 | 0.21    | 98.71 | 28.02    |
| `WEBGL_multi_draw`                | 92.38 | 92.39   | 94.00 | 62.19 | 93.84   | 100   | 100      |
| `EXT_clip_control`                | 92.83 | 98.57   | 92.95 | 75.62 | 70.33   | 98.63 | 85.55    |
| `WEBGL_clip_cull_distance`        | 81.86 | 92.28   | 93.46 | 54.23 | 34.66   | 98.66 | 24.33    |
| `WEBGL_provoking_vertex`          | 76.83 | 92.67   | 99.17 | 15.81 | 0.08    | 98.60 | 0        |
| `EXT_depth_clamp`                 | 91.21 | 99.02   | 99.30 | 91.13 | 23.86   | 98.49 | 84.81    |
| `OVR_multiview2`                  | 56.42 | 99.72   | 0.82  | 35.79 | 7.68    | 1.29  | 56.41    |
| `EXT_texture_filter_anisotropic`  | 99.50 | 99.99   | 100   | 99.46 | 94.77   | 100   | 99.99    |
| `WEBGL_compressed_texture_astc`   | 49.38 | 7.55    | 89.21 | 82.96 | 99.83   | 99.98 | 98.65    |
| `WEBGL_compressed_texture_etc`    | 50.33 | 7.28    | 88.98 | 91.42 | 99.92   | 99.98 | 99.86    |
| `WEBGL_compressed_texture_s3tc`   | 86.05 | 99.97   | 87.19 | 94.15 | 31.34   | 53.05 | 81.28    |
| `EXT_texture_compression_bptc`    | 83.81 | 99.77   | 80.59 | 92.74 | 24.66   | 53.05 | 81.27    |
| `EXT_texture_norm16`              | 89.87 | 94.87   | 97.93 | 66.04 | 53.94   | 98.93 | 81.13    |

### 5.3 Extensions, by browser

Same source and meaning. The "browser" is the survey's label, so "Chrome/Chromium" includes Chrome for Android and Linux, and "Other" is everything unlabeled.

| Extension                         | Chrome | Edge  | Firefox  | Safari    | Samsung  | Opera | Other |
| --------------------------------- | ------ | ----- | -------- | --------- | -------- | ----- | ----- |
| `EXT_color_buffer_float`          | 99.94  | 100   | 99.92    | 100       | 100      | 100   | 99.89 |
| `EXT_color_buffer_half_float`     | 99.45  | 99.99 | **1.49** | 100       | 72.89    | 99.71 | 93.66 |
| `OES_texture_float_linear`        | 94.42  | 99.55 | 98.16    | **58.23** | 73.69    | 97.94 | 77.09 |
| `EXT_float_blend`                 | 98.33  | 99.68 | 99.42    | **58.12** | 99.73    | 99.22 | 80.20 |
| `EXT_disjoint_timer_query_webgl2` | 77.41  | 94.33 | **0.09** | **0.21**  | **1.22** | 87.59 | 25.55 |
| `KHR_parallel_shader_compile`     | 75.04  | 98.24 | **1.18** | 99.03     | **0.67** | 94.16 | 80.90 |
| `WEBGL_multi_draw`                | 99.97  | 100   | **1.43** | 100       | 100      | 100   | 99.80 |
| `EXT_clip_control`                | 95.53  | 99.65 | 60.29    | 98.39     | **1.21** | 98.27 | 82.66 |
| `WEBGL_clip_cull_distance`        | 85.83  | 99.26 | **1.42** | 98.81     | **6.98** | 96.71 | 80.78 |
| `WEBGL_provoking_vertex`          | 70.72  | 97.91 | 68.10    | 99.02     | **0.67** | 93.67 | 80.78 |
| `EXT_depth_clamp`                 | 89.99  | 99.10 | 89.11    | 98.56     | **0.81** | 95.38 | 79.61 |
| `OVR_multiview2`                  | 60.61  | 94.03 | 62.62    | **0.77**  | **0.81** | 86.19 | 24.46 |
| `EXT_texture_filter_anisotropic`  | 99.33  | 99.98 | 99.76    | 100       | 96.24    | 99.71 | 99.17 |
| `WEBGL_compressed_texture_astc`   | 49.53  | 5.77  | 28.91    | 98.03     | 99.32    | 13.52 | 78.67 |
| `WEBGL_compressed_texture_etc`    | 50.22  | 6.09  | 32.89    | 98.05     | 99.33    | 13.23 | 78.50 |
| `WEBGL_compressed_texture_s3tc`   | 88.59  | 99.00 | 94.75    | 58.12     | 56.38    | 95.15 | 69.25 |
| `EXT_texture_compression_bptc`    | 87.43  | 98.83 | 77.51    | 57.83     | 40.94    | 94.62 | 68.77 |
| `EXT_texture_norm16`              | 88.86  | 99.51 | 71.35    | 99.38     | 55.70    | 97.37 | 92.43 |

### 5.4 Shipping versions (MDN browser-compat-data 8.1.9, 2026-11-12)

For the extensions that split by browser. "No" means the data lists no support.

| Extension                         | Chrome            | Firefox                                         | Safari        | Samsung Internet |
| --------------------------------- | ----------------- | ----------------------------------------------- | ------------- | ---------------- |
| `EXT_color_buffer_half_float`     | 63                | 47 (listed). The survey shows 1.49% for WebGL 2 | 14            | 8.0              |
| `OES_texture_float_linear`        | 29                | 24                                              | 8             | 2.0              |
| `EXT_float_blend`                 | 75                | 67                                              | 14.1 (iOS 15) | 11.0             |
| `EXT_disjoint_timer_query_webgl2` | 70 (desktop only) | no                                              | no            | no               |
| `KHR_parallel_shader_compile`     | 76                | no                                              | 14.1          | 12.0             |
| `WEBGL_multi_draw`                | 86                | no                                              | 15            | 14.0             |
| `EXT_clip_control`                | 122               | **159** (released 2026-10-27)                   | 17.4          | 26.0             |
| `EXT_texture_norm16`              | 87                | **159**                                         | 16            | 14.0             |
| `WEBGL_compressed_texture_s3tc`   | 26 (desktop)      | 22                                              | 8             | no               |
| `EXT_texture_compression_bptc`    | 93                | 68                                              | 16            | no               |

MDN has no entry for `WEBGL_clip_cull_distance`, `WEBGL_provoking_vertex` or `EXT_depth_clamp`, so those rest on the survey alone.

### 5.5 Parameters

Web3D Survey parameter pages, read 2026-11-13. Each cell is the smallest value reported by the stated share. "100% at least X" means every report is X or more.

| Parameter                                      | All reports                                                      | Notes by platform                                                                                                                                                                                                                                                                  |
| ---------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MAX_TEXTURE_SIZE`                             | 100% at least 4096. 98% at least 6003. 84% at least 16383        | Android: 100% at least 4096, 78% at least 6003, 6% at least 16383. Linux: 100% at least 4096, 97% at least 8192. Windows, macOS, iOS, ChromeOS: 100% at least 8192. Firefox: 100% at least 2048, 99% at least 4096. So the plan's 2048 case exists, in about 1% of Firefox reports |
| `MAX_ARRAY_TEXTURE_LAYERS`                     | 100% at least 512 (overall). 99% at least 1024. 5% at least 2050 | Android: 100% at least 256, 95% at least 512. Linux: 100% at least 512. Windows, macOS, iOS, ChromeOS: 100% at least 2048                                                                                                                                                          |
| `MAX_SAMPLES`                                  | 100% at least 4. 62% at least 6                                  | Android: 2% at least 8. iOS: 25% at least 8. macOS: 19% at least 6. Windows: 93% at least 8. Linux: 78% at least 8                                                                                                                                                                 |
| `MAX_DRAW_BUFFERS` and `MAX_COLOR_ATTACHMENTS` | 100% at least 4. 98% at least 6. 96% at least 7                  | Android: 100% at least 4, 89% at least 6, 88% at least 8. Linux: 100% at least 4, 99% at least 6. iOS: 100% at least 6. macOS: 100% at least 8. Windows: 100% at least 6                                                                                                           |
| `MAX_UNIFORM_BLOCK_SIZE` (bytes)               | 100% at least 16384. 72% at least 16386                          | Windows and ChromeOS: 100% at least 65536. Android: 98% at least 32768. macOS: 93% are exactly 16384. iOS: 99% are exactly 16384. Safari: 99% are exactly 16384                                                                                                                    |
| `MAX_VERTEX_TEXTURE_IMAGE_UNITS`               | 100% at least 16                                                 |                                                                                                                                                                                                                                                                                    |
| `MAX_RENDERBUFFER_SIZE`                        | 100% at least 8192                                               |                                                                                                                                                                                                                                                                                    |
| `MAX_3D_TEXTURE_SIZE`                          | 100% at least 2048                                               |                                                                                                                                                                                                                                                                                    |

The plan's risk note says `MAX_TEXTURE_SIZE` can be "as low as 2048". The survey has no report below 4096 except Firefox's 1% at 2048. At 4096, an `RGBA32F` data texture holds 256 MB and an `RGBA32UI` one the same.

## 6. What the data can and can't tell us

**There is no cross-tab.** The survey gives a platform table and a browser table for each extension, never "no WebGPU and extension X". I can say how many reports lack WebGPU and how many have an extension. I can't say how many of the first have the second.

What I can do is read the cohorts that are mostly no-WebGPU:

| Cohort                      | Proxy                           | What it shows                                                                                                                                                                                                                                                                                                                                |
| --------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linux, 80.6% without WebGPU | The Linux column in 5.2         | `EXT_color_buffer_half_float` 61.7%, `WEBGL_multi_draw` 62.2%, timer query 42.8%, parallel compile 42.7%, `EXT_clip_control` 75.6%, `WEBGL_provoking_vertex` 15.8%. The first four are pulled down by Firefox on Linux. `OES_texture_float_linear` 97.5% and `EXT_float_blend` 99.7% are fine                                                |
| Firefox, 37.9% without      | The Firefox column in 5.3       | No multi-draw, no timer query, no parallel compile, no `EXT_color_buffer_half_float`, no clip distances. `EXT_clip_control` is 60.29% in the survey, which conflicts with MDN's version 159 (released 2026-10-27; Can I use gives Firefox 159 at 0.10% of page views). I can't tell why. Firefox forks or Nightly in the sample is one guess |
| Safari and iOS before 26    | The Safari and iOS columns      | `WEBGL_multi_draw` and `KHR_parallel_shader_compile` are present. `EXT_clip_control` is present (98.4%). No timer query. `OES_texture_float_linear` and `EXT_float_blend` sit at 58% on Safari and 53% on iOS. S3TC and BPTC sit at 58% and 53% too                                                                                          |
| Android below 12, Xclipse   | The Android and Samsung columns | No timer query, no parallel compile on Chrome for Android. `EXT_clip_control` is 70.3% on Android and 1.21% on Samsung Internet, though MDN lists Samsung Internet 26.0. The plan says ANGLE turns clip control off on some Mali GPUs. I haven't verified that, and the Samsung number is consistent with it                                 |

Two things stay open:

- **Four independent extensions sit at 53% to 58% on Safari and iOS.** `OES_texture_float_linear`, `EXT_float_blend`, S3TC and BPTC share one cohort split. It could be a WebKit version, or a family of Apple GPUs. WebKit bug reports say EXT_float_blend is missing on some iOS devices ([WebKit bug 247240](https://bugs.webkit.org/show_bug.cgi?id=247240), reported 2022 to 2023), and one 2024 report says float linear is still missing on iOS ([bug 282111](https://lists.webkit.org/pipermail/webkit-unassigned/2024-October/1192081.html)). The survey has no version breakdown. So I can't say whether the 53% cohort is the old-iOS cohort without WebGPU. **Treat `OES_texture_float_linear` and `EXT_float_blend` as missing on a large share of Apple mobile users until the CS-35 probe measures it.**
- **Extension names are not proof of use.** The renderer needs multisampled `RGBA16F` renderbuffers and an `RG16UI` target. A context can list `EXT_color_buffer_float` and still refuse a particular combination. The probe should build the actual framebuffers and check `checkFramebufferStatus`. Section 8 includes that.

## 7. Floor, fallbacks and the CS-44 order

### 7.1 The floor

What the WebGL 2 renderer requires. Each item is met by every report in the survey (the share is in the third column).

| Requirement                                                                                   | Why                                                                                                                                                                       | Share meeting it                            |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| A WebGL 2 context                                                                             | The device                                                                                                                                                                | 97.29% to 98.27% overall (section 5.1)      |
| `EXT_color_buffer_float`                                                                      | `RGBA16F` HDR targets and multisampled renderbuffers, and float readbacks. In WebGL 2 it also covers half-float rendering, so `EXT_color_buffer_half_float` is not needed | 99.95%                                      |
| Framebuffer completeness for `RGBA16F` at 4 samples, `RG16UI` at 1 sample, `R32F` at 1 sample | What the renderer allocates                                                                                                                                               | Not in the survey. The probe measures it    |
| `MAX_TEXTURE_SIZE` at least 4096                                                              | Data textures for records, materials and transforms. Imagery slices                                                                                                       | 100% (Firefox 1% report 2048)               |
| `MAX_SAMPLES` at least 4                                                                      | 4× MSAA                                                                                                                                                                   | 100%                                        |
| `MAX_DRAW_BUFFERS` at least 4                                                                 | Translucency moments and the post chain                                                                                                                                   | 100%                                        |
| `MAX_UNIFORM_BLOCK_SIZE` at least 16384                                                       | The std140 slot block for styles and tables: 1024 `vec4` slots                                                                                                            | 100%                                        |
| `MAX_VERTEX_TEXTURE_IMAGE_UNITS` at least 16                                                  | Data textures read in the vertex stage                                                                                                                                    | 100%                                        |
| `MAX_ARRAY_TEXTURE_LAYERS` at least 256                                                       | The imagery texture array, with slices clamped to what the device reports                                                                                                 | 100% (Android: 5% of reports are below 512) |

**What the renderer refuses**, with a message that names the item and its value, for example "WebGL 2 here has no EXT_color_buffer_float: the renderer needs it for HDR targets": a missing context, a missing `EXT_color_buffer_float`, a framebuffer that is incomplete, or a parameter below the line. The plan already refuses for no context and no HDR; this adds the parameter and framebuffer checks. The parameter lines are met by all reports in the survey, so they cost no one, and they give a clear message for the rest.

**A software renderer** (SwiftShader, llvmpipe, Microsoft Basic Render Driver) passes the floor. I recommend the renderer runs on it, reports it in `support.paths` and the inspector, and never refuses on speed. The probe tells it apart by the unmasked renderer string, or by `failIfMajorPerformanceCaveat` on a throwaway context.

### 7.2 Everything else: paths and fallbacks

| Extension or parameter            | Share, the weakest platform                                    | Needed by                                                   | Path with it                                   | Path without it                                                                                                                                                                                       |
| --------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EXT_clip_control`                | 92.83% overall. Android 70.33%, Linux 75.62%, ChromeOS 85.55%  | CS-36 depth                                                 | Reversed-Z, float depth, infinite far plane    | Logarithmic depth written per fragment, as decided. Shown as `depth: log (no EXT_clip_control)`                                                                                                       |
| `WEBGL_multi_draw`                | 92.38% overall. Firefox 1.43%. Linux 62.19%                    | CS-36 draws                                                 | One `multiDrawElements` per batch, `gl_DrawID` | One `drawElements` per record, draw index in a uniform. Shown in `support.paths`                                                                                                                      |
| `OES_texture_float_linear`        | 90.55% overall. iOS 53.16%, Safari 58.23%, Android 76.52%      | CS-39 lattices, CS-42 float tables                          | Hardware trilinear on `RGBA32F`                | Trilinear done in the shader from eight `texelFetch` reads. `RGBA16F` is filterable without the extension (core), but halves the mantissa, so it needs a check on the lattice's stated accuracy first |
| `EXT_float_blend`                 | 93.46% overall. iOS 53.06%, Safari 58.12%                      | CS-44 `moments32`                                           | `RGBA32F` blending                             | `moments16` only                                                                                                                                                                                      |
| `EXT_disjoint_timer_query_webgl2` | 62.84% overall. Android 0.45%, iOS 0.19%, Firefox 0.09%        | The inspector                                               | GPU time per pass                              | Shown as unavailable, never zero                                                                                                                                                                      |
| `KHR_parallel_shader_compile`     | 74.57% overall. Android 0.21%, Firefox 1.18%                   | Program build                                               | Poll `COMPLETION_STATUS_KHR` without blocking  | The first link blocks. Compile the engine's programs at start-up behind a loading state and report the time. Don't compile mid-tick                                                                   |
| `WEBGL_clip_cull_distance`        | 81.86% overall. Android 34.66%, ChromeOS 24.33%, Firefox 1.42% | CS-44 clips                                                 | Clip distances in the vertex stage             | `discard` in the fragment stage, from the same data textures. This is the baseline, because the extension is absent where it matters                                                                  |
| `EXT_depth_clamp`                 | 91.21% overall. Android 23.86%                                 | CS-44 shadow casters                                        | Casters behind the near plane keep their depth | Clamp `gl_Position.z` to `-w` in the shadow vertex stage                                                                                                                                              |
| `EXT_polygon_offset_clamp`        | 92.26% overall (Web3D Survey, overall page)                    | CS-44 shadows                                               | A clamped offset                               | Plain `polygonOffset` and a constant bias                                                                                                                                                             |
| `EXT_texture_filter_anisotropic`  | 99.50% overall. Android 94.77%                                 | CS-37 imagery                                               | Anisotropic filtering                          | None. The floor of 1                                                                                                                                                                                  |
| `WEBGL_provoking_vertex`          | 76.83% overall. Android 0.08%, Linux 15.81%                    | Not needed: the ID pass writes `flat` values per vertex     |                                                | Don't use it                                                                                                                                                                                          |
| `OVR_multiview2`                  | 56.42% overall                                                 | Not needed (no stereo)                                      |                                                | Don't use it                                                                                                                                                                                          |
| `EXT_texture_norm16`              | 89.87% overall. Android 53.94%                                 | Not needed: IDs are `RG16UI`, heights are vertex attributes |                                                | Don't use it                                                                                                                                                                                          |
| `EXT_color_buffer_half_float`     | 91.75% overall. Firefox 1.49%                                  | Not needed: `EXT_color_buffer_float` covers it in WebGL 2   |                                                | Don't ask for it                                                                                                                                                                                      |

**KTX2 transcode target.** WebGL 2 has no compressed formats in core. Each family is an extension, and the platform rates differ:

| Platform | BPTC (BC7) | S3TC  | ASTC  | ETC2  |
| -------- | ---------- | ----- | ----- | ----- |
| Windows  | 99.77      | 99.97 | 7.55  | 7.28  |
| macOS    | 80.59      | 87.19 | 89.21 | 88.98 |
| Linux    | 92.74      | 94.15 | 82.96 | 91.42 |
| Android  | 24.66      | 31.34 | 99.83 | 99.92 |
| iOS      | 53.05      | 53.05 | 99.98 | 99.98 |
| ChromeOS | 81.27      | 81.28 | 98.65 | 99.86 |

The order the renderer tries is: BPTC, then ASTC, then ETC2, then `RGBA8`. That's the order the WebGPU path uses already (`io/decoders.ts:150-161`, in the profiles inventory: BC7, ASTC, ETC2, `RGBA8`). Each platform has a majority family, so the fallback to `RGBA8` is rare. It is reported in `support.paths`.

### 7.3 The CS-44 order

The finding is that **extension availability doesn't decide the CS-44 order.** Nothing in CS-44 needs an extension beyond the floor, except `moments32` (`EXT_float_blend`). Clip distances and depth clamp are optional and have a baseline without them. So the order comes from dependencies and from risk.

| Order | Step                           | Needs, beyond the floor                                                                                                                             | Fallback                                                                                                                          | Reason for its place                                                                                                                                                                                                                                                                                                                                     |
| ----- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | FXAA                           | Nothing                                                                                                                                             | None needed                                                                                                                       | A fragment pass over the display target. No dependencies                                                                                                                                                                                                                                                                                                 |
| 2     | Clips (boxes, terrain regions) | Nothing. `WEBGL_clip_cull_distance` optional                                                                                                        | `discard` from data textures                                                                                                      | Reads the draw records' clip block. No new resources                                                                                                                                                                                                                                                                                                     |
| 3     | Depth-range readback           | `EXT_color_buffer_float` (floor) for an `R32F` or `RG32F` reduction target. Async readback through a pixel-pack buffer and `fenceSync`: core        | A tick's delay (the plan already reads it one tick late). Until the first read, split the cascades from the camera's near and far | Shadows need it. Core WebGL 2 only                                                                                                                                                                                                                                                                                                                       |
| 4     | Shadows                        | Depth textures with a comparison sampler and `MAX_ARRAY_TEXTURE_LAYERS` at least 4: core. `EXT_depth_clamp` and `EXT_polygon_offset_clamp` optional | The clamps in the vertex stage, a fixed bias                                                                                      | Needs step 3. The reversed-Z or log depth choice for the main pass doesn't touch the shadow maps, which use ordinary orthographic depth. Check in the spike that linear filtering of comparison depth textures works without `OES_texture_float_linear` (I expect so, since the extension covers color formats, but I haven't seen it stated for depth) |
| 5     | Ambient occlusion              | A resolved depth texture, an `R8` or `R16F` target                                                                                                  | None                                                                                                                              | A fragment GTAO. It reads depth, and the depth is log-encoded on the `EXT_clip_control`-less path, so linearize per path                                                                                                                                                                                                                                 |
| 6     | `moments16` translucency       | `RGBA16F` blending with two draw buffers. `MAX_DRAW_BUFFERS` at least 4 (floor)                                                                     | Per-draw ordering (already in CS-38)                                                                                              | Blending of 16-bit float targets: I expect it to be core with `EXT_color_buffer_float`, only 32-bit blending needs `EXT_float_blend`. Confirm in the spike                                                                                                                                                                                               |
| 7     | `moments32`                    | `EXT_float_blend`                                                                                                                                   | `moments16`                                                                                                                       | Only where the extension exists. The WebGPU path has the same rule (`float32-blendable`: moments in `rgba16float`, bias 6 × 10⁻⁴ instead of 5 × 10⁻⁶)                                                                                                                                                                                                    |

The plan's CS-44 list was "shadows, moments translucency, FXAA, clips, ambient occlusion, the depth-range readback". The difference from that list is only the order. No step is dropped for lack of an extension.

### 7.4 Also for earlier steps

CS-43 touches steps before CS-44. These are the places where a step's design depends on a fact above:

| Step         | Fact                                                           | Consequence                                                                                                                             |
| ------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| CS-36        | `EXT_clip_control` is 70% on Android and 76% on Linux          | The log-depth path is not rare on these platforms. It needs the same parity effort as reversed-Z                                        |
| CS-36        | `WEBGL_multi_draw` is absent on Firefox (1.43%)                | "One call per record" is the path for all of Firefox. The inspector's draw-call counter matters most there                              |
| CS-37        | `MAX_ARRAY_TEXTURE_LAYERS` is 256 on some Android devices (5%) | The imagery slice ceiling reads the limit, as `SlicePool` does for WebGPU                                                               |
| CS-39        | `OES_texture_float_linear` is 53% to 58% on Apple mobile       | Lattice sampling needs the manual trilinear path from the start. Build it as the default and use hardware filtering as the optimization |
| CS-39, CS-42 | `EXT_float_blend` is the same                                  | No effect before CS-44                                                                                                                  |
| CS-42        | Tables in `RGBA32F` with filtering have the same limit         | Atmosphere tables in `RGBA16F`, or manual filtering. Check accuracy against the WebGPU result                                           |

## 8. What the profiles plan should hold as renderer facts (its CS-30)

The profiles plan's rule is that WebGL facts keep WebGL's own names. These are the ones CS-43 says to hold, with the reason.

| Fact                                                                                                                                                                                                                                         | Why                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| The result of the probe, with the reason WebGPU wasn't chosen: no `navigator.gpu`, `requestAdapter()` null, a fallback adapter, a compatibility-only adapter (`featureLevel: "compatibility"` worked and core didn't), or the user forced it | "WebGL 2 · WebGPU unavailable: no adapter" needs a cause. The compatibility case is new: it shows up on Android from Chrome 146                   |
| Every extension in section 7.2 and the floor, as present or absent                                                                                                                                                                           | The paths                                                                                                                                         |
| Parameters: `MAX_TEXTURE_SIZE`, `MAX_ARRAY_TEXTURE_LAYERS`, `MAX_3D_TEXTURE_SIZE`, `MAX_SAMPLES`, `MAX_DRAW_BUFFERS`, `MAX_UNIFORM_BLOCK_SIZE`, `MAX_VERTEX_TEXTURE_IMAGE_UNITS`, `MAX_RENDERBUFFER_SIZE`                                    | The limits in 5.5                                                                                                                                 |
| The unmasked vendor and renderer strings (where the browser exposes `WEBGL_debug_renderer_info`; the survey has it at 100%) and the ANGLE backend named in the renderer string (Direct3D 11, Metal, OpenGL, Vulkan)                          | Hardware paths appear only in the support report and the inspector. The Mali clip-control gating and any driver-specific path need the GPU family |
| A software-renderer flag                                                                                                                                                                                                                     | The 5.97% in the survey. Reported, not refused                                                                                                    |
| Whether `RGBA16F` at 4 samples, `RG16UI` and `R32F` framebuffers are complete                                                                                                                                                                | Section 6: extension names are not proof                                                                                                          |
| The KTX2 target chosen, and the compressed families present                                                                                                                                                                                  | `support.paths`                                                                                                                                   |
| `failIfMajorPerformanceCaveat` result                                                                                                                                                                                                        | A cheap check for the software case                                                                                                               |

**Personas.** The plan has `webgl2-basic` (minimums plus `EXT_color_buffer_float`, no clip control, no multi-draw) and `webgl2-chrome` (both). The data suggests three that differ from them:

| Persona               | Extensions                                                                                                                                                                                | Why it's a persona                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `webgl2-firefox`      | The floor. `EXT_clip_control` by version (159 and later). No multi-draw, no clip distances, no timer query, no parallel compile. `OES_texture_float_linear` and `EXT_float_blend` present | The one browser that lacks multi-draw. A real combination of `no multi-draw` with a good float path |
| `webgl2-apple-mobile` | The floor. Multi-draw, clip control and parallel compile present. No timer query. **No** `OES_texture_float_linear`, **no** `EXT_float_blend` (confirm with the probe)                    | The one place where the float paths fall back                                                       |
| `webgl2-android`      | The floor. Multi-draw present. No timer query, no parallel compile. No `EXT_clip_control` (the Mali case). `MAX_TEXTURE_SIZE` 4096 or 8192. ASTC and ETC2, no BC                          | The mobile shape: log depth, one compile at load, a small texture limit                             |

`webgl2-basic` stays as the floor. `webgl2-chrome` stays as the desktop Chromium shape. I'd add the three above, because each tests a fallback that the other two don't: `no multi-draw` is only in Firefox, `no float filtering` is only in Apple mobile, and a 4096-pixel limit with log depth and no parallel compile is only in Android.

## 9. Conflicts and uncertain data

Recorded as found. None of these is rounded.

| Item                                       | What conflicts                                                                                                                                     | What I did                                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Share without WebGPU                       | 7.42% (Can I use, "no") to 18.14% (survey)                                                                                                         | Gave the range (section 4)                                                   |
| Handbook's `WEBGPU_USAGE`                  | 88.63% (handbook, 2026-11-08) against 86.83% "yes" in the data file read 2026-11-13                                                                | Not changed. Flagged                                                         |
| Firefox `EXT_clip_control`                 | Survey 60.29% against MDN's version 159 (2026-10-27), with 159 at 0.10% of page views                                                              | Unresolved. Both shown                                                       |
| Samsung `EXT_clip_control`                 | Survey 1.21% against MDN's Samsung Internet 26.0                                                                                                   | Unresolved. The plan's Mali explanation is consistent but unverified         |
| Safari and iOS float extensions            | `OES_texture_float_linear` and `EXT_float_blend` at 53% to 58%, with WebKit bug reports old and new that disagree                                  | Treated as unknown until probed                                              |
| Safari on macOS 26 and later               | Can I use marks Safari 26.4 to 27 "partial" (only on macOS 26 and later). The gpuweb wiki says "Safari 26" for all Apple platforms, no macOS floor | Used Can I use's reading, which is the more cautious one                     |
| Firefox and WebGPU                         | The gpuweb wiki says it's on in Windows and Apple Silicon. The web features explorer says "Not supported" for Firefox                              | The explorer applies a stricter "everywhere" rule. Used the wiki             |
| Android WebView, WKWebView, Electron       | No release note found for core WebGPU on any of them                                                                                               | Marked unconfirmed                                                           |
| Samsung Internet on Xclipse                | The wiki says "TBD". Caniuse marks Samsung Internet "yes". Forum reports of failures are anecdotal                                                 | Treated as "no on Xclipse, not confirmed"                                    |
| Chrome for Android in Can I use            | One row (157), counted fully "yes"                                                                                                                 | Noted as an overstatement. The hardware gating is only visible in the survey |
| Compatibility mode on Windows and ChromeOS | The 146 post says "exploring". A third-party site says Direct3D 11 shipped                                                                         | Used the official post                                                       |
| Chrome Platform Status use counter         | A snippet read "~0.721%". The page read says "~10.096%"                                                                                            | Not used                                                                     |
| Survey dates                               | Neither Web3D Survey page states a date or period                                                                                                  | Every figure says "read 2026-11-13" and no more                              |

## 10. Open questions for the owner

Each has a recommendation.

1. **How far back should "auto" reach?** Recommendation: the floor in section 7.1, nothing narrower. It costs no one in the survey, because every report meets the parameter lines, and it needs no browser or version list. A list of browsers would age, and the probe already decides at run time. The alternative is to require `EXT_clip_control` and `WEBGL_multi_draw`, which would refuse a quarter to a third of Android and Linux and nearly all of Firefox for no capability the renderer can't supply another way.
2. **Should the engine try WebGPU compatibility mode before WebGL 2?** Recommendation: no. The GPU-driven renderer needs storage buffers and compute, which the mode restricts, so I'd expect it can't run. WebGL 2 is the fallback. Revisit only if a compute-free renderer for compatibility mode were ever wanted. Needs a test on a real Android device to confirm the inference.
3. **Should the CS-44 order in section 7.3 replace the plan's list?** Recommendation: yes. The order is by dependency (depth-range before shadows) and by risk (`moments32` last, conditional). Extensions don't separate the steps.
4. **Is clip distance a baseline or an optimization?** Recommendation: `discard` is the baseline and `WEBGL_clip_cull_distance` an optional speed-up. The extension is absent on Firefox (1.42%) and rare on Android (34.66%), so a clip path that depends on it would be the exception, not the rule.
5. **Which persona set?** Recommendation: keep `webgl2-basic` and `webgl2-chrome`, and add `webgl2-firefox`, `webgl2-apple-mobile` and `webgl2-android` (section 8), once the CS-35 probe has measured the Apple mobile float result, so the persona isn't built on the 53% guess.
6. **Does the handbook's compatibility tab show these numbers?** Recommendation: show the range (7% to 18%) with both sources and what each measures, and not a single figure. The handbook rules apply: each source goes in `handbook/src/sources.ts` with its read date, and the `WEBGPU_USAGE` constant is checked first (section 4). This note doesn't touch the handbook. It's the owner's call whether the tab shows this at all.
7. **Do we measure instead of read?** Recommendation: add the CS-35 probe's report to the Dyno page, so an actual device (an iPhone on iOS 18, an Android phone with a Mali GPU, Firefox on Linux) produces its own facts. That settles the Apple float question, the Samsung clip-control question and the Firefox question in section 9, which no public table can. It needs devices. Say which ones the owner has.
