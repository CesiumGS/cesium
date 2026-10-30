# CesiumJS 1.x globe imagery: parity spec

Reference for porting default globe imagery (ion asset 2, Bing Aerial).
Derived from the 1.x source in this repository; paths are relative to
`packages/engine/Source` (`Scene/` unless noted). Companion to
`globe-legacy1x-spec.md`.

## 1. ion asset 2 → Bing provider

**Default layer.** CesiumWidget.js:377 `ImageryLayer.fromWorldImagery()` →
createWorldImageryAsync.js:34-38 → `IonImageryProvider.fromAssetId(2)`
(IonWorldImageryStyle.js:17). `fromProviderAsync` constructs the layer with
an undefined provider (ImageryLayer.js:537-547), so every layer property is
`ImageryLayer.DEFAULT_*`; provider `_default*` values are never read.

**ion endpoint** (Core/IonResource.js:223-270, IonImageryProvider.js:215-281):
`GET https://api.cesium.com/v1/assets/2/endpoint?access_token=<token>`,
headers `X-Cesium-Client: CesiumJS` (+ `X-Cesium-Client-Version`). Cached by
`assetId + accessToken + server` (:230-235). Uses: `type` must be
`"IMAGERY"` (:238-242); `externalType: "BING"` →
`BingMapsImageryProvider.fromUrl(options.url, options)`
(IonImageryProviderFactory.js:46-48), so the whole `options` object (key,
mapStyle, culture, mapLayer, tileProtocol, if present) configures Bing;
`attributions[]` → per-tile credits (:273-276). The actual option values
for asset 2 are **not in this repo**: record the live response. Bing
requests are plain `Resource`s (no ion auth).

**Bing metadata** (BingMapsImageryProvider.js:475-529):

```text
tileProtocol = options.tileProtocol (trailing ':' stripped)
               ?? (document.location.protocol == "http:" ? "http" : "https")
GET <url>/REST/v1/Imagery/Metadata/<mapStyle ?? "Aerial">
    ?incl=ImageryProviders&key=<key>&uriScheme=<tileProtocol>
    [&mapLayer=..] [&culture=..]          // only when defined in options
```

Cached by full URL (:157-175). From `resourceSets[0].resources[0]`
(:112-135; exactly one resourceSet required): `imageWidth/imageHeight` →
tile size; `zoomMax - 1` → maximumLevel; `imageUrl` → template;
`imageUrlSubdomains`; `imageryProviders` with a `bbox` → attributions.
`zoomMin` is ignored; minimumLevel is always 0 (:371-375). Test fixture
(engine/Specs/createFakeBingMapsMetadataResponse.js:25-64): 256×256,
`http://ecn.{subdomain}.tiles.virtualearth.net.fake.invalid/tiles/a{quadkey}.jpeg?g=3031&mkt={culture}`,
subdomains t0-t3, zoomMax 21.

**Tiling** (:238-242): WebMercator, 2×2 level-0 tiles, lon [-π, π], lat
±MaxLat = 2·atan(e^π) − π/2 = 1.4844222297453324 rad = 85.0511287798°
(core WebMercatorProjection.js:148-149). Cesium level L = Bing zoom L+1.

**Tile URL** (:567-591, :703-723):

```text
quadkey(x,y,L): for i = L..0: digit = ((x>>i)&1) | (((y>>i)&1)<<1)    // L+1 digits
subdomain = imageUrlSubdomains[(x + y + L) % imageUrlSubdomains.length]
url = imageUrl{quadkey, subdomain, culture = options.culture ?? ""} + "n=z"
```

