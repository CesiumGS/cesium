import defined from "../Core/defined.js";

/**
 * This class implements an I3S Field which is custom data attached
 * to nodes
 * @alias I3SField
 * @internalConstructor
 * @privateParam {I3SNode} parent The parent of that geometry
 * @privateParam {object} storageInfo The structure containing the storage info of the field
 */
function I3SField(parent, storageInfo) {
  this._storageInfo = storageInfo;
  this._parent = parent;
  this._dataProvider = parent._dataProvider;
  const uri = `attributes/${storageInfo.key}/0`;

  if (defined(this._parent._nodeIndex)) {
    this._resource = this._parent._layer.resource.getDerivedResource({
      url: `nodes/${this._parent._data.mesh.attribute.resource}/${uri}`,
    });
  } else {
    this._resource = this._parent.resource.getDerivedResource({ url: uri });
  }
}

Object.defineProperties(I3SField.prototype, {
  /**
   * Gets the resource for the fields
   * @memberof I3SField.prototype
   * @type {Resource}
   * @readonly
   */
  resource: {
    get: function () {
      return this._resource;
    },
  },
  /**
   * Gets the header for this field.
   * @memberof I3SField.prototype
   * @type {object}
   * @readonly
   */
  header: {
    get: function () {
      return this._header;
    },
  },
  /**
   * Gets the values for this field.
   * @memberof I3SField.prototype
   * @type {object}
   * @readonly
   */
  values: {
    get: function () {
      return defined(this._values) && defined(this._values.attributeValues)
        ? this._values.attributeValues
        : [];
    },
  },
  /**
   * Gets the name for the field.
   * @memberof I3SField.prototype
   * @type {string}
   * @readonly
   */
  name: {
    get: function () {
      return this._storageInfo.name;
    },
  },
});

function getNumericTypeSize(type) {
  if (type === "UInt8" || type === "Int8") {
    return 1;
  } else if (type === "UInt16" || type === "Int16") {
    return 2;
  } else if (
    type === "UInt32" ||
    type === "Int32" ||
    type === "Oid32" ||
    type === "Float32"
  ) {
    return 4;
  } else if (type === "UInt64" || type === "Int64" || type === "Float64") {
    return 8;
  }

  // Not a numeric type
  return 0;
}

/**
 * Loads the content.
 * @returns {Promise<void>} A promise that is resolved when the field data is loaded
 */
I3SField.prototype.load = function () {
  const that = this;
  return this._dataProvider._loadBinary(this._resource).then(function (data) {
    // Check if we have a 404
    const dataView = new DataView(data);
    let success = true;
    if (dataView.getUint8(0) === "{".charCodeAt(0)) {
      const textContent = new TextDecoder();
      const str = textContent.decode(data);
      if (str.includes("404")) {
        success = false;
        console.error(`Failed to load: ${that.resource.url}`);
      }
    }

    if (success) {
      that._data = data;
      let offset = that._parseHeader(dataView);

      const valueSize = getNumericTypeSize(
        that._storageInfo.attributeValues.valueType
      );
      if (valueSize > 0) {
        // Values will be padded to align the addresses with the data size
        offset = Math.ceil(offset / valueSize) * valueSize;
      }

      that._parseBody(dataView, offset);
    }
  });
};

/**
 * @private
 */
I3SField.prototype._parseValue = function (dataView, type, offset) {
  let value;
  if (type === "UInt8") {
    value = dataView.getUint8(offset);
    offset += 1;
  } else if (type === "Int8") {
    value = dataView.getInt8(offset);
    offset += 1;
  } else if (type === "UInt16") {
    value = dataView.getUint16(offset, true);
    offset += 2;
  } else if (type === "Int16") {
    value = dataView.getInt16(offset, true);
    offset += 2;
  } else if (type === "UInt32") {
    value = dataView.getUint32(offset, true);
    offset += 4;
  } else if (type === "Oid32") {
    value = dataView.getUint32(offset, true);
    offset += 4;
  } else if (type === "Int32") {
    value = dataView.getInt32(offset, true);
    offset += 4;
  } else if (type === "UInt64") {
    const left = dataView.getUint32(offset, true);
    const right = dataView.getUint32(offset + 4, true);
    value = left + Math.pow(2, 32) * right;
    offset += 8;
  } else if (type === "Int64") {
    const left = dataView.getUint32(offset, true);
    const right = dataView.getUint32(offset + 4, true);
    if (right < Math.pow(2, 31)) {
      // Positive number
      value = left + Math.pow(2, 32) * right;
    } else {
      // Negative
      value = left + Math.pow(2, 32) * (right - Math.pow(2, 32));
    }

    offset += 8;
  } else if (type === "Float32") {
    value = dataView.getFloat32(offset, true);
    offset += 4;
  } else if (type === "Float64") {
    value = dataView.getFloat64(offset, true);
    offset += 8;
  } else if (type === "String") {
    value = String.fromCharCode(dataView.getUint8(offset));
    offset += 1;
  }

  return {
    value: value,
    offset: offset,
  };
};

/**
 * @private
 */
I3SField.prototype._parseHeader = function (dataView) {
  let offset = 0;
  this._header = {};
  for (
    let itemIndex = 0;
    itemIndex < this._storageInfo.header.length;
    itemIndex++
  ) {
    const item = this._storageInfo.header[itemIndex];
    const parsedValue = this._parseValue(dataView, item.valueType, offset);
    this._header[item.property] = parsedValue.value;
    offset = parsedValue.offset;
  }
  return offset;
};

/**
 * @private
 */
I3SField.prototype._parseBody = function (dataView, offset) {
  this._values = {};
  for (
    let itemIndex = 0;
    itemIndex < this._storageInfo.ordering.length;
    itemIndex++
  ) {
    const item = this._storageInfo.ordering[itemIndex];
    const desc = this._storageInfo[item];
    if (defined(desc)) {
      this._values[item] = [];
      for (let index = 0; index < this._header.count; ++index) {
        if (desc.valueType !== "String") {
          const parsedValue = this._parseValue(
            dataView,
            desc.valueType,
            offset
          );
          this._values[item].push(parsedValue.value);
          offset = parsedValue.offset;
        } else {
          const stringLen = this._values.attributeByteCounts[index];
          let stringContent = "";
          for (let cIndex = 0; cIndex < stringLen; ++cIndex) {
            const curParsedValue = this._parseValue(
              dataView,
              desc.valueType,
              offset
            );
            if (curParsedValue.value.charCodeAt(0) !== 0) {
              stringContent += curParsedValue.value;
            }
            offset = curParsedValue.offset;
          }
          // We skip the last character of the string since it's a null terminator
          this._values[item].push(stringContent);
        }
      }
    }
  }
};

export default I3SField;
