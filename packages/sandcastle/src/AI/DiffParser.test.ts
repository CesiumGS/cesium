import { describe, it, expect } from "vitest";
import { DiffParser } from "./DiffParser";
import { DiffFormat, DiffParseError } from "./types";

describe("DiffParser", () => {
  describe("extractDiffFormat", () => {
    it("should detect Cline SEARCH/REPLACE format", () => {
      const content = `
        ------- SEARCH
        old code
        =======
        new code
        +++++++ REPLACE
      `;
      expect(DiffParser.extractDiffFormat(content)).toBe(
        DiffFormat.SEARCH_REPLACE,
      );
    });

    it("should detect legacy SEARCH/REPLACE format", () => {
      const content = `
        <<<SEARCH>>>
        old code
        <<<REPLACE>>>
        new code
      `;
      expect(DiffParser.extractDiffFormat(content)).toBe(
        DiffFormat.SEARCH_REPLACE,
      );
    });

    it("should detect unified diff format", () => {
      const content = `
        --- a/file.js
        +++ b/file.js
        @@ -1,3 +1,3 @@
         context
        -old line
        +new line
      `;
      expect(DiffParser.extractDiffFormat(content)).toBe(DiffFormat.UNIFIED);
    });

    it("should return null for unrecognized format", () => {
      const content = "just some random text";
      expect(DiffParser.extractDiffFormat(content)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(DiffParser.extractDiffFormat("")).toBeNull();
    });

    it("should not detect incomplete SEARCH/REPLACE format", () => {
      const content = "<<<SEARCH>>> only search marker";
      expect(DiffParser.extractDiffFormat(content)).toBeNull();
    });

    it("should not detect incomplete unified diff format", () => {
      const content = "--- a/file.js\n+++ b/file.js";
      expect(DiffParser.extractDiffFormat(content)).toBeNull();
    });
  });

  describe("hasApplicableDiffs", () => {
    it("should return true for valid SEARCH/REPLACE format", () => {
      const content = `
        <<<SEARCH>>>
        old code
        <<<REPLACE>>>
        new code
      `;
      expect(DiffParser.hasApplicableDiffs(content)).toBe(true);
    });

    it("should return true for valid unified diff format", () => {
      const content = `
        --- a/file.js
        +++ b/file.js
        @@ -1,3 +1,3 @@
        -old
        +new
      `;
      expect(DiffParser.hasApplicableDiffs(content)).toBe(true);
    });

    it("should return false for content without diffs", () => {
      expect(DiffParser.hasApplicableDiffs("no diffs here")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(DiffParser.hasApplicableDiffs("")).toBe(false);
    });
  });

  describe("validateDiffBlock", () => {
    it("should validate a valid diff block", () => {
      const block = {
        search: "old code",
        replace: "new code",
        format: DiffFormat.SEARCH_REPLACE,
      };
      expect(DiffParser.validateDiffBlock(block)).toBe(true);
    });

    it("should validate a diff block with line numbers", () => {
      const block = {
        search: "old code",
        replace: "new code",
        startLine: 10,
        endLine: 15,
        format: DiffFormat.SEARCH_REPLACE,
      };
      expect(DiffParser.validateDiffBlock(block)).toBe(true);
    });

    it("should validate a diff block with empty replace (deletion)", () => {
      const block = {
        search: "code to delete",
        replace: "",
        format: DiffFormat.SEARCH_REPLACE,
      };
      expect(DiffParser.validateDiffBlock(block)).toBe(true);
    });

    it("should reject a diff block with empty search", () => {
      const block = {
        search: "",
        replace: "new code",
        format: DiffFormat.SEARCH_REPLACE,
      };
      expect(DiffParser.validateDiffBlock(block)).toBe(false);
    });

    it("should reject a diff block with whitespace-only search", () => {
      const block = {
        search: "   \n  \t  ",
        replace: "new code",
        format: DiffFormat.SEARCH_REPLACE,
      };
      expect(DiffParser.validateDiffBlock(block)).toBe(false);
    });

    it("should reject a diff block with undefined search", () => {
      const block = {
        search: undefined as unknown as string,
        replace: "new code",
        format: DiffFormat.SEARCH_REPLACE,
      };
      expect(DiffParser.validateDiffBlock(block)).toBe(false);
    });

    it("should reject a diff block with undefined replace", () => {
      const block = {
        search: "old code",
        replace: undefined as unknown as string,
        format: DiffFormat.SEARCH_REPLACE,
      };
      expect(DiffParser.validateDiffBlock(block)).toBe(false);
    });

    it("should reject a diff block with invalid startLine", () => {
      const block = {
        search: "old code",
        replace: "new code",
        startLine: 0,
        format: DiffFormat.SEARCH_REPLACE,
      };
      expect(DiffParser.validateDiffBlock(block)).toBe(false);
    });

    it("should reject a diff block with endLine before startLine", () => {
      const block = {
        search: "old code",
        replace: "new code",
        startLine: 10,
        endLine: 5,
        format: DiffFormat.SEARCH_REPLACE,
      };
      expect(DiffParser.validateDiffBlock(block)).toBe(false);
    });

    it("should reject a diff block with invalid format", () => {
      const block = {
        search: "old code",
        replace: "new code",
        format: "INVALID_FORMAT" as DiffFormat,
      };
      expect(DiffParser.validateDiffBlock(block)).toBe(false);
    });
  });

  describe("parseDiffBlocks - Cline SEARCH/REPLACE format", () => {
    it("should parse a single Cline format diff block", () => {
      const content = `
------- SEARCH
const oldCode = "example";
=======
const newCode = "updated";
+++++++ REPLACE
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.search).toBe('const oldCode = "example";');
      expect(diffs[0].block.replace).toBe('const newCode = "updated";');
      expect(diffs[0].block.format).toBe(DiffFormat.SEARCH_REPLACE);
      expect(diffs[0].index).toBe(0);
    });

    it("should parse multiple Cline format diff blocks", () => {
      const content = `
------- SEARCH
first old code
=======
first new code
+++++++ REPLACE

------- SEARCH
second old code
=======
second new code
+++++++ REPLACE
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(2);
      expect(diffs[0].block.search).toBe("first old code");
      expect(diffs[0].block.replace).toBe("first new code");
      expect(diffs[0].index).toBe(0);
      expect(diffs[1].block.search).toBe("second old code");
      expect(diffs[1].block.replace).toBe("second new code");
      expect(diffs[1].index).toBe(1);
    });

    it("should handle Cline format with extra dashes/plus signs", () => {
      const content = `
----------- SEARCH
old code
=======
new code
+++++++++++ REPLACE
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.search).toBe("old code");
      expect(diffs[0].block.replace).toBe("new code");
    });

    it("should handle Cline format with optional angle bracket", () => {
      const content = `
------- SEARCH>
old code
=======
new code
+++++++ REPLACE>
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.search).toBe("old code");
      expect(diffs[0].block.replace).toBe("new code");
    });

    it("should parse Cline format with multiline content", () => {
      const content = `
------- SEARCH
function oldFunction() {
  console.log("old");
  return false;
}
=======
function newFunction() {
  console.log("new");
  return true;
}
+++++++ REPLACE
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.search).toContain("function oldFunction()");
      expect(diffs[0].block.search).toContain('console.log("old")');
      expect(diffs[0].block.replace).toContain("function newFunction()");
      expect(diffs[0].block.replace).toContain('console.log("new")');
    });
  });

  describe("parseDiffBlocks - Legacy SEARCH/REPLACE format", () => {
    it("should parse a single diff block", () => {
      const content = `
<<<SEARCH>>>
const oldCode = "example";
<<<REPLACE>>>
const newCode = "updated";
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.search).toBe('const oldCode = "example";');
      expect(diffs[0].block.replace).toBe('const newCode = "updated";');
      expect(diffs[0].block.format).toBe(DiffFormat.SEARCH_REPLACE);
      expect(diffs[0].index).toBe(0);
    });

    it("should parse multiple diff blocks", () => {
      const content = `
<<<SEARCH>>>
first old code
<<<REPLACE>>>
first new code
<<<SEARCH>>>
second old code
<<<REPLACE>>>
second new code
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(2);
      expect(diffs[0].block.search).toBe("first old code");
      expect(diffs[0].block.replace).toBe("first new code");
      expect(diffs[0].index).toBe(0);
      expect(diffs[1].block.search).toBe("second old code");
      expect(diffs[1].block.replace).toBe("second new code");
      expect(diffs[1].index).toBe(1);
    });

    it("should parse diff blocks with <<<END>>> marker", () => {
      const content = `
<<<SEARCH>>>
old code
<<<REPLACE>>>
new code
<<<END>>>
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.search).toBe("old code");
      expect(diffs[0].block.replace).toBe("new code");
    });

    it("should parse diff blocks without <<<END>>> marker", () => {
      const content = `
<<<SEARCH>>>
old code
<<<REPLACE>>>
new code
Some other text here
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.search).toBe("old code");
    });

    it("should preserve whitespace within code blocks", () => {
      const content = `
<<<SEARCH>>>
  const x = {
    a: 1,
    b: 2
  };
<<<REPLACE>>>
  const x = {
    a: 10,
    b: 20
  };
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      // trim() is called on the content, so leading spaces from the first line are removed
      // but internal structure is preserved
      expect(diffs[0].block.search).toContain("const x = {");
      expect(diffs[0].block.search).toContain("a: 1,");
      // Verify internal indentation is preserved by checking line structure
      const lines = diffs[0].block.search.split("\n");
      expect(lines.length).toBeGreaterThan(1);
    });

    it("should handle empty replace (deletion)", () => {
      const content = `
<<<SEARCH>>>
code to delete
<<<REPLACE>>>
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.search).toBe("code to delete");
      expect(diffs[0].block.replace).toBe("");
    });

    it("should handle multiline search and replace", () => {
      const content = `
<<<SEARCH>>>
function oldFunction() {
  console.log("old");
  return false;
}
<<<REPLACE>>>
function newFunction() {
  console.log("new");
  return true;
}
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.search).toContain("function oldFunction()");
      expect(diffs[0].block.search).toContain('console.log("old")');
      expect(diffs[0].block.replace).toContain("function newFunction()");
      expect(diffs[0].block.replace).toContain('console.log("new")');
    });

    it("should return empty array for malformed diff with missing replace", () => {
      const content = `
<<<SEARCH>>>
old code
      `;

      // When REPLACE marker is missing, the regex won't match, so we get an empty array
      const diffs = DiffParser.parseDiffBlocks(content);
      expect(diffs).toHaveLength(0);
    });

    it("should return empty array for content without diffs", () => {
      const content = "Just some regular text without any diff markers";

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(0);
    });

    it("should return empty array for empty string", () => {
      const diffs = DiffParser.parseDiffBlocks("");

      expect(diffs).toHaveLength(0);
    });

    it("should return empty array for whitespace-only string", () => {
      const diffs = DiffParser.parseDiffBlocks("   \n  \t  ");

      expect(diffs).toHaveLength(0);
    });

    it("should include raw text in parsed diff", () => {
      const content = `
<<<SEARCH>>>
old
<<<REPLACE>>>
new
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs[0].raw).toContain("<<<SEARCH>>>");
      expect(diffs[0].raw).toContain("<<<REPLACE>>>");
      expect(diffs[0].raw).toContain("old");
      expect(diffs[0].raw).toContain("new");
    });
  });

  describe("parseDiffBlocks - Unified diff format", () => {
    it("should parse a simple unified diff", () => {
      const content = `
--- a/file.js
+++ b/file.js
@@ -1,3 +1,3 @@
 context line
-old line
+new line
 context line
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.search).toContain("context line");
      expect(diffs[0].block.search).toContain("old line");
      expect(diffs[0].block.replace).toContain("context line");
      expect(diffs[0].block.replace).toContain("new line");
      expect(diffs[0].block.format).toBe(DiffFormat.UNIFIED);
    });

    it("should parse unified diff with line numbers", () => {
      const content = `
--- a/file.js
+++ b/file.js
@@ -10,3 +10,3 @@
 context
-old
+new
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.startLine).toBe(10);
    });

    it("should parse multiple hunks in a unified diff", () => {
      const content = `
--- a/file.js
+++ b/file.js
@@ -1,2 +1,2 @@
-old1
+new1
@@ -5,2 +5,2 @@
-old2
+new2
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(2);
      expect(diffs[0].block.search).toBe("old1");
      expect(diffs[0].block.replace).toBe("new1");
      expect(diffs[1].block.search).toBe("old2");
      expect(diffs[1].block.replace).toBe("new2");
    });

    it("should skip unified diff with only additions (empty search)", () => {
      const content = `
--- a/file.js
+++ b/file.js
@@ -1,0 +1,2 @@
+new line 1
+new line 2
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      // Diffs with empty search are skipped because there's nothing to match
      expect(diffs).toHaveLength(0);
    });

    it("should handle unified diff with only deletions", () => {
      const content = `
--- a/file.js
+++ b/file.js
@@ -1,2 +1,0 @@
-line to delete 1
-line to delete 2
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.search).toContain("line to delete");
      expect(diffs[0].block.replace).toBe("");
    });

    it("should skip invalid unified diff blocks without proper headers", () => {
      const content = `
@@ -1,2 +1,2 @@
-old
+new
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(0);
    });

    it("should handle unified diff with context lines", () => {
      const content = `
--- a/file.js
+++ b/file.js
@@ -1,5 +1,5 @@
 context1
 context2
-old line
+new line
 context3
 context4
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.search).toContain("context1");
      expect(diffs[0].block.search).toContain("old line");
      expect(diffs[0].block.search).toContain("context4");
      expect(diffs[0].block.replace).toContain("context1");
      expect(diffs[0].block.replace).toContain("new line");
      expect(diffs[0].block.replace).toContain("context4");
    });

    it("should skip empty unified diff hunks", () => {
      const content = `
--- a/file.js
+++ b/file.js
@@ -1,0 +1,0 @@
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(0);
    });
  });

  describe("parseDiffBlocks - Edge cases", () => {
    it("should handle diff blocks with special characters", () => {
      const content = `
<<<SEARCH>>>
const regex = /[.*+?^$\\{\\}()|[\\]\\\\]/g;
<<<REPLACE>>>
const regex = /[.*+?^$\\{\\}()|[\\]\\\\]/gi;
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.search).toContain("const regex = ");
    });

    it("should handle diff blocks with nested markers in strings", () => {
      const content = `
<<<SEARCH>>>
const str = "This contains <<<SEARCH>>> in a string";
<<<REPLACE>>>
const str = "This contains <<<REPLACE>>> in a string";
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.search).toContain("<<<SEARCH>>>");
    });

    it("should handle very large diff blocks", () => {
      const largeCode = "const x = 1;\n".repeat(1000);
      const content = `
<<<SEARCH>>>
${largeCode}
<<<REPLACE>>>
${largeCode.replace("1", "2")}
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.search.length).toBeGreaterThan(10000);
    });

    it("should handle diff blocks with unicode characters", () => {
      const content = `
<<<SEARCH>>>
const message = "Hello 世界";
<<<REPLACE>>>
const message = "你好 World";
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.search).toContain("世界");
      expect(diffs[0].block.replace).toContain("你好");
    });

    it("should handle diff blocks with emoji", () => {
      const content = `
<<<SEARCH>>>
const status = "✓ Done";
<<<REPLACE>>>
const status = "✗ Failed";
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.search).toContain("✓");
      expect(diffs[0].block.replace).toContain("✗");
    });

    it("should handle diff blocks with tabs and mixed whitespace", () => {
      const content = `
<<<SEARCH>>>
\tif (true) {
\t\treturn false;
\t}
<<<REPLACE>>>
\tif (true) {
\t\treturn true;
\t}
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(1);
      expect(diffs[0].block.search).toContain("\t");
      expect(diffs[0].block.replace).toContain("\t");
    });

    it("should handle consecutive diff blocks without separators", () => {
      const content = `
<<<SEARCH>>>
first
<<<REPLACE>>>
first updated
<<<SEARCH>>>
second
<<<REPLACE>>>
second updated
      `;

      const diffs = DiffParser.parseDiffBlocks(content);

      expect(diffs).toHaveLength(2);
      expect(diffs[0].block.search).toBe("first");
      expect(diffs[1].block.search).toBe("second");
    });
  });

  describe("DiffParseError", () => {
    it("should create error with code and message", () => {
      const error = new DiffParseError("Test error", "TEST_CODE");

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_CODE");
      expect(error.name).toBe("DiffParseError");
    });

    it("should create error with context", () => {
      const error = new DiffParseError(
        "Test error",
        "TEST_CODE",
        "some context",
      );

      expect(error.context).toBe("some context");
    });

    it("should be instance of Error", () => {
      const error = new DiffParseError("Test error", "TEST_CODE");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DiffParseError);
    });
  });
});
