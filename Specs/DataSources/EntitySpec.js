import { Cartesian3 } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { Matrix3 } from "../../Source/Cesium.js";
import { Matrix4 } from "../../Source/Cesium.js";
import { Quaternion } from "../../Source/Cesium.js";
import { TimeInterval } from "../../Source/Cesium.js";
import { TimeIntervalCollection } from "../../Source/Cesium.js";
import { Transforms } from "../../Source/Cesium.js";
import { BillboardGraphics } from "../../Source/Cesium.js";
import { BoxGraphics } from "../../Source/Cesium.js";
import { ConstantPositionProperty } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";
import { CorridorGraphics } from "../../Source/Cesium.js";
import { CylinderGraphics } from "../../Source/Cesium.js";
import { EllipseGraphics } from "../../Source/Cesium.js";
import { EllipsoidGraphics } from "../../Source/Cesium.js";
import { Entity } from "../../Source/Cesium.js";
import { LabelGraphics } from "../../Source/Cesium.js";
import { ModelGraphics } from "../../Source/Cesium.js";
import { PathGraphics } from "../../Source/Cesium.js";
import { PlaneGraphics } from "../../Source/Cesium.js";
import { PointGraphics } from "../../Source/Cesium.js";
import { PolygonGraphics } from "../../Source/Cesium.js";
import { PolylineGraphics } from "../../Source/Cesium.js";
import { PolylineVolumeGraphics } from "../../Source/Cesium.js";
import { RectangleGraphics } from "../../Source/Cesium.js";
import { WallGraphics } from "../../Source/Cesium.js";

