# Content Security Policy Guide

Content Security Policy (CSP) is a browser security feature that limits where an
application can load and run code, images, and network requests. More generally,
CSP restricts which sources and browser capabilities the application may use.

This guide focuses on `@cesium/engine`, not `@cesium/widgets`. (`@cesium/widgets`
has its own CSP requirements and it is outside the scope of this guide.)
`CesiumWidget`, which is part of `@cesium/engine`, creates inline style elements
and attributes. If you use it, include `'unsafe-inline'` in `style-src`.

CesiumJS makes CSP worth thinking about because a CesiumJS application does more
than load one JavaScript file. It requests imagery, terrain, tileset, and other
application data. It also loads static assets, such as CSS and JSON files, from
the application or from CesiumJS. CesiumJS uses
[Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
to decode terrain, Draco geometry, KTX2 textures, glTF buffers, and other
content in the background. This keeps the page available for user input and
rendering while decoding runs, which can improve response time. Some decoders
use [WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly) (wasm).
A policy that is too strict can block these features; a policy that is too broad
gives up some of CSP's protection.

For a general explanation of CSP, see
[MDN's Content Security Policy documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy).

This guide explains how to choose a policy that lets CesiumJS work while
keeping the policy as narrow as practical. It is about how you serve your
application. CesiumJS does not set the policy for you.

## What CesiumJS needs from CSP

### How CesiumJS fits into CSP

A browser page using CesiumJS has two relevant execution areas:

- **The page:** your application and the scripts that run in the main browser
  page.
- **Web Workers:** separate execution contexts where CesiumJS performs many
  decoding tasks.

CSP is usually sent as an HTTP response header. The page's header controls the
page, while a header on a worker response controls that worker. This difference
matters because a permission such as `'wasm-unsafe-eval'` can be granted to a
worker without granting it to every script in the page.

The way CesiumJS is distributed determines whether its workers are separate
responses or are embedded in the main build and started from `blob:` URLs. The
sections below explain those two cases before showing the policy choices.

## Now choose your setup

Once you know how the page and its workers are served, most CesiumJS CSP setups
come down to three questions:

1. **How are you loading CesiumJS?** Are you using the ESM modules from a
   package and a bundler, or the combined `Build/Cesium/Cesium.js` file?
2. **Where are the worker files?** Are they served from the same origin as your
   page, or are they cross-origin?
3. **Which optional decoders or other features do you use?** Some features can
   have additional CSP requirements.

Answer those questions before changing the policy. The examples below show the
usual policy for each setup.

## Recommended policies

### ESM modules with same-origin workers

This is the best setup for a strict policy. It is the usual setup when you
install CesiumJS from npm and use Vite, Webpack, Rollup, Parcel, or another
module bundler.

```javascript
import { CesiumWidget } from "@cesium/engine";
```

Configure the bundler to copy the CesiumJS static directories `Workers`,
`ThirdParty`, `Assets`, and `Widgets` to a public path. Set `CESIUM_BASE_URL`
to that path:

```text
/cesium/
```

For a Vite or Webpack example, see
[Configuring Vite or Webpack for CesiumJS](https://cesium.com/blog/2024/02/13/configuring-vite-or-webpack-for-cesiumjs/).

The page can use a strict policy, while the worker responses have a small
exception for WebAssembly:

```http
# The application document
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  worker-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  connect-src 'self';

# Responses for files under /cesium/Workers/
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
```

KTX2 and SPZ content need compatible replacement decoders for this policy.
See [KTX2 textures](#ktx2-textures) and
[SPZ-compressed Gaussian splats](#spz-compressed-gaussian-splats).

You may also need to add the servers used by your imagery, terrain, and
tilesets to `connect-src` and `img-src`.

### Combined `Build/Cesium/Cesium.js`

The combined build includes `@cesium/widgets`, whose Knockout dependency uses
dynamic JavaScript evaluation during initialization. It also embeds the worker
code and starts workers from `blob:` URLs. There is no separate worker response
where you can set a worker-only policy. The page must therefore allow dynamic
JavaScript evaluation, the workers, and WebAssembly:

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' blob: 'unsafe-eval' 'wasm-unsafe-eval';
  worker-src 'self' blob:;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  connect-src 'self';
```

`'unsafe-eval'` is required for Knockout in the combined build. Use the ESM
modules with same-origin workers when your application must use a stricter
policy.

### Cross-origin Cesium assets or workers

When `CESIUM_BASE_URL` is cross-origin, CesiumJS cannot create a worker directly
from that URL. It creates a small `blob:` module worker that imports the
cross-origin worker module instead. The blob worker inherits the policy of the
page that created it.

`worker-src` must allow the page to create the `blob:` worker and must include
the cross-origin Cesium asset origin. The imported cross-origin worker module is
then loaded under the inherited worker policy, so its host must also be allowed
by `script-src`. The worker's WebAssembly binary and other network requests must
be allowed by `connect-src`.

For example, if CesiumJS and its WebAssembly files are served from
`https://cdn.example.com`, the page policy needs the CDN in all of the relevant
places:

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.example.com 'wasm-unsafe-eval';
  worker-src 'self' blob: https://cdn.example.com;
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://cdn.example.com;
```

Replace `https://cdn.example.com` with the actual `CESIUM_BASE_URL` origin. If
the worker modules and WebAssembly files use different origins, allow each
origin in the directive that needs it. A CSP header on the original
cross-origin worker response cannot make the page policy stricter.

To use the stricter worker-only setup, serve the page and the CesiumJS assets
from the same scheme, host, and port.

## Add the servers your application uses

The policy cannot know which imagery, terrain, or tileset servers your
application will use. Add those servers to the appropriate directives.

For example, an application using Cesium ion might need:

```http
connect-src 'self' https://api.cesium.com;
img-src 'self' data: blob: https://assets.ion.cesium.com;
```

Use the actual hosts in your application. There is no universal CesiumJS value
for these directives.

`connect-src` covers requests made with `fetch`, XHR, WebSockets, and similar
APIs. `img-src` covers image resources. Workers also make network requests, so
their policy must allow the resources they load. In the worker example above,
`default-src 'self'` allows same-origin `.wasm` files.

## What the policy settings mean

| Setting              | In plain English                                                    |
| -------------------- | ------------------------------------------------------------------- |
| `default-src`        | The fallback rule for resource types without their own rule.        |
| `script-src`         | Which scripts may load and whether code may be created dynamically. |
| `worker-src`         | Which URLs may be used to create Web Workers.                       |
| `style-src`          | Which styles may load and whether inline styles are allowed.        |
| `img-src`            | Which image URLs may load, including imagery and texture data.      |
| `connect-src`        | Which servers the page or workers may contact.                      |
| `'wasm-unsafe-eval'` | Allows WebAssembly compilation and instantiation only.              |

CesiumJS uses Web Workers to decode terrain, Draco geometry, KTX2 textures,
glTF buffers, and other content. Several decoders use WebAssembly. Since
CesiumJS 1.146, CesiumJS compiles that WebAssembly in workers when the workers
are separate, same-origin resources.

Prefer `'wasm-unsafe-eval'` when WebAssembly is the only exception you need.
Do not replace it with `'unsafe-eval'`: that broader permission also allows
`eval` and `new Function`. The bundled Basis and SPZ decoders require that
broader permission. See the replacement hooks below for strict policies.

## Keep WebAssembly permission out of the page

The page and each Web Worker are separate execution contexts. Each response can
therefore have its own CSP:

```http
# Your application document
Content-Security-Policy: default-src 'self'; script-src 'self'; worker-src 'self'

# Responses for Cesium worker files
Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'
```

These headers allow the worker to compile WebAssembly while the page cannot:

| Operation                                         | Application page | Same-origin worker |
| ------------------------------------------------- | ---------------- | ------------------ |
| Compile and instantiate WebAssembly               | Blocked          | Allowed            |
| Generate JavaScript with `eval` or `new Function` | Blocked          | Blocked            |

The worker can decode content with WebAssembly without permission to generate
JavaScript at runtime. Basis and SPZ replacements must respect both restrictions.

A nonce or hash does not provide this separation. Nonces
and hashes control which scripts may load; they do not change whether an
execution context may use `eval` or WebAssembly.

### Set the worker response header

Add the relaxed header only to responses for the Cesium worker directory.

Express:

```javascript
app.use("/cesium/Workers", (req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'",
  );
  next();
});
```

nginx:

```nginx
location /cesium/Workers/ {
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'";
}
```

If you make the worker policy more restrictive than the example, make sure it
still permits the worker to load its `.wasm` files and reach `CESIUM_BASE_URL`.

### Electron and custom protocols

Use one custom-protocol origin for both the renderer and the CesiumJS assets.
Do not use `file:` if you want worker-only policies.

```text
app://renderer/index.html
app://renderer/cesium/Workers/decodeDraco.js
```

Add the worker header to responses for paths under `Workers/`, just as you
would for a web server. The protocol, host, and port must identify the same
origin. For example, `app://renderer/` and `app://cesium/` are different
origins even though they use the same scheme.

## Advanced cases

### KTX2 textures

The bundled Basis Universal wrapper uses runtime JavaScript generation.
For workers without `'unsafe-eval'`, supply a compatible wrapper built with
`-s DYNAMIC_EXECUTION=0` and its matching Wasm binary. Use
`-s EXPORT_ES6=1` to generate the ES module export required by the hook.

Set both URLs before the first KTX2 load:

```javascript
Cesium.KTX2Transcoder.basisTranscoderOptions = {
  modulePath: "/decoders/basis_transcoder.js",
  wasmBinaryFile: "/decoders/basis_transcoder.wasm",
};
```

Relative URLs resolve against the document URL. Cesium copies the options and
rejects changes after the first KTX2 load. Omit this configuration to use the
bundled assets.

The wrapper must be an ECMAScript module with a default factory export.
The factory accepts an Emscripten configuration with `wasmBinary` and returns
the Basis module, or a promise for that module. A compatible module provides
`initializeBasis`, `KTX2File`, and `transcoder_texture_format` with the APIs
used by Cesium's bundled Basis version. Applications own the build and must
test both ETC1S and UASTC textures with their chosen target formats.

Cesium keeps its KTX2 worker. That worker imports the wrapper, fetches the
binary, and compiles WebAssembly. Its `script-src` must permit the wrapper,
and its `connect-src` must permit the binary. Cross-origin assets also need
CORS headers. The combined build still uses blob workers with the page's policy.

#### Build a compatible Basis wrapper

One tested configuration uses Basis Universal `v1_15_update2`, Emscripten
`3.1.74`, and CMake `3.31.10`. The Basis source commit is
`77b7df8e5df3532a42ef3c76de0c14cc005d0f65`.

With that Emscripten SDK active and CMake on your path, run:

```sh
git clone --depth 1 --branch v1_15_update2 \
  https://github.com/BinomialLLC/basis_universal.git
emcmake cmake -S basis_universal/webgl/transcoder -B basis-build \
  -DCMAKE_EXE_LINKER_FLAGS="-s DYNAMIC_EXECUTION=0 -s EXPORT_ES6=1"
cmake --build basis-build --parallel 4
```

This source enables KTX2 and Zstandard by default. Keep both enabled to decode
ETC1S and Zstandard-compressed UASTC textures. Deploy `basis_transcoder.js` and
`basis_transcoder.wasm` from the same build, then configure their URLs above.

In Chromium, this build transcoded ETC1S and UASTC textures to ETC2, ETC1,
S3TC, PVRTC, ASTC, and BC7 under the worker policy above. All 12 outputs matched
the bundled transcoder byte-for-byte. Separate checks confirmed that the worker
blocked `new Function` and the page blocked WebAssembly compilation.

This is an application build example. Cesium does not distribute or maintain
these custom binaries. Test your application's textures and target browsers
before deployment.

### SPZ-compressed Gaussian splats

The bundled `@spz-loader/core` decoder currently uses `new Function`. Do not
add `'unsafe-eval'` to the worker policy to run it.

Applications that do not load SPZ content do not load this decoder and are not
affected.

The combined build embeds the decoder in a blob worker, so it inherits the page
policy. If you need SPZ under a strict policy, use a strict SPZ worker build
instead of the bundled decoder.

#### Replacing the SPZ decoder

Build or otherwise provide an SPZ worker that does not use dynamic evaluation,
then configure it with the experimental `SpzDecoder.workerModuleUrl` property
before any SPZ decode starts:

```javascript
import { SpzDecoder } from "@cesium/engine";

SpzDecoder.workerModuleUrl = new URL(
  "/cesium/Workers/decodeSpzStrict.js",
  window.location.href,
).href;
```

The replacement must be an ECMAScript worker module compatible with
`createTaskProcessorWorker`. It receives an object whose `spzData` property is a
`Uint8Array`, returns the gcloud object expected by CesiumJS, and transfers the
backing buffers of the typed-array attributes (`positions`, `scales`,
`rotations`, `alphas`, `colors`, and `sh`).

Serve the replacement from the same scheme, host, and port as the page. A
cross-origin `workerModuleUrl` uses a blob-worker fallback and inherits the page
policy. The replacement must actually avoid `eval` and `new Function`; changing
the URL alone does not turn the bundled decoder into a strict decoder.

For example, a replacement that compiles WebAssembly but does not use dynamic
evaluation can use:

```http
# Application document
Content-Security-Policy: default-src 'self'; script-src 'self'; worker-src 'self'

# Response for /cesium/Workers/decodeSpzStrict.js
Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'
```

## Verify the policy

Browsers report CSP violations in the developer console. You can also listen
for violations in the application document:

```javascript
document.addEventListener("securitypolicyviolation", (event) => {
  console.warn(event.violatedDirective, event.blockedURI);
});
```

This listener only reports violations associated with the document's CSP.
Worker violations fire on the worker's own `WorkerGlobalScope`, not on the
parent document. Browser developer tools report both document and worker
violations.

Test the content your application actually uses. Decoders load lazily, so a
policy problem may not appear until you load a Draco-compressed tileset, KTX2
texture, terrain, SPZ content, or another feature that starts a worker. If you
use `CesiumWidget`, test it as well because it creates inline styles.

When a feature fails, check the violated directive:

- `worker-src`: the worker URL or `blob:` workers are not allowed.
- `script-src`: the page or worker needs `'wasm-unsafe-eval'`. If a Basis or
  SPZ decoder reports an `unsafe-eval` violation, use the replacement hooks
  above with a compatible decoder built without runtime JavaScript generation.
- `connect-src` or `img-src`: the data server is missing from the policy.
