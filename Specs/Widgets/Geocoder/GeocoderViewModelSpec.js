import { Cartesian3 } from "../../../Source/Cesium.js";
import { Rectangle } from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import pollToPromise from "../../pollToPromise.js";
import { when } from "../../../Source/Cesium.js";
import { GeocoderViewModel } from "../../../Source/Cesium.js";

describe(
  "Widgets/Geocoder/GeocoderViewModel",
  function () {
    let scene;
    const mockDestination = new Cartesian3(1.0, 2.0, 3.0);

    const geocoderResults1 = [
      {
        displayName: "a",
        destination: mockDestination,
      },
      {
        displayName: "b",
        destination: mockDestination,
      },
      {
        displayName: "c",
        destination: mockDestination,
      },
    ];
    const customGeocoderOptions = {
      autoComplete: true,
      geocode: function (input) {
        return when.resolve(geocoderResults1);
      },
    };

    const geocoderResults2 = [
      {
        displayName: "1",
        destination: mockDestination,
      },
      {
        displayName: "2",
        destination: mockDestination,
      },
    ];
    const customGeocoderOptions2 = {
      autoComplete: true,
      geocode: function (input) {
        return when.resolve(geocoderResults2);
      },
    };

    const noResultsGeocoder = {
      autoComplete: true,
      geocode: function (input) {
        return when.resolve([]);
      },
    };

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    it("constructor sets expected properties", function () {
      const flightDuration = 1234;

      const viewModel = new GeocoderViewModel({
        scene: scene,
        flightDuration: flightDuration,
      });

      expect(viewModel.scene).toBe(scene);
      expect(viewModel.flightDuration).toBe(flightDuration);
      expect(viewModel.keepExpanded).toBe(false);
    });

    it("can get and set flight duration", function () {
      const viewModel = new GeocoderViewModel({
        scene: scene,
      });
      viewModel.flightDuration = 324;
      expect(viewModel.flightDuration).toEqual(324);

      expect(function () {
        viewModel.flightDuration = -123;
      }).toThrowDeveloperError();
    });

    it("throws is searchText is not a string", function () {
      const viewModel = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [customGeocoderOptions],
      });
      expect(function () {
        viewModel.searchText = undefined;
      }).toThrowDeveloperError();
    });

    it("moves camera when search command invoked", function () {
      const viewModel = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [customGeocoderOptions],
      });

      const cameraPosition = Cartesian3.clone(scene.camera.position);

      viewModel.searchText = "220 Valley Creek Blvd, Exton, PA";
      viewModel.search();

      return pollToPromise(function () {
        scene.tweens.update();
        return !Cartesian3.equals(cameraPosition, scene.camera.position);
      });
    });

    it("constructor throws without scene", function () {
      expect(function () {
        return new GeocoderViewModel();
      }).toThrowDeveloperError();
    });

    it("raises the complete event camera finished", function () {
      const viewModel = new GeocoderViewModel({
        scene: scene,
        flightDuration: 0,
        geocoderServices: [customGeocoderOptions],
      });

      const spyListener = jasmine.createSpy("listener");
      viewModel.complete.addEventListener(spyListener);

      viewModel.searchText = "-1.0, -2.0";
      viewModel.search();

      expect(spyListener.calls.count()).toBe(1);

      viewModel.flightDuration = 1.5;
      viewModel.searchText = "2.0, 2.0";
      viewModel.search();

      return pollToPromise(function () {
        scene.tweens.update();
        return spyListener.calls.count() === 2;
      });
    });

    it("can be created with a custom geocoder", function () {
      expect(function () {
        return new GeocoderViewModel({
          scene: scene,
          geocoderServices: [customGeocoderOptions],
        });
      }).not.toThrowDeveloperError();
    });

    it("automatic suggestions can be retrieved", function () {
      const geocoder = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [customGeocoderOptions],
      });
      geocoder._searchText = "some_text";
      GeocoderViewModel._updateSearchSuggestions(geocoder);
      expect(geocoder._suggestions.length).toEqual(3);
    });

    it("update search suggestions results in empty list if the query is empty", function () {
      const geocoder = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [customGeocoderOptions],
      });
      geocoder._searchText = "";

      GeocoderViewModel._updateSearchSuggestions(geocoder);
      expect(geocoder._suggestions.length).toEqual(0);
    });

    it("can activate selected search suggestion", function () {
      spyOn(GeocoderViewModel, "flyToDestination");
      const destination = new Rectangle(0.0, -0.1, 0.1, 0.1);
      const geocoder = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [customGeocoderOptions],
      });

      const suggestion = { displayName: "a", destination: destination };
      geocoder._selectedSuggestion = suggestion;
      geocoder.activateSuggestion(suggestion);
      expect(geocoder._searchText).toEqual("a");
      expect(GeocoderViewModel.flyToDestination).toHaveBeenCalledWith(
        geocoder,
        destination
      );
    });

    it("if more than one geocoder service is provided, use first result from first geocode in array order", function () {
      spyOn(GeocoderViewModel, "flyToDestination");

      const geocoder = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [noResultsGeocoder, customGeocoderOptions2],
      });
      geocoder._searchText = "sthsnth"; // an empty query will prevent geocoding

      geocoder.search();
      expect(geocoder._searchText).toEqual(geocoderResults2[0].displayName);
      expect(GeocoderViewModel.flyToDestination).toHaveBeenCalledWith(
        geocoder,
        mockDestination
      );
    });

    it("can update autoComplete suggestions list using multiple geocoders", function () {
      const geocoder = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [customGeocoderOptions, customGeocoderOptions2],
      });
      geocoder._searchText = "sthsnth"; // an empty query will prevent geocoding
      GeocoderViewModel._updateSearchSuggestions(geocoder);
      expect(geocoder._suggestions.length).toEqual(
        geocoderResults1.length + geocoderResults2.length
      );
    });

    it("uses custom destination found callback", function () {
      spyOn(GeocoderViewModel, "flyToDestination");

      const destinationFound = jasmine.createSpy();
      const geocoder = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [noResultsGeocoder, customGeocoderOptions2],
        destinationFound: destinationFound,
      });
      geocoder._searchText = "sthsnth"; // an empty query will prevent geocoding
      geocoder.search();

      expect(geocoder._searchText).toEqual(geocoderResults2[0].displayName);
      expect(GeocoderViewModel.flyToDestination).not.toHaveBeenCalled();
      expect(destinationFound).toHaveBeenCalledWith(geocoder, mockDestination);
    });

    it("automatic suggestions can be navigated by arrow up/down keys", function () {
      spyOn(GeocoderViewModel, "_adjustSuggestionsScroll");
      const viewModel = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [customGeocoderOptions],
      });
      viewModel._searchText = "some_text";
      GeocoderViewModel._updateSearchSuggestions(viewModel);

      expect(viewModel._selectedSuggestion).toEqual(undefined);
      viewModel._handleArrowDown(viewModel);
      expect(viewModel._selectedSuggestion.displayName).toEqual("a");
      viewModel._handleArrowDown(viewModel);
      viewModel._handleArrowDown(viewModel);
      expect(viewModel._selectedSuggestion.displayName).toEqual("c");
      viewModel._handleArrowDown(viewModel);
      expect(viewModel._selectedSuggestion.displayName).toEqual("a");
      viewModel._handleArrowDown(viewModel);
      viewModel._handleArrowUp(viewModel);
      expect(viewModel._selectedSuggestion.displayName).toEqual("a");
      viewModel._handleArrowUp(viewModel);
      expect(viewModel._selectedSuggestion).toBeUndefined();
    });
  },
  "WebGL"
);