**Empty tiles.** `n=z` makes Bing return a zero-length body instead of a
placeholder (:718-720). Images are fetched as blobs (discard policy present:
ImageryProvider.js:238-263, `preferBlob`, `preferImageBitmap`, `flipY`);
decoding an empty blob fails and Resource attaches `error.blob`
(Core/Resource.js:984-997); `blob.size === 0` → `EMPTY_IMAGE`
(BingMapsImageryProvider.js:579-587), a 1×1 transparent PNG singleton
(DiscardEmptyTileImagePolicy.js:42-52). `_createTexture` discards it by
identity (:29-31) → state INVALID (ImageryLayer.js:1237-1253) → ancestor
used (§4). Other errors → FAILED, no retry unless an errorEvent listener
sets `retry` (:1122-1149). `X-VE-Tile-Info` header handling: **not found**.

## 2. Credits

- Per provider, each frame per ready, shown layer
  (GlobeSurfaceTileProvider.js:1523-1531): `IonImageryProvider.credit` = the
  Bing credit (IonImageryProvider.js:165-169): `<a
href="https://www.microsoft.com/en-us/maps/bing-maps/product"><img
src="…/Assets/Images/bing_maps_credit.png" title="Bing Imagery"/></a>`
  (BingMapsImageryProvider.js:234-236, :684-700); `showOnScreen` defaults
  false (Core/Credit.js:41) → lightbox.
- Per tile: `imagery.credits = getTileCredits(x, y, L)` set when requested
  (ImageryLayer.js:1173-1179); added for every drawn readyImagery (own or
  ancestor) (GlobeSurfaceTileProvider.js:3167-3176). For ion = endpoint
  credits ++ Bing area credits (IonImageryProvider.js:292-299):
  - ion `attributions[i]` → `Credit(html, showOnScreen = collapsible
defined && !collapsible)` (Core/Credit.js:147-153); html containing
    `ion-credit.png` becomes the built-in ion logo (CreditDisplay.js:474-482).
  - default access token → bold warning credit, on screen (Core/Ion.js:39-55,
    IonResource.js:160-169).
  - Bing: an `imageryProviders` entry is included if any coverage area has
    `zoomMin <= L+1 <= zoomMax` and its `bbox` (`[S, W, N, E]` degrees,
    :101-107) intersects the tile rectangle → `Credit(attribution)`,
    lightbox (:727-767).

## 3. Which imagery tiles a terrain tile uses

Created once per terrain tile at init for each shown layer
(GlobeSurfaceTile.js:689-696), `_createTileImagerySkeletons`
(ImageryLayer.js:688-1050):

```text
if !layer.ready: insert placeholder; return                           // :714-721
useWebMercatorT = WebMercator provider && tile.north < MaxLat && tile.south > -MaxLat
bounds = provider.rectangle ∩ layer.rectangle (MAX_VALUE)
rect = tile.rectangle ∩ bounds; if none: base layer only, collapse onto bounds edge
latClosest = rect.south > 0 ? rect.south : rect.north < 0 ? rect.north : 0
target = 1.0 /*errorRatio*/ * terrain.getLevelMaximumGeometricError(tile.level)
L_img = min(max(0, texelLevel(target, latClosest)), maximumLevel), then >= minimumLevel
texelLevel (:1684-1708):
  s0 = maximumRadius * scheme.rectangle.width * (Geographic ? 1 : cos(latClosest))
       / (tileWidth * numberOfXTilesAtLevel(0))           // Bing: 78271.51696 * cos
  return Math.round(log2(s0 / target)) | 0                 // .5 rounds up
```

Cesium World Terrain (77067.33978 m / 2^L, heightmap 65): ratio = 130/128,
`L_img = L + round(log2(1.015625·cos φ))` → L up to |φ| 45.875°, L−1 to
69.628°, L−2 to 79.976°, L−3 to 85.007°. EllipsoidTerrainProvider (64):
ratio 1, breaks at 45°, 69.295°, 79.818°.

Range (:822-877): `NW/SE = positionToTileXY(northwest/southeast(rect))`
(truncation, clamped to last tile; WebMercatorTilingScheme.js:252-291).
Slivers, `vcX = tile.width/512`, `vcY = tile.height/512` (radians): `++NW.y`
if |NWtile.south − tile.north| < vcY; `++NW.x` if |NWtile.east − tile.west|
< vcX; `--SE.y` if |SEtile.north − tile.south| < vcY; `--SE.x` if
|SEtile.west − tile.east| < vcX; each only while NW < SE on that axis.

