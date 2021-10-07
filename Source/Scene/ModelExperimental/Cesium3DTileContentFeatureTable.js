import BatchTexture from "../BatchTexture.js";
import Cesium3DTileFeature from "../Cesium3DTileFeature.js";
import Check from "../../Core/Check.js";
import Color from "../../Core/Color.js";
import defaultValue from "../.././Core/defaultValue.js";
import defined from "../.././Core/defined.js";
import DerivedCommandUtility from "./DerivedCommandUtility.js";
import destroyObject from "../../Core/destroyObject.js";
import DrawCommand from "../../Renderer/DrawCommand.js";
import Pass from "../../Renderer/Pass.js";
import StyleCommandsNeeded from "./StyleCommandsNeeded.js";

/**
 * Manages the {@link Cesium3DTileFeature}s that belong to a {@link Cesium3DTileContent}.
 * The properties for a feature are extracted from a {@link FeatureTable}.
 *
 * @param {Object} options An object containing the following options:
 * @param {Cesium3DTileContent} options.content The tile content the features in this table belong to.
 * @param {FeatureTable} options.featureTable The feature table from the model belonging to the content.
 *
 * @alias Cesium3DTileContentFeatureTable
 * @constructor
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function Cesium3DTileContentFeatureTable(options) {
  var content = options.content;
  var featureTable = options.featureTable;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.content", content);
  Check.typeOf.object("options.featureTable", featureTable);
  //>>includeEnd('debug');

  this._content = content;
  this._featureTable = featureTable;

  this._featuresLength = 0;
  this._features = undefined;

  this._batchTexture = undefined;

  initialize(this);
}

Object.defineProperties(Cesium3DTileContentFeatureTable.prototype, {
  /**
   * The batch texture generated for the features in this table.
   *
   * @memberof Cesium3DTileContentFeatureTable.prototype
   * @type {BatchTexture}
   * @readonly
   * @private
   */
  batchTexture: {
    get: function () {
      return this._batchTexture;
    },
  },
  /**
   * The number of features in this table.
   *
   * @memberof Cesium3DTileContentFeatureTable.prototype
   * @type {Number}
   * @readonly
   * @private
   */
  featuresLength: {
    get: function () {
      return this._featuresLength;
    },
  },
  memorySizeInBytes: {
    get: function () {
      return this._batchTexture.memorySizeInBytes;
    },
  },
});

function initialize(contentFeatureTable) {
  var featuresLength = contentFeatureTable._featureTable.count;
  if (featuresLength === 0) {
    return;
  }

  var content = contentFeatureTable._content;

  var features = new Array(featuresLength);
  for (var i = 0; i < featuresLength; i++) {
    features[i] = new Cesium3DTileFeature(content, i);
  }

  contentFeatureTable._featuresLength = featuresLength;
  contentFeatureTable._features = features;

  contentFeatureTable._batchTexture = new BatchTexture({
    featuresLength: featuresLength,
    owner: content,
    statistics: content.tileset.statistics,
  });
}

Cesium3DTileContentFeatureTable.prototype.getFeature = function (featureId) {
  return this._features[featureId];
};

Cesium3DTileContentFeatureTable.prototype.hasProperty = function (
  featureId,
  propertyName
) {
  return this._featureTable.hasProperty(featureId, propertyName);
};

Cesium3DTileContentFeatureTable.prototype.getProperty = function (
  featureId,
  name
) {
  return this._featureTable.getProperty(featureId, name);
};

Cesium3DTileContentFeatureTable.prototype.getPropertyInherited = function (
  featureId,
  name
) {
  return this._featureTable.getProperty(featureId, name);
};

Cesium3DTileContentFeatureTable.prototype.getPropertyNames = function (
  results
) {
  return this._featureTable.getPropertyIds(results);
};

Cesium3DTileContentFeatureTable.prototype.setProperty = function (
  featureId,
  name,
  value
) {
  return this._featureTable.setProperty(featureId, name, value);
};

Cesium3DTileContentFeatureTable.prototype.update = function (
  tileset,
  frameState
) {
  this._batchTexture.update(tileset, frameState);
};

