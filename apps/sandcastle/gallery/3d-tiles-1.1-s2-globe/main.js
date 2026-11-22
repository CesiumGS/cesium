import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// One World Terrain Base Globe provided by Maxar

const viewer = new Cesium.Viewer("cesiumContainer", {
  globe: false,
});
const scene = viewer.scene;

viewer.camera.flyTo({
  duration: 0,
  destination: new Cesium.Cartesian3(
    762079.3157173397,
    -28363749.882652905,
    19814354.842565004,
  ),
  orientation: {
    direction: new Cesium.Cartesian3(
      -0.022007098944236157,
      0.819079900508189,
      -0.5732571885110153,
    ),
    up: new Cesium.Cartesian3(
      -0.015396759850986286,
      0.5730503851893346,
      0.8193754913471885,
    ),
  },
  easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
});

let tileset;
try {
  // MAXAR OWT WFF 1.2 Base Globe
  tileset = await Cesium.Cesium3DTileset.fromIonAssetId(1208297, {
    maximumScreenSpaceError: 4,
  });
  scene.primitives.add(tileset);
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}

// --- Style ---

const style = new Cesium.Cesium3DTileStyle({
  defines: {
    LandCoverColor: "rgb(${color}[0], ${color}[1], ${color}[2])",
  },
  color:
    "${LandCoverColor} === vec4(1.0) ? rgb(254, 254, 254) : ${LandCoverColor}",
});

// --- Custom Shader ---

const customShader = new Cesium.CustomShader({
  uniforms: {
    u_time: {
      type: Cesium.UniformType.FLOAT,
      value: 0,
    },
  },
  fragmentShaderText: `
            void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
            {
              int featureId = fsInput.featureIds.featureId_0;
              // Use cartesian coordinates but scale to be roughly [-1, 1]
              vec3 positionWC = fsInput.attributes.positionWC / 6.3e6;
              if (featureId == 60)
              {
                // Something like FM synthesis to make irregularly spaced waves
                float wave = sin(14.0 * positionWC.z - u_time);
                wave = 0.5 + 0.5 * sin(10.0 * wave * positionWC.z - u_time);
                // mix in an over-saturated version of the diffuse to make shimmering bands of color
                material.diffuse = mix(material.diffuse, material.diffuse * 3.0, wave);
              }
            }
            `,
});

const startTime = performance.now();
const customShaderUpdate = function () {
  const elapsedTimeSeconds = (performance.now() - startTime) / 1000;
  customShader.setUniform("u_time", elapsedTimeSeconds);
};

viewer.scene.postUpdate.addEventListener(function () {
  customShaderUpdate();
});

// --- Picking ---

let enablePicking = true;
const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);

const metadataOverlay = document.createElement("div");
viewer.container.appendChild(metadataOverlay);
metadataOverlay.className = "backdrop";
metadataOverlay.style.display = "none";
metadataOverlay.style.position = "absolute";
metadataOverlay.style.bottom = "0";
metadataOverlay.style.left = "0";
metadataOverlay.style["pointer-events"] = "none";
metadataOverlay.style.padding = "4px";
metadataOverlay.style.backgroundColor = "#303030";
metadataOverlay.style.whiteSpace = "pre-line";
metadataOverlay.style.fontSize = "16px";
metadataOverlay.style.borderRadius = "4px";

let tableHtmlScratch;

handler.setInputAction(function (movement) {
  if (enablePicking) {
    const feature = scene.pick(movement.endPosition);
    if (feature instanceof Cesium.Cesium3DTileFeature) {
      metadataOverlay.style.display = "block";
      metadataOverlay.style.bottom = `${
        viewer.canvas.clientHeight - movement.endPosition.y
      }px`;
      metadataOverlay.style.left = `${movement.endPosition.x}px`;

      tableHtmlScratch =
        "<table><thead><tr><th><tt>Property</tt></th><th><tt>Value</tt></th></tr></thead><tbody>";

      const propertyIds = feature.getPropertyIds();
      const length = propertyIds.length;
      for (let i = 0; i < length; ++i) {
        const propertyId = propertyIds[i];
        const propertyValue = feature.getProperty(propertyId);
        tableHtmlScratch += `<tr><td><tt>${propertyId}</tt></td><td><tt>${propertyValue}</tt></td></tr>`;
      }
      tableHtmlScratch += "</tbody></table>";
      metadataOverlay.innerHTML = tableHtmlScratch;
    } else {
      metadataOverlay.style.display = "none";
    }
  }
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

// --- UI ---

const modes = [
  {
    text: "Globe View",
    onselect: function () {
      tileset.customShader = undefined;
      tileset.debugShowBoundingVolume = false;
      tileset.style = undefined;
    },
  },
  {
    text: "Show S2 Bounding Volumes",
    onselect: function () {
      tileset.customShader = undefined;
      tileset.debugShowBoundingVolume = true;
      tileset.style = undefined;
    },
  },
  {
    text: "Apply Style",
    onselect: function () {
      tileset.customShader = undefined;
      tileset.debugShowBoundingVolume = false;
      tileset.style = style;
    },
  },
  {
    text: "Apply Custom Shader",
    onselect: function () {
      tileset.customShader = customShader;
      tileset.debugShowBoundingVolume = false;
      tileset.style = undefined;
    },
  },
];

Sandcastle.addToolbarMenu(modes);
Sandcastle.addToggleButton("Enable picking", enablePicking, function (checked) {
  if (enablePicking) {
    metadataOverlay.style.display = "none";
  }

  enablePicking = checked;
});