Texture rectangles (:882-1047). With useWebMercatorT, T (terrain), imagery
rectangles and bounds are converted to Mercator meters and vcX/vcY recomputed
from T (:898-918). The default layer is the base layer
(ImageryLayerCollection.js:796-810), so outer edges are forced to 0/1:

```text
maxU = 0 (non-base: clipped west offset)
for i = NW.x..SE.x:                                  // west → east
  minU = maxU; c = rect(i, NW.y) ∩ bounds
  maxU = (i == SE.x && (base || |c.east - T.east| < vcX)) ? 1 : min(1, (c.east - T.west)/T.width)
  minV = 1 (non-base: clipped north offset)
  for j = NW.y..SE.y:                                // north → south
    maxV = minV; c = rect(i, j) ∩ bounds
    minV = (j == SE.y && (base || |c.south - T.south| < vcY)) ? 0 : max(0, (c.south - T.south)/T.height)
    push TileImagery(imagery(i, j, L_img), (minU, minV, maxU, maxV), useWebMercatorT)
```

Translation/scale (:1063-1095) uses the imagery actually drawn (own or
ancestor), in Mercator meters if useWebMercatorT:
`scale = T.size / I.size`, `translation = scale · (T.sw − I.sw) / T.size`,
`imageryUV = tileUV · scale + translation` (tileUV.v = webMercatorT when
set). Images are decoded flipped, so v = 0 is the image's south edge.

## 4. Loading and fallback

States (ImageryState.js): UNLOADED 0, TRANSITIONING 1, RECEIVED 2,
TEXTURE_LOADED 3, READY 4, FAILED 5, INVALID 6, PLACEHOLDER 7. An `Imagery`
creates/refs its parent chain to level 0 (Imagery.js:17-26). Per imagery
(:87-118): UNLOADED → request → RECEIVED → `_createTexture` (discard) →
TEXTURE_LOADED → `_reprojectTexture` → READY; READY without a geographic
texture is re-run when a tile needs geographic. Requests: `throttle: false,
throttleByServer: true, IMAGERY`; no promise → UNLOADED, retried
(ImageryLayer.js:1151-1171).

TileImagery (TileImagery.js:46-125):

```text
loading.processStateMachine(needGeographic = !useWebMercatorT)
if loading READY: ready = loading; recompute translation/scale; return DONE
a = loading.parent
while a && (a.state != READY || (!useWebMercatorT && !a.texture)):
  if a.state not FAILED/INVALID: closestLoading ??= a
  a = a.parent
ready = a                      // nearest usable ancestor (or none); recompute T/S on change
if loading FAILED/INVALID: if closestLoading: push it one step, NOT DONE; else DONE
return NOT DONE
```

Only FAILED/INVALID tiles push unattached ancestors; otherwise an ancestor
is READY only if a coarser terrain tile attached it. Imagery clamped at
maximumLevel is magnified on deeper terrain tiles.

Tile (GlobeSurfaceTile.js:286-395, GlobeSurfaceTileProvider.js:684-739):
imagery is skipped for `terrainOnly` loads (borrowed bounding volume or
CULLED_BUT_NEEDED), and `renderable` is not updated then. Placeholders
become real skeletons once the layer is ready (:353-367); until then
they are neither done nor loaded, so **nothing is renderable until the ion
endpoint and Bing metadata resolve**. `renderable = vertexArray &&
(any TileImagery done or with readyImagery || all done)` and stays true once
set; TileImagerys without readyImagery are not drawn (base color shows).
DONE needs terrain READY and all TileImagery done (:307-320).
`upsampledFromParent` survives only if every TileImagery is FAILED/INVALID.
canRenderWithoutLosingDetail (GlobeSurfaceTileProvider.js:936-1048): a layer
is ready on a tile iff all its TileImagerys lack loadingImagery or are
FAILED/INVALID; blocked if a last-frame RENDERED descendant has a ready
layer this tile lacks. Fill tiles use `skipLoading = true`
(TerrainFillMesh.js:1307-1312).

