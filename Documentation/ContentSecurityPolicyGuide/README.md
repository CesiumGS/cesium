# Content Security Policy Guide

[Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy)
(CSP) lets an application restrict what code the browser will run. This guide covers what
CesiumJS needs in order to work under a policy, and how to keep that policy as narrow as
possible.

Everything here is about how you serve your application. CesiumJS does not set any policy
itself.

The worker-scoped policy described below applies when you use the ESM/bundler distribution
or otherwise serve Cesium's worker files as separate, same-origin resources. It does not
apply unchanged to the combined `Build/Cesium/Cesium.js` distribution, which embeds the
worker code and creates `blob:` workers.

## What CesiumJS requires

Two things drive most of the configuration:

**Web Workers.** CesiumJS decodes terrain, Draco geometry, KTX2 textures, glTF buffers,
and other content in Web Workers. Your policy needs to allow them, and it needs to allow
them from wherever `CESIUM_BASE_URL` points.

**WebAssembly.** Several of those decoders are WebAssembly modules. Compiling WebAssembly
requires either `'wasm-unsafe-eval'` or `'unsafe-eval'`. As of CesiumJS 1.144, all
WebAssembly compilation happens inside workers. With separately served, same-origin
workers, this permission does not have to be granted to your page — see
[Scoping WebAssembly to workers](#scoping-webassembly-to-workers).

### Choose a distribution

When using a module bundler such as Vite, Webpack, Rollup, or Parcel, import CesiumJS from
the `cesium` package:

```javascript
import { Viewer } from "cesium";
```

The package's ESM entry point lets your bundler process CesiumJS modules while the worker
files remain separate assets that your application serves. Configure `CESIUM_BASE_URL` so
that those assets are available under a same-origin URL, such as
`/cesium/Workers/decodeDraco.js`.

The combined `Build/Cesium/Cesium.js` distribution is different. It embeds the worker
code and starts workers from `blob:` URLs, so there is no worker response on which to set
a separate CSP. If you use that distribution, the document itself must allow the blob
workers and WebAssembly, for example:

```http
Content-Security-Policy:
  script-src 'self' blob: 'wasm-unsafe-eval';
  worker-src 'self' blob:;
```

The combined build also includes the widgets, which require `'unsafe-eval'` as described
in [Known exceptions](#known-exceptions).

## A starting policy

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  worker-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  connect-src 'self';
```

You will need to widen `connect-src` and `img-src` to cover the servers your imagery,
terrain, and tileset data actually come from — for example `https://api.cesium.com` and
`https://assets.ion.cesium.com` if you use Cesium ion. Those hosts are specific to your
application, so there is no universal value.

`style-src 'unsafe-inline'` is needed if you use the CesiumJS widgets, which apply inline
styles. It is not needed for `@cesium/engine` on its own.

This policy contains no `'unsafe-eval'`. See the exceptions below for the cases that still
need it.

## Scoping WebAssembly to workers

CSP distinguishes two eval-related tokens, and the difference matters:

| Token                | Permits                                        |
| -------------------- | ---------------------------------------------- |
| `'wasm-unsafe-eval'` | WebAssembly compilation and instantiation only |
| `'unsafe-eval'`      | `eval`, `new Function`, **and** WebAssembly    |

`'unsafe-eval'` is a much broader grant. If you only need WebAssembly, prefer
`'wasm-unsafe-eval'`.

Better still, you can avoid granting either one to your page.

### Why this is possible: eval permission is per-realm

It is worth being precise about what these tokens do, because it determines what you can
and cannot scope.

Most `script-src` source expressions — hosts, nonces, hashes — control **which scripts are
allowed to load**. `'unsafe-eval'` and `'wasm-unsafe-eval'` are different in kind: they are
capabilities of the **execution context**. Once a document has `'unsafe-eval'`, every script
running in that document can call `eval` and `new Function`. There is no way to grant it to
one script and withhold it from the rest, and adding a nonce does not change that — a nonce
authorizes loading, never evaluation.

So the unit you can scope is not the script, it is the realm. A document is one realm. Each
Web Worker is another, with its own policy. Each iframe is another.

That is what makes the arrangement below work. A policy is delivered per-response, and a
worker script served with its own `Content-Security-Policy` header runs under that policy
instead of the document's. Because the worker is a separate realm, granting it WebAssembly
does not grant WebAssembly to your page:

```http
# your application document
Content-Security-Policy: default-src 'self'; script-src 'self'; worker-src 'self'

# responses for files under Workers/
Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'
```

### Setting the worker header

Match the request path for the CesiumJS worker directory and add the header to those
responses only.

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

Note that `default-src 'self'` in the worker policy also governs the worker's own network
requests, which it uses to load `.wasm` files. If you narrow that directive, make sure
`connect-src` still permits the worker to reach `CESIUM_BASE_URL`.

### This requires same-origin workers

Per-response worker policies only work if the worker is a real same-origin script.

When `CESIUM_BASE_URL` is cross-origin, CesiumJS cannot construct a worker from that URL
directly, so it wraps it in a small `blob:` worker instead. The combined
`Build/Cesium/Cesium.js` distribution uses the same `blob:` fallback because its workers
are embedded. A `blob:` worker **inherits the policy of the document that created it**.
A header on the original worker response cannot give it a separate policy, so the document
itself would then need the WebAssembly permission — which defeats the arrangement.

To keep WebAssembly out of your document, serve your application and the CesiumJS assets
from the same scheme, host, and port. If you must load CesiumJS cross-origin, you will need
`worker-src 'self' blob:` and `script-src 'wasm-unsafe-eval'` on the document.

## Electron and custom protocols

Serve the renderer and the CesiumJS assets from the same custom-protocol origin rather than
`file:`, then attach the worker policy to that protocol's worker responses. This is the
same arrangement as the ESM/bundler case: the worker files must be separate resources, and
the protocol handler should add the relaxed policy only for paths under `Workers/`.

```text
app://renderer/index.html
app://renderer/cesium/Workers/decodeDraco.js
```

Watch out for a subtlety: `app://renderer/` and `app://cesium/` are **different origins**
despite sharing a scheme, and will trigger the `blob:` worker fallback described above.

When adding response headers, target the specific protocol and path rather than every
response your application handles.

## Known exceptions

Some paths still require `'unsafe-eval'`.

**Widgets.** `@cesium/widgets` includes Knockout, which compiles binding expressions with
`new Function`. Any build that includes the widgets — including the combined `Cesium.js` —
therefore needs `'unsafe-eval'` in `script-src`. `@cesium/engine` on its own does not.

Knockout runs in the document, so this grant cannot be narrowed the way the worker
permissions can: as described [above](#why-this-is-possible-eval-permission-is-per-realm),
`'unsafe-eval'` is a property of the realm, and a nonce or hash on the Knockout script
authorizes it to load without authorizing evaluation. Isolating the widgets in an iframe
with its own policy would scope it, but that is rarely practical. If your application runs
under a strict policy and does not need the widgets, using `@cesium/engine` directly avoids
the requirement entirely.

If you do grant `'unsafe-eval'`, you can still narrow the loading half with a nonce:

```http
script-src 'nonce-{random}' 'unsafe-eval'
```

Note that adding a nonce or hash to a directive causes `'unsafe-inline'` to be ignored in
that same directive. If you apply a nonce to `style-src`, the `'unsafe-inline'` the widgets
rely on stops taking effect and their inline styles will be blocked.

**SPZ-compressed Gaussian splats.** The `@spz-loader/core` dependency is generated by
Emscripten's `embind` in a configuration that emits `new Function`, so the `decodeSpz`
worker requires `'unsafe-eval'` on its response until an upstream build without it is
published — see [drumath2237/spz-loader#91](https://github.com/drumath2237/spz-loader/issues/91).
Applications that do not load SPZ content are unaffected, since the decoder is only
loaded when such content appears.

For separately served, same-origin workers, grant the exception to that one worker response
rather than to the document:

```http
# response for Workers/decodeSpz.js only
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval'
```

The combined `Build/Cesium/Cesium.js` distribution embeds `decodeSpz` in a `blob:` worker,
so that worker inherits the document policy. If you use the bundled SPZ decoder with the
combined build, the document must allow both `blob:` workers and `'unsafe-eval'` (the
widgets in that build independently require `'unsafe-eval'`).

### Replacing the SPZ decoder under a strict policy

`SpzDecoder.workerModuleUrl` is an experimental escape hatch for applications that provide
their own SPZ decoder without dynamic evaluation. Configure it once, before any SPZ decode
is started (including one initiated by loading a glTF with SPZ compression):

```javascript
import { SpzDecoder } from "cesium";

SpzDecoder.workerModuleUrl = new URL(
  "/cesium/Workers/decodeSpzStrict.js",
  window.location.href,
).href;
```

The configured module replaces Cesium's bundled `Workers/decodeSpz.js` decoder for the
page. It must be an ECMAScript worker module compatible with `createTaskProcessorWorker`:
it receives an object whose `spzData` property is a `Uint8Array`, returns the gcloud object
expected by Cesium, and transfers the backing buffers of the object's typed-array
attributes (`positions`, `scales`, `rotations`, `alphas`, `colors`, and `sh`). Bundle or
otherwise resolve the module's imports before serving it.

To keep the policy isolated from the document, serve that module as a separate resource
from the same scheme, host, and port as the page. A cross-origin `workerModuleUrl` uses
TaskProcessor's `blob:` worker fallback and inherits the document policy, so a CSP header
on the custom worker response cannot make the document strict. For example, a replacement
worker that compiles WebAssembly but does not use dynamic evaluation can use:

```http
# application document
Content-Security-Policy: default-src 'self'; script-src 'self'; worker-src 'self'

# response for /cesium/Workers/decodeSpzStrict.js
Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'
```

The custom worker must actually avoid `eval` and `new Function`; otherwise it still needs
`'unsafe-eval'`. Configuring a replacement does not change the bundled `decodeSpz` worker,
which retains the `'unsafe-eval'` requirement described above.

**KMZ.** `@zip.js/zip.js` includes a WebAssembly inflate path that can run outside a
worker if the browser lacks `CompressionStream` or if compression streams are disabled. It
is not used in normal operation on current browsers.

## Verifying your policy

Browsers report violations to the console, and to a `securitypolicyviolation` event you can
listen for:

```javascript
document.addEventListener("securitypolicyviolation", (event) => {
  console.warn(event.violatedDirective, event.blockedURI);
});
```

Test with content that exercises the decoders you actually use — a Draco-compressed
tileset, KTX2 textures, terrain — since each one loads its worker lazily and a policy
problem will not appear until that content is loaded.
