import { Cartesian3 } from "../../Source/Cesium.js";
import { HeadingPitchRange } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { KmlLookAt } from "../../Source/Cesium.js";
import { KmlTour } from "../../Source/Cesium.js";
import { KmlTourFlyTo } from "../../Source/Cesium.js";
import { KmlTourWait } from "../../Source/Cesium.js";
import pollToPromise from "../pollToPromise.js";

describe("DataSources/KmlTour", function () {
  function getLookAt() {
    var position = Cartesian3.fromDegrees(40.0, 30.0, 1000);
    var hpr = new HeadingPitchRange(
      CesiumMath.toRadians(10.0),
      CesiumMath.toRadians(45.0),
      10000
    );
    return new KmlLookAt(position, hpr);
  }

  function createMockViewer() {
    var mockViewer = {};
    mockViewer.scene = {};
    mockViewer.scene.camera = {};
    mockViewer.scene.camera.flyTo = jasmine
      .createSpy("flyTo")
      .and.callFake(function (options) {
        if (options.complete) {
          options.complete();
        }
      });
    mockViewer.scene.camera.flyToBoundingSphere = jasmine
      .createSpy("flyToBoundingSphere")
      .and.callFake(function (boundingSphere, options) {
        if (options.complete) {
          options.complete();
        }
      });
    return mockViewer;
  }

  it("add entries to playlist", function () {
    var tour = new KmlTour("test", "test");
    var wait = new KmlTourWait(10);
    var flyTo = new KmlTourFlyTo(5, null, getLookAt());
    tour.addPlaylistEntry(wait);
    tour.addPlaylistEntry(flyTo);

    expect(tour.playlist.length).toEqual(2);
    expect(tour.playlist[0]).toBe(wait);
    expect(tour.playlist[1]).toBe(flyTo);
  });

  it("calls entries play", function () {
    var waitSpy = spyOn(KmlTourWait.prototype, "play").and.callFake(function (
      callback
    ) {
      callback();
    });
    var flySpy = spyOn(KmlTourFlyTo.prototype, "play").and.callFake(function (
      callback
    ) {
      callback();
    });

    var tour = new KmlTour("test", "test");
    var wait = new KmlTourWait(0.1);
    var flyTo = new KmlTourFlyTo(0.1, null, getLookAt());
    tour.addPlaylistEntry(wait);
    tour.addPlaylistEntry(flyTo);

    var mockViewer = createMockViewer();
    tour.play(mockViewer);
    return pollToPromise(function () {
      return waitSpy.calls.count() > 0 && flySpy.calls.count() > 0;
    }).then(function () {
      expect(waitSpy).toHaveBeenCalled();
      expect(flySpy).toHaveBeenCalled();
    });
  });

  it("calls events", function () {
    var tour = new KmlTour("test", "test");
    var wait1 = new KmlTourWait(0.05);
    var wait2 = new KmlTourWait(0.02);

    var tourStart = jasmine.createSpy("TourStart");
    var tourEnd = jasmine.createSpy("TourEnd");
    var entryStart = jasmine.createSpy("EntryStart");
    var entryEnd = jasmine.createSpy("EntryEnd");

    tour.addPlaylistEntry(wait1);
    tour.addPlaylistEntry(wait2);

    tour.tourStart.addEventListener(tourStart);
    tour.tourEnd.addEventListener(tourEnd);
    tour.entryStart.addEventListener(entryStart);
    tour.entryEnd.addEventListener(entryEnd);

    tour.play(createMockViewer());
    return pollToPromise(function () {
      return tourEnd.calls.count() > 0;
    }).then(function () {
      expect(tourStart).toHaveBeenCalled();
      expect(entryStart).toHaveBeenCalled();
      expect(entryEnd).toHaveBeenCalled();
      expect(tourEnd).toHaveBeenCalledWith(false);
    });
  });

  it("terminates playback", function () {
    var tour = new KmlTour("test", "test");
    var wait = new KmlTourWait(60);
    var flyTo = new KmlTourFlyTo(0.1, null, getLookAt());

    var tourStart = jasmine.createSpy("TourStart");
    var tourEnd = jasmine.createSpy("TourEnd");
    var entryStart = jasmine.createSpy("EntryStart");
    var entryEnd = jasmine.createSpy("EntryEnd");

    tour.addPlaylistEntry(wait);
    tour.addPlaylistEntry(flyTo);

    tour.tourStart.addEventListener(tourStart);
    tour.tourEnd.addEventListener(tourEnd);
    tour.entryStart.addEventListener(entryStart);
    tour.entryEnd.addEventListener(entryEnd);

    var mockViewer = createMockViewer();
    tour.play(mockViewer);
    setTimeout(function () {
      tour.stop();
      expect(tourStart).toHaveBeenCalled();
      // Wait entry have been started
      expect(entryStart).toHaveBeenCalledWith(wait);
      // Wait entry have been terminated
      expect(entryEnd).toHaveBeenCalledWith(wait, true);
      expect(tourEnd).toHaveBeenCalledWith(true);

      expect(entryStart.calls.count()).toEqual(1);
      expect(entryEnd.calls.count()).toEqual(1);
      expect(tourStart.calls.count()).toEqual(1);
      expect(tourEnd.calls.count()).toEqual(1);

      expect(mockViewer.scene.camera.flyTo.calls.count()).toEqual(0);
      expect(mockViewer.scene.camera.flyToBoundingSphere.calls.count()).toEqual(
        0
      );
    }, 5);
  });
});
