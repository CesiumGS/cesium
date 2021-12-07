import Cartesian3 from "../../Core/Cartesian3.js";
import defined from "../../Core/defined.js";
import destroyObject from "../../Core/destroyObject.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Ray from "../../Core/Ray.js";
import Rectangle from "../../Core/Rectangle.js";
import ScreenSpaceEventHandler from "../../Core/ScreenSpaceEventHandler.js";
import ScreenSpaceEventType from "../../Core/ScreenSpaceEventType.js";
import DebugModelMatrixPrimitive from "../../Scene/DebugModelMatrixPrimitive.js";
import PerformanceDisplay from "../../Scene/PerformanceDisplay.js";
import TileCoordinatesImageryProvider from "../../Scene/TileCoordinatesImageryProvider.js";
import knockout from "../../ThirdParty/knockout.js";
import createCommand from "../createCommand.js";

function frustumStatisticsToString(statistics) {
  var str;
  if (defined(statistics)) {
    str = "Command Statistics";
    var com = statistics.commandsInFrustums;
    for (var n in com) {
      if (com.hasOwnProperty(n)) {
        var num = parseInt(n, 10);
        var s;
        if (num === 7) {
          s = "1, 2 and 3";
        } else {
          var f = [];
          for (var i = 2; i >= 0; i--) {
            var p = Math.pow(2, i);
            if (num >= p) {
              f.push(i + 1);
              num -= p;
            }
          }
          s = f.reverse().join(" and ");
        }
        str += "<br>&nbsp;&nbsp;&nbsp;&nbsp;" + com[n] + " in frustum " + s;
      }
    }
    str += "<br>Total: " + statistics.totalCommands;
  }

  return str;
}

function boundDepthFrustum(lower, upper, proposed) {
  var bounded = Math.min(proposed, upper);
  bounded = Math.max(bounded, lower);
  return bounded;
}

var scratchPickRay = new Ray();
var scratchPickCartesian = new Cartesian3();

/**
 * The view model for {@link CesiumInspector}.
 * @alias CesiumInspectorViewModel
 * @constructor
 *
 * @param {Scene} scene The scene instance to use.
 * @param {Element} performanceContainer The instance to use for performance container.
 */
