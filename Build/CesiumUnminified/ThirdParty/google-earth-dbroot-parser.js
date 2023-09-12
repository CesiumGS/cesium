(() => {
  // packages/engine/Source/ThirdParty/google-earth-dbroot-parser.js
  window.cesiumGoogleEarthDbRootParser = function($protobuf) {
    "use strict";
    var $Reader = $protobuf.Reader, $util = $protobuf.util;
    var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});
    $root.keyhole = function() {
      var keyhole = {};
      keyhole.dbroot = function() {
        var dbroot = {};
        dbroot.StringEntryProto = function() {
          function StringEntryProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          StringEntryProto.prototype.stringId = 0;
          StringEntryProto.prototype.stringValue = "";
          StringEntryProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.StringEntryProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.stringId = reader.fixed32();
                  break;
                }
                case 2: {
                  message.stringValue = reader.string();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            if (!message.hasOwnProperty("stringId"))
              throw $util.ProtocolError("missing required 'stringId'", { instance: message });
            if (!message.hasOwnProperty("stringValue"))
              throw $util.ProtocolError("missing required 'stringValue'", { instance: message });
            return message;
          };
          StringEntryProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (!$util.isInteger(message.stringId))
              return "stringId: integer expected";
            if (!$util.isString(message.stringValue))
              return "stringValue: string expected";
            return null;
          };
          StringEntryProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.StringEntryProto)
              return object;
            var message = new $root.keyhole.dbroot.StringEntryProto();
            if (object.stringId != null)
              message.stringId = object.stringId >>> 0;
            if (object.stringValue != null)
              message.stringValue = String(object.stringValue);
            return message;
          };
          StringEntryProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.stringId = 0;
              object.stringValue = "";
            }
            if (message.stringId != null && message.hasOwnProperty("stringId"))
              object.stringId = message.stringId;
            if (message.stringValue != null && message.hasOwnProperty("stringValue"))
              object.stringValue = message.stringValue;
            return object;
          };
          StringEntryProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          StringEntryProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.StringEntryProto";
          };
          return StringEntryProto;
        }();
        dbroot.StringIdOrValueProto = function() {
          function StringIdOrValueProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          StringIdOrValueProto.prototype.stringId = 0;
          StringIdOrValueProto.prototype.value = "";
          StringIdOrValueProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.StringIdOrValueProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.stringId = reader.fixed32();
                  break;
                }
                case 2: {
                  message.value = reader.string();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            return message;
          };
          StringIdOrValueProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (message.stringId != null && message.hasOwnProperty("stringId")) {
              if (!$util.isInteger(message.stringId))
                return "stringId: integer expected";
            }
            if (message.value != null && message.hasOwnProperty("value")) {
              if (!$util.isString(message.value))
                return "value: string expected";
            }
            return null;
          };
          StringIdOrValueProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.StringIdOrValueProto)
              return object;
            var message = new $root.keyhole.dbroot.StringIdOrValueProto();
            if (object.stringId != null)
              message.stringId = object.stringId >>> 0;
            if (object.value != null)
              message.value = String(object.value);
            return message;
          };
          StringIdOrValueProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.stringId = 0;
              object.value = "";
            }
            if (message.stringId != null && message.hasOwnProperty("stringId"))
              object.stringId = message.stringId;
            if (message.value != null && message.hasOwnProperty("value"))
              object.value = message.value;
            return object;
          };
          StringIdOrValueProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          StringIdOrValueProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.StringIdOrValueProto";
          };
          return StringIdOrValueProto;
        }();
        dbroot.PlanetModelProto = function() {
          function PlanetModelProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          PlanetModelProto.prototype.radius = 6378.137;
          PlanetModelProto.prototype.flattening = 0.00335281066474748;
          PlanetModelProto.prototype.elevationBias = 0;
          PlanetModelProto.prototype.negativeAltitudeExponentBias = 0;
          PlanetModelProto.prototype.compressedNegativeAltitudeThreshold = 0;
          PlanetModelProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.PlanetModelProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.radius = reader.double();
                  break;
                }
                case 2: {
                  message.flattening = reader.double();
                  break;
                }
                case 4: {
                  message.elevationBias = reader.double();
                  break;
                }
                case 5: {
                  message.negativeAltitudeExponentBias = reader.int32();
                  break;
                }
                case 6: {
                  message.compressedNegativeAltitudeThreshold = reader.double();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            return message;
          };
          PlanetModelProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (message.radius != null && message.hasOwnProperty("radius")) {
              if (typeof message.radius !== "number")
                return "radius: number expected";
            }
            if (message.flattening != null && message.hasOwnProperty("flattening")) {
              if (typeof message.flattening !== "number")
                return "flattening: number expected";
            }
            if (message.elevationBias != null && message.hasOwnProperty("elevationBias")) {
              if (typeof message.elevationBias !== "number")
                return "elevationBias: number expected";
            }
            if (message.negativeAltitudeExponentBias != null && message.hasOwnProperty("negativeAltitudeExponentBias")) {
              if (!$util.isInteger(message.negativeAltitudeExponentBias))
                return "negativeAltitudeExponentBias: integer expected";
            }
            if (message.compressedNegativeAltitudeThreshold != null && message.hasOwnProperty("compressedNegativeAltitudeThreshold")) {
              if (typeof message.compressedNegativeAltitudeThreshold !== "number")
                return "compressedNegativeAltitudeThreshold: number expected";
            }
            return null;
          };
          PlanetModelProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.PlanetModelProto)
              return object;
            var message = new $root.keyhole.dbroot.PlanetModelProto();
            if (object.radius != null)
              message.radius = Number(object.radius);
            if (object.flattening != null)
              message.flattening = Number(object.flattening);
            if (object.elevationBias != null)
              message.elevationBias = Number(object.elevationBias);
            if (object.negativeAltitudeExponentBias != null)
              message.negativeAltitudeExponentBias = object.negativeAltitudeExponentBias | 0;
            if (object.compressedNegativeAltitudeThreshold != null)
              message.compressedNegativeAltitudeThreshold = Number(object.compressedNegativeAltitudeThreshold);
            return message;
          };
          PlanetModelProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.radius = 6378.137;
              object.flattening = 0.00335281066474748;
              object.elevationBias = 0;
              object.negativeAltitudeExponentBias = 0;
              object.compressedNegativeAltitudeThreshold = 0;
            }
            if (message.radius != null && message.hasOwnProperty("radius"))
              object.radius = options.json && !isFinite(message.radius) ? String(message.radius) : message.radius;
            if (message.flattening != null && message.hasOwnProperty("flattening"))
              object.flattening = options.json && !isFinite(message.flattening) ? String(message.flattening) : message.flattening;
            if (message.elevationBias != null && message.hasOwnProperty("elevationBias"))
              object.elevationBias = options.json && !isFinite(message.elevationBias) ? String(message.elevationBias) : message.elevationBias;
            if (message.negativeAltitudeExponentBias != null && message.hasOwnProperty("negativeAltitudeExponentBias"))
              object.negativeAltitudeExponentBias = message.negativeAltitudeExponentBias;
            if (message.compressedNegativeAltitudeThreshold != null && message.hasOwnProperty("compressedNegativeAltitudeThreshold"))
              object.compressedNegativeAltitudeThreshold = options.json && !isFinite(message.compressedNegativeAltitudeThreshold) ? String(message.compressedNegativeAltitudeThreshold) : message.compressedNegativeAltitudeThreshold;
            return object;
          };
          PlanetModelProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          PlanetModelProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.PlanetModelProto";
          };
          return PlanetModelProto;
        }();
        dbroot.ProviderInfoProto = function() {
          function ProviderInfoProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          ProviderInfoProto.prototype.providerId = 0;
          ProviderInfoProto.prototype.copyrightString = null;
          ProviderInfoProto.prototype.verticalPixelOffset = -1;
          ProviderInfoProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.ProviderInfoProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.providerId = reader.int32();
                  break;
                }
                case 2: {
                  message.copyrightString = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 3: {
                  message.verticalPixelOffset = reader.int32();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            if (!message.hasOwnProperty("providerId"))
              throw $util.ProtocolError("missing required 'providerId'", { instance: message });
            return message;
          };
          ProviderInfoProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (!$util.isInteger(message.providerId))
              return "providerId: integer expected";
            if (message.copyrightString != null && message.hasOwnProperty("copyrightString")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.copyrightString);
              if (error)
                return "copyrightString." + error;
            }
            if (message.verticalPixelOffset != null && message.hasOwnProperty("verticalPixelOffset")) {
              if (!$util.isInteger(message.verticalPixelOffset))
                return "verticalPixelOffset: integer expected";
            }
            return null;
          };
          ProviderInfoProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.ProviderInfoProto)
              return object;
            var message = new $root.keyhole.dbroot.ProviderInfoProto();
            if (object.providerId != null)
              message.providerId = object.providerId | 0;
            if (object.copyrightString != null) {
              if (typeof object.copyrightString !== "object")
                throw TypeError(".keyhole.dbroot.ProviderInfoProto.copyrightString: object expected");
              message.copyrightString = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.copyrightString);
            }
            if (object.verticalPixelOffset != null)
              message.verticalPixelOffset = object.verticalPixelOffset | 0;
            return message;
          };
          ProviderInfoProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.providerId = 0;
              object.copyrightString = null;
              object.verticalPixelOffset = -1;
            }
            if (message.providerId != null && message.hasOwnProperty("providerId"))
              object.providerId = message.providerId;
            if (message.copyrightString != null && message.hasOwnProperty("copyrightString"))
              object.copyrightString = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.copyrightString, options);
            if (message.verticalPixelOffset != null && message.hasOwnProperty("verticalPixelOffset"))
              object.verticalPixelOffset = message.verticalPixelOffset;
            return object;
          };
          ProviderInfoProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          ProviderInfoProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.ProviderInfoProto";
          };
          return ProviderInfoProto;
        }();
        dbroot.PopUpProto = function() {
          function PopUpProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          PopUpProto.prototype.isBalloonStyle = false;
          PopUpProto.prototype.text = null;
          PopUpProto.prototype.backgroundColorAbgr = 4294967295;
          PopUpProto.prototype.textColorAbgr = 4278190080;
          PopUpProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.PopUpProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.isBalloonStyle = reader.bool();
                  break;
                }
                case 2: {
                  message.text = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 3: {
                  message.backgroundColorAbgr = reader.fixed32();
                  break;
                }
                case 4: {
                  message.textColorAbgr = reader.fixed32();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            return message;
          };
          PopUpProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (message.isBalloonStyle != null && message.hasOwnProperty("isBalloonStyle")) {
              if (typeof message.isBalloonStyle !== "boolean")
                return "isBalloonStyle: boolean expected";
            }
            if (message.text != null && message.hasOwnProperty("text")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.text);
              if (error)
                return "text." + error;
            }
            if (message.backgroundColorAbgr != null && message.hasOwnProperty("backgroundColorAbgr")) {
              if (!$util.isInteger(message.backgroundColorAbgr))
                return "backgroundColorAbgr: integer expected";
            }
            if (message.textColorAbgr != null && message.hasOwnProperty("textColorAbgr")) {
              if (!$util.isInteger(message.textColorAbgr))
                return "textColorAbgr: integer expected";
            }
            return null;
          };
          PopUpProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.PopUpProto)
              return object;
            var message = new $root.keyhole.dbroot.PopUpProto();
            if (object.isBalloonStyle != null)
              message.isBalloonStyle = Boolean(object.isBalloonStyle);
            if (object.text != null) {
              if (typeof object.text !== "object")
                throw TypeError(".keyhole.dbroot.PopUpProto.text: object expected");
              message.text = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.text);
            }
            if (object.backgroundColorAbgr != null)
              message.backgroundColorAbgr = object.backgroundColorAbgr >>> 0;
            if (object.textColorAbgr != null)
              message.textColorAbgr = object.textColorAbgr >>> 0;
            return message;
          };
          PopUpProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.isBalloonStyle = false;
              object.text = null;
              object.backgroundColorAbgr = 4294967295;
              object.textColorAbgr = 4278190080;
            }
            if (message.isBalloonStyle != null && message.hasOwnProperty("isBalloonStyle"))
              object.isBalloonStyle = message.isBalloonStyle;
            if (message.text != null && message.hasOwnProperty("text"))
              object.text = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.text, options);
            if (message.backgroundColorAbgr != null && message.hasOwnProperty("backgroundColorAbgr"))
              object.backgroundColorAbgr = message.backgroundColorAbgr;
            if (message.textColorAbgr != null && message.hasOwnProperty("textColorAbgr"))
              object.textColorAbgr = message.textColorAbgr;
            return object;
          };
          PopUpProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          PopUpProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.PopUpProto";
          };
          return PopUpProto;
        }();
        dbroot.StyleAttributeProto = function() {
          function StyleAttributeProto(properties) {
            this.drawFlag = [];
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          StyleAttributeProto.prototype.styleId = "";
          StyleAttributeProto.prototype.providerId = 0;
          StyleAttributeProto.prototype.polyColorAbgr = 4294967295;
          StyleAttributeProto.prototype.lineColorAbgr = 4294967295;
          StyleAttributeProto.prototype.lineWidth = 1;
          StyleAttributeProto.prototype.labelColorAbgr = 4294967295;
          StyleAttributeProto.prototype.labelScale = 1;
          StyleAttributeProto.prototype.placemarkIconColorAbgr = 4294967295;
          StyleAttributeProto.prototype.placemarkIconScale = 1;
          StyleAttributeProto.prototype.placemarkIconPath = null;
          StyleAttributeProto.prototype.placemarkIconX = 0;
          StyleAttributeProto.prototype.placemarkIconY = 0;
          StyleAttributeProto.prototype.placemarkIconWidth = 32;
          StyleAttributeProto.prototype.placemarkIconHeight = 32;
          StyleAttributeProto.prototype.popUp = null;
          StyleAttributeProto.prototype.drawFlag = $util.emptyArray;
          StyleAttributeProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.StyleAttributeProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.styleId = reader.string();
                  break;
                }
                case 3: {
                  message.providerId = reader.int32();
                  break;
                }
                case 4: {
                  message.polyColorAbgr = reader.fixed32();
                  break;
                }
                case 5: {
                  message.lineColorAbgr = reader.fixed32();
                  break;
                }
                case 6: {
                  message.lineWidth = reader.float();
                  break;
                }
                case 7: {
                  message.labelColorAbgr = reader.fixed32();
                  break;
                }
                case 8: {
                  message.labelScale = reader.float();
                  break;
                }
                case 9: {
                  message.placemarkIconColorAbgr = reader.fixed32();
                  break;
                }
                case 10: {
                  message.placemarkIconScale = reader.float();
                  break;
                }
                case 11: {
                  message.placemarkIconPath = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 12: {
                  message.placemarkIconX = reader.int32();
                  break;
                }
                case 13: {
                  message.placemarkIconY = reader.int32();
                  break;
                }
                case 14: {
                  message.placemarkIconWidth = reader.int32();
                  break;
                }
                case 15: {
                  message.placemarkIconHeight = reader.int32();
                  break;
                }
                case 16: {
                  message.popUp = $root.keyhole.dbroot.PopUpProto.decode(reader, reader.uint32());
                  break;
                }
                case 17: {
                  if (!(message.drawFlag && message.drawFlag.length))
                    message.drawFlag = [];
                  message.drawFlag.push($root.keyhole.dbroot.DrawFlagProto.decode(reader, reader.uint32()));
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            if (!message.hasOwnProperty("styleId"))
              throw $util.ProtocolError("missing required 'styleId'", { instance: message });
            return message;
          };
          StyleAttributeProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (!$util.isString(message.styleId))
              return "styleId: string expected";
            if (message.providerId != null && message.hasOwnProperty("providerId")) {
              if (!$util.isInteger(message.providerId))
                return "providerId: integer expected";
            }
            if (message.polyColorAbgr != null && message.hasOwnProperty("polyColorAbgr")) {
              if (!$util.isInteger(message.polyColorAbgr))
                return "polyColorAbgr: integer expected";
            }
            if (message.lineColorAbgr != null && message.hasOwnProperty("lineColorAbgr")) {
              if (!$util.isInteger(message.lineColorAbgr))
                return "lineColorAbgr: integer expected";
            }
            if (message.lineWidth != null && message.hasOwnProperty("lineWidth")) {
              if (typeof message.lineWidth !== "number")
                return "lineWidth: number expected";
            }
            if (message.labelColorAbgr != null && message.hasOwnProperty("labelColorAbgr")) {
              if (!$util.isInteger(message.labelColorAbgr))
                return "labelColorAbgr: integer expected";
            }
            if (message.labelScale != null && message.hasOwnProperty("labelScale")) {
              if (typeof message.labelScale !== "number")
                return "labelScale: number expected";
            }
            if (message.placemarkIconColorAbgr != null && message.hasOwnProperty("placemarkIconColorAbgr")) {
              if (!$util.isInteger(message.placemarkIconColorAbgr))
                return "placemarkIconColorAbgr: integer expected";
            }
            if (message.placemarkIconScale != null && message.hasOwnProperty("placemarkIconScale")) {
              if (typeof message.placemarkIconScale !== "number")
                return "placemarkIconScale: number expected";
            }
            if (message.placemarkIconPath != null && message.hasOwnProperty("placemarkIconPath")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.placemarkIconPath);
              if (error)
                return "placemarkIconPath." + error;
            }
            if (message.placemarkIconX != null && message.hasOwnProperty("placemarkIconX")) {
              if (!$util.isInteger(message.placemarkIconX))
                return "placemarkIconX: integer expected";
            }
            if (message.placemarkIconY != null && message.hasOwnProperty("placemarkIconY")) {
              if (!$util.isInteger(message.placemarkIconY))
                return "placemarkIconY: integer expected";
            }
            if (message.placemarkIconWidth != null && message.hasOwnProperty("placemarkIconWidth")) {
              if (!$util.isInteger(message.placemarkIconWidth))
                return "placemarkIconWidth: integer expected";
            }
            if (message.placemarkIconHeight != null && message.hasOwnProperty("placemarkIconHeight")) {
              if (!$util.isInteger(message.placemarkIconHeight))
                return "placemarkIconHeight: integer expected";
            }
            if (message.popUp != null && message.hasOwnProperty("popUp")) {
              var error = $root.keyhole.dbroot.PopUpProto.verify(message.popUp);
              if (error)
                return "popUp." + error;
            }
            if (message.drawFlag != null && message.hasOwnProperty("drawFlag")) {
              if (!Array.isArray(message.drawFlag))
                return "drawFlag: array expected";
              for (var i = 0; i < message.drawFlag.length; ++i) {
                var error = $root.keyhole.dbroot.DrawFlagProto.verify(message.drawFlag[i]);
                if (error)
                  return "drawFlag." + error;
              }
            }
            return null;
          };
          StyleAttributeProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.StyleAttributeProto)
              return object;
            var message = new $root.keyhole.dbroot.StyleAttributeProto();
            if (object.styleId != null)
              message.styleId = String(object.styleId);
            if (object.providerId != null)
              message.providerId = object.providerId | 0;
            if (object.polyColorAbgr != null)
              message.polyColorAbgr = object.polyColorAbgr >>> 0;
            if (object.lineColorAbgr != null)
              message.lineColorAbgr = object.lineColorAbgr >>> 0;
            if (object.lineWidth != null)
              message.lineWidth = Number(object.lineWidth);
            if (object.labelColorAbgr != null)
              message.labelColorAbgr = object.labelColorAbgr >>> 0;
            if (object.labelScale != null)
              message.labelScale = Number(object.labelScale);
            if (object.placemarkIconColorAbgr != null)
              message.placemarkIconColorAbgr = object.placemarkIconColorAbgr >>> 0;
            if (object.placemarkIconScale != null)
              message.placemarkIconScale = Number(object.placemarkIconScale);
            if (object.placemarkIconPath != null) {
              if (typeof object.placemarkIconPath !== "object")
                throw TypeError(".keyhole.dbroot.StyleAttributeProto.placemarkIconPath: object expected");
              message.placemarkIconPath = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.placemarkIconPath);
            }
            if (object.placemarkIconX != null)
              message.placemarkIconX = object.placemarkIconX | 0;
            if (object.placemarkIconY != null)
              message.placemarkIconY = object.placemarkIconY | 0;
            if (object.placemarkIconWidth != null)
              message.placemarkIconWidth = object.placemarkIconWidth | 0;
            if (object.placemarkIconHeight != null)
              message.placemarkIconHeight = object.placemarkIconHeight | 0;
            if (object.popUp != null) {
              if (typeof object.popUp !== "object")
                throw TypeError(".keyhole.dbroot.StyleAttributeProto.popUp: object expected");
              message.popUp = $root.keyhole.dbroot.PopUpProto.fromObject(object.popUp);
            }
            if (object.drawFlag) {
              if (!Array.isArray(object.drawFlag))
                throw TypeError(".keyhole.dbroot.StyleAttributeProto.drawFlag: array expected");
              message.drawFlag = [];
              for (var i = 0; i < object.drawFlag.length; ++i) {
                if (typeof object.drawFlag[i] !== "object")
                  throw TypeError(".keyhole.dbroot.StyleAttributeProto.drawFlag: object expected");
                message.drawFlag[i] = $root.keyhole.dbroot.DrawFlagProto.fromObject(object.drawFlag[i]);
              }
            }
            return message;
          };
          StyleAttributeProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.arrays || options.defaults)
              object.drawFlag = [];
            if (options.defaults) {
              object.styleId = "";
              object.providerId = 0;
              object.polyColorAbgr = 4294967295;
              object.lineColorAbgr = 4294967295;
              object.lineWidth = 1;
              object.labelColorAbgr = 4294967295;
              object.labelScale = 1;
              object.placemarkIconColorAbgr = 4294967295;
              object.placemarkIconScale = 1;
              object.placemarkIconPath = null;
              object.placemarkIconX = 0;
              object.placemarkIconY = 0;
              object.placemarkIconWidth = 32;
              object.placemarkIconHeight = 32;
              object.popUp = null;
            }
            if (message.styleId != null && message.hasOwnProperty("styleId"))
              object.styleId = message.styleId;
            if (message.providerId != null && message.hasOwnProperty("providerId"))
              object.providerId = message.providerId;
            if (message.polyColorAbgr != null && message.hasOwnProperty("polyColorAbgr"))
              object.polyColorAbgr = message.polyColorAbgr;
            if (message.lineColorAbgr != null && message.hasOwnProperty("lineColorAbgr"))
              object.lineColorAbgr = message.lineColorAbgr;
            if (message.lineWidth != null && message.hasOwnProperty("lineWidth"))
              object.lineWidth = options.json && !isFinite(message.lineWidth) ? String(message.lineWidth) : message.lineWidth;
            if (message.labelColorAbgr != null && message.hasOwnProperty("labelColorAbgr"))
              object.labelColorAbgr = message.labelColorAbgr;
            if (message.labelScale != null && message.hasOwnProperty("labelScale"))
              object.labelScale = options.json && !isFinite(message.labelScale) ? String(message.labelScale) : message.labelScale;
            if (message.placemarkIconColorAbgr != null && message.hasOwnProperty("placemarkIconColorAbgr"))
              object.placemarkIconColorAbgr = message.placemarkIconColorAbgr;
            if (message.placemarkIconScale != null && message.hasOwnProperty("placemarkIconScale"))
              object.placemarkIconScale = options.json && !isFinite(message.placemarkIconScale) ? String(message.placemarkIconScale) : message.placemarkIconScale;
            if (message.placemarkIconPath != null && message.hasOwnProperty("placemarkIconPath"))
              object.placemarkIconPath = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.placemarkIconPath, options);
            if (message.placemarkIconX != null && message.hasOwnProperty("placemarkIconX"))
              object.placemarkIconX = message.placemarkIconX;
            if (message.placemarkIconY != null && message.hasOwnProperty("placemarkIconY"))
              object.placemarkIconY = message.placemarkIconY;
            if (message.placemarkIconWidth != null && message.hasOwnProperty("placemarkIconWidth"))
              object.placemarkIconWidth = message.placemarkIconWidth;
            if (message.placemarkIconHeight != null && message.hasOwnProperty("placemarkIconHeight"))
              object.placemarkIconHeight = message.placemarkIconHeight;
            if (message.popUp != null && message.hasOwnProperty("popUp"))
              object.popUp = $root.keyhole.dbroot.PopUpProto.toObject(message.popUp, options);
            if (message.drawFlag && message.drawFlag.length) {
              object.drawFlag = [];
              for (var j = 0; j < message.drawFlag.length; ++j)
                object.drawFlag[j] = $root.keyhole.dbroot.DrawFlagProto.toObject(message.drawFlag[j], options);
            }
            return object;
          };
          StyleAttributeProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          StyleAttributeProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.StyleAttributeProto";
          };
          return StyleAttributeProto;
        }();
        dbroot.StyleMapProto = function() {
          function StyleMapProto(properties) {
            this.channelId = [];
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          StyleMapProto.prototype.styleMapId = 0;
          StyleMapProto.prototype.channelId = $util.emptyArray;
          StyleMapProto.prototype.normalStyleAttribute = 0;
          StyleMapProto.prototype.highlightStyleAttribute = 0;
          StyleMapProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.StyleMapProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.styleMapId = reader.int32();
                  break;
                }
                case 2: {
                  if (!(message.channelId && message.channelId.length))
                    message.channelId = [];
                  if ((tag & 7) === 2) {
                    var end2 = reader.uint32() + reader.pos;
                    while (reader.pos < end2)
                      message.channelId.push(reader.int32());
                  } else
                    message.channelId.push(reader.int32());
                  break;
                }
                case 3: {
                  message.normalStyleAttribute = reader.int32();
                  break;
                }
                case 4: {
                  message.highlightStyleAttribute = reader.int32();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            if (!message.hasOwnProperty("styleMapId"))
              throw $util.ProtocolError("missing required 'styleMapId'", { instance: message });
            return message;
          };
          StyleMapProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (!$util.isInteger(message.styleMapId))
              return "styleMapId: integer expected";
            if (message.channelId != null && message.hasOwnProperty("channelId")) {
              if (!Array.isArray(message.channelId))
                return "channelId: array expected";
              for (var i = 0; i < message.channelId.length; ++i)
                if (!$util.isInteger(message.channelId[i]))
                  return "channelId: integer[] expected";
            }
            if (message.normalStyleAttribute != null && message.hasOwnProperty("normalStyleAttribute")) {
              if (!$util.isInteger(message.normalStyleAttribute))
                return "normalStyleAttribute: integer expected";
            }
            if (message.highlightStyleAttribute != null && message.hasOwnProperty("highlightStyleAttribute")) {
              if (!$util.isInteger(message.highlightStyleAttribute))
                return "highlightStyleAttribute: integer expected";
            }
            return null;
          };
          StyleMapProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.StyleMapProto)
              return object;
            var message = new $root.keyhole.dbroot.StyleMapProto();
            if (object.styleMapId != null)
              message.styleMapId = object.styleMapId | 0;
            if (object.channelId) {
              if (!Array.isArray(object.channelId))
                throw TypeError(".keyhole.dbroot.StyleMapProto.channelId: array expected");
              message.channelId = [];
              for (var i = 0; i < object.channelId.length; ++i)
                message.channelId[i] = object.channelId[i] | 0;
            }
            if (object.normalStyleAttribute != null)
              message.normalStyleAttribute = object.normalStyleAttribute | 0;
            if (object.highlightStyleAttribute != null)
              message.highlightStyleAttribute = object.highlightStyleAttribute | 0;
            return message;
          };
          StyleMapProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.arrays || options.defaults)
              object.channelId = [];
            if (options.defaults) {
              object.styleMapId = 0;
              object.normalStyleAttribute = 0;
              object.highlightStyleAttribute = 0;
            }
            if (message.styleMapId != null && message.hasOwnProperty("styleMapId"))
              object.styleMapId = message.styleMapId;
            if (message.channelId && message.channelId.length) {
              object.channelId = [];
              for (var j = 0; j < message.channelId.length; ++j)
                object.channelId[j] = message.channelId[j];
            }
            if (message.normalStyleAttribute != null && message.hasOwnProperty("normalStyleAttribute"))
              object.normalStyleAttribute = message.normalStyleAttribute;
            if (message.highlightStyleAttribute != null && message.hasOwnProperty("highlightStyleAttribute"))
              object.highlightStyleAttribute = message.highlightStyleAttribute;
            return object;
          };
          StyleMapProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          StyleMapProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.StyleMapProto";
          };
          return StyleMapProto;
        }();
        dbroot.ZoomRangeProto = function() {
          function ZoomRangeProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          ZoomRangeProto.prototype.minZoom = 0;
          ZoomRangeProto.prototype.maxZoom = 0;
          ZoomRangeProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.ZoomRangeProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.minZoom = reader.int32();
                  break;
                }
                case 2: {
                  message.maxZoom = reader.int32();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            if (!message.hasOwnProperty("minZoom"))
              throw $util.ProtocolError("missing required 'minZoom'", { instance: message });
            if (!message.hasOwnProperty("maxZoom"))
              throw $util.ProtocolError("missing required 'maxZoom'", { instance: message });
            return message;
          };
          ZoomRangeProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (!$util.isInteger(message.minZoom))
              return "minZoom: integer expected";
            if (!$util.isInteger(message.maxZoom))
              return "maxZoom: integer expected";
            return null;
          };
          ZoomRangeProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.ZoomRangeProto)
              return object;
            var message = new $root.keyhole.dbroot.ZoomRangeProto();
            if (object.minZoom != null)
              message.minZoom = object.minZoom | 0;
            if (object.maxZoom != null)
              message.maxZoom = object.maxZoom | 0;
            return message;
          };
          ZoomRangeProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.minZoom = 0;
              object.maxZoom = 0;
            }
            if (message.minZoom != null && message.hasOwnProperty("minZoom"))
              object.minZoom = message.minZoom;
            if (message.maxZoom != null && message.hasOwnProperty("maxZoom"))
              object.maxZoom = message.maxZoom;
            return object;
          };
          ZoomRangeProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          ZoomRangeProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.ZoomRangeProto";
          };
          return ZoomRangeProto;
        }();
        dbroot.DrawFlagProto = function() {
          function DrawFlagProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          DrawFlagProto.prototype.drawFlagType = 1;
          DrawFlagProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.DrawFlagProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.drawFlagType = reader.int32();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            if (!message.hasOwnProperty("drawFlagType"))
              throw $util.ProtocolError("missing required 'drawFlagType'", { instance: message });
            return message;
          };
          DrawFlagProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            switch (message.drawFlagType) {
              default:
                return "drawFlagType: enum value expected";
              case 1:
              case 2:
              case 3:
              case 4:
              case 5:
                break;
            }
            return null;
          };
          DrawFlagProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.DrawFlagProto)
              return object;
            var message = new $root.keyhole.dbroot.DrawFlagProto();
            switch (object.drawFlagType) {
              case "TYPE_FILL_ONLY":
              case 1:
                message.drawFlagType = 1;
                break;
              case "TYPE_OUTLINE_ONLY":
              case 2:
                message.drawFlagType = 2;
                break;
              case "TYPE_FILL_AND_OUTLINE":
              case 3:
                message.drawFlagType = 3;
                break;
              case "TYPE_ANTIALIASING":
              case 4:
                message.drawFlagType = 4;
                break;
              case "TYPE_CENTER_LABEL":
              case 5:
                message.drawFlagType = 5;
                break;
            }
            return message;
          };
          DrawFlagProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults)
              object.drawFlagType = options.enums === String ? "TYPE_FILL_ONLY" : 1;
            if (message.drawFlagType != null && message.hasOwnProperty("drawFlagType"))
              object.drawFlagType = options.enums === String ? $root.keyhole.dbroot.DrawFlagProto.DrawFlagType[message.drawFlagType] : message.drawFlagType;
            return object;
          };
          DrawFlagProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          DrawFlagProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.DrawFlagProto";
          };
          DrawFlagProto.DrawFlagType = function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "TYPE_FILL_ONLY"] = 1;
            values[valuesById[2] = "TYPE_OUTLINE_ONLY"] = 2;
            values[valuesById[3] = "TYPE_FILL_AND_OUTLINE"] = 3;
            values[valuesById[4] = "TYPE_ANTIALIASING"] = 4;
            values[valuesById[5] = "TYPE_CENTER_LABEL"] = 5;
            return values;
          }();
          return DrawFlagProto;
        }();
        dbroot.LayerProto = function() {
          function LayerProto(properties) {
            this.zoomRange = [];
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          LayerProto.prototype.zoomRange = $util.emptyArray;
          LayerProto.prototype.preserveTextLevel = 30;
          LayerProto.prototype.lodBeginTransition = false;
          LayerProto.prototype.lodEndTransition = false;
          LayerProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.LayerProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  if (!(message.zoomRange && message.zoomRange.length))
                    message.zoomRange = [];
                  message.zoomRange.push($root.keyhole.dbroot.ZoomRangeProto.decode(reader, reader.uint32()));
                  break;
                }
                case 2: {
                  message.preserveTextLevel = reader.int32();
                  break;
                }
                case 4: {
                  message.lodBeginTransition = reader.bool();
                  break;
                }
                case 5: {
                  message.lodEndTransition = reader.bool();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            return message;
          };
          LayerProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (message.zoomRange != null && message.hasOwnProperty("zoomRange")) {
              if (!Array.isArray(message.zoomRange))
                return "zoomRange: array expected";
              for (var i = 0; i < message.zoomRange.length; ++i) {
                var error = $root.keyhole.dbroot.ZoomRangeProto.verify(message.zoomRange[i]);
                if (error)
                  return "zoomRange." + error;
              }
            }
            if (message.preserveTextLevel != null && message.hasOwnProperty("preserveTextLevel")) {
              if (!$util.isInteger(message.preserveTextLevel))
                return "preserveTextLevel: integer expected";
            }
            if (message.lodBeginTransition != null && message.hasOwnProperty("lodBeginTransition")) {
              if (typeof message.lodBeginTransition !== "boolean")
                return "lodBeginTransition: boolean expected";
            }
            if (message.lodEndTransition != null && message.hasOwnProperty("lodEndTransition")) {
              if (typeof message.lodEndTransition !== "boolean")
                return "lodEndTransition: boolean expected";
            }
            return null;
          };
          LayerProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.LayerProto)
              return object;
            var message = new $root.keyhole.dbroot.LayerProto();
            if (object.zoomRange) {
              if (!Array.isArray(object.zoomRange))
                throw TypeError(".keyhole.dbroot.LayerProto.zoomRange: array expected");
              message.zoomRange = [];
              for (var i = 0; i < object.zoomRange.length; ++i) {
                if (typeof object.zoomRange[i] !== "object")
                  throw TypeError(".keyhole.dbroot.LayerProto.zoomRange: object expected");
                message.zoomRange[i] = $root.keyhole.dbroot.ZoomRangeProto.fromObject(object.zoomRange[i]);
              }
            }
            if (object.preserveTextLevel != null)
              message.preserveTextLevel = object.preserveTextLevel | 0;
            if (object.lodBeginTransition != null)
              message.lodBeginTransition = Boolean(object.lodBeginTransition);
            if (object.lodEndTransition != null)
              message.lodEndTransition = Boolean(object.lodEndTransition);
            return message;
          };
          LayerProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.arrays || options.defaults)
              object.zoomRange = [];
            if (options.defaults) {
              object.preserveTextLevel = 30;
              object.lodBeginTransition = false;
              object.lodEndTransition = false;
            }
            if (message.zoomRange && message.zoomRange.length) {
              object.zoomRange = [];
              for (var j = 0; j < message.zoomRange.length; ++j)
                object.zoomRange[j] = $root.keyhole.dbroot.ZoomRangeProto.toObject(message.zoomRange[j], options);
            }
            if (message.preserveTextLevel != null && message.hasOwnProperty("preserveTextLevel"))
              object.preserveTextLevel = message.preserveTextLevel;
            if (message.lodBeginTransition != null && message.hasOwnProperty("lodBeginTransition"))
              object.lodBeginTransition = message.lodBeginTransition;
            if (message.lodEndTransition != null && message.hasOwnProperty("lodEndTransition"))
              object.lodEndTransition = message.lodEndTransition;
            return object;
          };
          LayerProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          LayerProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.LayerProto";
          };
          return LayerProto;
        }();
        dbroot.FolderProto = function() {
          function FolderProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          FolderProto.prototype.isExpandable = true;
          FolderProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.FolderProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.isExpandable = reader.bool();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            return message;
          };
          FolderProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (message.isExpandable != null && message.hasOwnProperty("isExpandable")) {
              if (typeof message.isExpandable !== "boolean")
                return "isExpandable: boolean expected";
            }
            return null;
          };
          FolderProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.FolderProto)
              return object;
            var message = new $root.keyhole.dbroot.FolderProto();
            if (object.isExpandable != null)
              message.isExpandable = Boolean(object.isExpandable);
            return message;
          };
          FolderProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults)
              object.isExpandable = true;
            if (message.isExpandable != null && message.hasOwnProperty("isExpandable"))
              object.isExpandable = message.isExpandable;
            return object;
          };
          FolderProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          FolderProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.FolderProto";
          };
          return FolderProto;
        }();
        dbroot.RequirementProto = function() {
          function RequirementProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          RequirementProto.prototype.requiredVram = "";
          RequirementProto.prototype.requiredClientVer = "";
          RequirementProto.prototype.probability = "";
          RequirementProto.prototype.requiredUserAgent = "";
          RequirementProto.prototype.requiredClientCapabilities = "";
          RequirementProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.RequirementProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 3: {
                  message.requiredVram = reader.string();
                  break;
                }
                case 4: {
                  message.requiredClientVer = reader.string();
                  break;
                }
                case 5: {
                  message.probability = reader.string();
                  break;
                }
                case 6: {
                  message.requiredUserAgent = reader.string();
                  break;
                }
                case 7: {
                  message.requiredClientCapabilities = reader.string();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            return message;
          };
          RequirementProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (message.requiredVram != null && message.hasOwnProperty("requiredVram")) {
              if (!$util.isString(message.requiredVram))
                return "requiredVram: string expected";
            }
            if (message.requiredClientVer != null && message.hasOwnProperty("requiredClientVer")) {
              if (!$util.isString(message.requiredClientVer))
                return "requiredClientVer: string expected";
            }
            if (message.probability != null && message.hasOwnProperty("probability")) {
              if (!$util.isString(message.probability))
                return "probability: string expected";
            }
            if (message.requiredUserAgent != null && message.hasOwnProperty("requiredUserAgent")) {
              if (!$util.isString(message.requiredUserAgent))
                return "requiredUserAgent: string expected";
            }
            if (message.requiredClientCapabilities != null && message.hasOwnProperty("requiredClientCapabilities")) {
              if (!$util.isString(message.requiredClientCapabilities))
                return "requiredClientCapabilities: string expected";
            }
            return null;
          };
          RequirementProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.RequirementProto)
              return object;
            var message = new $root.keyhole.dbroot.RequirementProto();
            if (object.requiredVram != null)
              message.requiredVram = String(object.requiredVram);
            if (object.requiredClientVer != null)
              message.requiredClientVer = String(object.requiredClientVer);
            if (object.probability != null)
              message.probability = String(object.probability);
            if (object.requiredUserAgent != null)
              message.requiredUserAgent = String(object.requiredUserAgent);
            if (object.requiredClientCapabilities != null)
              message.requiredClientCapabilities = String(object.requiredClientCapabilities);
            return message;
          };
          RequirementProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.requiredVram = "";
              object.requiredClientVer = "";
              object.probability = "";
              object.requiredUserAgent = "";
              object.requiredClientCapabilities = "";
            }
            if (message.requiredVram != null && message.hasOwnProperty("requiredVram"))
              object.requiredVram = message.requiredVram;
            if (message.requiredClientVer != null && message.hasOwnProperty("requiredClientVer"))
              object.requiredClientVer = message.requiredClientVer;
            if (message.probability != null && message.hasOwnProperty("probability"))
              object.probability = message.probability;
            if (message.requiredUserAgent != null && message.hasOwnProperty("requiredUserAgent"))
              object.requiredUserAgent = message.requiredUserAgent;
            if (message.requiredClientCapabilities != null && message.hasOwnProperty("requiredClientCapabilities"))
              object.requiredClientCapabilities = message.requiredClientCapabilities;
            return object;
          };
          RequirementProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          RequirementProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.RequirementProto";
          };
          return RequirementProto;
        }();
        dbroot.LookAtProto = function() {
          function LookAtProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          LookAtProto.prototype.longitude = 0;
          LookAtProto.prototype.latitude = 0;
          LookAtProto.prototype.range = 0;
          LookAtProto.prototype.tilt = 0;
          LookAtProto.prototype.heading = 0;
          LookAtProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.LookAtProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.longitude = reader.float();
                  break;
                }
                case 2: {
                  message.latitude = reader.float();
                  break;
                }
                case 3: {
                  message.range = reader.float();
                  break;
                }
                case 4: {
                  message.tilt = reader.float();
                  break;
                }
                case 5: {
                  message.heading = reader.float();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            if (!message.hasOwnProperty("longitude"))
              throw $util.ProtocolError("missing required 'longitude'", { instance: message });
            if (!message.hasOwnProperty("latitude"))
              throw $util.ProtocolError("missing required 'latitude'", { instance: message });
            return message;
          };
          LookAtProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (typeof message.longitude !== "number")
              return "longitude: number expected";
            if (typeof message.latitude !== "number")
              return "latitude: number expected";
            if (message.range != null && message.hasOwnProperty("range")) {
              if (typeof message.range !== "number")
                return "range: number expected";
            }
            if (message.tilt != null && message.hasOwnProperty("tilt")) {
              if (typeof message.tilt !== "number")
                return "tilt: number expected";
            }
            if (message.heading != null && message.hasOwnProperty("heading")) {
              if (typeof message.heading !== "number")
                return "heading: number expected";
            }
            return null;
          };
          LookAtProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.LookAtProto)
              return object;
            var message = new $root.keyhole.dbroot.LookAtProto();
            if (object.longitude != null)
              message.longitude = Number(object.longitude);
            if (object.latitude != null)
              message.latitude = Number(object.latitude);
            if (object.range != null)
              message.range = Number(object.range);
            if (object.tilt != null)
              message.tilt = Number(object.tilt);
            if (object.heading != null)
              message.heading = Number(object.heading);
            return message;
          };
          LookAtProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.longitude = 0;
              object.latitude = 0;
              object.range = 0;
              object.tilt = 0;
              object.heading = 0;
            }
            if (message.longitude != null && message.hasOwnProperty("longitude"))
              object.longitude = options.json && !isFinite(message.longitude) ? String(message.longitude) : message.longitude;
            if (message.latitude != null && message.hasOwnProperty("latitude"))
              object.latitude = options.json && !isFinite(message.latitude) ? String(message.latitude) : message.latitude;
            if (message.range != null && message.hasOwnProperty("range"))
              object.range = options.json && !isFinite(message.range) ? String(message.range) : message.range;
            if (message.tilt != null && message.hasOwnProperty("tilt"))
              object.tilt = options.json && !isFinite(message.tilt) ? String(message.tilt) : message.tilt;
            if (message.heading != null && message.hasOwnProperty("heading"))
              object.heading = options.json && !isFinite(message.heading) ? String(message.heading) : message.heading;
            return object;
          };
          LookAtProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          LookAtProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.LookAtProto";
          };
          return LookAtProto;
        }();
        dbroot.NestedFeatureProto = function() {
          function NestedFeatureProto(properties) {
            this.children = [];
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          NestedFeatureProto.prototype.featureType = 1;
          NestedFeatureProto.prototype.kmlUrl = null;
          NestedFeatureProto.prototype.databaseUrl = "";
          NestedFeatureProto.prototype.layer = null;
          NestedFeatureProto.prototype.folder = null;
          NestedFeatureProto.prototype.requirement = null;
          NestedFeatureProto.prototype.channelId = 0;
          NestedFeatureProto.prototype.displayName = null;
          NestedFeatureProto.prototype.isVisible = true;
          NestedFeatureProto.prototype.isEnabled = true;
          NestedFeatureProto.prototype.isChecked = false;
          NestedFeatureProto.prototype.layerMenuIconPath = "icons/773_l.png";
          NestedFeatureProto.prototype.description = null;
          NestedFeatureProto.prototype.lookAt = null;
          NestedFeatureProto.prototype.assetUuid = "";
          NestedFeatureProto.prototype.isSaveLocked = true;
          NestedFeatureProto.prototype.children = $util.emptyArray;
          NestedFeatureProto.prototype.clientConfigScriptName = "";
          NestedFeatureProto.prototype.dioramaDataChannelBase = -1;
          NestedFeatureProto.prototype.replicaDataChannelBase = -1;
          NestedFeatureProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.NestedFeatureProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.featureType = reader.int32();
                  break;
                }
                case 2: {
                  message.kmlUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 21: {
                  message.databaseUrl = reader.string();
                  break;
                }
                case 3: {
                  message.layer = $root.keyhole.dbroot.LayerProto.decode(reader, reader.uint32());
                  break;
                }
                case 4: {
                  message.folder = $root.keyhole.dbroot.FolderProto.decode(reader, reader.uint32());
                  break;
                }
                case 5: {
                  message.requirement = $root.keyhole.dbroot.RequirementProto.decode(reader, reader.uint32());
                  break;
                }
                case 6: {
                  message.channelId = reader.int32();
                  break;
                }
                case 7: {
                  message.displayName = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 8: {
                  message.isVisible = reader.bool();
                  break;
                }
                case 9: {
                  message.isEnabled = reader.bool();
                  break;
                }
                case 10: {
                  message.isChecked = reader.bool();
                  break;
                }
                case 11: {
                  message.layerMenuIconPath = reader.string();
                  break;
                }
                case 12: {
                  message.description = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 13: {
                  message.lookAt = $root.keyhole.dbroot.LookAtProto.decode(reader, reader.uint32());
                  break;
                }
                case 15: {
                  message.assetUuid = reader.string();
                  break;
                }
                case 16: {
                  message.isSaveLocked = reader.bool();
                  break;
                }
                case 17: {
                  if (!(message.children && message.children.length))
                    message.children = [];
                  message.children.push($root.keyhole.dbroot.NestedFeatureProto.decode(reader, reader.uint32()));
                  break;
                }
                case 18: {
                  message.clientConfigScriptName = reader.string();
                  break;
                }
                case 19: {
                  message.dioramaDataChannelBase = reader.int32();
                  break;
                }
                case 20: {
                  message.replicaDataChannelBase = reader.int32();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            if (!message.hasOwnProperty("channelId"))
              throw $util.ProtocolError("missing required 'channelId'", { instance: message });
            return message;
          };
          NestedFeatureProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (message.featureType != null && message.hasOwnProperty("featureType"))
              switch (message.featureType) {
                default:
                  return "featureType: enum value expected";
                case 1:
                case 2:
                case 3:
                case 4:
                  break;
              }
            if (message.kmlUrl != null && message.hasOwnProperty("kmlUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.kmlUrl);
              if (error)
                return "kmlUrl." + error;
            }
            if (message.databaseUrl != null && message.hasOwnProperty("databaseUrl")) {
              if (!$util.isString(message.databaseUrl))
                return "databaseUrl: string expected";
            }
            if (message.layer != null && message.hasOwnProperty("layer")) {
              var error = $root.keyhole.dbroot.LayerProto.verify(message.layer);
              if (error)
                return "layer." + error;
            }
            if (message.folder != null && message.hasOwnProperty("folder")) {
              var error = $root.keyhole.dbroot.FolderProto.verify(message.folder);
              if (error)
                return "folder." + error;
            }
            if (message.requirement != null && message.hasOwnProperty("requirement")) {
              var error = $root.keyhole.dbroot.RequirementProto.verify(message.requirement);
              if (error)
                return "requirement." + error;
            }
            if (!$util.isInteger(message.channelId))
              return "channelId: integer expected";
            if (message.displayName != null && message.hasOwnProperty("displayName")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.displayName);
              if (error)
                return "displayName." + error;
            }
            if (message.isVisible != null && message.hasOwnProperty("isVisible")) {
              if (typeof message.isVisible !== "boolean")
                return "isVisible: boolean expected";
            }
            if (message.isEnabled != null && message.hasOwnProperty("isEnabled")) {
              if (typeof message.isEnabled !== "boolean")
                return "isEnabled: boolean expected";
            }
            if (message.isChecked != null && message.hasOwnProperty("isChecked")) {
              if (typeof message.isChecked !== "boolean")
                return "isChecked: boolean expected";
            }
            if (message.layerMenuIconPath != null && message.hasOwnProperty("layerMenuIconPath")) {
              if (!$util.isString(message.layerMenuIconPath))
                return "layerMenuIconPath: string expected";
            }
            if (message.description != null && message.hasOwnProperty("description")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.description);
              if (error)
                return "description." + error;
            }
            if (message.lookAt != null && message.hasOwnProperty("lookAt")) {
              var error = $root.keyhole.dbroot.LookAtProto.verify(message.lookAt);
              if (error)
                return "lookAt." + error;
            }
            if (message.assetUuid != null && message.hasOwnProperty("assetUuid")) {
              if (!$util.isString(message.assetUuid))
                return "assetUuid: string expected";
            }
            if (message.isSaveLocked != null && message.hasOwnProperty("isSaveLocked")) {
              if (typeof message.isSaveLocked !== "boolean")
                return "isSaveLocked: boolean expected";
            }
            if (message.children != null && message.hasOwnProperty("children")) {
              if (!Array.isArray(message.children))
                return "children: array expected";
              for (var i = 0; i < message.children.length; ++i) {
                var error = $root.keyhole.dbroot.NestedFeatureProto.verify(message.children[i]);
                if (error)
                  return "children." + error;
              }
            }
            if (message.clientConfigScriptName != null && message.hasOwnProperty("clientConfigScriptName")) {
              if (!$util.isString(message.clientConfigScriptName))
                return "clientConfigScriptName: string expected";
            }
            if (message.dioramaDataChannelBase != null && message.hasOwnProperty("dioramaDataChannelBase")) {
              if (!$util.isInteger(message.dioramaDataChannelBase))
                return "dioramaDataChannelBase: integer expected";
            }
            if (message.replicaDataChannelBase != null && message.hasOwnProperty("replicaDataChannelBase")) {
              if (!$util.isInteger(message.replicaDataChannelBase))
                return "replicaDataChannelBase: integer expected";
            }
            return null;
          };
          NestedFeatureProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.NestedFeatureProto)
              return object;
            var message = new $root.keyhole.dbroot.NestedFeatureProto();
            switch (object.featureType) {
              case "TYPE_POINT_Z":
              case 1:
                message.featureType = 1;
                break;
              case "TYPE_POLYGON_Z":
              case 2:
                message.featureType = 2;
                break;
              case "TYPE_LINE_Z":
              case 3:
                message.featureType = 3;
                break;
              case "TYPE_TERRAIN":
              case 4:
                message.featureType = 4;
                break;
            }
            if (object.kmlUrl != null) {
              if (typeof object.kmlUrl !== "object")
                throw TypeError(".keyhole.dbroot.NestedFeatureProto.kmlUrl: object expected");
              message.kmlUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.kmlUrl);
            }
            if (object.databaseUrl != null)
              message.databaseUrl = String(object.databaseUrl);
            if (object.layer != null) {
              if (typeof object.layer !== "object")
                throw TypeError(".keyhole.dbroot.NestedFeatureProto.layer: object expected");
              message.layer = $root.keyhole.dbroot.LayerProto.fromObject(object.layer);
            }
            if (object.folder != null) {
              if (typeof object.folder !== "object")
                throw TypeError(".keyhole.dbroot.NestedFeatureProto.folder: object expected");
              message.folder = $root.keyhole.dbroot.FolderProto.fromObject(object.folder);
            }
            if (object.requirement != null) {
              if (typeof object.requirement !== "object")
                throw TypeError(".keyhole.dbroot.NestedFeatureProto.requirement: object expected");
              message.requirement = $root.keyhole.dbroot.RequirementProto.fromObject(object.requirement);
            }
            if (object.channelId != null)
              message.channelId = object.channelId | 0;
            if (object.displayName != null) {
              if (typeof object.displayName !== "object")
                throw TypeError(".keyhole.dbroot.NestedFeatureProto.displayName: object expected");
              message.displayName = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.displayName);
            }
            if (object.isVisible != null)
              message.isVisible = Boolean(object.isVisible);
            if (object.isEnabled != null)
              message.isEnabled = Boolean(object.isEnabled);
            if (object.isChecked != null)
              message.isChecked = Boolean(object.isChecked);
            if (object.layerMenuIconPath != null)
              message.layerMenuIconPath = String(object.layerMenuIconPath);
            if (object.description != null) {
              if (typeof object.description !== "object")
                throw TypeError(".keyhole.dbroot.NestedFeatureProto.description: object expected");
              message.description = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.description);
            }
            if (object.lookAt != null) {
              if (typeof object.lookAt !== "object")
                throw TypeError(".keyhole.dbroot.NestedFeatureProto.lookAt: object expected");
              message.lookAt = $root.keyhole.dbroot.LookAtProto.fromObject(object.lookAt);
            }
            if (object.assetUuid != null)
              message.assetUuid = String(object.assetUuid);
            if (object.isSaveLocked != null)
              message.isSaveLocked = Boolean(object.isSaveLocked);
            if (object.children) {
              if (!Array.isArray(object.children))
                throw TypeError(".keyhole.dbroot.NestedFeatureProto.children: array expected");
              message.children = [];
              for (var i = 0; i < object.children.length; ++i) {
                if (typeof object.children[i] !== "object")
                  throw TypeError(".keyhole.dbroot.NestedFeatureProto.children: object expected");
                message.children[i] = $root.keyhole.dbroot.NestedFeatureProto.fromObject(object.children[i]);
              }
            }
            if (object.clientConfigScriptName != null)
              message.clientConfigScriptName = String(object.clientConfigScriptName);
            if (object.dioramaDataChannelBase != null)
              message.dioramaDataChannelBase = object.dioramaDataChannelBase | 0;
            if (object.replicaDataChannelBase != null)
              message.replicaDataChannelBase = object.replicaDataChannelBase | 0;
            return message;
          };
          NestedFeatureProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.arrays || options.defaults)
              object.children = [];
            if (options.defaults) {
              object.featureType = options.enums === String ? "TYPE_POINT_Z" : 1;
              object.kmlUrl = null;
              object.layer = null;
              object.folder = null;
              object.requirement = null;
              object.channelId = 0;
              object.displayName = null;
              object.isVisible = true;
              object.isEnabled = true;
              object.isChecked = false;
              object.layerMenuIconPath = "icons/773_l.png";
              object.description = null;
              object.lookAt = null;
              object.assetUuid = "";
              object.isSaveLocked = true;
              object.clientConfigScriptName = "";
              object.dioramaDataChannelBase = -1;
              object.replicaDataChannelBase = -1;
              object.databaseUrl = "";
            }
            if (message.featureType != null && message.hasOwnProperty("featureType"))
              object.featureType = options.enums === String ? $root.keyhole.dbroot.NestedFeatureProto.FeatureType[message.featureType] : message.featureType;
            if (message.kmlUrl != null && message.hasOwnProperty("kmlUrl"))
              object.kmlUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.kmlUrl, options);
            if (message.layer != null && message.hasOwnProperty("layer"))
              object.layer = $root.keyhole.dbroot.LayerProto.toObject(message.layer, options);
            if (message.folder != null && message.hasOwnProperty("folder"))
              object.folder = $root.keyhole.dbroot.FolderProto.toObject(message.folder, options);
            if (message.requirement != null && message.hasOwnProperty("requirement"))
              object.requirement = $root.keyhole.dbroot.RequirementProto.toObject(message.requirement, options);
            if (message.channelId != null && message.hasOwnProperty("channelId"))
              object.channelId = message.channelId;
            if (message.displayName != null && message.hasOwnProperty("displayName"))
              object.displayName = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.displayName, options);
            if (message.isVisible != null && message.hasOwnProperty("isVisible"))
              object.isVisible = message.isVisible;
            if (message.isEnabled != null && message.hasOwnProperty("isEnabled"))
              object.isEnabled = message.isEnabled;
            if (message.isChecked != null && message.hasOwnProperty("isChecked"))
              object.isChecked = message.isChecked;
            if (message.layerMenuIconPath != null && message.hasOwnProperty("layerMenuIconPath"))
              object.layerMenuIconPath = message.layerMenuIconPath;
            if (message.description != null && message.hasOwnProperty("description"))
              object.description = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.description, options);
            if (message.lookAt != null && message.hasOwnProperty("lookAt"))
              object.lookAt = $root.keyhole.dbroot.LookAtProto.toObject(message.lookAt, options);
            if (message.assetUuid != null && message.hasOwnProperty("assetUuid"))
              object.assetUuid = message.assetUuid;
            if (message.isSaveLocked != null && message.hasOwnProperty("isSaveLocked"))
              object.isSaveLocked = message.isSaveLocked;
            if (message.children && message.children.length) {
              object.children = [];
              for (var j = 0; j < message.children.length; ++j)
                object.children[j] = $root.keyhole.dbroot.NestedFeatureProto.toObject(message.children[j], options);
            }
            if (message.clientConfigScriptName != null && message.hasOwnProperty("clientConfigScriptName"))
              object.clientConfigScriptName = message.clientConfigScriptName;
            if (message.dioramaDataChannelBase != null && message.hasOwnProperty("dioramaDataChannelBase"))
              object.dioramaDataChannelBase = message.dioramaDataChannelBase;
            if (message.replicaDataChannelBase != null && message.hasOwnProperty("replicaDataChannelBase"))
              object.replicaDataChannelBase = message.replicaDataChannelBase;
            if (message.databaseUrl != null && message.hasOwnProperty("databaseUrl"))
              object.databaseUrl = message.databaseUrl;
            return object;
          };
          NestedFeatureProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          NestedFeatureProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.NestedFeatureProto";
          };
          NestedFeatureProto.FeatureType = function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[1] = "TYPE_POINT_Z"] = 1;
            values[valuesById[2] = "TYPE_POLYGON_Z"] = 2;
            values[valuesById[3] = "TYPE_LINE_Z"] = 3;
            values[valuesById[4] = "TYPE_TERRAIN"] = 4;
            return values;
          }();
          return NestedFeatureProto;
        }();
        dbroot.MfeDomainFeaturesProto = function() {
          function MfeDomainFeaturesProto(properties) {
            this.supportedFeatures = [];
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          MfeDomainFeaturesProto.prototype.countryCode = "";
          MfeDomainFeaturesProto.prototype.domainName = "";
          MfeDomainFeaturesProto.prototype.supportedFeatures = $util.emptyArray;
          MfeDomainFeaturesProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.MfeDomainFeaturesProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.countryCode = reader.string();
                  break;
                }
                case 2: {
                  message.domainName = reader.string();
                  break;
                }
                case 3: {
                  if (!(message.supportedFeatures && message.supportedFeatures.length))
                    message.supportedFeatures = [];
                  if ((tag & 7) === 2) {
                    var end2 = reader.uint32() + reader.pos;
                    while (reader.pos < end2)
                      message.supportedFeatures.push(reader.int32());
                  } else
                    message.supportedFeatures.push(reader.int32());
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            if (!message.hasOwnProperty("countryCode"))
              throw $util.ProtocolError("missing required 'countryCode'", { instance: message });
            if (!message.hasOwnProperty("domainName"))
              throw $util.ProtocolError("missing required 'domainName'", { instance: message });
            return message;
          };
          MfeDomainFeaturesProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (!$util.isString(message.countryCode))
              return "countryCode: string expected";
            if (!$util.isString(message.domainName))
              return "domainName: string expected";
            if (message.supportedFeatures != null && message.hasOwnProperty("supportedFeatures")) {
              if (!Array.isArray(message.supportedFeatures))
                return "supportedFeatures: array expected";
              for (var i = 0; i < message.supportedFeatures.length; ++i)
                switch (message.supportedFeatures[i]) {
                  default:
                    return "supportedFeatures: enum value[] expected";
                  case 0:
                  case 1:
                  case 2:
                    break;
                }
            }
            return null;
          };
          MfeDomainFeaturesProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.MfeDomainFeaturesProto)
              return object;
            var message = new $root.keyhole.dbroot.MfeDomainFeaturesProto();
            if (object.countryCode != null)
              message.countryCode = String(object.countryCode);
            if (object.domainName != null)
              message.domainName = String(object.domainName);
            if (object.supportedFeatures) {
              if (!Array.isArray(object.supportedFeatures))
                throw TypeError(".keyhole.dbroot.MfeDomainFeaturesProto.supportedFeatures: array expected");
              message.supportedFeatures = [];
              for (var i = 0; i < object.supportedFeatures.length; ++i)
                switch (object.supportedFeatures[i]) {
                  default:
                  case "GEOCODING":
                  case 0:
                    message.supportedFeatures[i] = 0;
                    break;
                  case "LOCAL_SEARCH":
                  case 1:
                    message.supportedFeatures[i] = 1;
                    break;
                  case "DRIVING_DIRECTIONS":
                  case 2:
                    message.supportedFeatures[i] = 2;
                    break;
                }
            }
            return message;
          };
          MfeDomainFeaturesProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.arrays || options.defaults)
              object.supportedFeatures = [];
            if (options.defaults) {
              object.countryCode = "";
              object.domainName = "";
            }
            if (message.countryCode != null && message.hasOwnProperty("countryCode"))
              object.countryCode = message.countryCode;
            if (message.domainName != null && message.hasOwnProperty("domainName"))
              object.domainName = message.domainName;
            if (message.supportedFeatures && message.supportedFeatures.length) {
              object.supportedFeatures = [];
              for (var j = 0; j < message.supportedFeatures.length; ++j)
                object.supportedFeatures[j] = options.enums === String ? $root.keyhole.dbroot.MfeDomainFeaturesProto.SupportedFeature[message.supportedFeatures[j]] : message.supportedFeatures[j];
            }
            return object;
          };
          MfeDomainFeaturesProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          MfeDomainFeaturesProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.MfeDomainFeaturesProto";
          };
          MfeDomainFeaturesProto.SupportedFeature = function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "GEOCODING"] = 0;
            values[valuesById[1] = "LOCAL_SEARCH"] = 1;
            values[valuesById[2] = "DRIVING_DIRECTIONS"] = 2;
            return values;
          }();
          return MfeDomainFeaturesProto;
        }();
        dbroot.ClientOptionsProto = function() {
          function ClientOptionsProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          ClientOptionsProto.prototype.disableDiskCache = false;
          ClientOptionsProto.prototype.disableEmbeddedBrowserVista = false;
          ClientOptionsProto.prototype.drawAtmosphere = true;
          ClientOptionsProto.prototype.drawStars = true;
          ClientOptionsProto.prototype.shaderFilePrefix = "";
          ClientOptionsProto.prototype.useProtobufQuadtreePackets = false;
          ClientOptionsProto.prototype.useExtendedCopyrightIds = true;
          ClientOptionsProto.prototype.precipitationsOptions = null;
          ClientOptionsProto.prototype.captureOptions = null;
          ClientOptionsProto.prototype.show_2dMapsIcon = true;
          ClientOptionsProto.prototype.disableInternalBrowser = false;
          ClientOptionsProto.prototype.internalBrowserBlacklist = "";
          ClientOptionsProto.prototype.internalBrowserOriginWhitelist = "*";
          ClientOptionsProto.prototype.polarTileMergingLevel = 0;
          ClientOptionsProto.prototype.jsBridgeRequestWhitelist = "http://*.google.com/*";
          ClientOptionsProto.prototype.mapsOptions = null;
          ClientOptionsProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.ClientOptionsProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.disableDiskCache = reader.bool();
                  break;
                }
                case 2: {
                  message.disableEmbeddedBrowserVista = reader.bool();
                  break;
                }
                case 3: {
                  message.drawAtmosphere = reader.bool();
                  break;
                }
                case 4: {
                  message.drawStars = reader.bool();
                  break;
                }
                case 5: {
                  message.shaderFilePrefix = reader.string();
                  break;
                }
                case 6: {
                  message.useProtobufQuadtreePackets = reader.bool();
                  break;
                }
                case 7: {
                  message.useExtendedCopyrightIds = reader.bool();
                  break;
                }
                case 8: {
                  message.precipitationsOptions = $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.decode(reader, reader.uint32());
                  break;
                }
                case 9: {
                  message.captureOptions = $root.keyhole.dbroot.ClientOptionsProto.CaptureOptions.decode(reader, reader.uint32());
                  break;
                }
                case 10: {
                  message.show_2dMapsIcon = reader.bool();
                  break;
                }
                case 11: {
                  message.disableInternalBrowser = reader.bool();
                  break;
                }
                case 12: {
                  message.internalBrowserBlacklist = reader.string();
                  break;
                }
                case 13: {
                  message.internalBrowserOriginWhitelist = reader.string();
                  break;
                }
                case 14: {
                  message.polarTileMergingLevel = reader.int32();
                  break;
                }
                case 15: {
                  message.jsBridgeRequestWhitelist = reader.string();
                  break;
                }
                case 16: {
                  message.mapsOptions = $root.keyhole.dbroot.ClientOptionsProto.MapsOptions.decode(reader, reader.uint32());
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            return message;
          };
          ClientOptionsProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (message.disableDiskCache != null && message.hasOwnProperty("disableDiskCache")) {
              if (typeof message.disableDiskCache !== "boolean")
                return "disableDiskCache: boolean expected";
            }
            if (message.disableEmbeddedBrowserVista != null && message.hasOwnProperty("disableEmbeddedBrowserVista")) {
              if (typeof message.disableEmbeddedBrowserVista !== "boolean")
                return "disableEmbeddedBrowserVista: boolean expected";
            }
            if (message.drawAtmosphere != null && message.hasOwnProperty("drawAtmosphere")) {
              if (typeof message.drawAtmosphere !== "boolean")
                return "drawAtmosphere: boolean expected";
            }
            if (message.drawStars != null && message.hasOwnProperty("drawStars")) {
              if (typeof message.drawStars !== "boolean")
                return "drawStars: boolean expected";
            }
            if (message.shaderFilePrefix != null && message.hasOwnProperty("shaderFilePrefix")) {
              if (!$util.isString(message.shaderFilePrefix))
                return "shaderFilePrefix: string expected";
            }
            if (message.useProtobufQuadtreePackets != null && message.hasOwnProperty("useProtobufQuadtreePackets")) {
              if (typeof message.useProtobufQuadtreePackets !== "boolean")
                return "useProtobufQuadtreePackets: boolean expected";
            }
            if (message.useExtendedCopyrightIds != null && message.hasOwnProperty("useExtendedCopyrightIds")) {
              if (typeof message.useExtendedCopyrightIds !== "boolean")
                return "useExtendedCopyrightIds: boolean expected";
            }
            if (message.precipitationsOptions != null && message.hasOwnProperty("precipitationsOptions")) {
              var error = $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.verify(message.precipitationsOptions);
              if (error)
                return "precipitationsOptions." + error;
            }
            if (message.captureOptions != null && message.hasOwnProperty("captureOptions")) {
              var error = $root.keyhole.dbroot.ClientOptionsProto.CaptureOptions.verify(message.captureOptions);
              if (error)
                return "captureOptions." + error;
            }
            if (message.show_2dMapsIcon != null && message.hasOwnProperty("show_2dMapsIcon")) {
              if (typeof message.show_2dMapsIcon !== "boolean")
                return "show_2dMapsIcon: boolean expected";
            }
            if (message.disableInternalBrowser != null && message.hasOwnProperty("disableInternalBrowser")) {
              if (typeof message.disableInternalBrowser !== "boolean")
                return "disableInternalBrowser: boolean expected";
            }
            if (message.internalBrowserBlacklist != null && message.hasOwnProperty("internalBrowserBlacklist")) {
              if (!$util.isString(message.internalBrowserBlacklist))
                return "internalBrowserBlacklist: string expected";
            }
            if (message.internalBrowserOriginWhitelist != null && message.hasOwnProperty("internalBrowserOriginWhitelist")) {
              if (!$util.isString(message.internalBrowserOriginWhitelist))
                return "internalBrowserOriginWhitelist: string expected";
            }
            if (message.polarTileMergingLevel != null && message.hasOwnProperty("polarTileMergingLevel")) {
              if (!$util.isInteger(message.polarTileMergingLevel))
                return "polarTileMergingLevel: integer expected";
            }
            if (message.jsBridgeRequestWhitelist != null && message.hasOwnProperty("jsBridgeRequestWhitelist")) {
              if (!$util.isString(message.jsBridgeRequestWhitelist))
                return "jsBridgeRequestWhitelist: string expected";
            }
            if (message.mapsOptions != null && message.hasOwnProperty("mapsOptions")) {
              var error = $root.keyhole.dbroot.ClientOptionsProto.MapsOptions.verify(message.mapsOptions);
              if (error)
                return "mapsOptions." + error;
            }
            return null;
          };
          ClientOptionsProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.ClientOptionsProto)
              return object;
            var message = new $root.keyhole.dbroot.ClientOptionsProto();
            if (object.disableDiskCache != null)
              message.disableDiskCache = Boolean(object.disableDiskCache);
            if (object.disableEmbeddedBrowserVista != null)
              message.disableEmbeddedBrowserVista = Boolean(object.disableEmbeddedBrowserVista);
            if (object.drawAtmosphere != null)
              message.drawAtmosphere = Boolean(object.drawAtmosphere);
            if (object.drawStars != null)
              message.drawStars = Boolean(object.drawStars);
            if (object.shaderFilePrefix != null)
              message.shaderFilePrefix = String(object.shaderFilePrefix);
            if (object.useProtobufQuadtreePackets != null)
              message.useProtobufQuadtreePackets = Boolean(object.useProtobufQuadtreePackets);
            if (object.useExtendedCopyrightIds != null)
              message.useExtendedCopyrightIds = Boolean(object.useExtendedCopyrightIds);
            if (object.precipitationsOptions != null) {
              if (typeof object.precipitationsOptions !== "object")
                throw TypeError(".keyhole.dbroot.ClientOptionsProto.precipitationsOptions: object expected");
              message.precipitationsOptions = $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.fromObject(object.precipitationsOptions);
            }
            if (object.captureOptions != null) {
              if (typeof object.captureOptions !== "object")
                throw TypeError(".keyhole.dbroot.ClientOptionsProto.captureOptions: object expected");
              message.captureOptions = $root.keyhole.dbroot.ClientOptionsProto.CaptureOptions.fromObject(object.captureOptions);
            }
            if (object.show_2dMapsIcon != null)
              message.show_2dMapsIcon = Boolean(object.show_2dMapsIcon);
            if (object.disableInternalBrowser != null)
              message.disableInternalBrowser = Boolean(object.disableInternalBrowser);
            if (object.internalBrowserBlacklist != null)
              message.internalBrowserBlacklist = String(object.internalBrowserBlacklist);
            if (object.internalBrowserOriginWhitelist != null)
              message.internalBrowserOriginWhitelist = String(object.internalBrowserOriginWhitelist);
            if (object.polarTileMergingLevel != null)
              message.polarTileMergingLevel = object.polarTileMergingLevel | 0;
            if (object.jsBridgeRequestWhitelist != null)
              message.jsBridgeRequestWhitelist = String(object.jsBridgeRequestWhitelist);
            if (object.mapsOptions != null) {
              if (typeof object.mapsOptions !== "object")
                throw TypeError(".keyhole.dbroot.ClientOptionsProto.mapsOptions: object expected");
              message.mapsOptions = $root.keyhole.dbroot.ClientOptionsProto.MapsOptions.fromObject(object.mapsOptions);
            }
            return message;
          };
          ClientOptionsProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.disableDiskCache = false;
              object.disableEmbeddedBrowserVista = false;
              object.drawAtmosphere = true;
              object.drawStars = true;
              object.shaderFilePrefix = "";
              object.useProtobufQuadtreePackets = false;
              object.useExtendedCopyrightIds = true;
              object.precipitationsOptions = null;
              object.captureOptions = null;
              object.show_2dMapsIcon = true;
              object.disableInternalBrowser = false;
              object.internalBrowserBlacklist = "";
              object.internalBrowserOriginWhitelist = "*";
              object.polarTileMergingLevel = 0;
              object.jsBridgeRequestWhitelist = "http://*.google.com/*";
              object.mapsOptions = null;
            }
            if (message.disableDiskCache != null && message.hasOwnProperty("disableDiskCache"))
              object.disableDiskCache = message.disableDiskCache;
            if (message.disableEmbeddedBrowserVista != null && message.hasOwnProperty("disableEmbeddedBrowserVista"))
              object.disableEmbeddedBrowserVista = message.disableEmbeddedBrowserVista;
            if (message.drawAtmosphere != null && message.hasOwnProperty("drawAtmosphere"))
              object.drawAtmosphere = message.drawAtmosphere;
            if (message.drawStars != null && message.hasOwnProperty("drawStars"))
              object.drawStars = message.drawStars;
            if (message.shaderFilePrefix != null && message.hasOwnProperty("shaderFilePrefix"))
              object.shaderFilePrefix = message.shaderFilePrefix;
            if (message.useProtobufQuadtreePackets != null && message.hasOwnProperty("useProtobufQuadtreePackets"))
              object.useProtobufQuadtreePackets = message.useProtobufQuadtreePackets;
            if (message.useExtendedCopyrightIds != null && message.hasOwnProperty("useExtendedCopyrightIds"))
              object.useExtendedCopyrightIds = message.useExtendedCopyrightIds;
            if (message.precipitationsOptions != null && message.hasOwnProperty("precipitationsOptions"))
              object.precipitationsOptions = $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.toObject(message.precipitationsOptions, options);
            if (message.captureOptions != null && message.hasOwnProperty("captureOptions"))
              object.captureOptions = $root.keyhole.dbroot.ClientOptionsProto.CaptureOptions.toObject(message.captureOptions, options);
            if (message.show_2dMapsIcon != null && message.hasOwnProperty("show_2dMapsIcon"))
              object.show_2dMapsIcon = message.show_2dMapsIcon;
            if (message.disableInternalBrowser != null && message.hasOwnProperty("disableInternalBrowser"))
              object.disableInternalBrowser = message.disableInternalBrowser;
            if (message.internalBrowserBlacklist != null && message.hasOwnProperty("internalBrowserBlacklist"))
              object.internalBrowserBlacklist = message.internalBrowserBlacklist;
            if (message.internalBrowserOriginWhitelist != null && message.hasOwnProperty("internalBrowserOriginWhitelist"))
              object.internalBrowserOriginWhitelist = message.internalBrowserOriginWhitelist;
            if (message.polarTileMergingLevel != null && message.hasOwnProperty("polarTileMergingLevel"))
              object.polarTileMergingLevel = message.polarTileMergingLevel;
            if (message.jsBridgeRequestWhitelist != null && message.hasOwnProperty("jsBridgeRequestWhitelist"))
              object.jsBridgeRequestWhitelist = message.jsBridgeRequestWhitelist;
            if (message.mapsOptions != null && message.hasOwnProperty("mapsOptions"))
              object.mapsOptions = $root.keyhole.dbroot.ClientOptionsProto.MapsOptions.toObject(message.mapsOptions, options);
            return object;
          };
          ClientOptionsProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          ClientOptionsProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.ClientOptionsProto";
          };
          ClientOptionsProto.PrecipitationsOptions = function() {
            function PrecipitationsOptions(properties) {
              this.weatherMapping = [];
              if (properties) {
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                  if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
              }
            }
            PrecipitationsOptions.prototype.imageUrl = "";
            PrecipitationsOptions.prototype.imageExpireTime = 900;
            PrecipitationsOptions.prototype.maxColorDistance = 20;
            PrecipitationsOptions.prototype.imageLevel = 5;
            PrecipitationsOptions.prototype.weatherMapping = $util.emptyArray;
            PrecipitationsOptions.prototype.cloudsLayerUrl = "";
            PrecipitationsOptions.prototype.animationDecelerationDelay = 20;
            PrecipitationsOptions.decode = function decode(reader, length) {
              if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
              var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions();
              while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                  case 1: {
                    message.imageUrl = reader.string();
                    break;
                  }
                  case 2: {
                    message.imageExpireTime = reader.int32();
                    break;
                  }
                  case 3: {
                    message.maxColorDistance = reader.int32();
                    break;
                  }
                  case 4: {
                    message.imageLevel = reader.int32();
                    break;
                  }
                  case 5: {
                    if (!(message.weatherMapping && message.weatherMapping.length))
                      message.weatherMapping = [];
                    message.weatherMapping.push($root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.WeatherMapping.decode(reader, reader.uint32()));
                    break;
                  }
                  case 6: {
                    message.cloudsLayerUrl = reader.string();
                    break;
                  }
                  case 7: {
                    message.animationDecelerationDelay = reader.float();
                    break;
                  }
                  default:
                    reader.skipType(tag & 7);
                    break;
                }
              }
              return message;
            };
            PrecipitationsOptions.verify = function verify(message) {
              if (typeof message !== "object" || message === null)
                return "object expected";
              if (message.imageUrl != null && message.hasOwnProperty("imageUrl")) {
                if (!$util.isString(message.imageUrl))
                  return "imageUrl: string expected";
              }
              if (message.imageExpireTime != null && message.hasOwnProperty("imageExpireTime")) {
                if (!$util.isInteger(message.imageExpireTime))
                  return "imageExpireTime: integer expected";
              }
              if (message.maxColorDistance != null && message.hasOwnProperty("maxColorDistance")) {
                if (!$util.isInteger(message.maxColorDistance))
                  return "maxColorDistance: integer expected";
              }
              if (message.imageLevel != null && message.hasOwnProperty("imageLevel")) {
                if (!$util.isInteger(message.imageLevel))
                  return "imageLevel: integer expected";
              }
              if (message.weatherMapping != null && message.hasOwnProperty("weatherMapping")) {
                if (!Array.isArray(message.weatherMapping))
                  return "weatherMapping: array expected";
                for (var i = 0; i < message.weatherMapping.length; ++i) {
                  var error = $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.WeatherMapping.verify(message.weatherMapping[i]);
                  if (error)
                    return "weatherMapping." + error;
                }
              }
              if (message.cloudsLayerUrl != null && message.hasOwnProperty("cloudsLayerUrl")) {
                if (!$util.isString(message.cloudsLayerUrl))
                  return "cloudsLayerUrl: string expected";
              }
              if (message.animationDecelerationDelay != null && message.hasOwnProperty("animationDecelerationDelay")) {
                if (typeof message.animationDecelerationDelay !== "number")
                  return "animationDecelerationDelay: number expected";
              }
              return null;
            };
            PrecipitationsOptions.fromObject = function fromObject(object) {
              if (object instanceof $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions)
                return object;
              var message = new $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions();
              if (object.imageUrl != null)
                message.imageUrl = String(object.imageUrl);
              if (object.imageExpireTime != null)
                message.imageExpireTime = object.imageExpireTime | 0;
              if (object.maxColorDistance != null)
                message.maxColorDistance = object.maxColorDistance | 0;
              if (object.imageLevel != null)
                message.imageLevel = object.imageLevel | 0;
              if (object.weatherMapping) {
                if (!Array.isArray(object.weatherMapping))
                  throw TypeError(".keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.weatherMapping: array expected");
                message.weatherMapping = [];
                for (var i = 0; i < object.weatherMapping.length; ++i) {
                  if (typeof object.weatherMapping[i] !== "object")
                    throw TypeError(".keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.weatherMapping: object expected");
                  message.weatherMapping[i] = $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.WeatherMapping.fromObject(object.weatherMapping[i]);
                }
              }
              if (object.cloudsLayerUrl != null)
                message.cloudsLayerUrl = String(object.cloudsLayerUrl);
              if (object.animationDecelerationDelay != null)
                message.animationDecelerationDelay = Number(object.animationDecelerationDelay);
              return message;
            };
            PrecipitationsOptions.toObject = function toObject(message, options) {
              if (!options)
                options = {};
              var object = {};
              if (options.arrays || options.defaults)
                object.weatherMapping = [];
              if (options.defaults) {
                object.imageUrl = "";
                object.imageExpireTime = 900;
                object.maxColorDistance = 20;
                object.imageLevel = 5;
                object.cloudsLayerUrl = "";
                object.animationDecelerationDelay = 20;
              }
              if (message.imageUrl != null && message.hasOwnProperty("imageUrl"))
                object.imageUrl = message.imageUrl;
              if (message.imageExpireTime != null && message.hasOwnProperty("imageExpireTime"))
                object.imageExpireTime = message.imageExpireTime;
              if (message.maxColorDistance != null && message.hasOwnProperty("maxColorDistance"))
                object.maxColorDistance = message.maxColorDistance;
              if (message.imageLevel != null && message.hasOwnProperty("imageLevel"))
                object.imageLevel = message.imageLevel;
              if (message.weatherMapping && message.weatherMapping.length) {
                object.weatherMapping = [];
                for (var j = 0; j < message.weatherMapping.length; ++j)
                  object.weatherMapping[j] = $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.WeatherMapping.toObject(message.weatherMapping[j], options);
              }
              if (message.cloudsLayerUrl != null && message.hasOwnProperty("cloudsLayerUrl"))
                object.cloudsLayerUrl = message.cloudsLayerUrl;
              if (message.animationDecelerationDelay != null && message.hasOwnProperty("animationDecelerationDelay"))
                object.animationDecelerationDelay = options.json && !isFinite(message.animationDecelerationDelay) ? String(message.animationDecelerationDelay) : message.animationDecelerationDelay;
              return object;
            };
            PrecipitationsOptions.prototype.toJSON = function toJSON() {
              return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };
            PrecipitationsOptions.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
              if (typeUrlPrefix === void 0) {
                typeUrlPrefix = "type.googleapis.com";
              }
              return typeUrlPrefix + "/keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions";
            };
            PrecipitationsOptions.WeatherMapping = function() {
              function WeatherMapping(properties) {
                if (properties) {
                  for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                      this[keys[i]] = properties[keys[i]];
                }
              }
              WeatherMapping.prototype.colorAbgr = 0;
              WeatherMapping.prototype.weatherType = 0;
              WeatherMapping.prototype.elongation = 1;
              WeatherMapping.prototype.opacity = 0;
              WeatherMapping.prototype.fogDensity = 0;
              WeatherMapping.prototype.speed0 = 0;
              WeatherMapping.prototype.speed1 = 0;
              WeatherMapping.prototype.speed2 = 0;
              WeatherMapping.prototype.speed3 = 0;
              WeatherMapping.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                  reader = $Reader.create(reader);
                var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.WeatherMapping();
                while (reader.pos < end) {
                  var tag = reader.uint32();
                  switch (tag >>> 3) {
                    case 1: {
                      message.colorAbgr = reader.uint32();
                      break;
                    }
                    case 2: {
                      message.weatherType = reader.int32();
                      break;
                    }
                    case 3: {
                      message.elongation = reader.float();
                      break;
                    }
                    case 4: {
                      message.opacity = reader.float();
                      break;
                    }
                    case 5: {
                      message.fogDensity = reader.float();
                      break;
                    }
                    case 6: {
                      message.speed0 = reader.float();
                      break;
                    }
                    case 7: {
                      message.speed1 = reader.float();
                      break;
                    }
                    case 8: {
                      message.speed2 = reader.float();
                      break;
                    }
                    case 9: {
                      message.speed3 = reader.float();
                      break;
                    }
                    default:
                      reader.skipType(tag & 7);
                      break;
                  }
                }
                if (!message.hasOwnProperty("colorAbgr"))
                  throw $util.ProtocolError("missing required 'colorAbgr'", { instance: message });
                if (!message.hasOwnProperty("weatherType"))
                  throw $util.ProtocolError("missing required 'weatherType'", { instance: message });
                return message;
              };
              WeatherMapping.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                  return "object expected";
                if (!$util.isInteger(message.colorAbgr))
                  return "colorAbgr: integer expected";
                switch (message.weatherType) {
                  default:
                    return "weatherType: enum value expected";
                  case 0:
                  case 1:
                  case 2:
                    break;
                }
                if (message.elongation != null && message.hasOwnProperty("elongation")) {
                  if (typeof message.elongation !== "number")
                    return "elongation: number expected";
                }
                if (message.opacity != null && message.hasOwnProperty("opacity")) {
                  if (typeof message.opacity !== "number")
                    return "opacity: number expected";
                }
                if (message.fogDensity != null && message.hasOwnProperty("fogDensity")) {
                  if (typeof message.fogDensity !== "number")
                    return "fogDensity: number expected";
                }
                if (message.speed0 != null && message.hasOwnProperty("speed0")) {
                  if (typeof message.speed0 !== "number")
                    return "speed0: number expected";
                }
                if (message.speed1 != null && message.hasOwnProperty("speed1")) {
                  if (typeof message.speed1 !== "number")
                    return "speed1: number expected";
                }
                if (message.speed2 != null && message.hasOwnProperty("speed2")) {
                  if (typeof message.speed2 !== "number")
                    return "speed2: number expected";
                }
                if (message.speed3 != null && message.hasOwnProperty("speed3")) {
                  if (typeof message.speed3 !== "number")
                    return "speed3: number expected";
                }
                return null;
              };
              WeatherMapping.fromObject = function fromObject(object) {
                if (object instanceof $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.WeatherMapping)
                  return object;
                var message = new $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.WeatherMapping();
                if (object.colorAbgr != null)
                  message.colorAbgr = object.colorAbgr >>> 0;
                switch (object.weatherType) {
                  case "NO_PRECIPITATION":
                  case 0:
                    message.weatherType = 0;
                    break;
                  case "RAIN":
                  case 1:
                    message.weatherType = 1;
                    break;
                  case "SNOW":
                  case 2:
                    message.weatherType = 2;
                    break;
                }
                if (object.elongation != null)
                  message.elongation = Number(object.elongation);
                if (object.opacity != null)
                  message.opacity = Number(object.opacity);
                if (object.fogDensity != null)
                  message.fogDensity = Number(object.fogDensity);
                if (object.speed0 != null)
                  message.speed0 = Number(object.speed0);
                if (object.speed1 != null)
                  message.speed1 = Number(object.speed1);
                if (object.speed2 != null)
                  message.speed2 = Number(object.speed2);
                if (object.speed3 != null)
                  message.speed3 = Number(object.speed3);
                return message;
              };
              WeatherMapping.toObject = function toObject(message, options) {
                if (!options)
                  options = {};
                var object = {};
                if (options.defaults) {
                  object.colorAbgr = 0;
                  object.weatherType = options.enums === String ? "NO_PRECIPITATION" : 0;
                  object.elongation = 1;
                  object.opacity = 0;
                  object.fogDensity = 0;
                  object.speed0 = 0;
                  object.speed1 = 0;
                  object.speed2 = 0;
                  object.speed3 = 0;
                }
                if (message.colorAbgr != null && message.hasOwnProperty("colorAbgr"))
                  object.colorAbgr = message.colorAbgr;
                if (message.weatherType != null && message.hasOwnProperty("weatherType"))
                  object.weatherType = options.enums === String ? $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.WeatherMapping.WeatherType[message.weatherType] : message.weatherType;
                if (message.elongation != null && message.hasOwnProperty("elongation"))
                  object.elongation = options.json && !isFinite(message.elongation) ? String(message.elongation) : message.elongation;
                if (message.opacity != null && message.hasOwnProperty("opacity"))
                  object.opacity = options.json && !isFinite(message.opacity) ? String(message.opacity) : message.opacity;
                if (message.fogDensity != null && message.hasOwnProperty("fogDensity"))
                  object.fogDensity = options.json && !isFinite(message.fogDensity) ? String(message.fogDensity) : message.fogDensity;
                if (message.speed0 != null && message.hasOwnProperty("speed0"))
                  object.speed0 = options.json && !isFinite(message.speed0) ? String(message.speed0) : message.speed0;
                if (message.speed1 != null && message.hasOwnProperty("speed1"))
                  object.speed1 = options.json && !isFinite(message.speed1) ? String(message.speed1) : message.speed1;
                if (message.speed2 != null && message.hasOwnProperty("speed2"))
                  object.speed2 = options.json && !isFinite(message.speed2) ? String(message.speed2) : message.speed2;
                if (message.speed3 != null && message.hasOwnProperty("speed3"))
                  object.speed3 = options.json && !isFinite(message.speed3) ? String(message.speed3) : message.speed3;
                return object;
              };
              WeatherMapping.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
              };
              WeatherMapping.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === void 0) {
                  typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.WeatherMapping";
              };
              WeatherMapping.WeatherType = function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "NO_PRECIPITATION"] = 0;
                values[valuesById[1] = "RAIN"] = 1;
                values[valuesById[2] = "SNOW"] = 2;
                return values;
              }();
              return WeatherMapping;
            }();
            return PrecipitationsOptions;
          }();
          ClientOptionsProto.CaptureOptions = function() {
            function CaptureOptions(properties) {
              if (properties) {
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                  if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
              }
            }
            CaptureOptions.prototype.allowSaveAsImage = true;
            CaptureOptions.prototype.maxFreeCaptureRes = 2400;
            CaptureOptions.prototype.maxPremiumCaptureRes = 4800;
            CaptureOptions.decode = function decode(reader, length) {
              if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
              var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.ClientOptionsProto.CaptureOptions();
              while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                  case 1: {
                    message.allowSaveAsImage = reader.bool();
                    break;
                  }
                  case 2: {
                    message.maxFreeCaptureRes = reader.int32();
                    break;
                  }
                  case 3: {
                    message.maxPremiumCaptureRes = reader.int32();
                    break;
                  }
                  default:
                    reader.skipType(tag & 7);
                    break;
                }
              }
              return message;
            };
            CaptureOptions.verify = function verify(message) {
              if (typeof message !== "object" || message === null)
                return "object expected";
              if (message.allowSaveAsImage != null && message.hasOwnProperty("allowSaveAsImage")) {
                if (typeof message.allowSaveAsImage !== "boolean")
                  return "allowSaveAsImage: boolean expected";
              }
              if (message.maxFreeCaptureRes != null && message.hasOwnProperty("maxFreeCaptureRes")) {
                if (!$util.isInteger(message.maxFreeCaptureRes))
                  return "maxFreeCaptureRes: integer expected";
              }
              if (message.maxPremiumCaptureRes != null && message.hasOwnProperty("maxPremiumCaptureRes")) {
                if (!$util.isInteger(message.maxPremiumCaptureRes))
                  return "maxPremiumCaptureRes: integer expected";
              }
              return null;
            };
            CaptureOptions.fromObject = function fromObject(object) {
              if (object instanceof $root.keyhole.dbroot.ClientOptionsProto.CaptureOptions)
                return object;
              var message = new $root.keyhole.dbroot.ClientOptionsProto.CaptureOptions();
              if (object.allowSaveAsImage != null)
                message.allowSaveAsImage = Boolean(object.allowSaveAsImage);
              if (object.maxFreeCaptureRes != null)
                message.maxFreeCaptureRes = object.maxFreeCaptureRes | 0;
              if (object.maxPremiumCaptureRes != null)
                message.maxPremiumCaptureRes = object.maxPremiumCaptureRes | 0;
              return message;
            };
            CaptureOptions.toObject = function toObject(message, options) {
              if (!options)
                options = {};
              var object = {};
              if (options.defaults) {
                object.allowSaveAsImage = true;
                object.maxFreeCaptureRes = 2400;
                object.maxPremiumCaptureRes = 4800;
              }
              if (message.allowSaveAsImage != null && message.hasOwnProperty("allowSaveAsImage"))
                object.allowSaveAsImage = message.allowSaveAsImage;
              if (message.maxFreeCaptureRes != null && message.hasOwnProperty("maxFreeCaptureRes"))
                object.maxFreeCaptureRes = message.maxFreeCaptureRes;
              if (message.maxPremiumCaptureRes != null && message.hasOwnProperty("maxPremiumCaptureRes"))
                object.maxPremiumCaptureRes = message.maxPremiumCaptureRes;
              return object;
            };
            CaptureOptions.prototype.toJSON = function toJSON() {
              return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };
            CaptureOptions.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
              if (typeUrlPrefix === void 0) {
                typeUrlPrefix = "type.googleapis.com";
              }
              return typeUrlPrefix + "/keyhole.dbroot.ClientOptionsProto.CaptureOptions";
            };
            return CaptureOptions;
          }();
          ClientOptionsProto.MapsOptions = function() {
            function MapsOptions(properties) {
              if (properties) {
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                  if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
              }
            }
            MapsOptions.prototype.enableMaps = false;
            MapsOptions.prototype.docsAutoDownloadEnabled = false;
            MapsOptions.prototype.docsAutoDownloadInterval = 0;
            MapsOptions.prototype.docsAutoUploadEnabled = false;
            MapsOptions.prototype.docsAutoUploadDelay = 0;
            MapsOptions.decode = function decode(reader, length) {
              if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
              var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.ClientOptionsProto.MapsOptions();
              while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                  case 1: {
                    message.enableMaps = reader.bool();
                    break;
                  }
                  case 2: {
                    message.docsAutoDownloadEnabled = reader.bool();
                    break;
                  }
                  case 3: {
                    message.docsAutoDownloadInterval = reader.int32();
                    break;
                  }
                  case 4: {
                    message.docsAutoUploadEnabled = reader.bool();
                    break;
                  }
                  case 5: {
                    message.docsAutoUploadDelay = reader.int32();
                    break;
                  }
                  default:
                    reader.skipType(tag & 7);
                    break;
                }
              }
              return message;
            };
            MapsOptions.verify = function verify(message) {
              if (typeof message !== "object" || message === null)
                return "object expected";
              if (message.enableMaps != null && message.hasOwnProperty("enableMaps")) {
                if (typeof message.enableMaps !== "boolean")
                  return "enableMaps: boolean expected";
              }
              if (message.docsAutoDownloadEnabled != null && message.hasOwnProperty("docsAutoDownloadEnabled")) {
                if (typeof message.docsAutoDownloadEnabled !== "boolean")
                  return "docsAutoDownloadEnabled: boolean expected";
              }
              if (message.docsAutoDownloadInterval != null && message.hasOwnProperty("docsAutoDownloadInterval")) {
                if (!$util.isInteger(message.docsAutoDownloadInterval))
                  return "docsAutoDownloadInterval: integer expected";
              }
              if (message.docsAutoUploadEnabled != null && message.hasOwnProperty("docsAutoUploadEnabled")) {
                if (typeof message.docsAutoUploadEnabled !== "boolean")
                  return "docsAutoUploadEnabled: boolean expected";
              }
              if (message.docsAutoUploadDelay != null && message.hasOwnProperty("docsAutoUploadDelay")) {
                if (!$util.isInteger(message.docsAutoUploadDelay))
                  return "docsAutoUploadDelay: integer expected";
              }
              return null;
            };
            MapsOptions.fromObject = function fromObject(object) {
              if (object instanceof $root.keyhole.dbroot.ClientOptionsProto.MapsOptions)
                return object;
              var message = new $root.keyhole.dbroot.ClientOptionsProto.MapsOptions();
              if (object.enableMaps != null)
                message.enableMaps = Boolean(object.enableMaps);
              if (object.docsAutoDownloadEnabled != null)
                message.docsAutoDownloadEnabled = Boolean(object.docsAutoDownloadEnabled);
              if (object.docsAutoDownloadInterval != null)
                message.docsAutoDownloadInterval = object.docsAutoDownloadInterval | 0;
              if (object.docsAutoUploadEnabled != null)
                message.docsAutoUploadEnabled = Boolean(object.docsAutoUploadEnabled);
              if (object.docsAutoUploadDelay != null)
                message.docsAutoUploadDelay = object.docsAutoUploadDelay | 0;
              return message;
            };
            MapsOptions.toObject = function toObject(message, options) {
              if (!options)
                options = {};
              var object = {};
              if (options.defaults) {
                object.enableMaps = false;
                object.docsAutoDownloadEnabled = false;
                object.docsAutoDownloadInterval = 0;
                object.docsAutoUploadEnabled = false;
                object.docsAutoUploadDelay = 0;
              }
              if (message.enableMaps != null && message.hasOwnProperty("enableMaps"))
                object.enableMaps = message.enableMaps;
              if (message.docsAutoDownloadEnabled != null && message.hasOwnProperty("docsAutoDownloadEnabled"))
                object.docsAutoDownloadEnabled = message.docsAutoDownloadEnabled;
              if (message.docsAutoDownloadInterval != null && message.hasOwnProperty("docsAutoDownloadInterval"))
                object.docsAutoDownloadInterval = message.docsAutoDownloadInterval;
              if (message.docsAutoUploadEnabled != null && message.hasOwnProperty("docsAutoUploadEnabled"))
                object.docsAutoUploadEnabled = message.docsAutoUploadEnabled;
              if (message.docsAutoUploadDelay != null && message.hasOwnProperty("docsAutoUploadDelay"))
                object.docsAutoUploadDelay = message.docsAutoUploadDelay;
              return object;
            };
            MapsOptions.prototype.toJSON = function toJSON() {
              return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };
            MapsOptions.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
              if (typeUrlPrefix === void 0) {
                typeUrlPrefix = "type.googleapis.com";
              }
              return typeUrlPrefix + "/keyhole.dbroot.ClientOptionsProto.MapsOptions";
            };
            return MapsOptions;
          }();
          return ClientOptionsProto;
        }();
        dbroot.FetchingOptionsProto = function() {
          function FetchingOptionsProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          FetchingOptionsProto.prototype.maxRequestsPerQuery = 1;
          FetchingOptionsProto.prototype.forceMaxRequestsPerQuery = false;
          FetchingOptionsProto.prototype.sortBatches = false;
          FetchingOptionsProto.prototype.maxDrawable = 2;
          FetchingOptionsProto.prototype.maxImagery = 2;
          FetchingOptionsProto.prototype.maxTerrain = 5;
          FetchingOptionsProto.prototype.maxQuadtree = 5;
          FetchingOptionsProto.prototype.maxDioramaMetadata = 1;
          FetchingOptionsProto.prototype.maxDioramaData = 0;
          FetchingOptionsProto.prototype.maxConsumerFetchRatio = 1;
          FetchingOptionsProto.prototype.maxProEcFetchRatio = 0;
          FetchingOptionsProto.prototype.safeOverallQps = 0;
          FetchingOptionsProto.prototype.safeImageryQps = 0;
          FetchingOptionsProto.prototype.domainsForHttps = "google.com gstatic.com";
          FetchingOptionsProto.prototype.hostsForHttp = "";
          FetchingOptionsProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.FetchingOptionsProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.maxRequestsPerQuery = reader.int32();
                  break;
                }
                case 12: {
                  message.forceMaxRequestsPerQuery = reader.bool();
                  break;
                }
                case 13: {
                  message.sortBatches = reader.bool();
                  break;
                }
                case 2: {
                  message.maxDrawable = reader.int32();
                  break;
                }
                case 3: {
                  message.maxImagery = reader.int32();
                  break;
                }
                case 4: {
                  message.maxTerrain = reader.int32();
                  break;
                }
                case 5: {
                  message.maxQuadtree = reader.int32();
                  break;
                }
                case 6: {
                  message.maxDioramaMetadata = reader.int32();
                  break;
                }
                case 7: {
                  message.maxDioramaData = reader.int32();
                  break;
                }
                case 8: {
                  message.maxConsumerFetchRatio = reader.float();
                  break;
                }
                case 9: {
                  message.maxProEcFetchRatio = reader.float();
                  break;
                }
                case 10: {
                  message.safeOverallQps = reader.float();
                  break;
                }
                case 11: {
                  message.safeImageryQps = reader.float();
                  break;
                }
                case 14: {
                  message.domainsForHttps = reader.string();
                  break;
                }
                case 15: {
                  message.hostsForHttp = reader.string();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            return message;
          };
          FetchingOptionsProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (message.maxRequestsPerQuery != null && message.hasOwnProperty("maxRequestsPerQuery")) {
              if (!$util.isInteger(message.maxRequestsPerQuery))
                return "maxRequestsPerQuery: integer expected";
            }
            if (message.forceMaxRequestsPerQuery != null && message.hasOwnProperty("forceMaxRequestsPerQuery")) {
              if (typeof message.forceMaxRequestsPerQuery !== "boolean")
                return "forceMaxRequestsPerQuery: boolean expected";
            }
            if (message.sortBatches != null && message.hasOwnProperty("sortBatches")) {
              if (typeof message.sortBatches !== "boolean")
                return "sortBatches: boolean expected";
            }
            if (message.maxDrawable != null && message.hasOwnProperty("maxDrawable")) {
              if (!$util.isInteger(message.maxDrawable))
                return "maxDrawable: integer expected";
            }
            if (message.maxImagery != null && message.hasOwnProperty("maxImagery")) {
              if (!$util.isInteger(message.maxImagery))
                return "maxImagery: integer expected";
            }
            if (message.maxTerrain != null && message.hasOwnProperty("maxTerrain")) {
              if (!$util.isInteger(message.maxTerrain))
                return "maxTerrain: integer expected";
            }
            if (message.maxQuadtree != null && message.hasOwnProperty("maxQuadtree")) {
              if (!$util.isInteger(message.maxQuadtree))
                return "maxQuadtree: integer expected";
            }
            if (message.maxDioramaMetadata != null && message.hasOwnProperty("maxDioramaMetadata")) {
              if (!$util.isInteger(message.maxDioramaMetadata))
                return "maxDioramaMetadata: integer expected";
            }
            if (message.maxDioramaData != null && message.hasOwnProperty("maxDioramaData")) {
              if (!$util.isInteger(message.maxDioramaData))
                return "maxDioramaData: integer expected";
            }
            if (message.maxConsumerFetchRatio != null && message.hasOwnProperty("maxConsumerFetchRatio")) {
              if (typeof message.maxConsumerFetchRatio !== "number")
                return "maxConsumerFetchRatio: number expected";
            }
            if (message.maxProEcFetchRatio != null && message.hasOwnProperty("maxProEcFetchRatio")) {
              if (typeof message.maxProEcFetchRatio !== "number")
                return "maxProEcFetchRatio: number expected";
            }
            if (message.safeOverallQps != null && message.hasOwnProperty("safeOverallQps")) {
              if (typeof message.safeOverallQps !== "number")
                return "safeOverallQps: number expected";
            }
            if (message.safeImageryQps != null && message.hasOwnProperty("safeImageryQps")) {
              if (typeof message.safeImageryQps !== "number")
                return "safeImageryQps: number expected";
            }
            if (message.domainsForHttps != null && message.hasOwnProperty("domainsForHttps")) {
              if (!$util.isString(message.domainsForHttps))
                return "domainsForHttps: string expected";
            }
            if (message.hostsForHttp != null && message.hasOwnProperty("hostsForHttp")) {
              if (!$util.isString(message.hostsForHttp))
                return "hostsForHttp: string expected";
            }
            return null;
          };
          FetchingOptionsProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.FetchingOptionsProto)
              return object;
            var message = new $root.keyhole.dbroot.FetchingOptionsProto();
            if (object.maxRequestsPerQuery != null)
              message.maxRequestsPerQuery = object.maxRequestsPerQuery | 0;
            if (object.forceMaxRequestsPerQuery != null)
              message.forceMaxRequestsPerQuery = Boolean(object.forceMaxRequestsPerQuery);
            if (object.sortBatches != null)
              message.sortBatches = Boolean(object.sortBatches);
            if (object.maxDrawable != null)
              message.maxDrawable = object.maxDrawable | 0;
            if (object.maxImagery != null)
              message.maxImagery = object.maxImagery | 0;
            if (object.maxTerrain != null)
              message.maxTerrain = object.maxTerrain | 0;
            if (object.maxQuadtree != null)
              message.maxQuadtree = object.maxQuadtree | 0;
            if (object.maxDioramaMetadata != null)
              message.maxDioramaMetadata = object.maxDioramaMetadata | 0;
            if (object.maxDioramaData != null)
              message.maxDioramaData = object.maxDioramaData | 0;
            if (object.maxConsumerFetchRatio != null)
              message.maxConsumerFetchRatio = Number(object.maxConsumerFetchRatio);
            if (object.maxProEcFetchRatio != null)
              message.maxProEcFetchRatio = Number(object.maxProEcFetchRatio);
            if (object.safeOverallQps != null)
              message.safeOverallQps = Number(object.safeOverallQps);
            if (object.safeImageryQps != null)
              message.safeImageryQps = Number(object.safeImageryQps);
            if (object.domainsForHttps != null)
              message.domainsForHttps = String(object.domainsForHttps);
            if (object.hostsForHttp != null)
              message.hostsForHttp = String(object.hostsForHttp);
            return message;
          };
          FetchingOptionsProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.maxRequestsPerQuery = 1;
              object.maxDrawable = 2;
              object.maxImagery = 2;
              object.maxTerrain = 5;
              object.maxQuadtree = 5;
              object.maxDioramaMetadata = 1;
              object.maxDioramaData = 0;
              object.maxConsumerFetchRatio = 1;
              object.maxProEcFetchRatio = 0;
              object.safeOverallQps = 0;
              object.safeImageryQps = 0;
              object.forceMaxRequestsPerQuery = false;
              object.sortBatches = false;
              object.domainsForHttps = "google.com gstatic.com";
              object.hostsForHttp = "";
            }
            if (message.maxRequestsPerQuery != null && message.hasOwnProperty("maxRequestsPerQuery"))
              object.maxRequestsPerQuery = message.maxRequestsPerQuery;
            if (message.maxDrawable != null && message.hasOwnProperty("maxDrawable"))
              object.maxDrawable = message.maxDrawable;
            if (message.maxImagery != null && message.hasOwnProperty("maxImagery"))
              object.maxImagery = message.maxImagery;
            if (message.maxTerrain != null && message.hasOwnProperty("maxTerrain"))
              object.maxTerrain = message.maxTerrain;
            if (message.maxQuadtree != null && message.hasOwnProperty("maxQuadtree"))
              object.maxQuadtree = message.maxQuadtree;
            if (message.maxDioramaMetadata != null && message.hasOwnProperty("maxDioramaMetadata"))
              object.maxDioramaMetadata = message.maxDioramaMetadata;
            if (message.maxDioramaData != null && message.hasOwnProperty("maxDioramaData"))
              object.maxDioramaData = message.maxDioramaData;
            if (message.maxConsumerFetchRatio != null && message.hasOwnProperty("maxConsumerFetchRatio"))
              object.maxConsumerFetchRatio = options.json && !isFinite(message.maxConsumerFetchRatio) ? String(message.maxConsumerFetchRatio) : message.maxConsumerFetchRatio;
            if (message.maxProEcFetchRatio != null && message.hasOwnProperty("maxProEcFetchRatio"))
              object.maxProEcFetchRatio = options.json && !isFinite(message.maxProEcFetchRatio) ? String(message.maxProEcFetchRatio) : message.maxProEcFetchRatio;
            if (message.safeOverallQps != null && message.hasOwnProperty("safeOverallQps"))
              object.safeOverallQps = options.json && !isFinite(message.safeOverallQps) ? String(message.safeOverallQps) : message.safeOverallQps;
            if (message.safeImageryQps != null && message.hasOwnProperty("safeImageryQps"))
              object.safeImageryQps = options.json && !isFinite(message.safeImageryQps) ? String(message.safeImageryQps) : message.safeImageryQps;
            if (message.forceMaxRequestsPerQuery != null && message.hasOwnProperty("forceMaxRequestsPerQuery"))
              object.forceMaxRequestsPerQuery = message.forceMaxRequestsPerQuery;
            if (message.sortBatches != null && message.hasOwnProperty("sortBatches"))
              object.sortBatches = message.sortBatches;
            if (message.domainsForHttps != null && message.hasOwnProperty("domainsForHttps"))
              object.domainsForHttps = message.domainsForHttps;
            if (message.hostsForHttp != null && message.hasOwnProperty("hostsForHttp"))
              object.hostsForHttp = message.hostsForHttp;
            return object;
          };
          FetchingOptionsProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          FetchingOptionsProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.FetchingOptionsProto";
          };
          return FetchingOptionsProto;
        }();
        dbroot.TimeMachineOptionsProto = function() {
          function TimeMachineOptionsProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          TimeMachineOptionsProto.prototype.serverUrl = "";
          TimeMachineOptionsProto.prototype.isTimemachine = false;
          TimeMachineOptionsProto.prototype.dwellTimeMs = 500;
          TimeMachineOptionsProto.prototype.discoverabilityAltitudeMeters = 15e3;
          TimeMachineOptionsProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.TimeMachineOptionsProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.serverUrl = reader.string();
                  break;
                }
                case 2: {
                  message.isTimemachine = reader.bool();
                  break;
                }
                case 3: {
                  message.dwellTimeMs = reader.int32();
                  break;
                }
                case 4: {
                  message.discoverabilityAltitudeMeters = reader.int32();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            return message;
          };
          TimeMachineOptionsProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (message.serverUrl != null && message.hasOwnProperty("serverUrl")) {
              if (!$util.isString(message.serverUrl))
                return "serverUrl: string expected";
            }
            if (message.isTimemachine != null && message.hasOwnProperty("isTimemachine")) {
              if (typeof message.isTimemachine !== "boolean")
                return "isTimemachine: boolean expected";
            }
            if (message.dwellTimeMs != null && message.hasOwnProperty("dwellTimeMs")) {
              if (!$util.isInteger(message.dwellTimeMs))
                return "dwellTimeMs: integer expected";
            }
            if (message.discoverabilityAltitudeMeters != null && message.hasOwnProperty("discoverabilityAltitudeMeters")) {
              if (!$util.isInteger(message.discoverabilityAltitudeMeters))
                return "discoverabilityAltitudeMeters: integer expected";
            }
            return null;
          };
          TimeMachineOptionsProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.TimeMachineOptionsProto)
              return object;
            var message = new $root.keyhole.dbroot.TimeMachineOptionsProto();
            if (object.serverUrl != null)
              message.serverUrl = String(object.serverUrl);
            if (object.isTimemachine != null)
              message.isTimemachine = Boolean(object.isTimemachine);
            if (object.dwellTimeMs != null)
              message.dwellTimeMs = object.dwellTimeMs | 0;
            if (object.discoverabilityAltitudeMeters != null)
              message.discoverabilityAltitudeMeters = object.discoverabilityAltitudeMeters | 0;
            return message;
          };
          TimeMachineOptionsProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.serverUrl = "";
              object.isTimemachine = false;
              object.dwellTimeMs = 500;
              object.discoverabilityAltitudeMeters = 15e3;
            }
            if (message.serverUrl != null && message.hasOwnProperty("serverUrl"))
              object.serverUrl = message.serverUrl;
            if (message.isTimemachine != null && message.hasOwnProperty("isTimemachine"))
              object.isTimemachine = message.isTimemachine;
            if (message.dwellTimeMs != null && message.hasOwnProperty("dwellTimeMs"))
              object.dwellTimeMs = message.dwellTimeMs;
            if (message.discoverabilityAltitudeMeters != null && message.hasOwnProperty("discoverabilityAltitudeMeters"))
              object.discoverabilityAltitudeMeters = message.discoverabilityAltitudeMeters;
            return object;
          };
          TimeMachineOptionsProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          TimeMachineOptionsProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.TimeMachineOptionsProto";
          };
          return TimeMachineOptionsProto;
        }();
        dbroot.AutopiaOptionsProto = function() {
          function AutopiaOptionsProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          AutopiaOptionsProto.prototype.metadataServerUrl = "http://cbk0.google.com/cbk";
          AutopiaOptionsProto.prototype.depthmapServerUrl = "http://cbk0.google.com/cbk";
          AutopiaOptionsProto.prototype.coverageOverlayUrl = "";
          AutopiaOptionsProto.prototype.maxImageryQps = 0;
          AutopiaOptionsProto.prototype.maxMetadataDepthmapQps = 0;
          AutopiaOptionsProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.AutopiaOptionsProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.metadataServerUrl = reader.string();
                  break;
                }
                case 2: {
                  message.depthmapServerUrl = reader.string();
                  break;
                }
                case 3: {
                  message.coverageOverlayUrl = reader.string();
                  break;
                }
                case 4: {
                  message.maxImageryQps = reader.float();
                  break;
                }
                case 5: {
                  message.maxMetadataDepthmapQps = reader.float();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            return message;
          };
          AutopiaOptionsProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (message.metadataServerUrl != null && message.hasOwnProperty("metadataServerUrl")) {
              if (!$util.isString(message.metadataServerUrl))
                return "metadataServerUrl: string expected";
            }
            if (message.depthmapServerUrl != null && message.hasOwnProperty("depthmapServerUrl")) {
              if (!$util.isString(message.depthmapServerUrl))
                return "depthmapServerUrl: string expected";
            }
            if (message.coverageOverlayUrl != null && message.hasOwnProperty("coverageOverlayUrl")) {
              if (!$util.isString(message.coverageOverlayUrl))
                return "coverageOverlayUrl: string expected";
            }
            if (message.maxImageryQps != null && message.hasOwnProperty("maxImageryQps")) {
              if (typeof message.maxImageryQps !== "number")
                return "maxImageryQps: number expected";
            }
            if (message.maxMetadataDepthmapQps != null && message.hasOwnProperty("maxMetadataDepthmapQps")) {
              if (typeof message.maxMetadataDepthmapQps !== "number")
                return "maxMetadataDepthmapQps: number expected";
            }
            return null;
          };
          AutopiaOptionsProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.AutopiaOptionsProto)
              return object;
            var message = new $root.keyhole.dbroot.AutopiaOptionsProto();
            if (object.metadataServerUrl != null)
              message.metadataServerUrl = String(object.metadataServerUrl);
            if (object.depthmapServerUrl != null)
              message.depthmapServerUrl = String(object.depthmapServerUrl);
            if (object.coverageOverlayUrl != null)
              message.coverageOverlayUrl = String(object.coverageOverlayUrl);
            if (object.maxImageryQps != null)
              message.maxImageryQps = Number(object.maxImageryQps);
            if (object.maxMetadataDepthmapQps != null)
              message.maxMetadataDepthmapQps = Number(object.maxMetadataDepthmapQps);
            return message;
          };
          AutopiaOptionsProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.metadataServerUrl = "http://cbk0.google.com/cbk";
              object.depthmapServerUrl = "http://cbk0.google.com/cbk";
              object.coverageOverlayUrl = "";
              object.maxImageryQps = 0;
              object.maxMetadataDepthmapQps = 0;
            }
            if (message.metadataServerUrl != null && message.hasOwnProperty("metadataServerUrl"))
              object.metadataServerUrl = message.metadataServerUrl;
            if (message.depthmapServerUrl != null && message.hasOwnProperty("depthmapServerUrl"))
              object.depthmapServerUrl = message.depthmapServerUrl;
            if (message.coverageOverlayUrl != null && message.hasOwnProperty("coverageOverlayUrl"))
              object.coverageOverlayUrl = message.coverageOverlayUrl;
            if (message.maxImageryQps != null && message.hasOwnProperty("maxImageryQps"))
              object.maxImageryQps = options.json && !isFinite(message.maxImageryQps) ? String(message.maxImageryQps) : message.maxImageryQps;
            if (message.maxMetadataDepthmapQps != null && message.hasOwnProperty("maxMetadataDepthmapQps"))
              object.maxMetadataDepthmapQps = options.json && !isFinite(message.maxMetadataDepthmapQps) ? String(message.maxMetadataDepthmapQps) : message.maxMetadataDepthmapQps;
            return object;
          };
          AutopiaOptionsProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          AutopiaOptionsProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.AutopiaOptionsProto";
          };
          return AutopiaOptionsProto;
        }();
        dbroot.CSIOptionsProto = function() {
          function CSIOptionsProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          CSIOptionsProto.prototype.samplingPercentage = 0;
          CSIOptionsProto.prototype.experimentId = "";
          CSIOptionsProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.CSIOptionsProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.samplingPercentage = reader.int32();
                  break;
                }
                case 2: {
                  message.experimentId = reader.string();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            return message;
          };
          CSIOptionsProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (message.samplingPercentage != null && message.hasOwnProperty("samplingPercentage")) {
              if (!$util.isInteger(message.samplingPercentage))
                return "samplingPercentage: integer expected";
            }
            if (message.experimentId != null && message.hasOwnProperty("experimentId")) {
              if (!$util.isString(message.experimentId))
                return "experimentId: string expected";
            }
            return null;
          };
          CSIOptionsProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.CSIOptionsProto)
              return object;
            var message = new $root.keyhole.dbroot.CSIOptionsProto();
            if (object.samplingPercentage != null)
              message.samplingPercentage = object.samplingPercentage | 0;
            if (object.experimentId != null)
              message.experimentId = String(object.experimentId);
            return message;
          };
          CSIOptionsProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.samplingPercentage = 0;
              object.experimentId = "";
            }
            if (message.samplingPercentage != null && message.hasOwnProperty("samplingPercentage"))
              object.samplingPercentage = message.samplingPercentage;
            if (message.experimentId != null && message.hasOwnProperty("experimentId"))
              object.experimentId = message.experimentId;
            return object;
          };
          CSIOptionsProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          CSIOptionsProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.CSIOptionsProto";
          };
          return CSIOptionsProto;
        }();
        dbroot.SearchTabProto = function() {
          function SearchTabProto(properties) {
            this.inputBox = [];
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          SearchTabProto.prototype.isVisible = false;
          SearchTabProto.prototype.tabLabel = null;
          SearchTabProto.prototype.baseUrl = "";
          SearchTabProto.prototype.viewportPrefix = "";
          SearchTabProto.prototype.inputBox = $util.emptyArray;
          SearchTabProto.prototype.requirement = null;
          SearchTabProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.SearchTabProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.isVisible = reader.bool();
                  break;
                }
                case 2: {
                  message.tabLabel = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 3: {
                  message.baseUrl = reader.string();
                  break;
                }
                case 4: {
                  message.viewportPrefix = reader.string();
                  break;
                }
                case 5: {
                  if (!(message.inputBox && message.inputBox.length))
                    message.inputBox = [];
                  message.inputBox.push($root.keyhole.dbroot.SearchTabProto.InputBoxInfo.decode(reader, reader.uint32()));
                  break;
                }
                case 6: {
                  message.requirement = $root.keyhole.dbroot.RequirementProto.decode(reader, reader.uint32());
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            if (!message.hasOwnProperty("isVisible"))
              throw $util.ProtocolError("missing required 'isVisible'", { instance: message });
            return message;
          };
          SearchTabProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (typeof message.isVisible !== "boolean")
              return "isVisible: boolean expected";
            if (message.tabLabel != null && message.hasOwnProperty("tabLabel")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.tabLabel);
              if (error)
                return "tabLabel." + error;
            }
            if (message.baseUrl != null && message.hasOwnProperty("baseUrl")) {
              if (!$util.isString(message.baseUrl))
                return "baseUrl: string expected";
            }
            if (message.viewportPrefix != null && message.hasOwnProperty("viewportPrefix")) {
              if (!$util.isString(message.viewportPrefix))
                return "viewportPrefix: string expected";
            }
            if (message.inputBox != null && message.hasOwnProperty("inputBox")) {
              if (!Array.isArray(message.inputBox))
                return "inputBox: array expected";
              for (var i = 0; i < message.inputBox.length; ++i) {
                var error = $root.keyhole.dbroot.SearchTabProto.InputBoxInfo.verify(message.inputBox[i]);
                if (error)
                  return "inputBox." + error;
              }
            }
            if (message.requirement != null && message.hasOwnProperty("requirement")) {
              var error = $root.keyhole.dbroot.RequirementProto.verify(message.requirement);
              if (error)
                return "requirement." + error;
            }
            return null;
          };
          SearchTabProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.SearchTabProto)
              return object;
            var message = new $root.keyhole.dbroot.SearchTabProto();
            if (object.isVisible != null)
              message.isVisible = Boolean(object.isVisible);
            if (object.tabLabel != null) {
              if (typeof object.tabLabel !== "object")
                throw TypeError(".keyhole.dbroot.SearchTabProto.tabLabel: object expected");
              message.tabLabel = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.tabLabel);
            }
            if (object.baseUrl != null)
              message.baseUrl = String(object.baseUrl);
            if (object.viewportPrefix != null)
              message.viewportPrefix = String(object.viewportPrefix);
            if (object.inputBox) {
              if (!Array.isArray(object.inputBox))
                throw TypeError(".keyhole.dbroot.SearchTabProto.inputBox: array expected");
              message.inputBox = [];
              for (var i = 0; i < object.inputBox.length; ++i) {
                if (typeof object.inputBox[i] !== "object")
                  throw TypeError(".keyhole.dbroot.SearchTabProto.inputBox: object expected");
                message.inputBox[i] = $root.keyhole.dbroot.SearchTabProto.InputBoxInfo.fromObject(object.inputBox[i]);
              }
            }
            if (object.requirement != null) {
              if (typeof object.requirement !== "object")
                throw TypeError(".keyhole.dbroot.SearchTabProto.requirement: object expected");
              message.requirement = $root.keyhole.dbroot.RequirementProto.fromObject(object.requirement);
            }
            return message;
          };
          SearchTabProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.arrays || options.defaults)
              object.inputBox = [];
            if (options.defaults) {
              object.isVisible = false;
              object.tabLabel = null;
              object.baseUrl = "";
              object.viewportPrefix = "";
              object.requirement = null;
            }
            if (message.isVisible != null && message.hasOwnProperty("isVisible"))
              object.isVisible = message.isVisible;
            if (message.tabLabel != null && message.hasOwnProperty("tabLabel"))
              object.tabLabel = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.tabLabel, options);
            if (message.baseUrl != null && message.hasOwnProperty("baseUrl"))
              object.baseUrl = message.baseUrl;
            if (message.viewportPrefix != null && message.hasOwnProperty("viewportPrefix"))
              object.viewportPrefix = message.viewportPrefix;
            if (message.inputBox && message.inputBox.length) {
              object.inputBox = [];
              for (var j = 0; j < message.inputBox.length; ++j)
                object.inputBox[j] = $root.keyhole.dbroot.SearchTabProto.InputBoxInfo.toObject(message.inputBox[j], options);
            }
            if (message.requirement != null && message.hasOwnProperty("requirement"))
              object.requirement = $root.keyhole.dbroot.RequirementProto.toObject(message.requirement, options);
            return object;
          };
          SearchTabProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          SearchTabProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.SearchTabProto";
          };
          SearchTabProto.InputBoxInfo = function() {
            function InputBoxInfo(properties) {
              if (properties) {
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                  if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
              }
            }
            InputBoxInfo.prototype.label = null;
            InputBoxInfo.prototype.queryVerb = "";
            InputBoxInfo.prototype.queryPrepend = "";
            InputBoxInfo.decode = function decode(reader, length) {
              if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
              var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.SearchTabProto.InputBoxInfo();
              while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                  case 1: {
                    message.label = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                    break;
                  }
                  case 2: {
                    message.queryVerb = reader.string();
                    break;
                  }
                  case 3: {
                    message.queryPrepend = reader.string();
                    break;
                  }
                  default:
                    reader.skipType(tag & 7);
                    break;
                }
              }
              if (!message.hasOwnProperty("label"))
                throw $util.ProtocolError("missing required 'label'", { instance: message });
              if (!message.hasOwnProperty("queryVerb"))
                throw $util.ProtocolError("missing required 'queryVerb'", { instance: message });
              return message;
            };
            InputBoxInfo.verify = function verify(message) {
              if (typeof message !== "object" || message === null)
                return "object expected";
              {
                var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.label);
                if (error)
                  return "label." + error;
              }
              if (!$util.isString(message.queryVerb))
                return "queryVerb: string expected";
              if (message.queryPrepend != null && message.hasOwnProperty("queryPrepend")) {
                if (!$util.isString(message.queryPrepend))
                  return "queryPrepend: string expected";
              }
              return null;
            };
            InputBoxInfo.fromObject = function fromObject(object) {
              if (object instanceof $root.keyhole.dbroot.SearchTabProto.InputBoxInfo)
                return object;
              var message = new $root.keyhole.dbroot.SearchTabProto.InputBoxInfo();
              if (object.label != null) {
                if (typeof object.label !== "object")
                  throw TypeError(".keyhole.dbroot.SearchTabProto.InputBoxInfo.label: object expected");
                message.label = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.label);
              }
              if (object.queryVerb != null)
                message.queryVerb = String(object.queryVerb);
              if (object.queryPrepend != null)
                message.queryPrepend = String(object.queryPrepend);
              return message;
            };
            InputBoxInfo.toObject = function toObject(message, options) {
              if (!options)
                options = {};
              var object = {};
              if (options.defaults) {
                object.label = null;
                object.queryVerb = "";
                object.queryPrepend = "";
              }
              if (message.label != null && message.hasOwnProperty("label"))
                object.label = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.label, options);
              if (message.queryVerb != null && message.hasOwnProperty("queryVerb"))
                object.queryVerb = message.queryVerb;
              if (message.queryPrepend != null && message.hasOwnProperty("queryPrepend"))
                object.queryPrepend = message.queryPrepend;
              return object;
            };
            InputBoxInfo.prototype.toJSON = function toJSON() {
              return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };
            InputBoxInfo.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
              if (typeUrlPrefix === void 0) {
                typeUrlPrefix = "type.googleapis.com";
              }
              return typeUrlPrefix + "/keyhole.dbroot.SearchTabProto.InputBoxInfo";
            };
            return InputBoxInfo;
          }();
          return SearchTabProto;
        }();
        dbroot.CobrandProto = function() {
          function CobrandProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          CobrandProto.prototype.logoUrl = "";
          CobrandProto.prototype.xCoord = null;
          CobrandProto.prototype.yCoord = null;
          CobrandProto.prototype.tiePoint = 6;
          CobrandProto.prototype.screenSize = 0;
          CobrandProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.CobrandProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.logoUrl = reader.string();
                  break;
                }
                case 2: {
                  message.xCoord = $root.keyhole.dbroot.CobrandProto.Coord.decode(reader, reader.uint32());
                  break;
                }
                case 3: {
                  message.yCoord = $root.keyhole.dbroot.CobrandProto.Coord.decode(reader, reader.uint32());
                  break;
                }
                case 4: {
                  message.tiePoint = reader.int32();
                  break;
                }
                case 5: {
                  message.screenSize = reader.double();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            if (!message.hasOwnProperty("logoUrl"))
              throw $util.ProtocolError("missing required 'logoUrl'", { instance: message });
            return message;
          };
          CobrandProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (!$util.isString(message.logoUrl))
              return "logoUrl: string expected";
            if (message.xCoord != null && message.hasOwnProperty("xCoord")) {
              var error = $root.keyhole.dbroot.CobrandProto.Coord.verify(message.xCoord);
              if (error)
                return "xCoord." + error;
            }
            if (message.yCoord != null && message.hasOwnProperty("yCoord")) {
              var error = $root.keyhole.dbroot.CobrandProto.Coord.verify(message.yCoord);
              if (error)
                return "yCoord." + error;
            }
            if (message.tiePoint != null && message.hasOwnProperty("tiePoint"))
              switch (message.tiePoint) {
                default:
                  return "tiePoint: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                case 8:
                  break;
              }
            if (message.screenSize != null && message.hasOwnProperty("screenSize")) {
              if (typeof message.screenSize !== "number")
                return "screenSize: number expected";
            }
            return null;
          };
          CobrandProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.CobrandProto)
              return object;
            var message = new $root.keyhole.dbroot.CobrandProto();
            if (object.logoUrl != null)
              message.logoUrl = String(object.logoUrl);
            if (object.xCoord != null) {
              if (typeof object.xCoord !== "object")
                throw TypeError(".keyhole.dbroot.CobrandProto.xCoord: object expected");
              message.xCoord = $root.keyhole.dbroot.CobrandProto.Coord.fromObject(object.xCoord);
            }
            if (object.yCoord != null) {
              if (typeof object.yCoord !== "object")
                throw TypeError(".keyhole.dbroot.CobrandProto.yCoord: object expected");
              message.yCoord = $root.keyhole.dbroot.CobrandProto.Coord.fromObject(object.yCoord);
            }
            switch (object.tiePoint) {
              case "TOP_LEFT":
              case 0:
                message.tiePoint = 0;
                break;
              case "TOP_CENTER":
              case 1:
                message.tiePoint = 1;
                break;
              case "TOP_RIGHT":
              case 2:
                message.tiePoint = 2;
                break;
              case "MID_LEFT":
              case 3:
                message.tiePoint = 3;
                break;
              case "MID_CENTER":
              case 4:
                message.tiePoint = 4;
                break;
              case "MID_RIGHT":
              case 5:
                message.tiePoint = 5;
                break;
              case "BOTTOM_LEFT":
              case 6:
                message.tiePoint = 6;
                break;
              case "BOTTOM_CENTER":
              case 7:
                message.tiePoint = 7;
                break;
              case "BOTTOM_RIGHT":
              case 8:
                message.tiePoint = 8;
                break;
            }
            if (object.screenSize != null)
              message.screenSize = Number(object.screenSize);
            return message;
          };
          CobrandProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.logoUrl = "";
              object.xCoord = null;
              object.yCoord = null;
              object.tiePoint = options.enums === String ? "BOTTOM_LEFT" : 6;
              object.screenSize = 0;
            }
            if (message.logoUrl != null && message.hasOwnProperty("logoUrl"))
              object.logoUrl = message.logoUrl;
            if (message.xCoord != null && message.hasOwnProperty("xCoord"))
              object.xCoord = $root.keyhole.dbroot.CobrandProto.Coord.toObject(message.xCoord, options);
            if (message.yCoord != null && message.hasOwnProperty("yCoord"))
              object.yCoord = $root.keyhole.dbroot.CobrandProto.Coord.toObject(message.yCoord, options);
            if (message.tiePoint != null && message.hasOwnProperty("tiePoint"))
              object.tiePoint = options.enums === String ? $root.keyhole.dbroot.CobrandProto.TiePoint[message.tiePoint] : message.tiePoint;
            if (message.screenSize != null && message.hasOwnProperty("screenSize"))
              object.screenSize = options.json && !isFinite(message.screenSize) ? String(message.screenSize) : message.screenSize;
            return object;
          };
          CobrandProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          CobrandProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.CobrandProto";
          };
          CobrandProto.Coord = function() {
            function Coord(properties) {
              if (properties) {
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                  if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
              }
            }
            Coord.prototype.value = 0;
            Coord.prototype.isRelative = false;
            Coord.decode = function decode(reader, length) {
              if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
              var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.CobrandProto.Coord();
              while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                  case 1: {
                    message.value = reader.double();
                    break;
                  }
                  case 2: {
                    message.isRelative = reader.bool();
                    break;
                  }
                  default:
                    reader.skipType(tag & 7);
                    break;
                }
              }
              if (!message.hasOwnProperty("value"))
                throw $util.ProtocolError("missing required 'value'", { instance: message });
              return message;
            };
            Coord.verify = function verify(message) {
              if (typeof message !== "object" || message === null)
                return "object expected";
              if (typeof message.value !== "number")
                return "value: number expected";
              if (message.isRelative != null && message.hasOwnProperty("isRelative")) {
                if (typeof message.isRelative !== "boolean")
                  return "isRelative: boolean expected";
              }
              return null;
            };
            Coord.fromObject = function fromObject(object) {
              if (object instanceof $root.keyhole.dbroot.CobrandProto.Coord)
                return object;
              var message = new $root.keyhole.dbroot.CobrandProto.Coord();
              if (object.value != null)
                message.value = Number(object.value);
              if (object.isRelative != null)
                message.isRelative = Boolean(object.isRelative);
              return message;
            };
            Coord.toObject = function toObject(message, options) {
              if (!options)
                options = {};
              var object = {};
              if (options.defaults) {
                object.value = 0;
                object.isRelative = false;
              }
              if (message.value != null && message.hasOwnProperty("value"))
                object.value = options.json && !isFinite(message.value) ? String(message.value) : message.value;
              if (message.isRelative != null && message.hasOwnProperty("isRelative"))
                object.isRelative = message.isRelative;
              return object;
            };
            Coord.prototype.toJSON = function toJSON() {
              return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };
            Coord.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
              if (typeUrlPrefix === void 0) {
                typeUrlPrefix = "type.googleapis.com";
              }
              return typeUrlPrefix + "/keyhole.dbroot.CobrandProto.Coord";
            };
            return Coord;
          }();
          CobrandProto.TiePoint = function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "TOP_LEFT"] = 0;
            values[valuesById[1] = "TOP_CENTER"] = 1;
            values[valuesById[2] = "TOP_RIGHT"] = 2;
            values[valuesById[3] = "MID_LEFT"] = 3;
            values[valuesById[4] = "MID_CENTER"] = 4;
            values[valuesById[5] = "MID_RIGHT"] = 5;
            values[valuesById[6] = "BOTTOM_LEFT"] = 6;
            values[valuesById[7] = "BOTTOM_CENTER"] = 7;
            values[valuesById[8] = "BOTTOM_RIGHT"] = 8;
            return values;
          }();
          return CobrandProto;
        }();
        dbroot.DatabaseDescriptionProto = function() {
          function DatabaseDescriptionProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          DatabaseDescriptionProto.prototype.databaseName = null;
          DatabaseDescriptionProto.prototype.databaseUrl = "";
          DatabaseDescriptionProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.DatabaseDescriptionProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.databaseName = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 2: {
                  message.databaseUrl = reader.string();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            if (!message.hasOwnProperty("databaseUrl"))
              throw $util.ProtocolError("missing required 'databaseUrl'", { instance: message });
            return message;
          };
          DatabaseDescriptionProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (message.databaseName != null && message.hasOwnProperty("databaseName")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.databaseName);
              if (error)
                return "databaseName." + error;
            }
            if (!$util.isString(message.databaseUrl))
              return "databaseUrl: string expected";
            return null;
          };
          DatabaseDescriptionProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.DatabaseDescriptionProto)
              return object;
            var message = new $root.keyhole.dbroot.DatabaseDescriptionProto();
            if (object.databaseName != null) {
              if (typeof object.databaseName !== "object")
                throw TypeError(".keyhole.dbroot.DatabaseDescriptionProto.databaseName: object expected");
              message.databaseName = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.databaseName);
            }
            if (object.databaseUrl != null)
              message.databaseUrl = String(object.databaseUrl);
            return message;
          };
          DatabaseDescriptionProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.databaseName = null;
              object.databaseUrl = "";
            }
            if (message.databaseName != null && message.hasOwnProperty("databaseName"))
              object.databaseName = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.databaseName, options);
            if (message.databaseUrl != null && message.hasOwnProperty("databaseUrl"))
              object.databaseUrl = message.databaseUrl;
            return object;
          };
          DatabaseDescriptionProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          DatabaseDescriptionProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.DatabaseDescriptionProto";
          };
          return DatabaseDescriptionProto;
        }();
        dbroot.ConfigScriptProto = function() {
          function ConfigScriptProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          ConfigScriptProto.prototype.scriptName = "";
          ConfigScriptProto.prototype.scriptData = "";
          ConfigScriptProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.ConfigScriptProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.scriptName = reader.string();
                  break;
                }
                case 2: {
                  message.scriptData = reader.string();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            if (!message.hasOwnProperty("scriptName"))
              throw $util.ProtocolError("missing required 'scriptName'", { instance: message });
            if (!message.hasOwnProperty("scriptData"))
              throw $util.ProtocolError("missing required 'scriptData'", { instance: message });
            return message;
          };
          ConfigScriptProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (!$util.isString(message.scriptName))
              return "scriptName: string expected";
            if (!$util.isString(message.scriptData))
              return "scriptData: string expected";
            return null;
          };
          ConfigScriptProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.ConfigScriptProto)
              return object;
            var message = new $root.keyhole.dbroot.ConfigScriptProto();
            if (object.scriptName != null)
              message.scriptName = String(object.scriptName);
            if (object.scriptData != null)
              message.scriptData = String(object.scriptData);
            return message;
          };
          ConfigScriptProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.scriptName = "";
              object.scriptData = "";
            }
            if (message.scriptName != null && message.hasOwnProperty("scriptName"))
              object.scriptName = message.scriptName;
            if (message.scriptData != null && message.hasOwnProperty("scriptData"))
              object.scriptData = message.scriptData;
            return object;
          };
          ConfigScriptProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          ConfigScriptProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.ConfigScriptProto";
          };
          return ConfigScriptProto;
        }();
        dbroot.SwoopParamsProto = function() {
          function SwoopParamsProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          SwoopParamsProto.prototype.startDistInMeters = 0;
          SwoopParamsProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.SwoopParamsProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.startDistInMeters = reader.double();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            return message;
          };
          SwoopParamsProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (message.startDistInMeters != null && message.hasOwnProperty("startDistInMeters")) {
              if (typeof message.startDistInMeters !== "number")
                return "startDistInMeters: number expected";
            }
            return null;
          };
          SwoopParamsProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.SwoopParamsProto)
              return object;
            var message = new $root.keyhole.dbroot.SwoopParamsProto();
            if (object.startDistInMeters != null)
              message.startDistInMeters = Number(object.startDistInMeters);
            return message;
          };
          SwoopParamsProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults)
              object.startDistInMeters = 0;
            if (message.startDistInMeters != null && message.hasOwnProperty("startDistInMeters"))
              object.startDistInMeters = options.json && !isFinite(message.startDistInMeters) ? String(message.startDistInMeters) : message.startDistInMeters;
            return object;
          };
          SwoopParamsProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          SwoopParamsProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.SwoopParamsProto";
          };
          return SwoopParamsProto;
        }();
        dbroot.PostingServerProto = function() {
          function PostingServerProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          PostingServerProto.prototype.name = null;
          PostingServerProto.prototype.baseUrl = null;
          PostingServerProto.prototype.postWizardPath = null;
          PostingServerProto.prototype.fileSubmitPath = null;
          PostingServerProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.PostingServerProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.name = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 2: {
                  message.baseUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 3: {
                  message.postWizardPath = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 4: {
                  message.fileSubmitPath = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            return message;
          };
          PostingServerProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (message.name != null && message.hasOwnProperty("name")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.name);
              if (error)
                return "name." + error;
            }
            if (message.baseUrl != null && message.hasOwnProperty("baseUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.baseUrl);
              if (error)
                return "baseUrl." + error;
            }
            if (message.postWizardPath != null && message.hasOwnProperty("postWizardPath")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.postWizardPath);
              if (error)
                return "postWizardPath." + error;
            }
            if (message.fileSubmitPath != null && message.hasOwnProperty("fileSubmitPath")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.fileSubmitPath);
              if (error)
                return "fileSubmitPath." + error;
            }
            return null;
          };
          PostingServerProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.PostingServerProto)
              return object;
            var message = new $root.keyhole.dbroot.PostingServerProto();
            if (object.name != null) {
              if (typeof object.name !== "object")
                throw TypeError(".keyhole.dbroot.PostingServerProto.name: object expected");
              message.name = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.name);
            }
            if (object.baseUrl != null) {
              if (typeof object.baseUrl !== "object")
                throw TypeError(".keyhole.dbroot.PostingServerProto.baseUrl: object expected");
              message.baseUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.baseUrl);
            }
            if (object.postWizardPath != null) {
              if (typeof object.postWizardPath !== "object")
                throw TypeError(".keyhole.dbroot.PostingServerProto.postWizardPath: object expected");
              message.postWizardPath = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.postWizardPath);
            }
            if (object.fileSubmitPath != null) {
              if (typeof object.fileSubmitPath !== "object")
                throw TypeError(".keyhole.dbroot.PostingServerProto.fileSubmitPath: object expected");
              message.fileSubmitPath = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.fileSubmitPath);
            }
            return message;
          };
          PostingServerProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.name = null;
              object.baseUrl = null;
              object.postWizardPath = null;
              object.fileSubmitPath = null;
            }
            if (message.name != null && message.hasOwnProperty("name"))
              object.name = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.name, options);
            if (message.baseUrl != null && message.hasOwnProperty("baseUrl"))
              object.baseUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.baseUrl, options);
            if (message.postWizardPath != null && message.hasOwnProperty("postWizardPath"))
              object.postWizardPath = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.postWizardPath, options);
            if (message.fileSubmitPath != null && message.hasOwnProperty("fileSubmitPath"))
              object.fileSubmitPath = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.fileSubmitPath, options);
            return object;
          };
          PostingServerProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          PostingServerProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.PostingServerProto";
          };
          return PostingServerProto;
        }();
        dbroot.PlanetaryDatabaseProto = function() {
          function PlanetaryDatabaseProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          PlanetaryDatabaseProto.prototype.url = null;
          PlanetaryDatabaseProto.prototype.name = null;
          PlanetaryDatabaseProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.PlanetaryDatabaseProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.url = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 2: {
                  message.name = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            if (!message.hasOwnProperty("url"))
              throw $util.ProtocolError("missing required 'url'", { instance: message });
            if (!message.hasOwnProperty("name"))
              throw $util.ProtocolError("missing required 'name'", { instance: message });
            return message;
          };
          PlanetaryDatabaseProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.url);
              if (error)
                return "url." + error;
            }
            {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.name);
              if (error)
                return "name." + error;
            }
            return null;
          };
          PlanetaryDatabaseProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.PlanetaryDatabaseProto)
              return object;
            var message = new $root.keyhole.dbroot.PlanetaryDatabaseProto();
            if (object.url != null) {
              if (typeof object.url !== "object")
                throw TypeError(".keyhole.dbroot.PlanetaryDatabaseProto.url: object expected");
              message.url = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.url);
            }
            if (object.name != null) {
              if (typeof object.name !== "object")
                throw TypeError(".keyhole.dbroot.PlanetaryDatabaseProto.name: object expected");
              message.name = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.name);
            }
            return message;
          };
          PlanetaryDatabaseProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.url = null;
              object.name = null;
            }
            if (message.url != null && message.hasOwnProperty("url"))
              object.url = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.url, options);
            if (message.name != null && message.hasOwnProperty("name"))
              object.name = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.name, options);
            return object;
          };
          PlanetaryDatabaseProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          PlanetaryDatabaseProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.PlanetaryDatabaseProto";
          };
          return PlanetaryDatabaseProto;
        }();
        dbroot.LogServerProto = function() {
          function LogServerProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          LogServerProto.prototype.url = null;
          LogServerProto.prototype.enable = false;
          LogServerProto.prototype.throttlingFactor = 1;
          LogServerProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.LogServerProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.url = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 2: {
                  message.enable = reader.bool();
                  break;
                }
                case 3: {
                  message.throttlingFactor = reader.int32();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            return message;
          };
          LogServerProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (message.url != null && message.hasOwnProperty("url")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.url);
              if (error)
                return "url." + error;
            }
            if (message.enable != null && message.hasOwnProperty("enable")) {
              if (typeof message.enable !== "boolean")
                return "enable: boolean expected";
            }
            if (message.throttlingFactor != null && message.hasOwnProperty("throttlingFactor")) {
              if (!$util.isInteger(message.throttlingFactor))
                return "throttlingFactor: integer expected";
            }
            return null;
          };
          LogServerProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.LogServerProto)
              return object;
            var message = new $root.keyhole.dbroot.LogServerProto();
            if (object.url != null) {
              if (typeof object.url !== "object")
                throw TypeError(".keyhole.dbroot.LogServerProto.url: object expected");
              message.url = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.url);
            }
            if (object.enable != null)
              message.enable = Boolean(object.enable);
            if (object.throttlingFactor != null)
              message.throttlingFactor = object.throttlingFactor | 0;
            return message;
          };
          LogServerProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.url = null;
              object.enable = false;
              object.throttlingFactor = 1;
            }
            if (message.url != null && message.hasOwnProperty("url"))
              object.url = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.url, options);
            if (message.enable != null && message.hasOwnProperty("enable"))
              object.enable = message.enable;
            if (message.throttlingFactor != null && message.hasOwnProperty("throttlingFactor"))
              object.throttlingFactor = message.throttlingFactor;
            return object;
          };
          LogServerProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          LogServerProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.LogServerProto";
          };
          return LogServerProto;
        }();
        dbroot.EndSnippetProto = function() {
          function EndSnippetProto(properties) {
            this.mfeDomains = [];
            this.searchTab = [];
            this.cobrandInfo = [];
            this.validDatabase = [];
            this.configScript = [];
            this.planetaryDatabase = [];
            this.filmstripConfig = [];
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          EndSnippetProto.prototype.model = null;
          EndSnippetProto.prototype.authServerUrl = null;
          EndSnippetProto.prototype.disableAuthentication = false;
          EndSnippetProto.prototype.mfeDomains = $util.emptyArray;
          EndSnippetProto.prototype.mfeLangParam = "hl=$5Bhl5D";
          EndSnippetProto.prototype.adsUrlPatterns = "";
          EndSnippetProto.prototype.reverseGeocoderUrl = null;
          EndSnippetProto.prototype.reverseGeocoderProtocolVersion = 3;
          EndSnippetProto.prototype.skyDatabaseIsAvailable = true;
          EndSnippetProto.prototype.skyDatabaseUrl = null;
          EndSnippetProto.prototype.defaultWebPageIntlUrl = null;
          EndSnippetProto.prototype.numStartUpTips = 17;
          EndSnippetProto.prototype.startUpTipsUrl = null;
          EndSnippetProto.prototype.numProStartUpTips = 0;
          EndSnippetProto.prototype.proStartUpTipsUrl = null;
          EndSnippetProto.prototype.startupTipsIntlUrl = null;
          EndSnippetProto.prototype.userGuideIntlUrl = null;
          EndSnippetProto.prototype.supportCenterIntlUrl = null;
          EndSnippetProto.prototype.businessListingIntlUrl = null;
          EndSnippetProto.prototype.supportAnswerIntlUrl = null;
          EndSnippetProto.prototype.supportTopicIntlUrl = null;
          EndSnippetProto.prototype.supportRequestIntlUrl = null;
          EndSnippetProto.prototype.earthIntlUrl = null;
          EndSnippetProto.prototype.addContentUrl = null;
          EndSnippetProto.prototype.sketchupNotInstalledUrl = null;
          EndSnippetProto.prototype.sketchupErrorUrl = null;
          EndSnippetProto.prototype.freeLicenseUrl = null;
          EndSnippetProto.prototype.proLicenseUrl = null;
          EndSnippetProto.prototype.tutorialUrl = null;
          EndSnippetProto.prototype.keyboardShortcutsUrl = null;
          EndSnippetProto.prototype.releaseNotesUrl = null;
          EndSnippetProto.prototype.hideUserData = false;
          EndSnippetProto.prototype.useGeLogo = true;
          EndSnippetProto.prototype.dioramaDescriptionUrlBase = null;
          EndSnippetProto.prototype.dioramaDefaultColor = 4291281607;
          EndSnippetProto.prototype.dioramaBlacklistUrl = null;
          EndSnippetProto.prototype.clientOptions = null;
          EndSnippetProto.prototype.fetchingOptions = null;
          EndSnippetProto.prototype.timeMachineOptions = null;
          EndSnippetProto.prototype.csiOptions = null;
          EndSnippetProto.prototype.searchTab = $util.emptyArray;
          EndSnippetProto.prototype.cobrandInfo = $util.emptyArray;
          EndSnippetProto.prototype.validDatabase = $util.emptyArray;
          EndSnippetProto.prototype.configScript = $util.emptyArray;
          EndSnippetProto.prototype.deauthServerUrl = null;
          EndSnippetProto.prototype.swoopParameters = null;
          EndSnippetProto.prototype.bbsServerInfo = null;
          EndSnippetProto.prototype.dataErrorServerInfo = null;
          EndSnippetProto.prototype.planetaryDatabase = $util.emptyArray;
          EndSnippetProto.prototype.logServer = null;
          EndSnippetProto.prototype.autopiaOptions = null;
          EndSnippetProto.prototype.searchConfig = null;
          EndSnippetProto.prototype.searchInfo = null;
          EndSnippetProto.prototype.elevationServiceBaseUrl = "http://maps.google.com/maps/api/elevation/";
          EndSnippetProto.prototype.elevationProfileQueryDelay = 500;
          EndSnippetProto.prototype.proUpgradeUrl = null;
          EndSnippetProto.prototype.earthCommunityUrl = null;
          EndSnippetProto.prototype.googleMapsUrl = null;
          EndSnippetProto.prototype.sharingUrl = null;
          EndSnippetProto.prototype.privacyPolicyUrl = null;
          EndSnippetProto.prototype.doGplusUserCheck = false;
          EndSnippetProto.prototype.rocktreeDataProto = null;
          EndSnippetProto.prototype.filmstripConfig = $util.emptyArray;
          EndSnippetProto.prototype.showSigninButton = false;
          EndSnippetProto.prototype.proMeasureUpsellUrl = null;
          EndSnippetProto.prototype.proPrintUpsellUrl = null;
          EndSnippetProto.prototype.starDataProto = null;
          EndSnippetProto.prototype.feedbackUrl = null;
          EndSnippetProto.prototype.oauth2LoginUrl = null;
          EndSnippetProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.EndSnippetProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.model = $root.keyhole.dbroot.PlanetModelProto.decode(reader, reader.uint32());
                  break;
                }
                case 2: {
                  message.authServerUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 3: {
                  message.disableAuthentication = reader.bool();
                  break;
                }
                case 4: {
                  if (!(message.mfeDomains && message.mfeDomains.length))
                    message.mfeDomains = [];
                  message.mfeDomains.push($root.keyhole.dbroot.MfeDomainFeaturesProto.decode(reader, reader.uint32()));
                  break;
                }
                case 5: {
                  message.mfeLangParam = reader.string();
                  break;
                }
                case 6: {
                  message.adsUrlPatterns = reader.string();
                  break;
                }
                case 7: {
                  message.reverseGeocoderUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 8: {
                  message.reverseGeocoderProtocolVersion = reader.int32();
                  break;
                }
                case 9: {
                  message.skyDatabaseIsAvailable = reader.bool();
                  break;
                }
                case 10: {
                  message.skyDatabaseUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 11: {
                  message.defaultWebPageIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 12: {
                  message.numStartUpTips = reader.int32();
                  break;
                }
                case 13: {
                  message.startUpTipsUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 51: {
                  message.numProStartUpTips = reader.int32();
                  break;
                }
                case 52: {
                  message.proStartUpTipsUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 64: {
                  message.startupTipsIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 14: {
                  message.userGuideIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 15: {
                  message.supportCenterIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 16: {
                  message.businessListingIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 17: {
                  message.supportAnswerIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 18: {
                  message.supportTopicIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 19: {
                  message.supportRequestIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 20: {
                  message.earthIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 21: {
                  message.addContentUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 22: {
                  message.sketchupNotInstalledUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 23: {
                  message.sketchupErrorUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 24: {
                  message.freeLicenseUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 25: {
                  message.proLicenseUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 48: {
                  message.tutorialUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 49: {
                  message.keyboardShortcutsUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 50: {
                  message.releaseNotesUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 26: {
                  message.hideUserData = reader.bool();
                  break;
                }
                case 27: {
                  message.useGeLogo = reader.bool();
                  break;
                }
                case 28: {
                  message.dioramaDescriptionUrlBase = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 29: {
                  message.dioramaDefaultColor = reader.uint32();
                  break;
                }
                case 53: {
                  message.dioramaBlacklistUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 30: {
                  message.clientOptions = $root.keyhole.dbroot.ClientOptionsProto.decode(reader, reader.uint32());
                  break;
                }
                case 31: {
                  message.fetchingOptions = $root.keyhole.dbroot.FetchingOptionsProto.decode(reader, reader.uint32());
                  break;
                }
                case 32: {
                  message.timeMachineOptions = $root.keyhole.dbroot.TimeMachineOptionsProto.decode(reader, reader.uint32());
                  break;
                }
                case 33: {
                  message.csiOptions = $root.keyhole.dbroot.CSIOptionsProto.decode(reader, reader.uint32());
                  break;
                }
                case 34: {
                  if (!(message.searchTab && message.searchTab.length))
                    message.searchTab = [];
                  message.searchTab.push($root.keyhole.dbroot.SearchTabProto.decode(reader, reader.uint32()));
                  break;
                }
                case 35: {
                  if (!(message.cobrandInfo && message.cobrandInfo.length))
                    message.cobrandInfo = [];
                  message.cobrandInfo.push($root.keyhole.dbroot.CobrandProto.decode(reader, reader.uint32()));
                  break;
                }
                case 36: {
                  if (!(message.validDatabase && message.validDatabase.length))
                    message.validDatabase = [];
                  message.validDatabase.push($root.keyhole.dbroot.DatabaseDescriptionProto.decode(reader, reader.uint32()));
                  break;
                }
                case 37: {
                  if (!(message.configScript && message.configScript.length))
                    message.configScript = [];
                  message.configScript.push($root.keyhole.dbroot.ConfigScriptProto.decode(reader, reader.uint32()));
                  break;
                }
                case 38: {
                  message.deauthServerUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 39: {
                  message.swoopParameters = $root.keyhole.dbroot.SwoopParamsProto.decode(reader, reader.uint32());
                  break;
                }
                case 40: {
                  message.bbsServerInfo = $root.keyhole.dbroot.PostingServerProto.decode(reader, reader.uint32());
                  break;
                }
                case 41: {
                  message.dataErrorServerInfo = $root.keyhole.dbroot.PostingServerProto.decode(reader, reader.uint32());
                  break;
                }
                case 42: {
                  if (!(message.planetaryDatabase && message.planetaryDatabase.length))
                    message.planetaryDatabase = [];
                  message.planetaryDatabase.push($root.keyhole.dbroot.PlanetaryDatabaseProto.decode(reader, reader.uint32()));
                  break;
                }
                case 43: {
                  message.logServer = $root.keyhole.dbroot.LogServerProto.decode(reader, reader.uint32());
                  break;
                }
                case 44: {
                  message.autopiaOptions = $root.keyhole.dbroot.AutopiaOptionsProto.decode(reader, reader.uint32());
                  break;
                }
                case 54: {
                  message.searchConfig = $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.decode(reader, reader.uint32());
                  break;
                }
                case 45: {
                  message.searchInfo = $root.keyhole.dbroot.EndSnippetProto.SearchInfoProto.decode(reader, reader.uint32());
                  break;
                }
                case 46: {
                  message.elevationServiceBaseUrl = reader.string();
                  break;
                }
                case 47: {
                  message.elevationProfileQueryDelay = reader.int32();
                  break;
                }
                case 55: {
                  message.proUpgradeUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 56: {
                  message.earthCommunityUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 57: {
                  message.googleMapsUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 58: {
                  message.sharingUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 59: {
                  message.privacyPolicyUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 60: {
                  message.doGplusUserCheck = reader.bool();
                  break;
                }
                case 61: {
                  message.rocktreeDataProto = $root.keyhole.dbroot.EndSnippetProto.RockTreeDataProto.decode(reader, reader.uint32());
                  break;
                }
                case 62: {
                  if (!(message.filmstripConfig && message.filmstripConfig.length))
                    message.filmstripConfig = [];
                  message.filmstripConfig.push($root.keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.decode(reader, reader.uint32()));
                  break;
                }
                case 63: {
                  message.showSigninButton = reader.bool();
                  break;
                }
                case 65: {
                  message.proMeasureUpsellUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 66: {
                  message.proPrintUpsellUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 67: {
                  message.starDataProto = $root.keyhole.dbroot.EndSnippetProto.StarDataProto.decode(reader, reader.uint32());
                  break;
                }
                case 68: {
                  message.feedbackUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 69: {
                  message.oauth2LoginUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            return message;
          };
          EndSnippetProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (message.model != null && message.hasOwnProperty("model")) {
              var error = $root.keyhole.dbroot.PlanetModelProto.verify(message.model);
              if (error)
                return "model." + error;
            }
            if (message.authServerUrl != null && message.hasOwnProperty("authServerUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.authServerUrl);
              if (error)
                return "authServerUrl." + error;
            }
            if (message.disableAuthentication != null && message.hasOwnProperty("disableAuthentication")) {
              if (typeof message.disableAuthentication !== "boolean")
                return "disableAuthentication: boolean expected";
            }
            if (message.mfeDomains != null && message.hasOwnProperty("mfeDomains")) {
              if (!Array.isArray(message.mfeDomains))
                return "mfeDomains: array expected";
              for (var i = 0; i < message.mfeDomains.length; ++i) {
                var error = $root.keyhole.dbroot.MfeDomainFeaturesProto.verify(message.mfeDomains[i]);
                if (error)
                  return "mfeDomains." + error;
              }
            }
            if (message.mfeLangParam != null && message.hasOwnProperty("mfeLangParam")) {
              if (!$util.isString(message.mfeLangParam))
                return "mfeLangParam: string expected";
            }
            if (message.adsUrlPatterns != null && message.hasOwnProperty("adsUrlPatterns")) {
              if (!$util.isString(message.adsUrlPatterns))
                return "adsUrlPatterns: string expected";
            }
            if (message.reverseGeocoderUrl != null && message.hasOwnProperty("reverseGeocoderUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.reverseGeocoderUrl);
              if (error)
                return "reverseGeocoderUrl." + error;
            }
            if (message.reverseGeocoderProtocolVersion != null && message.hasOwnProperty("reverseGeocoderProtocolVersion")) {
              if (!$util.isInteger(message.reverseGeocoderProtocolVersion))
                return "reverseGeocoderProtocolVersion: integer expected";
            }
            if (message.skyDatabaseIsAvailable != null && message.hasOwnProperty("skyDatabaseIsAvailable")) {
              if (typeof message.skyDatabaseIsAvailable !== "boolean")
                return "skyDatabaseIsAvailable: boolean expected";
            }
            if (message.skyDatabaseUrl != null && message.hasOwnProperty("skyDatabaseUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.skyDatabaseUrl);
              if (error)
                return "skyDatabaseUrl." + error;
            }
            if (message.defaultWebPageIntlUrl != null && message.hasOwnProperty("defaultWebPageIntlUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.defaultWebPageIntlUrl);
              if (error)
                return "defaultWebPageIntlUrl." + error;
            }
            if (message.numStartUpTips != null && message.hasOwnProperty("numStartUpTips")) {
              if (!$util.isInteger(message.numStartUpTips))
                return "numStartUpTips: integer expected";
            }
            if (message.startUpTipsUrl != null && message.hasOwnProperty("startUpTipsUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.startUpTipsUrl);
              if (error)
                return "startUpTipsUrl." + error;
            }
            if (message.numProStartUpTips != null && message.hasOwnProperty("numProStartUpTips")) {
              if (!$util.isInteger(message.numProStartUpTips))
                return "numProStartUpTips: integer expected";
            }
            if (message.proStartUpTipsUrl != null && message.hasOwnProperty("proStartUpTipsUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.proStartUpTipsUrl);
              if (error)
                return "proStartUpTipsUrl." + error;
            }
            if (message.startupTipsIntlUrl != null && message.hasOwnProperty("startupTipsIntlUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.startupTipsIntlUrl);
              if (error)
                return "startupTipsIntlUrl." + error;
            }
            if (message.userGuideIntlUrl != null && message.hasOwnProperty("userGuideIntlUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.userGuideIntlUrl);
              if (error)
                return "userGuideIntlUrl." + error;
            }
            if (message.supportCenterIntlUrl != null && message.hasOwnProperty("supportCenterIntlUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.supportCenterIntlUrl);
              if (error)
                return "supportCenterIntlUrl." + error;
            }
            if (message.businessListingIntlUrl != null && message.hasOwnProperty("businessListingIntlUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.businessListingIntlUrl);
              if (error)
                return "businessListingIntlUrl." + error;
            }
            if (message.supportAnswerIntlUrl != null && message.hasOwnProperty("supportAnswerIntlUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.supportAnswerIntlUrl);
              if (error)
                return "supportAnswerIntlUrl." + error;
            }
            if (message.supportTopicIntlUrl != null && message.hasOwnProperty("supportTopicIntlUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.supportTopicIntlUrl);
              if (error)
                return "supportTopicIntlUrl." + error;
            }
            if (message.supportRequestIntlUrl != null && message.hasOwnProperty("supportRequestIntlUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.supportRequestIntlUrl);
              if (error)
                return "supportRequestIntlUrl." + error;
            }
            if (message.earthIntlUrl != null && message.hasOwnProperty("earthIntlUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.earthIntlUrl);
              if (error)
                return "earthIntlUrl." + error;
            }
            if (message.addContentUrl != null && message.hasOwnProperty("addContentUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.addContentUrl);
              if (error)
                return "addContentUrl." + error;
            }
            if (message.sketchupNotInstalledUrl != null && message.hasOwnProperty("sketchupNotInstalledUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.sketchupNotInstalledUrl);
              if (error)
                return "sketchupNotInstalledUrl." + error;
            }
            if (message.sketchupErrorUrl != null && message.hasOwnProperty("sketchupErrorUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.sketchupErrorUrl);
              if (error)
                return "sketchupErrorUrl." + error;
            }
            if (message.freeLicenseUrl != null && message.hasOwnProperty("freeLicenseUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.freeLicenseUrl);
              if (error)
                return "freeLicenseUrl." + error;
            }
            if (message.proLicenseUrl != null && message.hasOwnProperty("proLicenseUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.proLicenseUrl);
              if (error)
                return "proLicenseUrl." + error;
            }
            if (message.tutorialUrl != null && message.hasOwnProperty("tutorialUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.tutorialUrl);
              if (error)
                return "tutorialUrl." + error;
            }
            if (message.keyboardShortcutsUrl != null && message.hasOwnProperty("keyboardShortcutsUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.keyboardShortcutsUrl);
              if (error)
                return "keyboardShortcutsUrl." + error;
            }
            if (message.releaseNotesUrl != null && message.hasOwnProperty("releaseNotesUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.releaseNotesUrl);
              if (error)
                return "releaseNotesUrl." + error;
            }
            if (message.hideUserData != null && message.hasOwnProperty("hideUserData")) {
              if (typeof message.hideUserData !== "boolean")
                return "hideUserData: boolean expected";
            }
            if (message.useGeLogo != null && message.hasOwnProperty("useGeLogo")) {
              if (typeof message.useGeLogo !== "boolean")
                return "useGeLogo: boolean expected";
            }
            if (message.dioramaDescriptionUrlBase != null && message.hasOwnProperty("dioramaDescriptionUrlBase")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.dioramaDescriptionUrlBase);
              if (error)
                return "dioramaDescriptionUrlBase." + error;
            }
            if (message.dioramaDefaultColor != null && message.hasOwnProperty("dioramaDefaultColor")) {
              if (!$util.isInteger(message.dioramaDefaultColor))
                return "dioramaDefaultColor: integer expected";
            }
            if (message.dioramaBlacklistUrl != null && message.hasOwnProperty("dioramaBlacklistUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.dioramaBlacklistUrl);
              if (error)
                return "dioramaBlacklistUrl." + error;
            }
            if (message.clientOptions != null && message.hasOwnProperty("clientOptions")) {
              var error = $root.keyhole.dbroot.ClientOptionsProto.verify(message.clientOptions);
              if (error)
                return "clientOptions." + error;
            }
            if (message.fetchingOptions != null && message.hasOwnProperty("fetchingOptions")) {
              var error = $root.keyhole.dbroot.FetchingOptionsProto.verify(message.fetchingOptions);
              if (error)
                return "fetchingOptions." + error;
            }
            if (message.timeMachineOptions != null && message.hasOwnProperty("timeMachineOptions")) {
              var error = $root.keyhole.dbroot.TimeMachineOptionsProto.verify(message.timeMachineOptions);
              if (error)
                return "timeMachineOptions." + error;
            }
            if (message.csiOptions != null && message.hasOwnProperty("csiOptions")) {
              var error = $root.keyhole.dbroot.CSIOptionsProto.verify(message.csiOptions);
              if (error)
                return "csiOptions." + error;
            }
            if (message.searchTab != null && message.hasOwnProperty("searchTab")) {
              if (!Array.isArray(message.searchTab))
                return "searchTab: array expected";
              for (var i = 0; i < message.searchTab.length; ++i) {
                var error = $root.keyhole.dbroot.SearchTabProto.verify(message.searchTab[i]);
                if (error)
                  return "searchTab." + error;
              }
            }
            if (message.cobrandInfo != null && message.hasOwnProperty("cobrandInfo")) {
              if (!Array.isArray(message.cobrandInfo))
                return "cobrandInfo: array expected";
              for (var i = 0; i < message.cobrandInfo.length; ++i) {
                var error = $root.keyhole.dbroot.CobrandProto.verify(message.cobrandInfo[i]);
                if (error)
                  return "cobrandInfo." + error;
              }
            }
            if (message.validDatabase != null && message.hasOwnProperty("validDatabase")) {
              if (!Array.isArray(message.validDatabase))
                return "validDatabase: array expected";
              for (var i = 0; i < message.validDatabase.length; ++i) {
                var error = $root.keyhole.dbroot.DatabaseDescriptionProto.verify(message.validDatabase[i]);
                if (error)
                  return "validDatabase." + error;
              }
            }
            if (message.configScript != null && message.hasOwnProperty("configScript")) {
              if (!Array.isArray(message.configScript))
                return "configScript: array expected";
              for (var i = 0; i < message.configScript.length; ++i) {
                var error = $root.keyhole.dbroot.ConfigScriptProto.verify(message.configScript[i]);
                if (error)
                  return "configScript." + error;
              }
            }
            if (message.deauthServerUrl != null && message.hasOwnProperty("deauthServerUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.deauthServerUrl);
              if (error)
                return "deauthServerUrl." + error;
            }
            if (message.swoopParameters != null && message.hasOwnProperty("swoopParameters")) {
              var error = $root.keyhole.dbroot.SwoopParamsProto.verify(message.swoopParameters);
              if (error)
                return "swoopParameters." + error;
            }
            if (message.bbsServerInfo != null && message.hasOwnProperty("bbsServerInfo")) {
              var error = $root.keyhole.dbroot.PostingServerProto.verify(message.bbsServerInfo);
              if (error)
                return "bbsServerInfo." + error;
            }
            if (message.dataErrorServerInfo != null && message.hasOwnProperty("dataErrorServerInfo")) {
              var error = $root.keyhole.dbroot.PostingServerProto.verify(message.dataErrorServerInfo);
              if (error)
                return "dataErrorServerInfo." + error;
            }
            if (message.planetaryDatabase != null && message.hasOwnProperty("planetaryDatabase")) {
              if (!Array.isArray(message.planetaryDatabase))
                return "planetaryDatabase: array expected";
              for (var i = 0; i < message.planetaryDatabase.length; ++i) {
                var error = $root.keyhole.dbroot.PlanetaryDatabaseProto.verify(message.planetaryDatabase[i]);
                if (error)
                  return "planetaryDatabase." + error;
              }
            }
            if (message.logServer != null && message.hasOwnProperty("logServer")) {
              var error = $root.keyhole.dbroot.LogServerProto.verify(message.logServer);
              if (error)
                return "logServer." + error;
            }
            if (message.autopiaOptions != null && message.hasOwnProperty("autopiaOptions")) {
              var error = $root.keyhole.dbroot.AutopiaOptionsProto.verify(message.autopiaOptions);
              if (error)
                return "autopiaOptions." + error;
            }
            if (message.searchConfig != null && message.hasOwnProperty("searchConfig")) {
              var error = $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.verify(message.searchConfig);
              if (error)
                return "searchConfig." + error;
            }
            if (message.searchInfo != null && message.hasOwnProperty("searchInfo")) {
              var error = $root.keyhole.dbroot.EndSnippetProto.SearchInfoProto.verify(message.searchInfo);
              if (error)
                return "searchInfo." + error;
            }
            if (message.elevationServiceBaseUrl != null && message.hasOwnProperty("elevationServiceBaseUrl")) {
              if (!$util.isString(message.elevationServiceBaseUrl))
                return "elevationServiceBaseUrl: string expected";
            }
            if (message.elevationProfileQueryDelay != null && message.hasOwnProperty("elevationProfileQueryDelay")) {
              if (!$util.isInteger(message.elevationProfileQueryDelay))
                return "elevationProfileQueryDelay: integer expected";
            }
            if (message.proUpgradeUrl != null && message.hasOwnProperty("proUpgradeUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.proUpgradeUrl);
              if (error)
                return "proUpgradeUrl." + error;
            }
            if (message.earthCommunityUrl != null && message.hasOwnProperty("earthCommunityUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.earthCommunityUrl);
              if (error)
                return "earthCommunityUrl." + error;
            }
            if (message.googleMapsUrl != null && message.hasOwnProperty("googleMapsUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.googleMapsUrl);
              if (error)
                return "googleMapsUrl." + error;
            }
            if (message.sharingUrl != null && message.hasOwnProperty("sharingUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.sharingUrl);
              if (error)
                return "sharingUrl." + error;
            }
            if (message.privacyPolicyUrl != null && message.hasOwnProperty("privacyPolicyUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.privacyPolicyUrl);
              if (error)
                return "privacyPolicyUrl." + error;
            }
            if (message.doGplusUserCheck != null && message.hasOwnProperty("doGplusUserCheck")) {
              if (typeof message.doGplusUserCheck !== "boolean")
                return "doGplusUserCheck: boolean expected";
            }
            if (message.rocktreeDataProto != null && message.hasOwnProperty("rocktreeDataProto")) {
              var error = $root.keyhole.dbroot.EndSnippetProto.RockTreeDataProto.verify(message.rocktreeDataProto);
              if (error)
                return "rocktreeDataProto." + error;
            }
            if (message.filmstripConfig != null && message.hasOwnProperty("filmstripConfig")) {
              if (!Array.isArray(message.filmstripConfig))
                return "filmstripConfig: array expected";
              for (var i = 0; i < message.filmstripConfig.length; ++i) {
                var error = $root.keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.verify(message.filmstripConfig[i]);
                if (error)
                  return "filmstripConfig." + error;
              }
            }
            if (message.showSigninButton != null && message.hasOwnProperty("showSigninButton")) {
              if (typeof message.showSigninButton !== "boolean")
                return "showSigninButton: boolean expected";
            }
            if (message.proMeasureUpsellUrl != null && message.hasOwnProperty("proMeasureUpsellUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.proMeasureUpsellUrl);
              if (error)
                return "proMeasureUpsellUrl." + error;
            }
            if (message.proPrintUpsellUrl != null && message.hasOwnProperty("proPrintUpsellUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.proPrintUpsellUrl);
              if (error)
                return "proPrintUpsellUrl." + error;
            }
            if (message.starDataProto != null && message.hasOwnProperty("starDataProto")) {
              var error = $root.keyhole.dbroot.EndSnippetProto.StarDataProto.verify(message.starDataProto);
              if (error)
                return "starDataProto." + error;
            }
            if (message.feedbackUrl != null && message.hasOwnProperty("feedbackUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.feedbackUrl);
              if (error)
                return "feedbackUrl." + error;
            }
            if (message.oauth2LoginUrl != null && message.hasOwnProperty("oauth2LoginUrl")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.oauth2LoginUrl);
              if (error)
                return "oauth2LoginUrl." + error;
            }
            return null;
          };
          EndSnippetProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.EndSnippetProto)
              return object;
            var message = new $root.keyhole.dbroot.EndSnippetProto();
            if (object.model != null) {
              if (typeof object.model !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.model: object expected");
              message.model = $root.keyhole.dbroot.PlanetModelProto.fromObject(object.model);
            }
            if (object.authServerUrl != null) {
              if (typeof object.authServerUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.authServerUrl: object expected");
              message.authServerUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.authServerUrl);
            }
            if (object.disableAuthentication != null)
              message.disableAuthentication = Boolean(object.disableAuthentication);
            if (object.mfeDomains) {
              if (!Array.isArray(object.mfeDomains))
                throw TypeError(".keyhole.dbroot.EndSnippetProto.mfeDomains: array expected");
              message.mfeDomains = [];
              for (var i = 0; i < object.mfeDomains.length; ++i) {
                if (typeof object.mfeDomains[i] !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.mfeDomains: object expected");
                message.mfeDomains[i] = $root.keyhole.dbroot.MfeDomainFeaturesProto.fromObject(object.mfeDomains[i]);
              }
            }
            if (object.mfeLangParam != null)
              message.mfeLangParam = String(object.mfeLangParam);
            if (object.adsUrlPatterns != null)
              message.adsUrlPatterns = String(object.adsUrlPatterns);
            if (object.reverseGeocoderUrl != null) {
              if (typeof object.reverseGeocoderUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.reverseGeocoderUrl: object expected");
              message.reverseGeocoderUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.reverseGeocoderUrl);
            }
            if (object.reverseGeocoderProtocolVersion != null)
              message.reverseGeocoderProtocolVersion = object.reverseGeocoderProtocolVersion | 0;
            if (object.skyDatabaseIsAvailable != null)
              message.skyDatabaseIsAvailable = Boolean(object.skyDatabaseIsAvailable);
            if (object.skyDatabaseUrl != null) {
              if (typeof object.skyDatabaseUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.skyDatabaseUrl: object expected");
              message.skyDatabaseUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.skyDatabaseUrl);
            }
            if (object.defaultWebPageIntlUrl != null) {
              if (typeof object.defaultWebPageIntlUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.defaultWebPageIntlUrl: object expected");
              message.defaultWebPageIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.defaultWebPageIntlUrl);
            }
            if (object.numStartUpTips != null)
              message.numStartUpTips = object.numStartUpTips | 0;
            if (object.startUpTipsUrl != null) {
              if (typeof object.startUpTipsUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.startUpTipsUrl: object expected");
              message.startUpTipsUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.startUpTipsUrl);
            }
            if (object.numProStartUpTips != null)
              message.numProStartUpTips = object.numProStartUpTips | 0;
            if (object.proStartUpTipsUrl != null) {
              if (typeof object.proStartUpTipsUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.proStartUpTipsUrl: object expected");
              message.proStartUpTipsUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.proStartUpTipsUrl);
            }
            if (object.startupTipsIntlUrl != null) {
              if (typeof object.startupTipsIntlUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.startupTipsIntlUrl: object expected");
              message.startupTipsIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.startupTipsIntlUrl);
            }
            if (object.userGuideIntlUrl != null) {
              if (typeof object.userGuideIntlUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.userGuideIntlUrl: object expected");
              message.userGuideIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.userGuideIntlUrl);
            }
            if (object.supportCenterIntlUrl != null) {
              if (typeof object.supportCenterIntlUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.supportCenterIntlUrl: object expected");
              message.supportCenterIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.supportCenterIntlUrl);
            }
            if (object.businessListingIntlUrl != null) {
              if (typeof object.businessListingIntlUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.businessListingIntlUrl: object expected");
              message.businessListingIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.businessListingIntlUrl);
            }
            if (object.supportAnswerIntlUrl != null) {
              if (typeof object.supportAnswerIntlUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.supportAnswerIntlUrl: object expected");
              message.supportAnswerIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.supportAnswerIntlUrl);
            }
            if (object.supportTopicIntlUrl != null) {
              if (typeof object.supportTopicIntlUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.supportTopicIntlUrl: object expected");
              message.supportTopicIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.supportTopicIntlUrl);
            }
            if (object.supportRequestIntlUrl != null) {
              if (typeof object.supportRequestIntlUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.supportRequestIntlUrl: object expected");
              message.supportRequestIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.supportRequestIntlUrl);
            }
            if (object.earthIntlUrl != null) {
              if (typeof object.earthIntlUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.earthIntlUrl: object expected");
              message.earthIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.earthIntlUrl);
            }
            if (object.addContentUrl != null) {
              if (typeof object.addContentUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.addContentUrl: object expected");
              message.addContentUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.addContentUrl);
            }
            if (object.sketchupNotInstalledUrl != null) {
              if (typeof object.sketchupNotInstalledUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.sketchupNotInstalledUrl: object expected");
              message.sketchupNotInstalledUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.sketchupNotInstalledUrl);
            }
            if (object.sketchupErrorUrl != null) {
              if (typeof object.sketchupErrorUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.sketchupErrorUrl: object expected");
              message.sketchupErrorUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.sketchupErrorUrl);
            }
            if (object.freeLicenseUrl != null) {
              if (typeof object.freeLicenseUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.freeLicenseUrl: object expected");
              message.freeLicenseUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.freeLicenseUrl);
            }
            if (object.proLicenseUrl != null) {
              if (typeof object.proLicenseUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.proLicenseUrl: object expected");
              message.proLicenseUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.proLicenseUrl);
            }
            if (object.tutorialUrl != null) {
              if (typeof object.tutorialUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.tutorialUrl: object expected");
              message.tutorialUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.tutorialUrl);
            }
            if (object.keyboardShortcutsUrl != null) {
              if (typeof object.keyboardShortcutsUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.keyboardShortcutsUrl: object expected");
              message.keyboardShortcutsUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.keyboardShortcutsUrl);
            }
            if (object.releaseNotesUrl != null) {
              if (typeof object.releaseNotesUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.releaseNotesUrl: object expected");
              message.releaseNotesUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.releaseNotesUrl);
            }
            if (object.hideUserData != null)
              message.hideUserData = Boolean(object.hideUserData);
            if (object.useGeLogo != null)
              message.useGeLogo = Boolean(object.useGeLogo);
            if (object.dioramaDescriptionUrlBase != null) {
              if (typeof object.dioramaDescriptionUrlBase !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.dioramaDescriptionUrlBase: object expected");
              message.dioramaDescriptionUrlBase = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.dioramaDescriptionUrlBase);
            }
            if (object.dioramaDefaultColor != null)
              message.dioramaDefaultColor = object.dioramaDefaultColor >>> 0;
            if (object.dioramaBlacklistUrl != null) {
              if (typeof object.dioramaBlacklistUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.dioramaBlacklistUrl: object expected");
              message.dioramaBlacklistUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.dioramaBlacklistUrl);
            }
            if (object.clientOptions != null) {
              if (typeof object.clientOptions !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.clientOptions: object expected");
              message.clientOptions = $root.keyhole.dbroot.ClientOptionsProto.fromObject(object.clientOptions);
            }
            if (object.fetchingOptions != null) {
              if (typeof object.fetchingOptions !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.fetchingOptions: object expected");
              message.fetchingOptions = $root.keyhole.dbroot.FetchingOptionsProto.fromObject(object.fetchingOptions);
            }
            if (object.timeMachineOptions != null) {
              if (typeof object.timeMachineOptions !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.timeMachineOptions: object expected");
              message.timeMachineOptions = $root.keyhole.dbroot.TimeMachineOptionsProto.fromObject(object.timeMachineOptions);
            }
            if (object.csiOptions != null) {
              if (typeof object.csiOptions !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.csiOptions: object expected");
              message.csiOptions = $root.keyhole.dbroot.CSIOptionsProto.fromObject(object.csiOptions);
            }
            if (object.searchTab) {
              if (!Array.isArray(object.searchTab))
                throw TypeError(".keyhole.dbroot.EndSnippetProto.searchTab: array expected");
              message.searchTab = [];
              for (var i = 0; i < object.searchTab.length; ++i) {
                if (typeof object.searchTab[i] !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.searchTab: object expected");
                message.searchTab[i] = $root.keyhole.dbroot.SearchTabProto.fromObject(object.searchTab[i]);
              }
            }
            if (object.cobrandInfo) {
              if (!Array.isArray(object.cobrandInfo))
                throw TypeError(".keyhole.dbroot.EndSnippetProto.cobrandInfo: array expected");
              message.cobrandInfo = [];
              for (var i = 0; i < object.cobrandInfo.length; ++i) {
                if (typeof object.cobrandInfo[i] !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.cobrandInfo: object expected");
                message.cobrandInfo[i] = $root.keyhole.dbroot.CobrandProto.fromObject(object.cobrandInfo[i]);
              }
            }
            if (object.validDatabase) {
              if (!Array.isArray(object.validDatabase))
                throw TypeError(".keyhole.dbroot.EndSnippetProto.validDatabase: array expected");
              message.validDatabase = [];
              for (var i = 0; i < object.validDatabase.length; ++i) {
                if (typeof object.validDatabase[i] !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.validDatabase: object expected");
                message.validDatabase[i] = $root.keyhole.dbroot.DatabaseDescriptionProto.fromObject(object.validDatabase[i]);
              }
            }
            if (object.configScript) {
              if (!Array.isArray(object.configScript))
                throw TypeError(".keyhole.dbroot.EndSnippetProto.configScript: array expected");
              message.configScript = [];
              for (var i = 0; i < object.configScript.length; ++i) {
                if (typeof object.configScript[i] !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.configScript: object expected");
                message.configScript[i] = $root.keyhole.dbroot.ConfigScriptProto.fromObject(object.configScript[i]);
              }
            }
            if (object.deauthServerUrl != null) {
              if (typeof object.deauthServerUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.deauthServerUrl: object expected");
              message.deauthServerUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.deauthServerUrl);
            }
            if (object.swoopParameters != null) {
              if (typeof object.swoopParameters !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.swoopParameters: object expected");
              message.swoopParameters = $root.keyhole.dbroot.SwoopParamsProto.fromObject(object.swoopParameters);
            }
            if (object.bbsServerInfo != null) {
              if (typeof object.bbsServerInfo !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.bbsServerInfo: object expected");
              message.bbsServerInfo = $root.keyhole.dbroot.PostingServerProto.fromObject(object.bbsServerInfo);
            }
            if (object.dataErrorServerInfo != null) {
              if (typeof object.dataErrorServerInfo !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.dataErrorServerInfo: object expected");
              message.dataErrorServerInfo = $root.keyhole.dbroot.PostingServerProto.fromObject(object.dataErrorServerInfo);
            }
            if (object.planetaryDatabase) {
              if (!Array.isArray(object.planetaryDatabase))
                throw TypeError(".keyhole.dbroot.EndSnippetProto.planetaryDatabase: array expected");
              message.planetaryDatabase = [];
              for (var i = 0; i < object.planetaryDatabase.length; ++i) {
                if (typeof object.planetaryDatabase[i] !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.planetaryDatabase: object expected");
                message.planetaryDatabase[i] = $root.keyhole.dbroot.PlanetaryDatabaseProto.fromObject(object.planetaryDatabase[i]);
              }
            }
            if (object.logServer != null) {
              if (typeof object.logServer !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.logServer: object expected");
              message.logServer = $root.keyhole.dbroot.LogServerProto.fromObject(object.logServer);
            }
            if (object.autopiaOptions != null) {
              if (typeof object.autopiaOptions !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.autopiaOptions: object expected");
              message.autopiaOptions = $root.keyhole.dbroot.AutopiaOptionsProto.fromObject(object.autopiaOptions);
            }
            if (object.searchConfig != null) {
              if (typeof object.searchConfig !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.searchConfig: object expected");
              message.searchConfig = $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.fromObject(object.searchConfig);
            }
            if (object.searchInfo != null) {
              if (typeof object.searchInfo !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.searchInfo: object expected");
              message.searchInfo = $root.keyhole.dbroot.EndSnippetProto.SearchInfoProto.fromObject(object.searchInfo);
            }
            if (object.elevationServiceBaseUrl != null)
              message.elevationServiceBaseUrl = String(object.elevationServiceBaseUrl);
            if (object.elevationProfileQueryDelay != null)
              message.elevationProfileQueryDelay = object.elevationProfileQueryDelay | 0;
            if (object.proUpgradeUrl != null) {
              if (typeof object.proUpgradeUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.proUpgradeUrl: object expected");
              message.proUpgradeUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.proUpgradeUrl);
            }
            if (object.earthCommunityUrl != null) {
              if (typeof object.earthCommunityUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.earthCommunityUrl: object expected");
              message.earthCommunityUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.earthCommunityUrl);
            }
            if (object.googleMapsUrl != null) {
              if (typeof object.googleMapsUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.googleMapsUrl: object expected");
              message.googleMapsUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.googleMapsUrl);
            }
            if (object.sharingUrl != null) {
              if (typeof object.sharingUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.sharingUrl: object expected");
              message.sharingUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.sharingUrl);
            }
            if (object.privacyPolicyUrl != null) {
              if (typeof object.privacyPolicyUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.privacyPolicyUrl: object expected");
              message.privacyPolicyUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.privacyPolicyUrl);
            }
            if (object.doGplusUserCheck != null)
              message.doGplusUserCheck = Boolean(object.doGplusUserCheck);
            if (object.rocktreeDataProto != null) {
              if (typeof object.rocktreeDataProto !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.rocktreeDataProto: object expected");
              message.rocktreeDataProto = $root.keyhole.dbroot.EndSnippetProto.RockTreeDataProto.fromObject(object.rocktreeDataProto);
            }
            if (object.filmstripConfig) {
              if (!Array.isArray(object.filmstripConfig))
                throw TypeError(".keyhole.dbroot.EndSnippetProto.filmstripConfig: array expected");
              message.filmstripConfig = [];
              for (var i = 0; i < object.filmstripConfig.length; ++i) {
                if (typeof object.filmstripConfig[i] !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.filmstripConfig: object expected");
                message.filmstripConfig[i] = $root.keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.fromObject(object.filmstripConfig[i]);
              }
            }
            if (object.showSigninButton != null)
              message.showSigninButton = Boolean(object.showSigninButton);
            if (object.proMeasureUpsellUrl != null) {
              if (typeof object.proMeasureUpsellUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.proMeasureUpsellUrl: object expected");
              message.proMeasureUpsellUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.proMeasureUpsellUrl);
            }
            if (object.proPrintUpsellUrl != null) {
              if (typeof object.proPrintUpsellUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.proPrintUpsellUrl: object expected");
              message.proPrintUpsellUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.proPrintUpsellUrl);
            }
            if (object.starDataProto != null) {
              if (typeof object.starDataProto !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.starDataProto: object expected");
              message.starDataProto = $root.keyhole.dbroot.EndSnippetProto.StarDataProto.fromObject(object.starDataProto);
            }
            if (object.feedbackUrl != null) {
              if (typeof object.feedbackUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.feedbackUrl: object expected");
              message.feedbackUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.feedbackUrl);
            }
            if (object.oauth2LoginUrl != null) {
              if (typeof object.oauth2LoginUrl !== "object")
                throw TypeError(".keyhole.dbroot.EndSnippetProto.oauth2LoginUrl: object expected");
              message.oauth2LoginUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.oauth2LoginUrl);
            }
            return message;
          };
          EndSnippetProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.arrays || options.defaults) {
              object.mfeDomains = [];
              object.searchTab = [];
              object.cobrandInfo = [];
              object.validDatabase = [];
              object.configScript = [];
              object.planetaryDatabase = [];
              object.filmstripConfig = [];
            }
            if (options.defaults) {
              object.model = null;
              object.authServerUrl = null;
              object.disableAuthentication = false;
              object.mfeLangParam = "hl=$5Bhl5D";
              object.adsUrlPatterns = "";
              object.reverseGeocoderUrl = null;
              object.reverseGeocoderProtocolVersion = 3;
              object.skyDatabaseIsAvailable = true;
              object.skyDatabaseUrl = null;
              object.defaultWebPageIntlUrl = null;
              object.numStartUpTips = 17;
              object.startUpTipsUrl = null;
              object.userGuideIntlUrl = null;
              object.supportCenterIntlUrl = null;
              object.businessListingIntlUrl = null;
              object.supportAnswerIntlUrl = null;
              object.supportTopicIntlUrl = null;
              object.supportRequestIntlUrl = null;
              object.earthIntlUrl = null;
              object.addContentUrl = null;
              object.sketchupNotInstalledUrl = null;
              object.sketchupErrorUrl = null;
              object.freeLicenseUrl = null;
              object.proLicenseUrl = null;
              object.hideUserData = false;
              object.useGeLogo = true;
              object.dioramaDescriptionUrlBase = null;
              object.dioramaDefaultColor = 4291281607;
              object.clientOptions = null;
              object.fetchingOptions = null;
              object.timeMachineOptions = null;
              object.csiOptions = null;
              object.deauthServerUrl = null;
              object.swoopParameters = null;
              object.bbsServerInfo = null;
              object.dataErrorServerInfo = null;
              object.logServer = null;
              object.autopiaOptions = null;
              object.searchInfo = null;
              object.elevationServiceBaseUrl = "http://maps.google.com/maps/api/elevation/";
              object.elevationProfileQueryDelay = 500;
              object.tutorialUrl = null;
              object.keyboardShortcutsUrl = null;
              object.releaseNotesUrl = null;
              object.numProStartUpTips = 0;
              object.proStartUpTipsUrl = null;
              object.dioramaBlacklistUrl = null;
              object.searchConfig = null;
              object.proUpgradeUrl = null;
              object.earthCommunityUrl = null;
              object.googleMapsUrl = null;
              object.sharingUrl = null;
              object.privacyPolicyUrl = null;
              object.doGplusUserCheck = false;
              object.rocktreeDataProto = null;
              object.showSigninButton = false;
              object.startupTipsIntlUrl = null;
              object.proMeasureUpsellUrl = null;
              object.proPrintUpsellUrl = null;
              object.starDataProto = null;
              object.feedbackUrl = null;
              object.oauth2LoginUrl = null;
            }
            if (message.model != null && message.hasOwnProperty("model"))
              object.model = $root.keyhole.dbroot.PlanetModelProto.toObject(message.model, options);
            if (message.authServerUrl != null && message.hasOwnProperty("authServerUrl"))
              object.authServerUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.authServerUrl, options);
            if (message.disableAuthentication != null && message.hasOwnProperty("disableAuthentication"))
              object.disableAuthentication = message.disableAuthentication;
            if (message.mfeDomains && message.mfeDomains.length) {
              object.mfeDomains = [];
              for (var j = 0; j < message.mfeDomains.length; ++j)
                object.mfeDomains[j] = $root.keyhole.dbroot.MfeDomainFeaturesProto.toObject(message.mfeDomains[j], options);
            }
            if (message.mfeLangParam != null && message.hasOwnProperty("mfeLangParam"))
              object.mfeLangParam = message.mfeLangParam;
            if (message.adsUrlPatterns != null && message.hasOwnProperty("adsUrlPatterns"))
              object.adsUrlPatterns = message.adsUrlPatterns;
            if (message.reverseGeocoderUrl != null && message.hasOwnProperty("reverseGeocoderUrl"))
              object.reverseGeocoderUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.reverseGeocoderUrl, options);
            if (message.reverseGeocoderProtocolVersion != null && message.hasOwnProperty("reverseGeocoderProtocolVersion"))
              object.reverseGeocoderProtocolVersion = message.reverseGeocoderProtocolVersion;
            if (message.skyDatabaseIsAvailable != null && message.hasOwnProperty("skyDatabaseIsAvailable"))
              object.skyDatabaseIsAvailable = message.skyDatabaseIsAvailable;
            if (message.skyDatabaseUrl != null && message.hasOwnProperty("skyDatabaseUrl"))
              object.skyDatabaseUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.skyDatabaseUrl, options);
            if (message.defaultWebPageIntlUrl != null && message.hasOwnProperty("defaultWebPageIntlUrl"))
              object.defaultWebPageIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.defaultWebPageIntlUrl, options);
            if (message.numStartUpTips != null && message.hasOwnProperty("numStartUpTips"))
              object.numStartUpTips = message.numStartUpTips;
            if (message.startUpTipsUrl != null && message.hasOwnProperty("startUpTipsUrl"))
              object.startUpTipsUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.startUpTipsUrl, options);
            if (message.userGuideIntlUrl != null && message.hasOwnProperty("userGuideIntlUrl"))
              object.userGuideIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.userGuideIntlUrl, options);
            if (message.supportCenterIntlUrl != null && message.hasOwnProperty("supportCenterIntlUrl"))
              object.supportCenterIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.supportCenterIntlUrl, options);
            if (message.businessListingIntlUrl != null && message.hasOwnProperty("businessListingIntlUrl"))
              object.businessListingIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.businessListingIntlUrl, options);
            if (message.supportAnswerIntlUrl != null && message.hasOwnProperty("supportAnswerIntlUrl"))
              object.supportAnswerIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.supportAnswerIntlUrl, options);
            if (message.supportTopicIntlUrl != null && message.hasOwnProperty("supportTopicIntlUrl"))
              object.supportTopicIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.supportTopicIntlUrl, options);
            if (message.supportRequestIntlUrl != null && message.hasOwnProperty("supportRequestIntlUrl"))
              object.supportRequestIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.supportRequestIntlUrl, options);
            if (message.earthIntlUrl != null && message.hasOwnProperty("earthIntlUrl"))
              object.earthIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.earthIntlUrl, options);
            if (message.addContentUrl != null && message.hasOwnProperty("addContentUrl"))
              object.addContentUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.addContentUrl, options);
            if (message.sketchupNotInstalledUrl != null && message.hasOwnProperty("sketchupNotInstalledUrl"))
              object.sketchupNotInstalledUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.sketchupNotInstalledUrl, options);
            if (message.sketchupErrorUrl != null && message.hasOwnProperty("sketchupErrorUrl"))
              object.sketchupErrorUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.sketchupErrorUrl, options);
            if (message.freeLicenseUrl != null && message.hasOwnProperty("freeLicenseUrl"))
              object.freeLicenseUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.freeLicenseUrl, options);
            if (message.proLicenseUrl != null && message.hasOwnProperty("proLicenseUrl"))
              object.proLicenseUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.proLicenseUrl, options);
            if (message.hideUserData != null && message.hasOwnProperty("hideUserData"))
              object.hideUserData = message.hideUserData;
            if (message.useGeLogo != null && message.hasOwnProperty("useGeLogo"))
              object.useGeLogo = message.useGeLogo;
            if (message.dioramaDescriptionUrlBase != null && message.hasOwnProperty("dioramaDescriptionUrlBase"))
              object.dioramaDescriptionUrlBase = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.dioramaDescriptionUrlBase, options);
            if (message.dioramaDefaultColor != null && message.hasOwnProperty("dioramaDefaultColor"))
              object.dioramaDefaultColor = message.dioramaDefaultColor;
            if (message.clientOptions != null && message.hasOwnProperty("clientOptions"))
              object.clientOptions = $root.keyhole.dbroot.ClientOptionsProto.toObject(message.clientOptions, options);
            if (message.fetchingOptions != null && message.hasOwnProperty("fetchingOptions"))
              object.fetchingOptions = $root.keyhole.dbroot.FetchingOptionsProto.toObject(message.fetchingOptions, options);
            if (message.timeMachineOptions != null && message.hasOwnProperty("timeMachineOptions"))
              object.timeMachineOptions = $root.keyhole.dbroot.TimeMachineOptionsProto.toObject(message.timeMachineOptions, options);
            if (message.csiOptions != null && message.hasOwnProperty("csiOptions"))
              object.csiOptions = $root.keyhole.dbroot.CSIOptionsProto.toObject(message.csiOptions, options);
            if (message.searchTab && message.searchTab.length) {
              object.searchTab = [];
              for (var j = 0; j < message.searchTab.length; ++j)
                object.searchTab[j] = $root.keyhole.dbroot.SearchTabProto.toObject(message.searchTab[j], options);
            }
            if (message.cobrandInfo && message.cobrandInfo.length) {
              object.cobrandInfo = [];
              for (var j = 0; j < message.cobrandInfo.length; ++j)
                object.cobrandInfo[j] = $root.keyhole.dbroot.CobrandProto.toObject(message.cobrandInfo[j], options);
            }
            if (message.validDatabase && message.validDatabase.length) {
              object.validDatabase = [];
              for (var j = 0; j < message.validDatabase.length; ++j)
                object.validDatabase[j] = $root.keyhole.dbroot.DatabaseDescriptionProto.toObject(message.validDatabase[j], options);
            }
            if (message.configScript && message.configScript.length) {
              object.configScript = [];
              for (var j = 0; j < message.configScript.length; ++j)
                object.configScript[j] = $root.keyhole.dbroot.ConfigScriptProto.toObject(message.configScript[j], options);
            }
            if (message.deauthServerUrl != null && message.hasOwnProperty("deauthServerUrl"))
              object.deauthServerUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.deauthServerUrl, options);
            if (message.swoopParameters != null && message.hasOwnProperty("swoopParameters"))
              object.swoopParameters = $root.keyhole.dbroot.SwoopParamsProto.toObject(message.swoopParameters, options);
            if (message.bbsServerInfo != null && message.hasOwnProperty("bbsServerInfo"))
              object.bbsServerInfo = $root.keyhole.dbroot.PostingServerProto.toObject(message.bbsServerInfo, options);
            if (message.dataErrorServerInfo != null && message.hasOwnProperty("dataErrorServerInfo"))
              object.dataErrorServerInfo = $root.keyhole.dbroot.PostingServerProto.toObject(message.dataErrorServerInfo, options);
            if (message.planetaryDatabase && message.planetaryDatabase.length) {
              object.planetaryDatabase = [];
              for (var j = 0; j < message.planetaryDatabase.length; ++j)
                object.planetaryDatabase[j] = $root.keyhole.dbroot.PlanetaryDatabaseProto.toObject(message.planetaryDatabase[j], options);
            }
            if (message.logServer != null && message.hasOwnProperty("logServer"))
              object.logServer = $root.keyhole.dbroot.LogServerProto.toObject(message.logServer, options);
            if (message.autopiaOptions != null && message.hasOwnProperty("autopiaOptions"))
              object.autopiaOptions = $root.keyhole.dbroot.AutopiaOptionsProto.toObject(message.autopiaOptions, options);
            if (message.searchInfo != null && message.hasOwnProperty("searchInfo"))
              object.searchInfo = $root.keyhole.dbroot.EndSnippetProto.SearchInfoProto.toObject(message.searchInfo, options);
            if (message.elevationServiceBaseUrl != null && message.hasOwnProperty("elevationServiceBaseUrl"))
              object.elevationServiceBaseUrl = message.elevationServiceBaseUrl;
            if (message.elevationProfileQueryDelay != null && message.hasOwnProperty("elevationProfileQueryDelay"))
              object.elevationProfileQueryDelay = message.elevationProfileQueryDelay;
            if (message.tutorialUrl != null && message.hasOwnProperty("tutorialUrl"))
              object.tutorialUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.tutorialUrl, options);
            if (message.keyboardShortcutsUrl != null && message.hasOwnProperty("keyboardShortcutsUrl"))
              object.keyboardShortcutsUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.keyboardShortcutsUrl, options);
            if (message.releaseNotesUrl != null && message.hasOwnProperty("releaseNotesUrl"))
              object.releaseNotesUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.releaseNotesUrl, options);
            if (message.numProStartUpTips != null && message.hasOwnProperty("numProStartUpTips"))
              object.numProStartUpTips = message.numProStartUpTips;
            if (message.proStartUpTipsUrl != null && message.hasOwnProperty("proStartUpTipsUrl"))
              object.proStartUpTipsUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.proStartUpTipsUrl, options);
            if (message.dioramaBlacklistUrl != null && message.hasOwnProperty("dioramaBlacklistUrl"))
              object.dioramaBlacklistUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.dioramaBlacklistUrl, options);
            if (message.searchConfig != null && message.hasOwnProperty("searchConfig"))
              object.searchConfig = $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.toObject(message.searchConfig, options);
            if (message.proUpgradeUrl != null && message.hasOwnProperty("proUpgradeUrl"))
              object.proUpgradeUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.proUpgradeUrl, options);
            if (message.earthCommunityUrl != null && message.hasOwnProperty("earthCommunityUrl"))
              object.earthCommunityUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.earthCommunityUrl, options);
            if (message.googleMapsUrl != null && message.hasOwnProperty("googleMapsUrl"))
              object.googleMapsUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.googleMapsUrl, options);
            if (message.sharingUrl != null && message.hasOwnProperty("sharingUrl"))
              object.sharingUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.sharingUrl, options);
            if (message.privacyPolicyUrl != null && message.hasOwnProperty("privacyPolicyUrl"))
              object.privacyPolicyUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.privacyPolicyUrl, options);
            if (message.doGplusUserCheck != null && message.hasOwnProperty("doGplusUserCheck"))
              object.doGplusUserCheck = message.doGplusUserCheck;
            if (message.rocktreeDataProto != null && message.hasOwnProperty("rocktreeDataProto"))
              object.rocktreeDataProto = $root.keyhole.dbroot.EndSnippetProto.RockTreeDataProto.toObject(message.rocktreeDataProto, options);
            if (message.filmstripConfig && message.filmstripConfig.length) {
              object.filmstripConfig = [];
              for (var j = 0; j < message.filmstripConfig.length; ++j)
                object.filmstripConfig[j] = $root.keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.toObject(message.filmstripConfig[j], options);
            }
            if (message.showSigninButton != null && message.hasOwnProperty("showSigninButton"))
              object.showSigninButton = message.showSigninButton;
            if (message.startupTipsIntlUrl != null && message.hasOwnProperty("startupTipsIntlUrl"))
              object.startupTipsIntlUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.startupTipsIntlUrl, options);
            if (message.proMeasureUpsellUrl != null && message.hasOwnProperty("proMeasureUpsellUrl"))
              object.proMeasureUpsellUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.proMeasureUpsellUrl, options);
            if (message.proPrintUpsellUrl != null && message.hasOwnProperty("proPrintUpsellUrl"))
              object.proPrintUpsellUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.proPrintUpsellUrl, options);
            if (message.starDataProto != null && message.hasOwnProperty("starDataProto"))
              object.starDataProto = $root.keyhole.dbroot.EndSnippetProto.StarDataProto.toObject(message.starDataProto, options);
            if (message.feedbackUrl != null && message.hasOwnProperty("feedbackUrl"))
              object.feedbackUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.feedbackUrl, options);
            if (message.oauth2LoginUrl != null && message.hasOwnProperty("oauth2LoginUrl"))
              object.oauth2LoginUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.oauth2LoginUrl, options);
            return object;
          };
          EndSnippetProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          EndSnippetProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.EndSnippetProto";
          };
          EndSnippetProto.SearchConfigProto = function() {
            function SearchConfigProto(properties) {
              this.searchServer = [];
              this.oneboxService = [];
              if (properties) {
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                  if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
              }
            }
            SearchConfigProto.prototype.searchServer = $util.emptyArray;
            SearchConfigProto.prototype.oneboxService = $util.emptyArray;
            SearchConfigProto.prototype.kmlSearchUrl = null;
            SearchConfigProto.prototype.kmlRenderUrl = null;
            SearchConfigProto.prototype.searchHistoryUrl = null;
            SearchConfigProto.prototype.errorPageUrl = null;
            SearchConfigProto.decode = function decode(reader, length) {
              if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
              var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto();
              while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                  case 1: {
                    if (!(message.searchServer && message.searchServer.length))
                      message.searchServer = [];
                    message.searchServer.push($root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.decode(reader, reader.uint32()));
                    break;
                  }
                  case 2: {
                    if (!(message.oneboxService && message.oneboxService.length))
                      message.oneboxService = [];
                    message.oneboxService.push($root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.OneboxServiceProto.decode(reader, reader.uint32()));
                    break;
                  }
                  case 3: {
                    message.kmlSearchUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                    break;
                  }
                  case 4: {
                    message.kmlRenderUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                    break;
                  }
                  case 6: {
                    message.searchHistoryUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                    break;
                  }
                  case 5: {
                    message.errorPageUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                    break;
                  }
                  default:
                    reader.skipType(tag & 7);
                    break;
                }
              }
              return message;
            };
            SearchConfigProto.verify = function verify(message) {
              if (typeof message !== "object" || message === null)
                return "object expected";
              if (message.searchServer != null && message.hasOwnProperty("searchServer")) {
                if (!Array.isArray(message.searchServer))
                  return "searchServer: array expected";
                for (var i = 0; i < message.searchServer.length; ++i) {
                  var error = $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.verify(message.searchServer[i]);
                  if (error)
                    return "searchServer." + error;
                }
              }
              if (message.oneboxService != null && message.hasOwnProperty("oneboxService")) {
                if (!Array.isArray(message.oneboxService))
                  return "oneboxService: array expected";
                for (var i = 0; i < message.oneboxService.length; ++i) {
                  var error = $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.OneboxServiceProto.verify(message.oneboxService[i]);
                  if (error)
                    return "oneboxService." + error;
                }
              }
              if (message.kmlSearchUrl != null && message.hasOwnProperty("kmlSearchUrl")) {
                var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.kmlSearchUrl);
                if (error)
                  return "kmlSearchUrl." + error;
              }
              if (message.kmlRenderUrl != null && message.hasOwnProperty("kmlRenderUrl")) {
                var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.kmlRenderUrl);
                if (error)
                  return "kmlRenderUrl." + error;
              }
              if (message.searchHistoryUrl != null && message.hasOwnProperty("searchHistoryUrl")) {
                var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.searchHistoryUrl);
                if (error)
                  return "searchHistoryUrl." + error;
              }
              if (message.errorPageUrl != null && message.hasOwnProperty("errorPageUrl")) {
                var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.errorPageUrl);
                if (error)
                  return "errorPageUrl." + error;
              }
              return null;
            };
            SearchConfigProto.fromObject = function fromObject(object) {
              if (object instanceof $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto)
                return object;
              var message = new $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto();
              if (object.searchServer) {
                if (!Array.isArray(object.searchServer))
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.searchServer: array expected");
                message.searchServer = [];
                for (var i = 0; i < object.searchServer.length; ++i) {
                  if (typeof object.searchServer[i] !== "object")
                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.searchServer: object expected");
                  message.searchServer[i] = $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.fromObject(object.searchServer[i]);
                }
              }
              if (object.oneboxService) {
                if (!Array.isArray(object.oneboxService))
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.oneboxService: array expected");
                message.oneboxService = [];
                for (var i = 0; i < object.oneboxService.length; ++i) {
                  if (typeof object.oneboxService[i] !== "object")
                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.oneboxService: object expected");
                  message.oneboxService[i] = $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.OneboxServiceProto.fromObject(object.oneboxService[i]);
                }
              }
              if (object.kmlSearchUrl != null) {
                if (typeof object.kmlSearchUrl !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.kmlSearchUrl: object expected");
                message.kmlSearchUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.kmlSearchUrl);
              }
              if (object.kmlRenderUrl != null) {
                if (typeof object.kmlRenderUrl !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.kmlRenderUrl: object expected");
                message.kmlRenderUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.kmlRenderUrl);
              }
              if (object.searchHistoryUrl != null) {
                if (typeof object.searchHistoryUrl !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.searchHistoryUrl: object expected");
                message.searchHistoryUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.searchHistoryUrl);
              }
              if (object.errorPageUrl != null) {
                if (typeof object.errorPageUrl !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.errorPageUrl: object expected");
                message.errorPageUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.errorPageUrl);
              }
              return message;
            };
            SearchConfigProto.toObject = function toObject(message, options) {
              if (!options)
                options = {};
              var object = {};
              if (options.arrays || options.defaults) {
                object.searchServer = [];
                object.oneboxService = [];
              }
              if (options.defaults) {
                object.kmlSearchUrl = null;
                object.kmlRenderUrl = null;
                object.errorPageUrl = null;
                object.searchHistoryUrl = null;
              }
              if (message.searchServer && message.searchServer.length) {
                object.searchServer = [];
                for (var j = 0; j < message.searchServer.length; ++j)
                  object.searchServer[j] = $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.toObject(message.searchServer[j], options);
              }
              if (message.oneboxService && message.oneboxService.length) {
                object.oneboxService = [];
                for (var j = 0; j < message.oneboxService.length; ++j)
                  object.oneboxService[j] = $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.OneboxServiceProto.toObject(message.oneboxService[j], options);
              }
              if (message.kmlSearchUrl != null && message.hasOwnProperty("kmlSearchUrl"))
                object.kmlSearchUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.kmlSearchUrl, options);
              if (message.kmlRenderUrl != null && message.hasOwnProperty("kmlRenderUrl"))
                object.kmlRenderUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.kmlRenderUrl, options);
              if (message.errorPageUrl != null && message.hasOwnProperty("errorPageUrl"))
                object.errorPageUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.errorPageUrl, options);
              if (message.searchHistoryUrl != null && message.hasOwnProperty("searchHistoryUrl"))
                object.searchHistoryUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.searchHistoryUrl, options);
              return object;
            };
            SearchConfigProto.prototype.toJSON = function toJSON() {
              return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };
            SearchConfigProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
              if (typeUrlPrefix === void 0) {
                typeUrlPrefix = "type.googleapis.com";
              }
              return typeUrlPrefix + "/keyhole.dbroot.EndSnippetProto.SearchConfigProto";
            };
            SearchConfigProto.SearchServer = function() {
              function SearchServer(properties) {
                this.suggestion = [];
                this.searchlet = [];
                if (properties) {
                  for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                      this[keys[i]] = properties[keys[i]];
                }
              }
              SearchServer.prototype.name = null;
              SearchServer.prototype.url = null;
              SearchServer.prototype.type = 0;
              SearchServer.prototype.htmlTransformUrl = null;
              SearchServer.prototype.kmlTransformUrl = null;
              SearchServer.prototype.supplementalUi = null;
              SearchServer.prototype.suggestion = $util.emptyArray;
              SearchServer.prototype.searchlet = $util.emptyArray;
              SearchServer.prototype.requirements = null;
              SearchServer.prototype.suggestServer = null;
              SearchServer.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                  reader = $Reader.create(reader);
                var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer();
                while (reader.pos < end) {
                  var tag = reader.uint32();
                  switch (tag >>> 3) {
                    case 1: {
                      message.name = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                      break;
                    }
                    case 2: {
                      message.url = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                      break;
                    }
                    case 3: {
                      message.type = reader.int32();
                      break;
                    }
                    case 4: {
                      message.htmlTransformUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                      break;
                    }
                    case 5: {
                      message.kmlTransformUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                      break;
                    }
                    case 6: {
                      message.supplementalUi = $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SupplementalUi.decode(reader, reader.uint32());
                      break;
                    }
                    case 9: {
                      if (!(message.suggestion && message.suggestion.length))
                        message.suggestion = [];
                      message.suggestion.push($root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32()));
                      break;
                    }
                    case 7: {
                      if (!(message.searchlet && message.searchlet.length))
                        message.searchlet = [];
                      message.searchlet.push($root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SearchletProto.decode(reader, reader.uint32()));
                      break;
                    }
                    case 8: {
                      message.requirements = $root.keyhole.dbroot.RequirementProto.decode(reader, reader.uint32());
                      break;
                    }
                    case 10: {
                      message.suggestServer = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                      break;
                    }
                    default:
                      reader.skipType(tag & 7);
                      break;
                  }
                }
                return message;
              };
              SearchServer.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                  return "object expected";
                if (message.name != null && message.hasOwnProperty("name")) {
                  var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.name);
                  if (error)
                    return "name." + error;
                }
                if (message.url != null && message.hasOwnProperty("url")) {
                  var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.url);
                  if (error)
                    return "url." + error;
                }
                if (message.type != null && message.hasOwnProperty("type"))
                  switch (message.type) {
                    default:
                      return "type: enum value expected";
                    case 0:
                    case 1:
                      break;
                  }
                if (message.htmlTransformUrl != null && message.hasOwnProperty("htmlTransformUrl")) {
                  var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.htmlTransformUrl);
                  if (error)
                    return "htmlTransformUrl." + error;
                }
                if (message.kmlTransformUrl != null && message.hasOwnProperty("kmlTransformUrl")) {
                  var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.kmlTransformUrl);
                  if (error)
                    return "kmlTransformUrl." + error;
                }
                if (message.supplementalUi != null && message.hasOwnProperty("supplementalUi")) {
                  var error = $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SupplementalUi.verify(message.supplementalUi);
                  if (error)
                    return "supplementalUi." + error;
                }
                if (message.suggestion != null && message.hasOwnProperty("suggestion")) {
                  if (!Array.isArray(message.suggestion))
                    return "suggestion: array expected";
                  for (var i = 0; i < message.suggestion.length; ++i) {
                    var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.suggestion[i]);
                    if (error)
                      return "suggestion." + error;
                  }
                }
                if (message.searchlet != null && message.hasOwnProperty("searchlet")) {
                  if (!Array.isArray(message.searchlet))
                    return "searchlet: array expected";
                  for (var i = 0; i < message.searchlet.length; ++i) {
                    var error = $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SearchletProto.verify(message.searchlet[i]);
                    if (error)
                      return "searchlet." + error;
                  }
                }
                if (message.requirements != null && message.hasOwnProperty("requirements")) {
                  var error = $root.keyhole.dbroot.RequirementProto.verify(message.requirements);
                  if (error)
                    return "requirements." + error;
                }
                if (message.suggestServer != null && message.hasOwnProperty("suggestServer")) {
                  var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.suggestServer);
                  if (error)
                    return "suggestServer." + error;
                }
                return null;
              };
              SearchServer.fromObject = function fromObject(object) {
                if (object instanceof $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer)
                  return object;
                var message = new $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer();
                if (object.name != null) {
                  if (typeof object.name !== "object")
                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.name: object expected");
                  message.name = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.name);
                }
                if (object.url != null) {
                  if (typeof object.url !== "object")
                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.url: object expected");
                  message.url = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.url);
                }
                switch (object.type) {
                  case "RESULT_TYPE_KML":
                  case 0:
                    message.type = 0;
                    break;
                  case "RESULT_TYPE_XML":
                  case 1:
                    message.type = 1;
                    break;
                }
                if (object.htmlTransformUrl != null) {
                  if (typeof object.htmlTransformUrl !== "object")
                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.htmlTransformUrl: object expected");
                  message.htmlTransformUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.htmlTransformUrl);
                }
                if (object.kmlTransformUrl != null) {
                  if (typeof object.kmlTransformUrl !== "object")
                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.kmlTransformUrl: object expected");
                  message.kmlTransformUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.kmlTransformUrl);
                }
                if (object.supplementalUi != null) {
                  if (typeof object.supplementalUi !== "object")
                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.supplementalUi: object expected");
                  message.supplementalUi = $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SupplementalUi.fromObject(object.supplementalUi);
                }
                if (object.suggestion) {
                  if (!Array.isArray(object.suggestion))
                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.suggestion: array expected");
                  message.suggestion = [];
                  for (var i = 0; i < object.suggestion.length; ++i) {
                    if (typeof object.suggestion[i] !== "object")
                      throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.suggestion: object expected");
                    message.suggestion[i] = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.suggestion[i]);
                  }
                }
                if (object.searchlet) {
                  if (!Array.isArray(object.searchlet))
                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.searchlet: array expected");
                  message.searchlet = [];
                  for (var i = 0; i < object.searchlet.length; ++i) {
                    if (typeof object.searchlet[i] !== "object")
                      throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.searchlet: object expected");
                    message.searchlet[i] = $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SearchletProto.fromObject(object.searchlet[i]);
                  }
                }
                if (object.requirements != null) {
                  if (typeof object.requirements !== "object")
                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.requirements: object expected");
                  message.requirements = $root.keyhole.dbroot.RequirementProto.fromObject(object.requirements);
                }
                if (object.suggestServer != null) {
                  if (typeof object.suggestServer !== "object")
                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.suggestServer: object expected");
                  message.suggestServer = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.suggestServer);
                }
                return message;
              };
              SearchServer.toObject = function toObject(message, options) {
                if (!options)
                  options = {};
                var object = {};
                if (options.arrays || options.defaults) {
                  object.searchlet = [];
                  object.suggestion = [];
                }
                if (options.defaults) {
                  object.name = null;
                  object.url = null;
                  object.type = options.enums === String ? "RESULT_TYPE_KML" : 0;
                  object.htmlTransformUrl = null;
                  object.kmlTransformUrl = null;
                  object.supplementalUi = null;
                  object.requirements = null;
                  object.suggestServer = null;
                }
                if (message.name != null && message.hasOwnProperty("name"))
                  object.name = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.name, options);
                if (message.url != null && message.hasOwnProperty("url"))
                  object.url = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.url, options);
                if (message.type != null && message.hasOwnProperty("type"))
                  object.type = options.enums === String ? $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.ResultType[message.type] : message.type;
                if (message.htmlTransformUrl != null && message.hasOwnProperty("htmlTransformUrl"))
                  object.htmlTransformUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.htmlTransformUrl, options);
                if (message.kmlTransformUrl != null && message.hasOwnProperty("kmlTransformUrl"))
                  object.kmlTransformUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.kmlTransformUrl, options);
                if (message.supplementalUi != null && message.hasOwnProperty("supplementalUi"))
                  object.supplementalUi = $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SupplementalUi.toObject(message.supplementalUi, options);
                if (message.searchlet && message.searchlet.length) {
                  object.searchlet = [];
                  for (var j = 0; j < message.searchlet.length; ++j)
                    object.searchlet[j] = $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SearchletProto.toObject(message.searchlet[j], options);
                }
                if (message.requirements != null && message.hasOwnProperty("requirements"))
                  object.requirements = $root.keyhole.dbroot.RequirementProto.toObject(message.requirements, options);
                if (message.suggestion && message.suggestion.length) {
                  object.suggestion = [];
                  for (var j = 0; j < message.suggestion.length; ++j)
                    object.suggestion[j] = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.suggestion[j], options);
                }
                if (message.suggestServer != null && message.hasOwnProperty("suggestServer"))
                  object.suggestServer = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.suggestServer, options);
                return object;
              };
              SearchServer.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
              };
              SearchServer.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === void 0) {
                  typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer";
              };
              SearchServer.ResultType = function() {
                var valuesById = {}, values = Object.create(valuesById);
                values[valuesById[0] = "RESULT_TYPE_KML"] = 0;
                values[valuesById[1] = "RESULT_TYPE_XML"] = 1;
                return values;
              }();
              SearchServer.SupplementalUi = function() {
                function SupplementalUi(properties) {
                  if (properties) {
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                      if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
                  }
                }
                SupplementalUi.prototype.url = null;
                SupplementalUi.prototype.label = null;
                SupplementalUi.prototype.height = 160;
                SupplementalUi.decode = function decode(reader, length) {
                  if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                  var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SupplementalUi();
                  while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                      case 1: {
                        message.url = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                        break;
                      }
                      case 2: {
                        message.label = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                        break;
                      }
                      case 3: {
                        message.height = reader.int32();
                        break;
                      }
                      default:
                        reader.skipType(tag & 7);
                        break;
                    }
                  }
                  return message;
                };
                SupplementalUi.verify = function verify(message) {
                  if (typeof message !== "object" || message === null)
                    return "object expected";
                  if (message.url != null && message.hasOwnProperty("url")) {
                    var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.url);
                    if (error)
                      return "url." + error;
                  }
                  if (message.label != null && message.hasOwnProperty("label")) {
                    var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.label);
                    if (error)
                      return "label." + error;
                  }
                  if (message.height != null && message.hasOwnProperty("height")) {
                    if (!$util.isInteger(message.height))
                      return "height: integer expected";
                  }
                  return null;
                };
                SupplementalUi.fromObject = function fromObject(object) {
                  if (object instanceof $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SupplementalUi)
                    return object;
                  var message = new $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SupplementalUi();
                  if (object.url != null) {
                    if (typeof object.url !== "object")
                      throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SupplementalUi.url: object expected");
                    message.url = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.url);
                  }
                  if (object.label != null) {
                    if (typeof object.label !== "object")
                      throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SupplementalUi.label: object expected");
                    message.label = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.label);
                  }
                  if (object.height != null)
                    message.height = object.height | 0;
                  return message;
                };
                SupplementalUi.toObject = function toObject(message, options) {
                  if (!options)
                    options = {};
                  var object = {};
                  if (options.defaults) {
                    object.url = null;
                    object.label = null;
                    object.height = 160;
                  }
                  if (message.url != null && message.hasOwnProperty("url"))
                    object.url = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.url, options);
                  if (message.label != null && message.hasOwnProperty("label"))
                    object.label = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.label, options);
                  if (message.height != null && message.hasOwnProperty("height"))
                    object.height = message.height;
                  return object;
                };
                SupplementalUi.prototype.toJSON = function toJSON() {
                  return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };
                SupplementalUi.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                  if (typeUrlPrefix === void 0) {
                    typeUrlPrefix = "type.googleapis.com";
                  }
                  return typeUrlPrefix + "/keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SupplementalUi";
                };
                return SupplementalUi;
              }();
              SearchServer.SearchletProto = function() {
                function SearchletProto(properties) {
                  if (properties) {
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                      if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
                  }
                }
                SearchletProto.prototype.url = null;
                SearchletProto.prototype.name = null;
                SearchletProto.prototype.requirements = null;
                SearchletProto.decode = function decode(reader, length) {
                  if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                  var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SearchletProto();
                  while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                      case 1: {
                        message.url = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                        break;
                      }
                      case 2: {
                        message.name = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                        break;
                      }
                      case 3: {
                        message.requirements = $root.keyhole.dbroot.RequirementProto.decode(reader, reader.uint32());
                        break;
                      }
                      default:
                        reader.skipType(tag & 7);
                        break;
                    }
                  }
                  return message;
                };
                SearchletProto.verify = function verify(message) {
                  if (typeof message !== "object" || message === null)
                    return "object expected";
                  if (message.url != null && message.hasOwnProperty("url")) {
                    var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.url);
                    if (error)
                      return "url." + error;
                  }
                  if (message.name != null && message.hasOwnProperty("name")) {
                    var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.name);
                    if (error)
                      return "name." + error;
                  }
                  if (message.requirements != null && message.hasOwnProperty("requirements")) {
                    var error = $root.keyhole.dbroot.RequirementProto.verify(message.requirements);
                    if (error)
                      return "requirements." + error;
                  }
                  return null;
                };
                SearchletProto.fromObject = function fromObject(object) {
                  if (object instanceof $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SearchletProto)
                    return object;
                  var message = new $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SearchletProto();
                  if (object.url != null) {
                    if (typeof object.url !== "object")
                      throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SearchletProto.url: object expected");
                    message.url = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.url);
                  }
                  if (object.name != null) {
                    if (typeof object.name !== "object")
                      throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SearchletProto.name: object expected");
                    message.name = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.name);
                  }
                  if (object.requirements != null) {
                    if (typeof object.requirements !== "object")
                      throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SearchletProto.requirements: object expected");
                    message.requirements = $root.keyhole.dbroot.RequirementProto.fromObject(object.requirements);
                  }
                  return message;
                };
                SearchletProto.toObject = function toObject(message, options) {
                  if (!options)
                    options = {};
                  var object = {};
                  if (options.defaults) {
                    object.url = null;
                    object.name = null;
                    object.requirements = null;
                  }
                  if (message.url != null && message.hasOwnProperty("url"))
                    object.url = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.url, options);
                  if (message.name != null && message.hasOwnProperty("name"))
                    object.name = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.name, options);
                  if (message.requirements != null && message.hasOwnProperty("requirements"))
                    object.requirements = $root.keyhole.dbroot.RequirementProto.toObject(message.requirements, options);
                  return object;
                };
                SearchletProto.prototype.toJSON = function toJSON() {
                  return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };
                SearchletProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                  if (typeUrlPrefix === void 0) {
                    typeUrlPrefix = "type.googleapis.com";
                  }
                  return typeUrlPrefix + "/keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SearchletProto";
                };
                return SearchletProto;
              }();
              return SearchServer;
            }();
            SearchConfigProto.OneboxServiceProto = function() {
              function OneboxServiceProto(properties) {
                if (properties) {
                  for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                      this[keys[i]] = properties[keys[i]];
                }
              }
              OneboxServiceProto.prototype.serviceUrl = null;
              OneboxServiceProto.prototype.requirements = null;
              OneboxServiceProto.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                  reader = $Reader.create(reader);
                var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.OneboxServiceProto();
                while (reader.pos < end) {
                  var tag = reader.uint32();
                  switch (tag >>> 3) {
                    case 1: {
                      message.serviceUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                      break;
                    }
                    case 2: {
                      message.requirements = $root.keyhole.dbroot.RequirementProto.decode(reader, reader.uint32());
                      break;
                    }
                    default:
                      reader.skipType(tag & 7);
                      break;
                  }
                }
                return message;
              };
              OneboxServiceProto.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                  return "object expected";
                if (message.serviceUrl != null && message.hasOwnProperty("serviceUrl")) {
                  var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.serviceUrl);
                  if (error)
                    return "serviceUrl." + error;
                }
                if (message.requirements != null && message.hasOwnProperty("requirements")) {
                  var error = $root.keyhole.dbroot.RequirementProto.verify(message.requirements);
                  if (error)
                    return "requirements." + error;
                }
                return null;
              };
              OneboxServiceProto.fromObject = function fromObject(object) {
                if (object instanceof $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.OneboxServiceProto)
                  return object;
                var message = new $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.OneboxServiceProto();
                if (object.serviceUrl != null) {
                  if (typeof object.serviceUrl !== "object")
                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.OneboxServiceProto.serviceUrl: object expected");
                  message.serviceUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.serviceUrl);
                }
                if (object.requirements != null) {
                  if (typeof object.requirements !== "object")
                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.OneboxServiceProto.requirements: object expected");
                  message.requirements = $root.keyhole.dbroot.RequirementProto.fromObject(object.requirements);
                }
                return message;
              };
              OneboxServiceProto.toObject = function toObject(message, options) {
                if (!options)
                  options = {};
                var object = {};
                if (options.defaults) {
                  object.serviceUrl = null;
                  object.requirements = null;
                }
                if (message.serviceUrl != null && message.hasOwnProperty("serviceUrl"))
                  object.serviceUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.serviceUrl, options);
                if (message.requirements != null && message.hasOwnProperty("requirements"))
                  object.requirements = $root.keyhole.dbroot.RequirementProto.toObject(message.requirements, options);
                return object;
              };
              OneboxServiceProto.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
              };
              OneboxServiceProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === void 0) {
                  typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/keyhole.dbroot.EndSnippetProto.SearchConfigProto.OneboxServiceProto";
              };
              return OneboxServiceProto;
            }();
            return SearchConfigProto;
          }();
          EndSnippetProto.SearchInfoProto = function() {
            function SearchInfoProto(properties) {
              if (properties) {
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                  if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
              }
            }
            SearchInfoProto.prototype.defaultUrl = "http://maps.google.com/maps";
            SearchInfoProto.prototype.geocodeParam = "q";
            SearchInfoProto.decode = function decode(reader, length) {
              if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
              var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.EndSnippetProto.SearchInfoProto();
              while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                  case 1: {
                    message.defaultUrl = reader.string();
                    break;
                  }
                  case 2: {
                    message.geocodeParam = reader.string();
                    break;
                  }
                  default:
                    reader.skipType(tag & 7);
                    break;
                }
              }
              return message;
            };
            SearchInfoProto.verify = function verify(message) {
              if (typeof message !== "object" || message === null)
                return "object expected";
              if (message.defaultUrl != null && message.hasOwnProperty("defaultUrl")) {
                if (!$util.isString(message.defaultUrl))
                  return "defaultUrl: string expected";
              }
              if (message.geocodeParam != null && message.hasOwnProperty("geocodeParam")) {
                if (!$util.isString(message.geocodeParam))
                  return "geocodeParam: string expected";
              }
              return null;
            };
            SearchInfoProto.fromObject = function fromObject(object) {
              if (object instanceof $root.keyhole.dbroot.EndSnippetProto.SearchInfoProto)
                return object;
              var message = new $root.keyhole.dbroot.EndSnippetProto.SearchInfoProto();
              if (object.defaultUrl != null)
                message.defaultUrl = String(object.defaultUrl);
              if (object.geocodeParam != null)
                message.geocodeParam = String(object.geocodeParam);
              return message;
            };
            SearchInfoProto.toObject = function toObject(message, options) {
              if (!options)
                options = {};
              var object = {};
              if (options.defaults) {
                object.defaultUrl = "http://maps.google.com/maps";
                object.geocodeParam = "q";
              }
              if (message.defaultUrl != null && message.hasOwnProperty("defaultUrl"))
                object.defaultUrl = message.defaultUrl;
              if (message.geocodeParam != null && message.hasOwnProperty("geocodeParam"))
                object.geocodeParam = message.geocodeParam;
              return object;
            };
            SearchInfoProto.prototype.toJSON = function toJSON() {
              return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };
            SearchInfoProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
              if (typeUrlPrefix === void 0) {
                typeUrlPrefix = "type.googleapis.com";
              }
              return typeUrlPrefix + "/keyhole.dbroot.EndSnippetProto.SearchInfoProto";
            };
            return SearchInfoProto;
          }();
          EndSnippetProto.RockTreeDataProto = function() {
            function RockTreeDataProto(properties) {
              if (properties) {
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                  if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
              }
            }
            RockTreeDataProto.prototype.url = null;
            RockTreeDataProto.decode = function decode(reader, length) {
              if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
              var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.EndSnippetProto.RockTreeDataProto();
              while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                  case 1: {
                    message.url = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                    break;
                  }
                  default:
                    reader.skipType(tag & 7);
                    break;
                }
              }
              return message;
            };
            RockTreeDataProto.verify = function verify(message) {
              if (typeof message !== "object" || message === null)
                return "object expected";
              if (message.url != null && message.hasOwnProperty("url")) {
                var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.url);
                if (error)
                  return "url." + error;
              }
              return null;
            };
            RockTreeDataProto.fromObject = function fromObject(object) {
              if (object instanceof $root.keyhole.dbroot.EndSnippetProto.RockTreeDataProto)
                return object;
              var message = new $root.keyhole.dbroot.EndSnippetProto.RockTreeDataProto();
              if (object.url != null) {
                if (typeof object.url !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.RockTreeDataProto.url: object expected");
                message.url = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.url);
              }
              return message;
            };
            RockTreeDataProto.toObject = function toObject(message, options) {
              if (!options)
                options = {};
              var object = {};
              if (options.defaults)
                object.url = null;
              if (message.url != null && message.hasOwnProperty("url"))
                object.url = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.url, options);
              return object;
            };
            RockTreeDataProto.prototype.toJSON = function toJSON() {
              return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };
            RockTreeDataProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
              if (typeUrlPrefix === void 0) {
                typeUrlPrefix = "type.googleapis.com";
              }
              return typeUrlPrefix + "/keyhole.dbroot.EndSnippetProto.RockTreeDataProto";
            };
            return RockTreeDataProto;
          }();
          EndSnippetProto.FilmstripConfigProto = function() {
            function FilmstripConfigProto(properties) {
              this.imageryType = [];
              if (properties) {
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                  if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
              }
            }
            FilmstripConfigProto.prototype.requirements = null;
            FilmstripConfigProto.prototype.alleycatUrlTemplate = null;
            FilmstripConfigProto.prototype.fallbackAlleycatUrlTemplate = null;
            FilmstripConfigProto.prototype.metadataUrlTemplate = null;
            FilmstripConfigProto.prototype.thumbnailUrlTemplate = null;
            FilmstripConfigProto.prototype.kmlUrlTemplate = null;
            FilmstripConfigProto.prototype.featuredToursUrl = null;
            FilmstripConfigProto.prototype.enableViewportFallback = false;
            FilmstripConfigProto.prototype.viewportFallbackDistance = 0;
            FilmstripConfigProto.prototype.imageryType = $util.emptyArray;
            FilmstripConfigProto.decode = function decode(reader, length) {
              if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
              var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.EndSnippetProto.FilmstripConfigProto();
              while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                  case 1: {
                    message.requirements = $root.keyhole.dbroot.RequirementProto.decode(reader, reader.uint32());
                    break;
                  }
                  case 2: {
                    message.alleycatUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                    break;
                  }
                  case 9: {
                    message.fallbackAlleycatUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                    break;
                  }
                  case 3: {
                    message.metadataUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                    break;
                  }
                  case 4: {
                    message.thumbnailUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                    break;
                  }
                  case 5: {
                    message.kmlUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                    break;
                  }
                  case 6: {
                    message.featuredToursUrl = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                    break;
                  }
                  case 7: {
                    message.enableViewportFallback = reader.bool();
                    break;
                  }
                  case 8: {
                    message.viewportFallbackDistance = reader.uint32();
                    break;
                  }
                  case 10: {
                    if (!(message.imageryType && message.imageryType.length))
                      message.imageryType = [];
                    message.imageryType.push($root.keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.AlleycatImageryTypeProto.decode(reader, reader.uint32()));
                    break;
                  }
                  default:
                    reader.skipType(tag & 7);
                    break;
                }
              }
              return message;
            };
            FilmstripConfigProto.verify = function verify(message) {
              if (typeof message !== "object" || message === null)
                return "object expected";
              if (message.requirements != null && message.hasOwnProperty("requirements")) {
                var error = $root.keyhole.dbroot.RequirementProto.verify(message.requirements);
                if (error)
                  return "requirements." + error;
              }
              if (message.alleycatUrlTemplate != null && message.hasOwnProperty("alleycatUrlTemplate")) {
                var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.alleycatUrlTemplate);
                if (error)
                  return "alleycatUrlTemplate." + error;
              }
              if (message.fallbackAlleycatUrlTemplate != null && message.hasOwnProperty("fallbackAlleycatUrlTemplate")) {
                var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.fallbackAlleycatUrlTemplate);
                if (error)
                  return "fallbackAlleycatUrlTemplate." + error;
              }
              if (message.metadataUrlTemplate != null && message.hasOwnProperty("metadataUrlTemplate")) {
                var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.metadataUrlTemplate);
                if (error)
                  return "metadataUrlTemplate." + error;
              }
              if (message.thumbnailUrlTemplate != null && message.hasOwnProperty("thumbnailUrlTemplate")) {
                var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.thumbnailUrlTemplate);
                if (error)
                  return "thumbnailUrlTemplate." + error;
              }
              if (message.kmlUrlTemplate != null && message.hasOwnProperty("kmlUrlTemplate")) {
                var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.kmlUrlTemplate);
                if (error)
                  return "kmlUrlTemplate." + error;
              }
              if (message.featuredToursUrl != null && message.hasOwnProperty("featuredToursUrl")) {
                var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.featuredToursUrl);
                if (error)
                  return "featuredToursUrl." + error;
              }
              if (message.enableViewportFallback != null && message.hasOwnProperty("enableViewportFallback")) {
                if (typeof message.enableViewportFallback !== "boolean")
                  return "enableViewportFallback: boolean expected";
              }
              if (message.viewportFallbackDistance != null && message.hasOwnProperty("viewportFallbackDistance")) {
                if (!$util.isInteger(message.viewportFallbackDistance))
                  return "viewportFallbackDistance: integer expected";
              }
              if (message.imageryType != null && message.hasOwnProperty("imageryType")) {
                if (!Array.isArray(message.imageryType))
                  return "imageryType: array expected";
                for (var i = 0; i < message.imageryType.length; ++i) {
                  var error = $root.keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.AlleycatImageryTypeProto.verify(message.imageryType[i]);
                  if (error)
                    return "imageryType." + error;
                }
              }
              return null;
            };
            FilmstripConfigProto.fromObject = function fromObject(object) {
              if (object instanceof $root.keyhole.dbroot.EndSnippetProto.FilmstripConfigProto)
                return object;
              var message = new $root.keyhole.dbroot.EndSnippetProto.FilmstripConfigProto();
              if (object.requirements != null) {
                if (typeof object.requirements !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.requirements: object expected");
                message.requirements = $root.keyhole.dbroot.RequirementProto.fromObject(object.requirements);
              }
              if (object.alleycatUrlTemplate != null) {
                if (typeof object.alleycatUrlTemplate !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.alleycatUrlTemplate: object expected");
                message.alleycatUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.alleycatUrlTemplate);
              }
              if (object.fallbackAlleycatUrlTemplate != null) {
                if (typeof object.fallbackAlleycatUrlTemplate !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.fallbackAlleycatUrlTemplate: object expected");
                message.fallbackAlleycatUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.fallbackAlleycatUrlTemplate);
              }
              if (object.metadataUrlTemplate != null) {
                if (typeof object.metadataUrlTemplate !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.metadataUrlTemplate: object expected");
                message.metadataUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.metadataUrlTemplate);
              }
              if (object.thumbnailUrlTemplate != null) {
                if (typeof object.thumbnailUrlTemplate !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.thumbnailUrlTemplate: object expected");
                message.thumbnailUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.thumbnailUrlTemplate);
              }
              if (object.kmlUrlTemplate != null) {
                if (typeof object.kmlUrlTemplate !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.kmlUrlTemplate: object expected");
                message.kmlUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.kmlUrlTemplate);
              }
              if (object.featuredToursUrl != null) {
                if (typeof object.featuredToursUrl !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.featuredToursUrl: object expected");
                message.featuredToursUrl = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.featuredToursUrl);
              }
              if (object.enableViewportFallback != null)
                message.enableViewportFallback = Boolean(object.enableViewportFallback);
              if (object.viewportFallbackDistance != null)
                message.viewportFallbackDistance = object.viewportFallbackDistance >>> 0;
              if (object.imageryType) {
                if (!Array.isArray(object.imageryType))
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.imageryType: array expected");
                message.imageryType = [];
                for (var i = 0; i < object.imageryType.length; ++i) {
                  if (typeof object.imageryType[i] !== "object")
                    throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.imageryType: object expected");
                  message.imageryType[i] = $root.keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.AlleycatImageryTypeProto.fromObject(object.imageryType[i]);
                }
              }
              return message;
            };
            FilmstripConfigProto.toObject = function toObject(message, options) {
              if (!options)
                options = {};
              var object = {};
              if (options.arrays || options.defaults)
                object.imageryType = [];
              if (options.defaults) {
                object.requirements = null;
                object.alleycatUrlTemplate = null;
                object.metadataUrlTemplate = null;
                object.thumbnailUrlTemplate = null;
                object.kmlUrlTemplate = null;
                object.featuredToursUrl = null;
                object.enableViewportFallback = false;
                object.viewportFallbackDistance = 0;
                object.fallbackAlleycatUrlTemplate = null;
              }
              if (message.requirements != null && message.hasOwnProperty("requirements"))
                object.requirements = $root.keyhole.dbroot.RequirementProto.toObject(message.requirements, options);
              if (message.alleycatUrlTemplate != null && message.hasOwnProperty("alleycatUrlTemplate"))
                object.alleycatUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.alleycatUrlTemplate, options);
              if (message.metadataUrlTemplate != null && message.hasOwnProperty("metadataUrlTemplate"))
                object.metadataUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.metadataUrlTemplate, options);
              if (message.thumbnailUrlTemplate != null && message.hasOwnProperty("thumbnailUrlTemplate"))
                object.thumbnailUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.thumbnailUrlTemplate, options);
              if (message.kmlUrlTemplate != null && message.hasOwnProperty("kmlUrlTemplate"))
                object.kmlUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.kmlUrlTemplate, options);
              if (message.featuredToursUrl != null && message.hasOwnProperty("featuredToursUrl"))
                object.featuredToursUrl = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.featuredToursUrl, options);
              if (message.enableViewportFallback != null && message.hasOwnProperty("enableViewportFallback"))
                object.enableViewportFallback = message.enableViewportFallback;
              if (message.viewportFallbackDistance != null && message.hasOwnProperty("viewportFallbackDistance"))
                object.viewportFallbackDistance = message.viewportFallbackDistance;
              if (message.fallbackAlleycatUrlTemplate != null && message.hasOwnProperty("fallbackAlleycatUrlTemplate"))
                object.fallbackAlleycatUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.fallbackAlleycatUrlTemplate, options);
              if (message.imageryType && message.imageryType.length) {
                object.imageryType = [];
                for (var j = 0; j < message.imageryType.length; ++j)
                  object.imageryType[j] = $root.keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.AlleycatImageryTypeProto.toObject(message.imageryType[j], options);
              }
              return object;
            };
            FilmstripConfigProto.prototype.toJSON = function toJSON() {
              return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };
            FilmstripConfigProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
              if (typeUrlPrefix === void 0) {
                typeUrlPrefix = "type.googleapis.com";
              }
              return typeUrlPrefix + "/keyhole.dbroot.EndSnippetProto.FilmstripConfigProto";
            };
            FilmstripConfigProto.AlleycatImageryTypeProto = function() {
              function AlleycatImageryTypeProto(properties) {
                if (properties) {
                  for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                      this[keys[i]] = properties[keys[i]];
                }
              }
              AlleycatImageryTypeProto.prototype.imageryTypeId = 0;
              AlleycatImageryTypeProto.prototype.imageryTypeLabel = "";
              AlleycatImageryTypeProto.prototype.metadataUrlTemplate = null;
              AlleycatImageryTypeProto.prototype.thumbnailUrlTemplate = null;
              AlleycatImageryTypeProto.prototype.kmlUrlTemplate = null;
              AlleycatImageryTypeProto.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                  reader = $Reader.create(reader);
                var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.AlleycatImageryTypeProto();
                while (reader.pos < end) {
                  var tag = reader.uint32();
                  switch (tag >>> 3) {
                    case 1: {
                      message.imageryTypeId = reader.int32();
                      break;
                    }
                    case 2: {
                      message.imageryTypeLabel = reader.string();
                      break;
                    }
                    case 3: {
                      message.metadataUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                      break;
                    }
                    case 4: {
                      message.thumbnailUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                      break;
                    }
                    case 5: {
                      message.kmlUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                      break;
                    }
                    default:
                      reader.skipType(tag & 7);
                      break;
                  }
                }
                return message;
              };
              AlleycatImageryTypeProto.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                  return "object expected";
                if (message.imageryTypeId != null && message.hasOwnProperty("imageryTypeId")) {
                  if (!$util.isInteger(message.imageryTypeId))
                    return "imageryTypeId: integer expected";
                }
                if (message.imageryTypeLabel != null && message.hasOwnProperty("imageryTypeLabel")) {
                  if (!$util.isString(message.imageryTypeLabel))
                    return "imageryTypeLabel: string expected";
                }
                if (message.metadataUrlTemplate != null && message.hasOwnProperty("metadataUrlTemplate")) {
                  var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.metadataUrlTemplate);
                  if (error)
                    return "metadataUrlTemplate." + error;
                }
                if (message.thumbnailUrlTemplate != null && message.hasOwnProperty("thumbnailUrlTemplate")) {
                  var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.thumbnailUrlTemplate);
                  if (error)
                    return "thumbnailUrlTemplate." + error;
                }
                if (message.kmlUrlTemplate != null && message.hasOwnProperty("kmlUrlTemplate")) {
                  var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.kmlUrlTemplate);
                  if (error)
                    return "kmlUrlTemplate." + error;
                }
                return null;
              };
              AlleycatImageryTypeProto.fromObject = function fromObject(object) {
                if (object instanceof $root.keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.AlleycatImageryTypeProto)
                  return object;
                var message = new $root.keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.AlleycatImageryTypeProto();
                if (object.imageryTypeId != null)
                  message.imageryTypeId = object.imageryTypeId | 0;
                if (object.imageryTypeLabel != null)
                  message.imageryTypeLabel = String(object.imageryTypeLabel);
                if (object.metadataUrlTemplate != null) {
                  if (typeof object.metadataUrlTemplate !== "object")
                    throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.AlleycatImageryTypeProto.metadataUrlTemplate: object expected");
                  message.metadataUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.metadataUrlTemplate);
                }
                if (object.thumbnailUrlTemplate != null) {
                  if (typeof object.thumbnailUrlTemplate !== "object")
                    throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.AlleycatImageryTypeProto.thumbnailUrlTemplate: object expected");
                  message.thumbnailUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.thumbnailUrlTemplate);
                }
                if (object.kmlUrlTemplate != null) {
                  if (typeof object.kmlUrlTemplate !== "object")
                    throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.AlleycatImageryTypeProto.kmlUrlTemplate: object expected");
                  message.kmlUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.kmlUrlTemplate);
                }
                return message;
              };
              AlleycatImageryTypeProto.toObject = function toObject(message, options) {
                if (!options)
                  options = {};
                var object = {};
                if (options.defaults) {
                  object.imageryTypeId = 0;
                  object.imageryTypeLabel = "";
                  object.metadataUrlTemplate = null;
                  object.thumbnailUrlTemplate = null;
                  object.kmlUrlTemplate = null;
                }
                if (message.imageryTypeId != null && message.hasOwnProperty("imageryTypeId"))
                  object.imageryTypeId = message.imageryTypeId;
                if (message.imageryTypeLabel != null && message.hasOwnProperty("imageryTypeLabel"))
                  object.imageryTypeLabel = message.imageryTypeLabel;
                if (message.metadataUrlTemplate != null && message.hasOwnProperty("metadataUrlTemplate"))
                  object.metadataUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.metadataUrlTemplate, options);
                if (message.thumbnailUrlTemplate != null && message.hasOwnProperty("thumbnailUrlTemplate"))
                  object.thumbnailUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.thumbnailUrlTemplate, options);
                if (message.kmlUrlTemplate != null && message.hasOwnProperty("kmlUrlTemplate"))
                  object.kmlUrlTemplate = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.kmlUrlTemplate, options);
                return object;
              };
              AlleycatImageryTypeProto.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
              };
              AlleycatImageryTypeProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === void 0) {
                  typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.AlleycatImageryTypeProto";
              };
              return AlleycatImageryTypeProto;
            }();
            return FilmstripConfigProto;
          }();
          EndSnippetProto.StarDataProto = function() {
            function StarDataProto(properties) {
              if (properties) {
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                  if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
              }
            }
            StarDataProto.prototype.url = null;
            StarDataProto.decode = function decode(reader, length) {
              if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
              var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.EndSnippetProto.StarDataProto();
              while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                  case 1: {
                    message.url = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                    break;
                  }
                  default:
                    reader.skipType(tag & 7);
                    break;
                }
              }
              return message;
            };
            StarDataProto.verify = function verify(message) {
              if (typeof message !== "object" || message === null)
                return "object expected";
              if (message.url != null && message.hasOwnProperty("url")) {
                var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.url);
                if (error)
                  return "url." + error;
              }
              return null;
            };
            StarDataProto.fromObject = function fromObject(object) {
              if (object instanceof $root.keyhole.dbroot.EndSnippetProto.StarDataProto)
                return object;
              var message = new $root.keyhole.dbroot.EndSnippetProto.StarDataProto();
              if (object.url != null) {
                if (typeof object.url !== "object")
                  throw TypeError(".keyhole.dbroot.EndSnippetProto.StarDataProto.url: object expected");
                message.url = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.url);
              }
              return message;
            };
            StarDataProto.toObject = function toObject(message, options) {
              if (!options)
                options = {};
              var object = {};
              if (options.defaults)
                object.url = null;
              if (message.url != null && message.hasOwnProperty("url"))
                object.url = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.url, options);
              return object;
            };
            StarDataProto.prototype.toJSON = function toJSON() {
              return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };
            StarDataProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
              if (typeUrlPrefix === void 0) {
                typeUrlPrefix = "type.googleapis.com";
              }
              return typeUrlPrefix + "/keyhole.dbroot.EndSnippetProto.StarDataProto";
            };
            return StarDataProto;
          }();
          return EndSnippetProto;
        }();
        dbroot.DbRootRefProto = function() {
          function DbRootRefProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          DbRootRefProto.prototype.url = "";
          DbRootRefProto.prototype.isCritical = false;
          DbRootRefProto.prototype.requirements = null;
          DbRootRefProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.DbRootRefProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 2: {
                  message.url = reader.string();
                  break;
                }
                case 1: {
                  message.isCritical = reader.bool();
                  break;
                }
                case 3: {
                  message.requirements = $root.keyhole.dbroot.RequirementProto.decode(reader, reader.uint32());
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            if (!message.hasOwnProperty("url"))
              throw $util.ProtocolError("missing required 'url'", { instance: message });
            return message;
          };
          DbRootRefProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (!$util.isString(message.url))
              return "url: string expected";
            if (message.isCritical != null && message.hasOwnProperty("isCritical")) {
              if (typeof message.isCritical !== "boolean")
                return "isCritical: boolean expected";
            }
            if (message.requirements != null && message.hasOwnProperty("requirements")) {
              var error = $root.keyhole.dbroot.RequirementProto.verify(message.requirements);
              if (error)
                return "requirements." + error;
            }
            return null;
          };
          DbRootRefProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.DbRootRefProto)
              return object;
            var message = new $root.keyhole.dbroot.DbRootRefProto();
            if (object.url != null)
              message.url = String(object.url);
            if (object.isCritical != null)
              message.isCritical = Boolean(object.isCritical);
            if (object.requirements != null) {
              if (typeof object.requirements !== "object")
                throw TypeError(".keyhole.dbroot.DbRootRefProto.requirements: object expected");
              message.requirements = $root.keyhole.dbroot.RequirementProto.fromObject(object.requirements);
            }
            return message;
          };
          DbRootRefProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.isCritical = false;
              object.url = "";
              object.requirements = null;
            }
            if (message.isCritical != null && message.hasOwnProperty("isCritical"))
              object.isCritical = message.isCritical;
            if (message.url != null && message.hasOwnProperty("url"))
              object.url = message.url;
            if (message.requirements != null && message.hasOwnProperty("requirements"))
              object.requirements = $root.keyhole.dbroot.RequirementProto.toObject(message.requirements, options);
            return object;
          };
          DbRootRefProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          DbRootRefProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.DbRootRefProto";
          };
          return DbRootRefProto;
        }();
        dbroot.DatabaseVersionProto = function() {
          function DatabaseVersionProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          DatabaseVersionProto.prototype.quadtreeVersion = 0;
          DatabaseVersionProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.DatabaseVersionProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.quadtreeVersion = reader.uint32();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            if (!message.hasOwnProperty("quadtreeVersion"))
              throw $util.ProtocolError("missing required 'quadtreeVersion'", { instance: message });
            return message;
          };
          DatabaseVersionProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (!$util.isInteger(message.quadtreeVersion))
              return "quadtreeVersion: integer expected";
            return null;
          };
          DatabaseVersionProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.DatabaseVersionProto)
              return object;
            var message = new $root.keyhole.dbroot.DatabaseVersionProto();
            if (object.quadtreeVersion != null)
              message.quadtreeVersion = object.quadtreeVersion >>> 0;
            return message;
          };
          DatabaseVersionProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults)
              object.quadtreeVersion = 0;
            if (message.quadtreeVersion != null && message.hasOwnProperty("quadtreeVersion"))
              object.quadtreeVersion = message.quadtreeVersion;
            return object;
          };
          DatabaseVersionProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          DatabaseVersionProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.DatabaseVersionProto";
          };
          return DatabaseVersionProto;
        }();
        dbroot.DbRootProto = function() {
          function DbRootProto(properties) {
            this.providerInfo = [];
            this.nestedFeature = [];
            this.styleAttribute = [];
            this.styleMap = [];
            this.translationEntry = [];
            this.dbrootReference = [];
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          DbRootProto.prototype.databaseName = null;
          DbRootProto.prototype.imageryPresent = true;
          DbRootProto.prototype.protoImagery = false;
          DbRootProto.prototype.terrainPresent = false;
          DbRootProto.prototype.providerInfo = $util.emptyArray;
          DbRootProto.prototype.nestedFeature = $util.emptyArray;
          DbRootProto.prototype.styleAttribute = $util.emptyArray;
          DbRootProto.prototype.styleMap = $util.emptyArray;
          DbRootProto.prototype.endSnippet = null;
          DbRootProto.prototype.translationEntry = $util.emptyArray;
          DbRootProto.prototype.language = "en";
          DbRootProto.prototype.version = 5;
          DbRootProto.prototype.dbrootReference = $util.emptyArray;
          DbRootProto.prototype.databaseVersion = null;
          DbRootProto.prototype.refreshTimeout = 0;
          DbRootProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.DbRootProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 15: {
                  message.databaseName = $root.keyhole.dbroot.StringIdOrValueProto.decode(reader, reader.uint32());
                  break;
                }
                case 1: {
                  message.imageryPresent = reader.bool();
                  break;
                }
                case 14: {
                  message.protoImagery = reader.bool();
                  break;
                }
                case 2: {
                  message.terrainPresent = reader.bool();
                  break;
                }
                case 3: {
                  if (!(message.providerInfo && message.providerInfo.length))
                    message.providerInfo = [];
                  message.providerInfo.push($root.keyhole.dbroot.ProviderInfoProto.decode(reader, reader.uint32()));
                  break;
                }
                case 4: {
                  if (!(message.nestedFeature && message.nestedFeature.length))
                    message.nestedFeature = [];
                  message.nestedFeature.push($root.keyhole.dbroot.NestedFeatureProto.decode(reader, reader.uint32()));
                  break;
                }
                case 5: {
                  if (!(message.styleAttribute && message.styleAttribute.length))
                    message.styleAttribute = [];
                  message.styleAttribute.push($root.keyhole.dbroot.StyleAttributeProto.decode(reader, reader.uint32()));
                  break;
                }
                case 6: {
                  if (!(message.styleMap && message.styleMap.length))
                    message.styleMap = [];
                  message.styleMap.push($root.keyhole.dbroot.StyleMapProto.decode(reader, reader.uint32()));
                  break;
                }
                case 7: {
                  message.endSnippet = $root.keyhole.dbroot.EndSnippetProto.decode(reader, reader.uint32());
                  break;
                }
                case 8: {
                  if (!(message.translationEntry && message.translationEntry.length))
                    message.translationEntry = [];
                  message.translationEntry.push($root.keyhole.dbroot.StringEntryProto.decode(reader, reader.uint32()));
                  break;
                }
                case 9: {
                  message.language = reader.string();
                  break;
                }
                case 10: {
                  message.version = reader.int32();
                  break;
                }
                case 11: {
                  if (!(message.dbrootReference && message.dbrootReference.length))
                    message.dbrootReference = [];
                  message.dbrootReference.push($root.keyhole.dbroot.DbRootRefProto.decode(reader, reader.uint32()));
                  break;
                }
                case 13: {
                  message.databaseVersion = $root.keyhole.dbroot.DatabaseVersionProto.decode(reader, reader.uint32());
                  break;
                }
                case 16: {
                  message.refreshTimeout = reader.int32();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            return message;
          };
          DbRootProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (message.databaseName != null && message.hasOwnProperty("databaseName")) {
              var error = $root.keyhole.dbroot.StringIdOrValueProto.verify(message.databaseName);
              if (error)
                return "databaseName." + error;
            }
            if (message.imageryPresent != null && message.hasOwnProperty("imageryPresent")) {
              if (typeof message.imageryPresent !== "boolean")
                return "imageryPresent: boolean expected";
            }
            if (message.protoImagery != null && message.hasOwnProperty("protoImagery")) {
              if (typeof message.protoImagery !== "boolean")
                return "protoImagery: boolean expected";
            }
            if (message.terrainPresent != null && message.hasOwnProperty("terrainPresent")) {
              if (typeof message.terrainPresent !== "boolean")
                return "terrainPresent: boolean expected";
            }
            if (message.providerInfo != null && message.hasOwnProperty("providerInfo")) {
              if (!Array.isArray(message.providerInfo))
                return "providerInfo: array expected";
              for (var i = 0; i < message.providerInfo.length; ++i) {
                var error = $root.keyhole.dbroot.ProviderInfoProto.verify(message.providerInfo[i]);
                if (error)
                  return "providerInfo." + error;
              }
            }
            if (message.nestedFeature != null && message.hasOwnProperty("nestedFeature")) {
              if (!Array.isArray(message.nestedFeature))
                return "nestedFeature: array expected";
              for (var i = 0; i < message.nestedFeature.length; ++i) {
                var error = $root.keyhole.dbroot.NestedFeatureProto.verify(message.nestedFeature[i]);
                if (error)
                  return "nestedFeature." + error;
              }
            }
            if (message.styleAttribute != null && message.hasOwnProperty("styleAttribute")) {
              if (!Array.isArray(message.styleAttribute))
                return "styleAttribute: array expected";
              for (var i = 0; i < message.styleAttribute.length; ++i) {
                var error = $root.keyhole.dbroot.StyleAttributeProto.verify(message.styleAttribute[i]);
                if (error)
                  return "styleAttribute." + error;
              }
            }
            if (message.styleMap != null && message.hasOwnProperty("styleMap")) {
              if (!Array.isArray(message.styleMap))
                return "styleMap: array expected";
              for (var i = 0; i < message.styleMap.length; ++i) {
                var error = $root.keyhole.dbroot.StyleMapProto.verify(message.styleMap[i]);
                if (error)
                  return "styleMap." + error;
              }
            }
            if (message.endSnippet != null && message.hasOwnProperty("endSnippet")) {
              var error = $root.keyhole.dbroot.EndSnippetProto.verify(message.endSnippet);
              if (error)
                return "endSnippet." + error;
            }
            if (message.translationEntry != null && message.hasOwnProperty("translationEntry")) {
              if (!Array.isArray(message.translationEntry))
                return "translationEntry: array expected";
              for (var i = 0; i < message.translationEntry.length; ++i) {
                var error = $root.keyhole.dbroot.StringEntryProto.verify(message.translationEntry[i]);
                if (error)
                  return "translationEntry." + error;
              }
            }
            if (message.language != null && message.hasOwnProperty("language")) {
              if (!$util.isString(message.language))
                return "language: string expected";
            }
            if (message.version != null && message.hasOwnProperty("version")) {
              if (!$util.isInteger(message.version))
                return "version: integer expected";
            }
            if (message.dbrootReference != null && message.hasOwnProperty("dbrootReference")) {
              if (!Array.isArray(message.dbrootReference))
                return "dbrootReference: array expected";
              for (var i = 0; i < message.dbrootReference.length; ++i) {
                var error = $root.keyhole.dbroot.DbRootRefProto.verify(message.dbrootReference[i]);
                if (error)
                  return "dbrootReference." + error;
              }
            }
            if (message.databaseVersion != null && message.hasOwnProperty("databaseVersion")) {
              var error = $root.keyhole.dbroot.DatabaseVersionProto.verify(message.databaseVersion);
              if (error)
                return "databaseVersion." + error;
            }
            if (message.refreshTimeout != null && message.hasOwnProperty("refreshTimeout")) {
              if (!$util.isInteger(message.refreshTimeout))
                return "refreshTimeout: integer expected";
            }
            return null;
          };
          DbRootProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.DbRootProto)
              return object;
            var message = new $root.keyhole.dbroot.DbRootProto();
            if (object.databaseName != null) {
              if (typeof object.databaseName !== "object")
                throw TypeError(".keyhole.dbroot.DbRootProto.databaseName: object expected");
              message.databaseName = $root.keyhole.dbroot.StringIdOrValueProto.fromObject(object.databaseName);
            }
            if (object.imageryPresent != null)
              message.imageryPresent = Boolean(object.imageryPresent);
            if (object.protoImagery != null)
              message.protoImagery = Boolean(object.protoImagery);
            if (object.terrainPresent != null)
              message.terrainPresent = Boolean(object.terrainPresent);
            if (object.providerInfo) {
              if (!Array.isArray(object.providerInfo))
                throw TypeError(".keyhole.dbroot.DbRootProto.providerInfo: array expected");
              message.providerInfo = [];
              for (var i = 0; i < object.providerInfo.length; ++i) {
                if (typeof object.providerInfo[i] !== "object")
                  throw TypeError(".keyhole.dbroot.DbRootProto.providerInfo: object expected");
                message.providerInfo[i] = $root.keyhole.dbroot.ProviderInfoProto.fromObject(object.providerInfo[i]);
              }
            }
            if (object.nestedFeature) {
              if (!Array.isArray(object.nestedFeature))
                throw TypeError(".keyhole.dbroot.DbRootProto.nestedFeature: array expected");
              message.nestedFeature = [];
              for (var i = 0; i < object.nestedFeature.length; ++i) {
                if (typeof object.nestedFeature[i] !== "object")
                  throw TypeError(".keyhole.dbroot.DbRootProto.nestedFeature: object expected");
                message.nestedFeature[i] = $root.keyhole.dbroot.NestedFeatureProto.fromObject(object.nestedFeature[i]);
              }
            }
            if (object.styleAttribute) {
              if (!Array.isArray(object.styleAttribute))
                throw TypeError(".keyhole.dbroot.DbRootProto.styleAttribute: array expected");
              message.styleAttribute = [];
              for (var i = 0; i < object.styleAttribute.length; ++i) {
                if (typeof object.styleAttribute[i] !== "object")
                  throw TypeError(".keyhole.dbroot.DbRootProto.styleAttribute: object expected");
                message.styleAttribute[i] = $root.keyhole.dbroot.StyleAttributeProto.fromObject(object.styleAttribute[i]);
              }
            }
            if (object.styleMap) {
              if (!Array.isArray(object.styleMap))
                throw TypeError(".keyhole.dbroot.DbRootProto.styleMap: array expected");
              message.styleMap = [];
              for (var i = 0; i < object.styleMap.length; ++i) {
                if (typeof object.styleMap[i] !== "object")
                  throw TypeError(".keyhole.dbroot.DbRootProto.styleMap: object expected");
                message.styleMap[i] = $root.keyhole.dbroot.StyleMapProto.fromObject(object.styleMap[i]);
              }
            }
            if (object.endSnippet != null) {
              if (typeof object.endSnippet !== "object")
                throw TypeError(".keyhole.dbroot.DbRootProto.endSnippet: object expected");
              message.endSnippet = $root.keyhole.dbroot.EndSnippetProto.fromObject(object.endSnippet);
            }
            if (object.translationEntry) {
              if (!Array.isArray(object.translationEntry))
                throw TypeError(".keyhole.dbroot.DbRootProto.translationEntry: array expected");
              message.translationEntry = [];
              for (var i = 0; i < object.translationEntry.length; ++i) {
                if (typeof object.translationEntry[i] !== "object")
                  throw TypeError(".keyhole.dbroot.DbRootProto.translationEntry: object expected");
                message.translationEntry[i] = $root.keyhole.dbroot.StringEntryProto.fromObject(object.translationEntry[i]);
              }
            }
            if (object.language != null)
              message.language = String(object.language);
            if (object.version != null)
              message.version = object.version | 0;
            if (object.dbrootReference) {
              if (!Array.isArray(object.dbrootReference))
                throw TypeError(".keyhole.dbroot.DbRootProto.dbrootReference: array expected");
              message.dbrootReference = [];
              for (var i = 0; i < object.dbrootReference.length; ++i) {
                if (typeof object.dbrootReference[i] !== "object")
                  throw TypeError(".keyhole.dbroot.DbRootProto.dbrootReference: object expected");
                message.dbrootReference[i] = $root.keyhole.dbroot.DbRootRefProto.fromObject(object.dbrootReference[i]);
              }
            }
            if (object.databaseVersion != null) {
              if (typeof object.databaseVersion !== "object")
                throw TypeError(".keyhole.dbroot.DbRootProto.databaseVersion: object expected");
              message.databaseVersion = $root.keyhole.dbroot.DatabaseVersionProto.fromObject(object.databaseVersion);
            }
            if (object.refreshTimeout != null)
              message.refreshTimeout = object.refreshTimeout | 0;
            return message;
          };
          DbRootProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.arrays || options.defaults) {
              object.providerInfo = [];
              object.nestedFeature = [];
              object.styleAttribute = [];
              object.styleMap = [];
              object.translationEntry = [];
              object.dbrootReference = [];
            }
            if (options.defaults) {
              object.imageryPresent = true;
              object.terrainPresent = false;
              object.endSnippet = null;
              object.language = "en";
              object.version = 5;
              object.databaseVersion = null;
              object.protoImagery = false;
              object.databaseName = null;
              object.refreshTimeout = 0;
            }
            if (message.imageryPresent != null && message.hasOwnProperty("imageryPresent"))
              object.imageryPresent = message.imageryPresent;
            if (message.terrainPresent != null && message.hasOwnProperty("terrainPresent"))
              object.terrainPresent = message.terrainPresent;
            if (message.providerInfo && message.providerInfo.length) {
              object.providerInfo = [];
              for (var j = 0; j < message.providerInfo.length; ++j)
                object.providerInfo[j] = $root.keyhole.dbroot.ProviderInfoProto.toObject(message.providerInfo[j], options);
            }
            if (message.nestedFeature && message.nestedFeature.length) {
              object.nestedFeature = [];
              for (var j = 0; j < message.nestedFeature.length; ++j)
                object.nestedFeature[j] = $root.keyhole.dbroot.NestedFeatureProto.toObject(message.nestedFeature[j], options);
            }
            if (message.styleAttribute && message.styleAttribute.length) {
              object.styleAttribute = [];
              for (var j = 0; j < message.styleAttribute.length; ++j)
                object.styleAttribute[j] = $root.keyhole.dbroot.StyleAttributeProto.toObject(message.styleAttribute[j], options);
            }
            if (message.styleMap && message.styleMap.length) {
              object.styleMap = [];
              for (var j = 0; j < message.styleMap.length; ++j)
                object.styleMap[j] = $root.keyhole.dbroot.StyleMapProto.toObject(message.styleMap[j], options);
            }
            if (message.endSnippet != null && message.hasOwnProperty("endSnippet"))
              object.endSnippet = $root.keyhole.dbroot.EndSnippetProto.toObject(message.endSnippet, options);
            if (message.translationEntry && message.translationEntry.length) {
              object.translationEntry = [];
              for (var j = 0; j < message.translationEntry.length; ++j)
                object.translationEntry[j] = $root.keyhole.dbroot.StringEntryProto.toObject(message.translationEntry[j], options);
            }
            if (message.language != null && message.hasOwnProperty("language"))
              object.language = message.language;
            if (message.version != null && message.hasOwnProperty("version"))
              object.version = message.version;
            if (message.dbrootReference && message.dbrootReference.length) {
              object.dbrootReference = [];
              for (var j = 0; j < message.dbrootReference.length; ++j)
                object.dbrootReference[j] = $root.keyhole.dbroot.DbRootRefProto.toObject(message.dbrootReference[j], options);
            }
            if (message.databaseVersion != null && message.hasOwnProperty("databaseVersion"))
              object.databaseVersion = $root.keyhole.dbroot.DatabaseVersionProto.toObject(message.databaseVersion, options);
            if (message.protoImagery != null && message.hasOwnProperty("protoImagery"))
              object.protoImagery = message.protoImagery;
            if (message.databaseName != null && message.hasOwnProperty("databaseName"))
              object.databaseName = $root.keyhole.dbroot.StringIdOrValueProto.toObject(message.databaseName, options);
            if (message.refreshTimeout != null && message.hasOwnProperty("refreshTimeout"))
              object.refreshTimeout = message.refreshTimeout;
            return object;
          };
          DbRootProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          DbRootProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.DbRootProto";
          };
          return DbRootProto;
        }();
        dbroot.EncryptedDbRootProto = function() {
          function EncryptedDbRootProto(properties) {
            if (properties) {
              for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                  this[keys[i]] = properties[keys[i]];
            }
          }
          EncryptedDbRootProto.prototype.encryptionType = 0;
          EncryptedDbRootProto.prototype.encryptionData = $util.newBuffer([]);
          EncryptedDbRootProto.prototype.dbrootData = $util.newBuffer([]);
          EncryptedDbRootProto.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
              reader = $Reader.create(reader);
            var end = length === void 0 ? reader.len : reader.pos + length, message = new $root.keyhole.dbroot.EncryptedDbRootProto();
            while (reader.pos < end) {
              var tag = reader.uint32();
              switch (tag >>> 3) {
                case 1: {
                  message.encryptionType = reader.int32();
                  break;
                }
                case 2: {
                  message.encryptionData = reader.bytes();
                  break;
                }
                case 3: {
                  message.dbrootData = reader.bytes();
                  break;
                }
                default:
                  reader.skipType(tag & 7);
                  break;
              }
            }
            return message;
          };
          EncryptedDbRootProto.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
              return "object expected";
            if (message.encryptionType != null && message.hasOwnProperty("encryptionType"))
              switch (message.encryptionType) {
                default:
                  return "encryptionType: enum value expected";
                case 0:
                  break;
              }
            if (message.encryptionData != null && message.hasOwnProperty("encryptionData")) {
              if (!(message.encryptionData && typeof message.encryptionData.length === "number" || $util.isString(message.encryptionData)))
                return "encryptionData: buffer expected";
            }
            if (message.dbrootData != null && message.hasOwnProperty("dbrootData")) {
              if (!(message.dbrootData && typeof message.dbrootData.length === "number" || $util.isString(message.dbrootData)))
                return "dbrootData: buffer expected";
            }
            return null;
          };
          EncryptedDbRootProto.fromObject = function fromObject(object) {
            if (object instanceof $root.keyhole.dbroot.EncryptedDbRootProto)
              return object;
            var message = new $root.keyhole.dbroot.EncryptedDbRootProto();
            switch (object.encryptionType) {
              case "ENCRYPTION_XOR":
              case 0:
                message.encryptionType = 0;
                break;
            }
            if (object.encryptionData != null) {
              if (typeof object.encryptionData === "string")
                $util.base64.decode(object.encryptionData, message.encryptionData = $util.newBuffer($util.base64.length(object.encryptionData)), 0);
              else if (object.encryptionData.length >= 0)
                message.encryptionData = object.encryptionData;
            }
            if (object.dbrootData != null) {
              if (typeof object.dbrootData === "string")
                $util.base64.decode(object.dbrootData, message.dbrootData = $util.newBuffer($util.base64.length(object.dbrootData)), 0);
              else if (object.dbrootData.length >= 0)
                message.dbrootData = object.dbrootData;
            }
            return message;
          };
          EncryptedDbRootProto.toObject = function toObject(message, options) {
            if (!options)
              options = {};
            var object = {};
            if (options.defaults) {
              object.encryptionType = options.enums === String ? "ENCRYPTION_XOR" : 0;
              if (options.bytes === String)
                object.encryptionData = "";
              else {
                object.encryptionData = [];
                if (options.bytes !== Array)
                  object.encryptionData = $util.newBuffer(object.encryptionData);
              }
              if (options.bytes === String)
                object.dbrootData = "";
              else {
                object.dbrootData = [];
                if (options.bytes !== Array)
                  object.dbrootData = $util.newBuffer(object.dbrootData);
              }
            }
            if (message.encryptionType != null && message.hasOwnProperty("encryptionType"))
              object.encryptionType = options.enums === String ? $root.keyhole.dbroot.EncryptedDbRootProto.EncryptionType[message.encryptionType] : message.encryptionType;
            if (message.encryptionData != null && message.hasOwnProperty("encryptionData"))
              object.encryptionData = options.bytes === String ? $util.base64.encode(message.encryptionData, 0, message.encryptionData.length) : options.bytes === Array ? Array.prototype.slice.call(message.encryptionData) : message.encryptionData;
            if (message.dbrootData != null && message.hasOwnProperty("dbrootData"))
              object.dbrootData = options.bytes === String ? $util.base64.encode(message.dbrootData, 0, message.dbrootData.length) : options.bytes === Array ? Array.prototype.slice.call(message.dbrootData) : message.dbrootData;
            return object;
          };
          EncryptedDbRootProto.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
          };
          EncryptedDbRootProto.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === void 0) {
              typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/keyhole.dbroot.EncryptedDbRootProto";
          };
          EncryptedDbRootProto.EncryptionType = function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "ENCRYPTION_XOR"] = 0;
            return values;
          }();
          return EncryptedDbRootProto;
        }();
        return dbroot;
      }();
      return keyhole;
    }();
    return $root.keyhole.dbroot;
  };
})();
//# sourceMappingURL=google-earth-dbroot-parser.js.map
