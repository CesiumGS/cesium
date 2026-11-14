# Colour in the styling language (owner, 2026-11-08)

**What this holds:** How colour works in the styling language (owner, 2026-11-08). Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

**Decided.** CSS notation (`#ff8800`, `rgb()`, `hsl()`, named colours) is sRGB, as CSS defines it, and is converted to linear where it enters the style. Shading stays linear. An opaque, unlit colour therefore looks as written and matches 1.x. Numeric values such as `vec4(...)` stay raw linear.

**For the styling spec work, with the vector language's other changes.** An explicit colour space. CSS Color 4 already has syntax for it (`color(srgb-linear 1 0.5 0)`, `color(display-p3 ...)`), which can pass through the existing `color('...')` string without new grammar, and brings wide-gamut colours with it. Not built.

**Differences from 1.x to document.** Blending happens in linear, so `colorBlendMode: "mix"` and translucent colours differ from 1.x even with matching inputs. This is deliberate (owner, 2026-11-08): 1.x's blending is known to give incorrect results, so 1.x isn't the oracle for blended colours, and parity cases should expect the linear result. `vec4` colours are linear in 2.0, and plain numbers in 1.x.
