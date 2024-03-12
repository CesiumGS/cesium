import createScene from "../../../../Specs/createScene.js";
import {
  BoxGeometryUpdater,
  CorridorGeometryUpdater,
  CylinderGeometryUpdater,
  EllipseGeometryUpdater,
  EllipsoidGeometryUpdater,
  Entity,
  Event,
  GeometryUpdaterSet,
  PlaneGeometryUpdater,
  PolygonGeometryUpdater,
  PolylineVolumeGeometryUpdater,
  RectangleGeometryUpdater,
  WallGeometryUpdater,
} from "../../index.js";

describe("GeometryUpdaterSet", () => {
  let scene;
  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  it("has expected defaults", () => {
    const updaterSet = new GeometryUpdaterSet(new Entity(), scene);

    expect(updaterSet.updaters.length).toEqual(10);
    expect(updaterSet.updaters[0]).toBeInstanceOf(BoxGeometryUpdater);
    expect(updaterSet.updaters[1]).toBeInstanceOf(CylinderGeometryUpdater);
    expect(updaterSet.updaters[2]).toBeInstanceOf(CorridorGeometryUpdater);
    expect(updaterSet.updaters[3]).toBeInstanceOf(EllipseGeometryUpdater);
    expect(updaterSet.updaters[4]).toBeInstanceOf(EllipsoidGeometryUpdater);
    expect(updaterSet.updaters[5]).toBeInstanceOf(PlaneGeometryUpdater);
    expect(updaterSet.updaters[6]).toBeInstanceOf(PolygonGeometryUpdater);
    expect(updaterSet.updaters[7]).toBeInstanceOf(
      PolylineVolumeGeometryUpdater
    );
    expect(updaterSet.updaters[8]).toBeInstanceOf(RectangleGeometryUpdater);
    expect(updaterSet.updaters[9]).toBeInstanceOf(WallGeometryUpdater);
  });

  it("registers new updater", () => {
    function FakeUpdater() {}
    FakeUpdater.prototype.geometryChanged = new Event();

    GeometryUpdaterSet.registerUpdater(FakeUpdater);

    const updaterSet = new GeometryUpdaterSet(new Entity(), scene);

    expect(updaterSet.updaters.length).toEqual(11);
    expect(updaterSet.updaters[10]).toBeInstanceOf(FakeUpdater);

    GeometryUpdaterSet.unregisterUpdater(FakeUpdater);
    const updaterSet2 = new GeometryUpdaterSet(new Entity(), scene);

    expect(updaterSet2.updaters.length)
      .withContext("length after unregister")
      .toEqual(10);
  });
});
