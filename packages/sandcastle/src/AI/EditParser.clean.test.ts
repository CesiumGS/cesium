import { EditParser } from "./EditParser";

describe("EditParser.parseAndClean", () => {
  it("should remove SEARCH/REPLACE blocks from markdown", () => {
    const response = `Here's how to fix the issue:

<<<SEARCH>>>
const viewer = new Cesium.Viewer("cesiumContainer");
<<<REPLACE>>>
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrainProvider: await Cesium.createWorldTerrainAsync()
});

This will add terrain to your viewer.`;

    const { cleanedMarkdown, parsed } = EditParser.parseAndClean(response);

    // Primary goal: Cleaned markdown should not contain the SEARCH/REPLACE markers
    expect(cleanedMarkdown).not.toContain("<<<SEARCH>>>");
    expect(cleanedMarkdown).not.toContain("<<<REPLACE>>>");

    // Should contain the explanation text before the diff
    expect(cleanedMarkdown).toContain("Here's how to fix the issue:");

    // Parsed response should have the diff
    expect(parsed.diffEdits.length).toBe(1);
    expect(parsed.diffEdits[0].diffs.length).toBeGreaterThan(0);
  });

  it("should remove SEARCH/REPLACE blocks wrapped in code fences", () => {
    const response = `
I'll help you with that. Here are the changes:

\`\`\`javascript
<<<SEARCH>>>
const oldCode = "test";
<<<REPLACE>>>
const newCode = "updated";
\`\`\`

This updates the code properly.
    `.trim();

    const { cleanedMarkdown } = EditParser.parseAndClean(response);

    expect(cleanedMarkdown).not.toContain("<<<SEARCH>>>");
    expect(cleanedMarkdown).not.toContain("<<<REPLACE>>>");
    expect(cleanedMarkdown).not.toContain("const oldCode");
    expect(cleanedMarkdown).toContain("I'll help you with that");
    expect(cleanedMarkdown).toContain("This updates the code properly");
  });

  it("should remove multiple SEARCH/REPLACE blocks", () => {
    const response = `First change:

<<<SEARCH>>>
const a = 1;
<<<REPLACE>>>
const a = 2;

Second change:

<<<SEARCH>>>
const b = 1;
<<<REPLACE>>>
const b = 2;

Done!`;

    const { cleanedMarkdown, parsed } = EditParser.parseAndClean(response);

    // Primary goal: no raw markers
    expect(cleanedMarkdown).not.toContain("<<<SEARCH>>>");
    expect(cleanedMarkdown).not.toContain("<<<REPLACE>>>");

    // Should contain explanatory text
    expect(cleanedMarkdown).toContain("First change:");

    // Should parse both diffs
    expect(parsed.diffEdits[0].diffs.length).toBe(2);
  });

  it("should remove code blocks when they are parsed as actionable", () => {
    const response = `
Here's the JavaScript:

\`\`\`javascript
const viewer = new Cesium.Viewer("cesiumContainer");
\`\`\`

And here's the HTML:

\`\`\`html
<div id="cesiumContainer"></div>
\`\`\`

All done!
    `.trim();

    const { cleanedMarkdown, parsed } = EditParser.parseAndClean(response);

    // Should remove code blocks since they were parsed
    expect(cleanedMarkdown).not.toContain("```javascript");
    expect(cleanedMarkdown).not.toContain("```html");
    expect(cleanedMarkdown).not.toContain("const viewer");
    expect(cleanedMarkdown).not.toContain("<div id=");

    // But should keep explanatory text
    expect(cleanedMarkdown).toContain("Here's the JavaScript:");
    expect(cleanedMarkdown).toContain("And here's the HTML:");
    expect(cleanedMarkdown).toContain("All done!");

    // Should parse code blocks
    expect(parsed.codeBlocks.length).toBe(2);
  });

  it("should keep code blocks that are not actionable (non-js/html languages)", () => {
    const response = `
Here's an example in Python:

\`\`\`python
print("Hello")
\`\`\`

This is for reference only.
    `.trim();

    const { cleanedMarkdown } = EditParser.parseAndClean(response);

    // Should keep Python code block since it's not actionable
    expect(cleanedMarkdown).toContain("```python");
    expect(cleanedMarkdown).toContain('print("Hello")');
  });

  it("should handle mixed content (explanation + diffs + code)", () => {
    const response = `Let me help you add terrain and a toolbar.

First, update the viewer initialization:

<<<SEARCH>>>
const viewer = new Cesium.Viewer("cesiumContainer");
<<<REPLACE>>>
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrainProvider: await Cesium.createWorldTerrainAsync()
});

Next, add the HTML for the toolbar:

\`\`\`html
<div id="toolbar">
  <button id="startTourBtn">Start Tour</button>
</div>
\`\`\`

This will give you a working demo!`;

    const { cleanedMarkdown, parsed } = EditParser.parseAndClean(response);

    // Primary goal: Should not contain any raw markers or code blocks
    expect(cleanedMarkdown).not.toContain("<<<SEARCH>>>");
    expect(cleanedMarkdown).not.toContain("<<<REPLACE>>>");
    expect(cleanedMarkdown).not.toContain("```html");

    // Should contain some explanatory text
    expect(cleanedMarkdown).toContain("Let me help you");
    expect(cleanedMarkdown).toContain("First, update the viewer");

    // Should parse both types
    expect(parsed.diffEdits.length).toBe(1);
    expect(parsed.codeBlocks.length).toBe(1);
  });

  it("should collapse excessive whitespace", () => {
    const response = `Here's the fix:


<<<SEARCH>>>
const old = 1;
<<<REPLACE>>>
const new = 2;



Done!`;

    const { cleanedMarkdown } = EditParser.parseAndClean(response);

    // Primary goal: should not have the markers
    expect(cleanedMarkdown).not.toContain("<<<SEARCH>>>");
    expect(cleanedMarkdown).not.toContain("<<<REPLACE>>>");

    // Should not have more than 2 consecutive newlines
    expect(cleanedMarkdown).not.toMatch(/\n{3,}/);

    // Should still contain some text
    expect(cleanedMarkdown).toContain("Here's the fix:");
  });

  it("should handle empty response gracefully", () => {
    const response = "";
    const { cleanedMarkdown, parsed } = EditParser.parseAndClean(response);

    expect(cleanedMarkdown).toBe("");
    expect(parsed.codeBlocks).toEqual([]);
    expect(parsed.diffEdits).toEqual([]);
  });

  it("should handle response with only explanation text", () => {
    const response = "This is just an explanation with no code.";
    const { cleanedMarkdown, parsed } = EditParser.parseAndClean(response);

    expect(cleanedMarkdown).toBe(response);
    expect(parsed.codeBlocks).toEqual([]);
    expect(parsed.diffEdits).toEqual([]);
  });

  it("should remove inline SEARCH/REPLACE format (markers on same line)", () => {
    // This is the format we see in the screenshot
    const response = `Here are the modifications:

<<<SEARCH>>> fullscreenButton: false, }); <<<REPLACE>>> fullscreenButton: false, });

That should work!`;

    const { cleanedMarkdown, parsed } = EditParser.parseAndClean(response);

    // Primary goal: no markers visible
    expect(cleanedMarkdown).not.toContain("<<<SEARCH>>>");
    expect(cleanedMarkdown).not.toContain("<<<REPLACE>>>");

    // Should preserve explanation text
    expect(cleanedMarkdown).toContain("Here are the modifications:");
    expect(cleanedMarkdown).toContain("That should work!");

    // Should still parse the diff
    expect(parsed.diffEdits.length).toBeGreaterThan(0);
  });
});
