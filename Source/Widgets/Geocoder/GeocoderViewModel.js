import CartographicGeocoderService from "../../Core/CartographicGeocoderService.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Event from "../../Core/Event.js";
import GeocodeType from "../../Core/GeocodeType.js";
import IonGeocoderService from "../../Core/IonGeocoderService.js";
import CesiumMath from "../../Core/Math.js";
import Matrix4 from "../../Core/Matrix4.js";
import Rectangle from "../../Core/Rectangle.js";
import sampleTerrainMostDetailed from "../../Core/sampleTerrainMostDetailed.js";
import computeFlyToLocationForRectangle from "../../Scene/computeFlyToLocationForRectangle.js";
import knockout from "../../ThirdParty/knockout.js";
import when from "../../ThirdParty/when.js";
import createCommand from "../createCommand.js";
import getElement from "../getElement.js";

// The height we use if geocoding to a specific point instead of an rectangle.
const DEFAULT_HEIGHT = 1000;

/**
 * The view model for the {@link Geocoder} widget.
 * @alias GeocoderViewModel
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Scene} options.scene The Scene instance to use.
 * @param {GeocoderService[]} [options.geocoderServices] Geocoder services to use for geocoding queries.
 *        If more than one are supplied, suggestions will be gathered for the geocoders that support it,
 *        and if no suggestion is selected the result from the first geocoder service wil be used.
 * @param {Number} [options.flightDuration] The duration of the camera flight to an entered location, in seconds.
 * @param {Geocoder.DestinationFoundFunction} [options.destinationFound=GeocoderViewModel.flyToDestination] A callback function that is called after a successful geocode.  If not supplied, the default behavior is to fly the camera to the result destination.
 */
