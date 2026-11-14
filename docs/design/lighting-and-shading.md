# Lighting and shading: what matches 1.x, and what is judged against physics

**What this holds:** What matches 1.x and what is judged against physics: units and exposure, the atmosphere, shadows, ambient occlusion, translucency, tone mapping and their measurements. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

1.x is the oracle for **what a scene says**: geometry, positions, time and
the sun, which content is shown, and the values a material or style carries.
It is not the oracle for **how light behaves**. Where 1.x shading is an
approximation or a workaround, 2.0 follows the physics and the glTF and
3D Tiles specifications and is judged against references; comparisons with
1.x there only check that a scene migrated with default settings still looks
like itself. Three tiers, each with its own test:

**Exact parity (L2 FLIP vs 1.x, as today).** Things that carry data:

- unlit content (`KHR_materials_unlit`), vertex and feature colors, styles,
  picking, and globe imagery with lighting off (1.x's default:
  `Globe.enableLighting` is false, so imagery shows its own colors);
- input decoding: sRGB vs linear textures, KTX2, quantization, normal-map
  conventions, alpha modes, double-sidedness, texture transforms. Tested
  through unlit and albedo debug outputs, so lighting can't hide a decoding
  bug;
- geometry and time: sun and moon directions from a `JulianDate` (L0),
  cameras, depth, clipping;
- direct sunlight with image-based lighting off (the parity harness's
  `direct` mode): the same glTF BRDF on both sides, so a difference is a
  bug on one of them (filed as a follow-up item for other teams, project CS-19, when it is 1.x's).

**Intent parity (statistics vs 1.x, not FLIP).** The default look of a lit
scene: average luminance of lit content within a third of a stop, sky
chromaticity at zenith and horizon, the dominant direction and ratio of the
environment's irradiance (its SH coefficients against 1.147's
`DynamicEnvironmentMapManager`, at the same position and time). Canonical
times: noon, golden hour, dusk and night, at ground, mountain and orbital
altitudes, and underground (the case 1.147's #13988 fixed). This tier keeps
migration honest without freezing 1.x's approximations.

**Deliberate divergence (against references, not 1.x).**

- _Atmosphere._ One physically based model for everything that involves the
  atmosphere: the sky, aerial perspective (what 1.x splits into ground
  atmosphere and fog), the sun's and moon's color through the air, and the
  environment lighting. 1.x has four separate approximations: `SkyAtmosphere`,
  ground atmosphere, `Fog` and the dynamic environment map, each with its own
  constants and color corrections (HSB shifts, brightness, saturation, and a
  `pow(color, gamma)` kept as a precision workaround). Single scattering with
  ad hoc step weighting, no ozone (the blue of twilight), no multiple
  scattering (skies too dark at low sun and from altitude).
- _Environment lighting._ The radiance at the content's position, integrated
  properly: SH9 projection weighted by solid angle, GGX-prefiltered specular
  with filtered importance sampling, energy compensation for multiple
  scattering on rough metals, specular occlusion, and the ground's bounce
  from its albedo.
- _Color correction is not lighting._ Brightness, saturation and white
  balance belong in the display transform, after the light has been
  computed, not inside the environment map.
- _Materials._ The full glTF PBR model and the KHR material extensions
  (specular, IOR, transmission, volume, clearcoat, sheen, iridescence,
  emissive strength) as specified, judged against the Khronos glTF Sample
  Renderer's images of the sample models, which replace 1.x as the oracle
  for materials.
- _HDR, exposure and display._ Always HDR (as now); exposure, tonemapping
  and the display encoding last (below).
- _Shadows and ambient occlusion._ Sun shadows and ambient occlusion on by
  default once they are fast enough; 1.x has both opt-in. Judged at L3.

**References** for the third tier, each a test: a brute-force atmosphere
integrator (spectral, many steps, several scattering orders) in a compute
shader, against which the real-time LUTs must agree within a few percent of
radiance; a Monte Carlo integration of an environment's radiance for every
pixel, against which the SH and the prefiltered specular must agree (FLIP);
the Khronos sample images for materials; published clear-sky illuminances
for the photometric scale (below); L3 sign-off for the look.

## Sky and sun models

| Model                                            | What it is                                                                                              | Altitudes                | Fit for a globe                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------- |
| Preetham (1999)                                  | analytic fit, clear sky                                                                                 | ground                   | no: wrong at low sun, no space view                                    |
| Hosek–Wilkie (2012)                              | analytic fit, clear sky, ground albedo and turbidity                                                    | ground                   | no: no aerial or space views                                           |
| Prague (Wilkie et al. 2021)                      | fitted to spectral simulations, polarization, visibility                                                | up to about 15 km        | no as the default (no space views, large data); yes as a reference     |
| Bruneton & Neyret (2008; reference 2017)         | precomputed multiple scattering in 4D tables                                                            | any                      | good, but the tables are costly to rebuild when the atmosphere changes |
| **Hillaire (2020)**, Unreal's sky and atmosphere | small LUTs (transmittance, multiple scattering, sky view, aerial-perspective volume), rebuilt per frame | any (ground to space)    | **yes**: any altitude, cheap, every parameter dynamic                  |
| CIE standard skies, Perez all-weather            | luminance distributions fitted to measurement; Perez driven by measured direct and diffuse irradiance   | ground (an analysis sky) | yes for daylighting analysis, not for visuals from altitude            |

The default is **Hillaire's model**, computed spectrally (at least 4
wavelengths, then to RGB through the CIE matching functions, as Bruneton's
2017 reference does) with an ozone layer, parameterized per body (Earth by
default; Mars and the Moon, which 1.x's ellipsoids already support, need
only other constants). The sun is a disk of its real angular size with limb
darkening, its color the transmittance along its path; the moon is lit by
the sun with its phase; stars are light from the catalog (next section).

## The night sky

1.x draws stars from a sky box: six images of a star map (Tycho), at a
fixed brightness unrelated to the scene's light, magnified and soft at
any zoom. 2.0 draws the sky as it is, so the camera decides what shows:

- **Stars from a catalog**, as points: the Yale Bright Star Catalogue
  first (about 9,000 stars to magnitude 6.5, all a naked eye sees), then
  Hipparcos (118,000) and Gaia's bright stars (millions, to magnitude 12
  and beyond, streamed by magnitude like tiles). Positions in ICRS with
  proper motion to the date, turned to Earth-fixed axes with the same
  transforms as the sun (precession, nutation, Earth rotation; L0 parity
  with 1.x's `computeIcrfToFixedMatrix`).
- **Photometric brightness**: a star of visual magnitude m gives an
  illuminance of 2.54 µlux × 10^(−0.4 m) on a surface facing it (Vega,
  magnitude 0, about 2.5 µlux). Each is drawn as a small point-spread
  splat whose energy is exactly that illuminance, in the same units as the
  sun and sky, so exposure does the rest: invisible at EV100 15 in
  daylight, appearing through twilight as the sky darkens and the camera
  (or automatic exposure) opens up, the naked-eye sky at about EV100 −2.
- **Color** from the catalog's B−V index: an effective temperature
  (Ballesteros 2012), a blackbody spectrum through the CIE matching
  functions, scaled to the V-band magnitude.
- **Through the atmosphere**: each star's light attenuated by the
  atmosphere's transmittance along the line of sight (extinction toward
  the horizon) and seen against the sky's own radiance, so stars fade
  into twilight and haze physically, not by a fade parameter.
- **Diffuse light**: the Milky Way and zodiacal light as a low-resolution
  all-sky luminance map (the natural night sky is about 2 × 10⁻⁴ cd/m²),
  under the same exposure.
- **Deep-sky objects** in their real places: Andromeda, the Magellanic
  Clouds, the Orion Nebula, the Pleiades and other bright Messier and NGC
  objects, as images with their catalog surface brightness (Andromeda's
  core about 22 mag/arcsec², some 2 × 10⁻⁴ cd/m², as faint as the natural
  night sky): they show only under a dark sky at long exposures, as with a
  real camera. Image licenses to check. Not in 5e: the owner dropped
  deep-sky patches on 2026-11-09 ([2026-11-08-owners-calls-for-later-plans.md](../decisions/2026-11-08-owners-calls-for-later-plans.md), decision (f)).
- **Moon and planets** from ephemerides: the moon's disk lit by the sun
  with its phase (and earthshine), the planets as points with their
  magnitudes. The moon's light also lights the scene at night (about
  0.25 lux when full).
