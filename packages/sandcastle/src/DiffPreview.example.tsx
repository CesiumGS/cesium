/**
 * DiffPreview Usage Examples
 *
 * This file demonstrates how to use the DiffPreview and SimpleDiffPreview components.
 */

import { useState } from "react";
import { DiffPreview } from "./DiffPreview";
import { SimpleDiffPreview } from "./SimpleDiffPreview";

/**
 * Example 1: Basic DiffPreview usage
 */
export function BasicDiffPreviewExample() {
  const [isApplying, setIsApplying] = useState(false);

  const originalCode = `const viewer = new Cesium.Viewer("cesiumContainer");
viewer.scene.globe.enableLighting = false;`;

  const modifiedCode = `const viewer = new Cesium.Viewer("cesiumContainer");
viewer.scene.globe.enableLighting = true;
viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(-122.4, 37.8, 1000)
});`;

  const handleApply = () => {
    setIsApplying(true);
    // Simulate async operation
    setTimeout(() => {
      console.log("Changes applied!");
      setIsApplying(false);
    }, 1000);
  };

  const handleReject = () => {
    console.log("Changes rejected");
  };

  return (
    <DiffPreview
      originalCode={originalCode}
      modifiedCode={modifiedCode}
      language="javascript"
      fileName="main.js"
      onApply={handleApply}
      onReject={handleReject}
      isApplying={isApplying}
    />
  );
}

/**
 * Example 2: DiffPreview with modification callback
 */
export function ModifiableDiffPreviewExample() {
  const [originalCode] = useState('console.log("Hello");');
  const [modifiedCode, setModifiedCode] = useState(
    'console.log("Hello, World!");',
  );

  const handleModify = (newCode: string) => {
    console.log("User modified the code:", newCode);
    setModifiedCode(newCode);
  };

  const handleApply = () => {
    console.log("Applying modified code:", modifiedCode);
  };

  const handleReject = () => {
    console.log("Rejected");
  };

  return (
    <DiffPreview
      originalCode={originalCode}
      modifiedCode={modifiedCode}
      language="javascript"
      onApply={handleApply}
      onReject={handleReject}
      onModify={handleModify}
      theme="dark"
    />
  );
}

/**
 * Example 3: HTML diff preview
 */
export function HtmlDiffPreviewExample() {
  const originalHtml = `<div id="cesiumContainer"></div>
<div id="toolbar"></div>`;

  const modifiedHtml = `<div id="cesiumContainer" class="fullSize"></div>
<div id="toolbar" class="toolbar-container">
  <button id="resetBtn">Reset View</button>
</div>`;

  return (
    <DiffPreview
      originalCode={originalHtml}
      modifiedCode={modifiedHtml}
      language="html"
      fileName="index.html"
      onApply={() => console.log("Applied HTML changes")}
      onReject={() => console.log("Rejected HTML changes")}
    />
  );
}

/**
 * Example 4: SimpleDiffPreview (lightweight alternative)
 */
export function SimpleDiffPreviewExample() {
  const originalCode = `viewer.scene.globe.show = true;
viewer.scene.skyAtmosphere.show = false;`;

  const modifiedCode = `viewer.scene.globe.show = true;
viewer.scene.skyAtmosphere.show = true;
viewer.scene.fog.enabled = true;`;

  return (
    <SimpleDiffPreview
      originalCode={originalCode}
      modifiedCode={modifiedCode}
      language="javascript"
      fileName="scene-config.js"
      onApply={() => console.log("Applied changes")}
      onReject={() => console.log("Rejected changes")}
    />
  );
}

/**
 * Example 5: Collapsed diff preview
 */
export function CollapsedDiffPreviewExample() {
  return (
    <DiffPreview
      originalCode="const old = 'value';"
      modifiedCode="const new = 'value';"
      language="javascript"
      onApply={() => {}}
      onReject={() => {}}
      defaultCollapsed={true}
    />
  );
}

/**
 * Example 6: Integration with ChatMessage
 *
 * This shows how DiffPreview can be integrated with the existing ChatMessage component
 * to show AI-suggested code changes before applying them.
 */
export function ChatMessageIntegrationExample() {
  const [showDiff, setShowDiff] = useState(true);
  const [currentCode, setCurrentCode] = useState(
    `const viewer = new Cesium.Viewer("cesiumContainer");`,
  );

  const aiSuggestedCode = `const viewer = new Cesium.Viewer("cesiumContainer", {
  terrainProvider: await Cesium.CesiumTerrainProvider.fromIonAssetId(1),
  baseLayerPicker: false
});`;

  const handleApply = () => {
    setCurrentCode(aiSuggestedCode);
    setShowDiff(false);
    console.log("Code updated in editor");
  };

  const handleReject = () => {
    setShowDiff(false);
    console.log("Changes rejected");
  };

  return (
    <div>
      {showDiff && (
        <DiffPreview
          originalCode={currentCode}
          modifiedCode={aiSuggestedCode}
          language="javascript"
          fileName="viewer-setup.js"
          onApply={handleApply}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