## 5. Reprojection, filtering, mipmaps

- Upload (ImageryLayer.js:1193-1221): sampler LINEAR/LINEAR; RGB if
  `!hasAlphaChannel` (Bing: `defined(mapLayer)` → Aerial is RGB, alpha 1),
  else RGBA; 8-bit, not sRGB. Stored as `textureWebMercator` (:1269-1275).
- `_reprojectTexture` (:1365-1417): reproject iff needGeographic
  (!useWebMercatorT: terrain tile reaches |lat| ≥ 85.0511°) and
  `rect.width / texture.width > 1e-5` rad (Bing 256 px: level ≤ 10); else the
  Mercator texture is used directly as `imagery.texture`.
- `reprojectToGeographic` (:1492-1673): output same size/format; a 2×64 grid,
  row j at `lat = lerp(S, N, j/63)` with CPU float32 `t = (mercY(lat) −
mercY(S)) / (mercY(N) − mercY(S))`, `mercY = 0.5·ln((1+sin)/(1−sin))`;
  source sampled LINEAR, CLAMP, no mips (ReprojectWebMercatorFS.glsl).
  Executes as a ComputeCommand next frame → READY one frame later.
- Normal path: terrain vertices carry `webMercatorT = (mercAngle(lat) −
mercAngle(S)) / (mercAngle(N) − mercAngle(S))` of the terrain tile
  (Workers/createVerticesFromQuantizedTerrainMesh.js:65-74, :139-145);
  GlobeVS emits `v_textureCoordinates = (u, v, webMercatorT)`
  (GlobeVS.glsl:133-136, :195); FS uses `.xz` when
  `u_dayTextureUseWebMercatorT` (GlobeSurfaceShaderSet.js:445). Linear per
  triangle.
- Mipmaps (`_finalizeReprojectTexture` :1288-1353, on the texture actually
  used): min & mag LINEAR, uncompressed, power-of-two → `generateMipmap(NICEST)`,
  `LINEAR_MIPMAP_LINEAR`/LINEAR, CLAMP_TO_EDGE, anisotropy =
  min(MAX_TEXTURE_MAX_ANISOTROPY_EXT, layer.maximumAnisotropy ?? that max)
  (1.0 without the extension, Renderer/Context.js:208-212). Otherwise no
  mips, CLAMP. Bing 256² → mipmapped at max anisotropy.

## 6. Shading (GlobeFS, defaults, no lighting)

- Draw (GlobeSurfaceTileProvider.js:2797-3352): TileImagerys with
  readyImagery and alpha ≠ 0 in list order (x west→east, y north→south), up
  to `maximumTextureImageUnits` (minus water/shadow/clipping units); excess
  → extra passes with initialColor (0,0,0,0), ALPHA_BLEND, depth
  LESS_OR_EQUAL (:2460, :508-529). First pass: base color, depth LESS.
- `APPLY_*` defines only when a value differs from default (:3045-3101);
  defaults alpha/nightAlpha/dayAlpha 1, brightness 1, contrast 1, hue 0,
  saturation 1, gamma 1, no split/cutout/colorToAlpha (ImageryLayer.js:192-361,
  :436-496) → none applied.
- `computeDayColor` (GlobeSurfaceShaderSet.js:418-471) folds
  `sampleAndBlend` from `u_initialColor` with `uv = clamp(v_tc, 0, 1)`
  (GlobeFS.glsl:353); `sampleAndBlend` (:182-291):

```text
a = alpha * step(rect.st, uv).x*.y * step(0, rect.pq - uv).x*.y      // inclusive edges
c = czm_gammaCorrect(texture(tex, uv * scale + translation))          // identity w/o HDR
srcA = c.a * a; outA = mix(prev.a, 1, srcA); outA += sign(outA) - 1
rgb = mix(prev.rgb * prev.a, c.rgb, srcA) / outA; return (rgb, max(outA, 0))
```

