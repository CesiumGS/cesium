# CesiumJS Copilot Code Review Instructions

When reviewing pull requests, apply the standards defined in:

- **[Coding Guide](../Documentation/Contributors/CodingGuide/README.md)** — naming, code style, functions, classes, public API, type checking, architecture, and GLSL conventions.
- **[Code Review Guide](../Documentation/Contributors/CodeReviewGuide/README.md)** — review process, public API checks, testing, and merging.

## Key reminders

- Review the big picture first — design and architecture before line details.
- Flag `TODO` comments and commented-out code — both must be removed before merging into `main`.
- Verify `CHANGES.md` is updated for any public API additions, removals, or deprecations.
- New features and bug fixes must include unit tests.
- Verify CI checks (ESLint, build, tests) pass.
