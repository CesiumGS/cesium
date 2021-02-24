import { Cartesian3 } from "../../Source/Cesium.js";
import { HeadingPitchRange } from "../../Source/Cesium.js";
import { HeadingPitchRoll } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { KmlCamera } from "../../Source/Cesium.js";
import { KmlLookAt } from "../../Source/Cesium.js";
import { KmlTourFlyTo } from "../../Source/Cesium.js";
import pollToPromise from "../pollToPromise.js";

describe("DataSources/KmlTourFlyTo", function () {
  it("generates camera options for KmlLookAt", function () {
    var position = Cartesian3.fromDegrees(40.0, 30.0, 1000);
    var hpr = new HeadingPitchRange(
      CesiumMath.toRadians(10.0),
      CesiumMath.toRadians(45.0),
      10000
    );

    var flyto = new KmlTourFlyTo(10, "bounce", new KmlLookAt(position, hpr));
    var options = flyto.getCameraOptions();

    expect(options.duration).toEqual(10);
    expect(options.complete).toBeUndefined();
    expect(options.easingFunction).toBeUndefined();
    expect(options.offset).toBe(hpr);
    expect(options.destination).toBeUndefined();
    expect(options.orientation).toBeUndefined();
  });

  it("generates camera options for KmlCamera", function () {
    var position = Cartesian3.fromDegrees(40.0, 30.0, 1000);
    var hpr = new HeadingPitchRoll(
      CesiumMath.toRadians(10.0),
      CesiumMath.toRadians(45.0),
      0
    );

    var flyto = new KmlTourFlyTo(10, "bounce", new KmlCamera(position, hpr));
    var options = flyto.getCameraOptions();

    expect(options.duration).toEqual(10);
    expect(options.complete).toBeUndefined();
    expect(options.easingFunction).toBeUndefined();
    expect(options.offset).toBeUndefined();
    expect(options.destination.x).toEqual(position.x);
    expect(options.destination.y).toEqual(position.y);
    expect(options.destination.z).toEqual(position.z);
    expect(options.orientation).toBe(hpr);
  });

  it("adds activeCallback to options", function () {
    var position = Cartesian3.fromDegrees(40.0, 30.0, 1000);
    var hpr = new HeadingPitchRange(
      CesiumMath.toRadians(10.0),
      CesiumMath.toRadians(45.0),
      10000
    );

    var flyto = new KmlTourFlyTo(10, "bounce", new KmlLookAt(position, hpr));
    flyto.activeCallback = jasmine.createSpy("activeCallback");
    var options = flyto.getCameraOptions();

    expect(options.complete).toBeDefined();
    options.complete();
    expect(options.complete).toHaveBeenCalled();
  });

  it("calls camera flyTo for KmlCamera", function () {
    var position = Cartesian3.fromDegrees(40.0, 30.0, 1000);
    var hpr = new HeadingPitchRoll(
      CesiumMath.toRadians(10.0),
      CesiumMath.toRadians(45.0),
      0
    );

    var flyto = new KmlTourFlyTo(0.01, "bounce", new KmlCamera(position, hpr));
    var doneSpy = jasmine.createSpy("cameraDone");
    var flyFake = jasmine.createSpy("flyTo").and.callFake(function (options) {
      if (options.complete) {
        options.complete();
      }
    });
    var fakeCamera = {
      flyTo: flyFake,
    };
    flyto.play(doneSpy, fakeCamera);

    return pollToPromise(function () {
      return doneSpy.calls.count() > 0;
    }).then(function () {
      expect(fakeCamera.flyTo).toHaveBeenCalled();
      expect(fakeCamera.flyTo.calls.mostRecent().args[0].destination).toBe(
        position
      );
      expect(fakeCamera.flyTo.calls.mostRecent().args[0].orientation).toBe(hpr);
      expect(doneSpy).toHaveBeenCalled();
    });
  });

  it("calls camera flyToBoundingSphere for KmlLookAt", function () {
    var position = Cartesian3.fromDegrees(40.0, 30.0, 1000);
    var hpr = new HeadingPitchRange(
      CesiumMath.toRadians(10.0),
      CesiumMath.toRadians(45.0),
      10000
    );

    var flyto = new KmlTourFlyTo(0.01, "bounce", new KmlLookAt(position, hpr));
    var doneSpy = jasmine.createSpy("cameraDone");
    var flyFake = jasmine
      .createSpy("flyToBoundingSphere")
      .and.callFake(function (sphere, options) {
        if (options.complete) {
          options.complete();
        }
      });
    var fakeCamera = {
      flyToBoundingSphere: flyFake,
    };
    flyto.play(doneSpy, fakeCamera);

    return pollToPromise(function () {
      return doneSpy.calls.count() > 0;
    }).then(function () {
      expect(fakeCamera.flyToBoundingSphere).toHaveBeenCalled();
      expect(
        fakeCamera.flyToBoundingSphere.calls.mostRecent().args[0].center.x
      ).toEqual(position.x);
      expect(
        fakeCamera.flyToBoundingSphere.calls.mostRecent().args[0].center.y
      ).toEqual(position.y);
      expect(
        fakeCamera.flyToBoundingSphere.calls.mostRecent().args[0].center.z
      ).toEqual(position.z);
      expect(
        fakeCamera.flyToBoundingSphere.calls.mostRecent().args[1].offset
      ).toBe(hpr);
      expect(doneSpy).toHaveBeenCalled();
    });
  });
});
