import Cartesian4 from "../Core/Cartesian4.js";
import CesiumMath from "../Core/Math.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import mergeSort from "../Core/mergeSort.js";
import PixelFormat from "../Core/PixelFormat.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";
import TextureMagnificationFilter from "../Renderer/TextureMagnificationFilter.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import TextureWrap from "../Renderer/TextureWrap.js";
import Material from "./Material.js";

var scratchColor = new Color();
var scratchColorAbove = new Color();
var scratchColorBelow = new Color();
var scratchColorBlend = new Color();
var scratchPackedFloat = new Cartesian4();
var scratchColorBytes = new Uint8Array(4);
var blankColor = new Color(0.0, 0.0, 0.0, 0.0);

function lerpEntryColor(height, entryBefore, entryAfter, result) {
  var lerpFactor =
    entryBefore.height === entryAfter.height
      ? 0.0
      : (height - entryBefore.height) /
        (entryAfter.height - entryBefore.height);
  return Color.lerp(entryBefore.color, entryAfter.color, lerpFactor, result);
}

function createNewEntry(height, color) {
  return {
    height: height,
    color: Color.clone(color),
  };
}

function removeDuplicates(entries) {
  // expects entries to be sorted from lowest to highest

  // Remove entries that have the same height as before and after
  entries = entries.filter(function (entry, index, array) {
    var hasPrev = index > 0;
    var hasNext = index < array.length - 1;

    var sameHeightAsPrev = hasPrev
      ? entry.height === array[index - 1].height
      : true;
    var sameHeightAsNext = hasNext
      ? entry.height === array[index + 1].height
      : true;

    var keep = !sameHeightAsPrev || !sameHeightAsNext;
    return keep;
  });

  // Remove entries that have the same color as before and after.
  // Also remove the entry if it has the same height AND color as
  // the entry before or the entry after.
  entries = entries.filter(function (entry, index, array) {
    var hasPrev = index > 0;
    var hasNext = index < array.length - 1;

    var sameColorAsPrev = hasPrev
      ? Color.equals(entry.color, array[index - 1].color)
      : false;
    var sameColorAsNext = hasNext
      ? Color.equals(entry.color, array[index + 1].color)
      : false;

    var sameHeightAsPrev = hasPrev
      ? entry.height === array[index - 1].height
      : true;
    var sameHeightAsNext = hasNext
      ? entry.height === array[index + 1].height
      : true;

    var keep = !(
      (sameColorAsPrev && sameColorAsNext) ||
      (sameColorAsPrev && sameHeightAsPrev) ||
      (sameColorAsNext && sameHeightAsNext)
    );
    return keep;
  });

  return entries;
}

function preprocess(layers) {
  var i, j;

  var layeredEntries = [];

  var layersLength = layers.length;
  for (i = 0; i < layersLength; i++) {
    var layer = layers[i];
    var entriesOrig = layer.entries;
    var entriesLength = entriesOrig.length;

    //>>includeStart('debug', pragmas.debug);
    if (!Array.isArray(entriesOrig) || entriesLength === 0) {
      throw new DeveloperError("entries must be an array with size > 0.");
    }
    //>>includeEnd('debug');

    var entries = [];

    for (j = 0; j < entriesLength; j++) {
      var entryOrig = entriesOrig[j];

      //>>includeStart('debug', pragmas.debug);
      if (!defined(entryOrig.height)) {
        throw new DeveloperError("entry requires a height.");
      }
      if (!defined(entryOrig.color)) {
        throw new DeveloperError("entry requires a color.");
      }
      //>>includeEnd('debug');

      var height = CesiumMath.clamp(
        entryOrig.height,
        createElevationBandMaterial._minimumHeight,
        createElevationBandMaterial._maximumHeight
      );

      // premultiplied alpha
      var color = Color.clone(entryOrig.color, scratchColor);
      color.red *= color.alpha;
      color.green *= color.alpha;
      color.blue *= color.alpha;

      entries.push(createNewEntry(height, color));
    }

    var sortedAscending = true;
    var sortedDescending = true;
    for (j = 0; j < entriesLength - 1; j++) {
      var currEntry = entries[j + 0];
      var nextEntry = entries[j + 1];

      sortedAscending = sortedAscending && currEntry.height <= nextEntry.height;
      sortedDescending =
        sortedDescending && currEntry.height >= nextEntry.height;
    }

    // When the array is fully descending, reverse it.
    if (sortedDescending) {
      entries = entries.reverse();
    } else if (!sortedAscending) {
      // Stable sort from lowest to greatest height.
      mergeSort(entries, function (a, b) {
        return CesiumMath.sign(a.height - b.height);
      });
    }

    var extendDownwards = defaultValue(layer.extendDownwards, false);
    var extendUpwards = defaultValue(layer.extendUpwards, false);

    // Interpret a single entry to extend all the way up and down.
    if (entries.length === 1 && !extendDownwards && !extendUpwards) {
      extendDownwards = true;
      extendUpwards = true;
    }

    if (extendDownwards) {
      entries.splice(
        0,
        0,
        createNewEntry(
          createElevationBandMaterial._minimumHeight,
          entries[0].color
        )
      );
    }
    if (extendUpwards) {
      entries.splice(
        entries.length,
        0,
        createNewEntry(
          createElevationBandMaterial._maximumHeight,
          entries[entries.length - 1].color
        )
      );
    }

    entries = removeDuplicates(entries);

    layeredEntries.push(entries);
  }

  return layeredEntries;
}

