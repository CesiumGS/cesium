import { describe, it, expect } from "vitest";
import { EditParser } from "./EditParser";

describe("EditParser.preprocessGeminiResponse", () => {
  it("should strip markdown code fences around SEARCH/REPLACE blocks", () => {
    const input = `\`\`\`
<<<SEARCH>>>
import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
<<<REPLACE>>>
// This Sandcastle example demonstrates how to create a basic Cesium Viewer.
import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
\`\`\``;

    const expected = `<<<SEARCH>>>
import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
<<<REPLACE>>>
// This Sandcastle example demonstrates how to create a basic Cesium Viewer.
import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
`;

    const result = EditParser.preprocessGeminiResponse(input);
    expect(result).toBe(expected);
  });

  it("should strip markdown code fences with language specifier", () => {
    const input = `\`\`\`javascript
<<<SEARCH>>>
const x = 1;
<<<REPLACE>>>
const x = 2;
\`\`\``;

    const expected = `<<<SEARCH>>>
const x = 1;
<<<REPLACE>>>
const x = 2;
`;

    const result = EditParser.preprocessGeminiResponse(input);
    expect(result).toBe(expected);
  });

  it("should handle multiple SEARCH/REPLACE blocks", () => {
    const input = `\`\`\`
<<<SEARCH>>>
const a = 1;
<<<REPLACE>>>
const a = 2;
\`\`\`

Some explanation text here.

\`\`\`
<<<SEARCH>>>
const b = 3;
<<<REPLACE>>>
const b = 4;
\`\`\``;

    const expected = `<<<SEARCH>>>
const a = 1;
<<<REPLACE>>>
const a = 2;


Some explanation text here.

<<<SEARCH>>>
const b = 3;
<<<REPLACE>>>
const b = 4;
`;

    const result = EditParser.preprocessGeminiResponse(input);
    expect(result).toBe(expected);
  });

  it("should not modify SEARCH/REPLACE blocks without markdown fences", () => {
    const input = `<<<SEARCH>>>
const x = 1;
<<<REPLACE>>>
const x = 2;
`;

    const result = EditParser.preprocessGeminiResponse(input);
    expect(result).toBe(input);
  });

  it("should not modify regular markdown code blocks", () => {
    const input = `Here's an example:

\`\`\`javascript
const viewer = new Cesium.Viewer("cesiumContainer");
\`\`\`

This is just a code example, not a diff.`;

    const result = EditParser.preprocessGeminiResponse(input);
    expect(result).toBe(input);
  });

  it("should handle mixed content with both regular code blocks and SEARCH/REPLACE", () => {
    const input = `Here's the change:

\`\`\`
<<<SEARCH>>>
const x = 1;
<<<REPLACE>>>
const x = 2;
\`\`\`

And here's an example:

\`\`\`javascript
const y = 3;
\`\`\``;

    const expected = `Here's the change:

<<<SEARCH>>>
const x = 1;
<<<REPLACE>>>
const x = 2;


And here's an example:

\`\`\`javascript
const y = 3;
\`\`\``;

    const result = EditParser.preprocessGeminiResponse(input);
    expect(result).toBe(expected);
  });
});