function CesiumInspectorViewModel(scene, performanceContainer) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(scene)) {
    throw new DeveloperError("scene is required");
  }

  if (!defined(performanceContainer)) {
    throw new DeveloperError("performanceContainer is required");
  }
  //>>includeEnd('debug');

  var that = this;
  var canvas = scene.canvas;
  var eventHandler = new ScreenSpaceEventHandler(canvas);
  this._eventHandler = eventHandler;
  this._scene = scene;
  this._canvas = canvas;
  this._primitive = undefined;
  this._tile = undefined;
  this._modelMatrixPrimitive = undefined;
  this._performanceDisplay = undefined;
  this._performanceContainer = performanceContainer;

  var globe = this._scene.globe;
  globe.depthTestAgainstTerrain = true;

  /**
   * Gets or sets the show frustums state.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.frustums = false;

  /**
   * Gets or sets the show frustum planes state.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.frustumPlanes = false;

  /**
   * Gets or sets the show performance display state.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.performance = false;

  /**
   * Gets or sets the shader cache text.  This property is observable.
   * @type {String}
   * @default ''
   */
  this.shaderCacheText = "";

  /**
   * Gets or sets the show primitive bounding sphere state.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.primitiveBoundingSphere = false;

  /**
   * Gets or sets the show primitive reference frame state.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.primitiveReferenceFrame = false;

  /**
   * Gets or sets the filter primitive state.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.filterPrimitive = false;

  /**
   * Gets or sets the show tile bounding sphere state.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.tileBoundingSphere = false;

  /**
   * Gets or sets the filter tile state.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.filterTile = false;

  /**
   * Gets or sets the show wireframe state.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.wireframe = false;

  /**
   * Gets or sets the show globe depth state.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.globeDepth = false;

  /**
   * Gets or sets the show pick depth state.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.pickDepth = false;

  /**
   * Gets or sets the index of the depth frustum to display.  This property is observable.
   * @type {Number}
   * @default 1
   */
  this.depthFrustum = 1;
  this._numberOfFrustums = 1;

  /**
   * Gets or sets the suspend updates state.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.suspendUpdates = false;

  /**
   * Gets or sets the show tile coordinates state.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.tileCoordinates = false;

  /**
   * Gets or sets the frustum statistic text.  This property is observable.
   * @type {String}
   * @default ''
   */
  this.frustumStatisticText = false;

  /**
   * Gets or sets the selected tile information text.  This property is observable.
   * @type {String}
   * @default ''
   */
  this.tileText = "";

  /**
   * Gets if a primitive has been selected.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.hasPickedPrimitive = false;

  /**
   * Gets if a tile has been selected.  This property is observable
   * @type {Boolean}
   * @default false
   */
  this.hasPickedTile = false;

  /**
   * Gets if the picking primitive command is active.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.pickPrimitiveActive = false;

  /**
   * Gets if the picking tile command is active.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.pickTileActive = false;

  /**
   * Gets or sets if the cesium inspector drop down is visible.  This property is observable.
   * @type {Boolean}
   * @default true
   */
  this.dropDownVisible = true;

  /**
   * Gets or sets if the general section is visible.  This property is observable.
   * @type {Boolean}
   * @default true
   */
  this.generalVisible = true;

  /**
   * Gets or sets if the primitive section is visible.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.primitivesVisible = false;

  /**
   * Gets or sets if the terrain section is visible.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.terrainVisible = false;

  /**
   * Gets or sets the index of the depth frustum text.  This property is observable.
   * @type {String}
   * @default ''
   */
  this.depthFrustumText = "";

  knockout.track(this, [
    "frustums",
    "frustumPlanes",
    "performance",
    "shaderCacheText",
    "primitiveBoundingSphere",
    "primitiveReferenceFrame",
    "filterPrimitive",
    "tileBoundingSphere",
    "filterTile",
    "wireframe",
    "globeDepth",
    "pickDepth",
    "depthFrustum",
    "suspendUpdates",
    "tileCoordinates",
    "frustumStatisticText",
    "tileText",
    "hasPickedPrimitive",
    "hasPickedTile",
    "pickPrimitiveActive",
    "pickTileActive",
    "dropDownVisible",
    "generalVisible",
    "primitivesVisible",
    "terrainVisible",
    "depthFrustumText",
  ]);

  this._toggleDropDown = createCommand(function () {
    that.dropDownVisible = !that.dropDownVisible;
  });

  this._toggleGeneral = createCommand(function () {
    that.generalVisible = !that.generalVisible;
  });

  this._togglePrimitives = createCommand(function () {
    that.primitivesVisible = !that.primitivesVisible;
  });

  this._toggleTerrain = createCommand(function () {
    that.terrainVisible = !that.terrainVisible;
  });

  this._frustumsSubscription = knockout
    .getObservable(this, "frustums")
    .subscribe(function (val) {
      that._scene.debugShowFrustums = val;
      that._scene.requestRender();
    });

  this._frustumPlanesSubscription = knockout
    .getObservable(this, "frustumPlanes")
    .subscribe(function (val) {
      that._scene.debugShowFrustumPlanes = val;
      that._scene.requestRender();
    });

  this._performanceSubscription = knockout
    .getObservable(this, "performance")
    .subscribe(function (val) {
      if (val) {
        that._performanceDisplay = new PerformanceDisplay({
          container: that._performanceContainer,
        });
      } else {
        that._performanceContainer.innerHTML = "";
      }
    });

  this._showPrimitiveBoundingSphere = createCommand(function () {
    that._primitive.debugShowBoundingVolume = that.primitiveBoundingSphere;
    that._scene.requestRender();
    return true;
  });

  this._primitiveBoundingSphereSubscription = knockout
    .getObservable(this, "primitiveBoundingSphere")
    .subscribe(function () {
      that._showPrimitiveBoundingSphere();
    });

  this._showPrimitiveReferenceFrame = createCommand(function () {
    if (that.primitiveReferenceFrame) {
      var modelMatrix = that._primitive.modelMatrix;
      that._modelMatrixPrimitive = new DebugModelMatrixPrimitive({
        modelMatrix: modelMatrix,
      });
      that._scene.primitives.add(that._modelMatrixPrimitive);
    } else if (defined(that._modelMatrixPrimitive)) {
      that._scene.primitives.remove(that._modelMatrixPrimitive);
      that._modelMatrixPrimitive = undefined;
    }
    that._scene.requestRender();
    return true;
  });

  this._primitiveReferenceFrameSubscription = knockout
    .getObservable(this, "primitiveReferenceFrame")
    .subscribe(function () {
      that._showPrimitiveReferenceFrame();
    });

  this._doFilterPrimitive = createCommand(function () {
    if (that.filterPrimitive) {
      that._scene.debugCommandFilter = function (command) {
        if (
          defined(that._modelMatrixPrimitive) &&
          command.owner === that._modelMatrixPrimitive._primitive
        ) {
          return true;
        } else if (defined(that._primitive)) {
          return (
            command.owner === that._primitive ||
            command.owner === that._primitive._billboardCollection ||
            command.owner.primitive === that._primitive
          );
        }
        return false;
      };
    } else {
      that._scene.debugCommandFilter = undefined;
    }
    return true;
  });

  this._filterPrimitiveSubscription = knockout
    .getObservable(this, "filterPrimitive")
    .subscribe(function () {
      that._doFilterPrimitive();
      that._scene.requestRender();
    });

  this._wireframeSubscription = knockout
    .getObservable(this, "wireframe")
    .subscribe(function (val) {
      globe._surface.tileProvider._debug.wireframe = val;
      that._scene.requestRender();
    });

  this._depthFrustumSubscription = knockout
    .getObservable(this, "depthFrustum")
    .subscribe(function (val) {
      that._scene.debugShowDepthFrustum = val;
      that._scene.requestRender();
    });

  this._incrementDepthFrustum = createCommand(function () {
    var next = that.depthFrustum + 1;
    that.depthFrustum = boundDepthFrustum(1, that._numberOfFrustums, next);
    that._scene.requestRender();
    return true;
  });

  this._decrementDepthFrustum = createCommand(function () {
    var next = that.depthFrustum - 1;
    that.depthFrustum = boundDepthFrustum(1, that._numberOfFrustums, next);
    that._scene.requestRender();
    return true;
  });

  this._suspendUpdatesSubscription = knockout
    .getObservable(this, "suspendUpdates")
    .subscribe(function (val) {
      globe._surface._debug.suspendLodUpdate = val;
      if (!val) {
        that.filterTile = false;
      }
    });

  var tileBoundariesLayer;
  this._showTileCoordinates = createCommand(function () {
    if (that.tileCoordinates && !defined(tileBoundariesLayer)) {
      tileBoundariesLayer = scene.imageryLayers.addImageryProvider(
        new TileCoordinatesImageryProvider({
          tilingScheme: scene.terrainProvider.tilingScheme,
        })
      );
    } else if (!that.tileCoordinates && defined(tileBoundariesLayer)) {
      scene.imageryLayers.remove(tileBoundariesLayer);
      tileBoundariesLayer = undefined;
    }
    return true;
  });

  this._tileCoordinatesSubscription = knockout
    .getObservable(this, "tileCoordinates")
    .subscribe(function () {
      that._showTileCoordinates();
      that._scene.requestRender();
    });

  this._tileBoundingSphereSubscription = knockout
    .getObservable(this, "tileBoundingSphere")
    .subscribe(function () {
      that._showTileBoundingSphere();
      that._scene.requestRender();
    });

  this._showTileBoundingSphere = createCommand(function () {
    if (that.tileBoundingSphere) {
      globe._surface.tileProvider._debug.boundingSphereTile = that._tile;
    } else {
      globe._surface.tileProvider._debug.boundingSphereTile = undefined;
    }
    that._scene.requestRender();
    return true;
  });

  this._doFilterTile = createCommand(function () {
    if (!that.filterTile) {
      that.suspendUpdates = false;
    } else {
      that.suspendUpdates = true;

      globe._surface._tilesToRender = [];

      if (defined(that._tile) && that._tile.renderable) {
        globe._surface._tilesToRender.push(that._tile);
      }
    }
    return true;
  });

  this._filterTileSubscription = knockout
    .getObservable(this, "filterTile")
    .subscribe(function () {
      that.doFilterTile();
      that._scene.requestRender();
    });

  function pickPrimitive(e) {
    var newPick = that._scene.pick({
      x: e.position.x,
      y: e.position.y,
    });
    if (defined(newPick)) {
      that.primitive = defined(newPick.collection)
        ? newPick.collection
        : newPick.primitive;
    }

    that._scene.requestRender();
    that.pickPrimitiveActive = false;
  }

  this._pickPrimitive = createCommand(function () {
    that.pickPrimitiveActive = !that.pickPrimitiveActive;
  });

  this._pickPrimitiveActiveSubscription = knockout
    .getObservable(this, "pickPrimitiveActive")
    .subscribe(function (val) {
      if (val) {
        eventHandler.setInputAction(
          pickPrimitive,
          ScreenSpaceEventType.LEFT_CLICK
        );
      } else {
        eventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
      }
    });

  function selectTile(e) {
    var selectedTile;
    var ellipsoid = globe.ellipsoid;

    var ray = that._scene.camera.getPickRay(e.position, scratchPickRay);
    var cartesian = globe.pick(ray, that._scene, scratchPickCartesian);

    if (defined(cartesian)) {
      var cartographic = ellipsoid.cartesianToCartographic(cartesian);
      var tilesRendered =
        globe._surface.tileProvider._tilesToRenderByTextureCount;
      for (
        var textureCount = 0;
        !selectedTile && textureCount < tilesRendered.length;
        ++textureCount
      ) {
        var tilesRenderedByTextureCount = tilesRendered[textureCount];
        if (!defined(tilesRenderedByTextureCount)) {
          continue;
        }

        for (
          var tileIndex = 0;
          !selectedTile && tileIndex < tilesRenderedByTextureCount.length;
          ++tileIndex
        ) {
          var tile = tilesRenderedByTextureCount[tileIndex];
          if (Rectangle.contains(tile.rectangle, cartographic)) {
            selectedTile = tile;
          }
        }
      }
    }

    that.tile = selectedTile;

    that.pickTileActive = false;
  }

  this._pickTile = createCommand(function () {
    that.pickTileActive = !that.pickTileActive;
  });

  this._pickTileActiveSubscription = knockout
    .getObservable(this, "pickTileActive")
    .subscribe(function (val) {
      if (val) {
        eventHandler.setInputAction(
          selectTile,
          ScreenSpaceEventType.LEFT_CLICK
        );
      } else {
        eventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
      }
    });

  this._removePostRenderEvent = scene.postRender.addEventListener(function () {
    that._update();
  });
}

