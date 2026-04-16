/**
 * StreamingDiffPreview Usage Examples
 *
 * This file demonstrates how to use the StreamingDiffPreview component
 * in various scenarios.
 */

import { useState, useEffect } from "react";
import { StreamingDiffPreview } from "./StreamingDiffPreview";

/**
 * Example 1: Basic Streaming Diff
 * Shows a simple diff that's currently streaming
 */
export function BasicStreamingDiffExample() {
  return (
    <StreamingDiffPreview
      diffIndex={0}
      language="javascript"
      searchContent='const oldCode = "test";'
      replaceContent='const newCode = "updated";'
      isComplete={false}
      isStreaming={true}
    />
  );
}

/**
 * Example 2: Completed Diff
 * Shows a diff that has finished streaming
 */
export function CompletedDiffExample() {
  return (
    <StreamingDiffPreview
      diffIndex={0}
      language="javascript"
      searchContent='const oldCode = "test";'
      replaceContent='const newCode = "updated";'
      isComplete={true}
      isStreaming={false}
    />
  );
}

/**
 * Example 3: Pending Diff
 * Shows a diff that hasn't started streaming yet
 */
export function PendingDiffExample() {
  return (
    <StreamingDiffPreview
      diffIndex={0}
      language="javascript"
      searchContent='const oldCode = "test";'
      replaceContent=""
      isComplete={false}
      isStreaming={false}
    />
  );
}

/**
 * Example 4: Simulated Streaming
 * Demonstrates incremental content updates
 */
export function SimulatedStreamingExample() {
  const [replaceContent, setReplaceContent] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const fullContent = `const viewer = new Cesium.Viewer("cesiumContainer");
viewer.scene.globe.enableLighting = true;
viewer.scene.globe.depthTestAgainstTerrain = true;`;

  useEffect(() => {
    // Start streaming after 500ms
    const startTimer = setTimeout(() => {
      setIsStreaming(true);
      let currentIndex = 0;

      // Stream content character by character
      const streamInterval = setInterval(() => {
        if (currentIndex < fullContent.length) {
          setReplaceContent(fullContent.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(streamInterval);
          setIsStreaming(false);
          setIsComplete(true);
        }
      }, 20);

      return () => clearInterval(streamInterval);
    }, 500);

    return () => clearTimeout(startTimer);
  }, [fullContent]);

  return (
    <StreamingDiffPreview
      diffIndex={0}
      language="javascript"
      searchContent='const viewer = new Cesium.Viewer("cesiumContainer");'
      replaceContent={replaceContent}
      isComplete={isComplete}
      isStreaming={isStreaming}
    />
  );
}

/**
 * Example 5: HTML Diff
 * Shows a diff for HTML content
 */
export function HTMLDiffExample() {
  return (
    <StreamingDiffPreview
      diffIndex={0}
      language="html"
      searchContent='<div class="container">
  <h1>Old Title</h1>
</div>'
      replaceContent='<div class="container">
  <h1>New Title</h1>
  <p>With additional content</p>
</div>'
      isComplete={false}
      isStreaming={true}
    />
  );
}

/**
 * Example 6: Multiple Sequential Diffs
 * Shows how to display multiple diffs in sequence
 */
export function MultipleSequentialDiffsExample() {
  const [diffs] = useState([
    {
      searchContent: "const a = 1;",
      replaceContent: "const a = 10;",
      isComplete: true,
      isStreaming: false,
    },
    {
      searchContent: "const b = 2;",
      replaceContent: "const b = 20;",
      isComplete: true,
      isStreaming: false,
    },
    {
      searchContent: "const c = 3;",
      replaceContent: "const c = ",
      isComplete: false,
      isStreaming: true,
    },
  ]);

  return (
    <div>
      {diffs.map((diff, index) => (
        <StreamingDiffPreview
          key={index}
          diffIndex={index}
          language="javascript"
          searchContent={diff.searchContent}
          replaceContent={diff.replaceContent}
          isComplete={diff.isComplete}
          isStreaming={diff.isStreaming}
        />
      ))}
    </div>
  );
}

/**
 * Example 7: Empty Search/Replace
 * Shows how the component handles empty content
 */
export function EmptyContentExample() {
  return (
    <StreamingDiffPreview
      diffIndex={0}
      language="javascript"
      searchContent=""
      replaceContent=""
      isComplete={false}
      isStreaming={true}
    />
  );
}

/**
 * Example 8: Large Diff
 * Shows a diff with significant content
 */
export function LargeDiffExample() {
  const largeSearchContent = Array(20)
    .fill(0)
    .map((_, i) => `console.log("Line ${i}");`)
    .join("\n");

  const largeReplaceContent = Array(20)
    .fill(0)
    .map((_, i) => `console.log("Updated Line ${i}");`)
    .join("\n");

  return (
    <StreamingDiffPreview
      diffIndex={0}
      language="javascript"
      searchContent={largeSearchContent}
      replaceContent={largeReplaceContent}
      isComplete={false}
      isStreaming={true}
    />
  );
}

/**
 * Example 9: Integration with Chat Message
 * Shows how this might be used in a chat context
 */
export function ChatIntegrationExample() {
  const [diffs, setDiffs] = useState<
    Array<{
      search: string;
      replace: string;
      complete: boolean;
      streaming: boolean;
    }>
  >([]);

  // Simulate receiving diffs from AI
  useEffect(() => {
    const diff1Timer = setTimeout(() => {
      setDiffs([
        {
          search: "viewer.camera.flyTo({",
          replace:
            "viewer.camera.flyTo({\n  destination: Cesium.Cartesian3.fromDegrees(-75.0, 40.0, 1000.0),",
          complete: false,
          streaming: true,
        },
      ]);
    }, 500);

    const diff1CompleteTimer = setTimeout(() => {
      setDiffs([
        {
          search: "viewer.camera.flyTo({",
          replace:
            "viewer.camera.flyTo({\n  destination: Cesium.Cartesian3.fromDegrees(-75.0, 40.0, 1000.0),\n  duration: 2.0\n});",
          complete: true,
          streaming: false,
        },
      ]);
    }, 2000);

    return () => {
      clearTimeout(diff1Timer);
      clearTimeout(diff1CompleteTimer);
    };
  }, []);

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ marginBottom: "1rem", color: "#e5e5e5" }}>
        <strong>AI Assistant:</strong> I'll update your camera flyTo code with a
        destination and duration.
      </div>

      {diffs.map((diff, index) => (
        <StreamingDiffPreview
          key={index}
          diffIndex={index}
          language="javascript"
          searchContent={diff.search}
          replaceContent={diff.replace}
          isComplete={diff.complete}
          isStreaming={diff.streaming}
        />
      ))}
    </div>
  );
}
