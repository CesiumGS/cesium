# Content Security Policy Guide

Content Security Policy (CSP) is a browser security feature that limits where an
application can load and run code, images, and network requests. More generally,
CSP restricts which sources and browser capabilities the application may use.

CesiumJS makes CSP worth thinking about because a CesiumJS application does more
than load one JavaScript file. It creates Web Workers to decode terrain, Draco
geometry, KTX2 textures, glTF buffers, and other content. Some of those decoders
use [WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly) (wasm),
and CesiumJS also fetches imagery, terrain, and tileset data
from the servers your application chooses. A policy that is too strict can
block those features; a policy that is too broad gives up some of CSP's
protection.

For a general explanation of CSP, see
[MDN's Content Security Policy documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy).

This guide explains how to choose a policy that lets CesiumJS work while
keeping the policy as narrow as practical. It is about how you serve your
application. CesiumJS does not set the policy for you.

This guide focuses on `@cesium/engine`, not `@cesium/widgets`. (`@cesium/widgets`
has its own CSP requirements and it is outside the scope of this guide.)

## What CesiumJS needs from CSP

### The main Cesium-specific issue: WebAssembly

The main CSP issue specific to CesiumJS is WebAssembly. Several CesiumJS
decoders use WebAssembly, and browsers treat WebAssembly compilation as an
eval-like operation for CSP purposes. If the policy does not allow WebAssembly
in the execution context where the decoder runs, that feature will fail.

In the best-case setup, CesiumJS compiles WebAssembly inside separate,
same-origin workers. You can then grant `'wasm-unsafe-eval'` to the worker
responses without granting it to every script in the page.

Why is this preferred? Read on.

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

Configure your bundler to serve CesiumJS's worker files as separate static
assets. Set
`CESIUM_BASE_URL` to the URL where those files are served, for example:

```text
/cesium/Workers/decodeDraco.js
```

The page can use a strict policy, while the worker responses have a small
exception for WebAssembly:

```http
# The application document
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  worker-src 'self';
  style-src 'self';
  img-src 'self' data: blob:;
  connect-src 'self';

# Responses for files under /cesium/Workers/
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
```

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
  style-src 'self';
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

`worker-src` allows the page to create the `blob:` worker. The imported
cross-origin worker module is then loaded under the inherited worker policy, so
its host must also be allowed by `script-src`. The worker's WebAssembly binary
and other network requests must be allowed by `connect-src`.

For example, if CesiumJS and its WebAssembly files are served from
`https://cdn.example.com`, the page policy needs the CDN in all of the relevant
places:

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.example.com 'wasm-unsafe-eval';
  worker-src 'self' blob:;
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
| `style-src`          | Which styles may load.                                              |
| `img-src`            | Which image URLs may load, including imagery and texture data.      |
| `connect-src`        | Which servers the page or workers may contact.                      |
| `'wasm-unsafe-eval'` | Allows WebAssembly compilation and instantiation only.              |

CesiumJS uses Web Workers to decode terrain, Draco geometry, KTX2 textures,
glTF buffers, and other content. Several decoders use WebAssembly. Since
CesiumJS 1.145, CesiumJS compiles that WebAssembly in workers when the workers
are separate, same-origin resources.

Prefer `'wasm-unsafe-eval'` when WebAssembly is the only exception you need.
Do not replace it with `'unsafe-eval'`: that broader permission also allows
`eval` and `new Function`, and is not needed by the engine's normal decoders.

## Keep WebAssembly permission out of the page

The page and each Web Worker are separate execution contexts. Each response can
therefore have its own CSP:

```http
# Your application document
Content-Security-Policy: default-src 'self'; script-src 'self'; worker-src 'self'

# Responses for Cesium worker files
Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'
```

This grants WebAssembly to Cesium's workers without granting it to every script
running in the page. A nonce or hash does not provide this separation. Nonces
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
texture, terrain, SPZ content, or another feature that starts a worker.

When a feature fails, check the violated directive:

- `worker-src`: the worker URL or `blob:` workers are not allowed.
- `script-src`: the page or worker needs `'wasm-unsafe-eval'`. If an SPZ
  decoder reports an `unsafe-eval` violation, use a strict SPZ worker build
  instead of adding that permission.
- `connect-src` or `img-src`: the data server is missing from the policy.