Object.defineProperties(CesiumInspectorViewModel.prototype, {
  /**
   * Gets the scene to control.
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Scene}
   */
  scene: {
    get: function () {
      return this._scene;
    },
  },

  /**
   * Gets the container of the PerformanceDisplay
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Element}
   */
  performanceContainer: {
    get: function () {
      return this._performanceContainer;
    },
  },

  /**
   * Gets the command to toggle the visibility of the drop down.
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  toggleDropDown: {
    get: function () {
      return this._toggleDropDown;
    },
  },

  /**
   * Gets the command to toggle the visibility of a BoundingSphere for a primitive
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  showPrimitiveBoundingSphere: {
    get: function () {
      return this._showPrimitiveBoundingSphere;
    },
  },

  /**
   * Gets the command to toggle the visibility of a {@link DebugModelMatrixPrimitive} for the model matrix of a primitive
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  showPrimitiveReferenceFrame: {
    get: function () {
      return this._showPrimitiveReferenceFrame;
    },
  },

  /**
   * Gets the command to toggle a filter that renders only a selected primitive
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  doFilterPrimitive: {
    get: function () {
      return this._doFilterPrimitive;
    },
  },

  /**
   * Gets the command to increment the depth frustum index to be shown
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  incrementDepthFrustum: {
    get: function () {
      return this._incrementDepthFrustum;
    },
  },

  /**
   * Gets the command to decrement the depth frustum index to be shown
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  decrementDepthFrustum: {
    get: function () {
      return this._decrementDepthFrustum;
    },
  },

  /**
   * Gets the command to toggle the visibility of tile coordinates
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  showTileCoordinates: {
    get: function () {
      return this._showTileCoordinates;
    },
  },

  /**
   * Gets the command to toggle the visibility of a BoundingSphere for a selected tile
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  showTileBoundingSphere: {
    get: function () {
      return this._showTileBoundingSphere;
    },
  },

  /**
   * Gets the command to toggle a filter that renders only a selected tile
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  doFilterTile: {
    get: function () {
      return this._doFilterTile;
    },
  },

  /**
   * Gets the command to expand and collapse the general section
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  toggleGeneral: {
    get: function () {
      return this._toggleGeneral;
    },
  },

  /**
   * Gets the command to expand and collapse the primitives section
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  togglePrimitives: {
    get: function () {
      return this._togglePrimitives;
    },
  },

  /**
   * Gets the command to expand and collapse the terrain section
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  toggleTerrain: {
    get: function () {
      return this._toggleTerrain;
    },
  },

  /**
   * Gets the command to pick a primitive
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  pickPrimitive: {
    get: function () {
      return this._pickPrimitive;
    },
  },

  /**
   * Gets the command to pick a tile
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  pickTile: {
    get: function () {
      return this._pickTile;
    },
  },

  /**
   * Gets the command to pick a tile
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  selectParent: {
    get: function () {
      var that = this;
      return createCommand(function () {
        that.tile = that.tile.parent;
      });
    },
  },

  /**
   * Gets the command to pick a tile
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  selectNW: {
    get: function () {
      var that = this;
      return createCommand(function () {
        that.tile = that.tile.northwestChild;
      });
    },
  },

  /**
   * Gets the command to pick a tile
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  selectNE: {
    get: function () {
      var that = this;
      return createCommand(function () {
        that.tile = that.tile.northeastChild;
      });
    },
  },

  /**
   * Gets the command to pick a tile
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  selectSW: {
    get: function () {
      var that = this;
      return createCommand(function () {
        that.tile = that.tile.southwestChild;
      });
    },
  },

  /**
   * Gets the command to pick a tile
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  selectSE: {
    get: function () {
      var that = this;
      return createCommand(function () {
        that.tile = that.tile.southeastChild;
      });
    },
  },

  /**
   * Gets or sets the current selected primitive
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  primitive: {
    get: function () {
      return this._primitive;
    },
    set: function (newPrimitive) {
      var oldPrimitive = this._primitive;
      if (newPrimitive !== oldPrimitive) {
        this.hasPickedPrimitive = true;
        if (defined(oldPrimitive)) {
          oldPrimitive.debugShowBoundingVolume = false;
        }
        this._scene.debugCommandFilter = undefined;
        if (defined(this._modelMatrixPrimitive)) {
          this._scene.primitives.remove(this._modelMatrixPrimitive);
          this._modelMatrixPrimitive = undefined;
        }
        this._primitive = newPrimitive;
        newPrimitive.show = false;
        setTimeout(function () {
          newPrimitive.show = true;
        }, 50);
        this.showPrimitiveBoundingSphere();
        this.showPrimitiveReferenceFrame();
        this.doFilterPrimitive();
      }
    },
  },

  /**
   * Gets or sets the current selected tile
   * @memberof CesiumInspectorViewModel.prototype
   *
   * @type {Command}
   */
  tile: {
    get: function () {
      return this._tile;
    },
    set: function (newTile) {
      if (defined(newTile)) {
        this.hasPickedTile = true;
        var oldTile = this._tile;
        if (newTile !== oldTile) {
          this.tileText =
            "L: " + newTile.level + " X: " + newTile.x + " Y: " + newTile.y;
          this.tileText +=
            "<br>SW corner: " +
            newTile.rectangle.west +
            ", " +
            newTile.rectangle.south;
          this.tileText +=
            "<br>NE corner: " +
            newTile.rectangle.east +
            ", " +
            newTile.rectangle.north;
          var data = newTile.data;
          if (defined(data) && defined(data.tileBoundingRegion)) {
            this.tileText +=
              "<br>Min: " +
              data.tileBoundingRegion.minimumHeight +
              " Max: " +
              data.tileBoundingRegion.maximumHeight;
          } else {
            this.tileText += "<br>(Tile is not loaded)";
          }
        }
        this._tile = newTile;
        this.showTileBoundingSphere();
        this.doFilterTile();
      } else {
        this.hasPickedTile = false;
        this._tile = undefined;
      }
    },
  },
});

