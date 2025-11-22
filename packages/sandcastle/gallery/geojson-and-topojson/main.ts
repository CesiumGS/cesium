import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");

//Example 1: Load with default styling.
Sandcastle.addDefaultToolbarButton("Default styling", function () {
  viewer.dataSources.add(
    Cesium.GeoJsonDataSource.load("../../SampleData/ne_10m_us_states.topojson"),
  );
});

//Example 2: Load with basic styling options.
Sandcastle.addToolbarButton("Basic styling", function () {
  viewer.dataSources.add(
    Cesium.GeoJsonDataSource.load(
      "../../SampleData/ne_10m_us_states.topojson",
      {
        stroke: Cesium.Color.HOTPINK,
        fill: Cesium.Color.PINK.withAlpha(0.5),
        strokeWidth: 3,
      },
    ),
  );
});

//Example 3: Apply custom graphics after load.
Sandcastle.addToolbarButton("Custom styling", function () {
  //Seed the random number generator for repeatable results.
  Cesium.Math.setRandomNumberSeed(0);

  const promise = Cesium.GeoJsonDataSource.load(
    "../../SampleData/ne_10m_us_states.topojson",
  );
  promise
    .then(function (dataSource) {
      viewer.dataSources.add(dataSource);

      //Get the array of entities
      const entities = dataSource.entities.values;

      const colorHash = {};
      for (let i = 0; i < entities.length; i++) {
        //For each entity, create a random color based on the state name.
        //Some states have multiple entities, so we store the color in a
        //hash so that we use the same color for the entire state.
        const entity = entities[i];
        const name = entity.name;
        let color = colorHash[name];
        if (!color) {
          color = Cesium.Color.fromRandom({
            alpha: 1.0,
          });
          colorHash[name] = color;
        }

        //Set the polygon material to our random color.
        entity.polygon.material = color;
        //Remove the outlines.
        entity.polygon.outline = false;

        //Extrude the polygon based on the state's population.  Each entity
        //stores the properties for the GeoJSON feature it was created from
        //Since the population is a huge number, we divide by 50.
        entity.polygon.extrudedHeight = entity.properties.Population / 50.0;
      }
    })
    .catch(function (error) {
      //Display any errrors encountered while loading.
      window.alert(error);
    });
});

//Reset the scene when switching demos.
Sandcastle.reset = function () {
  viewer.dataSources.removeAll();

  //Set the camera to a US centered tilted view and switch back to moving in world coordinates.
  viewer.camera.lookAt(
    Cesium.Cartesian3.fromDegrees(-98.0, 40.0),
    new Cesium.Cartesian3(0.0, -4790000.0, 3930000.0),
  );
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
};
