import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import srgbToLinear from "../Core/srgbToLinear.js";

/**
 * This class implements an I3S symbology for I3S Layers.
 * <p>
 * Do not construct this directly, instead access symbology through {@link I3SLayer}.
 * </p>
 * @alias I3SSymbology
 * @internalConstructor
 */
function I3SSymbology(layer) {
  this._layer = layer;
  this._defaultSymbology = undefined;
  this._valueFields = [];
  this._uniqueValueHash = undefined;
  this._classBreaksHash = undefined;

  this._parseLayerSymbology();
}

Object.defineProperties(I3SSymbology.prototype, {
  /**
   * Gets the default symbology data.
   * @memberof I3SSymbology.prototype
   * @type {object}
   * @readonly
   */
  defaultSymbology: {
    get: function () {
      return this._defaultSymbology;
    },
  },
});

function convertColor(color, transparency) {
  // color is represented as a three or four-element array, values range from 0 through 255.
  // transparency value has to lie between 100 (full transparency) and 0 (full opacity).
  const convertedColor = [];
  for (let i = 0; i < color.length; i++) {
    const floatColor = Color.byteToFloat(color[i]);
    if (i < 3) {
      convertedColor.push(srgbToLinear(floatColor));
    } else {
      convertedColor.push(floatColor);
    }
  }
  if (convertedColor.length === 3) {
    if (defined(transparency)) {
      convertedColor.push(1.0 - transparency / 100.0);
    } else {
      convertedColor.push(1.0);
    }
  }
  return convertedColor;
}

function parseSymbol(symbol, isColorCaptured) {
  const symbology = {
    edges: undefined,
    material: undefined,
  };
  if (defined(symbol) && defined(symbol.symbolLayers)) {
    for (let i = 0; i < symbol.symbolLayers.length; i++) {
      const symbolLayer = symbol.symbolLayers[i];
      if (symbolLayer.type === "Fill") {
        const edges = symbolLayer.edges;
        const outline = symbolLayer.outline;
        if (defined(edges)) {
          symbology.edges = {};
          if (defined(edges.color)) {
            symbology.edges.color = convertColor(
              edges.color,
              edges.transparency
            );
          }
        } else if (defined(outline)) {
          symbology.edges = {};
          if (defined(outline.color)) {
            symbology.edges.color = convertColor(
              outline.color,
              outline.transparency
            );
          }
        }

        if (!isColorCaptured) {
          const material = symbolLayer.material;
          if (defined(material)) {
            symbology.material = {
              colorMixMode: material.colorMixMode,
            };
            if (defined(material.color)) {
              symbology.material.color = convertColor(
                material.color,
                material.transparency
              );
            }
          }
        }
        break;
      }
    }
  }
  return symbology;
}

function buildUniqueValueHash(renderer, isColorCaptured) {
  if (defined(renderer.uniqueValueGroups)) {
    const valueHash = {};
    for (
      let groupIndex = 0;
      groupIndex < renderer.uniqueValueGroups.length;
      groupIndex++
    ) {
      const classes = renderer.uniqueValueGroups[groupIndex].classes;
      if (defined(classes)) {
        for (let classIndex = 0; classIndex < classes.length; classIndex++) {
          const classSymbology = parseSymbol(
            classes[classIndex].symbol,
            isColorCaptured
          );
          const values = classes[classIndex].values;
          for (let valueIndex = 0; valueIndex < values.length; valueIndex++) {
            const fieldValues = values[valueIndex];
            let hash = valueHash;
            for (
              let fieldIndex = 0;
              fieldIndex < fieldValues.length;
              fieldIndex++
            ) {
              const fieldValue = fieldValues[fieldIndex];
              if (fieldIndex === fieldValues.length - 1) {
                hash[fieldValue] = classSymbology;
              } else {
                if (!defined(hash[fieldValue])) {
                  hash[fieldValue] = {};
                }
                hash = hash[fieldValue];
              }
            }
          }
        }
      }
    }
    return valueHash;
  }
  if (defined(renderer.uniqueValueInfos)) {
    const valueHash = {};
    for (
      let infoIndex = 0;
      infoIndex < renderer.uniqueValueInfos.length;
      infoIndex++
    ) {
      const info = renderer.uniqueValueInfos[infoIndex];
      valueHash[info.value] = parseSymbol(info.symbol, isColorCaptured);
    }
    return valueHash;
  }
  return undefined;
}