- **Looks**: point-spread size in pixels, independent of zoom; glare on
  the brightest stars and planets from the bloom pass (a camera or eye
  effect, not the star's size); scintillation as an option.
- Catalog licenses to check before shipping data (Yale BSC and Hipparcos
  are public; Gaia's data asks for attribution).

Progress (r42): **a star map behind the sky**, the first step. The
`Viewer` loads 1.x's Tycho star map (six cube faces, already in the
repository) into `Engine.setStarMap`; the sky draws it behind the
atmosphere, turned to Earth-fixed axes by the clock (`icrfToFixed`:
precession to the date, IAU 1976, then sidereal time; nutation, under 20″,
and polar motion left out; 1.x turns its sky box by sidereal time alone,
0.36° off by 2026 from precession), and dimmed by the atmosphere's
transmittance along the ray to space (gray, from the sky-view table's alpha
inside the atmosphere and from the march above it), so stars fade toward
the horizon and into twilight and vanish behind the ground. A full texel is
0.2 cd/m² (`STAR_MAP_LUMINANCE`): the map's mean is then about 3 × 10⁻⁴
cd/m², the natural night sky's, so the map stands for all of it (stars,
airglow, zodiacal light) and shows only as the exposure opens: nothing at
EV100 15, the stars at about EV100 −2. Its limits are the reason for the
catalog: each star is blurred over texels that are magnified at ordinary
fields of view (0.09° per texel against about 0.03° per pixel) and clipped
at 8 bits, so a bright star's light, which belongs on one pixel, is spread
over dozens (the brightest reach 0.07 of white at EV100 −2, where Vega
drawn as a point would saturate). Tests check the rotation against Sirius's
annual precession and Polaris.

The stars as the eye sees them (r43): physically, a daylight exposure
leaves them black, from orbit as from the ground (as in photographs of the
sunlit Earth), and the `Viewer` showed none. `View.starExposure` (EV100)
exposes them as the eye does against a dark sky: where the sky behind a
star is under a few percent of white, its light is taken at that exposure
when the view's is less open, so they show against space and the night sky
at EV100 15, and twilight's blue or the day sky still hides them. The
engine leaves it unset (physical); the `Viewer` sets −3, about 1.x's
brightness.

Catalogs: none we checked can be shipped in this Apache-2.0 repository.
Hipparcos and Tycho-2 (ESA) and Gaia are CC BY-NC 3.0 IGO; HYG and AT-HYG
are CC BY-SA 4.0; the Yale Bright Star Catalogue is its authors'
copyright, redistributable unmodified only (Debian's reading, from the
data center); SKY2000 (NASA Goddard) states no license and is compiled
from the others. The Tycho star map 1.x ships stays; points would need
ESA's permission for commercial use or a legal opinion on the Yale
catalogue.

Next for the stars (asked for after r44): they look soft, and at high
brightness show visible edges. Both come from drawing a texture: 1.x's
Tycho map is six 8-bit sRGB faces, magnified (a star is a blur several
texels wide, not a point) and quantized (256 levels stretched over many
stops at an open exposure draw contour bands; the faces' seams may show
too). Film VFX draws stars as points, not pixels of a texture:

- each star a point source with its flux (from magnitude) and color (from
  its temperature, B−V), splatted energy-conserving at its subpixel
  position through a point spread function (a Gaussian or Airy core, the
  eye's or the lens's), so a star stays one sharp point at any field of
  view and its brightness doesn't shimmer as the camera turns;