function GeocoderViewModel(options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(options) || !defined(options.scene)) {
    throw new DeveloperError("options.scene is required.");
  }
  //>>includeEnd('debug');

  if (defined(options.geocoderServices)) {
    this._geocoderServices = options.geocoderServices;
  } else {
    this._geocoderServices = [
      new CartographicGeocoderService(),
      new IonGeocoderService({ scene: options.scene }),
    ];
  }

  this._viewContainer = options.container;
  this._scene = options.scene;
  this._flightDuration = options.flightDuration;
  this._searchText = "";
  this._isSearchInProgress = false;
  this._geocodePromise = undefined;
  this._complete = new Event();
  this._suggestions = [];
  this._selectedSuggestion = undefined;
  this._showSuggestions = true;

  this._handleArrowDown = handleArrowDown;
  this._handleArrowUp = handleArrowUp;

  const that = this;

  this._suggestionsVisible = knockout.pureComputed(function () {
    const suggestions = knockout.getObservable(that, "_suggestions");
    const suggestionsNotEmpty = suggestions().length > 0;
    const showSuggestions = knockout.getObservable(that, "_showSuggestions")();
    return suggestionsNotEmpty && showSuggestions;
  });

  this._searchCommand = createCommand(function (geocodeType) {
    geocodeType = defaultValue(geocodeType, GeocodeType.SEARCH);
    that._focusTextbox = false;
    if (defined(that._selectedSuggestion)) {
      that.activateSuggestion(that._selectedSuggestion);
      return false;
    }
    that.hideSuggestions();
    if (that.isSearchInProgress) {
      cancelGeocode(that);
    } else {
      geocode(that, that._geocoderServices, geocodeType);
    }
  });

  this.deselectSuggestion = function () {
    that._selectedSuggestion = undefined;
  };

  this.handleKeyDown = function (data, event) {
    const downKey =
      event.key === "ArrowDown" || event.key === "Down" || event.keyCode === 40;
    const upKey =
      event.key === "ArrowUp" || event.key === "Up" || event.keyCode === 38;
    if (downKey || upKey) {
      event.preventDefault();
    }

    return true;
  };

  this.handleKeyUp = function (data, event) {
    const downKey =
      event.key === "ArrowDown" || event.key === "Down" || event.keyCode === 40;
    const upKey =
      event.key === "ArrowUp" || event.key === "Up" || event.keyCode === 38;
    const enterKey = event.key === "Enter" || event.keyCode === 13;
    if (upKey) {
      handleArrowUp(that);
    } else if (downKey) {
      handleArrowDown(that);
    } else if (enterKey) {
      that._searchCommand();
    }
    return true;
  };

  this.activateSuggestion = function (data) {
    that.hideSuggestions();
    that._searchText = data.displayName;
    const destination = data.destination;
    clearSuggestions(that);
    that.destinationFound(that, destination);
  };

  this.hideSuggestions = function () {
    that._showSuggestions = false;
    that._selectedSuggestion = undefined;
  };

  this.showSuggestions = function () {
    that._showSuggestions = true;
  };

  this.handleMouseover = function (data, event) {
    if (data !== that._selectedSuggestion) {
      that._selectedSuggestion = data;
    }
  };

  /**
   * Gets or sets a value indicating if this instance should always show its text input field.
   *
   * @type {Boolean}
   * @default false
   */
  this.keepExpanded = false;

  /**
   * True if the geocoder should query as the user types to autocomplete
   * @type {Boolean}
   * @default true
   */
  this.autoComplete = defaultValue(options.autocomplete, true);

  /**
   * Gets and sets the command called when a geocode destination is found
   * @type {Geocoder.DestinationFoundFunction}
   */
  this.destinationFound = defaultValue(
    options.destinationFound,
    GeocoderViewModel.flyToDestination
  );

  this._focusTextbox = false;

  knockout.track(this, [
    "_searchText",
    "_isSearchInProgress",
    "keepExpanded",
    "_suggestions",
    "_selectedSuggestion",
    "_showSuggestions",
    "_focusTextbox",
  ]);

  const searchTextObservable = knockout.getObservable(this, "_searchText");
  searchTextObservable.extend({ rateLimit: { timeout: 500 } });
  this._suggestionSubscription = searchTextObservable.subscribe(function () {
    GeocoderViewModel._updateSearchSuggestions(that);
  });
  /**
   * Gets a value indicating whether a search is currently in progress.  This property is observable.
   *
   * @type {Boolean}
   */
  this.isSearchInProgress = undefined;
  knockout.defineProperty(this, "isSearchInProgress", {
    get: function () {
      return this._isSearchInProgress;
    },
  });

  /**
   * Gets or sets the text to search for.  The text can be an address, or longitude, latitude,
   * and optional height, where longitude and latitude are in degrees and height is in meters.
   *
   * @type {String}
   */
  this.searchText = undefined;
  knockout.defineProperty(this, "searchText", {
    get: function () {
      if (this.isSearchInProgress) {
        return "Searching...";
      }

      return this._searchText;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (typeof value !== "string") {
        throw new DeveloperError("value must be a valid string.");
      }
      //>>includeEnd('debug');
      this._searchText = value;
    },
  });

  /**
   * Gets or sets the the duration of the camera flight in seconds.
   * A value of zero causes the camera to instantly switch to the geocoding location.
   * The duration will be computed based on the distance when undefined.
   *
   * @type {Number|undefined}
   * @default undefined
   */
  this.flightDuration = undefined;
  knockout.defineProperty(this, "flightDuration", {
    get: function () {
      return this._flightDuration;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value) && value < 0) {
        throw new DeveloperError("value must be positive.");
      }
      //>>includeEnd('debug');

      this._flightDuration = value;
    },
  });
}

