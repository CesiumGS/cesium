import { BoundingRectangle } from "../../Source/Cesium.js";
import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartographic } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { defaultValue } from "../../Source/Cesium.js";
import { defined } from "../../Source/Cesium.js";
import { Iso8601 } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { PolygonHierarchy } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { TimeInterval } from "../../Source/Cesium.js";
import { CallbackProperty } from "../../Source/Cesium.js";
import { ColorMaterialProperty } from "../../Source/Cesium.js";
import { Entity } from "../../Source/Cesium.js";
import { EntityCollection } from "../../Source/Cesium.js";
import { exportKml } from "../../Source/Cesium.js";
import { ImageMaterialProperty } from "../../Source/Cesium.js";
import { PolylineOutlineMaterialProperty } from "../../Source/Cesium.js";
import { SampledPositionProperty } from "../../Source/Cesium.js";
import { HeightReference } from "../../Source/Cesium.js";
import { HorizontalOrigin } from "../../Source/Cesium.js";
import { VerticalOrigin } from "../../Source/Cesium.js";
import { when } from "../../Source/Cesium.js";

describe("DataSources/exportKml", function () {
  let kmlDoc;
  function checkKmlDoc(entities, properties, options) {
    options = defaultValue(options, {});
    options.entities = entities;
    const promise = exportKml(options);
    const kml = kmlDoc.documentElement;
    const kmlChildNodes = kml.childNodes;
    expect(kml.localName).toEqual("kml");
    expect(kmlChildNodes.length).toBe(1);

    checkTagWithProperties(kml, properties);

    return promise;
  }

  function checkTagWithProperties(element, properties) {
    const attributes = properties._;
    if (defined(attributes)) {
      const elementAttributes = element.attributes;
      expect(elementAttributes.length).toBe(Object.keys(attributes).length);
      for (let j = 0; j < elementAttributes.length; ++j) {
        const nodeAttribute = elementAttributes[j];
        const attribute = attributes[nodeAttribute.name];

        if (typeof attribute === "string") {
          expect(nodeAttribute.value).toEqual(attribute);
        } else if (typeof attribute === "number") {
          expect(Number(nodeAttribute.value)).toEqualEpsilon(
            attribute,
            CesiumMath.EPSILON7
          );
        } else {
          fail();
        }
      }
    }

    const childNodes = element.childNodes;
    for (let i = 0; i < childNodes.length; ++i) {
      const node = childNodes[i];
      let property = properties[node.tagName];
      expect(property).toBeDefined();

      if (defined(property.getValue)) {
        property = property.getValue(Iso8601.MINIMUM_VALUE);
      }

      if (typeof property === "function") {
        expect(property(node.textContent)).toBe(true);
      } else if (typeof property === "string") {
        expect(node.textContent).toEqual(property);
      } else if (typeof property === "number") {
        expect(Number(node.textContent)).toEqualEpsilon(
          property,
          CesiumMath.EPSILON7
        );
      } else if (typeof property === "boolean") {
        expect(Number(node.textContent)).toBe(property ? 1 : 0);
      } else {
        checkTagWithProperties(node, property);
      }
    }
  }

  let counter = 0;
  const pointPosition = Cartesian3.fromDegrees(-75.59777, 40.03883, 12);
  function checkPointCoord(textContent) {
    const values = textContent.split(/\s*,\s*/);
    expect(values.length).toBe(3);

    const cartographic1 = Cartographic.fromCartesian(pointPosition);
    const cartographic2 = Cartographic.fromDegrees(
      Number(values[0]),
      Number(values[1]),
      Number(values[2])
    );
    return Cartographic.equalsEpsilon(
      cartographic1,
      cartographic2,
      CesiumMath.EPSILON7
    );
  }

  function createEntity(properties) {
    ++counter;
    const options = {
      id: "e" + counter,
      name: "entity" + counter,
      show: true,
      description: "This is entity number " + counter,
      position: pointPosition,
    };

    if (defined(properties)) {
      for (const propertyName in properties) {
        if (properties.hasOwnProperty(propertyName)) {
          options[propertyName] = properties[propertyName];
        }
      }
    }

    return new Entity(options);
  }

  function createExpectResult(entity) {
    return {
      Document: {
        Style: {
          _: {
            id: "style-1",
          },
        },
        Placemark: {
          _: {
            id: entity.id,
          },
          name: entity.name,
          visibility: entity.show ? 1 : 0,
          description: entity.description,
          styleUrl: "#style-1",
        },
      },
    };
  }

  let oldCreateState;
  beforeAll(function () {
    oldCreateState = exportKml._createState;

    // We need to capture the DOM object
    exportKml._createState = function (options) {
      const state = oldCreateState(options);
      kmlDoc = state.kmlDoc;
      return state;
    };
  });

  afterAll(function () {
    exportKml._createState = oldCreateState;
  });

  beforeEach(function () {
    counter = 0;
  });

  it("Hierarchy", function () {
    const entity1 = createEntity({
      show: false,
      position: undefined,
    });

    const entity2 = createEntity({
      position: undefined,
      parent: entity1,
    });

    const entity3 = createEntity({
      parent: entity2,
      point: {},
    });

    const entities = new EntityCollection();
    entities.add(entity1);
    entities.add(entity2);
    entities.add(entity3);

    const hierarchy = {
      Document: {
        Style: {
          _: {
            id: "style-1",
          },
          IconStyle: {},
        },
        Folder: {
          _: {
            id: entity1.id,
          },
          name: entity1.name,
          visibility: "0",
          description: entity1.description,
          Folder: {
            _: {
              id: entity2.id,
            },
            name: entity2.name,
            visibility: true,
            description: entity2.description,
            Placemark: {
              _: {
                id: entity3.id,
              },
              Point: {
                altitudeMode: "absolute",
                coordinates: checkPointCoord,
              },
              name: entity3.name,
              visibility: true,
              description: entity3.description,
              styleUrl: "#style-1",
            },
          },
        },
      },
    };

    checkKmlDoc(entities, hierarchy);
  });

  describe("Point Geometry", function () {
    it("Point with constant position", function () {
      const entity1 = createEntity({
        point: {
          color: Color.LINEN,
          pixelSize: 3,
          heightReference: HeightReference.CLAMP_TO_GROUND,
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.IconStyle = {
        color: "ffe6f0fa",
        colorMode: "normal",
        scale: 3 / 32,
      };
      expectedResult.Document.Placemark.Point = {
        altitudeMode: "clampToGround",
        coordinates: checkPointCoord,
      };

      checkKmlDoc(entities, expectedResult);
    });

    it("Point with label", function () {
      const entity1 = createEntity({
        point: {
          color: Color.LINEN,
          pixelSize: 3,
          heightReference: HeightReference.CLAMP_TO_GROUND,
        },
        label: {
          text: "Im a label",
          color: Color.ORANGE,
          scale: 2,
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.IconStyle = {
        color: "ffe6f0fa",
        colorMode: "normal",
        scale: 3 / 32,
      };
      expectedResult.Document.Style.LabelStyle = {
        color: "ff00a5ff",
        colorMode: "normal",
        scale: 2,
      };
      expectedResult.Document.Placemark.name = "Im a label";
      expectedResult.Document.Placemark.Point = {
        altitudeMode: "clampToGround",
        coordinates: checkPointCoord,
      };

      checkKmlDoc(entities, expectedResult);
    });

    it("Billboard with constant position", function () {
      const entity1 = createEntity({
        billboard: {
          image: "http://test.invalid/image.jpg",
          imageSubRegion: new BoundingRectangle(12, 0, 24, 36),
          color: Color.LINEN,
          scale: 2,
          pixelOffset: new Cartesian2(2, 3),
          width: 24,
          height: 36,
          horizontalOrigin: HorizontalOrigin.LEFT,
          verticalOrigin: VerticalOrigin.BOTTOM,
          rotation: CesiumMath.toRadians(10),
          alignedAxis: Cartesian3.UNIT_Z,
          heightReference: HeightReference.CLAMP_TO_GROUND,
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.IconStyle = {
        Icon: {
          href: "http://test.invalid/image.jpg",
          x: 12,
          y: 0,
          w: 24,
          h: 36,
        },
        color: "ffe6f0fa",
        colorMode: "normal",
        scale: 2,
        hotSpot: {
          _: {
            x: -2 / 2,
            y: 3 / 2,
            xunits: "pixels",
            yunits: "pixels",
          },
        },
        heading: -10,
      };
      expectedResult.Document.Placemark.Point = {
        altitudeMode: "clampToGround",
        coordinates: checkPointCoord,
      };

      checkKmlDoc(entities, expectedResult);
    });

    it("Billboard with AlignedAxis not Z", function () {
      const entity1 = createEntity({
        billboard: {
          rotation: CesiumMath.toRadians(10),
          alignedAxis: Cartesian3.UNIT_Y,
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.IconStyle = {};
      expectedResult.Document.Placemark.Point = {
        altitudeMode: "absolute",
        coordinates: checkPointCoord,
      };

      checkKmlDoc(entities, expectedResult);
    });

    it("Billboard with 0 degree heading should be 360", function () {
      const entity1 = createEntity({
        billboard: {
          rotation: CesiumMath.toRadians(0),
          alignedAxis: Cartesian3.UNIT_Z,
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.IconStyle = {
        heading: 360,
      };
      expectedResult.Document.Placemark.Point = {
        altitudeMode: "absolute",
        coordinates: checkPointCoord,
      };

      checkKmlDoc(entities, expectedResult);
    });

    it("Billboard with HotSpot at the center", function () {
      const entity1 = createEntity({
        billboard: {
          pixelOffset: new Cartesian2(2, 3),
          width: 24,
          height: 36,
          horizontalOrigin: HorizontalOrigin.CENTER,
          verticalOrigin: VerticalOrigin.CENTER,
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.IconStyle = {
        hotSpot: {
          _: {
            x: -(2 - 12),
            y: 3 + 18,
            xunits: "pixels",
            yunits: "pixels",
          },
        },
      };
      expectedResult.Document.Placemark.Point = {
        altitudeMode: "absolute",
        coordinates: checkPointCoord,
      };

      checkKmlDoc(entities, expectedResult);
    });

    it("Billboard with HotSpot at the TopRight", function () {
      const entity1 = createEntity({
        billboard: {
          pixelOffset: new Cartesian2(2, 3),
          width: 24,
          height: 36,
          horizontalOrigin: HorizontalOrigin.RIGHT,
          verticalOrigin: VerticalOrigin.TOP,
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.IconStyle = {
        hotSpot: {
          _: {
            x: -(2 - 24),
            y: 3 + 36,
            xunits: "pixels",
            yunits: "pixels",
          },
        },
      };
      expectedResult.Document.Placemark.Point = {
        altitudeMode: "absolute",
        coordinates: checkPointCoord,
      };

      checkKmlDoc(entities, expectedResult);
    });

    it("Billboard with a Canvas image", function () {
      const entity1 = createEntity({
        billboard: {
          image: document.createElement("canvas"),
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.IconStyle = {
        Icon: {
          href: "texture_1.png",
        },
      };
      expectedResult.Document.Placemark.Point = {
        altitudeMode: "absolute",
        coordinates: checkPointCoord,
      };

      return checkKmlDoc(entities, expectedResult).then(function (result) {
        expect(result.kml).toBeDefined();
        expect(Object.keys(result.externalFiles).length).toBe(1);
        expect(result.externalFiles["texture_1.png"]).toBeDefined();
      });
    });

    it("Billboard with a Canvas image as KMZ", function () {
      const entity1 = createEntity({
        billboard: {
          image: document.createElement("canvas"),
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      return exportKml({
        entities: entities,
        kmz: true,
      }).then(function (result) {
        expect(result.kml).toBeUndefined();
        expect(result.externalFiles).toBeUndefined();
        expect(result.kmz).toBeDefined();

        const deferred = when.defer();
        const fileReader = new FileReader();
        fileReader.onload = function (event) {
          // Verify its a zip archive
          expect(new DataView(event.target.result).getUint32(0, false)).toBe(
            0x504b0304
          );
          deferred.resolve();
        };
        fileReader.readAsArrayBuffer(result.kmz);

        return deferred.promise;
      });
    });
  });

  describe("Tracks", function () {
    const times = [
      JulianDate.fromIso8601("2019-06-17"),
      JulianDate.fromIso8601("2019-06-18"),
      JulianDate.fromIso8601("2019-06-19"),
    ];
    const positions = [
      Cartesian3.fromDegrees(-75.59777, 40.03883, 12),
      Cartesian3.fromDegrees(-76.59777, 39.03883, 12),
      Cartesian3.fromDegrees(-77.59777, 38.03883, 12),
    ];

    function checkWhen(textContent) {
      const count = times.length;
      for (let i = 0; i < count; ++i) {
        if (textContent === JulianDate.toIso8601(times[i])) {
          return true;
        }
      }

      return false;
    }

    function checkCoord(textContent) {
      const values = textContent.split(/\s*,\s*/);
      expect(values.length).toBe(3);

      const cartographic1 = new Cartographic();
      const cartographic2 = new Cartographic();
      const count = positions.length;
      for (let i = 0; i < count; ++i) {
        Cartographic.fromCartesian(positions[i], undefined, cartographic1);
        Cartographic.fromDegrees(
          Number(values[0]),
          Number(values[1]),
          Number(values[2]),
          cartographic2
        );
        if (
          Cartographic.equalsEpsilon(
            cartographic1,
            cartographic2,
            CesiumMath.EPSILON7
          )
        ) {
          return true;
        }
      }

      return false;
    }

    it("SampledPosition", function () {
      const position = new SampledPositionProperty();
      position.addSamples(times, positions);

      const entity1 = createEntity({
        position: position,
        point: {
          heightReference: HeightReference.CLAMP_TO_GROUND,
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.IconStyle = {};
      expectedResult.Document.Placemark.Track = {
        altitudeMode: "clampToGround",
        when: checkWhen,
        coord: checkCoord,
      };

      checkKmlDoc(entities, expectedResult);
    });

    it("CallbackProperty", function () {
      let index = 0;
      const position = new CallbackProperty(function (time) {
        expect(index < times.length);
        expect(JulianDate.equals(time, times[index])).toBe(true);

        return positions[index++];
      }, false);

      const entity1 = createEntity({
        position: position,
        point: {},
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.IconStyle = {};
      expectedResult.Document.Placemark.Track = {
        altitudeMode: "absolute",
        when: checkWhen,
        coord: checkCoord,
      };

      checkKmlDoc(entities, expectedResult, {
        defaultAvailability: new TimeInterval({
          start: times[0],
          stop: times[2],
        }),
        sampleDuration: JulianDate.secondsDifference(times[1], times[0]),
      });
    });

    it("With Model", function () {
      const position = new SampledPositionProperty();
      position.addSamples(times, positions);

      const entity1 = createEntity({
        position: position,
        model: {
          uri: "http://test.invalid/test",
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Placemark.Track = {
        altitudeMode: "absolute",
        when: checkWhen,
        coord: checkCoord,
        Model: {
          Link: {
            href: "http://test.invalid/test",
          },
        },
      };

      const blob = new Blob([new Uint8Array([])], {
        type: "model/vnd.collada+xml",
      });
      return checkKmlDoc(entities, expectedResult, {
        modelCallback: function (model, time, externalFiles) {
          externalFiles["test.dae"] = blob;
          return model.uri;
        },
      }).then(function (result) {
        expect(result.externalFiles["test.dae"]).toBe(blob);
      });
    });

    it("With Path", function () {
      const position = new SampledPositionProperty();
      position.addSamples(times, positions);

      const entity1 = createEntity({
        position: position,
        point: {
          heightReference: HeightReference.CLAMP_TO_GROUND,
        },
        path: {
          width: 2,
          material: new ColorMaterialProperty(Color.GREEN),
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.IconStyle = {};
      expectedResult.Document.Style.LineStyle = {
        color: "ff008000",
        colorMode: "normal",
        width: 2,
      };
      expectedResult.Document.Placemark.Track = {
        altitudeMode: "clampToGround",
        when: checkWhen,
        coord: checkCoord,
      };

      checkKmlDoc(entities, expectedResult);
    });
  });

  describe("Polylines", function () {
    const positions = [
      Cartesian3.fromDegrees(-1, -1, 12),
      Cartesian3.fromDegrees(1, -1, 12),
      Cartesian3.fromDegrees(1, 1, 12),
      Cartesian3.fromDegrees(-1, 1, 12),
    ];

    function checkCoords(textContent) {
      const coordinates = textContent.split(" ");
      expect(coordinates.length).toBe(4);

      const cartographic1 = new Cartographic();
      const cartographic2 = new Cartographic();
      const count = positions.length;
      for (let i = 0; i < count; ++i) {
        Cartographic.fromCartesian(positions[i], undefined, cartographic1);
        const values = coordinates[i].split(",");
        expect(values.length).toBe(3);
        Cartographic.fromDegrees(
          Number(values[0]),
          Number(values[1]),
          Number(values[2]),
          cartographic2
        );
        if (
          Cartographic.equalsEpsilon(
            cartographic1,
            cartographic2,
            CesiumMath.EPSILON7
          )
        ) {
          return true;
        }
      }

      return false;
    }

    it("Clamped to ground", function () {
      const entity1 = createEntity({
        polyline: {
          positions: positions,
          clampToGround: true,
          material: new ColorMaterialProperty(Color.GREEN),
          width: 5,
          zIndex: 2,
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.LineStyle = {
        color: "ff008000",
        colorMode: "normal",
        width: 5,
      };
      expectedResult.Document.Placemark.LineString = {
        altitudeMode: "clampToGround",
        coordinates: checkCoords,
        tessellate: true,
        drawOrder: 2,
      };

      checkKmlDoc(entities, expectedResult);
    });

    it("Not clamped to ground", function () {
      const entity1 = createEntity({
        polyline: {
          positions: positions,
          clampToGround: false,
          material: new ColorMaterialProperty(Color.GREEN),
          width: 5,
          zIndex: 2,
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.LineStyle = {
        color: "ff008000",
        colorMode: "normal",
        width: 5,
      };
      expectedResult.Document.Placemark.LineString = {
        altitudeMode: "absolute",
        coordinates: checkCoords,
        drawOrder: 2,
      };

      checkKmlDoc(entities, expectedResult);
    });

    it("With outline", function () {
      const entity1 = createEntity({
        polyline: {
          positions: positions,
          clampToGround: false,
          material: new PolylineOutlineMaterialProperty({
            color: Color.GREEN,
            outlineColor: Color.BLUE,
            outlineWidth: 2,
          }),
          width: 5,
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.LineStyle = {
        color: "ff008000",
        colorMode: "normal",
        width: 5,
        outerColor: "ffff0000",
        outerWidth: 2,
      };
      expectedResult.Document.Placemark.LineString = {
        altitudeMode: "absolute",
        coordinates: checkCoords,
      };

      checkKmlDoc(entities, expectedResult);
    });
  });

  describe("Polygons", function () {
    const positions = [
      Cartesian3.fromDegrees(-1, -1, 12),
      Cartesian3.fromDegrees(1, -1, 12),
      Cartesian3.fromDegrees(1, 1, 12),
      Cartesian3.fromDegrees(-1, 1, 12),
    ];

    function getCheckCoords(height) {
      return function (textContent) {
        const coordinates = textContent.split(" ");
        expect(coordinates.length).toBe(4);

        const cartographic1 = new Cartographic();
        const cartographic2 = new Cartographic();
        const count = positions.length;
        for (let i = 0; i < count; ++i) {
          Cartographic.fromCartesian(positions[i], undefined, cartographic1);
          if (defined(height)) {
            cartographic1.height = height;
          }

          const values = coordinates[i].split(",");
          expect(values.length).toBe(3);
          Cartographic.fromDegrees(
            Number(values[0]),
            Number(values[1]),
            Number(values[2]),
            cartographic2
          );
          if (
            Cartographic.equalsEpsilon(
              cartographic1,
              cartographic2,
              CesiumMath.EPSILON7
            )
          ) {
            return true;
          }
        }

        return false;
      };
    }

    it("Polygon with outline", function () {
      const entity1 = createEntity({
        polygon: {
          hierarchy: positions,
          height: 10,
          perPositionHeight: false,
          heightReference: HeightReference.CLAMP_TO_GROUND,
          extrudedHeight: 0,
          fill: true,
          material: new ColorMaterialProperty(Color.GREEN),
          outline: true,
          outlineWidth: 5,
          outlineColor: Color.BLUE,
          zIndex: 2,
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.PolyStyle = {
        color: "ff008000",
        colorMode: "normal",
        fill: true,
        outline: true,
      };
      expectedResult.Document.Style.LineStyle = {
        color: "ffff0000",
        colorMode: "normal",
        width: 5,
      };
      expectedResult.Document.Placemark.Polygon = {
        altitudeMode: "clampToGround",
        outerBoundaryIs: {
          LinearRing: {
            coordinates: getCheckCoords(10),
          },
        },
      };

      checkKmlDoc(entities, expectedResult);
    });

    it("Polygon with extrusion", function () {
      const entity1 = createEntity({
        polygon: {
          hierarchy: positions,
          height: 10,
          perPositionHeight: false,
          extrudedHeight: 20,
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.PolyStyle = {};
      expectedResult.Document.Placemark.Polygon = {
        altitudeMode: "absolute",
        outerBoundaryIs: {
          LinearRing: {
            coordinates: getCheckCoords(20), // We use extrudedHeight
          },
        },
        extrude: true,
      };

      checkKmlDoc(entities, expectedResult);
    });

    it("Polygon with extrusion and perPositionHeights", function () {
      const entity1 = createEntity({
        polygon: {
          hierarchy: positions,
          height: 10,
          perPositionHeight: true,
          extrudedHeight: 20,
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.PolyStyle = {};
      expectedResult.Document.Placemark.Polygon = {
        altitudeMode: "absolute",
        outerBoundaryIs: {
          LinearRing: {
            coordinates: getCheckCoords(), // Use per position height
          },
        },
        extrude: true,
      };

      checkKmlDoc(entities, expectedResult);
    });

    it("Polygon with holes", function () {
      const entity1 = createEntity({
        polygon: {
          hierarchy: new PolygonHierarchy(positions, [
            new PolygonHierarchy(positions),
          ]),
          height: 10,
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.PolyStyle = {};
      expectedResult.Document.Placemark.Polygon = {
        altitudeMode: "absolute",
        outerBoundaryIs: {
          LinearRing: {
            coordinates: getCheckCoords(10),
          },
        },
        innerBoundaryIs: {
          LinearRing: {
            coordinates: getCheckCoords(10),
          },
        },
      };

      checkKmlDoc(entities, expectedResult);
    });

    it("Rectangle extruded", function () {
      const entity1 = createEntity({
        rectangle: {
          coordinates: Rectangle.fromDegrees(-1, -1, 1, 1),
          height: 10,
          perPositionHeight: false,
          heightReference: HeightReference.CLAMP_TO_GROUND,
          extrudedHeight: 20,
          fill: true,
          material: new ColorMaterialProperty(Color.GREEN),
          outline: true,
          outlineWidth: 5,
          outlineColor: Color.BLUE,
          zIndex: 2,
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.PolyStyle = {
        color: "ff008000",
        colorMode: "normal",
        fill: true,
        outline: true,
      };
      expectedResult.Document.Style.LineStyle = {
        color: "ffff0000",
        colorMode: "normal",
        width: 5,
      };
      expectedResult.Document.Placemark.Polygon = {
        altitudeMode: "clampToGround",
        outerBoundaryIs: {
          LinearRing: {
            coordinates: getCheckCoords(20),
          },
        },
        extrude: true,
      };

      checkKmlDoc(entities, expectedResult);
    });

    it("Rectangle not extruded", function () {
      const entity1 = createEntity({
        rectangle: {
          coordinates: Rectangle.fromDegrees(-1, -1, 1, 1),
          height: 10,
          heightReference: HeightReference.CLAMP_TO_GROUND,
          material: new ColorMaterialProperty(Color.GREEN),
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.PolyStyle = {
        color: "ff008000",
        colorMode: "normal",
      };
      expectedResult.Document.Placemark.Polygon = {
        altitudeMode: "clampToGround",
        outerBoundaryIs: {
          LinearRing: {
            coordinates: getCheckCoords(10),
          },
        },
      };

      checkKmlDoc(entities, expectedResult);
    });
  });

  describe("Models", function () {
    it("Model with constant position", function () {
      const entity1 = createEntity({
        model: {
          uri: "http://test.invalid/test.glb",
          scale: 3,
          heightReference: HeightReference.CLAMP_TO_GROUND,
        },
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const cartographic = Cartographic.fromCartesian(pointPosition);
      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Placemark.Model = {
        altitudeMode: "clampToGround",
        Location: {
          longitude: CesiumMath.toDegrees(cartographic.longitude),
          latitude: CesiumMath.toDegrees(cartographic.latitude),
          altitude: cartographic.height,
        },
        Link: {
          href: "http://test.invalid/test.dae",
        },
        scale: {
          x: 3,
          y: 3,
          z: 3,
        },
      };

      checkKmlDoc(entities, expectedResult, {
        modelCallback: function (model, time) {
          return model.uri.getValue(time).replace(".glb", ".dae");
        },
      });
    });
  });

  describe("GroundOverlays", function () {
    it("Rectangle", function () {
      const entity = createEntity({
        rectangle: {
          coordinates: Rectangle.fromDegrees(-1, -1, 1, 1),
          height: 10,
          heightReference: HeightReference.CLAMP_TO_GROUND,
          material: new ImageMaterialProperty({
            image: "../images/logo.jpg",
            color: Color.GREEN,
          }),
        },
      });

      const entities = new EntityCollection();
      entities.add(entity);

      const expectedResult = {
        Document: {
          GroundOverlay: {
            _: {
              id: entity.id,
            },
            name: entity.name,
            visibility: entity.show ? 1 : 0,
            description: entity.description,
            altitude: 10,
            altitudeMode: "clampToGround",
            LatLonBox: {
              north: 1,
              south: -1,
              east: 1,
              west: -1,
            },
            Icon: {
              href: "../images/logo.jpg",
            },
            color: "ff008000",
          },
        },
      };

      checkKmlDoc(entities, expectedResult);
    });
  });

  describe("Multigeometry", function () {
    const positions = [
      Cartesian3.fromDegrees(-1, -1, 12),
      Cartesian3.fromDegrees(1, -1, 12),
      Cartesian3.fromDegrees(1, 1, 12),
      Cartesian3.fromDegrees(-1, 1, 12),
    ];

    function getCheckCoords() {
      return function (textContent) {
        const coordinates = textContent.split(" ");
        expect(coordinates.length).toBe(4);

        const cartographic1 = new Cartographic();
        const cartographic2 = new Cartographic();
        const count = positions.length;
        for (let i = 0; i < count; ++i) {
          Cartographic.fromCartesian(positions[i], undefined, cartographic1);
          cartographic1.height = 0;

          const values = coordinates[i].split(",");
          expect(values.length).toBe(3);
          Cartographic.fromDegrees(
            Number(values[0]),
            Number(values[1]),
            Number(values[2]),
            cartographic2
          );
          if (
            Cartographic.equalsEpsilon(
              cartographic1,
              cartographic2,
              CesiumMath.EPSILON7
            )
          ) {
            return true;
          }
        }

        return false;
      };
    }

    it("Polygon and Point", function () {
      const entity1 = createEntity({
        polygon: {
          hierarchy: positions,
        },
        point: {},
      });

      const entities = new EntityCollection();
      entities.add(entity1);

      const expectedResult = createExpectResult(entity1);
      expectedResult.Document.Style.IconStyle = {};
      expectedResult.Document.Style.PolyStyle = {};
      expectedResult.Document.Placemark.MultiGeometry = {
        Point: {
          altitudeMode: "absolute",
          coordinates: checkPointCoord,
        },
        Polygon: {
          altitudeMode: "absolute",
          outerBoundaryIs: {
            LinearRing: {
              coordinates: getCheckCoords(),
            },
          },
          extrude: true,
        },
      };

      checkKmlDoc(entities, expectedResult);
    });
  });
});