function buildClassBreaksHash(renderer, isColorCaptured) {
  if (defined(renderer.classBreakInfos)) {
    const classBreakInfos = [...renderer.classBreakInfos];
    classBreakInfos.sort(function (a, b) {
      const aMax = defaultValue(a.classMaxValue, a.classMinValue);
      const bMax = defaultValue(b.classMaxValue, b.classMinValue);
      return aMax - bMax;
    });
    const valueHash = {
      ranges: [],
      symbols: [],
    };

    if (defined(renderer.minValue)) {
      valueHash.ranges.push(renderer.minValue);
      valueHash.symbols.push(undefined);
    }
    for (let infoIndex = 0; infoIndex < classBreakInfos.length; infoIndex++) {
      const info = classBreakInfos[infoIndex];
      if (defined(info.classMinValue)) {
        if (
          valueHash.ranges.length === 0 ||
          info.classMinValue > valueHash.ranges[valueHash.ranges.length - 1]
        ) {
          valueHash.ranges.push(info.classMinValue);
          valueHash.symbols.push(undefined);
        }
      }
      if (defined(info.classMaxValue)) {
        if (
          valueHash.ranges.length === 0 ||
          info.classMaxValue > valueHash.ranges[valueHash.ranges.length - 1]
        ) {
          valueHash.ranges.push(info.classMaxValue);
          valueHash.symbols.push(parseSymbol(info.symbol, isColorCaptured));
        }
      }
    }
    valueHash.symbols.push(undefined);

    return valueHash;
  }
  return undefined;
}

/**
 * @private
 */
I3SSymbology.prototype._parseLayerSymbology = function () {
  const drawingInfo = this._layer.data.drawingInfo;
  if (defined(drawingInfo) && defined(drawingInfo.renderer)) {
    const cachedDrawingInfo = this._layer.data.cachedDrawingInfo;
    const isColorCaptured =
      defined(cachedDrawingInfo) && cachedDrawingInfo.color === true;
    const renderer = drawingInfo.renderer;
    if (renderer.type === "simple") {
      this._defaultSymbology = parseSymbol(renderer.symbol, isColorCaptured);
    } else if (renderer.type === "uniqueValue") {
      this._defaultSymbology = parseSymbol(
        renderer.defaultSymbol,
        isColorCaptured
      );
      this._valueFields.push(renderer.field1);
      if (defined(renderer.field2)) {
        this._valueFields.push(renderer.field2);
      }
      if (defined(renderer.field3)) {
        this._valueFields.push(renderer.field3);
      }
      this._uniqueValueHash = buildUniqueValueHash(renderer, isColorCaptured);
    } else if (renderer.type === "classBreaks") {
      this._defaultSymbology = parseSymbol(
        renderer.defaultSymbol,
        isColorCaptured
      );
      this._valueFields.push(renderer.field);
      this._classBreaksHash = buildClassBreaksHash(renderer, isColorCaptured);
    }
  }
};

function findHashForUniqueValues(hash, values, hashLevel, valueIndex) {
  const levelValues = values[hashLevel];
  if (valueIndex < levelValues.length) {
    const hashValue = levelValues[valueIndex];
    const innerHash = hash[hashValue];
    if (defined(innerHash) && ++hashLevel < values.length) {
      return findHashForUniqueValues(innerHash, values, hashLevel, valueIndex);
    }
    return innerHash;
  }
  return undefined;
}

function bisect(array, value) {
  let low = 0;
  let high = array.length;
  if (low < high) {
    do {
      const mid = (low + high) >>> 1;
      if (array[mid] < value) {
        low = mid + 1;
      } else {
        high = mid;
      }
    } while (low < high);
  }
  return low;
}

function findHashForClassBreaks(hash, values, valueIndex) {
  const value = values[valueIndex];
  const range = bisect(hash.ranges, value);
  return hash.symbols[range];
}

/**
 * @private
 */
I3SSymbology.prototype._getSymbology = async function (node) {
  const symbology = {
    default: this._defaultSymbology,
  };

  if (this._valueFields.length > 0) {
    const promises = [];
    for (let i = 0; i < this._valueFields.length; i++) {
      promises.push(node.loadField(this._valueFields[i]));
    }
    await Promise.all(promises);

    const fieldsValues = [];
    for (let i = 0; i < this._valueFields.length; i++) {
      fieldsValues.push(node.fields[this._valueFields[i]].values);
    }

    let featureHashFn;
    if (defined(this._uniqueValueHash)) {
      featureHashFn = (featureIndex) =>
        findHashForUniqueValues(
          this._uniqueValueHash,
          fieldsValues,
          0,
          featureIndex
        );
    } else if (defined(this._classBreaksHash)) {
      featureHashFn = (featureIndex) =>
        findHashForClassBreaks(
          this._classBreaksHash,
          fieldsValues[0],
          featureIndex
        );
    }

    if (defined(featureHashFn)) {
      const firstFieldValues = fieldsValues[0];
      for (
        let featureIndex = 0;
        featureIndex < firstFieldValues.length;
        featureIndex++
      ) {
        const featureSymbology = featureHashFn(featureIndex);
        if (defined(featureSymbology)) {
          symbology[featureIndex] = featureSymbology;
        }
      }
    }
  }

  return symbology;
};

export default I3SSymbology;
