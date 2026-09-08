# Basis Universal overrides

Cesium uses the bundled Basis Universal wrapper and Wasm binary by default.
The wrapper uses runtime JavaScript generation and requires `'unsafe-eval'`
in the worker's Content Security Policy.

Applications can supply a compatible wrapper and matching Wasm binary through
`KTX2Transcoder.basisTranscoderOptions`. Cesium keeps its KTX2 worker and
transcoding logic. See the [Content Security Policy Guide](../../../../../Documentation/ContentSecurityPolicyGuide/README.md#ktx2-textures)
for the configuration and wrapper contract.

Cesium does not maintain a custom Basis build. Applications own the build,
version, and deployment of their replacement assets.
