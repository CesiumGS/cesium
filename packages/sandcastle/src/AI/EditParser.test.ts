import { describe, it, expect } from "vitest";
import { EditParser } from "./EditParser";
import { StreamingDiffProcessor } from "./StreamingDiffProcessor";
import { DiffFormat, type DiffBlock } from "./types";

describe("EditParser", () => {
  describe("parseCodeBlocks (backward compatibility)", () => {
    it("should parse JavaScript code blocks", () => {
      const markdown = `
Here's some code:
\`\`\`javascript
const viewer = new Cesium.Viewer("cesiumContainer");
\`\`\`
`;
      const blocks = EditParser.parseCodeBlocks(markdown);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].language).toBe("javascript");
      expect(blocks[0].code).toContain("Cesium.Viewer");
    });

    it("should parse HTML code blocks", () => {
      const markdown = `
\`\`\`html
<div id="cesiumContainer"></div>
\`\`\`
`;
      const blocks = EditParser.parseCodeBlocks(markdown);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].language).toBe("html");
      expect(blocks[0].code).toContain("cesiumContainer");
    });

    it("should handle 'js' language alias", () => {
      const markdown = `
\`\`\`js
console.log("test");
\`\`\`
`;
      const blocks = EditParser.parseCodeBlocks(markdown);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].language).toBe("javascript");
    });

    it("should parse multiple code blocks", () => {
      const markdown = `
\`\`\`javascript
const x = 1;
\`\`\`
Some text
\`\`\`html
<div>test</div>
\`\`\`
`;
      const blocks = EditParser.parseCodeBlocks(markdown);
      expect(blocks).toHaveLength(2);
      expect(blocks[0].language).toBe("javascript");
      expect(blocks[1].language).toBe("html");
    });

    it("should detect full replacement for JavaScript", () => {
      const markdown = `
\`\`\`javascript
import Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
const entity = viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(-75.5, 40.0),
  point: { pixelSize: 10, color: Cesium.Color.RED }
});
\`\`\`
`;
      const blocks = EditParser.parseCodeBlocks(markdown);
      expect(blocks[0].fullReplacement).toBe(true);
    });

    it("should detect snippet for short JavaScript", () => {
      const markdown = `
\`\`\`javascript
viewer.zoomTo(entity);
\`\`\`
`;
      const blocks = EditParser.parseCodeBlocks(markdown);
      expect(blocks[0].fullReplacement).toBe(false);
    });

    it("should return empty array for no code blocks", () => {
      const markdown = "Just some text without code blocks";
      const blocks = EditParser.parseCodeBlocks(markdown);
      expect(blocks).toHaveLength(0);
    });
  });

  describe("parseDiffBlocks", () => {
    it("should delegate to DiffParser for SEARCH/REPLACE format", () => {
      const content = `
<<<SEARCH>>>
const oldValue = 10;
<<<REPLACE>>>
const newValue = 20;
`;
      const diffs = EditParser.parseDiffBlocks(content);
      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.format).toBe(DiffFormat.SEARCH_REPLACE);
      expect(diffs[0].block.search).toContain("oldValue");
      expect(diffs[0].block.replace).toContain("newValue");
    });

    it("should parse multiple diff blocks", () => {
      const content = `
<<<SEARCH>>>
const a = 1;
<<<REPLACE>>>
const a = 2;
<<<SEARCH>>>
const b = 3;
<<<REPLACE>>>
const b = 4;
`;
      const diffs = EditParser.parseDiffBlocks(content);
      expect(diffs).toHaveLength(2);
    });

    it("should return empty array for no diffs", () => {
      const content = "Just some regular text";
      const diffs = EditParser.parseDiffBlocks(content);
      expect(diffs).toHaveLength(0);
    });
  });

  describe("hasApplicableDiffs", () => {
    it("should detect SEARCH/REPLACE format", () => {
      const content = `
<<<SEARCH>>>
old code
<<<REPLACE>>>
new code
`;
      expect(EditParser.hasApplicableDiffs(content)).toBe(true);
    });

    it("should detect unified diff format", () => {
      const content = `
--- a/file.js
+++ b/file.js
@@ -1,3 +1,3 @@
-old line
+new line
`;
      expect(EditParser.hasApplicableDiffs(content)).toBe(true);
    });

    it("should return false for no diffs", () => {
      const content = "Just regular text with code blocks but no diffs";
      expect(EditParser.hasApplicableDiffs(content)).toBe(false);
    });
  });

  describe("parseResponse", () => {
    it("should parse response with only code blocks", () => {
      const response = `
Here's the updated code:
\`\`\`javascript
const viewer = new Cesium.Viewer("cesiumContainer");
\`\`\`
`;
      const parsed = EditParser.parseResponse(response);
      expect(parsed.codeBlocks).toHaveLength(1);
      expect(parsed.diffEdits).toHaveLength(0);
      expect(parsed.explanation).toContain("Here's the updated code");
    });

    it("should parse response with only diffs", () => {
      const response = `
I'll update the viewer initialization:
<<<SEARCH>>>
const viewer = new Cesium.Viewer("cesiumContainer");
<<<REPLACE>>>
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrainProvider: await Cesium.createWorldTerrainAsync()
});
`;
      const parsed = EditParser.parseResponse(response);
      expect(parsed.codeBlocks).toHaveLength(0);
      expect(parsed.diffEdits).toHaveLength(1);
      expect(parsed.diffEdits[0].language).toBe("javascript");
      expect(parsed.explanation).toContain("I'll update");
    });

    it("should parse mixed response with both code blocks and diffs", () => {
      const response = `
First, let's update the viewer:
<<<SEARCH>>>
const viewer = new Cesium.Viewer("cesiumContainer");
<<<REPLACE>>>
const viewer = new Cesium.Viewer("cesiumContainer", { timeline: false });

Here's a complete example:
\`\`\`javascript
const entity = viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(-75.5, 40.0)
});
\`\`\`
`;
      const parsed = EditParser.parseResponse(response);
      expect(parsed.codeBlocks).toHaveLength(1);
      expect(parsed.diffEdits).toHaveLength(1);
    });

    it("should separate JavaScript and HTML diffs", () => {
      const response = `
Update the HTML:
<<<SEARCH>>>
<div id="cesiumContainer"></div>
<<<REPLACE>>>
<div id="cesiumContainer" class="fullSize"></div>

Update the JavaScript:
<<<SEARCH>>>
const viewer = new Cesium.Viewer("cesiumContainer");
<<<REPLACE>>>
const viewer = new Cesium.Viewer("cesiumContainer", { animation: false });
`;
      const parsed = EditParser.parseResponse(response);
      expect(parsed.diffEdits).toHaveLength(2);

      const jsEdit = parsed.diffEdits.find((e) => e.language === "javascript");
      const htmlEdit = parsed.diffEdits.find((e) => e.language === "html");

      expect(jsEdit).toBeDefined();
      expect(htmlEdit).toBeDefined();
      expect(jsEdit!.diffs).toHaveLength(1);
      expect(htmlEdit!.diffs).toHaveLength(1);
    });

    it("should handle response with only explanation", () => {
      const response = "This is just an explanation without any code or diffs.";
      const parsed = EditParser.parseResponse(response);
      expect(parsed.codeBlocks).toHaveLength(0);
      expect(parsed.diffEdits).toHaveLength(0);
      expect(parsed.explanation).toBe(response);
    });

    it("should extract explanation before first code element", () => {
      const response = `
This is the explanation.
It has multiple lines.

<<<SEARCH>>>
old
<<<REPLACE>>>
new
`;
      const parsed = EditParser.parseResponse(response);
      expect(parsed.explanation).toContain("explanation");
      expect(parsed.explanation).not.toContain("<<<SEARCH>>>");
    });
  });

  describe("extractDiffBasedEdit", () => {
    it("should match diffs in source code", () => {
      const response = `
<<<SEARCH>>>
const viewer = new Cesium.Viewer("cesiumContainer");
<<<REPLACE>>>
const viewer = new Cesium.Viewer("cesiumContainer", { timeline: false });
`;
      const sourceCode = `
import Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
viewer.camera.flyHome();
`;
      const matches = EditParser.extractDiffBasedEdit(
        response,
        sourceCode,
        "javascript",
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].matchedText).toContain("Cesium.Viewer");
      expect(matches[0].confidence).toBeGreaterThan(0.9);
    });

    it("should filter diffs by language", () => {
      const response = `
<<<SEARCH>>>
<div id="cesiumContainer"></div>
<<<REPLACE>>>
<div id="cesiumContainer" class="fullSize"></div>
`;
      const jsCode = 'const viewer = new Cesium.Viewer("cesiumContainer");';

      const matches = EditParser.extractDiffBasedEdit(
        response,
        jsCode,
        "javascript",
      );

      // Should not match because the diff is for HTML, not JavaScript
      expect(matches).toHaveLength(0);
    });

    it("should handle multiple diffs in order", () => {
      const response = `
<<<SEARCH>>>
const a = 1;
<<<REPLACE>>>
const a = 2;
<<<SEARCH>>>
const b = 3;
<<<REPLACE>>>
const b = 4;
`;
      const sourceCode = `
const a = 1;
const b = 3;
const c = 5;
`;
      const matches = EditParser.extractDiffBasedEdit(
        response,
        sourceCode,
        "javascript",
      );

      expect(matches).toHaveLength(2);
      expect(matches[0].matchedText).toContain("a = 1");
      expect(matches[1].matchedText).toContain("b = 3");
    });

    it("should return empty array for no matches", () => {
      const response = `
<<<SEARCH>>>
const nonexistent = true;
<<<REPLACE>>>
const updated = true;
`;
      const sourceCode = 'const viewer = new Cesium.Viewer("cesiumContainer");';

      const matches = EditParser.extractDiffBasedEdit(
        response,
        sourceCode,
        "javascript",
      );

      expect(matches).toHaveLength(0);
    });

    it("should pass through custom match options", () => {
      const response = `
<<<SEARCH>>>
const viewer = new Cesium.Viewer("cesiumContainer");
<<<REPLACE>>>
const viewer = new Cesium.Viewer("cesiumContainer", { timeline: false });
`;
      const sourceCode = `const viewer=new Cesium.Viewer("cesiumContainer");`;

      // Should match with whitespace normalization
      const matches = EditParser.extractDiffBasedEdit(
        response,
        sourceCode,
        "javascript",
        {
          minConfidence: 0.85,
        },
      );

      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe("inferLanguageFromDiff (private method testing via public methods)", () => {
    it("should infer HTML from HTML tags", () => {
      const response = `
<<<SEARCH>>>
<div id="container"></div>
<<<REPLACE>>>
<div id="container" class="fullSize"></div>
`;
      const parsed = EditParser.parseResponse(response);
      expect(parsed.diffEdits[0]?.language).toBe("html");
    });

    it("should infer JavaScript from JS keywords", () => {
      const response = `
<<<SEARCH>>>
const viewer = new Cesium.Viewer("cesiumContainer");
<<<REPLACE>>>
const viewer = new Cesium.Viewer("cesiumContainer", { timeline: false });
`;
      const parsed = EditParser.parseResponse(response);
      expect(parsed.diffEdits[0]?.language).toBe("javascript");
    });

    it("should infer JavaScript from CesiumJS API calls", () => {
      const response = `
<<<SEARCH>>>
viewer.camera.flyTo(entity);
<<<REPLACE>>>
viewer.camera.flyTo(entity, { duration: 2.0 });
`;
      const parsed = EditParser.parseResponse(response);
      expect(parsed.diffEdits[0]?.language).toBe("javascript");
    });

    it("should use context hints from surrounding text", () => {
      const response = `
Update the HTML markup:
<<<SEARCH>>>
container
<<<REPLACE>>>
cesiumContainer
`;
      const parsed = EditParser.parseResponse(response);
      // Context mentions "HTML" so should lean toward HTML
      expect(parsed.diffEdits[0]?.language).toBe("html");
    });

    it("should default to JavaScript when ambiguous", () => {
      const response = `
<<<SEARCH>>>
test
<<<REPLACE>>>
production
`;
      const parsed = EditParser.parseResponse(response);
      // No clear indicators, should default to JavaScript
      expect(parsed.diffEdits[0]?.language).toBe("javascript");
    });
  });

  describe("hasApplicableCode (backward compatibility)", () => {
    it("should detect JavaScript code blocks", () => {
      const markdown = "```javascript\nconst x = 1;\n```";
      expect(EditParser.hasApplicableCode(markdown)).toBe(true);
    });

    it("should detect HTML code blocks", () => {
      const markdown = "```html\n<div></div>\n```";
      expect(EditParser.hasApplicableCode(markdown)).toBe(true);
    });

    it("should detect 'js' alias", () => {
      const markdown = "```js\nconst x = 1;\n```";
      expect(EditParser.hasApplicableCode(markdown)).toBe(true);
    });

    it("should return false for non-code content", () => {
      const markdown = "Just some regular text";
      expect(EditParser.hasApplicableCode(markdown)).toBe(false);
    });

    it("should return false for unsupported languages", () => {
      const markdown = "```python\nprint('hello')\n```";
      expect(EditParser.hasApplicableCode(markdown)).toBe(false);
    });
  });

  describe("extractExplanation (backward compatibility)", () => {
    it("should extract text before first code block", () => {
      const markdown = `
This is the explanation.
It has multiple lines.

\`\`\`javascript
const x = 1;
\`\`\`
`;
      const explanation = EditParser.extractExplanation(markdown);
      expect(explanation).toContain("explanation");
      expect(explanation).not.toContain("```");
    });

    it("should return full text if no code blocks", () => {
      const markdown = "This is just text without code blocks.";
      const explanation = EditParser.extractExplanation(markdown);
      expect(explanation).toBe(markdown.trim());
    });

    it("should handle markdown with immediate code block", () => {
      const markdown = "```javascript\nconst x = 1;\n```";
      const explanation = EditParser.extractExplanation(markdown);
      expect(explanation).toBe("");
    });
  });

  describe("integration tests", () => {
    it("should handle real-world AI response with explanation and diff", () => {
      const response = `
I'll help you add a terrain provider to your Cesium viewer. Here's the change you need to make:

<<<SEARCH>>>
const viewer = new Cesium.Viewer("cesiumContainer");
<<<REPLACE>>>
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrainProvider: await Cesium.createWorldTerrainAsync()
});

This will enable high-resolution terrain in your 3D globe.
`;
      const parsed = EditParser.parseResponse(response);

      expect(parsed.explanation).toContain("help you add");
      expect(parsed.diffEdits).toHaveLength(1);
      expect(parsed.diffEdits[0].language).toBe("javascript");
      expect(parsed.diffEdits[0].diffs[0].block.replace).toContain(
        "terrainProvider",
      );
    });

    it("should handle AI response with multiple targeted edits", () => {
      const response = `
I'll make three improvements to your code:

1. Add terrain provider
<<<SEARCH>>>
const viewer = new Cesium.Viewer("cesiumContainer");
<<<REPLACE>>>
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrainProvider: await Cesium.createWorldTerrainAsync()
});

2. Update camera position
<<<SEARCH>>>
viewer.camera.flyHome();
<<<REPLACE>>>
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(-75.5, 40.0, 1000000.0)
});

3. Add an entity
<<<SEARCH>>>
// Add entities here
<<<REPLACE>>>
viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(-75.5, 40.0),
  point: { pixelSize: 10, color: Cesium.Color.RED }
});
`;
      const parsed = EditParser.parseResponse(response);

      expect(parsed.diffEdits).toHaveLength(1);
      expect(parsed.diffEdits[0].diffs).toHaveLength(3);
    });

    it("should handle backward compatible full file replacement", () => {
      const response = `
Here's the complete updated code:

\`\`\`javascript
import Cesium from "cesium";
import "./style.css";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrainProvider: await Cesium.createWorldTerrainAsync()
});

viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(-75.5, 40.0, 1000000.0)
});
\`\`\`
`;
      const parsed = EditParser.parseResponse(response);

      expect(parsed.codeBlocks).toHaveLength(1);
      expect(parsed.codeBlocks[0].fullReplacement).toBe(true);
      expect(parsed.diffEdits).toHaveLength(0);
    });
  });

  describe("streaming chunk processing", () => {
    it("should process text chunks", () => {
      const processor = new StreamingDiffProcessor();
      const chunk = { type: "text" as const, text: "Hello world" };

      const result = EditParser.processStreamChunk(chunk, processor);

      expect(result.textToAppend).toBe("Hello world");
      expect(result.error).toBeUndefined();
    });

    it("should process reasoning chunks", () => {
      const processor = new StreamingDiffProcessor();
      const chunk = { type: "reasoning" as const, reasoning: "Thinking..." };

      const result = EditParser.processStreamChunk(chunk, processor);

      expect(result.textToAppend).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it("should process diff_start chunks", () => {
      const processor = new StreamingDiffProcessor();
      const chunk = {
        type: "diff_start" as const,
        language: "javascript" as const,
        diffIndex: 0,
      };

      const result = EditParser.processStreamChunk(chunk, processor);

      expect(result.error).toBeUndefined();
      const activeDiff = processor.getActiveDiff(0);
      expect(activeDiff).toBeDefined();
      expect(activeDiff?.language).toBe("javascript");
    });

    it("should process complete diff flow", () => {
      const processor = new StreamingDiffProcessor();

      // Start diff
      EditParser.processStreamChunk(
        {
          type: "diff_start" as const,
          language: "javascript" as const,
          diffIndex: 0,
        },
        processor,
      );

      // Add search content
      EditParser.processStreamChunk(
        {
          type: "diff_search" as const,
          content: "const old = 1;",
          diffIndex: 0,
        },
        processor,
      );

      // Add replace content
      EditParser.processStreamChunk(
        {
          type: "diff_replace" as const,
          content: "const new = 2;",
          diffIndex: 0,
        },
        processor,
      );

      // Complete diff - Note: The diff parameter in the chunk type is actually created by processDiffComplete
      const result = EditParser.processStreamChunk(
        {
          type: "diff_complete" as const,
          diffIndex: 0,
          diff: {
            search: "const old = 1;",
            replace: "const new = 2;",
            format: DiffFormat.SEARCH_REPLACE,
          },
        },
        processor,
      );

      expect(result.diffUpdate).toBeDefined();
      expect(result.diffUpdate?.diffIndex).toBe(0);
      expect(result.diffUpdate?.diff).toBeDefined();
      expect(result.diffUpdate?.diff.search).toBe("const old = 1;");
      expect(result.diffUpdate?.diff.replace).toBe("const new = 2;");
    });

    it("should handle usage chunks", () => {
      const processor = new StreamingDiffProcessor();
      const chunk = {
        type: "usage" as const,
        inputTokens: 100,
        outputTokens: 50,
      };

      const result = EditParser.processStreamChunk(chunk, processor);

      expect(result.textToAppend).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it("should handle error chunks", () => {
      const processor = new StreamingDiffProcessor();
      const chunk = { type: "error" as const, error: "API error" };

      const result = EditParser.processStreamChunk(chunk, processor);

      expect(result.error).toBe("API error");
    });

    it("should catch and return processing errors", () => {
      const processor = new StreamingDiffProcessor();

      // Try to process diff_search without diff_start
      const chunk = {
        type: "diff_search" as const,
        content: "test",
        diffIndex: 0,
      };
      const result = EditParser.processStreamChunk(chunk, processor);

      expect(result.error).toBeDefined();
      expect(result.error).toContain("does not exist");
    });
  });

  describe("buildStreamingResponse", () => {
    it("should build response from accumulated text and diffs", () => {
      const accumulatedText = "Here's the fix:\n\nThis will update the code.";
      const completedDiffs = [
        {
          search: "const old = 1;",
          replace: "const new = 2;",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const response = EditParser.buildStreamingResponse(
        accumulatedText,
        completedDiffs,
      );

      expect(response.explanation).toContain("Here's the fix");
      expect(response.diffEdits).toHaveLength(1);
      expect(response.diffEdits[0].diffs).toHaveLength(1);
      expect(response.diffEdits[0].language).toBe("javascript");
    });

    it("should separate JavaScript and HTML diffs", () => {
      const accumulatedText = "Updating both files";
      const completedDiffs = [
        {
          search: "<div></div>",
          replace: "<div class='container'></div>",
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: "const viewer = new Cesium.Viewer('cesiumContainer');",
          replace:
            "const viewer = new Cesium.Viewer('cesiumContainer', { timeline: false });",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const response = EditParser.buildStreamingResponse(
        accumulatedText,
        completedDiffs,
      );

      expect(response.diffEdits).toHaveLength(2);

      const htmlEdit = response.diffEdits.find((e) => e.language === "html");
      const jsEdit = response.diffEdits.find(
        (e) => e.language === "javascript",
      );

      expect(htmlEdit).toBeDefined();
      expect(jsEdit).toBeDefined();
      expect(htmlEdit?.diffs).toHaveLength(1);
      expect(jsEdit?.diffs).toHaveLength(1);
    });

    it("should handle empty diffs array", () => {
      const accumulatedText = "Just some explanation text";
      const completedDiffs: DiffBlock[] = [];

      const response = EditParser.buildStreamingResponse(
        accumulatedText,
        completedDiffs,
      );

      expect(response.explanation).toBe("Just some explanation text");
      expect(response.diffEdits).toHaveLength(0);
      expect(response.codeBlocks).toHaveLength(0);
    });

    it("should parse code blocks from accumulated text", () => {
      const accumulatedText = `
Here's an example:
\`\`\`javascript
const x = 1;
\`\`\`
`;
      const completedDiffs: DiffBlock[] = [];

      const response = EditParser.buildStreamingResponse(
        accumulatedText,
        completedDiffs,
      );

      expect(response.codeBlocks).toHaveLength(1);
      expect(response.codeBlocks[0].code).toContain("const x = 1");
    });

    it("should extract explanation before code blocks", () => {
      const accumulatedText = `
This is the explanation.

\`\`\`javascript
const x = 1;
\`\`\`
`;
      const completedDiffs: DiffBlock[] = [];

      const response = EditParser.buildStreamingResponse(
        accumulatedText,
        completedDiffs,
      );

      expect(response.explanation).toContain("explanation");
      expect(response.explanation).not.toContain("```");
    });
  });
});