describe("DataSources/Entity", function () {
  it("constructor sets expected properties.", function () {
    var entity = new Entity();
    expect(entity.id).toBeDefined();
    expect(entity.name).toBeUndefined();
    expect(entity.billboard).toBeUndefined();
    expect(entity.box).toBeUndefined();
    expect(entity.corridor).toBeUndefined();
    expect(entity.cylinder).toBeUndefined();
    expect(entity.description).toBeUndefined();
    expect(entity.ellipse).toBeUndefined();
    expect(entity.ellipsoid).toBeUndefined();
    expect(entity.label).toBeUndefined();
    expect(entity.model).toBeUndefined();
    expect(entity.orientation).toBeUndefined();
    expect(entity.path).toBeUndefined();
    expect(entity.plane).toBeUndefined();
    expect(entity.point).toBeUndefined();
    expect(entity.polygon).toBeUndefined();
    expect(entity.polyline).toBeUndefined();
    expect(entity.polylineVolume).toBeUndefined();
    expect(entity.position).toBeUndefined();
    expect(entity.rectangle).toBeUndefined();
    expect(entity.viewFrom).toBeUndefined();
    expect(entity.wall).toBeUndefined();
    expect(entity.entityCollection).toBeUndefined();

    var options = {
      id: "someId",
      name: "bob",
      show: false,
      availability: new TimeIntervalCollection(),
      parent: new Entity(),
      customProperty: {},
      billboard: {},
      box: {},
      corridor: {},
      cylinder: {},
      description: "description",
      ellipse: {},
      ellipsoid: {},
      label: {},
      model: {},
      orientation: new Quaternion(1, 2, 3, 4),
      path: {},
      plane: {},
      point: {},
      polygon: {},
      polyline: {},
      polylineVolume: {},
      position: new Cartesian3(5, 6, 7),
      rectangle: {},
      viewFrom: new Cartesian3(8, 9, 10),
      wall: {},
    };

    entity = new Entity(options);
    expect(entity.id).toEqual(options.id);
    expect(entity.name).toEqual(options.name);
    expect(entity.show).toBe(options.show);
    expect(entity.availability).toBe(options.availability);
    expect(entity.parent).toBe(options.parent);
    expect(entity.customProperty).toBe(options.customProperty);

    expect(entity.billboard).toBeInstanceOf(BillboardGraphics);
    expect(entity.box).toBeInstanceOf(BoxGraphics);
    expect(entity.corridor).toBeInstanceOf(CorridorGraphics);
    expect(entity.cylinder).toBeInstanceOf(CylinderGraphics);
    expect(entity.description).toBeInstanceOf(ConstantProperty);
    expect(entity.ellipse).toBeInstanceOf(EllipseGraphics);
    expect(entity.ellipsoid).toBeInstanceOf(EllipsoidGraphics);
    expect(entity.label).toBeInstanceOf(LabelGraphics);
    expect(entity.model).toBeInstanceOf(ModelGraphics);
    expect(entity.orientation).toBeInstanceOf(ConstantProperty);
    expect(entity.path).toBeInstanceOf(PathGraphics);
    expect(entity.plane).toBeInstanceOf(PlaneGraphics);
    expect(entity.point).toBeInstanceOf(PointGraphics);
    expect(entity.polygon).toBeInstanceOf(PolygonGraphics);
    expect(entity.polyline).toBeInstanceOf(PolylineGraphics);
    expect(entity.polylineVolume).toBeInstanceOf(PolylineVolumeGraphics);
    expect(entity.position).toBeInstanceOf(ConstantPositionProperty);
    expect(entity.rectangle).toBeInstanceOf(RectangleGraphics);
    expect(entity.viewFrom).toBeInstanceOf(ConstantProperty);
    expect(entity.wall).toBeInstanceOf(WallGraphics);

    expect(entity.entityCollection).toBeUndefined();
  });

  it("isAvailable is always true if no availability defined.", function () {
    var entity = new Entity();
    expect(entity.isAvailable(JulianDate.now())).toEqual(true);
  });

  it("isAvailable throw if no time specified.", function () {
    var entity = new Entity();
    expect(function () {
      entity.isAvailable();
    }).toThrowDeveloperError();
  });

  it("constructor creates a unique id if one is not provided.", function () {
    var object = new Entity();
    var object2 = new Entity();
    expect(object.id).toBeDefined();
    expect(object.id).not.toEqual(object2.id);
  });

  it("isAvailable works.", function () {
    var entity = new Entity();
    var interval = TimeInterval.fromIso8601({
      iso8601: "2000-01-01/2001-01-01",
    });
    var intervals = new TimeIntervalCollection();
    intervals.addInterval(interval);
    entity.availability = intervals;
    expect(
      entity.isAvailable(
        JulianDate.addSeconds(interval.start, -1, new JulianDate())
      )
    ).toEqual(false);
    expect(entity.isAvailable(interval.start)).toEqual(true);
    expect(entity.isAvailable(interval.stop)).toEqual(true);
    expect(
      entity.isAvailable(
        JulianDate.addSeconds(interval.stop, 1, new JulianDate())
      )
    ).toEqual(false);
  });

  it("definitionChanged works for all properties", function () {
    var entity = new Entity();
    var propertyNames = entity.propertyNames;
    var propertyNamesLength = propertyNames.length;

    var listener = jasmine.createSpy("listener");
    entity.definitionChanged.addEventListener(listener);

    var i;
    var name;
    var newValue;
    var oldValue;
    //We loop through twice to ensure that oldValue is properly passed in.
    for (var x = 0; x < 2; x++) {
      for (i = 0; i < propertyNamesLength; i++) {
        name = propertyNames[i];
        newValue = new ConstantProperty(1);
        oldValue = entity[propertyNames[i]];
        entity[name] = newValue;
        expect(listener).toHaveBeenCalledWith(entity, name, newValue, oldValue);
      }
    }
  });

  it("merge ignores reserved property names when called with a plain object.", function () {
    var entity = new Entity();

    //Technically merge requires passing an Entity instance, but we call it internally
    //with a plain object during construction to set up custom properties.
    entity.merge({
      name: undefined,
      availability: undefined,
      parent: undefined,
    });
    expect(entity.name).toBeUndefined();
    expect(entity.availability).toBeUndefined();
    expect(entity.parent).toBeUndefined();
  });

  it("merge does not overwrite availability", function () {
    var entity = new Entity();
    var interval = TimeInterval.fromIso8601({
      iso8601: "2000-01-01/2001-01-01",
    });
    entity.availability = interval;

    var entity2 = new Entity();
    var interval2 = TimeInterval.fromIso8601({
      iso8601: "2000-01-01/2001-01-01",
    });
    entity2.availability = interval2;

    entity.merge(entity2);
    expect(entity.availability).toBe(interval);
  });

  it("merge works with custom properties.", function () {
    var propertyName = "customProperty";
    var value = "fizzbuzz";

    var source = new Entity({
      id: "source",
    });
    source.addProperty(propertyName);
    source[propertyName] = value;

    var target = new Entity({
      id: "target",
    });

    //Merging should actually call addProperty for the customProperty.
    spyOn(target, "addProperty").and.callThrough();
    target.merge(source);

    expect(target.addProperty).toHaveBeenCalledWith(propertyName);
    expect(target[propertyName]).toEqual(source[propertyName]);
  });

  it("merge throws with undefined source", function () {
    var entity = new Entity();
    expect(function () {
      entity.merge(undefined);
    }).toThrowDeveloperError();
  });

  it("computeModelMatrix throws if no time specified.", function () {
    var entity = new Entity();
    expect(function () {
      entity.computeModelMatrix();
    }).toThrowDeveloperError();
  });

  it("computeModelMatrix returns undefined when position is undefined.", function () {
    var entity = new Entity();
    entity.orientation = new ConstantProperty(Quaternion.IDENTITY);
    expect(entity.computeModelMatrix(new JulianDate())).toBeUndefined();
  });

  it("computeModelMatrix returns correct value.", function () {
    var entity = new Entity();

    var position = new Cartesian3(123456, 654321, 123456);
    var orientation = new Quaternion(1, 2, 3, 4);
    Quaternion.normalize(orientation, orientation);

    entity.position = new ConstantProperty(position);
    entity.orientation = new ConstantProperty(orientation);

    var modelMatrix = entity.computeModelMatrix(new JulianDate());
    var expected = Matrix4.fromRotationTranslation(
      Matrix3.fromQuaternion(orientation),
      position
    );
    expect(modelMatrix).toEqual(expected);
  });

  it("computeModelMatrix returns ENU when quaternion is undefined.", function () {
    var entity = new Entity();
    var position = new Cartesian3(123456, 654321, 123456);
    entity.position = new ConstantProperty(position);

    var modelMatrix = entity.computeModelMatrix(new JulianDate());
    var expected = Transforms.eastNorthUpToFixedFrame(position);
    expect(modelMatrix).toEqual(expected);
  });

  it("computeModelMatrix works with result parameter.", function () {
    var entity = new Entity();
    var position = new Cartesian3(123456, 654321, 123456);
    entity.position = new ConstantProperty(position);

    var result = new Matrix4();
    var modelMatrix = entity.computeModelMatrix(new JulianDate(), result);
    var expected = Transforms.eastNorthUpToFixedFrame(position);
    expect(modelMatrix).toBe(result);
    expect(modelMatrix).toEqual(expected);
  });

  it("can add and remove custom properties.", function () {
    var entity = new Entity();
    expect(entity.hasOwnProperty("bob")).toBe(false);
    expect(entity.propertyNames).not.toContain("bob");

    entity.addProperty("bob");
    expect(entity.hasOwnProperty("bob")).toBe(true);
    expect(entity.propertyNames).toContain("bob");

    entity.removeProperty("bob");
    expect(entity.hasOwnProperty("bob")).toBe(false);
    expect(entity.propertyNames).not.toContain("bob");
  });

  it("can re-add removed properties", function () {
    var entity = new Entity();
    entity.addProperty("bob");
    entity.removeProperty("bob");
    entity.addProperty("bob");
    expect(entity.hasOwnProperty("bob")).toBe(true);
    expect(entity.propertyNames).toContain("bob");
  });

  it("addProperty throws with no property specified.", function () {
    var entity = new Entity();
    expect(function () {
      entity.addProperty(undefined);
    }).toThrowDeveloperError();
  });

  it("addProperty throws with no property specified.", function () {
    var entity = new Entity();
    expect(function () {
      entity.addProperty(undefined);
    }).toThrowDeveloperError();
  });

  it("removeProperty throws with no property specified.", function () {
    var entity = new Entity();
    expect(function () {
      entity.removeProperty(undefined);
    }).toThrowDeveloperError();
  });

  it("addProperty throws when adding an existing property.", function () {
    var entity = new Entity();
    entity.addProperty("bob");
    expect(function () {
      entity.addProperty("bob");
    }).toThrowDeveloperError();
  });

  it("removeProperty throws when non-existent property.", function () {
    var entity = new Entity();
    expect(function () {
      entity.removeProperty("bob");
    }).toThrowDeveloperError();
  });

  it("addProperty throws with defined reserved property name.", function () {
    var entity = new Entity();
    expect(function () {
      entity.addProperty("merge");
    }).toThrowDeveloperError();
  });

  it("removeProperty throws with defined reserved property name.", function () {
    var entity = new Entity();
    expect(function () {
      entity.removeProperty("merge");
    }).toThrowDeveloperError();
  });

  it("addProperty throws with undefined reserved property name.", function () {
    var entity = new Entity();
    expect(entity.name).toBeUndefined();
    expect(function () {
      entity.addProperty("name");
    }).toThrowDeveloperError();
  });

  it("removeProperty throws with undefined reserved property name.", function () {
    var entity = new Entity();
    expect(entity.name).toBeUndefined();
    expect(function () {
      entity.removeProperty("name");
    }).toThrowDeveloperError();
  });

  it("isShowing works without parent.", function () {
    var entity = new Entity({
      show: false,
    });
    expect(entity.isShowing).toBe(false);

    var listener = jasmine.createSpy("listener");
    entity.definitionChanged.addEventListener(listener);

    entity.show = true;
    expect(listener.calls.count()).toBe(2);
    expect(listener.calls.argsFor(0)).toEqual([
      entity,
      "isShowing",
      true,
      false,
    ]);
    expect(listener.calls.argsFor(1)).toEqual([entity, "show", true, false]);
    expect(entity.isShowing).toBe(true);

    listener.calls.reset();

    entity.show = false;
    expect(listener.calls.count()).toBe(2);
    expect(listener.calls.argsFor(0)).toEqual([
      entity,
      "isShowing",
      false,
      true,
    ]);
    expect(listener.calls.argsFor(1)).toEqual([entity, "show", false, true]);
    expect(entity.isShowing).toBe(false);
  });

  function ancestorShowTest(entity, ancestor) {
    var listener = jasmine.createSpy("listener");
    entity.definitionChanged.addEventListener(listener);

    ancestor.show = false;

    //Setting ancestor show to false causes entity to raise
    //its own isShowing event, but not the show event.
    expect(listener.calls.count()).toBe(1);
    expect(listener.calls.argsFor(0)).toEqual([
      entity,
      "isShowing",
      false,
      true,
    ]);
    expect(entity.show).toBe(true);
    expect(entity.isShowing).toBe(false);

    listener.calls.reset();

    //Since isShowing is already false, setting show to false causes the show event
    //but not the isShowing event to be raised
    entity.show = false;
    expect(entity.show).toBe(false);
    expect(listener.calls.count()).toBe(1);
    expect(listener.calls.argsFor(0)).toEqual([entity, "show", false, true]);

    listener.calls.reset();

    //Setting ancestor show to true does not trigger the entity.isShowing event
    //because entity.show is false;
    ancestor.show = true;
    expect(entity.show).toBe(false);
    expect(entity.isShowing).toBe(false);
    expect(listener.calls.count()).toBe(0);

    listener.calls.reset();

    //Setting entity.show to try now causes both events to be raised
    //because the ancestor is also showing.
    entity.show = true;
    expect(listener.calls.count()).toBe(2);
    expect(listener.calls.argsFor(0)).toEqual([
      entity,
      "isShowing",
      true,
      false,
    ]);
    expect(listener.calls.argsFor(1)).toEqual([entity, "show", true, false]);
    expect(entity.show).toBe(true);
    expect(entity.isShowing).toBe(true);
  }

  it("isShowing works with parent.", function () {
    var parent = new Entity();
    var entity = new Entity();
    entity.parent = parent;
    ancestorShowTest(entity, parent);
  });

  it("isShowing works with grandparent.", function () {
    var grandparent = new Entity();
    var parent = new Entity();
    parent.parent = grandparent;
    var entity = new Entity();
    entity.parent = parent;
    ancestorShowTest(entity, grandparent);
  });

  it("isShowing works when replacing parent.", function () {
    var entity = new Entity();
    entity.parent = new Entity();

    var listener = jasmine.createSpy("listener");
    entity.definitionChanged.addEventListener(listener);

    entity.parent = new Entity({
      show: false,
    });

    expect(listener.calls.count()).toBe(2);
    expect(listener.calls.argsFor(0)).toEqual([
      entity,
      "isShowing",
      false,
      true,
    ]);
    expect(entity.show).toBe(true);
    expect(entity.isShowing).toBe(false);
  });

  it("isShowing works when removing parent.", function () {
    var entity = new Entity();
    entity.parent = new Entity({
      show: false,
    });
    expect(entity.isShowing).toBe(false);

    var listener = jasmine.createSpy("listener");
    entity.definitionChanged.addEventListener(listener);

    entity.parent = undefined;

    expect(listener.calls.count()).toBe(2);
    expect(listener.calls.argsFor(0)).toEqual([
      entity,
      "isShowing",
      true,
      false,
    ]);
    expect(entity.isShowing).toBe(true);
  });
});