Cesium3DTileContentFeatureTable.prototype.getPickColor = function (featureId) {
  return this._batchTexture.getPickColor(featureId);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <p>
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * </p>
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see Cesium3DTileContentFeatureTable#destroy
 * @private
 */
Cesium3DTileContentFeatureTable.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <p>
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 * </p>
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * e = e && e.destroy();
 *
 * @see Cesium3DTileContentFeatureTable#isDestroyed
 * @private
 */
Cesium3DTileContentFeatureTable.prototype.destroy = function (frameState) {
  this._batchTexture.destroy();
  destroyObject(this);
};

Cesium3DTileContentFeatureTable.prototype.setShow = function (featureId, show) {
  this._batchTexture.setShow(featureId, show);
};

Cesium3DTileContentFeatureTable.prototype.setAllShow = function (show) {
  this._batchTexture.setAllShow(show);
};

Cesium3DTileContentFeatureTable.prototype.getShow = function (featureId) {
  return this._batchTexture.getShow(featureId);
};

Cesium3DTileContentFeatureTable.prototype.setColor = function (
  featureId,
  color
) {
  this._batchTexture.setColor(featureId, color);
};

Cesium3DTileContentFeatureTable.prototype.setAllColor = function (color) {
  this._batchTexture.setAllColor(color);
};

Cesium3DTileContentFeatureTable.prototype.getColor = function (
  featureId,
  result
) {
  return this._batchTexture.getColor(featureId, result);
};

var scratchColor = new Color();
Cesium3DTileContentFeatureTable.prototype.applyStyle = function (style) {
  var model = this._content.model;

  if (!defined(style)) {
    model.hasStyle = false;
    this.setAllColor(BatchTexture.DEFAULT_COLOR_VALUE);
    this.setAllShow(BatchTexture.DEFAULT_SHOW_VALUE);
    return;
  }

  model.hasStyle = true;
  for (var i = 0; i < this._featuresLength; i++) {
    var feature = this.getFeature(i);
    var color = defined(style.color)
      ? defaultValue(
          style.color.evaluateColor(feature, scratchColor),
          BatchTexture.DEFAULT_COLOR_VALUE
        )
      : BatchTexture.DEFAULT_COLOR_VALUE;
    var show = defined(style.show)
      ? defaultValue(
          style.show.evaluate(feature),
          BatchTexture.DEFAULT_SHOW_VALUE
        )
      : BatchTexture.DEFAULT_SHOW_VALUE;
    this.setColor(i, color);
    this.setShow(i, show);
  }
};

Cesium3DTileContentFeatureTable.prototype.addDerivedCommands = function (
  frameState,
  commandStartIndex
) {
  var commandList = frameState.commandList;
  var commandsLength = commandList.length;

  var tile = this._content.tile;
  var tileset = this._content.tileset;

  var bivariateVisibilityTest =
    tileset._skipLevelOfDetail &&
    tileset._hasMixedContent &&
    frameState.context.stencilBuffer;
  var finalResolution = tile._finalResolution;

  var styleCommandsNeeded = DerivedCommandUtility.getStyleCommandsNeeded(
    this._batchTexture
  );

  for (var i = commandStartIndex; i < commandsLength; i++) {
    var command = commandList[i];
    var tilesetDerivedCommands = command.derivedCommands.tileset;

    if (!defined(tilesetDerivedCommands) || command.dirty) {
      // Create a new derived commands object for the tileset.
      tilesetDerivedCommands = {};
      // Retain a reference to the original reference.
      tilesetDerivedCommands.original = DrawCommand.shallowClone(command);
      command.derivedCommands.tileset = tilesetDerivedCommands;
      // Mark the command as dirty.
      command.dirty = true;
    }

    var originalCommand = tilesetDerivedCommands.original;

    // Derive the translucent command, if needed.
    if (
      styleCommandsNeeded !== StyleCommandsNeeded.ALL_OPAQUE &&
      command.pass !== Pass.TRANSLUCENT &&
      !defined(tilesetDerivedCommands.translucent)
    ) {
      tilesetDerivedCommands.translucent = DerivedCommandUtility.deriveTranslucentCommand(
        originalCommand
      );
    }

    if (
      styleCommandsNeeded !== StyleCommandsNeeded.ALL_TRANSLUCENT &&
      command.pass !== Pass.TRANSLUCENT
    ) {
      // Derive the opaque command, if needed.
      if (!defined(tilesetDerivedCommands.opaque)) {
        tilesetDerivedCommands.opaque = DerivedCommandUtility.deriveOpaqueCommand(
          originalCommand
        );
      }

      if (bivariateVisibilityTest) {
        if (!finalResolution) {
          if (!defined(tilesetDerivedCommands.zback)) {
            tilesetDerivedCommands.zback = DerivedCommandUtility.deriveZBackfaceCommand(
              frameState.context,
              originalCommand
            );
          }
          tileset._backfaceCommands.push(tilesetDerivedCommands.zback);
        }

        if (
          !defined(tilesetDerivedCommands.stencil) ||
          tile._selectionDepth !==
            DerivedCommandUtility.getLastSelectionDepth(
              tilesetDerivedCommands.stencil
            )
        ) {
          if (command.renderState.depthMask) {
            tilesetDerivedCommands.stencil = DerivedCommandUtility.deriveStencilCommand(
              originalCommand,
              tile._selectionDepth
            );
          } else {
            tilesetDerivedCommands.stencil = tilesetDerivedCommands.opaque;
          }
        }
      }
    }

    var opaqueCommand = bivariateVisibilityTest
      ? tilesetDerivedCommands.stencil
      : tilesetDerivedCommands.opaque;
    var translucentCommand = tilesetDerivedCommands.translucent;

    // If the command was originally opaque:
    //    * If the styling applied to the tile is all opaque, use the opaque command
    //      (with one additional uniform needed for the shader).
    //    * If the styling is all translucent, use new (cached) derived commands (front
    //      and back faces) with a translucent render state.
    //    * If the styling causes both opaque and translucent features in this tile,
    //      then use both sets of commands.
    if (command.pass !== Pass.TRANSLUCENT) {
      if (styleCommandsNeeded === StyleCommandsNeeded.ALL_OPAQUE) {
        commandList[i] = opaqueCommand;
      }
      if (styleCommandsNeeded === StyleCommandsNeeded.ALL_TRANSLUCENT) {
        commandList[i] = translucentCommand;
      }
      if (styleCommandsNeeded === StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT) {
        // PERFORMANCE_IDEA: if the tile has multiple commands, we do not know what features are in what
        // commands so this case may be overkill.
        commandList[i] = opaqueCommand;
        commandList.push(translucentCommand);
      }
    } else {
      // Command was originally translucent so no need to derive new commands;
      // as of now, a style can't change an originally translucent feature to
      // opaque since the style's alpha is modulated, not a replacement.  When
      // this changes, we need to derive new opaque commands here.
      commandList[i] = originalCommand;
    }
  }
};