Object.defineProperties(GeocoderViewModel.prototype, {
  /**
   * Gets the event triggered on flight completion.
   * @memberof GeocoderViewModel.prototype
   *
   * @type {Event}
   */
  complete: {
    get: function () {
      return this._complete;
    },
  },

  /**
   * Gets the scene to control.
   * @memberof GeocoderViewModel.prototype
   *
   * @type {Scene}
   */
  scene: {
    get: function () {
      return this._scene;
    },
  },

  /**
   * Gets the Command that is executed when the button is clicked.
   * @memberof GeocoderViewModel.prototype
   *
   * @type {Command}
   */
  search: {
    get: function () {
      return this._searchCommand;
    },
  },

  /**
   * Gets the currently selected geocoder search suggestion
   * @memberof GeocoderViewModel.prototype
   *
   * @type {Object}
   */
  selectedSuggestion: {
    get: function () {
      return this._selectedSuggestion;
    },
  },

  /**
   * Gets the list of geocoder search suggestions
   * @memberof GeocoderViewModel.prototype
   *
   * @type {Object[]}
   */
  suggestions: {
    get: function () {
      return this._suggestions;
    },
  },
});

/**
 * Destroys the widget.  Should be called if permanently
 * removing the widget from layout.
 */
GeocoderViewModel.prototype.destroy = function () {
  this._suggestionSubscription.dispose();
};

function handleArrowUp(viewModel) {
  if (viewModel._suggestions.length === 0) {
    return;
  }
  const currentIndex = viewModel._suggestions.indexOf(
    viewModel._selectedSuggestion
  );
  if (currentIndex === -1 || currentIndex === 0) {
    viewModel._selectedSuggestion = undefined;
    return;
  }
  const next = currentIndex - 1;
  viewModel._selectedSuggestion = viewModel._suggestions[next];
  GeocoderViewModel._adjustSuggestionsScroll(viewModel, next);
}

function handleArrowDown(viewModel) {
  if (viewModel._suggestions.length === 0) {
    return;
  }
  const numberOfSuggestions = viewModel._suggestions.length;
  const currentIndex = viewModel._suggestions.indexOf(
    viewModel._selectedSuggestion
  );
  const next = (currentIndex + 1) % numberOfSuggestions;
  viewModel._selectedSuggestion = viewModel._suggestions[next];

  GeocoderViewModel._adjustSuggestionsScroll(viewModel, next);
}

function computeFlyToLocationForCartographic(cartographic, terrainProvider) {
  const availability = defined(terrainProvider)
    ? terrainProvider.availability
    : undefined;

  if (!defined(availability)) {
    cartographic.height += DEFAULT_HEIGHT;
    return when.resolve(cartographic);
  }

  return sampleTerrainMostDetailed(terrainProvider, [cartographic]).then(
    function (positionOnTerrain) {
      cartographic = positionOnTerrain[0];
      cartographic.height += DEFAULT_HEIGHT;
      return cartographic;
    }
  );
}

function flyToDestination(viewModel, destination) {
  const scene = viewModel._scene;
  const mapProjection = scene.mapProjection;
  const ellipsoid = mapProjection.ellipsoid;

  const camera = scene.camera;
  const terrainProvider = scene.terrainProvider;
  let finalDestination = destination;

  let promise;
  if (destination instanceof Rectangle) {
    // Some geocoders return a Rectangle of zero width/height, treat it like a point instead.
    if (
      CesiumMath.equalsEpsilon(
        destination.south,
        destination.north,
        CesiumMath.EPSILON7
      ) &&
      CesiumMath.equalsEpsilon(
        destination.east,
        destination.west,
        CesiumMath.EPSILON7
      )
    ) {
      // destination is now a Cartographic
      destination = Rectangle.center(destination);
    } else {
      promise = computeFlyToLocationForRectangle(destination, scene);
    }
  } else {
    // destination is a Cartesian3
    destination = ellipsoid.cartesianToCartographic(destination);
  }

  if (!defined(promise)) {
    promise = computeFlyToLocationForCartographic(destination, terrainProvider);
  }

  promise
    .then(function (result) {
      finalDestination = ellipsoid.cartographicToCartesian(result);
    })
    .always(function () {
      // Whether terrain querying succeeded or not, fly to the destination.
      camera.flyTo({
        destination: finalDestination,
        complete: function () {
          viewModel._complete.raiseEvent();
        },
        duration: viewModel._flightDuration,
        endTransform: Matrix4.IDENTITY,
      });
    });
}