Opaque Bing: a covered fragment = the filtered texel; at a shared edge
the later (east/south) imagery wins.

- Color space: `highDynamicRange = false` (Scene.js:750; `gamma = 2.2` at
  :751 used only with HDR). No `czm_srgbToLinear` anywhere in the globe
  path: texture bytes go to the non-sRGB framebuffer unchanged (browser
  default colour-space conversion on decode). Filtering/mips act on encoded
  values. Tonemapping only with HDR (PostProcessStageCollection.js:613), FXAA
  off (:55), MSAA 4 (Scene.js:255).
- Base color: `Color(0, 0, 0.5, 1)` (GlobeSurfaceTileProvider.js:199). The
  base layer stretches its edge texels past ±85.0511° (rect collapse +
  CLAMP), so loaded poles show imagery, not base color.
- Ground atmosphere (on for WGS84, Globe.js:205; 3D only), no FOG define:
  light dir = `normalize(positionWC)`; `atm = 1 − exp(−2·(c + g.rgb·(0.5 +
clamp(1 − g.a))))`, `c = mix(c, atm, fade)`, `fade = clamp((|camWC| −
π/2·Rmin) / (π/2·Rmin))`: 0 within 9,985,163 m of Earth's centre
  (GlobeFS.glsl:536-565, Globe.js:264-274). Scattering per vertex, per
  fragment above `nightFadeOutDistance` (GlobeSurfaceTileProvider.js:2606-2611).
- Fog replaces that per tile if `fog.enabled && renderable && !underground
&& fog(tile._distance, density) > 1e-3` (:2585-2586, :2988-2992):
  `c = mix(c, inverseGamma(pbrNeutralTonemapping(g.rgb)), f)`, `f = 1 −
exp(−(k·s + k)·s·(1 + k))`, `s = v_distance·czm_fogDensity`, k = 0.15
  (Fog.js:75, Builtin/Functions/fog.glsl); density per globe spec §2.

## 7. Parity hazards

- Filtering: trilinear + anisotropic (max supported, usually 16×) has
  GPU-specific footprints. Match the sampler; mip generation is driver-defined
  (`NICEST`): use a 2×2 box on encoded (non-sRGB) values.
- Colour: `rgba8unorm`, not `-srgb`, for textures and canvas; no
  linearization. ImageBitmap `colorSpaceConversion: "default"` may apply
  ICC profiles; JPEG decoders differ by ±1-2 LSB across browsers.
- Seams: every imagery tile is its own clamped texture, so filtering never
  crosses imagery tiles; the inclusive `step` picks the later tile;
  sliver-skip (1/512) clamps a neighbour's edge texels over the sliver.
  Adjacent terrain tiles may use different imagery levels (latitude
  buckets, terrain level, ancestors).
- Mercator: per-vertex webMercatorT is linear per triangle; polar tiles use
  the 64-row reprojected texture (double resampling) or, at level ≥ 11,
  raw Mercator sampled as geographic.
- Level choice depends on the terrain provider's level-0 error (65 vs 64)
  and `Math.round` ties; maxLevel comes from the live Bing zoomMax.
- State: ancestors substitute while loading and permanently for
  INVALID/FAILED tiles; compare only at `tilesLoaded` plus one frame for
  reprojection. Missing Bing tiles vary by region and over time.
- Atmosphere/fog: per-tile fog switching (the 1e-3 CPU cutoff vs the
  shader formula ≈ 0.5% step at tile borders), per-vertex scattering, ground
  atmosphere fade above ~3,600 km altitude. Disable fog and
  `showGroundAtmosphere` in both engines for raw imagery comparison.
- Edges: MSAA at the limb and skirts; depth LESS vs LESS_OR_EQUAL matters
  only for multi-pass tiles.
