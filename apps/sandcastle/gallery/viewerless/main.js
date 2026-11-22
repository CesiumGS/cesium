//import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

//const viewer = new Cesium.Viewer("cesiumContainer");

console.log("Sandcastle loaded");
document.body.style.background = `
  no-repeat center/30% url(../images/cesium-logomark.svg),
  linear-gradient(to bottom, lightskyblue, lightgreen)`;

Sandcastle.addToolbarButton("New Button", function () {
  // your code here
});

let toggleValue1 = true;
Sandcastle.addToggleButton("Toggle", toggleValue1, function (checked) {
  toggleValue1 = checked;
});

const options1 = [
  {
    text: "Option 1",
    onselect: function () {
      // your code here, the first option is always run at load
    },
  },
];
Sandcastle.addToolbarMenu(options1);
