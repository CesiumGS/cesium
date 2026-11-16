# Color in the styling language (owner, 2026-11-08)

**What this holds:** How color works in the styling language (owner, 2026-11-08). Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

**Decided.** CSS notation (`#ff8800`, `rgb()`, `hsl()`, named colors) is sRGB, as CSS defines it, and is converted to linear where it enters the style. Shading stays linear. An opaque, unlit color therefore looks as written and matches 1.x. Numeric values such as `vec4(...)` stay raw linear.

**For the styling spec work, with the vector language's other changes.** An explicit color space. CSS Color 4 already has syntax for it (`color(srgb-linear 1 0.5 0)`, `color(display-p3 ...)`), which can pass through the existing `color('...')` string without new grammar, and brings wide-gamut colors with it. Not built.

**Differences from 1.x to document.** Blending happens in linear, so `colorBlendMode: "mix"` and translucent colors differ from 1.x even with matching inputs. This is deliberate (owner, 2026-11-08): 1.x's blending is known to give incorrect results, so 1.x isn't the oracle for blended colors, and parity cases should expect the linear result. `vec4` colors are linear in 2.0, and plain numbers in 1.x.