function createLayeredEntries(layers) {
  // clean up the input data and check for errors
  var layeredEntries = preprocess(layers);

  var entriesAccumNext = [];
  var entriesAccumCurr = [];
  var i;

  function addEntry(height, color) {
    entriesAccumNext.push(createNewEntry(height, color));
  }
  function addBlendEntry(height, a, b) {
    var result = Color.multiplyByScalar(b, 1.0 - a.alpha, scratchColorBlend);
    result = Color.add(result, a, result);
    addEntry(height, result);
  }

  // alpha blend new layers on top of old ones
  var layerLength = layeredEntries.length;
  for (i = 0; i < layerLength; i++) {
    var entries = layeredEntries[i];
    var idx = 0;
    var accumIdx = 0;

    // swap the arrays
    entriesAccumCurr = entriesAccumNext;
    entriesAccumNext = [];

    var entriesLength = entries.length;
    var entriesAccumLength = entriesAccumCurr.length;
    while (idx < entriesLength || accumIdx < entriesAccumLength) {
      var entry = idx < entriesLength ? entries[idx] : undefined;
      var prevEntry = idx > 0 ? entries[idx - 1] : undefined;
      var nextEntry = idx < entriesLength - 1 ? entries[idx + 1] : undefined;

      var entryAccum =
        accumIdx < entriesAccumLength ? entriesAccumCurr[accumIdx] : undefined;
      var prevEntryAccum =
        accumIdx > 0 ? entriesAccumCurr[accumIdx - 1] : undefined;
      var nextEntryAccum =
        accumIdx < entriesAccumLength - 1
          ? entriesAccumCurr[accumIdx + 1]
          : undefined;

      if (
        defined(entry) &&
        defined(entryAccum) &&
        entry.height === entryAccum.height
      ) {
        // New entry directly on top of accum entry
        var isSplitAccum =
          defined(nextEntryAccum) &&
          entryAccum.height === nextEntryAccum.height;
        var isStartAccum = !defined(prevEntryAccum);
        var isEndAccum = !defined(nextEntryAccum);

        var isSplit = defined(nextEntry) && entry.height === nextEntry.height;
        var isStart = !defined(prevEntry);
        var isEnd = !defined(nextEntry);

        if (isSplitAccum) {
          if (isSplit) {
            addBlendEntry(entry.height, entry.color, entryAccum.color);
            addBlendEntry(entry.height, nextEntry.color, nextEntryAccum.color);
          } else if (isStart) {
            addEntry(entry.height, entryAccum.color);
            addBlendEntry(entry.height, entry.color, nextEntryAccum.color);
          } else if (isEnd) {
            addBlendEntry(entry.height, entry.color, entryAccum.color);
            addEntry(entry.height, nextEntryAccum.color);
          } else {
            addBlendEntry(entry.height, entry.color, entryAccum.color);
            addBlendEntry(entry.height, entry.color, nextEntryAccum.color);
          }
        } else if (isStartAccum) {
          if (isSplit) {
            addEntry(entry.height, entry.color);
            addBlendEntry(entry.height, nextEntry.color, entryAccum.color);
          } else if (isEnd) {
            addEntry(entry.height, entry.color);
            addEntry(entry.height, entryAccum.color);
          } else if (isStart) {
            addBlendEntry(entry.height, entry.color, entryAccum.color);
          } else {
            addEntry(entry.height, entry.color);
            addBlendEntry(entry.height, entry.color, entryAccum.color);
          }
        } else if (isEndAccum) {
          if (isSplit) {
            addBlendEntry(entry.height, entry.color, entryAccum.color);
            addEntry(entry.height, nextEntry.color);
          } else if (isStart) {
            addEntry(entry.height, entryAccum.color);
            addEntry(entry.height, entry.color);
          } else if (isEnd) {
            addBlendEntry(entry.height, entry.color, entryAccum.color);
          } else {
            addBlendEntry(entry.height, entry.color, entryAccum.color);
            addEntry(entry.height, entry.color);
          }
        } else {
          // eslint-disable-next-line no-lonely-if
          if (isSplit) {
            addBlendEntry(entry.height, entry.color, entryAccum.color);
            addBlendEntry(entry.height, nextEntry.color, entryAccum.color);
          } else if (isStart) {
            addEntry(entry.height, entryAccum.color);
            addBlendEntry(entry.height, entry.color, entryAccum.color);
          } else if (isEnd) {
            addBlendEntry(entry.height, entry.color, entryAccum.color);
            addEntry(entry.height, entryAccum.color);
          } else {
            addBlendEntry(entry.height, entry.color, entryAccum.color);
          }
        }
        idx += isSplit ? 2 : 1;
        accumIdx += isSplitAccum ? 2 : 1;
      } else if (
        defined(entry) &&
        defined(entryAccum) &&
        defined(prevEntryAccum) &&
        entry.height < entryAccum.height
      ) {
        // New entry between two accum entries
        var colorBelow = lerpEntryColor(
          entry.height,
          prevEntryAccum,
          entryAccum,
          scratchColorBelow
        );

        if (!defined(prevEntry)) {
          addEntry(entry.height, colorBelow);
          addBlendEntry(entry.height, entry.color, colorBelow);
        } else if (!defined(nextEntry)) {
          addBlendEntry(entry.height, entry.color, colorBelow);
          addEntry(entry.height, colorBelow);
        } else {
          addBlendEntry(entry.height, entry.color, colorBelow);
        }
        idx++;
      } else if (
        defined(entryAccum) &&
        defined(entry) &&
        defined(prevEntry) &&
        entryAccum.height < entry.height
      ) {
        // Accum entry between two new entries
        var colorAbove = lerpEntryColor(
          entryAccum.height,
          prevEntry,
          entry,
          scratchColorAbove
        );

        addBlendEntry(entryAccum.height, colorAbove, entryAccum.color);
        accumIdx++;
      } else if (
        defined(entry) &&
        (!defined(entryAccum) || entry.height < entryAccum.height)
      ) {
        // New entry completely before or completely after accum entries
        if (
          defined(entryAccum) &&
          !defined(prevEntryAccum) &&
          !defined(nextEntry)
        ) {
          // Insert blank gap between last entry and first accum entry
          addEntry(entry.height, entry.color);
          addEntry(entry.height, blankColor);
          addEntry(entryAccum.height, blankColor);
        } else if (
          !defined(entryAccum) &&
          defined(prevEntryAccum) &&
          !defined(prevEntry)
        ) {
          // Insert blank gap between last accum entry and first entry
          addEntry(prevEntryAccum.height, blankColor);
          addEntry(entry.height, blankColor);
          addEntry(entry.height, entry.color);
        } else {
          addEntry(entry.height, entry.color);
        }
        idx++;
      } else if (
        defined(entryAccum) &&
        (!defined(entry) || entryAccum.height < entry.height)
      ) {
        // Accum entry completely before or completely after new entries
        addEntry(entryAccum.height, entryAccum.color);
        accumIdx++;
      }
    }
  }

  // one final cleanup pass in case duplicate colors show up in the final result
  var allEntries = removeDuplicates(entriesAccumNext);
  return allEntries;
}