function chainPromise(promise, geocoderService, query, geocodeType) {
  return promise.then(function (result) {
    if (
      defined(result) &&
      result.state === "fulfilled" &&
      result.value.length > 0
    ) {
      return result;
    }
    const nextPromise = geocoderService
      .geocode(query, geocodeType)
      .then(function (result) {
        return { state: "fulfilled", value: result };
      })
      .otherwise(function (err) {
        return { state: "rejected", reason: err };
      });

    return nextPromise;
  });
}

function geocode(viewModel, geocoderServices, geocodeType) {
  const query = viewModel._searchText;

  if (hasOnlyWhitespace(query)) {
    viewModel.showSuggestions();
    return;
  }

  viewModel._isSearchInProgress = true;

  let promise = when.resolve();
  for (let i = 0; i < geocoderServices.length; i++) {
    promise = chainPromise(promise, geocoderServices[i], query, geocodeType);
  }

  viewModel._geocodePromise = promise;
  promise.then(function (result) {
    if (promise.cancel) {
      return;
    }
    viewModel._isSearchInProgress = false;

    const geocoderResults = result.value;
    if (
      result.state === "fulfilled" &&
      defined(geocoderResults) &&
      geocoderResults.length > 0
    ) {
      viewModel._searchText = geocoderResults[0].displayName;
      viewModel.destinationFound(viewModel, geocoderResults[0].destination);
      return;
    }
    viewModel._searchText = `${query} (not found)`;
  });
}

function adjustSuggestionsScroll(viewModel, focusedItemIndex) {
  const container = getElement(viewModel._viewContainer);
  const searchResults = container.getElementsByClassName("search-results")[0];
  const listItems = container.getElementsByTagName("li");
  const element = listItems[focusedItemIndex];

  if (focusedItemIndex === 0) {
    searchResults.scrollTop = 0;
    return;
  }

  const offsetTop = element.offsetTop;
  if (offsetTop + element.clientHeight > searchResults.clientHeight) {
    searchResults.scrollTop = offsetTop + element.clientHeight;
  } else if (offsetTop < searchResults.scrollTop) {
    searchResults.scrollTop = offsetTop;
  }
}

function cancelGeocode(viewModel) {
  viewModel._isSearchInProgress = false;
  if (defined(viewModel._geocodePromise)) {
    viewModel._geocodePromise.cancel = true;
    viewModel._geocodePromise = undefined;
  }
}

function hasOnlyWhitespace(string) {
  return /^\s*$/.test(string);
}

function clearSuggestions(viewModel) {
  knockout.getObservable(viewModel, "_suggestions").removeAll();
}

function updateSearchSuggestions(viewModel) {
  if (!viewModel.autoComplete) {
    return;
  }

  const query = viewModel._searchText;

  clearSuggestions(viewModel);
  if (hasOnlyWhitespace(query)) {
    return;
  }

  let promise = when.resolve([]);
  viewModel._geocoderServices.forEach(function (service) {
    promise = promise.then(function (results) {
      if (results.length >= 5) {
        return results;
      }
      return service
        .geocode(query, GeocodeType.AUTOCOMPLETE)
        .then(function (newResults) {
          results = results.concat(newResults);
          return results;
        });
    });
  });
  promise.then(function (results) {
    const suggestions = viewModel._suggestions;
    for (let i = 0; i < results.length; i++) {
      suggestions.push(results[i]);
    }
  });
}

/**
 * A function to fly to the destination found by a successful geocode.
 * @type {Geocoder.DestinationFoundFunction}
 */
GeocoderViewModel.flyToDestination = flyToDestination;

//exposed for testing
GeocoderViewModel._updateSearchSuggestions = updateSearchSuggestions;
GeocoderViewModel._adjustSuggestionsScroll = adjustSuggestionsScroll;
export default GeocoderViewModel;
