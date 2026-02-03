import { describe, it, expect, beforeEach } from "vitest";
import { DiffMatcher } from "./DiffMatcher";
import { MatchStrategy } from "./types";

describe("DiffMatcher", () => {
  let matcher: DiffMatcher;

  beforeEach(() => {
    matcher = new DiffMatcher();
  });

  describe("Exact Matching", () => {
    it("should find exact match in simple text", () => {
      const source = "hello world\nfoo bar\nbaz qux";
      const search = "foo bar";

      const result = matcher.findMatch(search, source);

      expect(result).not.toBeNull();
      expect(result?.strategy).toBe(MatchStrategy.EXACT);
      expect(result?.confidence).toBe(1.0);
      expect(result?.matchedText).toBe("foo bar");
      expect(result?.startLine).toBe(2);
    });

    it("should find exact match with special characters", () => {
      const source = 'const x = { key: "value" };\nconst y = 42;';
      const search = 'const x = { key: "value" };';

      const result = matcher.findMatch(search, source);

      expect(result).not.toBeNull();
      expect(result?.strategy).toBe(MatchStrategy.EXACT);
      expect(result?.confidence).toBe(1.0);
    });

    it("should respect case sensitivity by default", () => {
      const source = "Hello World";
      const search = "hello world";

      const result = matcher.findMatch(search, source, {
        strategies: [MatchStrategy.EXACT], // Only use exact matching to test case sensitivity
      });

      expect(result).toBeNull();
    });

    it("should ignore case when caseSensitive is false", () => {
      const source = "Hello World";
      const search = "hello world";

      const result = matcher.findMatch(search, source, {
        caseSensitive: false,
      });

      expect(result).not.toBeNull();
      expect(result?.strategy).toBe(MatchStrategy.EXACT);
      expect(result?.matchedText).toBe("Hello World");
    });

    it("should handle multi-line exact matches", () => {
      const source = "line1\nline2\nline3\nline4";
      const search = "line2\nline3";

      const result = matcher.findMatch(search, source);

      expect(result).not.toBeNull();
      expect(result?.matchedText).toBe("line2\nline3");
      expect(result?.startLine).toBe(2);
      expect(result?.endLine).toBe(3);
    });

    it("should return null when no exact match exists", () => {
      const source = "hello world";
      const search = "goodbye";

      const result = matcher.findMatch(search, source);

      expect(result).toBeNull();
    });
  });

  describe("Whitespace Normalized Matching", () => {
    it("should match despite different spacing", () => {
      const source = "function    foo()    {\n  return   42;\n}";
      const search = "function foo() {\nreturn 42;\n}";

      const result = matcher.findMatch(search, source, {
        strategies: [MatchStrategy.WHITESPACE_NORMALIZED],
      });

      expect(result).not.toBeNull();
      expect(result?.strategy).toBe(MatchStrategy.WHITESPACE_NORMALIZED);
      expect(result?.confidence).toBeCloseTo(0.99, 2);
    });

    it("should match despite tabs vs spaces", () => {
      const source = "if (x) {\n\treturn true;\n}";
      const search = "if (x) {\n  return true;\n}";

      const result = matcher.findMatch(search, source, {
        strategies: [MatchStrategy.WHITESPACE_NORMALIZED],
      });

      expect(result).not.toBeNull();
      expect(result?.strategy).toBe(MatchStrategy.WHITESPACE_NORMALIZED);
    });

    it("should match despite CRLF vs LF", () => {
      const source = "line1\r\nline2\r\nline3";
      const search = "line1\nline2\nline3";

      const result = matcher.findMatch(search, source, {
        strategies: [MatchStrategy.WHITESPACE_NORMALIZED],
      });

      expect(result).not.toBeNull();
      expect(result?.strategy).toBe(MatchStrategy.WHITESPACE_NORMALIZED);
    });

    it("should match despite different indentation levels", () => {
      const source = "  function test() {\n    return 42;\n  }";
      const search = "function test() {\nreturn 42;\n}";

      const result = matcher.findMatch(search, source, {
        strategies: [MatchStrategy.WHITESPACE_NORMALIZED],
      });

      expect(result).not.toBeNull();
      expect(result?.strategy).toBe(MatchStrategy.WHITESPACE_NORMALIZED);
    });

    it("should handle trailing whitespace", () => {
      const source = "foo bar  \nbaz qux   ";
      const search = "foo bar\nbaz qux";

      const result = matcher.findMatch(search, source, {
        strategies: [MatchStrategy.WHITESPACE_NORMALIZED],
      });

      expect(result).not.toBeNull();
    });
  });

  describe("Fuzzy Matching", () => {
    it("should match with minor typos", () => {
      const source = "function calculateTotal() {\n  return sum + tax;\n}";
      const search = "function calculateTotl() {\n  return sum + tax;\n}"; // typo: Totl

      const result = matcher.findMatch(search, source, {
        strategies: [MatchStrategy.FUZZY],
        minConfidence: 0.85,
      });

      expect(result).not.toBeNull();
      expect(result?.strategy).toBe(MatchStrategy.FUZZY);
      expect(result?.confidence).toBeGreaterThan(0.85);
    });

    it("should match with slight length differences", () => {
      const source = "const result = data.map(x => x * 2);";
      const search = "const result = data.map(x => x * 2)";

      const result = matcher.findMatch(search, source, {
        strategies: [MatchStrategy.FUZZY],
        minConfidence: 0.9,
      });

      expect(result).not.toBeNull();
      expect(result?.strategy).toBe(MatchStrategy.FUZZY);
    });

    it("should find best match when multiple candidates exist", () => {
      const source =
        "function foo() { return 1; }\nfunction fooBar() { return 2; }\nfunction foo() { return 3; }";
      const search = "function foo() { return 1; }";

      const result = matcher.findMatch(search, source, {
        strategies: [MatchStrategy.FUZZY],
        minConfidence: 0.9,
      });

      expect(result).not.toBeNull();
      expect(result?.matchedText).toBe("function foo() { return 1; }");
      expect(result?.startLine).toBe(1);
    });

    it("should reject match below confidence threshold", () => {
      const source = "completely different text here";
      const search = "function foo() { return bar; }";

      const result = matcher.findMatch(search, source, {
        strategies: [MatchStrategy.FUZZY],
        minConfidence: 0.9,
      });

      expect(result).toBeNull();
    });

    it("should handle empty search or source", () => {
      expect(matcher.findMatch("", "some source")).toBeNull();
      expect(matcher.findMatch("search", "")).toBeNull();
    });

    it("should match with variable name changes", () => {
      const source = "const userName = getUserName();\nreturn userName;";
      const search = "const userId = getUserName();\nreturn userId;";

      const result = matcher.findMatch(search, source, {
        strategies: [MatchStrategy.FUZZY],
        minConfidence: 0.75,
      });

      expect(result).not.toBeNull();
      expect(result?.confidence).toBeGreaterThan(0.75);
    });
  });

  describe("Context-Based Matching", () => {
    it("should match based on surrounding context", () => {
      const source = `
function setup() {
  const viewer = new Viewer();
  viewer.initialize();
  return viewer;
}
`;

      const search = `
function setup() {
  const viewer = new Viewer();
  viewer.init(); // method name changed
  return viewer;
}
`;

      const result = matcher.findMatch(search, source, {
        strategies: [MatchStrategy.CONTEXT_BASED],
        minConfidence: 0.8,
        contextLines: 2,
      });

      expect(result).not.toBeNull();
      expect(result?.strategy).toBe(MatchStrategy.CONTEXT_BASED);
    });

    it("should use context lines to match", () => {
      const source = `
line1
line2
line3
line4
line5
`;

      const search = `
line1
line2
modified line3
line4
line5
`;

      const result = matcher.findMatch(search, source, {
        strategies: [MatchStrategy.CONTEXT_BASED],
        minConfidence: 0.7,
        contextLines: 1,
      });

      expect(result).not.toBeNull();
    });

    it("should handle short code blocks", () => {
      const source = "const x = 1;\nconst y = 2;";
      const search = "const x = 1;\nconst y = 3;";

      const result = matcher.findMatch(search, source, {
        strategies: [MatchStrategy.CONTEXT_BASED],
        minConfidence: 0.5,
      });

      expect(result).not.toBeNull();
    });
  });

  describe("Multi-Strategy Fallback", () => {
    it("should try strategies in order", () => {
      const source = "function   foo()   {\n  return   42;\n}";
      const search = "function foo() {\n  return 42;\n}";

      const result = matcher.findMatch(search, source);

      // Should use whitespace normalized, not exact
      expect(result).not.toBeNull();
      expect(result?.strategy).toBe(MatchStrategy.WHITESPACE_NORMALIZED);
    });

    it("should fall back to fuzzy when whitespace doesn't match", () => {
      const source = "function calculateSum() { return a + b; }";
      const search = "function calculateSm() { return a + b; }"; // typo

      const result = matcher.findMatch(search, source, {
        minConfidence: 0.85,
      });

      expect(result).not.toBeNull();
      expect(result?.strategy).toBe(MatchStrategy.FUZZY);
    });

    it("should use only specified strategies", () => {
      const source = "HELLO WORLD";
      const search = "hello world";

      const result = matcher.findMatch(search, source, {
        strategies: [MatchStrategy.EXACT],
        caseSensitive: true,
      });

      // Should not find match since only exact is allowed
      expect(result).toBeNull();
    });

    it("should stop at first successful strategy", () => {
      const source = "exact match here";
      const search = "exact match here";

      const result = matcher.findMatch(search, source, {
        strategies: [
          MatchStrategy.EXACT,
          MatchStrategy.FUZZY,
          MatchStrategy.CONTEXT_BASED,
        ],
      });

      // Should stop at exact match
      expect(result?.strategy).toBe(MatchStrategy.EXACT);
      expect(result?.confidence).toBe(1.0);
    });
  });

  describe("calculateSimilarity", () => {
    it("should return 1.0 for identical strings", () => {
      expect(matcher.calculateSimilarity("hello", "hello")).toBe(1.0);
    });

    it("should return 0.0 for completely different strings", () => {
      const similarity = matcher.calculateSimilarity("abc", "xyz");
      expect(similarity).toBeLessThan(0.5);
    });

    it("should return intermediate values for similar strings", () => {
      const similarity = matcher.calculateSimilarity("hello", "helo");
      expect(similarity).toBeGreaterThan(0.7);
      expect(similarity).toBeLessThan(1.0);
    });

    it("should handle empty strings", () => {
      expect(matcher.calculateSimilarity("", "")).toBe(1.0);
      expect(matcher.calculateSimilarity("", "abc")).toBe(0.0);
      expect(matcher.calculateSimilarity("abc", "")).toBe(0.0);
    });

    it("should be case-sensitive", () => {
      const similarity = matcher.calculateSimilarity("Hello", "hello");
      expect(similarity).toBeLessThan(1.0);
      expect(similarity).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe("normalizeWhitespace", () => {
    it("should normalize tabs to spaces", () => {
      const result = matcher.normalizeWhitespace("hello\tworld");
      expect(result).toBe("hello world");
    });

    it("should normalize multiple spaces to single space", () => {
      const result = matcher.normalizeWhitespace("hello    world");
      expect(result).toBe("hello world");
    });

    it("should normalize CRLF to LF", () => {
      const result = matcher.normalizeWhitespace("line1\r\nline2\r\nline3");
      expect(result).toBe("line1\nline2\nline3");
    });

    it("should normalize CR to LF", () => {
      const result = matcher.normalizeWhitespace("line1\rline2\rline3");
      expect(result).toBe("line1\nline2\nline3");
    });

    it("should trim leading and trailing whitespace per line", () => {
      const result = matcher.normalizeWhitespace("  line1  \n  line2  ");
      expect(result).toBe("line1\nline2");
    });

    it("should handle mixed whitespace", () => {
      const result = matcher.normalizeWhitespace(
        "  \t  hello  \t  world  \t  ",
      );
      expect(result).toBe("hello world");
    });

    it("should preserve line structure", () => {
      const result = matcher.normalizeWhitespace("line1\nline2\nline3");
      expect(result).toBe("line1\nline2\nline3");
    });
  });

  describe("extractContext", () => {
    it("should extract context lines around target", () => {
      const code = "line0\nline1\nline2\nline3\nline4\nline5";
      const result = matcher.extractContext(code, 2, 1);
      expect(result).toBe("line1\nline2\nline3");
    });

    it("should handle start of file", () => {
      const code = "line0\nline1\nline2";
      const result = matcher.extractContext(code, 0, 2);
      expect(result).toBe("line0\nline1\nline2");
    });

    it("should handle end of file", () => {
      const code = "line0\nline1\nline2";
      const result = matcher.extractContext(code, 2, 2);
      expect(result).toBe("line0\nline1\nline2");
    });

    it("should handle zero context lines", () => {
      const code = "line0\nline1\nline2";
      const result = matcher.extractContext(code, 1, 0);
      expect(result).toBe("line1");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty search text", () => {
      const result = matcher.findMatch("", "some source code");
      expect(result).toBeNull();
    });

    it("should handle empty source code", () => {
      const result = matcher.findMatch("search text", "");
      expect(result).toBeNull();
    });

    it("should handle search longer than source", () => {
      const result = matcher.findMatch("very long search text", "short");
      expect(result).toBeNull();
    });

    it("should handle single character matches", () => {
      const result = matcher.findMatch("x", "x");
      expect(result).not.toBeNull();
      expect(result?.matchedText).toBe("x");
    });

    it("should handle Unicode characters", () => {
      const source = "const emoji = '🎉';";
      const search = "const emoji = '🎉';";
      const result = matcher.findMatch(search, source);
      expect(result).not.toBeNull();
    });

    it("should handle very long lines", () => {
      const longLine = "x".repeat(10000);
      const source = `line1\n${longLine}\nline3`;
      const result = matcher.findMatch(longLine, source);
      expect(result).not.toBeNull();
    });

    it("should handle code with regex patterns", () => {
      const source = "const pattern = /\\d+\\.\\d+/g;";
      const search = "const pattern = /\\d+\\.\\d+/g;";
      const result = matcher.findMatch(search, source);
      expect(result).not.toBeNull();
    });
  });

  describe("Performance", () => {
    it("should handle large files efficiently", () => {
      const lines = Array.from({ length: 1000 }, (_, i) => `line${i}`);
      const source = lines.join("\n");
      const search = "line500\nline501\nline502";

      const startTime = performance.now();
      const result = matcher.findMatch(search, source);
      const endTime = performance.now();

      expect(result).not.toBeNull();
      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
    });

    it("should handle repeated matches efficiently", () => {
      const source = "foo\n".repeat(100);
      const search = "foo";

      const startTime = performance.now();
      const result = matcher.findMatch(search, source);
      const endTime = performance.now();

      expect(result).not.toBeNull();
      expect(endTime - startTime).toBeLessThan(50);
    });

    it("should handle worst-case fuzzy matching", () => {
      // Worst case: no match exists, must scan entire file
      const source = "a".repeat(1000);
      const search = "b".repeat(50);

      const startTime = performance.now();
      const result = matcher.findMatch(search, source, {
        strategies: [MatchStrategy.FUZZY],
        minConfidence: 0.9,
      });
      const endTime = performance.now();

      expect(result).toBeNull();
      expect(endTime - startTime).toBeLessThan(500); // Should complete in < 500ms
    });
  });

  describe("Real-World Scenarios", () => {
    it("should match TypeScript function with formatting changes", () => {
      const source = `
export function createViewer(containerId: string): Viewer {
  const viewer = new Viewer(containerId, {
    baseLayerPicker: false,
    geocoder: false,
  });
  return viewer;
}`;

      const search = `export function createViewer(containerId: string): Viewer {
  const viewer = new Viewer(containerId, { baseLayerPicker: false, geocoder: false });
  return viewer;
}`;

      const result = matcher.findMatch(search, source);
      expect(result).not.toBeNull();
    });

    it("should match React component with whitespace changes", () => {
      const source = `function Button({ label, onClick }) {
  return (
    <button onClick={onClick}>
      {label}
    </button>
  );
}`;

      // Same structure, just different whitespace
      const search = `function   Button({   label,   onClick   })   {
  return   (
    <button   onClick={onClick}>
      {label}
    </button>
  );
}`;

      const result = matcher.findMatch(search, source);
      expect(result).not.toBeNull();
      // Should use whitespace normalized matching
      expect([
        MatchStrategy.WHITESPACE_NORMALIZED,
        MatchStrategy.EXACT,
      ]).toContain(result?.strategy);
    });

    it("should match CSS with different formatting", () => {
      const source = `
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}`;

      const search = `.container { display: flex; justify-content: center; align-items: center; }`;

      const result = matcher.findMatch(search, source);
      expect(result).not.toBeNull();
    });

    it("should match JSON with different whitespace", () => {
      const source = `{
  "name": "test",
  "version": "1.0.0",
  "main": "index.js"
}`;

      // Same JSON structure with extra spaces
      const search = `{
  "name":    "test",
  "version":    "1.0.0",
  "main":    "index.js"
}`;

      const result = matcher.findMatch(search, source);
      expect(result).not.toBeNull();
      // Should use whitespace normalized matching
      expect(result?.strategy).toBe(MatchStrategy.WHITESPACE_NORMALIZED);
    });
  });

  describe("Line Number Accuracy", () => {
    it("should report correct line numbers", () => {
      const source = "line1\nline2\nline3\nline4\nline5";
      const search = "line3\nline4";

      const result = matcher.findMatch(search, source);

      expect(result).not.toBeNull();
      expect(result?.startLine).toBe(3);
      expect(result?.endLine).toBe(4);
    });

    it("should report correct position for single line match", () => {
      const source = "line1\nline2\nline3";
      const search = "line2";

      const result = matcher.findMatch(search, source);

      expect(result).not.toBeNull();
      expect(result?.startLine).toBe(2);
      expect(result?.endLine).toBe(2);
    });

    it("should report correct position at start of file", () => {
      const source = "first line\nsecond line";
      const search = "first line";

      const result = matcher.findMatch(search, source);

      expect(result).not.toBeNull();
      expect(result?.startLine).toBe(1);
    });

    it("should report correct position at end of file", () => {
      const source = "first line\nlast line";
      const search = "last line";

      const result = matcher.findMatch(search, source);

      expect(result).not.toBeNull();
      expect(result?.endLine).toBe(2);
    });
  });
});
