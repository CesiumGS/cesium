import { describe, it, expect, beforeEach } from "vitest";
import { DiffApplier } from "./DiffApplier";
import { DiffMatcher } from "./DiffMatcher";
import {
  DiffBlock,
  DiffFormat,
  MatchStrategy,
  ConflictType,
  DiffErrorType,
} from "./types";

describe("DiffApplier", () => {
  let applier: DiffApplier;

  beforeEach(() => {
    applier = new DiffApplier();
  });

  describe("Basic Functionality", () => {
    it("should apply a single diff correctly", () => {
      const sourceCode = `function hello() {
  console.log("Hello");
}`;

      const diffs: DiffBlock[] = [
        {
          search: 'console.log("Hello");',
          replace: 'console.log("Hello, World!");',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs);

      expect(result.success).toBe(true);
      expect(result.modifiedCode).toContain('console.log("Hello, World!");');
      expect(result.appliedDiffs).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle empty diff array", () => {
      const sourceCode = "const x = 1;";
      const result = applier.applyDiffs(sourceCode, []);

      expect(result.success).toBe(true);
      expect(result.modifiedCode).toBe(sourceCode);
      expect(result.appliedDiffs).toHaveLength(0);
    });

    it("should handle empty source code", () => {
      const diffs: DiffBlock[] = [
        {
          search: "test",
          replace: "updated",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs("", diffs);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(DiffErrorType.NO_MATCH);
    });
  });

  describe("Order-Invariant Application (Key Feature)", () => {
    const sourceCode = `function foo() {
  console.log("foo");
}

function bar() {
  console.log("bar");
}

function baz() {
  console.log("baz");
}`;

    it("should apply in-order diffs correctly (baseline)", () => {
      const diffs: DiffBlock[] = [
        {
          search: 'console.log("foo");',
          replace: 'console.log("FOO");',
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: 'console.log("bar");',
          replace: 'console.log("BAR");',
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: 'console.log("baz");',
          replace: 'console.log("BAZ");',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs);

      expect(result.success).toBe(true);
      expect(result.modifiedCode).toContain('console.log("FOO");');
      expect(result.modifiedCode).toContain('console.log("BAR");');
      expect(result.modifiedCode).toContain('console.log("BAZ");');
      expect(result.appliedDiffs).toHaveLength(3);
    });

    it("should handle out-of-order diffs (key feature!)", () => {
      // AI returns diffs in wrong order: middle, first, last
      const diffs: DiffBlock[] = [
        {
          search: 'console.log("bar");', // Line 6 (middle)
          replace: 'console.log("BAR");',
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: 'console.log("foo");', // Line 2 (first)
          replace: 'console.log("FOO");',
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: 'console.log("baz");', // Line 10 (last)
          replace: 'console.log("BAZ");',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs);

      expect(result.success).toBe(true);
      expect(result.modifiedCode).toContain('console.log("FOO");');
      expect(result.modifiedCode).toContain('console.log("BAR");');
      expect(result.modifiedCode).toContain('console.log("BAZ");');
      expect(result.appliedDiffs).toHaveLength(3);

      // Verify they were applied in position order (bottom-to-top)
      // After reverse application, they should be in file order
      const appliedIndices = result.appliedDiffs.map((a) => a.inputIndex);
      // Applied diffs are stored in file order: 1 (foo), 0 (bar), 2 (baz)
      expect(appliedIndices).toEqual([1, 0, 2]);
    });

    it("should handle completely reversed diffs", () => {
      const diffs: DiffBlock[] = [
        {
          search: 'console.log("baz");', // Last
          replace: 'console.log("BAZ");',
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: 'console.log("bar");', // Middle
          replace: 'console.log("BAR");',
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: 'console.log("foo");', // First
          replace: 'console.log("FOO");',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs);

      expect(result.success).toBe(true);
      expect(result.appliedDiffs).toHaveLength(3);
      expect(result.modifiedCode).toContain('console.log("FOO");');
      expect(result.modifiedCode).toContain('console.log("BAR");');
      expect(result.modifiedCode).toContain('console.log("BAZ");');
    });

    it("should handle randomly shuffled diffs", () => {
      const diffs: DiffBlock[] = [
        {
          search: 'console.log("foo");',
          replace: 'console.log("FOO");',
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: 'console.log("baz");',
          replace: 'console.log("BAZ");',
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: 'console.log("bar");',
          replace: 'console.log("BAR");',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs);

      expect(result.success).toBe(true);
      expect(result.appliedDiffs).toHaveLength(3);
    });
  });

  describe("Conflict Detection", () => {
    it("should detect overlapping diffs", () => {
      const sourceCode = `function test() {
  const x = 1;
  const y = 2;
}`;

      const diffs: DiffBlock[] = [
        {
          search: "const x = 1;\n  const y = 2;",
          replace: "const x = 10;\n  const y = 20;",
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: "const y = 2;",
          replace: "const y = 200;",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs);

      expect(result.success).toBe(false);
      expect(result.validation?.conflicts).toHaveLength(1);
      expect(result.validation?.conflicts[0].type).toBe(
        ConflictType.OVERLAPPING_REGIONS,
      );
    });

    it("should detect duplicate matches", () => {
      const sourceCode = "const x = 1;";

      const diffs: DiffBlock[] = [
        {
          search: "const x = 1;",
          replace: "const x = 2;",
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: "const x = 1;",
          replace: "const x = 3;",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs);

      expect(result.success).toBe(false);
      expect(result.validation?.conflicts.length).toBeGreaterThanOrEqual(1);
      const hasDuplicateMatch = result.validation?.conflicts.some(
        (c) => c.type === ConflictType.DUPLICATE_MATCH,
      );
      expect(hasDuplicateMatch).toBe(true);
    });

    it("should allow overlaps when allowOverlaps is true", () => {
      const sourceCode = "const x = 1;";

      const diffs: DiffBlock[] = [
        {
          search: "const x = 1;",
          replace: "const x = 2;",
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: "const x = 1;",
          replace: "const x = 3;",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs, {
        allowOverlaps: true,
        strict: false,
      });

      expect(result.appliedDiffs.length).toBeGreaterThan(0);
    });
  });

  describe("Validation and Dry-Run", () => {
    it("should validate diffs without applying them", () => {
      const sourceCode = 'console.log("test");';

      const diffs: DiffBlock[] = [
        {
          search: 'console.log("test");',
          replace: 'console.log("updated");',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const validation = applier.validateDiffs(sourceCode, diffs);

      expect(validation.valid).toBe(true);
      expect(validation.matchedDiffs).toBe(1);
      expect(validation.totalDiffs).toBe(1);
      expect(validation.conflicts).toHaveLength(0);
      expect(validation.unmatchedDiffs).toHaveLength(0);
    });

    it("should run in dry-run mode", () => {
      const sourceCode = 'console.log("test");';

      const diffs: DiffBlock[] = [
        {
          search: 'console.log("test");',
          replace: 'console.log("updated");',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.modifiedCode).toBeUndefined();
      expect(result.appliedDiffs).toHaveLength(0);
      expect(result.validation).toBeDefined();
      expect(result.validation?.valid).toBe(true);
    });

    it("should detect unmatched diffs in validation", () => {
      const sourceCode = 'console.log("test");';

      const diffs: DiffBlock[] = [
        {
          search: 'console.log("nonexistent");',
          replace: 'console.log("updated");',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const validation = applier.validateDiffs(sourceCode, diffs);

      expect(validation.valid).toBe(false);
      expect(validation.matchedDiffs).toBe(0);
      expect(validation.unmatchedDiffs).toHaveLength(1);
      expect(validation.unmatchedDiffs[0].reason).toContain("Could not find");
    });
  });

  describe("Error Handling", () => {
    it("should fail fast in strict mode on first error", () => {
      const sourceCode = 'console.log("test");';

      const diffs: DiffBlock[] = [
        {
          search: "nonexistent1",
          replace: "updated1",
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: "nonexistent2",
          replace: "updated2",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs, { strict: true });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.appliedDiffs).toHaveLength(0);
    });

    it("should continue and collect all errors in non-strict mode", () => {
      const sourceCode = `console.log("test");
console.log("valid");`;

      const diffs: DiffBlock[] = [
        {
          search: "nonexistent1",
          replace: "updated1",
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: 'console.log("valid");',
          replace: 'console.log("VALID");',
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: "nonexistent2",
          replace: "updated2",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs, { strict: false });

      // In non-strict mode, it continues past errors and applies what it can
      expect(result.success).toBe(false); // Still fails because of errors
      expect(result.errors).toHaveLength(2); // Two failed to match
      expect(result.appliedDiffs).toHaveLength(1); // One was applied
      expect(result.modifiedCode).toContain('console.log("VALID");');
    });

    it("should report NO_MATCH error type", () => {
      const sourceCode = 'console.log("test");';

      const diffs: DiffBlock[] = [
        {
          search: "nonexistent",
          replace: "updated",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(DiffErrorType.NO_MATCH);
      expect(result.errors[0].inputIndex).toBe(0);
    });
  });

  describe("Match Strategy Integration", () => {
    it("should work with exact match strategy", () => {
      const sourceCode = 'console.log("test");';

      const diffs: DiffBlock[] = [
        {
          search: 'console.log("test");',
          replace: 'console.log("updated");',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs, {
        matchOptions: {
          strategies: [MatchStrategy.EXACT],
        },
      });

      expect(result.success).toBe(true);
      expect(result.appliedDiffs[0].matchResult.strategy).toBe(
        MatchStrategy.EXACT,
      );
    });

    it("should work with whitespace normalized strategy", () => {
      const sourceCode = "function test()   {\n  console.log('test');\n}";

      const diffs: DiffBlock[] = [
        {
          search: "function test() {\nconsole.log('test');",
          replace: "function test() {\nconsole.log('updated');",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs, {
        matchOptions: {
          strategies: [
            MatchStrategy.WHITESPACE_NORMALIZED,
            MatchStrategy.EXACT,
          ],
        },
      });

      expect(result.success).toBe(true);
      expect(result.appliedDiffs[0].matchResult.strategy).toBe(
        MatchStrategy.WHITESPACE_NORMALIZED,
      );
    });

    it("should work with fuzzy match strategy", () => {
      const sourceCode = 'console.log("test");';

      const diffs: DiffBlock[] = [
        {
          // Slightly different (typo)
          search: 'console.log("tset");',
          replace: 'console.log("updated");',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs, {
        matchOptions: {
          strategies: [MatchStrategy.FUZZY],
          minConfidence: 0.8,
        },
      });

      expect(result.success).toBe(true);
      expect(result.appliedDiffs[0].matchResult.strategy).toBe(
        MatchStrategy.FUZZY,
      );
    });

    it("should work with context-based strategy", () => {
      const sourceCode = `function test() {
  const x = 1;
  const y = 2;
  const z = 3;
}`;

      const diffs: DiffBlock[] = [
        {
          search: "const x = 1;\n  const y = 2;",
          replace: "const x = 10;\n  const y = 20;",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs, {
        matchOptions: {
          strategies: [MatchStrategy.CONTEXT_BASED],
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle deletion (empty replace)", () => {
      const sourceCode = `const x = 1;
const y = 2;
const z = 3;`;

      const diffs: DiffBlock[] = [
        {
          search: "const y = 2;\n",
          replace: "",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs);

      expect(result.success).toBe(true);
      expect(result.modifiedCode).not.toContain("const y = 2;");
      expect(result.modifiedCode).toContain("const x = 1;");
      expect(result.modifiedCode).toContain("const z = 3;");
    });

    it("should handle insertion (expanding text)", () => {
      const sourceCode = "const x = 1;";

      const diffs: DiffBlock[] = [
        {
          search: "const x = 1;",
          replace: "const x = 1;\nconst y = 2;\nconst z = 3;",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs);

      expect(result.success).toBe(true);
      expect(result.modifiedCode).toContain("const y = 2;");
      expect(result.modifiedCode).toContain("const z = 3;");
    });

    it("should track offset adjustments correctly", () => {
      const sourceCode = `line1
line2
line3`;

      const diffs: DiffBlock[] = [
        {
          search: "line2",
          replace: "line2_extended_much_longer",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs);

      expect(result.success).toBe(true);
      expect(result.appliedDiffs[0].offsetAdjustment).toBe(
        "line2_extended_much_longer".length - "line2".length,
      );
    });

    it("should handle single-line file", () => {
      const sourceCode = "const x = 1;";

      const diffs: DiffBlock[] = [
        {
          search: "const x = 1;",
          replace: "const x = 2;",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs);

      expect(result.success).toBe(true);
      expect(result.modifiedCode).toBe("const x = 2;");
    });

    it("should handle file with only whitespace", () => {
      const sourceCode = "   \n  \n   ";

      const diffs: DiffBlock[] = [
        {
          search: "test",
          replace: "updated",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs);

      expect(result.success).toBe(false);
      expect(result.errors[0].type).toBe(DiffErrorType.NO_MATCH);
    });
  });

  describe("Large-Scale Tests", () => {
    it("should handle many diffs efficiently", () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line${i}`);
      const sourceCode = lines.join("\n");

      // Create diffs for every other line (50 diffs)
      const diffs: DiffBlock[] = [];
      for (let i = 0; i < 100; i += 2) {
        diffs.push({
          search: `line${i}`,
          replace: `LINE${i}`,
          format: DiffFormat.SEARCH_REPLACE,
        });
      }

      const result = applier.applyDiffs(sourceCode, diffs);

      expect(result.success).toBe(true);
      expect(result.appliedDiffs).toHaveLength(50);

      // Verify all even lines were updated
      for (let i = 0; i < 100; i += 2) {
        expect(result.modifiedCode).toContain(`LINE${i}`);
      }

      // Verify odd lines unchanged
      for (let i = 1; i < 100; i += 2) {
        expect(result.modifiedCode).toContain(`line${i}`);
      }
    });

    it("should handle many diffs in random order", () => {
      const lines = Array.from({ length: 50 }, (_, i) => `line${i}`);
      const sourceCode = lines.join("\n");

      const diffs: DiffBlock[] = [];
      for (let i = 0; i < 50; i++) {
        diffs.push({
          search: `line${i}`,
          replace: `LINE${i}`,
          format: DiffFormat.SEARCH_REPLACE,
        });
      }

      // Shuffle diffs randomly
      const shuffled = [...diffs].sort(() => Math.random() - 0.5);

      const result = applier.applyDiffs(sourceCode, shuffled);

      expect(result.success).toBe(true);
      expect(result.appliedDiffs).toHaveLength(50);

      // Verify all lines were updated
      for (let i = 0; i < 50; i++) {
        expect(result.modifiedCode).toContain(`LINE${i}`);
      }
    });
  });

  describe("Real-World Scenarios", () => {
    it("should handle typical AI-generated code edits", () => {
      const sourceCode = `import React from 'react';

function MyComponent() {
  const [count, setCount] = React.useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

export default MyComponent;`;

      // AI might return these out of order
      const diffs: DiffBlock[] = [
        {
          search: "const [count, setCount] = React.useState(0);",
          replace:
            "const [count, setCount] = React.useState(0);\n  const [name, setName] = React.useState('');",
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: "import React from 'react';",
          replace: "import React, { useState } from 'react';",
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: "<p>Count: {count}</p>",
          replace: "<p>Count: {count}</p>\n      <p>Name: {name}</p>",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs);

      expect(result.success).toBe(true);
      expect(result.modifiedCode).toContain("import React, { useState }");
      expect(result.modifiedCode).toContain("const [name, setName]");
      expect(result.modifiedCode).toContain("<p>Name: {name}</p>");
    });

    it("should handle function refactoring", () => {
      const sourceCode = `function calculate(a, b) {
  const sum = a + b;
  const product = a * b;
  return { sum, product };
}`;

      const diffs: DiffBlock[] = [
        {
          search: "return { sum, product };",
          replace:
            "const result = { sum, product };\n  console.log('Calculated:', result);\n  return result;",
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: "function calculate(a, b) {",
          replace: "function calculate(a, b, options = {}) {",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs);

      expect(result.success).toBe(true);
      expect(result.modifiedCode).toContain("options = {}");
      expect(result.modifiedCode).toContain(
        "console.log('Calculated:', result);",
      );
    });
  });

  describe("Summary Generation", () => {
    it("should generate a readable summary", () => {
      const sourceCode = 'console.log("test");';

      const diffs: DiffBlock[] = [
        {
          search: 'console.log("test");',
          replace: 'console.log("updated");',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs);
      const summary = DiffApplier.getSummary(result);

      expect(summary).toContain("Success: true");
      expect(summary).toContain("Applied: 1 diffs");
      expect(summary).toContain("Errors: 0");
      expect(summary).toContain("Valid: true");
    });

    it("should include error details in summary", () => {
      const sourceCode = 'console.log("test");';

      const diffs: DiffBlock[] = [
        {
          search: "nonexistent",
          replace: "updated",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs);
      const summary = DiffApplier.getSummary(result);

      expect(summary).toContain("Success: false");
      expect(summary).toContain("Errors:");
      expect(summary).toContain("no_match");
    });
  });

  describe("Custom Matcher Integration", () => {
    it("should accept a custom DiffMatcher instance", () => {
      const customMatcher = new DiffMatcher();
      const customApplier = new DiffApplier(customMatcher);

      const sourceCode = 'console.log("test");';
      const diffs: DiffBlock[] = [
        {
          search: 'console.log("test");',
          replace: 'console.log("updated");',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = customApplier.applyDiffs(sourceCode, diffs);

      expect(result.success).toBe(true);
    });
  });

  describe("Offset Preservation", () => {
    it("should correctly handle multiple diffs with varying length changes", () => {
      const sourceCode = `const a = 1;
const b = 2;
const c = 3;
const d = 4;`;

      const diffs: DiffBlock[] = [
        {
          search: "const a = 1;",
          replace: "const a = 100;", // +2 chars
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: "const b = 2;",
          replace: "const b = 2000;", // +2 chars
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: "const c = 3;",
          replace: "const c = 3;", // no change
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: "const d = 4;",
          replace: "const d = 4000000;", // +5 chars
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = applier.applyDiffs(sourceCode, diffs);

      expect(result.success).toBe(true);
      expect(result.modifiedCode).toContain("const a = 100;");
      expect(result.modifiedCode).toContain("const b = 2000;");
      expect(result.modifiedCode).toContain("const c = 3;");
      expect(result.modifiedCode).toContain("const d = 4000000;");
    });
  });
});
