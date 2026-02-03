/**
 * Tests for App.tsx - specifically for the diff-based editing workflow
 *
 * This test suite focuses on:
 * - handleApplyAiDiff function
 * - Successful diff application
 * - Error handling and recovery
 * - Order-invariant diff application
 * - Integration with DiffApplier and DiffMatcher
 *
 * Rather than testing the full App component (which has complex dependencies),
 * we test the core handleApplyAiDiff logic in isolation with real DiffApplier
 * and DiffMatcher instances.
 */

import { describe, it, expect } from "vitest";
import { DiffFormat, type DiffBlock } from "./AI/types";
import { DiffApplier } from "./AI/DiffApplier";
import { DiffMatcher } from "./AI/DiffMatcher";

/**
 * Simulate the handleApplyAiDiff logic from App.tsx
 * This is the core workflow that needs to be tested
 */
function simulateHandleApplyAiDiff(diffs: DiffBlock[], currentCode: string) {
  const matcher = new DiffMatcher();
  const applier = new DiffApplier(matcher);
  return applier.applyDiffs(currentCode, diffs);
}

describe("App Component - Diff-based Editing Workflow", () => {
  describe("handleApplyAiDiff - Success Cases", () => {
    it("should successfully apply JavaScript diffs and update code", () => {
      const testDiffs: DiffBlock[] = [
        {
          search: 'const oldCode = "test";',
          replace: 'const newCode = "updated";',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const currentCode = 'const oldCode = "test";';
      const result = simulateHandleApplyAiDiff(testDiffs, currentCode);

      expect(result.success).toBe(true);
      expect(result.modifiedCode).toBe('const newCode = "updated";');
      expect(result.appliedDiffs.length).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("should successfully apply HTML diffs and update code", () => {
      const testDiffs: DiffBlock[] = [
        {
          search: '<div class="old">Content</div>',
          replace: '<div class="updated">Content</div>',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const currentCode = '<div class="old">Content</div>';
      const result = simulateHandleApplyAiDiff(testDiffs, currentCode);

      expect(result.success).toBe(true);
      expect(result.modifiedCode).toBe('<div class="updated">Content</div>');
      expect(result.appliedDiffs.length).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle multiple diffs in order-invariant way", () => {
      const testDiffs: DiffBlock[] = [
        {
          search: 'const first = "old";',
          replace: 'const first = "updated";',
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: 'const second = "old";',
          replace: 'const second = "updated";',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const currentCode = `const first = "old";\nconst second = "old";`;
      const result = simulateHandleApplyAiDiff(testDiffs, currentCode);

      expect(result.success).toBe(true);
      expect(result.appliedDiffs.length).toBe(2);
      expect(result.modifiedCode).toContain('const first = "updated";');
      expect(result.modifiedCode).toContain('const second = "updated";');
    });

    it("should handle diffs provided in reverse order (order-invariant)", () => {
      // Provide diffs in reverse order (second before first)
      const testDiffs: DiffBlock[] = [
        {
          search: 'const second = "old";',
          replace: 'const second = "updated";',
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: 'const first = "old";',
          replace: 'const first = "updated";',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const currentCode = `const first = "old";\nconst second = "old";`;
      const result = simulateHandleApplyAiDiff(testDiffs, currentCode);

      // Should still succeed despite order
      expect(result.success).toBe(true);
      expect(result.appliedDiffs.length).toBe(2);
      expect(result.modifiedCode).toContain('const first = "updated";');
      expect(result.modifiedCode).toContain('const second = "updated";');
    });

    it("should apply diffs with whitespace normalization", () => {
      const testDiffs: DiffBlock[] = [
        {
          search: "function  hello(  )  {",
          replace: "function hello() {",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const currentCode = "function hello() {";
      const result = simulateHandleApplyAiDiff(testDiffs, currentCode);

      expect(result.success).toBe(true);
      expect(result.modifiedCode).toBe("function hello() {");
    });
  });

  describe("handleApplyAiDiff - Error Cases", () => {
    it("should handle diff application failure with no matches", () => {
      const testDiffs: DiffBlock[] = [
        {
          search: 'const oldCode = "nonexistent";',
          replace: 'const newCode = "updated";',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const currentCode = 'const differentCode = "test";';
      const result = simulateHandleApplyAiDiff(testDiffs, currentCode);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].type).toBe("no_match");
      expect(result.errors[0].message).toContain("Could not find match");
    });

    it("should handle partial success (some diffs applied, some failed)", () => {
      const testDiffs: DiffBlock[] = [
        {
          search: 'const first = "old";',
          replace: 'const first = "updated";',
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: 'const third = "old";',
          replace: 'const third = "updated";',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const currentCode = `const first = "old";\nconst second = "old";`;
      const result = simulateHandleApplyAiDiff(testDiffs, currentCode);

      // In strict mode (default), partial failures will fail the whole operation
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // The error type will be either "no_match" or "conflict" depending on the detection
      expect(["no_match", "conflict"]).toContain(result.errors[0].type);
      // In strict mode, no modifications should be made
      expect(result.appliedDiffs.length).toBe(0);
    });

    it("should handle conflicts between overlapping diffs", () => {
      const testDiffs: DiffBlock[] = [
        {
          search: 'const code = "test";',
          replace: 'const code = "updated1";',
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: 'const code = "test";',
          replace: 'const code = "updated2";',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const currentCode = 'const code = "test";';
      const result = simulateHandleApplyAiDiff(testDiffs, currentCode);

      expect(result.success).toBe(false);
      expect(result.validation?.conflicts.length).toBeGreaterThan(0);
      expect(["duplicate_match", "overlapping_regions"]).toContain(
        result.validation?.conflicts[0].type,
      );
    });

    it("should handle empty diffs array", () => {
      const testDiffs: DiffBlock[] = [];
      const currentCode = 'const code = "test";';
      const result = simulateHandleApplyAiDiff(testDiffs, currentCode);

      expect(result.success).toBe(true);
      expect(result.modifiedCode).toBe(currentCode);
      expect(result.appliedDiffs.length).toBe(0);
    });

    it("should handle empty source code", () => {
      const testDiffs: DiffBlock[] = [
        {
          search: "test",
          replace: "updated",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const result = simulateHandleApplyAiDiff(testDiffs, "");

      expect(result.success).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].type).toBe("no_match");
    });
  });

  describe("Integration with DiffMatcher and DiffApplier", () => {
    it("should create DiffMatcher and DiffApplier instances correctly", () => {
      const matcher = new DiffMatcher();
      const applier = new DiffApplier(matcher);

      expect(matcher).toBeDefined();
      expect(applier).toBeDefined();
      expect(applier).toBeInstanceOf(DiffApplier);
    });

    it("should pass correct parameters to applyDiffs", () => {
      const currentCode = 'const test = "old";';
      const testDiffs: DiffBlock[] = [
        {
          search: 'const test = "old";',
          replace: 'const test = "new";',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const matcher = new DiffMatcher();
      const applier = new DiffApplier(matcher);
      const result = applier.applyDiffs(currentCode, testDiffs);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should handle validation result structure", () => {
      const testDiffs: DiffBlock[] = [
        {
          search: 'const test = "old";',
          replace: 'const test = "new";',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const currentCode = 'const test = "old";';
      const result = simulateHandleApplyAiDiff(testDiffs, currentCode);

      expect(result.validation).toBeDefined();
      expect(result.validation?.valid).toBe(true);
      expect(result.validation?.conflicts).toHaveLength(0);
      expect(result.validation?.unmatchedDiffs).toHaveLength(0);
      expect(result.validation?.totalDiffs).toBe(1);
      expect(result.validation?.matchedDiffs).toBe(1);
    });

    it("should provide detailed error information", () => {
      const testDiffs: DiffBlock[] = [
        {
          search: 'const missing = "code";',
          replace: 'const found = "code";',
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const currentCode = 'const different = "code";';
      const result = simulateHandleApplyAiDiff(testDiffs, currentCode);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toHaveProperty("type");
      expect(result.errors[0]).toHaveProperty("message");
      expect(result.errors[0]).toHaveProperty("diff");
      expect(result.errors[0]).toHaveProperty("inputIndex");
    });
  });

  describe("Real-world scenarios", () => {
    it("should handle CesiumJS code replacement", () => {
      const testDiffs: DiffBlock[] = [
        {
          search: 'const viewer = new Cesium.Viewer("cesiumContainer");',
          replace: `const viewer = new Cesium.Viewer("cesiumContainer", {
  terrainProvider: Cesium.createWorldTerrain()
});`,
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const currentCode = `import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");`;

      const result = simulateHandleApplyAiDiff(testDiffs, currentCode);

      expect(result.success).toBe(true);
      expect(result.modifiedCode).toContain("terrainProvider");
      expect(result.modifiedCode).toContain("createWorldTerrain");
    });

    it("should handle HTML template changes", () => {
      const testDiffs: DiffBlock[] = [
        {
          search: '<div id="cesiumContainer" class="fullSize"></div>',
          replace: `<div id="cesiumContainer" class="fullSize">
  <div id="toolbar"></div>
</div>`,
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const currentCode = `<style>
  @import url(../templates/bucket.css);
</style>
<div id="cesiumContainer" class="fullSize"></div>
<div id="loadingOverlay"><h1>Loading...</h1></div>`;

      const result = simulateHandleApplyAiDiff(testDiffs, currentCode);

      expect(result.success).toBe(true);
      expect(result.modifiedCode).toContain('<div id="toolbar"></div>');
    });

    it("should handle multiple independent changes", () => {
      const testDiffs: DiffBlock[] = [
        {
          search: "const viewer = new Cesium.Viewer",
          replace: "const myViewer = new Cesium.Viewer",
          format: DiffFormat.SEARCH_REPLACE,
        },
        {
          search: "viewer.camera.flyTo",
          replace: "myViewer.camera.flyTo",
          format: DiffFormat.SEARCH_REPLACE,
        },
      ];

      const currentCode = `const viewer = new Cesium.Viewer("cesiumContainer");
viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(0, 0, 10000) });`;

      const result = simulateHandleApplyAiDiff(testDiffs, currentCode);

      expect(result.success).toBe(true);
      expect(result.appliedDiffs.length).toBe(2);
      expect(result.modifiedCode).toContain(
        "const myViewer = new Cesium.Viewer",
      );
      expect(result.modifiedCode).toContain("myViewer.camera.flyTo");
    });
  });
});
