# Sketch: a gallery example for the sun and sky model (owner, 2026-11-08)

**What this holds:** A gallery example sketch for the sun and sky model (owner, 2026-11-08). Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

A Dyno example of beauty shots with presets, showing off the physical sky and driving the features it needs. A sketch, not a plan.

**A preset is data:** a place, a time, a lens and camera, the air (aerosol type and visibility), a look (eye or camera), and content. Times are solved rather than typed where they can be: the Sun's azimuth along Manhattan's grid gives Manhattanhenge's dates, checked against published ones. Each preset shows what's real about it, what's modelled and what isn't, in keeping with the handbook's rule.

**Shots to try (dates and facts to confirm from sources):**

- **Sunrise and sunset:** Manhattanhenge, Stonehenge's solstice sunrise, Angkor Wat at the equinox, the Grand Canyon, alpenglow on Everest.
- **The air:** one place across the aerosol types (continental, urban, maritime, desert) and a range of visibility: a clean mountain morning, a hazy city, a desert dusk, a sea sunset. The Belt of Venus and the Earth's shadow at twilight.
- **The Moon:** a moonrise behind a skyline through a long lens, with its true size.
- **Eclipses (owner):** a total solar eclipse from the ground, with stars and the Moon's shadow; the same shadow crossing the Earth from orbit; an annular eclipse; a total lunar eclipse, the Moon lit red by every sunset on Earth at once. Real dates from the ephemeris. The research found the zenith two to three orders too bright with today's sky terms, and the lunar one needs light refracted through the Earth's atmosphere, so both need work of their own.
- **Astrophotography:** the Milky Way's core over a dark site, Orion with a planet, the zodiacal light, star trails.
- **From space:** Earthrise (Apollo 8, 1968), the Blue Marble, the limb with airglow, the terminator over mountains, city lights from orbit, and Artemis II's views, whose trajectory we already have.
- **Balloons:** a mass ascension at sunrise, in the manner of the Albuquerque International Balloon Fiesta: Cesium's balloon model instanced by the hundreds at varied heights and tints, over the Rio Grande valley with the Sandia Mountains behind, in low golden light with long shadows. Also Cappadocia. It shows instancing, shadows and the air together.
- **Aurora:** from the ground and from orbit.

**What it needs:**

| Feature                                | Where                                                                                                     | Why                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Moon tileset loading                   | 5c                                                                                                        | Earthrise, lunar sites                                                                            |
| Camera moves, long lenses, preset rigs | 5d                                                                                                        | Moving between shots, the Moon's size                                                             |
| Planets, the shutter                   | 5e, [2026-11-08-owners-calls-for-later-plans.md](../decisions/2026-11-08-owners-calls-for-later-plans.md) | Astrophotography. Stars, the eye and camera looks, and glare are built (sky and observer plan)    |
| Glare and sun glint                    | [water-and-sun-glare.md](water-and-sun-glare.md)                                                          | Sunsets, the sun itself                                                                           |
| Water, reflecting the sky              | [water-and-sun-glare.md](water-and-sun-glare.md)                                                          | Sea sunsets, reflections                                                                          |
| A wider ephemeris pack                 | Data                                                                                                      | The pack covers 2000 to 2050, and Earthrise and the Blue Marble are earlier; `de440s` covers them |
| Clouds, at least a 2D layer            | Not planned yet                                                                                           | A sunset without clouds is a thin picture                                                         |
| Crepuscular rays                       | Volumetric fog, later                                                                                     | Optional                                                                                          |
| Aurora                                 | New module                                                                                                | Below                                                                                             |

**Aurora, a first idea.** Emission only, with no scattering to solve, so it's cheap: a compute pass evolves a 2D field of curtains around the geomagnetic oval, and the sky marches a shell from 100 to about 300 km through it in a constant number of steps, at reduced resolution, adding green low (557.7 nm oxygen), red high (630 nm oxygen) and a purple lower edge. The air's transmittance dims it, and it's in cd/m² under the same exposure. A self-contained module, loaded only when used.

**Limits to keep in mind:** Google's tiles are live-stream only here: publishing images isn't cleared, so presets using them stream with attribution and no stills go in the handbook. Sky data follows the R&D rules in [2026-11-08-owners-calls-for-later-plans.md](../decisions/2026-11-08-owners-calls-for-later-plans.md). Content for specific sites needs its own license check.

**Clouds are in scope (owner, 2026-11-08),** and need a design of their own: a sunset's look comes from clouds lit from below by a low sun, which a 2D layer can't show well.

**Cloud types (owner).** The gallery wants many looks, so a preset needs to name what's in the sky: WMO's genera and useful species, at altitudes and with structure that's right for each. Research is under way, on how production systems encode type and which clouds need another method, such as thin ice clouds. Report: `.superpowers/reports/Clouds and crepuscular rays.md` (untracked).

**Fog (owner).** Today the sky has haze only: one aerosol layer with an exponential profile (scale height about 1 km), set by visibility and type. The plan's "weather haze" isn't built. Real fog differs: droplets scatter nearly neutral light, a fog layer has a top, it sits in terrain, and at under 1 km visibility multiple scattering dominates, which the sky model isn't checked for. Three cases to try, to be designed with clouds: thin mist or dust as a spectrally flat medium in the march; a layer with a sharp top, following an inversion, for a marine layer; and valley fog as cloud at ground level, sharing the cloud function, using height above the terrain. Shots: a sea of fog with peaks through it, a marine layer through a bridge, shafts through forest mist.

**Shutter time, for star trails and more.** `View.exposure` today is one number, with no notion of duration, so a long exposure needs a camera shutter with a length. How to draw it is undecided: accumulating renders in HDR across the shutter is the physical path and takes many renders, and drawing arcs analytically is cheap but the owner doubts it's physical and expects it to interact poorly with the rest of the system. Think it through when 5e gets there. Real-time motion blur from a velocity buffer is a separate effect ([custom-post-processing.md](custom-post-processing.md)).

**Order:** a first slice can use what exists today (sky, aerosols, visibility, Moon and its phase, moonlight, city lights, exposure, solved dates). The rest grows as 5c, 5d, 5e and water land. Clouds and aurora are decisions of their own.
