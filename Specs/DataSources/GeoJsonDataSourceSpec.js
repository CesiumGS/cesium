import { Cartesian3 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { Credit } from "../../Source/Cesium.js";
import { Event } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { PolygonHierarchy } from "../../Source/Cesium.js";
import { RuntimeError } from "../../Source/Cesium.js";
import { CallbackProperty } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";
import { EntityCollection } from "../../Source/Cesium.js";
import { GeoJsonDataSource } from "../../Source/Cesium.js";
import { HeightReference } from "../../Source/Cesium.js";
import { when } from "../../Source/Cesium.js";

describe("DataSources/GeoJsonDataSource", function () {
  var defaultMarkerSize;
  var defaultSymbol;
  var defaultMarkerColor;
  var defaultStroke;
  var defaultStrokeWidth;
  var defaultFill;
  var defaultClampToGround;

  beforeAll(function () {
    defaultMarkerSize = GeoJsonDataSource.markerSize;
    defaultSymbol = GeoJsonDataSource.markerSymbol;
    defaultMarkerColor = GeoJsonDataSource.markerColor;
    defaultStroke = GeoJsonDataSource.stroke;
    defaultStrokeWidth = GeoJsonDataSource.strokeWidth;
    defaultFill = GeoJsonDataSource.fill;
    defaultClampToGround = GeoJsonDataSource.clampToGround;
  });

  beforeEach(function () {
    GeoJsonDataSource.markerSize = defaultMarkerSize;
    GeoJsonDataSource.markerSymbol = defaultSymbol;
    GeoJsonDataSource.markerColor = defaultMarkerColor;
    GeoJsonDataSource.stroke = defaultStroke;
    GeoJsonDataSource.strokeWidth = defaultStrokeWidth;
    GeoJsonDataSource.fill = defaultFill;
    GeoJsonDataSource.clampToGround = defaultClampToGround;
  });

  var time = new JulianDate();

  function coordinatesToCartesian(coordinates) {
    return Cartesian3.fromDegrees(
      coordinates[0],
      coordinates[1],
      coordinates[2]
    );
  }

  function coordinatesArrayToCartesian(coordinates) {
    var result = [];
    for (var i = 0; i < coordinates.length; i++) {
      result.push(coordinatesToCartesian(coordinates[i]));
    }
    return result;
  }

  function multiLineToCartesian(geometry) {
    var coordinates = geometry.coordinates;
    var result = [];
    for (var i = 0; i < coordinates.length; i++) {
      result.push(coordinatesArrayToCartesian(coordinates[i]));
    }
    return result;
  }

  function polygonCoordinatesToCartesian(coordinates) {
    return coordinatesArrayToCartesian(coordinates);
  }

  function multiPolygonCoordinatesToCartesian(coordinates) {
    var result = [];
    for (var i = 0; i < coordinates.length; i++) {
      result.push(coordinatesArrayToCartesian(coordinates[i][0]));
    }
    return result;
  }

  var point = {
    type: "Point",
    coordinates: [102.0, 0.5],
  };

  var pointNamedCrs = {
    type: "Point",
    coordinates: [102.0, 0.5],
    crs: {
      type: "name",
      properties: {
        name: "EPSG:4326",
      },
    },
  };

  var pointNamedCrsOgc = {
    type: "Point",
    coordinates: [102.0, 0.5],
    crs: {
      type: "name",
      properties: {
        name: "urn:ogc:def:crs:OGC:1.3:CRS84",
      },
    },
  };

  var pointNamedCrsEpsg = {
    type: "Point",
    coordinates: [102.0, 0.5],
    crs: {
      type: "name",
      properties: {
        name: "urn:ogc:def:crs:EPSG::4326",
      },
    },
  };

  var pointCrsLinkHref = {
    type: "Point",
    coordinates: [102.0, 0.5],
    crs: {
      type: "link",
      properties: {
        href: "http://crs.invalid",
      },
    },
  };

  var pointCrsEpsg = {
    type: "Point",
    coordinates: [102.0, 0.5],
    crs: {
      type: "EPSG",
      properties: {
        code: 4326,
      },
    },
  };

  var lineString = {
    type: "LineString",
    coordinates: [
      [100.0, 0.0],
      [101.0, 1.0],
    ],
  };

  var polygon = {
    type: "Polygon",
    coordinates: [
      [
        [100.0, 0.0],
        [101.0, 0.0],
        [101.0, 1.0],
        [100.0, 1.0],
        [100.0, 0.0],
      ],
    ],
  };

  var polygonWithHoles = {
    type: "Polygon",
    coordinates: [
      [
        [100.0, 0.0],
        [101.0, 0.0],
        [101.0, 1.0],
        [100.0, 1.0],
        [100.0, 0.0],
      ],
      [
        [100.2, 0.2],
        [100.8, 0.2],
        [100.8, 0.8],
        [100.2, 0.8],
        [100.2, 0.2],
      ],
    ],
  };

  var polygonWithHeights = {
    type: "Polygon",
    coordinates: [
      [
        [100.0, 0.0, 1.0],
        [101.0, 0.0, 2.0],
        [101.0, 1.0, 1.0],
        [100.0, 1.0, 2.0],
        [100.0, 0.0, 3.0],
      ],
    ],
  };

  var multiPoint = {
    type: "MultiPoint",
    coordinates: [
      [100.0, 0.0],
      [101.0, 1.0],
      [101.0, 3.0],
    ],
  };

  var multiLineString = {
    type: "MultiLineString",
    coordinates: [
      [
        [100.0, 0.0],
        [101.0, 1.0],
      ],
      [
        [102.0, 2.0],
        [103.0, 3.0],
      ],
    ],
  };

  var multiPolygon = {
    type: "MultiPolygon",
    coordinates: [
      [
        [
          [102.0, 2.0],
          [103.0, 2.0],
          [103.0, 3.0],
          [102.0, 3.0],
          [102.0, 2.0],
        ],
      ],
      [
        [
          [100.0, 0.0],
          [101.0, 0.0],
          [101.0, 1.0],
          [100.0, 1.0],
          [100.0, 0.0],
        ],
      ],
    ],
  };

  var geometryCollection = {
    type: "GeometryCollection",
    geometries: [
      {
        type: "Point",
        coordinates: [100.0, 0.0],
      },
      {
        type: "LineString",
        coordinates: [
          [101.0, 0.0],
          [102.0, 1.0],
        ],
      },
    ],
  };

  var feature = {
    type: "Feature",
    geometry: point,
  };

  var featureWithNullName = {
    type: "Feature",
    geometry: point,
    properties: {
      name: null,
    },
  };

  var featureWithId = {
    id: "myId",
    type: "Feature",
    geometry: geometryCollection,
  };

  var featureUndefinedGeometry = {
    type: "Feature",
  };

  var featureNullGeometry = {
    type: "Feature",
    geometry: null,
  };

  var unknownGeometry = {
    type: "TimeyWimey",
    coordinates: [0, 0],
  };

  var featureUnknownGeometry = {
    type: "Feature",
    geometry: unknownGeometry,
  };

  var geometryCollectionUnknownType = {
    type: "GeometryCollection",
    geometries: [unknownGeometry],
  };

  var topoJson = {
    type: "Topology",
    transform: {
      scale: [1, 1],
      translate: [0, 0],
    },
    objects: {
      polygon: {
        type: "Polygon",
        arcs: [[0, 1, 2, 3]],
        properties: {
          myProps: 0,
        },
      },
      lineString: {
        type: "LineString",
        arcs: [4],
        properties: {
          myProps: 1,
        },
      },
    },
    arcs: [
      [
        [0, 0],
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ],
      [
        [0, 0],
        [1, 0],
        [0, 1],
      ],
      [
        [1, 1],
        [-1, 0],
        [0, -1],
      ],
      [[1, 1]],
      [[0, 0]],
    ],
  };

  var mixedGeometries = {
    type: "GeometryCollection",
    geometries: [lineString, polygon, point],
  };

  it("default constructor has expected values", function () {
    var dataSource = new GeoJsonDataSource();
    expect(dataSource.changedEvent).toBeInstanceOf(Event);
    expect(dataSource.errorEvent).toBeInstanceOf(Event);
    expect(dataSource.clock).toBeUndefined();
    expect(dataSource.name).toBeUndefined();
    expect(dataSource.entities).toBeInstanceOf(EntityCollection);
    expect(dataSource.entities.values.length).toEqual(0);
    expect(dataSource.show).toBe(true);
    expect(dataSource.credit).toBeUndefined();
  });

  it("credit gets set from options", function () {
    return GeoJsonDataSource.load(point, {
      credit: "This is my credit",
    }).then(function (dataSource) {
      expect(dataSource.credit).toBeInstanceOf(Credit);
    });
  });

  it("setting name raises changed event", function () {
    var dataSource = new GeoJsonDataSource();

    var spy = jasmine.createSpy("changedEvent");
    dataSource.changedEvent.addEventListener(spy);

    var newName = "chester";
    dataSource.name = newName;
    expect(dataSource.name).toEqual(newName);
    expect(spy.calls.count()).toEqual(1);
    expect(spy).toHaveBeenCalledWith(dataSource);
  });

  it("show sets underlying entity collection show.", function () {
    var dataSource = new GeoJsonDataSource();

    dataSource.show = false;
    expect(dataSource.show).toBe(false);
    expect(dataSource.show).toEqual(dataSource.entities.show);

    dataSource.show = true;
    expect(dataSource.show).toBe(true);
    expect(dataSource.show).toEqual(dataSource.entities.show);
  });

  it("Works with null geometry", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(featureNullGeometry).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.properties).toBe(featureNullGeometry.properties);
      expect(entity.position).toBeUndefined();
    });
  });

  it("Works with feature", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(feature).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.properties).toBe(feature.properties);
      expect(entity.position.getValue(time)).toEqual(
        coordinatesToCartesian(feature.geometry.coordinates)
      );
      expect(entity.billboard).toBeDefined();
    });
  });

  it("Creates default description from properties", function () {
    var featureWithProperties = {
      type: "Feature",
      geometry: point,
      properties: {
        prop1: "dog",
        prop2: "cat",
        prop3: "liger",
      },
    };

    var dataSource = new GeoJsonDataSource();
    return dataSource.load(featureWithProperties).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.description).toBeDefined();
      var description = entity.description.getValue(time);
      expect(description).toContain("prop1");
      expect(description).toContain("prop2");
      expect(description).toContain("prop3");
      expect(description).toContain("dog");
      expect(description).toContain("cat");
      expect(description).toContain("liger");
    });
  });

  it("Creates custom description string from properties", function () {
    var featureWithProperties = {
      type: "Feature",
      geometry: point,
      properties: {
        prop1: "dog",
        prop2: "cat",
      },
    };

    function testDescribe(properties) {
      var desc = "";
      for (var key in properties) {
        if (properties.hasOwnProperty(key)) {
          var value = properties[key];
          desc += key + " = " + value + ". ";
        }
      }
      return desc;
    }

    var dataSource = new GeoJsonDataSource();
    var options = {
      describe: testDescribe,
    };
    return dataSource.load(featureWithProperties, options).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.description).toBeDefined();
      var description = entity.description.getValue(time);
      expect(description).toContain("prop1 = dog.");
      expect(description).toContain("prop2 = cat.");
    });
  });

  it("Creates custom description from properties, using a describeProperty", function () {
    var featureWithProperties = {
      type: "Feature",
      geometry: point,
      properties: {
        prop1: "dog",
        prop2: "cat",
      },
    };

    function testDescribe(properties) {
      var desc = "";
      for (var key in properties) {
        if (properties.hasOwnProperty(key)) {
          var value = properties[key];
          desc += key + " = " + value + "; ";
        }
      }
      return desc;
    }
    function createDescriptionCallback(describe, properties, nameProperty) {
      var description;
      return function (time, result) {
        if (!description) {
          description = describe(properties, nameProperty);
        }
        return description;
      };
    }
    function testDescribeProperty(properties, nameProperty) {
      return new CallbackProperty(
        createDescriptionCallback(testDescribe, properties, nameProperty),
        true
      );
    }

    var dataSource = new GeoJsonDataSource();
    var options = {
      describe: testDescribeProperty,
    };
    return dataSource.load(featureWithProperties, options).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.description).toBeDefined();
      var description = entity.description.getValue(time);
      expect(description).toContain("prop1 = dog;");
      expect(description).toContain("prop2 = cat;");
    });
  });

  it("Uses description if present", function () {
    var featureWithDescription = {
      type: "Feature",
      geometry: point,
      properties: {
        prop1: "dog",
        prop2: "cat",
        prop3: "liger",
        description: "This is my descriptiong!",
      },
    };

    var dataSource = new GeoJsonDataSource();
    return dataSource.load(featureWithDescription).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.description).toBeDefined();
      expect(entity.description.getValue(time)).toEqual(
        featureWithDescription.properties.description
      );
    });
  });

  it("Handles null description", function () {
    var featureWithNullDescription = {
      type: "Feature",
      geometry: point,
      properties: {
        description: null,
      },
    };

    var dataSource = new GeoJsonDataSource();
    return dataSource.load(featureWithNullDescription).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.description).toBeUndefined();
    });
  });

  it('Does not use "name" property as the object\'s name if it is null', function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(featureWithNullName).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.name).toBeUndefined();
      expect(entity.properties.name.getValue()).toBe(
        featureWithNullName.properties.name
      );
      expect(entity.properties.getValue(time)).toEqual(
        featureWithNullName.properties
      );
      expect(entity.position.getValue(time)).toEqual(
        coordinatesToCartesian(featureWithNullName.geometry.coordinates)
      );
      expect(entity.billboard).toBeDefined();
    });
  });

  it("Works with feature with id", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(featureWithId).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.id).toEqual(featureWithId.id);
      entity = entityCollection.values[1];
      expect(entity.id).toEqual(featureWithId.id + "_2");
    });
  });

  it("Works with null id", function () {
    var geojson = {
      id: null,
      type: "Feature",
      geometry: null,
    };

    var dataSource = new GeoJsonDataSource();
    return dataSource.load(geojson).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.id).not.toEqual(null);
    });
  });

  it("Works with null properties", function () {
    var geojson = {
      type: "Feature",
      geometry: null,
      properties: null,
    };

    var dataSource = new GeoJsonDataSource();
    return dataSource.load(geojson).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.properties).toBeUndefined();
    });
  });

  it("Has entity collection with link to data source", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(featureWithId).then(function () {
      var entityCollection = dataSource.entities;
      expect(entityCollection.owner).toEqual(dataSource);
    });
  });

  it("Has entity with link to entity collection", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(featureWithId).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.entityCollection).toEqual(entityCollection);
    });
  });

  it("Works with point geometry", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(point).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.properties).toBe(point.properties);
      expect(entity.position.getValue(time)).toEqual(
        coordinatesToCartesian(point.coordinates)
      );
      expect(entity.billboard).toBeDefined();
      expect(entity.billboard.image).toBeDefined();
    });
  });

  it("Works with point geometry clamped to ground", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource
      .load(point, {
        clampToGround: true,
      })
      .then(function () {
        var entityCollection = dataSource.entities;
        var entity = entityCollection.values[0];
        expect(entity.properties).toBe(point.properties);
        expect(entity.position.getValue(time)).toEqual(
          coordinatesToCartesian(point.coordinates)
        );
        expect(entity.billboard).toBeDefined();
        expect(entity.billboard.image).toBeDefined();
        expect(entity.billboard.heightReference.getValue(time)).toBe(
          HeightReference.CLAMP_TO_GROUND
        );
      });
  });

  it("Works with point geometry with simplystyle", function () {
    var geojson = {
      type: "Point",
      coordinates: [102.0, 0.5],
      properties: {
        "marker-size": "large",
        "marker-symbol": "bus",
        "marker-color": "#ffffff",
      },
    };

    var dataSource = new GeoJsonDataSource();
    return dataSource.load(geojson).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.billboard).toBeDefined();
      return when(
        dataSource._pinBuilder.fromMakiIconId("bus", Color.WHITE, 64)
      ).then(function (image) {
        expect(entity.billboard.image.getValue()).toBe(image);
      });
    });
  });

  it("Works with point geometry with null simplystyle", function () {
    var geojson = {
      type: "Point",
      coordinates: [102.0, 0.5],
      properties: {
        "marker-size": null,
        "marker-symbol": null,
        "marker-color": null,
      },
    };

    var dataSource = new GeoJsonDataSource();
    return dataSource.load(geojson).then(function () {
      var image = dataSource._pinBuilder.fromColor(
        GeoJsonDataSource.markerColor,
        GeoJsonDataSource.markerSize
      );
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.billboard).toBeDefined();
      expect(entity.billboard.image.getValue()).toBe(image);
    });
  });

  it("Works with point geometry and unknown simplystyle", function () {
    var geojson = {
      type: "Point",
      coordinates: [102.0, 0.5],
      properties: {
        "marker-size": "large",
        "marker-symbol": "notAnIcon",
        "marker-color": "#ffffff",
      },
    };

    var dataSource = new GeoJsonDataSource();
    return dataSource.load(geojson).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.billboard).toBeDefined();
      return when(dataSource._pinBuilder.fromColor(Color.WHITE, 64)).then(
        function (image) {
          expect(entity.billboard.image.getValue()).toBe(image);
        }
      );
    });
  });

  it("Works with multipoint geometry", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(multiPoint).then(function () {
      var entityCollection = dataSource.entities;
      var entities = entityCollection.values;
      var expectedPositions = coordinatesArrayToCartesian(
        multiPoint.coordinates
      );
      for (var i = 0; i < multiPoint.coordinates.length; i++) {
        var entity = entities[i];
        expect(entity.properties).toBe(multiPoint.properties);
        expect(entity.position.getValue(time)).toEqual(expectedPositions[i]);
        expect(entity.billboard).toBeDefined();
        expect(entity.billboard.image).toBeDefined();
      }
    });
  });

  it("Works with multipoint geometry clamped to ground", function () {
    GeoJsonDataSource.clampToGround = true;
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(multiPoint).then(function () {
      var entityCollection = dataSource.entities;
      var entities = entityCollection.values;
      var expectedPositions = coordinatesArrayToCartesian(
        multiPoint.coordinates
      );
      for (var i = 0; i < multiPoint.coordinates.length; i++) {
        var entity = entities[i];
        expect(entity.properties).toBe(multiPoint.properties);
        expect(entity.position.getValue(time)).toEqual(expectedPositions[i]);
        expect(entity.billboard).toBeDefined();
        expect(entity.billboard.image).toBeDefined();
        expect(entity.billboard.heightReference.getValue()).toBe(
          HeightReference.CLAMP_TO_GROUND
        );
      }
    });
  });

  it("Works with lineString geometry", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(lineString).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.properties).toBe(lineString.properties);
      expect(entity.polyline.positions.getValue(time)).toEqual(
        coordinatesArrayToCartesian(lineString.coordinates)
      );
      expect(entity.polyline.material.color.getValue(time)).toEqual(
        GeoJsonDataSource.stroke
      );
      expect(entity.polyline.width.getValue(time)).toEqual(2);
    });
  });

  it("Works with lineString geometry clamped to ground", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource
      .load(lineString, {
        clampToGround: true,
      })
      .then(function () {
        var entityCollection = dataSource.entities;
        var entity = entityCollection.values[0];
        expect(entity.properties).toBe(lineString.properties);
        expect(entity.polyline.positions.getValue(time)).toEqual(
          coordinatesArrayToCartesian(lineString.coordinates)
        );
        expect(entity.polyline.material.color.getValue(time)).toEqual(
          GeoJsonDataSource.stroke
        );
        expect(entity.polyline.width.getValue(time)).toEqual(2);
        expect(entity.polyline.clampToGround.getValue(time)).toEqual(true);
      });
  });

  it("Works with multiLineString geometry", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(multiLineString).then(function () {
      var entityCollection = dataSource.entities;
      var entities = entityCollection.values;
      var lines = multiLineToCartesian(multiLineString);
      for (var i = 0; i < multiLineString.coordinates.length; i++) {
        var entity = entities[i];
        expect(entity.properties).toBe(multiLineString.properties);
        expect(entity.polyline.positions.getValue(time)).toEqual(lines[i]);
        expect(entity.polyline.material.color.getValue(time)).toEqual(
          Color.YELLOW
        );
        expect(entity.polyline.width.getValue(time)).toEqual(2);
      }
    });
  });

  it("Works with multiLineString geometry clamped to ground", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource
      .load(multiLineString, {
        clampToGround: true,
      })
      .then(function () {
        var entityCollection = dataSource.entities;
        var entities = entityCollection.values;
        var lines = multiLineToCartesian(multiLineString);
        for (var i = 0; i < multiLineString.coordinates.length; i++) {
          var entity = entities[i];
          expect(entity.properties).toBe(multiLineString.properties);
          expect(entity.polyline.positions.getValue(time)).toEqual(lines[i]);
          expect(entity.polyline.material.color.getValue(time)).toEqual(
            Color.YELLOW
          );
          expect(entity.polyline.width.getValue(time)).toEqual(2);
          expect(entity.polyline.clampToGround.getValue(time)).toEqual(true);
        }
      });
  });

  it("Works with polygon geometry", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(polygon).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.properties).toBe(polygon.properties);
      expect(entity.polygon.hierarchy.getValue(time)).toEqual(
        new PolygonHierarchy(
          polygonCoordinatesToCartesian(polygon.coordinates[0])
        )
      );
      expect(entity.polygon.perPositionHeight).toBeUndefined();
      expect(entity.polygon.material.color.getValue(time)).toEqual(
        GeoJsonDataSource.fill
      );
      expect(entity.polygon.outline.getValue(time)).toEqual(true);
      expect(entity.polygon.outlineWidth.getValue(time)).toEqual(
        GeoJsonDataSource.strokeWidth
      );
      expect(entity.polygon.outlineColor.getValue(time)).toEqual(
        GeoJsonDataSource.stroke
      );
      expect(entity.polygon.height).toBeInstanceOf(ConstantProperty);
    });
  });

  it("Works with polygon geometry clamped to ground", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource
      .load(polygon, {
        clampToGround: true,
      })
      .then(function () {
        var entityCollection = dataSource.entities;
        var entity = entityCollection.values[0];
        expect(entity.properties).toBe(polygon.properties);
        expect(entity.polygon.hierarchy.getValue(time)).toEqual(
          new PolygonHierarchy(
            polygonCoordinatesToCartesian(polygon.coordinates[0])
          )
        );
        expect(entity.polygon.perPositionHeight).toBeUndefined();
        expect(entity.polygon.material.color.getValue(time)).toEqual(
          GeoJsonDataSource.fill
        );
        expect(entity.polygon.outline.getValue(time)).toEqual(true);
        expect(entity.polygon.outlineWidth.getValue(time)).toEqual(
          GeoJsonDataSource.strokeWidth
        );
        expect(entity.polygon.outlineColor.getValue(time)).toEqual(
          GeoJsonDataSource.stroke
        );
        expect(entity.polygon.height).toBeUndefined();
      });
  });

  it("Works with polygon geometry with Heights", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(polygonWithHeights).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.properties).toBe(polygonWithHeights.properties);
      expect(entity.polygon.hierarchy.getValue(time)).toEqual(
        new PolygonHierarchy(
          polygonCoordinatesToCartesian(polygonWithHeights.coordinates[0])
        )
      );
      expect(entity.polygon.perPositionHeight.getValue(time)).toBe(true);
      expect(entity.polygon.material.color.getValue(time)).toEqual(
        GeoJsonDataSource.fill
      );
      expect(entity.polygon.outline.getValue(time)).toEqual(true);
      expect(entity.polygon.outlineWidth.getValue(time)).toEqual(
        GeoJsonDataSource.strokeWidth
      );
      expect(entity.polygon.outlineColor.getValue(time)).toEqual(
        GeoJsonDataSource.stroke
      );
    });
  });

  it("Works with polygon geometry with holes", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(polygonWithHoles).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.properties).toBe(polygonWithHoles.properties);
      expect(entity.polygon.hierarchy.getValue(time)).toEqual(
        new PolygonHierarchy(
          polygonCoordinatesToCartesian(polygonWithHoles.coordinates[0]),
          [
            new PolygonHierarchy(
              polygonCoordinatesToCartesian(polygonWithHoles.coordinates[1])
            ),
          ]
        )
      );
    });
  });

  it("Works with multiPolygon geometry", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(multiPolygon).then(function () {
      var entityCollection = dataSource.entities;
      var entities = entityCollection.values;
      var positions = multiPolygonCoordinatesToCartesian(
        multiPolygon.coordinates
      );
      for (var i = 0; i < multiPolygon.coordinates.length; i++) {
        var entity = entities[i];
        expect(entity.properties).toBe(multiPolygon.properties);
        expect(entity.polygon.hierarchy.getValue(time)).toEqual(
          new PolygonHierarchy(positions[i])
        );
      }
    });
  });

  it("Works with topojson geometry", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(topoJson).then(function () {
      var entityCollection = dataSource.entities;
      var entities = entityCollection.values;

      var polygon = entities[0];
      expect(polygon.properties.myProps.getValue()).toBe(
        topoJson.objects.polygon.properties.myProps
      );
      expect(polygon.properties.getValue(time)).toEqual(
        topoJson.objects.polygon.properties
      );

      expect(polygon.polygon.hierarchy).toBeDefined();

      var lineString = entities[1];
      expect(lineString.properties.myProps.getValue()).toBe(
        topoJson.objects.lineString.properties.myProps
      );
      expect(lineString.properties.getValue(time)).toEqual(
        topoJson.objects.lineString.properties
      );

      expect(lineString.polyline).toBeDefined();
    });
  });

  it("Can provide base styling options", function () {
    var options = {
      markerSize: 10,
      markerSymbol: "bus",
      markerColor: Color.GREEN,
      stroke: Color.ORANGE,
      strokeWidth: 8,
      fill: Color.RED,
    };

    var dataSource = new GeoJsonDataSource();
    return dataSource.load(mixedGeometries, options).then(function () {
      var entityCollection = dataSource.entities;
      var entities = entityCollection.values;

      var entity = entities[0];
      expect(entity.polyline.material.color.getValue()).toEqual(options.stroke);
      expect(entity.polyline.width.getValue()).toEqual(options.strokeWidth);

      entity = entities[1];
      expect(entity.polygon.material.color.getValue()).toEqual(options.fill);
      expect(entity.polygon.outlineColor.getValue()).toEqual(options.stroke);
      expect(entity.polygon.outlineWidth.getValue()).toEqual(
        options.strokeWidth
      );

      entity = entities[2];
      var expectedImage = dataSource._pinBuilder.fromMakiIconId(
        options.markerSymbol,
        options.markerColor,
        options.markerSize
      );
      expect(entity.billboard.image.getValue()).toEqual(expectedImage);
    });
  });

  it("Can set default graphics", function () {
    GeoJsonDataSource.markerSize = 10;
    GeoJsonDataSource.markerSymbol = "bus";
    GeoJsonDataSource.markerColor = Color.GREEN;
    GeoJsonDataSource.stroke = Color.ORANGE;
    GeoJsonDataSource.strokeWidth = 8;
    GeoJsonDataSource.fill = Color.RED;

    var dataSource = new GeoJsonDataSource();
    return dataSource.load(mixedGeometries).then(function () {
      var entityCollection = dataSource.entities;
      var entities = entityCollection.values;

      var entity = entities[0];
      expect(entity.polyline.material.color.getValue()).toEqual(
        GeoJsonDataSource.stroke
      );
      expect(entity.polyline.width.getValue()).toEqual(
        GeoJsonDataSource.strokeWidth
      );

      entity = entities[1];
      expect(entity.polygon.material.color.getValue()).toEqual(
        GeoJsonDataSource.fill
      );
      expect(entity.polygon.outlineColor.getValue()).toEqual(
        GeoJsonDataSource.stroke
      );
      expect(entity.polygon.outlineWidth.getValue()).toEqual(
        GeoJsonDataSource.strokeWidth
      );

      entity = entities[2];
      var expectedImage = dataSource._pinBuilder.fromMakiIconId(
        GeoJsonDataSource.markerSymbol,
        GeoJsonDataSource.markerColor,
        GeoJsonDataSource.markerSize
      );
      expect(entity.billboard.image.getValue()).toEqual(expectedImage);
    });
  });

  it("Generates description", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(topoJson).then(function () {
      var entityCollection = dataSource.entities;
      var entities = entityCollection.values;
      var polygon = entities[0];
      expect(polygon.description).toBeDefined();
    });
  });

  it("Works with geometrycollection", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(geometryCollection).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.properties).toBe(geometryCollection.properties);
      expect(entity.position.getValue(time)).toEqual(
        coordinatesToCartesian(geometryCollection.geometries[0].coordinates)
      );
      expect(entity.billboard).toBeDefined();

      entity = entityCollection.values[1];
      expect(entity.properties).toBe(geometryCollection.properties);
      expect(entity.polyline.positions.getValue(time)).toEqual(
        coordinatesArrayToCartesian(
          geometryCollection.geometries[1].coordinates
        )
      );
    });
  });

  it("Works with named crs", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(pointNamedCrs).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.position.getValue(time)).toEqual(
        coordinatesToCartesian(point.coordinates)
      );
    });
  });

  it("Works with named crs OGC:1.3:CRS84", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(pointNamedCrsOgc).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.position.getValue(time)).toEqual(
        coordinatesToCartesian(point.coordinates)
      );
    });
  });

  it("Works with named crs EPSG::4326", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load(pointNamedCrsEpsg).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.position.getValue(time)).toEqual(
        coordinatesToCartesian(point.coordinates)
      );
    });
  });

  it("Works with link crs href", function () {
    var projectedPosition = new Cartesian3(1, 2, 3);
    GeoJsonDataSource.crsLinkHrefs[
      pointCrsLinkHref.crs.properties.href
    ] = function (properties) {
      expect(properties).toBe(pointCrsLinkHref.crs.properties);
      return when(properties.href).then(function (href) {
        return function (coordinate) {
          expect(coordinate).toBe(pointCrsLinkHref.coordinates);
          return projectedPosition;
        };
      });
    };

    var dataSource = new GeoJsonDataSource();
    return dataSource.load(pointCrsLinkHref).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.position.getValue(time)).toEqual(projectedPosition);
    });
  });

  it("Works with EPSG crs", function () {
    var dataSource = new GeoJsonDataSource();

    return dataSource.load(pointCrsEpsg).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.position.getValue(time)).toEqual(
        coordinatesToCartesian(point.coordinates)
      );
    });
  });

  it("Works with polyline using simplestyle", function () {
    var geoJson = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [100.0, 0.0],
          [101.0, 1.0],
        ],
      },
      properties: {
        title: "textMarker",
        description: "My description",
        stroke: "#aabbcc",
        "stroke-opacity": 0.5,
        "stroke-width": 5,
      },
    };

    var dataSource = new GeoJsonDataSource();
    return dataSource.load(geoJson).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.name).toEqual(geoJson.properties.title);
      expect(entity.description.getValue(time)).toEqual(
        geoJson.properties.description
      );

      var expectedColor = Color.fromCssColorString(geoJson.properties.stroke);
      expectedColor.alpha = geoJson.properties["stroke-opacity"];
      expect(entity.polyline.material.color.getValue(time)).toEqual(
        expectedColor
      );
      expect(entity.polyline.width.getValue(time)).toEqual(
        geoJson.properties["stroke-width"]
      );
    });
  });

  it("Works with polyline using null simplestyle values", function () {
    var geoJson = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [100.0, 0.0],
          [101.0, 1.0],
        ],
      },
      properties: {
        title: null,
        description: null,
        stroke: null,
        "stroke-opacity": null,
        "stroke-width": null,
      },
    };

    var dataSource = new GeoJsonDataSource();
    return dataSource.load(geoJson).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.name).toBeUndefined();
      expect(entity.description).toBeUndefined();
      expect(entity.polyline.material.color.getValue(time)).toEqual(
        GeoJsonDataSource.stroke
      );
      expect(entity.polyline.width.getValue(time)).toEqual(
        GeoJsonDataSource.strokeWidth
      );
    });
  });

  it("Works with polyline using null simplestyle values but with opacity", function () {
    var geoJson = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [100.0, 0.0],
          [101.0, 1.0],
        ],
      },
      properties: {
        title: null,
        description: null,
        stroke: null,
        "stroke-opacity": 0.42,
        "stroke-width": null,
      },
    };

    var dataSource = new GeoJsonDataSource();
    return dataSource.load(geoJson).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.name).toBeUndefined();
      expect(entity.description).toBeUndefined();

      var expectedMaterialColor = GeoJsonDataSource.stroke.clone();
      expectedMaterialColor.alpha = 0.42;
      expect(entity.polyline.material.color.getValue(time)).toEqual(
        expectedMaterialColor
      );
      expect(entity.polyline.width.getValue(time)).toEqual(
        GeoJsonDataSource.strokeWidth
      );
    });
  });

  it("Works with polygon using simplestyle", function () {
    var geoJson = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [100.0, 0.0],
            [101.0, 0.0],
            [101.0, 1.0],
            [100.0, 1.0],
            [100.0, 0.0],
          ],
        ],
      },
      properties: {
        title: "textMarker",
        description: "My description",
        stroke: "#aabbcc",
        "stroke-opacity": 0.5,
        "stroke-width": 5,
        fill: "#ccaabb",
        "fill-opacity": 0.25,
      },
    };

    var dataSource = new GeoJsonDataSource();
    return dataSource.load(geoJson).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.name).toEqual(geoJson.properties.title);
      expect(entity.description.getValue(time)).toEqual(
        geoJson.properties.description
      );

      var expectedFill = Color.fromCssColorString(geoJson.properties.fill);
      expectedFill.alpha = geoJson.properties["fill-opacity"];

      var expectedOutlineColor = Color.fromCssColorString(
        geoJson.properties.stroke
      );
      expectedOutlineColor.alpha = geoJson.properties["stroke-opacity"];

      expect(entity.polygon.material.color.getValue(time)).toEqual(
        expectedFill
      );
      expect(entity.polygon.outline.getValue(time)).toEqual(true);
      expect(entity.polygon.outlineWidth.getValue(time)).toEqual(5);
      expect(entity.polygon.outlineColor.getValue(time)).toEqual(
        expectedOutlineColor
      );
    });
  });

  it("Works with polygon using null simplestyle", function () {
    var geoJson = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [100.0, 0.0],
            [101.0, 0.0],
            [101.0, 1.0],
            [100.0, 1.0],
            [100.0, 0.0],
          ],
        ],
      },
      properties: {
        title: null,
        description: null,
        stroke: null,
        "stroke-opacity": null,
        "stroke-width": null,
        fill: null,
        "fill-opacity": null,
      },
    };

    var dataSource = new GeoJsonDataSource();
    return dataSource.load(geoJson).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.name).toBeUndefined();
      expect(entity.description).toBeUndefined();
      expect(entity.polygon.material.color.getValue(time)).toEqual(
        GeoJsonDataSource.fill
      );
      expect(entity.polygon.outline.getValue(time)).toEqual(true);
      expect(entity.polygon.outlineWidth.getValue(time)).toEqual(
        GeoJsonDataSource.strokeWidth
      );
      expect(entity.polygon.outlineColor.getValue(time)).toEqual(
        GeoJsonDataSource.stroke
      );
    });
  });

  it("Works with polygons using null simplestyle but with an opacity", function () {
    var geoJson = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [100.0, 0.0],
            [101.0, 0.0],
            [101.0, 1.0],
            [100.0, 1.0],
            [100.0, 0.0],
          ],
        ],
      },
      properties: {
        title: null,
        description: null,
        stroke: null,
        "stroke-opacity": 0.42,
        "stroke-width": null,
        fill: null,
        "fill-opacity": 0.42,
      },
    };

    var dataSource = new GeoJsonDataSource();
    return dataSource.load(geoJson).then(function () {
      var entityCollection = dataSource.entities;
      var entity = entityCollection.values[0];
      expect(entity.name).toBeUndefined();
      expect(entity.description).toBeUndefined();

      var expectedFill = GeoJsonDataSource.fill.clone();
      expectedFill.alpha = geoJson.properties["fill-opacity"];
      expect(entity.polygon.material.color.getValue(time)).toEqual(
        expectedFill
      );

      var expectedOutlineColor = GeoJsonDataSource.stroke.clone();
      expectedOutlineColor.alpha = 0.42;
      expect(entity.polygon.outline.getValue(time)).toEqual(true);
      expect(entity.polygon.outlineWidth.getValue(time)).toEqual(
        GeoJsonDataSource.strokeWidth
      );
      expect(entity.polygon.outlineColor.getValue(time)).toEqual(
        expectedOutlineColor
      );
    });
  });

  it("load works with a URL", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource.load("Data/test.geojson").then(function () {
      expect(dataSource.name).toEqual("test.geojson");
    });
  });

  it("Fails when encountering unknown geometry", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource
      .load(featureUnknownGeometry)
      .then(function () {
        fail("should not be called");
      })
      .otherwise(function () {});
  });

  it("Fails with undefined geomeetry", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource
      .load(featureUndefinedGeometry)
      .then(function () {
        fail("should not be called");
      })
      .otherwise(function () {});
  });

  it("Fails with unknown geomeetry in geometryCollection", function () {
    var dataSource = new GeoJsonDataSource();
    return dataSource
      .load(geometryCollectionUnknownType)
      .then(function () {
        fail("should not be called");
      })
      .otherwise(function () {});
  });

  it("load throws with undefined geoJson", function () {
    var dataSource = new GeoJsonDataSource();
    expect(function () {
      dataSource.load(undefined);
    }).toThrowDeveloperError();
  });

  it("rejects unknown geometry", function () {
    return GeoJsonDataSource.load(unknownGeometry)
      .then(function () {
        fail("should not be called");
      })
      .otherwise(function (error) {
        expect(error).toBeInstanceOf(RuntimeError);
        expect(error.message).toContain(
          "Unsupported GeoJSON object type: TimeyWimey"
        );
      });
  });

  it("rejects invalid url", function () {
    return GeoJsonDataSource.load("invalid.geojson")
      .then(function () {
        fail("should not be called");
      })
      .otherwise(function (error) {
        expect(error.statusCode).toBe(404);
      });
  });

  it("rejects null CRS", function () {
    var featureWithNullCrs = {
      type: "Feature",
      geometry: point,
      crs: null,
    };

    return GeoJsonDataSource.load(featureWithNullCrs).then(function (
      dataSource
    ) {
      expect(dataSource.entities.values.length).toBe(0);
    });
  });

  it("rejects unknown CRS", function () {
    var featureWithUnknownCrsType = {
      type: "Feature",
      geometry: point,
      crs: {
        type: "potato",
        properties: {},
      },
    };

    return GeoJsonDataSource.load(featureWithUnknownCrsType)
      .then(function () {
        fail("should not be called");
      })
      .otherwise(function (error) {
        expect(error).toBeInstanceOf(RuntimeError);
        expect(error.message).toContain("Unknown crs type: potato");
      });
  });

  it("rejects undefined CRS properties", function () {
    var featureWithUndefinedCrsProperty = {
      type: "Feature",
      geometry: point,
      crs: {
        type: "name",
      },
    };

    return GeoJsonDataSource.load(featureWithUndefinedCrsProperty)
      .then(function () {
        fail("should not be called");
      })
      .otherwise(function (error) {
        expect(error).toBeInstanceOf(RuntimeError);
        expect(error.message).toContain("crs.properties is undefined.");
      });
  });

  it("rejects unknown CRS name", function () {
    var featureWithUnknownCrsType = {
      type: "Feature",
      geometry: point,
      crs: {
        type: "name",
        properties: {
          name: "failMe",
        },
      },
    };

    return GeoJsonDataSource.load(featureWithUnknownCrsType)
      .then(function () {
        fail("should not be called");
      })
      .otherwise(function (error) {
        expect(error).toBeInstanceOf(RuntimeError);
        expect(error.message).toContain("Unknown crs name: failMe");
      });
  });

  it("rejects unknown CRS link", function () {
    var featureWithUnknownCrsType = {
      type: "Feature",
      geometry: point,
      crs: {
        type: "link",
        properties: {
          href: "failMe",
          type: "failMeTwice",
        },
      },
    };

    return GeoJsonDataSource.load(featureWithUnknownCrsType)
      .then(function () {
        fail("should not be called");
      })
      .otherwise(function (error) {
        expect(error).toBeInstanceOf(RuntimeError);
        expect(error.message).toContain(
          'Unable to resolve crs link: {"href":"failMe","type":"failMeTwice"}'
        );
      });
  });

  it("load rejects loading non json file", function () {
    var dataSource = new GeoJsonDataSource();
    var spy = jasmine.createSpy("errorEvent");
    dataSource.errorEvent.addEventListener(spy);

    // Blue.png is not JSON
    return dataSource
      .load("Data/Images/Blue.png")
      .then(function () {
        fail("should not be called");
      })
      .otherwise(function () {
        expect(spy).toHaveBeenCalledWith(dataSource, jasmine.any(Error));
      });
  });

  it("load raises loading event", function () {
    var dataSource = new GeoJsonDataSource();
    var spy = jasmine.createSpy("loadingEvent");
    dataSource.loadingEvent.addEventListener(spy);

    var promise = dataSource.load("Data/test.geojson");
    expect(spy).toHaveBeenCalledWith(dataSource, true);
    expect(dataSource.isLoading).toBe(true);

    return promise.then(function () {
      expect(spy).toHaveBeenCalledWith(dataSource, false);
      expect(dataSource.isLoading).toBe(false);
    });
  });
});