/**
 * @typedef {Object} createElevationBandMaterial~ElevationEntry
 *
 * @property {Number} height The height.
 * @property {Color} color The color at this height.
 */

/**
 * @typedef {Object} createElevationBandMaterial~ElevationBand
 *
 * @property {createElevationBandMaterial~ElevationEntry[]} entries A list of elevation entries. They will automatically be sorted from lowest to highest. If there is only one entry and <code>extendsDownards</code> and <code>extendUpwards</code> are both <code>false</code>, they will both be set to <code>true</code>.
 * @property {Boolean} [extendDownwards=false] If <code>true</code>, the band's minimum elevation color will extend infinitely downwards.
 * @property {Boolean} [extendUpwards=false] If <code>true</code>, the band's maximum elevation color will extend infinitely upwards.
 */

/**
 * Creates a {@link Material} that combines multiple layers of color/gradient bands and maps them to terrain heights.
 *
 * The shader does a binary search over all the heights to find out which colors are above and below a given height, and
 * interpolates between them for the final color. This material supports hundreds of entries relatively cheaply.
 *
 * @exports createElevationBandMaterial
 *
 * @param {Object} options Object with the following properties:
 * @param {Scene} options.scene The scene where the visualization is taking place.
 * @param {createElevationBandMaterial~ElevationBand[]} options.layers A list of bands ordered from lowest to highest precedence.
 * @returns {Material} A new {@link Material} instance.
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Elevation%20Band%20Material.html|Cesium Sandcastle Elevation Band Demo}
 *
 * @example
 * scene.globe.material = Cesium.createElevationBandMaterial({
 *     scene : scene,
 *     layers : [{
 *         entries : [{
 *             height : 4200.0,
 *             color : new Cesium.Color(0.0, 0.0, 0.0, 1.0)
 *         }, {
 *             height : 8848.0,
 *             color : new Cesium.Color(1.0, 1.0, 1.0, 1.0)
 *         }],
 *         extendDownwards : true,
 *         extendUpwards : true,
 *     }, {
 *         entries : [{
 *             height : 7000.0,
 *             color : new Cesium.Color(1.0, 0.0, 0.0, 0.5)
 *         }, {
 *             height : 7100.0,
 *             color : new Cesium.Color(1.0, 0.0, 0.0, 0.5)
 *         }]
 *     }]
 * });
 */