- glare for the bright ones as the eye sees it (Spencer et al. 1995,
  "Physically-Based Glare Effects for Digital Images": a bloom and the
  ciliary corona's fine rays), or a lens's diffraction spikes for the
  camera;
- twinkle (scintillation) near the horizon, where the air is thickest;
- the Milky Way and the faint unresolved stars as a smooth background in
  float, below the points.

The catalog problem stands (none we found ships under Apache-2.0); the
points could come from the Tycho map itself (its peaks: positions,
fluxes, colors), the map kept, low-passed, as the background.

Progress (r44): **stars as points**. Looking closer, the map draws a star
as one texel (5′; bright ones as disks 4-5 texels across), its value
growing with brightness, compressed (Sirius about 230 of 255, a ninth
magnitude star about 16), over an 8-bit background; drawn as a texture, a
star was a texel magnified and filtered, and the background's steps drew
contours at an open exposure. And 1.x uploads cube faces upside down
(`flipY`), so the 2.0 sky had each face mirrored (Procyon at −5° for +5°).
atmosphere/stars.ts reads it out in a worker (1.1 s): 86,000 stars, each
at its texels' centroid (Procyon, Capella, α Centauri, Orion where they
are), its brightness by rank (sorted by its light in the map, the n-th
takes the magnitude the sky has n stars brighter than: the map's
compression drops out) and its color; the rest, low-passed in float
(64² a face), is the background, its brightest (the Milky Way's core)
1.5 × 10⁻⁴ cd/m² above the rest. Each frame the stars are splatted into a
view-sized layer through a point spread function in CSS pixels (a
Gaussian core integrated over each pixel, energy-conserving at any
subpixel position, and a halo of 5% of the light, σ 3 CSS px: a bright
star past white is larger), culled where too faint to show; the sky reads
the layer as it read the map (the air's transmittance, the dark-sky rule,
the Moon). The whole frame of a dense star field at EV100 −10 takes 0.5 ms.
Limits: the brightness of the brightest stars is the map's, off by about
a magnitude on average and more for a few (Spica 1.0 reads 4.6, Alnilam
1.7 reads 5.2: Tycho-2 handles the brightest stars poorly); a catalog
would fix it, and colors from B−V. Still to do: diffraction spikes for the
camera, the corona's rays, twinkle (needs continuous rendering).

Next steps (r44, after the night work). Now, in this order:

1. **Shadow cascades' aliasing**: filtered lookups (a Poisson or Vogel
   disk of comparisons, scaled to each cascade's texel) instead of one
   hard comparison, and cascades fitted to what is drawn, not only to the
   view's slices. Done (r44), the filter: Castaño's optimized PCF (a 5 × 5
   tent from 9 bilinear comparisons) for the 3 × 3 box; with the sun
   stepping 0.08° over lower Manhattan from 450 m (NYC buildings), pixels
   jumping by more than 8 levels went from 38,000 to 27,000 a step (some
   of the rest is the shadows' own motion). The fit is still to do: the
   buildings there fall in the third cascade, 0.6 m a texel; fitting the
   cascades to the depth actually on screen (Lauritzen's sample
   distribution shadow maps, a min/max reduction of the depth buffer on
   the GPU each frame) is the next step, the content's bounds being no
   help once the globe reaches the horizon. Done (r44), their splits: a
   compute pass reduces the opaque depth to the nearest and farthest
   surface along the view (depthRange.wgsl, one sample a pixel, the sky
   left out), read back a frame or so late; the cascades cover that (a
   fifth nearer, a quarter farther, in quarter-octave steps that widen at
   once and narrow only past a step and a half: shadows.ts `shadowRange`)
   within the 20 × height they had. The same view and sun steps: 11,900
   pixels a step against 15,700 (the nearest building 717 m off, the
   cascades from 512 m instead of 1 m); in a street canyon they cover 38
   to 861 m instead of 1 to 600. Each cascade's extent still fits its
   slice's sphere (steady as the camera turns); fitting it to the
   surfaces seen from the sun is Lauritzen's other half, left for when
   its crawl as the view turns can be kept down.
2. **Haze at the day/night line from orbit**: the per-vertex march
   interpolates a step (lit, then in the Earth's shadow) across the
   coarsest tiles' triangles, drawing blocky streaks. Where a triangle's
   vertices disagree, march per pixel. Done (r44), otherwise: marching
   per pixel where the vertices disagree left a patchwork (the vertices'
   haze is off across every coarse triangle, not only there), and per
   pixel everywhere cost 6.8 ms. From 500 km up (all of it from 1,000)
   the haze now comes from a screen grid (640 × 400, a ray per texel to
   the ground in the space where the ellipsoid is the ground sphere, as
   the orbit sky; sky.wgsl `aerialScreenFragment`), sampled bilinearly:
   the day/night line is a smooth curve, and the frame from 18,000 km
   takes 3.3 ms against 4.1. The march's shadow test is soft over a
   degree (the sun's disk, refraction) or a step's span.
3. **The environment's rebuild cost** (about 10 ms when the sun, the Moon
   or the exposure moves): fewer prefilter samples with filtered
   importance sampling, the irradiance from a smaller level. Done (r44): the
   cost was mostly elsewhere. Timed alone, a rebuild took 3.0 ms of GPU
   time and 0.8 ms to encode, 2.2 ms of it the sky cube's mips: a render
   pass per face and level, 42 for the 128² cube, nearly all overhead. A
   compute kernel now averages a level's six faces in one dispatch (7 in
   all); the prefilter takes 64 samples at its first blurred level and 32
   after (filtered importance sampling: 256 did no better, the IBL
   reference within 0.0-2.6% of Monte Carlo for dielectrics as before);
   the irradiance cube is 16² a face. A rebuild now: 0.6 ms of GPU, 0.07
   ms to encode. The irradiance from 10 km up moved from 3.9% to 6.1% of
   the integral (the zenith texels lean 3.6° toward the bright ground),
   the ground's rows within 0.9% as before.
4. **The eye's local adaptation**: the eye adapts to each region it
   looks at, not to the view as a whole: a moonless night is less black
   to a dark-adapted walker than one global adaptation shows, and bright
   lights at night keep their color. Ferwerda's gains per pixel from a
   blurred adaptation map, blended with the global one. Done (r44): a
   plain blur of the image's log luminance (a sixteenth of its size,
   σ 2 texels) haloed every edge (the ground beside dark buildings glowed
   where it met them), so each pixel now adapts among its neighbors of
   about its own brightness: a bilateral grid (Chen, Paris and Durand
   2007), 16 × 16-pixel cells by 16 levels of log luminance over ±12 stops
   of the view's adaptation, blurred over 7 × 7 cells and 3 levels, read
   trilinearly at the pixel and its level (adapt.wgsl, present.wgsl
   `eyeSees`); halfway to it in log, no more than 2 log10 from the view's.
   0.2 ms at 1831 × 1416. From orbit the dark land keeps its texture
   beside the lit cities; moonlit streets are unchanged, without halos.
   What it can't do: lower Manhattan on a moonless night stays black,
   since nothing lights the facades (starlight only) while the ground
   under them carries the city lights. The missing light is the city's
   own: see "City light" below. Also fixed: a meter reading in flight as
   the exposure turned fixed left automatic exposure pending, never to
   meter again. Adaptation's pace (r44): a real eye's at `speed` 1
   (to light in 0.1 s for the cones and 0.4 s for the rods; to dark, time
   constants of 180 s and 600 s, after Hecht, Haig and Chase 1937's
   plateaus at 10 and 30 to 40 minutes), 400 times that by default (to
   dark in a few seconds; scene/eye.ts `EYE_ADAPTATION_SPEED`), a slider
   from ×1 to ×1024 in the viewer.
5. **The Moon**: its libration (its orientation from the IAU rotation
   model, so the face it shows wobbles as it does), and a sharper map
   than 1.x's 256 × 128 (NASA's CGI Moon Kit, public domain). Done (r44):
   time/moon.ts `moonAxes`, the IAU model (Archinal et al. 2011, as 1.x's
   `Iau2000Orientation`), within 0.15° of Meeus's example 53.a for the
   Earth's selenographic longitude and latitude and its pole's position
   angle; the Viewer turns it to Earth-fixed axes with the clock. The map
   comes from Cesium Moon Terrain on ion when the token reaches it (the
   Asset Depot; io/moonMap.ts): its tiles' textures are equirectangular
   patches of their longitude and latitude (u and v linear in them within
   10⁻⁷), so a level of the tree laid side by side is the map, 2048 ×
   1024 from level 2's 32 tiles of 256², no geometry drawn; the band's
   tiles stop at 85°, the last rows stretched over the caps. 1.x's map
   until it arrives or without it. The disk reads it through its mips with
   analytic gradients (the surface a pixel away), anisotropically: the
   limb and the poles alias no more. Its imagery is the LROC WAC Global
   Morphology Mosaic, built from images under a low sun for the relief:
   shading baked in, so a full Moon shows craters it shouldn't. An albedo
   map (the WAC normalized reflectance, the CGI Moon Kit's) lit by the
   sun would not.
6. **Lights in the scene**: point and spot lights (`KHR_lights_punctual`,
   candela), clustered forward shading, unshadowed (the order in "Lights
   beyond the sun", above). Done (r44): `World.addLight` at a transform
   (moved, hidden and removed with it); a model's glTF lights at their
   nodes. Each view culls its lights to its frustum on the CPU, nearest
   1,024 kept, each reaching where its light on white would show below
   1/256 of white at the view's exposure (or its glTF `range`), faded by
   glTF's window; a compute pass sorts them into 32 × 18 × 32 froxels
   (log depth), a workgroup per tile culling to its column in shared
   memory, then a thread per slice keeping its 16 brightest (lights.wgsl);
   the opaque pass shades its froxel's (scene/lights.ts, opaque.wgsl
   `punctualLight`). 576 spots over lower Manhattan at night: 1.1 ms to
   sort, about 3.5 ms more in the opaque pass at 1831 × 1416. Most of that
   is overdraw: the MSAA opaque pass shades every fragment that passes
   the depth test as drawn (the ambient occlusion prepass is single
   sampled), so lights cost per fragment, not per pixel. Next for many
   lights: a depth prepass in the MSAA pass and shading at equal depth
   (Forward+'s z-prepass, Harada et al. 2012), which also cuts the sun's
   and the environment's shading of hidden fragments. Done (r44): the
   opaque pass draws the world's depth first (`World.depthBundle`: the
   shadow casters' vertex stage and discards, no color written), then its
   triangles shade where their depth equals it (no depth written; lines
   draw as before); positions are `@invariant`, so both stages agree to
   the bit. An override shader keeps the old way. Over lower Manhattan by
   night the opaque pass took 4.3 ms against 6.4 without lights (the
   depth included), 6.9 against 10.0 with the 576 spots. Parity, models,
   imagery, globe and tileset unchanged (models with and without the
   prepass alike). Point sets and instances draw outside it (r48, r49:
   their vertices cost more twice than their overdraw does).

Later:

- **The Moon's albedo**: its map without the mosaic's baked-in shading,
  lit by our own: NASA's CGI Moon Kit (SVS 4720, public domain), its
  color map adapted from the LROC WAC Hapke-normalized mosaic (over
  100,000 WAC images, normalized to one geometry of sun and view; 70°N to
  70°S, the poles from LOLA's albedo map), with LOLA's elevation for the
  relief (a normal map: shadows at the terminator, flat at full). Its
  files are TIFF and EXR: converted once to a PNG or JPEG, committed
  (public domain) or fetched; the raw mosaic is in the LROC archive
  (WAC_HAPKE). Others: Clementine's 750 nm mosaic (USGS), Kaguya's
  Multiband Imager.
- **Other bodies**: the Moon (Cesium Moon Terrain) and Mars as 3D Tiles
  in their own frames (a body's ellipsoid, `3DTILES_ellipsoid`, its
  orientation from the IAU model, its ephemeris), lit by the sun without
  an atmosphere, for flying from one to another; the sky's disk is the
  same Moon from afar.
- **City light**: on a moonless night a city lights itself. The night
  lights' upward light scattered by the air (the sky glow, an urban sky
  some 100 times the natural one) into the sky and its environment, and
  the lit ground's light up the facades (the environment's lower half),
  so streets and buildings show as they do at night, not black. Done
  (r44): globe/cityLight.ts averages the night lights' image (level 7,
  about a kilometer a pixel, 2 × 2 tiles fetched once) within 30 km of
  the camera, weighted 1/(d² + 2 km²), as the ground's mean light, cd/m²
  (0.26 over lower Manhattan); the sky (sky.wgsl `cityGlow`, with the
  night's own light, so in the drawn sky and the environment alike) shows
  it below the horizon, and above it a tenth of it at the zenith, three
  times that at the horizon, warm, fading with height (a 1.5 km haze and
  the air's 8 km). Facades in lower Manhattan's streets show by night
  where they were black. To tune: the stars still fade only as the sky's
  luminance grows, so more show over a city than do.
- **Stars, part two**: diffraction spikes for the camera, the eye's
  corona rays, twinkle; a catalog for the brightest stars' magnitudes and
  colors (a license decision).
- **Translucency**: order-independent transparency (M4); cut-out and
  blended materials are drawn opaque until then. Done (r45): see M4
  ([m4-visual-parity.md](../history/m4-visual-parity.md)), "Progress (r45)".
- **Weather fog**: a haze medium of its own beside the clear air's.

Progress (r43): **the Moon**. `moonPosition(time)` (time/moon.ts) ports
1.x's Simon et al. (1994) lunar theory (within 0.04° and 0.05% of
distance of Meeus's example 47.a; since replaced by Meeus's chapter 47,
ELP-2000/82's main terms, within 16″ and 27 km of DE440 over 2000 to
2050, where Simon's main terms were 0.31° and 2,051 km), turned to Earth-fixed axes with
`icrfToFixed`; `Engine.moonPosition` places it (the `Viewer` sets it from
its clock; unset, no Moon, as in the comparisons with 1.x). The sky draws
its disk from the camera's own position (the Moon's parallax reaches 1°),
at its angular size, textured with 1.x's `moonSmall.jpg` (near side in the
middle, north toward the ecliptic's pole, libration left out) and shaded
as Lommel-Seeliger, 2μ₀/(μ₀ + μ), which is flat at full as the Moon
looks; its total brightness follows its albedo (0.12) and Allen's phase
law (a half moon a tenth of a full), the map normalized to its mean. The
air dims and reddens it as it does the sun: the sky-view table's sun row
holds, in a second texel, the sun's light through the air along the
Moon's direction; above the atmosphere the march's transmittance applies.
It hides the stars behind it and shows faintly in the day sky (a crescent
at 39° with the sun 68° away is a tenth of the sky's brightness, as seen).
Its light reaches the scene as a second directional light: the sun's
light through the air toward the Moon (the sun-light table) times its
share (albedo × its angular radius² × phase, 2.4 × 10⁻⁶ when full, about
0.25 lux), shadowed by the sun's cascades, which follow the Moon when the
sun is down and it is up. Next: moonlight in the sky (scattered, the
moonlit sky's blue) and in the environment, which would light what the
Moon doesn't reach; earthshine on the dark part; then starlight and
airglow in the environment (about 1 mlux without a moon).

Progress (r44): **night, and the eye**. Moonlight scatters in the air
(the sky-view table's second set of rows, about the Moon; the orbit sky,
the haze volume and the per-vertex march add it while the sun is down);
the night sky lights itself (airglow, a 87-97 km shell, 1.1e-4 cd/m² at
the zenith; zodiacal light and faint stars, 0.8e-4; about 1 mlux on the
ground, Leinert et al. 1998); the environment carries both, so nothing
is black that something lights; earthshine shows on the Moon's night side.
How light becomes an image is one choice, `View.exposure`: a camera's
(`{ ev100 }`, `{ scale }`, metered `{ auto }`) or the eye's (`EYE`, the
`Viewer`'s default; `starExposure` is gone, the stars as seen being part
of it). The eye (scene/eye.ts) is a model of vision, not a key: its
cones and rods each adapt to the scene (a center-weighted meter, photopic
and scotopic, over the 65th-98th percentiles of a log-luminance
histogram, as Unreal's eye adaptation), and each shows what it sees as
visible as it was (Ferwerda et al. 1996's threshold curves: the cones in
color, the rods gray-blue as Thompson et al. 2002, weighing in through the
mesopic range). Thresholds keep visibility, not brightness: alone they
showed a moonlit scene about as bright as a sunlit one. How bright night
looks follows Tumblin and Rushmeier (Stevens' brightness data): 1.8 stops
darker by moonlight, 3.1 under starlight. One calibration: by day the
adaptation level shows at 0.18 of white. That target is a choice, made by
comparison with 1.x and the owner's review on 2026-11-08, not a physical
constant; it is the eye's alone, and a metered camera's K = 12.5 (0.104 of
white at the meter) is unchanged. The meter's reading is no lower than the
98th percentile less 4 stops, so a small bright crescent in a dark image
is not blown out (daylight, whose band lies within 4 stops, is
unchanged).
Adapting to light takes a moment (cones 0.1 s, rods 0.4 s), to dark longer
(the eye's minutes compressed to 1.5 s and 4 s). The eye sees the stars
against a dark sky. The plain mean had let the night half of the Earth
from orbit open the exposure ten stops. Settled: a sunlit city about
EV100 16, the sunlit Earth from orbit about 13.8; a moonlit city dark,
gray-blue and legible; a moonless one, with nothing lit, near black (the
brightness model's verdict, darker than a dark-adapted walker finds it).
City lights: the globe's second imagery layer, light the surface emits
(`GlobeOptions.lights`; the `Viewer` takes NASA's Black Marble, ion asset
3812, through `IonTmsImagery`), each terrain tile's night slice in the
record's last word, its brightest white 0.3 cd/m² as seen from above
(VIIRS's day-night band near saturation in city centers), dimmed by the
air like any surface; `View.cityLights` turns them off. A camera at EV100
−4 sees them orange, as photographs from orbit do; the dark-adapted eye
sees them mostly with its rods, gray-white.

## Fog and aerial perspective

- **Aerial perspective from the atmosphere** (Hillaire's froxel volume of
  in-scattering and transmittance): haze that depends on distance, altitude
  and sun direction, replacing both 1.x ground atmosphere and `Fog`.
- **Weather haze**: an extra participating medium with exponential height
  density, integrated analytically, set as a visibility in kilometers
  (METAR-style) and a color, for conditions the clear atmosphere doesn't
  cover (mist, smog, dust).
- **Volumetric fog later**: a froxel volume that samples sun shadows, for
  light shafts and local fog volumes. It needs temporal filtering, the first
  temporal pass 2.0 would have.
- **Detail from transmittance**: 1.x raises the screen-space error of tiles
  in its fog. 2.0 can do the same from the atmosphere's transmittance (a
  tile barely visible through the haze can be coarser), so the saving
  follows what the viewer can actually see.

## Other atmospheric effects

- **Clouds**: first a 2D cloud layer (coverage from satellite imagery or
  weather data), with cloud shadows on the ground and its effect on the sky
  and environment lighting; volumetric clouds (Nubis- or Frostbite-style
  raymarching with temporal reprojection) later. The engine provides the
  participating-media framework (froxels, shadow maps, temporal
  accumulation, the atmosphere's light and transmittance); a cloud system
  plugs into it, so clouds can be an example or an extension rather than
  core.
- Precipitation (particles, wet materials), city lights at night (emission
  from night imagery, which 1.x blends as a second imagery layer), aurora,
  atmospheric refraction near the horizon, eclipses. All later, all
  consumers of the same framework.

## Design and architecture models

For design review what makes an image accurate is, in order:

1. **Photometric units throughout** (next section): a model at noon in June
   in Phoenix receives the right lux, not "intensity 2".
2. **The sun's position** (L0 parity, already exact) and **its color**
   through the atmosphere (transmittance), for orientation and shading
   studies.
3. **Materials as authored**: glTF base color as measured albedo, IOR,
   transmission and volume for glazing, specular for coatings. Glass in
   particular needs transmission and refraction, not alpha blending.
4. **Shadows and ambient occlusion**, which dominate how buildings read.
5. **The sky for analysis**: alongside the visual sky, a daylighting mode
   with CIE standard skies or the Perez all-weather model driven by weather
   data (direct normal and diffuse horizontal irradiance from an EPW file),
   which is what daylighting tools such as Radiance use. Same units, so a
   false-color view of illuminance on surfaces is meaningful.
6. **Photometric lights**: glTF's `KHR_lights_punctual` already gives
   intensities in candela (point and spot) and lux (directional); add IES
   and EULUMDAT profiles for luminaires.
7. **Indirect light** (interiors, courtyards, light bouncing off a facade)
   needs global illumination (next section).

## Global illumination

WebGPU has no hardware ray tracing yet, so real-time GI here means screen
space, software ray tracing in compute shaders, or precomputation. Outdoors
at globe scale most indirect light is the sky, occluded; indoors and
between buildings it is bounces. In order of cost and payoff:

1. **Sky visibility**: ground-truth ambient occlusion (GTAO) with bent
   normals, so the environment's SH is sampled in the unoccluded direction,
   and the multi-bounce approximation (Jimenez et al. 2016) so occlusion
   doesn't over-darken bright materials. Screen space, cheap; it is also
   M4's ambient occlusion.
2. **Screen-space indirect light**: the visibility-bitmask extension of
   GTAO (SSILVB, 2023) gathers one bounce from what's on screen in the same
   pass. Near-field color bleeding; misses what's off screen.
3. **Probe GI with software ray tracing** (DDGI, Majercik et al. 2019): a
   grid of irradiance probes with depth moments (to avoid leaks through
   walls), updated each frame by rays traced in compute against a BVH of
   the world's triangles, lit by the sun (shadowed by the same rays) and the
   atmosphere. Scoped to where it matters: around a design model, or
   cascades centered on the camera; probes update incrementally as tiles
   stream in. The BVH is the main new piece of infrastructure; 2.0's ray
   casts (`castRays`) already walk the world's triangles, and the BVH is
   shared with the path tracer later.
4. **Baking for static design models**: the path tracer, once it exists,
   bakes probes or lightmaps for a model in the background, the most
   accurate indirect light at no cost per frame. Design models are static,
   so this suits AEC best.

Not chosen: voxel cone tracing (memory at city scale, voxel leaks), light
propagation volumes (leaks), Lumen-style signed distance fields (too large
an undertaking for now). Radiance cascades (Sannikov 2023) are worth a spike
in screen space. Shared infrastructure for all of it: a depth and normal
prepass (2.0 shades forward with MSAA), a hierarchical depth buffer,
temporal accumulation with denoising (shared with volumetric fog and
clouds), and the BVH.

## What to take from Unreal Engine 5

Unreal's renderer is the most complete public example of physically based
real-time lighting at scale. What transfers to 2.0, and what doesn't:

- **A path tracer in the engine as the reference.** Unreal ships one that
  renders the same scene, materials and lights, and Epic checks Lumen
  against it. 2.0's references (above tiers) should grow into the same: the
  path tracer we plan to experiment with is first the oracle for every
  real-time approximation, then a product feature.
- **One sky system feeding everything.** Sky Atmosphere (Hillaire's model,
  above), Volumetric Clouds and the Sky Light, which re-captures the sky
  (with clouds) into the environment lighting in real time. The same shape
  as above: one atmosphere, one environment derived from it.
- **Physical units and exposure as the default.** Lux, candela, nits and
  EV100 throughout, with automatic exposure set in physical terms. Epic made
  these the default after years of unitless settings; 2.0 starts there.
- **Lumen's structure, not its implementation.** Traces that fall back by
  distance (screen space, then near geometry, then far), radiance caching
  so a pixel reuses light gathered nearby, and temporal reuse with
  denoising. Its software tracing relies on signed distance fields per mesh
  and a global one, too heavy for streamed, city-scale content in a
  browser; 2.0's equivalent is the probe GI on a BVH above, keeping the
  same fallback-and-cache structure.
- **Virtual shadow maps.** Very high resolution shadow maps split into
  pages, rendered only where the view needs them and cached until the
  geometry or the sun moves. A good fit for streamed 3D Tiles (a tile's
  arrival invalidates its pages only) and for the sun over a large scene;
  the likely target after cascaded shadow maps.
- **MegaLights.** Many shadowed lights sampled stochastically per pixel and
  denoised, rather than a shadow map per light: relevant for interiors with
  many luminaires (IES), later.
- **Substrate.** Materials as layers of slabs (coatings, films, subsurface)
  instead of a fixed list of shading models. 2.0's custom shading (after
  M4) should be able to grow that way, with glTF's metallic-roughness and
  KHR extensions mapping onto it.
- **Visibility buffer.** Nanite rasterizes triangle IDs and shades
  afterwards. 2.0 is already GPU-driven; a visibility buffer would also give
  the depth and normal prepass that screen-space GI and ambient occlusion
  need.

What doesn't transfer: hardware ray tracing (not in WebGPU), memory and
compute budgets sized for consoles and desktops, and baked lightmaps as the
default (content streams in, so baking is an option for static design
models only). Anything taken from Unreal is sized for a browser tab sharing
a laptop GPU.

## Physical lighting units

What sets 2.0 up for them, decided before the atmosphere is written:

- **Units inside the renderer.** Luminance in cd/m² (nits) in the HDR
  buffer; illuminance in lux; the sun's illuminance outside the atmosphere
  (about 128,000 lux; 1,361 W/m²) attenuated by the atmosphere's
  transmittance, giving about 100,000 lux at the ground with a high clear
  sun; sky radiance from the same model in the same units. Lights in glTF's
  units (candela, lux); emission in nits (`KHR_materials_emissive_strength`
  scales an authored color to nits). No unitless "intensity".
- **Pre-exposure.** A sunny day spans about 20 stops from night, and fp16
  stops at 65,504, so shading multiplies by the current exposure before
  writing the HDR target (Frostbite's and Unreal's approach); the exposure
  of the previous frame is enough. Without it, noon overflows or night
  quantizes.
- **A camera.** Exposure as EV100 (aperture, shutter, ISO) or automatic
  (a luminance histogram, with adaptation speed), plus exposure
  compensation; the present pass then applies the tonemapper (Khronos PBR
  Neutral, as now, which keeps base colors recognizable for design review;
  AgX or ACES optional) and the display encoding.
- **HDR displays.** WebGPU canvases can be configured for extended range
  (`toneMapping: { mode: "extended" }` with an `rgba16float` canvas):
  output in nits, tonemapped only to the display's peak.
- **Spectral where it matters.** The atmosphere computed spectrally, then
  converted to linear Rec.709 RGB (later Display P3 or Rec.2020), with white
  balance in the display transform.
- **Measurement tools.** The inspector reads a pixel's luminance (cd/m²) and
  a surface's illuminance (lux), with false-color views, as Radiance's
  `falsecolor` does: the check that the units are right, and a feature for
  design review.

Progress (r42): **tone mapping options**. `View.toneMapping`: "pbrNeutral"
(Khronos PBR Neutral, the default: authored colors kept up to about 0.8,
for design review), "agx" (Sobotka's AgX as Blender 4 and Filament ship it:
a filmic curve in Rec. 2020 that desaturates bright saturated light toward
white, lower contrast, middle gray to about 0.21) and "aces" (the curve 1.x
applies, Narkowicz's fit, for parity with 1.x's ACES). In Dyno's viewer
(Globe and rendering), and mapped onto 1.x's tonemapper there (1.x has no
AgX). A fuller ACES (the reference rendering transform with its gamut
matrices, Hill's fit) and an exposure-independent "look" (contrast,
saturation) are follow-ups.

## Lights beyond the sun: kinds, and how they scale (r42, design)

The sun is one directional light with cascaded shadow maps (above). The
rest, by kind:

- **Directional**: the sun, and the moon at night (about 0.25 lux full,
  through the same atmosphere tables; moon shadows from the same cascades).
- **Punctual**: point and spot lights, glTF's `KHR_lights_punctual` in
  candela (and lux for directional), so models and tiles bring their own.
- **Photometric profiles**: IES and EULUMDAT files (a luminaire's measured
  candela by direction) as a small 2D table per profile on a point or spot
  light: what lighting designers deliver, and what makes a facade or a
  parking lot read right at night.
- **Area lights**: rectangles, disks, spheres, tubes, shaded with
  linearly transformed cosines (Heitz et al. 2016: exact-looking specular
  and diffuse from polygonal lights for a few table lookups). Soft shadows
  need either shadow maps with filtering by the light's size or rays.
- **Emissive surfaces**: materials that glow (screens, signs, lit windows);
  they light the scene only through global illumination or stochastic
  light sampling, not as lights of their own.
- **Lights from data**: street lamps, building windows at night, vehicles
  (millions in a city, from OpenStreetMap or a city's assets), streamed
  with the tiles they belong to.

How they scale, in tiers that keep the forward MSAA renderer:

1. **Clustered forward shading** (Olsson et al. 2012; Doom 2016) for tens to
   thousands of lights: lights in a GPU table like draws, culled per view
   in compute into a froxel grid (the same froxels as aerial perspective's
   volume), each pixel looping over its cluster's lights. Unshadowed, or
   with shadow maps for a few chosen lights.
2. **Shadows for many lights**: one shadow map per light (six for a point
   light) doesn't scale. A shadow atlas whose pages are rendered by
   priority (screen coverage, intensity) and cached until the light or the
   tiles under it change, the per-light form of virtual shadow maps.
3. **Stochastic many-light sampling** (MegaLights in Unreal 5.5): per pixel,
   a few lights chosen by their contribution (ReSTIR's reservoir
   resampling, Bitterli et al. 2020, through a light hierarchy for
   importance), a shadow ray each, denoised over time. Cost is per pixel,
   not per light, so thousands of shadowed lights cost about what a few
   do. It needs what probe GI needs: a BVH of the world's triangles (rays
   in compute; WebGPU has no hardware ray tracing yet), temporal
   reprojection and a denoiser. Shared infrastructure, built once.
4. **Lights at city scale**: millions of lamps can't each be shaded. Like
   tiles, lights get levels of detail: near ones as lights (tier 1 to 3),
   farther clusters merged into one light (lightcuts, Walter et al. 2005),
   and the farthest only as their glow (emissive points under the bloom
   pass) with their light on the ground baked into a coarse irradance
   texture per tile from the data. Night views from the air are mostly
   that glow.
5. **Indirect light from all of them**: through the GI radiance cache
   (probe GI on the BVH, above), Lumen's structure: lights are gathered
   into probes once, and pixels reuse the probes, so bounced light doesn't
   multiply with the number of lights.

Order: the moon as a light, then `KHR_lights_punctual` with clustered
shading (unshadowed), IES profiles, an atlas of shadow maps for a few
lights, area lights, then the BVH, temporal accumulation and stochastic
sampling together with probe GI. Units throughout are photometric (lux,
candela, lumens), so the night exposure ([time-and-its-controls.md](time-and-its-controls.md)) and the false-color
illuminance view work unchanged.

## Scaling to the hardware

Both programmatically and with options, in layers:

- **Every feature has continuous knobs**: render scale of the expensive
  passes (ambient occlusion, GI, volumetrics at half or quarter
  resolution), sample counts, probe update rates, shadow resolution or
  virtual shadow page budget, froxel resolution, LUT sizes. Discrete
  switches (GI method: off, sky visibility, screen-space, probes) exist too
  but change rarely, because switching them is visible.
- **Tiers** (`low`, `medium`, `high`, `ultra`) are named sets of those
  knobs. An application sets a tier or individual knobs per engine and per
  view; anything it sets is never changed automatically.
- **`"auto"` (the default) chooses a starting tier** from what the adapter
  reports (vendor and architecture, limits, features such as subgroups,
  `shader-f16` and timestamp queries) and a short calibration on start: a
  known workload timed with GPU timestamps, cached per adapter so it runs
  once.
- **Then a frame-time controller adjusts the continuous knobs** from the
  per-pass GPU timings (the same budget idea as streaming's per-frame
  budgets, r38), with hysteresis so quality doesn't oscillate, and lowers a
  tier only after sustained overload (or a device loss or memory pressure).
- **Refine while still.** 2.0 renders on demand and knows when a view has
  settled. In motion it renders at the budget; once still, it keeps
  accumulating (more AO and GI samples, progressive shadows, eventually the
  path tracer) until the image converges to the reference, then stops
  rendering. A laptop and a workstation then show the same final image of a
  design model, only at different speeds.
- **Deterministic for tests and benchmarks.** The benchmark suite and the
  parity harnesses pin a tier (no `"auto"`, no controller), so runs stay
  comparable; the suite measures each tier separately, and tiers get
  budgets in the catalog ([benchmark-suite.md](benchmark-suite.md)).

## Order of work in M4

1. References first: the brute-force atmosphere and the Monte Carlo IBL
   integrator, with numeric tests.
2. Units, pre-exposure and the camera (EV100, automatic exposure), so
   everything after is written in nits and lux.
3. Hillaire's LUTs, checked against the reference; the sky and the sun
   disk.
4. Environment lighting from the atmosphere at the content's position and
   time (radiance cube, SH, specular), checked against the Monte Carlo
   reference, then intent parity with 1.147.
5. Aerial perspective and weather haze; fog-aware detail.
6. Shadows and ambient occlusion (GTAO with bent normals, the first GI
   step); then the daylighting sky, probe GI, clouds and the rest.

Progress (r42): **the sun's shadows**, cascaded shadow maps
(`View.shadows`; on in the `Viewer`, off by default in the engine so the
harnesses that compare with 1.x, which draws none, stay as they are). Four
cascades of 2048² (depth32float, one array), fitted per view per frame
(scene/shadows.ts): splits blending logarithmic and uniform (λ 0.9) out to
20 times the camera's height above the ground (200 m to 150 km, so a street
and a mountain range both get useful cascades), each slice in a bounding
sphere (its size independent of the camera's direction) seen from the sun
orthographically, centers snapped to a texel grid fixed to the ground (no
crawling edges), depth reaching 30 km or more toward the sun (mountains
outside the view cast into it at a low sun). Camera-relative throughout,
as the engine draws. Each cascade is a view block like the camera's (the
sun's projection, its box as the five culling planes), so it goes through
the same GPU culling and the same batches: per cascade the world is culled
to the box and its casters drawn from a depth-only bundle (no fragment
stage, so depth is tested before shading; a fragment stage only for
alpha-masked materials, which discard). The opaque pass picks the cascade
by view depth and takes 3 × 3 bilinear comparisons (an edge about three
texels wide), the receiver offset along its normal by 1.5 texels, plus a
slope-scaled depth bias on the casters; shadows fade out over the last 15%
of their distance. Cost in the Alps at 4.5 km, 2.6 megapixels with 4×
MSAA (RTX 3000 Ada laptop): about a fifth of the frame (the four cascades
plus their lookups in the opaque pass), half what the first try cost, which
ran a fragment stage for every caster. (Those timings were taken with idle
gaps between frames, which let this laptop's GPU clock down: absolute
times measured that way run several times high. Back to back, the synthetic
city's whole frame with shadows and ambient occlusion is 1.3-1.8 ms.) Limits and next steps: mixed-LOD
placeholders cast unclipped where they're not alpha-masked (coarse and
fine tiles cast nearly the same shadow); far cascades could update every other frame or
cache until the sun or the tiles move, leading to virtual shadow maps
(pages rendered where the view needs them and cached, a good fit for
streamed tiles); shadows from the clouds later (the Moon's: r43, with the night sky).
Measured on the way: the aerial-perspective volume's compute looked like
1 ms (1,024 threads each marching 256 steps), and the opaque pass in a
close oblique terrain view about 9 ms at that size, mostly the lighting
the imagery now gets (it took the unlit path before); both measured with
idle gaps between frames, where this laptop's GPU clocks down. Back to
back, the volume took 0.20 ms; with a thread per slice and a prefix scan
(r43) it takes 0.07 ms.

Cascades blend (r43): over the last tenth of each cascade, receivers mix
its light with the next's, whose sphere reaches back over that band, so no
seam shows where the texel size (and the bias with it) changes; the second
lookup runs only in the bands.

Progress (r42): **ambient occlusion** (`View.ambientOcclusion`,
`ambientOcclusionRadius`, default 3 m; on in the `Viewer`, off by default
in the engine like shadows). GTAO (Jimenez et al. 2016, in the form of
Intel's XeGTAO, ao.wgsl) from a **depth and normal prepass**: after the
view's cull, a single-sampled pass draws the same batches (the casters'
vertex stage, without aerial perspective; the opaque pass's discards) into
depth and normals. At half resolution, two slices per pixel at angles from
interleaved gradient noise, six steps a side, the horizon on each side
within the radius (a falloff over its outer 60%), the cosine-weighted
visible arc integrated exactly; then per full-resolution pixel a
depth-aware 3 × 3 of the half-resolution result, upsampling and blurring
the noise at once, packed 8 bits a pixel into a buffer the opaque pass
reads (one global buffer, rewritten per view like the shadow maps, so the
recorded bundles never need a per-view binding; up to 4096 × 4096). In the
opaque pass it occludes the environment's light only: the diffuse through
Jimenez's multi-bounce fit on the surface's diffuse color (bright surfaces
lose less), the specular through Lagarde's specular occlusion. In the
synthetic city at 2.6 megapixels: the prepass about 0.1 ms, the trace
about 0.2 ms, the blur about 0.35 ms (back-to-back frames; full resolution
with a 5 × 5 blur was three times that). It is subtle in daylight, where
the sun dominates, and shows in shade, at building bases, in corners;
from far above, a radius of meters covers less than a pixel and it fades
out. Next: bent normals (the environment sampled in the unoccluded
direction), larger-scale sky visibility for terrain (valleys under ridges,
from the height field rather than the screen), and the visibility-bitmask
extension for one bounce of screen-space indirect light (SSILVB).

**Why a depth and normal prepass rather than a visibility buffer.** A
visibility buffer (Burns and Hunt 2013, Nanite's) rasterizes triangle IDs
and depth, then shades per pixel from them. For ambient occlusion and
other screen-space passes what's needed is depth and normals before
shading, which the prepass gives directly. The visibility buffer's other
half, deferred material shading, still waits on bindless textures ([risks.md](risks.md), "Bindless textures: not in the PoC, designed for in 2.0":
the material pass must reach every visible tile's textures), and writing
triangle IDs needs the `primitive_index` builtin, an optional WebGPU
feature not yet everywhere. The prepass draws from the same GPU-culled
batches the opaque pass does, so a visibility buffer can replace it later
without changing anything downstream: the prepass's targets are what the
AO, and later SSR and screen-space GI, read.

Progress (r40): **the atmosphere reference** (`src/atmosphere/`, Lab
"Reference atmosphere", `bench/run.mjs atmosphere`). A spectral Monte
Carlo volumetric path tracer in a compute shader: spectral tracking (four
wavelengths per path, Kutz et al. 2017), ratio-tracked transmittance toward
the sun, Rayleigh, aerosols (Cornette–Shanks) and ozone, a Lambertian
ground, any altitude; positions in a frame where heights above the sphere
have no cancellation. Bruneton's 2017 Earth parameters and spectral tables
(BSD-3-Clause, credited in `LICENSE.md`). Checked two ways: the CPU model
in double precision gives the photometric scale (132.5 klx outside the
atmosphere, 115 klx direct at sea level with the sun overhead, unit tests),
and the path tracer limited to one scattering event agrees with the CPU's
deterministic single-scattering integral within its own noise (six views,
256 independent estimates each, worst |z| 1.95). Full result, sea level:
zenith 1,440 cd/m² with the sun at 45°, multiple scattering 5% to 23% of
the zenith sky, diffuse horizontal illuminance 7.5 klx (this atmosphere's
aerosols are very thin, optical depth 0.005; turbidity is a parameter).

**The image-based lighting reference** (`src/lighting/`, Lab "Image-based
lighting vs reference", `bench/run.mjs ibl`): material balls (a dielectric
and a metal, roughness 0.05 to 1) rendered by 2.0 and by Monte Carlo
integration of the glTF BRDF under the same environment cube (cosine and
visible-normal sampling, balance heuristic, 1,024 samples per pixel),
compared on 2.0's linear HDR image, which views can now read back
(`View.readHdr`). Against the default sky, 2.0's spherical harmonics, split
sum and prefiltered specular are within 0.1-2.7% of the exact integral for
dielectrics and within 2.3% for metals up to roughness 0.35. Rougher metals
are brighter by design: in a white furnace a white metal reflects exactly
1.0 in 2.0 at every roughness (Fdez-Agüera's compensation), where the
glTF BRDF's single scattering keeps 0.37 at roughness 1. Measuring how much
energy compensation is right for colored metals needs a multiple-
scattering reference (Heitz et al. 2016), a follow-up. The procedural
sky's darker band below the horizon is now an explicit `belowHorizon`
option (default unchanged), so a furnace can be uniform.

**Physical units, the default** (r40). Light is in photometric units: the
sun's illuminance in lux (`ViewLighting.sunIlluminance`, default 100 klx
until the atmosphere supplies it), the sky in cd/m² (the procedural
gradient scaled to about 13 klx diffuse horizontal until the atmosphere
replaces it), and views expose with a camera: `exposure: { ev100: 15 }` by
default, `{ scale }` for unitless scenes, or `{ auto: true }` (a meter over
a 64 × 64 grid of the HDR image, reflected-light constant K = 12.5,
adaptation per second, background left out; the first reading is taken as
is). Shading pre-exposes (light × exposure is written, so fp16 neither
overflows at noon nor quantizes at night); present only tonemaps; glTF
emission is display-relative (added after exposure) until emission gets
units; `View.readHdr` returns cd/m². Checked: a ground patch of albedo 0.3
under the overhead sun reads 10,835 cd/m² (predicted 10,800 with the
sky), automatic exposure settles at EV100 16.4 (the meter's value, an
exposed mean of 0.104) and eases to 13.4 in about 2.5 s when the sun sets.
Everything compared with 1.x frame for frame stays in 1.x's unitless terms
(`UNITLESS_EXPOSURE`, `UNITLESS_SUN_ILLUMINANCE`, `UNITLESS_SKY`): the
parity harnesses (image, models, tilesets, imagery, globe: bit-identical
results) and the benchmark suite's 2.0 adapter (filmstrip FLIP against
1.147.0 unchanged). Dyno's Viewer keeps its 1.x-style sliders, mapped to
physical units for 2.0 (sun 2 is 100 klx, exposure 1 is EV100 15).

**The real-time atmosphere, first tables** (r40; `src/atmosphere/`, Lab
"Real-time sky vs reference", `bench/run.mjs sky`): Hillaire's
transmittance (256 × 64) and multiple-scattering (32 × 32) tables built on
the GPU from the reference's parameters, and a ray-marched sky from them,
checked against the spectral reference in cd/m². At three wavelengths
(Bruneton's real-time colors) the sky was 20-40% off near sunset and in
twilight; that was the three-wavelength color model, not the tables (the
CPU's single scattering at the same three wavelengths had the same
errors). It now computes at 8 wavelengths (bands of 50 nm over 380-780,
two passes of four, each band weighted by the solar spectrum through the
CIE functions, within 0.5% of the full spectral luminance): daytime probes
within about ±7%, the whole sky within 2-5%, sunset within -7%..-1%, 10 km
within ±4%; twilight (sun 3° down) +6% over the whole sky with the
dimmest directions +10-50%, where Hillaire's isotropic multiple
scattering is weakest (a refinement for later). Next: the sky-view table
and drawing the sky and the sun's disk, then the environment lighting and
the sun's illuminance from the atmosphere (replacing the procedural sky
and the fixed 100 klx), then aerial perspective.

**The sky in views** (r41; `src/atmosphere/Sky.ts`, `sky.wgsl`). Views draw
the real-time atmosphere behind the scene by default (`View.background`
"atmosphere"; "color" keeps `clearColor`), with the sun's disk (its real
angular size, 0.53°, limb darkening, seen through the whole atmosphere;
`View.sunDisk` turns it off). Drawn inside the opaque pass after the scene:
a fullscreen triangle at the far plane where the depth is still the cleared
0 (reverse-Z), once per group of four wavelengths, added up, alpha 1 so the
exposure meter counts the sky. The camera sits on the atmosphere's sphere at
its height above the ellipsoid, along the ellipsoid's normal, so horizon and
light are local anywhere on the globe. Checked in the Lab page's new "In the
engine" section: the engine's center pixel against the tables' own probe in
the same direction within 0.1% (noon, sun 20°, 5°, 0°, 4° below, 10 km,
2,000 km), with pictures from the ground through twilight to orbit. Parity
harnesses and the benchmark baseline pin `background: "color"`
(bit-identical to before). Cost: a per-pixel march (32 steps, two groups),
1.3 ns per pixel on an RTX 3000 Ada laptop GPU, about 2.7 ms at 1080p:
the sky-view table (Hillaire's 192 × 108 latitude-longitude sky around the
camera, per frame) is the next step and should cut it to a few hundredths
of a millisecond. The scene's light doesn't follow the sky yet (a sunset
sky over a noon-lit city) until the sun's illuminance and the environment
come from the atmosphere.

**The sky-view table and the sun's light** (r41). Inside the atmosphere
the sky now comes from Hillaire's sky-view table, rendered per view per
frame (192 × 108 directions by zenith angle and azimuth from the sun, rows
packed toward the horizon, columns toward the sun, both wavelength groups
added into one linear sRGB target, pre-exposed), with an extra row for the
sun's radiance through the atmosphere; the sky pass is one lookup per pixel
plus the sun's disk, and lookups stay on their side of the horizon. Above
the atmosphere each pixel still marches (rays that miss the atmosphere
return at once). Against the per-pixel march in the same directions (Lab,
a 16 × 9 grid per shot): sky pixels within 0.2% median and 0.9% worst in
every shot; the bare planet's ground below the horizon differs more at
sunset and twilight (median 6-14%, where its radiance falls by 10⁴ within a
pixel of the horizon), which the globe covers in a scene. Cost at 480 × 270
fell from 0.166 to 0.046 ms, nearly all of it the table (fixed per view).

The scene is now lit by **the sun's light through the atmosphere, per
pixel** (`ViewLighting.sunIlluminance: "atmosphere"`, the default; a number
is still a white sun, lux or unitless). A 256 × 64 table of the sun's
illuminance on a surface facing it, by altitude and the sun's zenith cosine
(packed toward sunsets and low altitudes, with the part of the disk above
the horizon as it sets), built once from the transmittance tables at the 8
wavelengths, in linear sRGB lux; the opaque pass reads it at each pixel's
height above the ellipsoid and the sun's angle to its normal, so mountain
tops keep the sunset after the valleys lose it, and the terminator seen
from orbit is colored. Against the CPU model's direct sunlight (81
wavelengths, double precision) at 0, 2 and 10 km and sun elevations from
90° to 2°: within 0.4% everywhere (115.0 klx at sea level with the sun
overhead, 12.8 klx at 2°, color from white to deep orange). Dyno's Viewer:
"Sunlight from the atmosphere" (on by default), the lux slider otherwise.

**Environment lighting from the atmosphere** (r41;
`ViewLighting.environment: "atmosphere"`, the default; "procedural" keeps
`Engine.environment.setSky`'s gradient, which the 1.x parity harnesses pin).
Each view has an environment probe: its sky rendered into a 128² cube in
the environment frame at the camera (the per-pixel march, cd/m², no sun
disk), then its mips, GGX-prefiltered specular cube and irradiance, rebuilt
when the sun moves about 0.1° in the view's local frame (13 km along the
ground) or the altitude 10% (500 m and below count as 500 m), and copied
into the bound environment before the view's draws (`Environment.select`,
skipped when already there). A body without an atmosphere gets a black
environment.

**Diffuse light from an irradiance cube, not SH9.** The atmosphere showed
what SH9 can't do: against the cosine-weighted integral of the sky's own
radiance over the hemisphere, the engine's SH (equal to an exact CPU
projection within 0.1%, so the pipeline is right) is 3-6% high on a
horizontal surface at the ground under a clear sky, 30% high at 10 km, and
from orbit rings into negative colors (3.9 lux and a negative blue where
the answer is 0), because nine coefficients can't hold a sharp horizon
between a dark sky and a bright planet. Unreal's sky light has the same
limit. Diffuse IBL now reads a 32² irradiance cube: the brute-force cosine
integral of the radiance cube's 16² level (1,536 texels per output texel),
within 0.4-1.4% on the ground, 3.9% at 10 km, exactly 0 from orbit. SH9 is
still computed for reading back and the intent-parity statistics against
1.x. Effects elsewhere: the IBL reference page unchanged (dielectrics within
0.1-2.7% of Monte Carlo, the furnace at 0.9998); the models parity
harness's `ibl-diffuse` mode, which compares with 1.x's SH9, moved by
+0.001 to +0.006 mean FLIP (a deliberate divergence); everything else
bit-identical.

Cost of a rebuild. Measured as separate submits it looked like 10 ms (sky
cube 1.5, mips 0.6, specular prefilter 5.4, SH 0.2, irradiance 2.5), most of
it the GPU idling between a dozen small submissions. Rebuilds are now
encoded in the frame's own command encoder, in a graph pass after the
view's sky-view table, and inside the atmosphere the cube is a lookup per
texel in that table (Unreal's sky light capture) instead of a march, with
the same accuracy (horizontal irradiance within 0.4-1.5% on the ground,
3.9% at 10 km). A 1080p frame of the sky costs 0.64 ms on the GPU, 1.85 ms
when the environment is rebuilt in it: about 1.2 ms per rebuild, affordable
every frame while scrubbing time ([time-and-its-controls.md](time-and-its-controls.md)), so the prefilter keeps its 256
samples. Spreading a rebuild over frames stays available if it's needed on
smaller GPUs.

**Aerial perspective** (r41, reworked in r42; `View.aerialPerspective`,
default on with background "atmosphere"). Each froxel or vertex holds the
light the air scatters toward the camera up to its distance (linear sRGB,
cd/m², pre-exposed: haze toward the sun passes fp16's range) and the
transmittance (each channel the 8 bands' average weighted by their color),
marched with the transmittance and multiple-scattering tables. The opaque
pass applies it: lit × transmittance + in-scatter, emission dimmed too. It
replaces 1.x's ground atmosphere and `Fog` for scenes, and the haze meets
the sky at the horizon without a seam (the same atmosphere, the same
tables). Two ways to evaluate it, by the camera's altitude:

- **Near the ground: Hillaire's froxel volume.** 32 × 32 screen directions
  × 128 distances, the same distances for every ray (spaced quadratically
  from the camera, or the atmosphere's nearest point from above it, to its
  far edge past the horizon), built per view per frame by a compute shader:
  a workgroup per column and a thread per slice, each marching its own
  interval (two steps), then a parallel prefix scan in workgroup memory
  chaining the intervals front to back, so each slice is the one before
  plus one interval, as one thread marching the column whole wrote them
  (that left 1,024 threads, 0.20 ms; the scan takes 0.07 ms), one
  dispatch per group of four wavelengths (the second adds
  the first's share). Rays go on through the planet's sphere at its
  surface's air (the scene's surface, the WGS84 ellipsoid or terrain, is
  above it). Each of those choices fixed a banding seen while zooming: rays
  with their own spans put different distances side by side (bands at the
  volume's row spacing); slices marched independently each carried their
  own step error (ripples across the terrain); rays stopping at the ground
  ended their haze at different distances (a step between rays); 32 slices
  over the 1,750 km a high camera sees were too coarse where a ray reaches
  the ground. Checked in the Lab against the tables' own march along the
  same ray to the same distance: median 0.09-0.48%, worst 1.8%, from noon
  to twilight.
- **From higher up: a march per vertex.** From a few kilometers up, at the
  same distance, two neighboring rows' rays are kilometers apart in height
  where they near the ground, where the haze changes fastest:
  interpolating between them drew stripes at the volume's row spacing
  (doubling the rows halved their spacing, which confirmed it). No slicing
  of a screen-space volume fixes that. Above 5 km each vertex marches its
  own ray instead (the opaque vertex shader: 24 steps packed toward the
  vertex, where the air is densest, both wavelength groups at once), as 1.x
  lights distant ground atmosphere; between 2 and 5 km the two blend, and
  above 5 km the volume isn't built. Per pixel the same march cost 4.5 ms
  at 2.6 megapixels (an RTX 40-series laptop GPU); per vertex the whole
  Alps view from 60 km takes 2.6 ms of GPU, against 2.7 ms with the volume.
  Checked in the Lab: the march against the volume, both forced on the same
  frame from 1 km up, median 0.08%, 95th percentile 0.28% over the ground's
  pixels; both within about 1% of the tables' march on the bare ellipsoid.
  Limit: haze interpolates linearly across a triangle, so a large face seen
  from high up (a model's ground plane) gets a smooth approximation.
  Each step's air is at its height above the ellipsoid and its sun angle
  to the ellipsoid's normal, as the ground's sunlight reads its table. At
  first the march used the volume's sphere, which is placed to meet the
  ellipsoid under the camera and is up to 20 km off it across the globe.
  From orbit over the equator, the east and west limbs got under half the
  haze of the north and south (the ground there is 18 km above the
  sphere's surface, in thin air), and the pattern moved with the camera.
  Now the four limbs agree within 10%, from over the equator to 45° S.
  The sky from above the atmosphere had the same flaw: its glow along the
  planet's edge sank behind the ground at the equator and stood off it at
  the poles (2 px each way from 18,000 km). It is now marched in the space
  where the ellipsoid, scaled per axis, is the ground sphere: a linear map
  keeps tangency, so the edge is the ellipsoid's exactly; the shell's
  thickness changes by 0.3% at most, angles by 0.2°. No jump where the sky
  switches from the table (below 99 km) to the march; the Lab's orbit row
  probes in the same space (median 0.0%, worst 8.4%).

Haze within a few hundred meters is coarse in the volume (the first slices
fade in from none); fine for haze, coarse for weather fog (the "weather
haze" medium, an analytic exponential, is the follow-up for that). Other
ways to remove interpolation artifacts, if they come back: jittering the
volume's samples with temporal accumulation (Frostbite's and AC4's
volumetric fog; needs temporal reprojection), and a reduced-resolution
march with depth-aware upsampling (once depth comes before shading: a
visibility buffer).

**Haze: visibility and kinds of aerosols** (r42). `Engine.visibility`
(km, meteorological visibility, default 60) sets the aerosols' amount:
extinction at 550 nm is 3.912 / V (Koschmieder), the aerosols' share what's
left after Rayleigh's. `Engine.aerosol` sets what they are: continental
(default), urban, maritime or desert dust, each with an Ångström exponent,
single-scattering albedo and asymmetry after the OPAC climatology, and a
typical scale height (sea salt stays in a shallow marine layer, dust is
lofted kilometers up). Bruneton's reference Earth is gray aerosols at about
220 km. Changing either rebuilds the atmosphere's tables, the sun-light
table and every view's environment (a few ms, once). Seen from the ground
the kinds differ most around the sun (measured near Geneva at noon, the
halo 3-8° from the sun: 26,600 cd/m² in red for maritime, a white halo;
19,400 for desert; 14,200 for continental, bluish; 11,900 for urban, whose
soot absorbs) and by about 5% toward distant mountains. Seen from above
they barely differ (1-2% from 60 km over the Alps): the aerosols are in the
lowest kilometer or two, below the camera and mostly below the Alps, and
only lofted dust reaches high enough to change much. Visibility is the
control with the most visible effect. Dyno's viewer has both (Lighting).

**Correction (r42): globe imagery wasn't lit.** r40 decided imagery is lit
by the sun and sky, and r41 described it as lit, but `GlobeImagery` still
drew it unlit (1.x's way): terrain looked the same at noon and at night,
aerial perspective had no visible effect on the globe, and automatic
exposure misbehaved. Now `GlobeImageryOptions.lit` (default true); the
imagery parity harness and the benchmark suite pin `lit: false`, which
checks decoding against 1.x.

**The Viewer's first frames** (r42) drew with the camera at the Earth's
center, before the app framed anything (a flash of haze at nonsense
distances). It now starts on the whole Earth, as 1.x does.

**How the sun looks** (r41). At ordinary fields of view the disk is 3 to 4
pixels across, so its edge is antialiased by each pixel's coverage. Its
luminance (about 1.6 × 10⁹ cd/m² overhead) is far beyond any exposure that
shows the sky: pre-exposed at EV100 15 it reaches fp16's range and is
clipped (to 30,000 per group), losing the limb darkening and part of its
energy, and tonemapping turns it into a small white dot. What makes the
sun read as the sun in a photograph or to the eye is glare, not the disk:

- **Glare from the sun's energy, analytically.** The sun's illuminance at
  the camera (through the atmosphere) is known exactly, so a post pass adds
  its point-spread function (a camera's or the eye's: a narrow core and a
  wide, faint halo, Spencer et al. 1995) centered on its position, scaled by
  the fraction of the disk that is visible (sampled from the depth around
  it: buildings, terrain, the moon). Exact energy without relying on
  clipped pixels, and the glare dims smoothly as the sun sets behind a
  ridge. The general bloom pass (energy-conserving, Unreal and Frostbite
  style) handles everything else bright.
- **Lens effects as options**: diffraction spikes from an aperture shape,
  ghosts and flares. Looks, not physics; off by default.
- **Eclipses.** The moon's disk (from the ephemeris, at its real angular
  size, or its tileset, [bodies-frames-and-engineering-coordinates.md](bodies-frames-and-engineering-coordinates.md)) covers the sun's: the visible fraction of
  the disk, computed per sample point along the sky's march, scales the
  sunlight, so the umbra's 100-odd km darkens the sky overhead while the
  horizon stays lit from outside it (the 360° sunset of totality) with no
  special case. The sun's illuminance on the scene follows the same
  fraction. **The corona** is about a millionth of the disk's luminance,
  visible only in totality: an emissive radial profile (K and F corona,
  falling roughly as r⁻² to r⁻⁶, with streamers as a texture), invisible at
  any other time because the exposure never opens far enough, which is
  exactly what happens with a real camera. Baily's beads and the diamond
  ring come from the moon's limb profile (its terrain).

**Regressions fixed on the way** (r40): wheel zoom slid sideways in split
view (zoom leveled the camera after pinning the target under the cursor;
from b9166e4adf), and the inspector's load time never ended under
photorealistic tiles (it waited for the hidden globe). (r41) The world's
materials table was 64 KB on the GPU while its CPU mirror grew (from
ececae914a): more than 1,024 materials failed every upload. Wheel zoom with
no pick under the cursor aimed at the ellipsoid under it: with terrain below
the ellipsoid (a negative geoid, Philadelphia's ~-33 m) a camera near the
ground is inside it and the ray met it on the far side of the Earth, so one
notch out left for orbit; toward the horizon, a notch moved by a share of
thousands of kilometers. Now the ellipsoid counts only within 20 times the
camera's height above the ground, else the zoom starts on a point on the
cursor's ray at that height (1.x's rule over the sky), and a pick is pulled
at the cursor at once (a wheel can come without pointer moves: an unfocused
window, or the cursor arriving with it) and replaces it when it lands. And a zoom keeps aiming at what is drawn under
its pixel now (a fresh pick each frame while it moves): the target picked
frames ago, on a coarse tile or the ellipsoid under terrain still loading,
made the ground slide sideways past it as finer tiles came in. Seen from
far away, the atmosphere's rim (a pixel or less) is now sampled with 8 rays
across its width.

**Next phase after lighting: visual regression tests.** Golden images
for canonical scenes and lab pages (2.0 against its own approved images,
separate from parity with 1.x), FLIP-thresholded, run with the lab runner
and on demand from Dyno, with approving a new golden as an explicit step.
Both regressions above would have been caught by a scripted interaction
(zoom toward a point in split view) plus an image or numeric check.

Decided (r40):

- **Exposure**: a fixed daylight EV100 by default (about 15, the "sunny 16"
  rule), with automatic exposure as an option.
- **Globe imagery is lit by the sun and sky** by default (2.0's globe
  material already is; 1.x's isn't). Imagery has no physical units: tiles
  are 8-bit sRGB, display-referred photographs or composites, color balanced
  and contrast stretched for appearance, with the capture's sun shading,
  shadows and haze baked in. 2.0 decodes them with the exact sRGB curve and
  uses the result as the surface's albedo, an estimate. So the lit globe
  needs a calibration (scaling imagery to plausible albedos: land averages
  about 0.1 to 0.3) and care with double shading (terrain normals add only
  the low-frequency shading the imagery lacks). Imagery published as
  surface reflectance (Sentinel-2 L2A, for example) would be true albedo.
  The exact-parity tier keeps an unlit mode, which checks decoding against
  1.x.
- **No equivalents** of 1.x's environment color processing (brightness,
  saturation, gamma, HSB shifts) for now.
