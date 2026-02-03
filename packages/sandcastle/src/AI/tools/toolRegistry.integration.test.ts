/**
 * Integration test for tool-based diff system
 * Tests the complete flow from tool call to code application
 */

import { initializeToolRegistry } from "./toolRegistry";
import type { ToolCall } from "../types";

describe("Tool-Based Diff System Integration", () => {
  const mockSourceCode = {
    javascript: `const viewer = new Cesium.Viewer("cesiumContainer");
viewer.camera.flyHome();`,
    html: `<div id="cesiumContainer"></div>`,
  };

  const getSourceCode = (file: "javascript" | "html") => mockSourceCode[file];

  let toolRegistry: ReturnType<typeof initializeToolRegistry>;

  beforeEach(() => {
    toolRegistry = initializeToolRegistry(getSourceCode);
  });

  test("should initialize tool registry with apply_diff tool", () => {
    const tools = toolRegistry.getAllTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("apply_diff");
    expect(tools[0].description).toContain("Apply a code change");
  });

  test("should execute apply_diff tool successfully", async () => {
    const toolCall: ToolCall = {
      id: "test_call_1",
      name: "apply_diff",
      input: {
        file: "javascript",
        search: "viewer.camera.flyHome();",
        replace:
          "viewer.camera.flyTo({\n  destination: Cesium.Cartesian3.fromDegrees(-117.16, 32.71, 15000.0)\n});",
      },
    };

    const result = await toolRegistry.executeTool(toolCall);

    expect(result.status).toBe("success");
    expect(result.tool_call_id).toBe("test_call_1");
    expect(result.output).toBeDefined();

    const output = JSON.parse(result.output!);
    expect(output.file).toBe("javascript");
    expect(output.modifiedCode).toContain("viewer.camera.flyTo");
    expect(output.modifiedCode).toContain("Cesium.Cartesian3.fromDegrees");
  });

  test("should handle indentation correctly", async () => {
    const indentedCode = `function init() {
  const viewer = new Cesium.Viewer("cesiumContainer");
  viewer.camera.flyHome();
}`;

    const customRegistry = initializeToolRegistry(() => indentedCode);

    const toolCall: ToolCall = {
      id: "test_call_2",
      name: "apply_diff",
      input: {
        file: "javascript",
        search: "  viewer.camera.flyHome();",
        replace:
          "  viewer.camera.setView({\n    destination: new Cesium.Cartesian3()\n  });",
      },
    };

    const result = await customRegistry.executeTool(toolCall);

    expect(result.status).toBe("success");
    const output = JSON.parse(result.output!);
    expect(output.modifiedCode).toContain("  viewer.camera.setView");
    // Verify indentation is preserved
    expect(output.modifiedCode).toMatch(/\s{4}destination:/);
  });

  test("should fail gracefully with invalid input", async () => {
    const toolCall: ToolCall = {
      id: "test_call_3",
      name: "apply_diff",
      input: {
        file: "javascript",
        // Missing 'search' parameter
        replace: "new code",
      },
    };

    const result = await toolRegistry.executeTool(toolCall);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid search parameter");
  });

  test("should fail gracefully when pattern not found", async () => {
    const toolCall: ToolCall = {
      id: "test_call_4",
      name: "apply_diff",
      input: {
        file: "javascript",
        search: "nonexistent code pattern",
        replace: "new code",
      },
    };

    const result = await toolRegistry.executeTool(toolCall);

    expect(result.status).toBe("error");
    expect(result.error).toContain("Could not find match");
  });

  test("should handle empty replacement (deletion)", async () => {
    const toolCall: ToolCall = {
      id: "test_call_5",
      name: "apply_diff",
      input: {
        file: "javascript",
        search: "viewer.camera.flyHome();",
        replace: "", // Delete the line
      },
    };

    const result = await toolRegistry.executeTool(toolCall);

    expect(result.status).toBe("success");
    const output = JSON.parse(result.output!);
    expect(output.modifiedCode).not.toContain("flyHome");
  });

  test("should handle tool execution for non-existent tool", async () => {
    const toolCall: ToolCall = {
      id: "test_call_6",
      name: "nonexistent_tool",
      input: {},
    };

    const result = await toolRegistry.executeTool(toolCall);

    expect(result.status).toBe("error");
    expect(result.error).toContain('Tool "nonexistent_tool" not found');
  });
});
