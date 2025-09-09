import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// Doorknobs, doors, roofs, and walls are styled with the batch table hierarchy.
// Since buildings and zones are not backed by geometry they are not styled directly. However
// styles may be written that take building and zone properties into account.
//
// Hierarchy layout (doorknobs are children of doors):
//
//   zone0
//     building0
//       roof0
//       wall0
//       door0 - doorknob0
//       door1 - doorknob1
//       door2 - doorknob2
//       door3 - doorknob3
//     building1
//       roof1
//       wall1
//       door4 - doorknob4
//       door5 - doorknob5
//       door6 - doorknob6
//       door7 - doorknob7
//     building2
//       roof2
//       wall2
//       door8 - doorknob8
//       door9 - doorknob9
//       door10 - doorknob10
//       door11 - doorknob11
//
// Class properties:
//
//   zone:
//     * zone_building
//     * zone_name
//   building:
//     * building_area
//     * building_name
//   wall:
//     * wall_paint
//     * wall_windows
//     * wall_name
//   roof:
//     * roof_paint
//     * roof_name
//   door:
//     * door_mass
//     * door_width
//     * door_name
//   doorknob:
//     * doorknob_size
//     * doorknob_name

const viewer = new Cesium.Viewer("cesiumContainer");
viewer.clock.currentTime = new Cesium.JulianDate(2457522.154792);

let tileset;
try {
  tileset = await Cesium.Cesium3DTileset.fromUrl(
    "../../SampleData/Cesium3DTiles/Hierarchy/BatchTableHierarchy/tileset.json",
  );

  viewer.scene.primitives.add(tileset);
  viewer.zoomTo(tileset, new Cesium.HeadingPitchRange(0.0, -0.3, 0.0));
  tileset.style = new Cesium.Cesium3DTileStyle({
    color: {
      conditions: [
        ["isExactClass('door')", "color('orange')"],
        ["true", "color('white')"],
      ],
    },
  });
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}

function setStyle(style) {
  return function () {
    if (!Cesium.defined(tileset)) {
      return;
    }

    tileset.style = new Cesium.Cesium3DTileStyle(style);
  };
}

const styles = [];
function addStyle(name, style) {
  styles.push({
    name: name,
    style: style,
  });
}

addStyle("Color all doors", {
  color: {
    conditions: [
      ["isExactClass('door')", "color('orange')"],
      ["true", "color('white')"],
    ],
  },
});

addStyle("Color all features derived from door", {
  color: {
    conditions: [
      ["isClass('door')", "color('orange')"],
      ["true", "color('white')"],
    ],
  },
});

addStyle("Color by building", {
  color: {
    conditions: [
      ["${building_name} === 'building0'", "color('purple')"],
      ["${building_name} === 'building1'", "color('red')"],
      ["${building_name} === 'building2'", "color('orange')"],
      ["true", "color('blue')"],
    ],
  },
});

addStyle("Color features by class name", {
  defines: {
    suffix: "regExp('door(.*)').exec(getExactClassName())",
  },
  color: {
    conditions: [
      ["${suffix} === 'knob'", "color('yellow')"],
      ["${suffix} === ''", "color('lime')"],
      ["${suffix} === null", "color('gray')"],
      ["true", "color('blue')"],
    ],
  },
});

addStyle("Style by height", {
  color: {
    conditions: [
      ["${height} >= 10", "color('purple')"],
      ["${height} >= 6", "color('red')"],
      ["${height} >= 5", "color('orange')"],
      ["true", "color('blue')"],
    ],
  },
});

addStyle("No style", {});

const styleOptions = [];
for (let i = 0; i < styles.length; ++i) {
  const style = styles[i];
  styleOptions.push({
    text: style.name,
    onselect: setStyle(style.style),
  });
}

Sandcastle.addToolbarMenu(styleOptions);

const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

// When a feature is left clicked, print its class name and properties
handler.setInputAction(function (movement) {
  const feature = viewer.scene.pick(movement.position);
  if (!Cesium.defined(feature)) {
    return;
  }
  console.log(`Class: ${feature.getExactClassName()}`);
  console.log("Properties:");
  const propertyIds = feature.getPropertyIds();
  const length = propertyIds.length;
  for (let i = 0; i < length; ++i) {
    const propertyId = propertyIds[i];
    const value = feature.getProperty(propertyId);
    console.log(`  ${propertyId}: ${value}`);
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// When a feature is middle clicked, hide it
handler.setInputAction(function (movement) {
  const feature = viewer.scene.pick(movement.position);
  if (!Cesium.defined(feature)) {
    return;
  }
  feature.show = false;
}, Cesium.ScreenSpaceEventType.MIDDLE_CLICK);
