# ConditionalContent

Tests for the `3DTILES_content_conditional` extension.

## `ConditionalContent`

This is a tileset that defines a single conditional content. The
content - stored in `content.json` - consists of 9 simple GLB files,
arranged in a 3x3 grid, each being a unit square with a texture for
identifying the content.

The "keys" that govern the selection of the currently active content
are

- `"exampleTimeStamp"` with possible values `"2025-09-25"`,
  `"2025-09-26"`, and `"2025-09-27"`, and
- `"exampleRevision"`, with possible values `"revision0"`,
  `"revision1"`, and `"revision2"`.

The `exampleTimeStamp` is used for selecting the column in the 3x3 grid.
The `exampleRevision` is used for selecting the row in the 3x3 grid.

The `tilesetWithInvalidContent.json` refers to the `invalidContent.json`,
which contains some invalid entries and invalid URLs, to be used in the
specs.
