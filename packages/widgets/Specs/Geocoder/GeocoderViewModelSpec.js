import { Cartesian3, Credit, Rectangle } from "@cesium/engine";
import { GeocoderViewModel } from "../../index.js";
import createScene from "../../../../Specs/createScene.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

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
        return Promise.resolve(geocoderResults1);
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
        return Promise.resolve(geocoderResults2);
      },
    };

    const noResultsGeocoder = {
      autoComplete: true,
      geocode: function (input) {
        return Promise.resolve([]);
      },
    };

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    let geocoderViewModel;
    afterEach(function () {
      geocoderViewModel = geocoderViewModel && geocoderViewModel.destroy();
    });

    it("constructor sets expected properties", function () {
      const flightDuration = 1234;

      geocoderViewModel = new GeocoderViewModel({
        scene: scene,
        flightDuration: flightDuration,
      });

      expect(geocoderViewModel.scene).toBe(scene);
      expect(geocoderViewModel.flightDuration).toBe(flightDuration);
      expect(geocoderViewModel.keepExpanded).toBe(false);
    });

    it("can get and set flight duration", function () {
      geocoderViewModel = new GeocoderViewModel({
        scene: scene,
      });
      geocoderViewModel.flightDuration = 324;
      expect(geocoderViewModel.flightDuration).toEqual(324);

      expect(function () {
        geocoderViewModel.flightDuration = -123;
      }).toThrowDeveloperError();
    });

    it("throws if searchText is not a string", function () {
      geocoderViewModel = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [customGeocoderOptions],
      });
      expect(function () {
        geocoderViewModel.searchText = undefined;
      }).toThrowDeveloperError();
    });

    it("moves camera when search command invoked", async function () {
      let destinationFoundCallback;

      const promise = new Promise((resolve) => {
        destinationFoundCallback = async function (viewModel, destination) {
          await GeocoderViewModel.flyToDestination(viewModel, destination);
          resolve();
        };
      });

      geocoderViewModel = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [customGeocoderOptions],
        destinationFound: destinationFoundCallback,
      });

      const cameraPosition = Cartesian3.clone(scene.camera.position);

      geocoderViewModel.searchText = "220 Valley Creek Blvd, Exton, PA";
      await geocoderViewModel.search();
      await pollToPromise(function () {
        scene.tweens.update();
        return !Cartesian3.equals(cameraPosition, scene.camera.position);
      });
      await expectAsync(promise).toBeResolved();
    });

    it("constructor throws without scene", function () {
      expect(function () {
        return new GeocoderViewModel();
      }).toThrowDeveloperError();
    });

    it("raises the complete event camera finished", async function () {
      let destinationFoundCallback;

      const promise = new Promise((resolve) => {
        destinationFoundCallback = function (viewModel, destination) {
          GeocoderViewModel.flyToDestination(viewModel, destination).then(
            resolve
          );
        };
      });
      geocoderViewModel = new GeocoderViewModel({
        scene: scene,
        flightDuration: 0,
        geocoderServices: [customGeocoderOptions],
        destinationFound: destinationFoundCallback,
      });

      const spyListener = jasmine.createSpy("listener");
      geocoderViewModel.complete.addEventListener(spyListener);

      geocoderViewModel.searchText = "-1.0, -2.0";
      await geocoderViewModel.search();
      await promise;
      expect(spyListener.calls.count()).toBe(1);
    });

    it("can be created with a custom geocoder", function () {
      expect(function () {
        geocoderViewModel = new GeocoderViewModel({
          scene: scene,
          geocoderServices: [customGeocoderOptions],
        });
      }).not.toThrowDeveloperError();
    });

    it("automatic suggestions can be retrieved", async function () {
      const destinationFoundCallback = jasmine.createSpy();
      geocoderViewModel = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [customGeocoderOptions],
        destinationFound: destinationFoundCallback, // Don't move the camera after a successful geocode
      });
      geocoderViewModel._searchText = "some_text";
      await GeocoderViewModel._updateSearchSuggestions(geocoderViewModel);
      expect(geocoderViewModel._suggestions.length).toEqual(3);
      expect(destinationFoundCallback).not.toHaveBeenCalled();
    });

    it("update search suggestions results in empty list if the query is empty", async function () {
      const destinationFoundCallback = jasmine.createSpy();
      geocoderViewModel = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [customGeocoderOptions],
        destinationFound: destinationFoundCallback, // Don't move the camera after a successful geocode
      });
      geocoderViewModel._searchText = "";

      await GeocoderViewModel._updateSearchSuggestions(geocoderViewModel);
      expect(geocoderViewModel._suggestions.length).toEqual(0);
      expect(destinationFoundCallback).not.toHaveBeenCalled();
    });

    it("can activate selected search suggestion", function () {
      const destinationFoundCallback = jasmine.createSpy();
      const destination = new Rectangle(0.0, -0.1, 0.1, 0.1);
      geocoderViewModel = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [customGeocoderOptions],
        destinationFound: destinationFoundCallback, // Don't move the camera after a successful geocode
      });

      const suggestion = { displayName: "a", destination: destination };
      geocoderViewModel._selectedSuggestion = suggestion;
      geocoderViewModel.activateSuggestion(suggestion);
      expect(geocoderViewModel._searchText).toEqual("a");
      expect(destinationFoundCallback).toHaveBeenCalledWith(
        geocoderViewModel,
        destination
      );
    });

    it("if more than one geocoder service is provided, use first result from first geocode in array order", async function () {
      const destinationFoundCallback = jasmine.createSpy();
      geocoderViewModel = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [noResultsGeocoder, customGeocoderOptions2],
        destinationFound: destinationFoundCallback, // Don't move the camera after a successful geocode
      });
      geocoderViewModel._searchText = "sthsnth"; // an empty query will prevent geocoding

      await geocoderViewModel.search();
      expect(geocoderViewModel._searchText).toEqual(
        geocoderResults2[0].displayName
      );
      expect(destinationFoundCallback).toHaveBeenCalledWith(
        geocoderViewModel,
        mockDestination
      );
    });

    it("can update autoComplete suggestions list using multiple geocoders", async function () {
      const destinationFoundCallback = jasmine.createSpy();
      geocoderViewModel = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [customGeocoderOptions, customGeocoderOptions2],
        destinationFound: destinationFoundCallback, // Don't move the camera after a successful geocode
      });
      geocoderViewModel._searchText = "sthsnth"; // an empty query will prevent geocoding
      await GeocoderViewModel._updateSearchSuggestions(geocoderViewModel);
      expect(geocoderViewModel._suggestions.length).toEqual(
        geocoderResults1.length + geocoderResults2.length
      );
      expect(destinationFoundCallback).not.toHaveBeenCalled();
    });

    it("uses custom destination found callback", async function () {
      spyOn(GeocoderViewModel, "flyToDestination");

      const destinationFoundCallback = jasmine.createSpy();
      geocoderViewModel = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [noResultsGeocoder, customGeocoderOptions2],
        destinationFound: destinationFoundCallback,
      });
      geocoderViewModel._searchText = "sthsnth"; // an empty query will prevent geocoding
      await geocoderViewModel.search();
      // await promise;
      expect(geocoderViewModel._searchText).toEqual(
        geocoderResults2[0].displayName
      );
      expect(GeocoderViewModel.flyToDestination).not.toHaveBeenCalled();
      expect(destinationFoundCallback).toHaveBeenCalledWith(
        geocoderViewModel,
        mockDestination
      );
    });

    it("automatic suggestions can be navigated by arrow up/down keys", function () {
      spyOn(GeocoderViewModel, "_adjustSuggestionsScroll");
      const destinationFoundCallback = jasmine.createSpy();
      geocoderViewModel = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [customGeocoderOptions],
        destinationFound: destinationFoundCallback, // Don't move the camera after a successful geocode
      });
      geocoderViewModel._searchText = "some_text";
      return GeocoderViewModel._updateSearchSuggestions(geocoderViewModel).then(
        function () {
          expect(geocoderViewModel._selectedSuggestion).toEqual(undefined);
          geocoderViewModel._handleArrowDown(geocoderViewModel);
          expect(geocoderViewModel._selectedSuggestion.displayName).toEqual(
            "a"
          );
          geocoderViewModel._handleArrowDown(geocoderViewModel);
          geocoderViewModel._handleArrowDown(geocoderViewModel);
          expect(geocoderViewModel._selectedSuggestion.displayName).toEqual(
            "c"
          );
          geocoderViewModel._handleArrowDown(geocoderViewModel);
          expect(geocoderViewModel._selectedSuggestion.displayName).toEqual(
            "a"
          );
          geocoderViewModel._handleArrowDown(geocoderViewModel);
          geocoderViewModel._handleArrowUp(geocoderViewModel);
          expect(geocoderViewModel._selectedSuggestion.displayName).toEqual(
            "a"
          );
          geocoderViewModel._handleArrowUp(geocoderViewModel);
          expect(geocoderViewModel._selectedSuggestion).toBeUndefined();
          expect(destinationFoundCallback).not.toHaveBeenCalled();
        }
      );
    });

    it("updates credits based on returned results", async function () {
      const geocoderResults = [
        {
          displayName: "a",
          destination: mockDestination,
          attributions: [
            {
              html: "attribution",
            },
          ],
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
      const geocoderOptions = {
        autoComplete: true,
        geocode: function (input) {
          return Promise.resolve(geocoderResults);
        },
        credit: new Credit("custom credit", false),
      };

      const destinationFoundCallback = jasmine.createSpy();
      geocoderViewModel = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [geocoderOptions],
        destinationFound: destinationFoundCallback, // Don't move the camera after a successful geocode
      });
      geocoderViewModel._searchText = "sthsnth"; // an empty query will prevent geocoding

      await geocoderViewModel.search();

      scene.frameState.creditDisplay.beginFrame();
      scene.frameState.creditDisplay.endFrame();

      const credits = scene.frameState.creditDisplay._staticCredits;
      expect(credits.length).toBe(2); // first credit will be default ion credit
      expect(credits[1]).toBeInstanceOf(Credit);
      expect(credits[1].html).toEqual("attribution");
      expect(credits[1].showOnScreen).toBeFalse();
      expect(destinationFoundCallback).toHaveBeenCalled();
    });

    it("uses default geocoder service credit if not present in results", async function () {
      const geocoderOptions = {
        autoComplete: true,
        geocode: function (input) {
          return Promise.resolve(geocoderResults1);
        },
        credit: new Credit("custom credit", false),
      };

      const destinationFoundCallback = jasmine.createSpy();
      geocoderViewModel = new GeocoderViewModel({
        scene: scene,
        geocoderServices: [geocoderOptions],
        destinationFound: destinationFoundCallback, // Don't move the camera after a successful geocode
      });
      geocoderViewModel._searchText = "sthsnth"; // an empty query will prevent geocoding

      await geocoderViewModel.search();

      scene.frameState.creditDisplay.beginFrame();
      scene.frameState.creditDisplay.endFrame();

      const credits = scene.frameState.creditDisplay._staticCredits;
      expect(credits.length).toBe(2); // first credit will be default ion credit
      expect(credits[1]).toBeInstanceOf(Credit);
      expect(credits[1].html).toEqual("custom credit");
      expect(credits[1].showOnScreen).toBeFalse();
      expect(destinationFoundCallback).toHaveBeenCalled();
    });
  },
  "WebGL"
);
