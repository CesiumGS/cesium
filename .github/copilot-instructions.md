# CesiumJS Copilot Code Review Instructions

When reviewing PRs, apply the [Coding Guide](../Documentation/Contributors/CodingGuide/README.md) and [Code Review Guide](../Documentation/Contributors/CodeReviewGuide/README.md).

## General

- Review the big picture first — design, architecture, and impact before line details.
- Flag `TODO` comments and commented-out code — these must be removed before merging.
- Verify `CHANGES.md` is updated for any public API additions or removals.
- New features and bug fixes must include unit tests.
- Verify CI checks (ESLint, build, tests) pass.

## Naming

- Directories and constructors: `PascalCase` (e.g., `Cartesian3`, `Source/Scene`).
- Functions and variables: `camelCase`. Constants: `UPPER_CASE`. Private members: `_prefix`.
- Avoid abbreviations in public identifiers unless widely accepted.

## Code Style

- Prettier auto-formats JS at commit — do not flag issues it handles.
- Use `===`/`!==`, never `==`/`!=`.
- Append `.0` to whole numbers intended as floats (e.g., `1.0`).
- Prefer `const` over `let`; avoid `var`. Declare variables where first used.
- Use `undefined` (not `null`). Use `defined()` utility for null/undefined checks.

## Functions

- Functions must be **cohesive** — one function, one task.
- Avoid unnecessary `else` at the end of a function — use early returns instead.
- Use `options` parameter objects for multiple optional parameters.
- Use `??` for default values (e.g., `height = height ?? 0.0`).
- Use `Frozen.EMPTY_OBJECT`/`Frozen.EMPTY_ARRAY` as defaults for unmodified options.
- Validate parameters with `Check` class and throw `DeveloperError`. Wrap in `//>>includeStart('debug', pragmas.debug)` blocks.
- Use `result` parameters to avoid heap allocations in hot paths.

## Classes

- Use ES6 `class` syntax. Avoid prototype-based inheritance in new code.
- Classes must be **cohesive** and **loosely coupled**.
- Assign all properties in the constructor. Never add properties post-construction or change their type.
- Static constants: `static ZERO = Object.freeze(new Cartesian3(...))`.
- Prefer file-scoped helper functions over private `_methods` for encapsulation.
- Classes with WebGL resources must implement `destroy()` and `isDestroyed()`.

## Public API

- Minimize the public API. Mark internals `@private` or `@experimental`.
- New public identifiers require JSDoc docs and a `CHANGES.md` entry.
- Deprecated APIs must use `deprecationWarning()`, `@deprecated` tag, and a removal issue (3–6 releases).

## Type Checking

- For new files, encourage adding `// @ts-check` at the top. This enables better editor autocomplete and surfaces type errors in editors with TypeScript Language Services (e.g., VSCode). Errors will also be reported by `npm run tsc`.
- Prefer `@ts-expect-error` over `@ts-ignore`. Prefer `unknown` over `any`.
- Type-only imports: `/** @import Foo from './Foo.js'; */`

## Architecture

- Layer order: `Core` → `Renderer` → `Scene` → `DataSources` → `Widgets`.
- Modules may only reference the same layer or below.
- Units: meters, radians, seconds. Use `fromDegrees`-style naming if accepting degrees.

## GLSL

- Files: `.glsl`, suffix `VS`/`FS`. Builtins: `czm_`. Varyings: `v_`. Uniforms: `u_`.
- Avoid branching in shaders; use `czm_branchFreeTernary` for performance.
- Compute expensive values in JS (as uniforms) or per-vertex rather than per-fragment.