/**
 * Updates the view model
 * @private
 */
CesiumInspectorViewModel.prototype._update = function () {
  if (this.frustums) {
    this.frustumStatisticText = frustumStatisticsToString(
      this._scene.debugFrustumStatistics
    );
  }

  // Determine the number of frustums being used.
  var numberOfFrustums = this._scene.numberOfFrustums;
  this._numberOfFrustums = numberOfFrustums;
  // Bound the frustum to be displayed.
  this.depthFrustum = boundDepthFrustum(1, numberOfFrustums, this.depthFrustum);
  // Update the displayed text.
  this.depthFrustumText = this.depthFrustum + " of " + numberOfFrustums;

  if (this.performance) {
    this._performanceDisplay.update();
  }
  if (this.primitiveReferenceFrame) {
    this._modelMatrixPrimitive.modelMatrix = this._primitive.modelMatrix;
  }

  this.shaderCacheText =
    "Cached shaders: " + this._scene.context.shaderCache.numberOfShaders;
};

/**
 * @returns {Boolean} true if the object has been destroyed, false otherwise.
 */
CesiumInspectorViewModel.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the widget.  Should be called if permanently
 * removing the widget from layout.
 */
CesiumInspectorViewModel.prototype.destroy = function () {
  this._eventHandler.destroy();
  this._removePostRenderEvent();
  this._frustumsSubscription.dispose();
  this._frustumPlanesSubscription.dispose();
  this._performanceSubscription.dispose();
  this._primitiveBoundingSphereSubscription.dispose();
  this._primitiveReferenceFrameSubscription.dispose();
  this._filterPrimitiveSubscription.dispose();
  this._wireframeSubscription.dispose();
  this._globeDepthSubscription.dispose();
  this._pickDepthSubscription.dispose();
  this._depthFrustumSubscription.dispose();
  this._suspendUpdatesSubscription.dispose();
  this._tileCoordinatesSubscription.dispose();
  this._tileBoundingSphereSubscription.dispose();
  this._filterTileSubscription.dispose();
  this._pickPrimitiveActiveSubscription.dispose();
  this._pickTileActiveSubscription.dispose();
  return destroyObject(this);
};
export default CesiumInspectorViewModel;