function createElevationBandMaterial(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var scene = options.scene;
  var layers = options.layers;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.scene", scene);
  Check.defined("options.layers", layers);
  Check.typeOf.number.greaterThan("options.layers.length", layers.length, 0);
  //>>includeEnd('debug');

  var entries = createLayeredEntries(layers);
  var entriesLength = entries.length;
  var i;

  var heightsArray;
  var heightTexDatatype;
  var heightTexFormat;

  var isPackedHeight = !createElevationBandMaterial._useFloatTexture(
    scene.context
  );
  if (isPackedHeight) {
    heightTexDatatype = PixelDatatype.UNSIGNED_BYTE;
    heightTexFormat = PixelFormat.RGBA;

    heightsArray = new Uint8Array(entriesLength * 4);
    for (i = 0; i < entriesLength; i++) {
      Cartesian4.packFloat(entries[i].height, scratchPackedFloat);
      Cartesian4.pack(scratchPackedFloat, heightsArray, i * 4);
    }
  } else {
    heightTexDatatype = PixelDatatype.FLOAT;
    heightTexFormat = PixelFormat.LUMINANCE;

    heightsArray = new Float32Array(entriesLength);
    for (i = 0; i < entriesLength; i++) {
      heightsArray[i] = entries[i].height;
    }
  }

  var heightsTex = Texture.create({
    context: scene.context,
    pixelFormat: heightTexFormat,
    pixelDatatype: heightTexDatatype,
    source: {
      arrayBufferView: heightsArray,
      width: entriesLength,
      height: 1,
    },
    sampler: new Sampler({
      wrapS: TextureWrap.CLAMP_TO_EDGE,
      wrapT: TextureWrap.CLAMP_TO_EDGE,
      minificationFilter: TextureMinificationFilter.NEAREST,
      magnificationFilter: TextureMagnificationFilter.NEAREST,
    }),
  });

  var colorsArray = new Uint8Array(entriesLength * 4);
  for (i = 0; i < entriesLength; i++) {
    var color = entries[i].color;
    color.toBytes(scratchColorBytes);
    colorsArray[i * 4 + 0] = scratchColorBytes[0];
    colorsArray[i * 4 + 1] = scratchColorBytes[1];
    colorsArray[i * 4 + 2] = scratchColorBytes[2];
    colorsArray[i * 4 + 3] = scratchColorBytes[3];
  }

  var colorsTex = Texture.create({
    context: scene.context,
    pixelFormat: PixelFormat.RGBA,
    pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
    source: {
      arrayBufferView: colorsArray,
      width: entriesLength,
      height: 1,
    },
    sampler: new Sampler({
      wrapS: TextureWrap.CLAMP_TO_EDGE,
      wrapT: TextureWrap.CLAMP_TO_EDGE,
      minificationFilter: TextureMinificationFilter.LINEAR,
      magnificationFilter: TextureMagnificationFilter.LINEAR,
    }),
  });

  var material = Material.fromType("ElevationBand");
  material.uniforms.heights = heightsTex;
  material.uniforms.colors = colorsTex;
  return material;
}

/**
 * Function for checking if the context will allow floating point textures for heights.
 *
 * @param {Context} context The {@link Context}.
 * @returns {Boolean} <code>true</code> if floating point textures can be used for heights.
 * @private
 */
createElevationBandMaterial._useFloatTexture = function (context) {
  return context.floatingPointTexture;
};

/**
 * @private
 */
createElevationBandMaterial._maximumHeight = +16777216;

/**
 * @private
 */
createElevationBandMaterial._minimumHeight = -16777216;

export default createElevationBandMaterial;
