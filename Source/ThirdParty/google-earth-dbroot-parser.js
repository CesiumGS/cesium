window.cesiumGoogleEarthDbRootParser = function(
    $protobuf) {
    /* jshint curly: false, sub: true, newcap: false, shadow: true, unused: false*/
    'use strict';

    //
    // Creates a parser for a dbroot protocol buffer
    //  Below code is generated using protobufjs with the following command
    //
    //  ./pbjs --no-encode --no-create --no-comments --no-delimited -w amd -t static dbroot_v2.proto
    //
    // .proto file can be found here: https://github.com/google/earthenterprise/blob/master/earth_enterprise/src/keyhole/proto/dbroot/dbroot_v2.proto

    var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

    var $lazyTypes = [];

    var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

    $root.keyhole = (function() {

        var keyhole = {};

        keyhole.dbroot = (function() {

            var dbroot = {};

            dbroot.StringEntryProto = (function() {

                function StringEntryProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                StringEntryProto.prototype.stringId = 0;
                StringEntryProto.prototype.stringValue = "";

                StringEntryProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.StringEntryProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.stringId = reader.fixed32();
                                break;
                            case 2:
                                message.stringValue = reader.string();
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
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
                    if (object.stringId !== undefined && object.stringId !== null)
                        message.stringId = object.stringId >>> 0;
                    if (object.stringValue !== undefined && object.stringValue !== null)
                        message.stringValue = String(object.stringValue);
                    return message;
                };

                StringEntryProto.from = StringEntryProto.fromObject;

                StringEntryProto.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.stringId = 0;
                        object.stringValue = "";
                    }
                    if (message.stringId !== undefined && message.stringId !== null && message.hasOwnProperty("stringId"))
                        object.stringId = message.stringId;
                    if (message.stringValue !== undefined && message.stringValue !== null && message.hasOwnProperty("stringValue"))
                        object.stringValue = message.stringValue;
                    return object;
                };

                StringEntryProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                StringEntryProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return StringEntryProto;
            })();

            dbroot.StringIdOrValueProto = (function() {

                function StringIdOrValueProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                StringIdOrValueProto.prototype.stringId = 0;
                StringIdOrValueProto.prototype.value = "";

                StringIdOrValueProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.StringIdOrValueProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.stringId = reader.fixed32();
                                break;
                            case 2:
                                message.value = reader.string();
                                break;
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
                    if (message.stringId !== undefined)
                        if (!$util.isInteger(message.stringId))
                            return "stringId: integer expected";
                    if (message.value !== undefined)
                        if (!$util.isString(message.value))
                            return "value: string expected";
                    return null;
                };

                StringIdOrValueProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.StringIdOrValueProto)
                        return object;
                    var message = new $root.keyhole.dbroot.StringIdOrValueProto();
                    if (object.stringId !== undefined && object.stringId !== null)
                        message.stringId = object.stringId >>> 0;
                    if (object.value !== undefined && object.value !== null)
                        message.value = String(object.value);
                    return message;
                };

                StringIdOrValueProto.from = StringIdOrValueProto.fromObject;

                StringIdOrValueProto.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.stringId = 0;
                        object.value = "";
                    }
                    if (message.stringId !== undefined && message.stringId !== null && message.hasOwnProperty("stringId"))
                        object.stringId = message.stringId;
                    if (message.value !== undefined && message.value !== null && message.hasOwnProperty("value"))
                        object.value = message.value;
                    return object;
                };

                StringIdOrValueProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                StringIdOrValueProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return StringIdOrValueProto;
            })();

            dbroot.PlanetModelProto = (function() {

                function PlanetModelProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                PlanetModelProto.prototype.radius = 6378.137;
                PlanetModelProto.prototype.flattening = 0.00335281066474748;
                PlanetModelProto.prototype.elevationBias = 0;
                PlanetModelProto.prototype.negativeAltitudeExponentBias = 0;
                PlanetModelProto.prototype.compressedNegativeAltitudeThreshold = 0;

                PlanetModelProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.PlanetModelProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.radius = reader.double();
                                break;
                            case 2:
                                message.flattening = reader.double();
                                break;
                            case 4:
                                message.elevationBias = reader.double();
                                break;
                            case 5:
                                message.negativeAltitudeExponentBias = reader.int32();
                                break;
                            case 6:
                                message.compressedNegativeAltitudeThreshold = reader.double();
                                break;
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
                    if (message.radius !== undefined)
                        if (typeof message.radius !== "number")
                            return "radius: number expected";
                    if (message.flattening !== undefined)
                        if (typeof message.flattening !== "number")
                            return "flattening: number expected";
                    if (message.elevationBias !== undefined)
                        if (typeof message.elevationBias !== "number")
                            return "elevationBias: number expected";
                    if (message.negativeAltitudeExponentBias !== undefined)
                        if (!$util.isInteger(message.negativeAltitudeExponentBias))
                            return "negativeAltitudeExponentBias: integer expected";
                    if (message.compressedNegativeAltitudeThreshold !== undefined)
                        if (typeof message.compressedNegativeAltitudeThreshold !== "number")
                            return "compressedNegativeAltitudeThreshold: number expected";
                    return null;
                };

                PlanetModelProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.PlanetModelProto)
                        return object;
                    var message = new $root.keyhole.dbroot.PlanetModelProto();
                    if (object.radius !== undefined && object.radius !== null)
                        message.radius = Number(object.radius);
                    if (object.flattening !== undefined && object.flattening !== null)
                        message.flattening = Number(object.flattening);
                    if (object.elevationBias !== undefined && object.elevationBias !== null)
                        message.elevationBias = Number(object.elevationBias);
                    if (object.negativeAltitudeExponentBias !== undefined && object.negativeAltitudeExponentBias !== null)
                        message.negativeAltitudeExponentBias = object.negativeAltitudeExponentBias | 0;
                    if (object.compressedNegativeAltitudeThreshold !== undefined && object.compressedNegativeAltitudeThreshold !== null)
                        message.compressedNegativeAltitudeThreshold = Number(object.compressedNegativeAltitudeThreshold);
                    return message;
                };

                PlanetModelProto.from = PlanetModelProto.fromObject;

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
                    if (message.radius !== undefined && message.radius !== null && message.hasOwnProperty("radius"))
                        object.radius = message.radius;
                    if (message.flattening !== undefined && message.flattening !== null && message.hasOwnProperty("flattening"))
                        object.flattening = message.flattening;
                    if (message.elevationBias !== undefined && message.elevationBias !== null && message.hasOwnProperty("elevationBias"))
                        object.elevationBias = message.elevationBias;
                    if (message.negativeAltitudeExponentBias !== undefined && message.negativeAltitudeExponentBias !== null && message.hasOwnProperty("negativeAltitudeExponentBias"))
                        object.negativeAltitudeExponentBias = message.negativeAltitudeExponentBias;
                    if (message.compressedNegativeAltitudeThreshold !== undefined && message.compressedNegativeAltitudeThreshold !== null && message.hasOwnProperty("compressedNegativeAltitudeThreshold"))
                        object.compressedNegativeAltitudeThreshold = message.compressedNegativeAltitudeThreshold;
                    return object;
                };

                PlanetModelProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                PlanetModelProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return PlanetModelProto;
            })();

            dbroot.ProviderInfoProto = (function() {

                function ProviderInfoProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                ProviderInfoProto.prototype.providerId = 0;
                ProviderInfoProto.prototype.copyrightString = null;
                ProviderInfoProto.prototype.verticalPixelOffset = -1;

                var $types = {
                    1 : "keyhole.dbroot.StringIdOrValueProto"
                };
                $lazyTypes.push($types);

                ProviderInfoProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.ProviderInfoProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.providerId = reader.int32();
                                break;
                            case 2:
                                message.copyrightString = $types[1].decode(reader, reader.uint32());
                                break;
                            case 3:
                                message.verticalPixelOffset = reader.int32();
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                ProviderInfoProto.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (!$util.isInteger(message.providerId))
                        return "providerId: integer expected";
                    if (message.copyrightString !== undefined && message.copyrightString !== null) {
                        var error = $types[1].verify(message.copyrightString);
                        if (error)
                            return "copyrightString." + error;
                    }
                    if (message.verticalPixelOffset !== undefined)
                        if (!$util.isInteger(message.verticalPixelOffset))
                            return "verticalPixelOffset: integer expected";
                    return null;
                };

                ProviderInfoProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.ProviderInfoProto)
                        return object;
                    var message = new $root.keyhole.dbroot.ProviderInfoProto();
                    if (object.providerId !== undefined && object.providerId !== null)
                        message.providerId = object.providerId | 0;
                    if (object.copyrightString !== undefined && object.copyrightString !== null) {
                        if (typeof object.copyrightString !== "object")
                            throw TypeError(".keyhole.dbroot.ProviderInfoProto.copyrightString: object expected");
                        message.copyrightString = $types[1].fromObject(object.copyrightString);
                    }
                    if (object.verticalPixelOffset !== undefined && object.verticalPixelOffset !== null)
                        message.verticalPixelOffset = object.verticalPixelOffset | 0;
                    return message;
                };

                ProviderInfoProto.from = ProviderInfoProto.fromObject;

                ProviderInfoProto.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.providerId = 0;
                        object.copyrightString = null;
                        object.verticalPixelOffset = -1;
                    }
                    if (message.providerId !== undefined && message.providerId !== null && message.hasOwnProperty("providerId"))
                        object.providerId = message.providerId;
                    if (message.copyrightString !== undefined && message.copyrightString !== null && message.hasOwnProperty("copyrightString"))
                        object.copyrightString = $types[1].toObject(message.copyrightString, options);
                    if (message.verticalPixelOffset !== undefined && message.verticalPixelOffset !== null && message.hasOwnProperty("verticalPixelOffset"))
                        object.verticalPixelOffset = message.verticalPixelOffset;
                    return object;
                };

                ProviderInfoProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                ProviderInfoProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return ProviderInfoProto;
            })();

            dbroot.PopUpProto = (function() {

                function PopUpProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                PopUpProto.prototype.isBalloonStyle = false;
                PopUpProto.prototype.text = null;
                PopUpProto.prototype.backgroundColorAbgr = 4294967295;
                PopUpProto.prototype.textColorAbgr = 4278190080;

                var $types = {
                    1 : "keyhole.dbroot.StringIdOrValueProto"
                };
                $lazyTypes.push($types);

                PopUpProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.PopUpProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.isBalloonStyle = reader.bool();
                                break;
                            case 2:
                                message.text = $types[1].decode(reader, reader.uint32());
                                break;
                            case 3:
                                message.backgroundColorAbgr = reader.fixed32();
                                break;
                            case 4:
                                message.textColorAbgr = reader.fixed32();
                                break;
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
                    if (message.isBalloonStyle !== undefined)
                        if (typeof message.isBalloonStyle !== "boolean")
                            return "isBalloonStyle: boolean expected";
                    if (message.text !== undefined && message.text !== null) {
                        var error = $types[1].verify(message.text);
                        if (error)
                            return "text." + error;
                    }
                    if (message.backgroundColorAbgr !== undefined)
                        if (!$util.isInteger(message.backgroundColorAbgr))
                            return "backgroundColorAbgr: integer expected";
                    if (message.textColorAbgr !== undefined)
                        if (!$util.isInteger(message.textColorAbgr))
                            return "textColorAbgr: integer expected";
                    return null;
                };

                PopUpProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.PopUpProto)
                        return object;
                    var message = new $root.keyhole.dbroot.PopUpProto();
                    if (object.isBalloonStyle !== undefined && object.isBalloonStyle !== null)
                        message.isBalloonStyle = Boolean(object.isBalloonStyle);
                    if (object.text !== undefined && object.text !== null) {
                        if (typeof object.text !== "object")
                            throw TypeError(".keyhole.dbroot.PopUpProto.text: object expected");
                        message.text = $types[1].fromObject(object.text);
                    }
                    if (object.backgroundColorAbgr !== undefined && object.backgroundColorAbgr !== null)
                        message.backgroundColorAbgr = object.backgroundColorAbgr >>> 0;
                    if (object.textColorAbgr !== undefined && object.textColorAbgr !== null)
                        message.textColorAbgr = object.textColorAbgr >>> 0;
                    return message;
                };

                PopUpProto.from = PopUpProto.fromObject;

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
                    if (message.isBalloonStyle !== undefined && message.isBalloonStyle !== null && message.hasOwnProperty("isBalloonStyle"))
                        object.isBalloonStyle = message.isBalloonStyle;
                    if (message.text !== undefined && message.text !== null && message.hasOwnProperty("text"))
                        object.text = $types[1].toObject(message.text, options);
                    if (message.backgroundColorAbgr !== undefined && message.backgroundColorAbgr !== null && message.hasOwnProperty("backgroundColorAbgr"))
                        object.backgroundColorAbgr = message.backgroundColorAbgr;
                    if (message.textColorAbgr !== undefined && message.textColorAbgr !== null && message.hasOwnProperty("textColorAbgr"))
                        object.textColorAbgr = message.textColorAbgr;
                    return object;
                };

                PopUpProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                PopUpProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return PopUpProto;
            })();

            dbroot.StyleAttributeProto = (function() {

                function StyleAttributeProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
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

                var $types = {
                    9 : "keyhole.dbroot.StringIdOrValueProto",
                    14 : "keyhole.dbroot.PopUpProto",
                    15 : "keyhole.dbroot.DrawFlagProto"
                };
                $lazyTypes.push($types);

                StyleAttributeProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.StyleAttributeProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.styleId = reader.string();
                                break;
                            case 3:
                                message.providerId = reader.int32();
                                break;
                            case 4:
                                message.polyColorAbgr = reader.fixed32();
                                break;
                            case 5:
                                message.lineColorAbgr = reader.fixed32();
                                break;
                            case 6:
                                message.lineWidth = reader.float();
                                break;
                            case 7:
                                message.labelColorAbgr = reader.fixed32();
                                break;
                            case 8:
                                message.labelScale = reader.float();
                                break;
                            case 9:
                                message.placemarkIconColorAbgr = reader.fixed32();
                                break;
                            case 10:
                                message.placemarkIconScale = reader.float();
                                break;
                            case 11:
                                message.placemarkIconPath = $types[9].decode(reader, reader.uint32());
                                break;
                            case 12:
                                message.placemarkIconX = reader.int32();
                                break;
                            case 13:
                                message.placemarkIconY = reader.int32();
                                break;
                            case 14:
                                message.placemarkIconWidth = reader.int32();
                                break;
                            case 15:
                                message.placemarkIconHeight = reader.int32();
                                break;
                            case 16:
                                message.popUp = $types[14].decode(reader, reader.uint32());
                                break;
                            case 17:
                                if (!(message.drawFlag && message.drawFlag.length))
                                    message.drawFlag = [];
                                message.drawFlag.push($types[15].decode(reader, reader.uint32()));
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                StyleAttributeProto.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (!$util.isString(message.styleId))
                        return "styleId: string expected";
                    if (message.providerId !== undefined)
                        if (!$util.isInteger(message.providerId))
                            return "providerId: integer expected";
                    if (message.polyColorAbgr !== undefined)
                        if (!$util.isInteger(message.polyColorAbgr))
                            return "polyColorAbgr: integer expected";
                    if (message.lineColorAbgr !== undefined)
                        if (!$util.isInteger(message.lineColorAbgr))
                            return "lineColorAbgr: integer expected";
                    if (message.lineWidth !== undefined)
                        if (typeof message.lineWidth !== "number")
                            return "lineWidth: number expected";
                    if (message.labelColorAbgr !== undefined)
                        if (!$util.isInteger(message.labelColorAbgr))
                            return "labelColorAbgr: integer expected";
                    if (message.labelScale !== undefined)
                        if (typeof message.labelScale !== "number")
                            return "labelScale: number expected";
                    if (message.placemarkIconColorAbgr !== undefined)
                        if (!$util.isInteger(message.placemarkIconColorAbgr))
                            return "placemarkIconColorAbgr: integer expected";
                    if (message.placemarkIconScale !== undefined)
                        if (typeof message.placemarkIconScale !== "number")
                            return "placemarkIconScale: number expected";
                    if (message.placemarkIconPath !== undefined && message.placemarkIconPath !== null) {
                        var error = $types[9].verify(message.placemarkIconPath);
                        if (error)
                            return "placemarkIconPath." + error;
                    }
                    if (message.placemarkIconX !== undefined)
                        if (!$util.isInteger(message.placemarkIconX))
                            return "placemarkIconX: integer expected";
                    if (message.placemarkIconY !== undefined)
                        if (!$util.isInteger(message.placemarkIconY))
                            return "placemarkIconY: integer expected";
                    if (message.placemarkIconWidth !== undefined)
                        if (!$util.isInteger(message.placemarkIconWidth))
                            return "placemarkIconWidth: integer expected";
                    if (message.placemarkIconHeight !== undefined)
                        if (!$util.isInteger(message.placemarkIconHeight))
                            return "placemarkIconHeight: integer expected";
                    if (message.popUp !== undefined && message.popUp !== null) {
                        var error = $types[14].verify(message.popUp);
                        if (error)
                            return "popUp." + error;
                    }
                    if (message.drawFlag !== undefined) {
                        if (!Array.isArray(message.drawFlag))
                            return "drawFlag: array expected";
                        for (var i = 0; i < message.drawFlag.length; ++i) {
                            var error = $types[15].verify(message.drawFlag[i]);
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
                    if (object.styleId !== undefined && object.styleId !== null)
                        message.styleId = String(object.styleId);
                    if (object.providerId !== undefined && object.providerId !== null)
                        message.providerId = object.providerId | 0;
                    if (object.polyColorAbgr !== undefined && object.polyColorAbgr !== null)
                        message.polyColorAbgr = object.polyColorAbgr >>> 0;
                    if (object.lineColorAbgr !== undefined && object.lineColorAbgr !== null)
                        message.lineColorAbgr = object.lineColorAbgr >>> 0;
                    if (object.lineWidth !== undefined && object.lineWidth !== null)
                        message.lineWidth = Number(object.lineWidth);
                    if (object.labelColorAbgr !== undefined && object.labelColorAbgr !== null)
                        message.labelColorAbgr = object.labelColorAbgr >>> 0;
                    if (object.labelScale !== undefined && object.labelScale !== null)
                        message.labelScale = Number(object.labelScale);
                    if (object.placemarkIconColorAbgr !== undefined && object.placemarkIconColorAbgr !== null)
                        message.placemarkIconColorAbgr = object.placemarkIconColorAbgr >>> 0;
                    if (object.placemarkIconScale !== undefined && object.placemarkIconScale !== null)
                        message.placemarkIconScale = Number(object.placemarkIconScale);
                    if (object.placemarkIconPath !== undefined && object.placemarkIconPath !== null) {
                        if (typeof object.placemarkIconPath !== "object")
                            throw TypeError(".keyhole.dbroot.StyleAttributeProto.placemarkIconPath: object expected");
                        message.placemarkIconPath = $types[9].fromObject(object.placemarkIconPath);
                    }
                    if (object.placemarkIconX !== undefined && object.placemarkIconX !== null)
                        message.placemarkIconX = object.placemarkIconX | 0;
                    if (object.placemarkIconY !== undefined && object.placemarkIconY !== null)
                        message.placemarkIconY = object.placemarkIconY | 0;
                    if (object.placemarkIconWidth !== undefined && object.placemarkIconWidth !== null)
                        message.placemarkIconWidth = object.placemarkIconWidth | 0;
                    if (object.placemarkIconHeight !== undefined && object.placemarkIconHeight !== null)
                        message.placemarkIconHeight = object.placemarkIconHeight | 0;
                    if (object.popUp !== undefined && object.popUp !== null) {
                        if (typeof object.popUp !== "object")
                            throw TypeError(".keyhole.dbroot.StyleAttributeProto.popUp: object expected");
                        message.popUp = $types[14].fromObject(object.popUp);
                    }
                    if (object.drawFlag) {
                        if (!Array.isArray(object.drawFlag))
                            throw TypeError(".keyhole.dbroot.StyleAttributeProto.drawFlag: array expected");
                        message.drawFlag = [];
                        for (var i = 0; i < object.drawFlag.length; ++i) {
                            if (typeof object.drawFlag[i] !== "object")
                                throw TypeError(".keyhole.dbroot.StyleAttributeProto.drawFlag: object expected");
                            message.drawFlag[i] = $types[15].fromObject(object.drawFlag[i]);
                        }
                    }
                    return message;
                };

                StyleAttributeProto.from = StyleAttributeProto.fromObject;

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
                    if (message.styleId !== undefined && message.styleId !== null && message.hasOwnProperty("styleId"))
                        object.styleId = message.styleId;
                    if (message.providerId !== undefined && message.providerId !== null && message.hasOwnProperty("providerId"))
                        object.providerId = message.providerId;
                    if (message.polyColorAbgr !== undefined && message.polyColorAbgr !== null && message.hasOwnProperty("polyColorAbgr"))
                        object.polyColorAbgr = message.polyColorAbgr;
                    if (message.lineColorAbgr !== undefined && message.lineColorAbgr !== null && message.hasOwnProperty("lineColorAbgr"))
                        object.lineColorAbgr = message.lineColorAbgr;
                    if (message.lineWidth !== undefined && message.lineWidth !== null && message.hasOwnProperty("lineWidth"))
                        object.lineWidth = message.lineWidth;
                    if (message.labelColorAbgr !== undefined && message.labelColorAbgr !== null && message.hasOwnProperty("labelColorAbgr"))
                        object.labelColorAbgr = message.labelColorAbgr;
                    if (message.labelScale !== undefined && message.labelScale !== null && message.hasOwnProperty("labelScale"))
                        object.labelScale = message.labelScale;
                    if (message.placemarkIconColorAbgr !== undefined && message.placemarkIconColorAbgr !== null && message.hasOwnProperty("placemarkIconColorAbgr"))
                        object.placemarkIconColorAbgr = message.placemarkIconColorAbgr;
                    if (message.placemarkIconScale !== undefined && message.placemarkIconScale !== null && message.hasOwnProperty("placemarkIconScale"))
                        object.placemarkIconScale = message.placemarkIconScale;
                    if (message.placemarkIconPath !== undefined && message.placemarkIconPath !== null && message.hasOwnProperty("placemarkIconPath"))
                        object.placemarkIconPath = $types[9].toObject(message.placemarkIconPath, options);
                    if (message.placemarkIconX !== undefined && message.placemarkIconX !== null && message.hasOwnProperty("placemarkIconX"))
                        object.placemarkIconX = message.placemarkIconX;
                    if (message.placemarkIconY !== undefined && message.placemarkIconY !== null && message.hasOwnProperty("placemarkIconY"))
                        object.placemarkIconY = message.placemarkIconY;
                    if (message.placemarkIconWidth !== undefined && message.placemarkIconWidth !== null && message.hasOwnProperty("placemarkIconWidth"))
                        object.placemarkIconWidth = message.placemarkIconWidth;
                    if (message.placemarkIconHeight !== undefined && message.placemarkIconHeight !== null && message.hasOwnProperty("placemarkIconHeight"))
                        object.placemarkIconHeight = message.placemarkIconHeight;
                    if (message.popUp !== undefined && message.popUp !== null && message.hasOwnProperty("popUp"))
                        object.popUp = $types[14].toObject(message.popUp, options);
                    if (message.drawFlag !== undefined && message.drawFlag !== null && message.hasOwnProperty("drawFlag")) {
                        object.drawFlag = [];
                        for (var j = 0; j < message.drawFlag.length; ++j)
                            object.drawFlag[j] = $types[15].toObject(message.drawFlag[j], options);
                    }
                    return object;
                };

                StyleAttributeProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                StyleAttributeProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return StyleAttributeProto;
            })();

            dbroot.StyleMapProto = (function() {

                function StyleMapProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                StyleMapProto.prototype.styleMapId = 0;
                StyleMapProto.prototype.channelId = $util.emptyArray;
                StyleMapProto.prototype.normalStyleAttribute = 0;
                StyleMapProto.prototype.highlightStyleAttribute = 0;

                StyleMapProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.StyleMapProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.styleMapId = reader.int32();
                                break;
                            case 2:
                                if (!(message.channelId && message.channelId.length))
                                    message.channelId = [];
                                if ((tag & 7) === 2) {
                                    var end2 = reader.uint32() + reader.pos;
                                    while (reader.pos < end2)
                                        message.channelId.push(reader.int32());
                                } else
                                    message.channelId.push(reader.int32());
                                break;
                            case 3:
                                message.normalStyleAttribute = reader.int32();
                                break;
                            case 4:
                                message.highlightStyleAttribute = reader.int32();
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                StyleMapProto.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (!$util.isInteger(message.styleMapId))
                        return "styleMapId: integer expected";
                    if (message.channelId !== undefined) {
                        if (!Array.isArray(message.channelId))
                            return "channelId: array expected";
                        for (var i = 0; i < message.channelId.length; ++i)
                            if (!$util.isInteger(message.channelId[i]))
                                return "channelId: integer[] expected";
                    }
                    if (message.normalStyleAttribute !== undefined)
                        if (!$util.isInteger(message.normalStyleAttribute))
                            return "normalStyleAttribute: integer expected";
                    if (message.highlightStyleAttribute !== undefined)
                        if (!$util.isInteger(message.highlightStyleAttribute))
                            return "highlightStyleAttribute: integer expected";
                    return null;
                };

                StyleMapProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.StyleMapProto)
                        return object;
                    var message = new $root.keyhole.dbroot.StyleMapProto();
                    if (object.styleMapId !== undefined && object.styleMapId !== null)
                        message.styleMapId = object.styleMapId | 0;
                    if (object.channelId) {
                        if (!Array.isArray(object.channelId))
                            throw TypeError(".keyhole.dbroot.StyleMapProto.channelId: array expected");
                        message.channelId = [];
                        for (var i = 0; i < object.channelId.length; ++i)
                            message.channelId[i] = object.channelId[i] | 0;
                    }
                    if (object.normalStyleAttribute !== undefined && object.normalStyleAttribute !== null)
                        message.normalStyleAttribute = object.normalStyleAttribute | 0;
                    if (object.highlightStyleAttribute !== undefined && object.highlightStyleAttribute !== null)
                        message.highlightStyleAttribute = object.highlightStyleAttribute | 0;
                    return message;
                };

                StyleMapProto.from = StyleMapProto.fromObject;

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
                    if (message.styleMapId !== undefined && message.styleMapId !== null && message.hasOwnProperty("styleMapId"))
                        object.styleMapId = message.styleMapId;
                    if (message.channelId !== undefined && message.channelId !== null && message.hasOwnProperty("channelId")) {
                        object.channelId = [];
                        for (var j = 0; j < message.channelId.length; ++j)
                            object.channelId[j] = message.channelId[j];
                    }
                    if (message.normalStyleAttribute !== undefined && message.normalStyleAttribute !== null && message.hasOwnProperty("normalStyleAttribute"))
                        object.normalStyleAttribute = message.normalStyleAttribute;
                    if (message.highlightStyleAttribute !== undefined && message.highlightStyleAttribute !== null && message.hasOwnProperty("highlightStyleAttribute"))
                        object.highlightStyleAttribute = message.highlightStyleAttribute;
                    return object;
                };

                StyleMapProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                StyleMapProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return StyleMapProto;
            })();

            dbroot.ZoomRangeProto = (function() {

                function ZoomRangeProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                ZoomRangeProto.prototype.minZoom = 0;
                ZoomRangeProto.prototype.maxZoom = 0;

                ZoomRangeProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.ZoomRangeProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.minZoom = reader.int32();
                                break;
                            case 2:
                                message.maxZoom = reader.int32();
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
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
                    if (object.minZoom !== undefined && object.minZoom !== null)
                        message.minZoom = object.minZoom | 0;
                    if (object.maxZoom !== undefined && object.maxZoom !== null)
                        message.maxZoom = object.maxZoom | 0;
                    return message;
                };

                ZoomRangeProto.from = ZoomRangeProto.fromObject;

                ZoomRangeProto.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.minZoom = 0;
                        object.maxZoom = 0;
                    }
                    if (message.minZoom !== undefined && message.minZoom !== null && message.hasOwnProperty("minZoom"))
                        object.minZoom = message.minZoom;
                    if (message.maxZoom !== undefined && message.maxZoom !== null && message.hasOwnProperty("maxZoom"))
                        object.maxZoom = message.maxZoom;
                    return object;
                };

                ZoomRangeProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                ZoomRangeProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return ZoomRangeProto;
            })();

            dbroot.DrawFlagProto = (function() {

                function DrawFlagProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                DrawFlagProto.prototype.drawFlagType = 1;

                var $types = {
                    0 : "keyhole.dbroot.DrawFlagProto.DrawFlagType"
                };
                $lazyTypes.push($types);

                DrawFlagProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.DrawFlagProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.drawFlagType = reader.uint32();
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
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

                DrawFlagProto.from = DrawFlagProto.fromObject;

                DrawFlagProto.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults)
                        object.drawFlagType = options.enums === String ? "TYPE_FILL_ONLY" : 1;
                    if (message.drawFlagType !== undefined && message.drawFlagType !== null && message.hasOwnProperty("drawFlagType"))
                        object.drawFlagType = options.enums === String ? $types[0][message.drawFlagType] : message.drawFlagType;
                    return object;
                };

                DrawFlagProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                DrawFlagProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                DrawFlagProto.DrawFlagType = (function() {
                    var valuesById = {}, values = Object.create(valuesById);
                    values["TYPE_FILL_ONLY"] = 1;
                    values["TYPE_OUTLINE_ONLY"] = 2;
                    values["TYPE_FILL_AND_OUTLINE"] = 3;
                    values["TYPE_ANTIALIASING"] = 4;
                    values["TYPE_CENTER_LABEL"] = 5;
                    return values;
                })();

                return DrawFlagProto;
            })();

            dbroot.LayerProto = (function() {

                function LayerProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                LayerProto.prototype.zoomRange = $util.emptyArray;
                LayerProto.prototype.preserveTextLevel = 30;
                LayerProto.prototype.lodBeginTransition = false;
                LayerProto.prototype.lodEndTransition = false;

                var $types = {
                    0 : "keyhole.dbroot.ZoomRangeProto"
                };
                $lazyTypes.push($types);

                LayerProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.LayerProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                if (!(message.zoomRange && message.zoomRange.length))
                                    message.zoomRange = [];
                                message.zoomRange.push($types[0].decode(reader, reader.uint32()));
                                break;
                            case 2:
                                message.preserveTextLevel = reader.int32();
                                break;
                            case 4:
                                message.lodBeginTransition = reader.bool();
                                break;
                            case 5:
                                message.lodEndTransition = reader.bool();
                                break;
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
                    if (message.zoomRange !== undefined) {
                        if (!Array.isArray(message.zoomRange))
                            return "zoomRange: array expected";
                        for (var i = 0; i < message.zoomRange.length; ++i) {
                            var error = $types[0].verify(message.zoomRange[i]);
                            if (error)
                                return "zoomRange." + error;
                        }
                    }
                    if (message.preserveTextLevel !== undefined)
                        if (!$util.isInteger(message.preserveTextLevel))
                            return "preserveTextLevel: integer expected";
                    if (message.lodBeginTransition !== undefined)
                        if (typeof message.lodBeginTransition !== "boolean")
                            return "lodBeginTransition: boolean expected";
                    if (message.lodEndTransition !== undefined)
                        if (typeof message.lodEndTransition !== "boolean")
                            return "lodEndTransition: boolean expected";
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
                            message.zoomRange[i] = $types[0].fromObject(object.zoomRange[i]);
                        }
                    }
                    if (object.preserveTextLevel !== undefined && object.preserveTextLevel !== null)
                        message.preserveTextLevel = object.preserveTextLevel | 0;
                    if (object.lodBeginTransition !== undefined && object.lodBeginTransition !== null)
                        message.lodBeginTransition = Boolean(object.lodBeginTransition);
                    if (object.lodEndTransition !== undefined && object.lodEndTransition !== null)
                        message.lodEndTransition = Boolean(object.lodEndTransition);
                    return message;
                };

                LayerProto.from = LayerProto.fromObject;

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
                    if (message.zoomRange !== undefined && message.zoomRange !== null && message.hasOwnProperty("zoomRange")) {
                        object.zoomRange = [];
                        for (var j = 0; j < message.zoomRange.length; ++j)
                            object.zoomRange[j] = $types[0].toObject(message.zoomRange[j], options);
                    }
                    if (message.preserveTextLevel !== undefined && message.preserveTextLevel !== null && message.hasOwnProperty("preserveTextLevel"))
                        object.preserveTextLevel = message.preserveTextLevel;
                    if (message.lodBeginTransition !== undefined && message.lodBeginTransition !== null && message.hasOwnProperty("lodBeginTransition"))
                        object.lodBeginTransition = message.lodBeginTransition;
                    if (message.lodEndTransition !== undefined && message.lodEndTransition !== null && message.hasOwnProperty("lodEndTransition"))
                        object.lodEndTransition = message.lodEndTransition;
                    return object;
                };

                LayerProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                LayerProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return LayerProto;
            })();

            dbroot.FolderProto = (function() {

                function FolderProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                FolderProto.prototype.isExpandable = true;

                FolderProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.FolderProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.isExpandable = reader.bool();
                                break;
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
                    if (message.isExpandable !== undefined)
                        if (typeof message.isExpandable !== "boolean")
                            return "isExpandable: boolean expected";
                    return null;
                };

                FolderProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.FolderProto)
                        return object;
                    var message = new $root.keyhole.dbroot.FolderProto();
                    if (object.isExpandable !== undefined && object.isExpandable !== null)
                        message.isExpandable = Boolean(object.isExpandable);
                    return message;
                };

                FolderProto.from = FolderProto.fromObject;

                FolderProto.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults)
                        object.isExpandable = true;
                    if (message.isExpandable !== undefined && message.isExpandable !== null && message.hasOwnProperty("isExpandable"))
                        object.isExpandable = message.isExpandable;
                    return object;
                };

                FolderProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                FolderProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return FolderProto;
            })();

            dbroot.RequirementProto = (function() {

                function RequirementProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                RequirementProto.prototype.requiredVram = "";
                RequirementProto.prototype.requiredClientVer = "";
                RequirementProto.prototype.probability = "";
                RequirementProto.prototype.requiredUserAgent = "";
                RequirementProto.prototype.requiredClientCapabilities = "";

                RequirementProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.RequirementProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 3:
                                message.requiredVram = reader.string();
                                break;
                            case 4:
                                message.requiredClientVer = reader.string();
                                break;
                            case 5:
                                message.probability = reader.string();
                                break;
                            case 6:
                                message.requiredUserAgent = reader.string();
                                break;
                            case 7:
                                message.requiredClientCapabilities = reader.string();
                                break;
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
                    if (message.requiredVram !== undefined)
                        if (!$util.isString(message.requiredVram))
                            return "requiredVram: string expected";
                    if (message.requiredClientVer !== undefined)
                        if (!$util.isString(message.requiredClientVer))
                            return "requiredClientVer: string expected";
                    if (message.probability !== undefined)
                        if (!$util.isString(message.probability))
                            return "probability: string expected";
                    if (message.requiredUserAgent !== undefined)
                        if (!$util.isString(message.requiredUserAgent))
                            return "requiredUserAgent: string expected";
                    if (message.requiredClientCapabilities !== undefined)
                        if (!$util.isString(message.requiredClientCapabilities))
                            return "requiredClientCapabilities: string expected";
                    return null;
                };

                RequirementProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.RequirementProto)
                        return object;
                    var message = new $root.keyhole.dbroot.RequirementProto();
                    if (object.requiredVram !== undefined && object.requiredVram !== null)
                        message.requiredVram = String(object.requiredVram);
                    if (object.requiredClientVer !== undefined && object.requiredClientVer !== null)
                        message.requiredClientVer = String(object.requiredClientVer);
                    if (object.probability !== undefined && object.probability !== null)
                        message.probability = String(object.probability);
                    if (object.requiredUserAgent !== undefined && object.requiredUserAgent !== null)
                        message.requiredUserAgent = String(object.requiredUserAgent);
                    if (object.requiredClientCapabilities !== undefined && object.requiredClientCapabilities !== null)
                        message.requiredClientCapabilities = String(object.requiredClientCapabilities);
                    return message;
                };

                RequirementProto.from = RequirementProto.fromObject;

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
                    if (message.requiredVram !== undefined && message.requiredVram !== null && message.hasOwnProperty("requiredVram"))
                        object.requiredVram = message.requiredVram;
                    if (message.requiredClientVer !== undefined && message.requiredClientVer !== null && message.hasOwnProperty("requiredClientVer"))
                        object.requiredClientVer = message.requiredClientVer;
                    if (message.probability !== undefined && message.probability !== null && message.hasOwnProperty("probability"))
                        object.probability = message.probability;
                    if (message.requiredUserAgent !== undefined && message.requiredUserAgent !== null && message.hasOwnProperty("requiredUserAgent"))
                        object.requiredUserAgent = message.requiredUserAgent;
                    if (message.requiredClientCapabilities !== undefined && message.requiredClientCapabilities !== null && message.hasOwnProperty("requiredClientCapabilities"))
                        object.requiredClientCapabilities = message.requiredClientCapabilities;
                    return object;
                };

                RequirementProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                RequirementProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return RequirementProto;
            })();

            dbroot.LookAtProto = (function() {

                function LookAtProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                LookAtProto.prototype.longitude = 0;
                LookAtProto.prototype.latitude = 0;
                LookAtProto.prototype.range = 0;
                LookAtProto.prototype.tilt = 0;
                LookAtProto.prototype.heading = 0;

                LookAtProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.LookAtProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.longitude = reader.float();
                                break;
                            case 2:
                                message.latitude = reader.float();
                                break;
                            case 3:
                                message.range = reader.float();
                                break;
                            case 4:
                                message.tilt = reader.float();
                                break;
                            case 5:
                                message.heading = reader.float();
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                LookAtProto.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (typeof message.longitude !== "number")
                        return "longitude: number expected";
                    if (typeof message.latitude !== "number")
                        return "latitude: number expected";
                    if (message.range !== undefined)
                        if (typeof message.range !== "number")
                            return "range: number expected";
                    if (message.tilt !== undefined)
                        if (typeof message.tilt !== "number")
                            return "tilt: number expected";
                    if (message.heading !== undefined)
                        if (typeof message.heading !== "number")
                            return "heading: number expected";
                    return null;
                };

                LookAtProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.LookAtProto)
                        return object;
                    var message = new $root.keyhole.dbroot.LookAtProto();
                    if (object.longitude !== undefined && object.longitude !== null)
                        message.longitude = Number(object.longitude);
                    if (object.latitude !== undefined && object.latitude !== null)
                        message.latitude = Number(object.latitude);
                    if (object.range !== undefined && object.range !== null)
                        message.range = Number(object.range);
                    if (object.tilt !== undefined && object.tilt !== null)
                        message.tilt = Number(object.tilt);
                    if (object.heading !== undefined && object.heading !== null)
                        message.heading = Number(object.heading);
                    return message;
                };

                LookAtProto.from = LookAtProto.fromObject;

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
                    if (message.longitude !== undefined && message.longitude !== null && message.hasOwnProperty("longitude"))
                        object.longitude = message.longitude;
                    if (message.latitude !== undefined && message.latitude !== null && message.hasOwnProperty("latitude"))
                        object.latitude = message.latitude;
                    if (message.range !== undefined && message.range !== null && message.hasOwnProperty("range"))
                        object.range = message.range;
                    if (message.tilt !== undefined && message.tilt !== null && message.hasOwnProperty("tilt"))
                        object.tilt = message.tilt;
                    if (message.heading !== undefined && message.heading !== null && message.hasOwnProperty("heading"))
                        object.heading = message.heading;
                    return object;
                };

                LookAtProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                LookAtProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return LookAtProto;
            })();

            dbroot.NestedFeatureProto = (function() {

                function NestedFeatureProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
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

                var $types = {
                    0 : "keyhole.dbroot.NestedFeatureProto.FeatureType",
                    1 : "keyhole.dbroot.StringIdOrValueProto",
                    3 : "keyhole.dbroot.LayerProto",
                    4 : "keyhole.dbroot.FolderProto",
                    5 : "keyhole.dbroot.RequirementProto",
                    7 : "keyhole.dbroot.StringIdOrValueProto",
                    12 : "keyhole.dbroot.StringIdOrValueProto",
                    13 : "keyhole.dbroot.LookAtProto",
                    16 : "keyhole.dbroot.NestedFeatureProto"
                };
                $lazyTypes.push($types);

                NestedFeatureProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.NestedFeatureProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.featureType = reader.uint32();
                                break;
                            case 2:
                                message.kmlUrl = $types[1].decode(reader, reader.uint32());
                                break;
                            case 21:
                                message.databaseUrl = reader.string();
                                break;
                            case 3:
                                message.layer = $types[3].decode(reader, reader.uint32());
                                break;
                            case 4:
                                message.folder = $types[4].decode(reader, reader.uint32());
                                break;
                            case 5:
                                message.requirement = $types[5].decode(reader, reader.uint32());
                                break;
                            case 6:
                                message.channelId = reader.int32();
                                break;
                            case 7:
                                message.displayName = $types[7].decode(reader, reader.uint32());
                                break;
                            case 8:
                                message.isVisible = reader.bool();
                                break;
                            case 9:
                                message.isEnabled = reader.bool();
                                break;
                            case 10:
                                message.isChecked = reader.bool();
                                break;
                            case 11:
                                message.layerMenuIconPath = reader.string();
                                break;
                            case 12:
                                message.description = $types[12].decode(reader, reader.uint32());
                                break;
                            case 13:
                                message.lookAt = $types[13].decode(reader, reader.uint32());
                                break;
                            case 15:
                                message.assetUuid = reader.string();
                                break;
                            case 16:
                                message.isSaveLocked = reader.bool();
                                break;
                            case 17:
                                if (!(message.children && message.children.length))
                                    message.children = [];
                                message.children.push($types[16].decode(reader, reader.uint32()));
                                break;
                            case 18:
                                message.clientConfigScriptName = reader.string();
                                break;
                            case 19:
                                message.dioramaDataChannelBase = reader.int32();
                                break;
                            case 20:
                                message.replicaDataChannelBase = reader.int32();
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                NestedFeatureProto.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.featureType !== undefined)
                        switch (message.featureType) {
                            default:
                                return "featureType: enum value expected";
                            case 1:
                            case 2:
                            case 3:
                            case 4:
                                break;
                        }
                    if (message.kmlUrl !== undefined && message.kmlUrl !== null) {
                        var error = $types[1].verify(message.kmlUrl);
                        if (error)
                            return "kmlUrl." + error;
                    }
                    if (message.databaseUrl !== undefined)
                        if (!$util.isString(message.databaseUrl))
                            return "databaseUrl: string expected";
                    if (message.layer !== undefined && message.layer !== null) {
                        var error = $types[3].verify(message.layer);
                        if (error)
                            return "layer." + error;
                    }
                    if (message.folder !== undefined && message.folder !== null) {
                        var error = $types[4].verify(message.folder);
                        if (error)
                            return "folder." + error;
                    }
                    if (message.requirement !== undefined && message.requirement !== null) {
                        var error = $types[5].verify(message.requirement);
                        if (error)
                            return "requirement." + error;
                    }
                    if (!$util.isInteger(message.channelId))
                        return "channelId: integer expected";
                    if (message.displayName !== undefined && message.displayName !== null) {
                        var error = $types[7].verify(message.displayName);
                        if (error)
                            return "displayName." + error;
                    }
                    if (message.isVisible !== undefined)
                        if (typeof message.isVisible !== "boolean")
                            return "isVisible: boolean expected";
                    if (message.isEnabled !== undefined)
                        if (typeof message.isEnabled !== "boolean")
                            return "isEnabled: boolean expected";
                    if (message.isChecked !== undefined)
                        if (typeof message.isChecked !== "boolean")
                            return "isChecked: boolean expected";
                    if (message.layerMenuIconPath !== undefined)
                        if (!$util.isString(message.layerMenuIconPath))
                            return "layerMenuIconPath: string expected";
                    if (message.description !== undefined && message.description !== null) {
                        var error = $types[12].verify(message.description);
                        if (error)
                            return "description." + error;
                    }
                    if (message.lookAt !== undefined && message.lookAt !== null) {
                        var error = $types[13].verify(message.lookAt);
                        if (error)
                            return "lookAt." + error;
                    }
                    if (message.assetUuid !== undefined)
                        if (!$util.isString(message.assetUuid))
                            return "assetUuid: string expected";
                    if (message.isSaveLocked !== undefined)
                        if (typeof message.isSaveLocked !== "boolean")
                            return "isSaveLocked: boolean expected";
                    if (message.children !== undefined) {
                        if (!Array.isArray(message.children))
                            return "children: array expected";
                        for (var i = 0; i < message.children.length; ++i) {
                            var error = $types[16].verify(message.children[i]);
                            if (error)
                                return "children." + error;
                        }
                    }
                    if (message.clientConfigScriptName !== undefined)
                        if (!$util.isString(message.clientConfigScriptName))
                            return "clientConfigScriptName: string expected";
                    if (message.dioramaDataChannelBase !== undefined)
                        if (!$util.isInteger(message.dioramaDataChannelBase))
                            return "dioramaDataChannelBase: integer expected";
                    if (message.replicaDataChannelBase !== undefined)
                        if (!$util.isInteger(message.replicaDataChannelBase))
                            return "replicaDataChannelBase: integer expected";
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
                    if (object.kmlUrl !== undefined && object.kmlUrl !== null) {
                        if (typeof object.kmlUrl !== "object")
                            throw TypeError(".keyhole.dbroot.NestedFeatureProto.kmlUrl: object expected");
                        message.kmlUrl = $types[1].fromObject(object.kmlUrl);
                    }
                    if (object.databaseUrl !== undefined && object.databaseUrl !== null)
                        message.databaseUrl = String(object.databaseUrl);
                    if (object.layer !== undefined && object.layer !== null) {
                        if (typeof object.layer !== "object")
                            throw TypeError(".keyhole.dbroot.NestedFeatureProto.layer: object expected");
                        message.layer = $types[3].fromObject(object.layer);
                    }
                    if (object.folder !== undefined && object.folder !== null) {
                        if (typeof object.folder !== "object")
                            throw TypeError(".keyhole.dbroot.NestedFeatureProto.folder: object expected");
                        message.folder = $types[4].fromObject(object.folder);
                    }
                    if (object.requirement !== undefined && object.requirement !== null) {
                        if (typeof object.requirement !== "object")
                            throw TypeError(".keyhole.dbroot.NestedFeatureProto.requirement: object expected");
                        message.requirement = $types[5].fromObject(object.requirement);
                    }
                    if (object.channelId !== undefined && object.channelId !== null)
                        message.channelId = object.channelId | 0;
                    if (object.displayName !== undefined && object.displayName !== null) {
                        if (typeof object.displayName !== "object")
                            throw TypeError(".keyhole.dbroot.NestedFeatureProto.displayName: object expected");
                        message.displayName = $types[7].fromObject(object.displayName);
                    }
                    if (object.isVisible !== undefined && object.isVisible !== null)
                        message.isVisible = Boolean(object.isVisible);
                    if (object.isEnabled !== undefined && object.isEnabled !== null)
                        message.isEnabled = Boolean(object.isEnabled);
                    if (object.isChecked !== undefined && object.isChecked !== null)
                        message.isChecked = Boolean(object.isChecked);
                    if (object.layerMenuIconPath !== undefined && object.layerMenuIconPath !== null)
                        message.layerMenuIconPath = String(object.layerMenuIconPath);
                    if (object.description !== undefined && object.description !== null) {
                        if (typeof object.description !== "object")
                            throw TypeError(".keyhole.dbroot.NestedFeatureProto.description: object expected");
                        message.description = $types[12].fromObject(object.description);
                    }
                    if (object.lookAt !== undefined && object.lookAt !== null) {
                        if (typeof object.lookAt !== "object")
                            throw TypeError(".keyhole.dbroot.NestedFeatureProto.lookAt: object expected");
                        message.lookAt = $types[13].fromObject(object.lookAt);
                    }
                    if (object.assetUuid !== undefined && object.assetUuid !== null)
                        message.assetUuid = String(object.assetUuid);
                    if (object.isSaveLocked !== undefined && object.isSaveLocked !== null)
                        message.isSaveLocked = Boolean(object.isSaveLocked);
                    if (object.children) {
                        if (!Array.isArray(object.children))
                            throw TypeError(".keyhole.dbroot.NestedFeatureProto.children: array expected");
                        message.children = [];
                        for (var i = 0; i < object.children.length; ++i) {
                            if (typeof object.children[i] !== "object")
                                throw TypeError(".keyhole.dbroot.NestedFeatureProto.children: object expected");
                            message.children[i] = $types[16].fromObject(object.children[i]);
                        }
                    }
                    if (object.clientConfigScriptName !== undefined && object.clientConfigScriptName !== null)
                        message.clientConfigScriptName = String(object.clientConfigScriptName);
                    if (object.dioramaDataChannelBase !== undefined && object.dioramaDataChannelBase !== null)
                        message.dioramaDataChannelBase = object.dioramaDataChannelBase | 0;
                    if (object.replicaDataChannelBase !== undefined && object.replicaDataChannelBase !== null)
                        message.replicaDataChannelBase = object.replicaDataChannelBase | 0;
                    return message;
                };

                NestedFeatureProto.from = NestedFeatureProto.fromObject;

                NestedFeatureProto.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.arrays || options.defaults)
                        object.children = [];
                    if (options.defaults) {
                        object.featureType = options.enums === String ? "TYPE_POINT_Z" : 1;
                        object.kmlUrl = null;
                        object.databaseUrl = "";
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
                    }
                    if (message.featureType !== undefined && message.featureType !== null && message.hasOwnProperty("featureType"))
                        object.featureType = options.enums === String ? $types[0][message.featureType] : message.featureType;
                    if (message.kmlUrl !== undefined && message.kmlUrl !== null && message.hasOwnProperty("kmlUrl"))
                        object.kmlUrl = $types[1].toObject(message.kmlUrl, options);
                    if (message.databaseUrl !== undefined && message.databaseUrl !== null && message.hasOwnProperty("databaseUrl"))
                        object.databaseUrl = message.databaseUrl;
                    if (message.layer !== undefined && message.layer !== null && message.hasOwnProperty("layer"))
                        object.layer = $types[3].toObject(message.layer, options);
                    if (message.folder !== undefined && message.folder !== null && message.hasOwnProperty("folder"))
                        object.folder = $types[4].toObject(message.folder, options);
                    if (message.requirement !== undefined && message.requirement !== null && message.hasOwnProperty("requirement"))
                        object.requirement = $types[5].toObject(message.requirement, options);
                    if (message.channelId !== undefined && message.channelId !== null && message.hasOwnProperty("channelId"))
                        object.channelId = message.channelId;
                    if (message.displayName !== undefined && message.displayName !== null && message.hasOwnProperty("displayName"))
                        object.displayName = $types[7].toObject(message.displayName, options);
                    if (message.isVisible !== undefined && message.isVisible !== null && message.hasOwnProperty("isVisible"))
                        object.isVisible = message.isVisible;
                    if (message.isEnabled !== undefined && message.isEnabled !== null && message.hasOwnProperty("isEnabled"))
                        object.isEnabled = message.isEnabled;
                    if (message.isChecked !== undefined && message.isChecked !== null && message.hasOwnProperty("isChecked"))
                        object.isChecked = message.isChecked;
                    if (message.layerMenuIconPath !== undefined && message.layerMenuIconPath !== null && message.hasOwnProperty("layerMenuIconPath"))
                        object.layerMenuIconPath = message.layerMenuIconPath;
                    if (message.description !== undefined && message.description !== null && message.hasOwnProperty("description"))
                        object.description = $types[12].toObject(message.description, options);
                    if (message.lookAt !== undefined && message.lookAt !== null && message.hasOwnProperty("lookAt"))
                        object.lookAt = $types[13].toObject(message.lookAt, options);
                    if (message.assetUuid !== undefined && message.assetUuid !== null && message.hasOwnProperty("assetUuid"))
                        object.assetUuid = message.assetUuid;
                    if (message.isSaveLocked !== undefined && message.isSaveLocked !== null && message.hasOwnProperty("isSaveLocked"))
                        object.isSaveLocked = message.isSaveLocked;
                    if (message.children !== undefined && message.children !== null && message.hasOwnProperty("children")) {
                        object.children = [];
                        for (var j = 0; j < message.children.length; ++j)
                            object.children[j] = $types[16].toObject(message.children[j], options);
                    }
                    if (message.clientConfigScriptName !== undefined && message.clientConfigScriptName !== null && message.hasOwnProperty("clientConfigScriptName"))
                        object.clientConfigScriptName = message.clientConfigScriptName;
                    if (message.dioramaDataChannelBase !== undefined && message.dioramaDataChannelBase !== null && message.hasOwnProperty("dioramaDataChannelBase"))
                        object.dioramaDataChannelBase = message.dioramaDataChannelBase;
                    if (message.replicaDataChannelBase !== undefined && message.replicaDataChannelBase !== null && message.hasOwnProperty("replicaDataChannelBase"))
                        object.replicaDataChannelBase = message.replicaDataChannelBase;
                    return object;
                };

                NestedFeatureProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                NestedFeatureProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                NestedFeatureProto.FeatureType = (function() {
                    var valuesById = {}, values = Object.create(valuesById);
                    values["TYPE_POINT_Z"] = 1;
                    values["TYPE_POLYGON_Z"] = 2;
                    values["TYPE_LINE_Z"] = 3;
                    values["TYPE_TERRAIN"] = 4;
                    return values;
                })();

                return NestedFeatureProto;
            })();

            dbroot.MfeDomainFeaturesProto = (function() {

                function MfeDomainFeaturesProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                MfeDomainFeaturesProto.prototype.countryCode = "";
                MfeDomainFeaturesProto.prototype.domainName = "";
                MfeDomainFeaturesProto.prototype.supportedFeatures = $util.emptyArray;

                var $types = {
                    2 : "keyhole.dbroot.MfeDomainFeaturesProto.SupportedFeature"
                };
                $lazyTypes.push($types);

                MfeDomainFeaturesProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.MfeDomainFeaturesProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.countryCode = reader.string();
                                break;
                            case 2:
                                message.domainName = reader.string();
                                break;
                            case 3:
                                if (!(message.supportedFeatures && message.supportedFeatures.length))
                                    message.supportedFeatures = [];
                                if ((tag & 7) === 2) {
                                    var end2 = reader.uint32() + reader.pos;
                                    while (reader.pos < end2)
                                        message.supportedFeatures.push(reader.uint32());
                                } else
                                    message.supportedFeatures.push(reader.uint32());
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                MfeDomainFeaturesProto.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (!$util.isString(message.countryCode))
                        return "countryCode: string expected";
                    if (!$util.isString(message.domainName))
                        return "domainName: string expected";
                    if (message.supportedFeatures !== undefined) {
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
                    if (object.countryCode !== undefined && object.countryCode !== null)
                        message.countryCode = String(object.countryCode);
                    if (object.domainName !== undefined && object.domainName !== null)
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

                MfeDomainFeaturesProto.from = MfeDomainFeaturesProto.fromObject;

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
                    if (message.countryCode !== undefined && message.countryCode !== null && message.hasOwnProperty("countryCode"))
                        object.countryCode = message.countryCode;
                    if (message.domainName !== undefined && message.domainName !== null && message.hasOwnProperty("domainName"))
                        object.domainName = message.domainName;
                    if (message.supportedFeatures !== undefined && message.supportedFeatures !== null && message.hasOwnProperty("supportedFeatures")) {
                        object.supportedFeatures = [];
                        for (var j = 0; j < message.supportedFeatures.length; ++j)
                            object.supportedFeatures[j] = options.enums === String ? $types[2][message.supportedFeatures[j]] : message.supportedFeatures[j];
                    }
                    return object;
                };

                MfeDomainFeaturesProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                MfeDomainFeaturesProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                MfeDomainFeaturesProto.SupportedFeature = (function() {
                    var valuesById = {}, values = Object.create(valuesById);
                    values["GEOCODING"] = 0;
                    values["LOCAL_SEARCH"] = 1;
                    values["DRIVING_DIRECTIONS"] = 2;
                    return values;
                })();

                return MfeDomainFeaturesProto;
            })();

            dbroot.ClientOptionsProto = (function() {

                function ClientOptionsProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
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

                var $types = {
                    7 : "keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions",
                    8 : "keyhole.dbroot.ClientOptionsProto.CaptureOptions",
                    15 : "keyhole.dbroot.ClientOptionsProto.MapsOptions"
                };
                $lazyTypes.push($types);

                ClientOptionsProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.ClientOptionsProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.disableDiskCache = reader.bool();
                                break;
                            case 2:
                                message.disableEmbeddedBrowserVista = reader.bool();
                                break;
                            case 3:
                                message.drawAtmosphere = reader.bool();
                                break;
                            case 4:
                                message.drawStars = reader.bool();
                                break;
                            case 5:
                                message.shaderFilePrefix = reader.string();
                                break;
                            case 6:
                                message.useProtobufQuadtreePackets = reader.bool();
                                break;
                            case 7:
                                message.useExtendedCopyrightIds = reader.bool();
                                break;
                            case 8:
                                message.precipitationsOptions = $types[7].decode(reader, reader.uint32());
                                break;
                            case 9:
                                message.captureOptions = $types[8].decode(reader, reader.uint32());
                                break;
                            case 10:
                                message.show_2dMapsIcon = reader.bool();
                                break;
                            case 11:
                                message.disableInternalBrowser = reader.bool();
                                break;
                            case 12:
                                message.internalBrowserBlacklist = reader.string();
                                break;
                            case 13:
                                message.internalBrowserOriginWhitelist = reader.string();
                                break;
                            case 14:
                                message.polarTileMergingLevel = reader.int32();
                                break;
                            case 15:
                                message.jsBridgeRequestWhitelist = reader.string();
                                break;
                            case 16:
                                message.mapsOptions = $types[15].decode(reader, reader.uint32());
                                break;
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
                    if (message.disableDiskCache !== undefined)
                        if (typeof message.disableDiskCache !== "boolean")
                            return "disableDiskCache: boolean expected";
                    if (message.disableEmbeddedBrowserVista !== undefined)
                        if (typeof message.disableEmbeddedBrowserVista !== "boolean")
                            return "disableEmbeddedBrowserVista: boolean expected";
                    if (message.drawAtmosphere !== undefined)
                        if (typeof message.drawAtmosphere !== "boolean")
                            return "drawAtmosphere: boolean expected";
                    if (message.drawStars !== undefined)
                        if (typeof message.drawStars !== "boolean")
                            return "drawStars: boolean expected";
                    if (message.shaderFilePrefix !== undefined)
                        if (!$util.isString(message.shaderFilePrefix))
                            return "shaderFilePrefix: string expected";
                    if (message.useProtobufQuadtreePackets !== undefined)
                        if (typeof message.useProtobufQuadtreePackets !== "boolean")
                            return "useProtobufQuadtreePackets: boolean expected";
                    if (message.useExtendedCopyrightIds !== undefined)
                        if (typeof message.useExtendedCopyrightIds !== "boolean")
                            return "useExtendedCopyrightIds: boolean expected";
                    if (message.precipitationsOptions !== undefined && message.precipitationsOptions !== null) {
                        var error = $types[7].verify(message.precipitationsOptions);
                        if (error)
                            return "precipitationsOptions." + error;
                    }
                    if (message.captureOptions !== undefined && message.captureOptions !== null) {
                        var error = $types[8].verify(message.captureOptions);
                        if (error)
                            return "captureOptions." + error;
                    }
                    if (message.show_2dMapsIcon !== undefined)
                        if (typeof message.show_2dMapsIcon !== "boolean")
                            return "show_2dMapsIcon: boolean expected";
                    if (message.disableInternalBrowser !== undefined)
                        if (typeof message.disableInternalBrowser !== "boolean")
                            return "disableInternalBrowser: boolean expected";
                    if (message.internalBrowserBlacklist !== undefined)
                        if (!$util.isString(message.internalBrowserBlacklist))
                            return "internalBrowserBlacklist: string expected";
                    if (message.internalBrowserOriginWhitelist !== undefined)
                        if (!$util.isString(message.internalBrowserOriginWhitelist))
                            return "internalBrowserOriginWhitelist: string expected";
                    if (message.polarTileMergingLevel !== undefined)
                        if (!$util.isInteger(message.polarTileMergingLevel))
                            return "polarTileMergingLevel: integer expected";
                    if (message.jsBridgeRequestWhitelist !== undefined)
                        if (!$util.isString(message.jsBridgeRequestWhitelist))
                            return "jsBridgeRequestWhitelist: string expected";
                    if (message.mapsOptions !== undefined && message.mapsOptions !== null) {
                        var error = $types[15].verify(message.mapsOptions);
                        if (error)
                            return "mapsOptions." + error;
                    }
                    return null;
                };

                ClientOptionsProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.ClientOptionsProto)
                        return object;
                    var message = new $root.keyhole.dbroot.ClientOptionsProto();
                    if (object.disableDiskCache !== undefined && object.disableDiskCache !== null)
                        message.disableDiskCache = Boolean(object.disableDiskCache);
                    if (object.disableEmbeddedBrowserVista !== undefined && object.disableEmbeddedBrowserVista !== null)
                        message.disableEmbeddedBrowserVista = Boolean(object.disableEmbeddedBrowserVista);
                    if (object.drawAtmosphere !== undefined && object.drawAtmosphere !== null)
                        message.drawAtmosphere = Boolean(object.drawAtmosphere);
                    if (object.drawStars !== undefined && object.drawStars !== null)
                        message.drawStars = Boolean(object.drawStars);
                    if (object.shaderFilePrefix !== undefined && object.shaderFilePrefix !== null)
                        message.shaderFilePrefix = String(object.shaderFilePrefix);
                    if (object.useProtobufQuadtreePackets !== undefined && object.useProtobufQuadtreePackets !== null)
                        message.useProtobufQuadtreePackets = Boolean(object.useProtobufQuadtreePackets);
                    if (object.useExtendedCopyrightIds !== undefined && object.useExtendedCopyrightIds !== null)
                        message.useExtendedCopyrightIds = Boolean(object.useExtendedCopyrightIds);
                    if (object.precipitationsOptions !== undefined && object.precipitationsOptions !== null) {
                        if (typeof object.precipitationsOptions !== "object")
                            throw TypeError(".keyhole.dbroot.ClientOptionsProto.precipitationsOptions: object expected");
                        message.precipitationsOptions = $types[7].fromObject(object.precipitationsOptions);
                    }
                    if (object.captureOptions !== undefined && object.captureOptions !== null) {
                        if (typeof object.captureOptions !== "object")
                            throw TypeError(".keyhole.dbroot.ClientOptionsProto.captureOptions: object expected");
                        message.captureOptions = $types[8].fromObject(object.captureOptions);
                    }
                    if (object.show_2dMapsIcon !== undefined && object.show_2dMapsIcon !== null)
                        message.show_2dMapsIcon = Boolean(object.show_2dMapsIcon);
                    if (object.disableInternalBrowser !== undefined && object.disableInternalBrowser !== null)
                        message.disableInternalBrowser = Boolean(object.disableInternalBrowser);
                    if (object.internalBrowserBlacklist !== undefined && object.internalBrowserBlacklist !== null)
                        message.internalBrowserBlacklist = String(object.internalBrowserBlacklist);
                    if (object.internalBrowserOriginWhitelist !== undefined && object.internalBrowserOriginWhitelist !== null)
                        message.internalBrowserOriginWhitelist = String(object.internalBrowserOriginWhitelist);
                    if (object.polarTileMergingLevel !== undefined && object.polarTileMergingLevel !== null)
                        message.polarTileMergingLevel = object.polarTileMergingLevel | 0;
                    if (object.jsBridgeRequestWhitelist !== undefined && object.jsBridgeRequestWhitelist !== null)
                        message.jsBridgeRequestWhitelist = String(object.jsBridgeRequestWhitelist);
                    if (object.mapsOptions !== undefined && object.mapsOptions !== null) {
                        if (typeof object.mapsOptions !== "object")
                            throw TypeError(".keyhole.dbroot.ClientOptionsProto.mapsOptions: object expected");
                        message.mapsOptions = $types[15].fromObject(object.mapsOptions);
                    }
                    return message;
                };

                ClientOptionsProto.from = ClientOptionsProto.fromObject;

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
                    if (message.disableDiskCache !== undefined && message.disableDiskCache !== null && message.hasOwnProperty("disableDiskCache"))
                        object.disableDiskCache = message.disableDiskCache;
                    if (message.disableEmbeddedBrowserVista !== undefined && message.disableEmbeddedBrowserVista !== null && message.hasOwnProperty("disableEmbeddedBrowserVista"))
                        object.disableEmbeddedBrowserVista = message.disableEmbeddedBrowserVista;
                    if (message.drawAtmosphere !== undefined && message.drawAtmosphere !== null && message.hasOwnProperty("drawAtmosphere"))
                        object.drawAtmosphere = message.drawAtmosphere;
                    if (message.drawStars !== undefined && message.drawStars !== null && message.hasOwnProperty("drawStars"))
                        object.drawStars = message.drawStars;
                    if (message.shaderFilePrefix !== undefined && message.shaderFilePrefix !== null && message.hasOwnProperty("shaderFilePrefix"))
                        object.shaderFilePrefix = message.shaderFilePrefix;
                    if (message.useProtobufQuadtreePackets !== undefined && message.useProtobufQuadtreePackets !== null && message.hasOwnProperty("useProtobufQuadtreePackets"))
                        object.useProtobufQuadtreePackets = message.useProtobufQuadtreePackets;
                    if (message.useExtendedCopyrightIds !== undefined && message.useExtendedCopyrightIds !== null && message.hasOwnProperty("useExtendedCopyrightIds"))
                        object.useExtendedCopyrightIds = message.useExtendedCopyrightIds;
                    if (message.precipitationsOptions !== undefined && message.precipitationsOptions !== null && message.hasOwnProperty("precipitationsOptions"))
                        object.precipitationsOptions = $types[7].toObject(message.precipitationsOptions, options);
                    if (message.captureOptions !== undefined && message.captureOptions !== null && message.hasOwnProperty("captureOptions"))
                        object.captureOptions = $types[8].toObject(message.captureOptions, options);
                    if (message.show_2dMapsIcon !== undefined && message.show_2dMapsIcon !== null && message.hasOwnProperty("show_2dMapsIcon"))
                        object.show_2dMapsIcon = message.show_2dMapsIcon;
                    if (message.disableInternalBrowser !== undefined && message.disableInternalBrowser !== null && message.hasOwnProperty("disableInternalBrowser"))
                        object.disableInternalBrowser = message.disableInternalBrowser;
                    if (message.internalBrowserBlacklist !== undefined && message.internalBrowserBlacklist !== null && message.hasOwnProperty("internalBrowserBlacklist"))
                        object.internalBrowserBlacklist = message.internalBrowserBlacklist;
                    if (message.internalBrowserOriginWhitelist !== undefined && message.internalBrowserOriginWhitelist !== null && message.hasOwnProperty("internalBrowserOriginWhitelist"))
                        object.internalBrowserOriginWhitelist = message.internalBrowserOriginWhitelist;
                    if (message.polarTileMergingLevel !== undefined && message.polarTileMergingLevel !== null && message.hasOwnProperty("polarTileMergingLevel"))
                        object.polarTileMergingLevel = message.polarTileMergingLevel;
                    if (message.jsBridgeRequestWhitelist !== undefined && message.jsBridgeRequestWhitelist !== null && message.hasOwnProperty("jsBridgeRequestWhitelist"))
                        object.jsBridgeRequestWhitelist = message.jsBridgeRequestWhitelist;
                    if (message.mapsOptions !== undefined && message.mapsOptions !== null && message.hasOwnProperty("mapsOptions"))
                        object.mapsOptions = $types[15].toObject(message.mapsOptions, options);
                    return object;
                };

                ClientOptionsProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                ClientOptionsProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                ClientOptionsProto.PrecipitationsOptions = (function() {

                    function PrecipitationsOptions(properties) {
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                this[keys[i]] = properties[keys[i]];
                    }

                    PrecipitationsOptions.prototype.imageUrl = "";
                    PrecipitationsOptions.prototype.imageExpireTime = 900;
                    PrecipitationsOptions.prototype.maxColorDistance = 20;
                    PrecipitationsOptions.prototype.imageLevel = 5;
                    PrecipitationsOptions.prototype.weatherMapping = $util.emptyArray;
                    PrecipitationsOptions.prototype.cloudsLayerUrl = "";
                    PrecipitationsOptions.prototype.animationDecelerationDelay = 20;

                    var $types = {
                        4 : "keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.WeatherMapping"
                    };
                    $lazyTypes.push($types);

                    PrecipitationsOptions.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length,
                            message = new $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1:
                                    message.imageUrl = reader.string();
                                    break;
                                case 2:
                                    message.imageExpireTime = reader.int32();
                                    break;
                                case 3:
                                    message.maxColorDistance = reader.int32();
                                    break;
                                case 4:
                                    message.imageLevel = reader.int32();
                                    break;
                                case 5:
                                    if (!(message.weatherMapping && message.weatherMapping.length))
                                        message.weatherMapping = [];
                                    message.weatherMapping.push($types[4].decode(reader, reader.uint32()));
                                    break;
                                case 6:
                                    message.cloudsLayerUrl = reader.string();
                                    break;
                                case 7:
                                    message.animationDecelerationDelay = reader.float();
                                    break;
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
                        if (message.imageUrl !== undefined)
                            if (!$util.isString(message.imageUrl))
                                return "imageUrl: string expected";
                        if (message.imageExpireTime !== undefined)
                            if (!$util.isInteger(message.imageExpireTime))
                                return "imageExpireTime: integer expected";
                        if (message.maxColorDistance !== undefined)
                            if (!$util.isInteger(message.maxColorDistance))
                                return "maxColorDistance: integer expected";
                        if (message.imageLevel !== undefined)
                            if (!$util.isInteger(message.imageLevel))
                                return "imageLevel: integer expected";
                        if (message.weatherMapping !== undefined) {
                            if (!Array.isArray(message.weatherMapping))
                                return "weatherMapping: array expected";
                            for (var i = 0; i < message.weatherMapping.length; ++i) {
                                var error = $types[4].verify(message.weatherMapping[i]);
                                if (error)
                                    return "weatherMapping." + error;
                            }
                        }
                        if (message.cloudsLayerUrl !== undefined)
                            if (!$util.isString(message.cloudsLayerUrl))
                                return "cloudsLayerUrl: string expected";
                        if (message.animationDecelerationDelay !== undefined)
                            if (typeof message.animationDecelerationDelay !== "number")
                                return "animationDecelerationDelay: number expected";
                        return null;
                    };

                    PrecipitationsOptions.fromObject = function fromObject(object) {
                        if (object instanceof $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions)
                            return object;
                        var message = new $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions();
                        if (object.imageUrl !== undefined && object.imageUrl !== null)
                            message.imageUrl = String(object.imageUrl);
                        if (object.imageExpireTime !== undefined && object.imageExpireTime !== null)
                            message.imageExpireTime = object.imageExpireTime | 0;
                        if (object.maxColorDistance !== undefined && object.maxColorDistance !== null)
                            message.maxColorDistance = object.maxColorDistance | 0;
                        if (object.imageLevel !== undefined && object.imageLevel !== null)
                            message.imageLevel = object.imageLevel | 0;
                        if (object.weatherMapping) {
                            if (!Array.isArray(object.weatherMapping))
                                throw TypeError(".keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.weatherMapping: array expected");
                            message.weatherMapping = [];
                            for (var i = 0; i < object.weatherMapping.length; ++i) {
                                if (typeof object.weatherMapping[i] !== "object")
                                    throw TypeError(".keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.weatherMapping: object expected");
                                message.weatherMapping[i] = $types[4].fromObject(object.weatherMapping[i]);
                            }
                        }
                        if (object.cloudsLayerUrl !== undefined && object.cloudsLayerUrl !== null)
                            message.cloudsLayerUrl = String(object.cloudsLayerUrl);
                        if (object.animationDecelerationDelay !== undefined && object.animationDecelerationDelay !== null)
                            message.animationDecelerationDelay = Number(object.animationDecelerationDelay);
                        return message;
                    };

                    PrecipitationsOptions.from = PrecipitationsOptions.fromObject;

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
                        if (message.imageUrl !== undefined && message.imageUrl !== null && message.hasOwnProperty("imageUrl"))
                            object.imageUrl = message.imageUrl;
                        if (message.imageExpireTime !== undefined && message.imageExpireTime !== null && message.hasOwnProperty("imageExpireTime"))
                            object.imageExpireTime = message.imageExpireTime;
                        if (message.maxColorDistance !== undefined && message.maxColorDistance !== null && message.hasOwnProperty("maxColorDistance"))
                            object.maxColorDistance = message.maxColorDistance;
                        if (message.imageLevel !== undefined && message.imageLevel !== null && message.hasOwnProperty("imageLevel"))
                            object.imageLevel = message.imageLevel;
                        if (message.weatherMapping !== undefined && message.weatherMapping !== null && message.hasOwnProperty("weatherMapping")) {
                            object.weatherMapping = [];
                            for (var j = 0; j < message.weatherMapping.length; ++j)
                                object.weatherMapping[j] = $types[4].toObject(message.weatherMapping[j], options);
                        }
                        if (message.cloudsLayerUrl !== undefined && message.cloudsLayerUrl !== null && message.hasOwnProperty("cloudsLayerUrl"))
                            object.cloudsLayerUrl = message.cloudsLayerUrl;
                        if (message.animationDecelerationDelay !== undefined && message.animationDecelerationDelay !== null && message.hasOwnProperty("animationDecelerationDelay"))
                            object.animationDecelerationDelay = message.animationDecelerationDelay;
                        return object;
                    };

                    PrecipitationsOptions.prototype.toObject = function toObject(options) {
                        return this.constructor.toObject(this, options);
                    };

                    PrecipitationsOptions.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };

                    PrecipitationsOptions.WeatherMapping = (function() {

                        function WeatherMapping(properties) {
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    this[keys[i]] = properties[keys[i]];
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

                        var $types = {
                            1 : "keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.WeatherMapping.WeatherType"
                        };
                        $lazyTypes.push($types);

                        WeatherMapping.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length,
                                message = new $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.WeatherMapping();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                    case 1:
                                        message.colorAbgr = reader.uint32();
                                        break;
                                    case 2:
                                        message.weatherType = reader.uint32();
                                        break;
                                    case 3:
                                        message.elongation = reader.float();
                                        break;
                                    case 4:
                                        message.opacity = reader.float();
                                        break;
                                    case 5:
                                        message.fogDensity = reader.float();
                                        break;
                                    case 6:
                                        message.speed0 = reader.float();
                                        break;
                                    case 7:
                                        message.speed1 = reader.float();
                                        break;
                                    case 8:
                                        message.speed2 = reader.float();
                                        break;
                                    case 9:
                                        message.speed3 = reader.float();
                                        break;
                                    default:
                                        reader.skipType(tag & 7);
                                        break;
                                }
                            }
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
                            if (message.elongation !== undefined)
                                if (typeof message.elongation !== "number")
                                    return "elongation: number expected";
                            if (message.opacity !== undefined)
                                if (typeof message.opacity !== "number")
                                    return "opacity: number expected";
                            if (message.fogDensity !== undefined)
                                if (typeof message.fogDensity !== "number")
                                    return "fogDensity: number expected";
                            if (message.speed0 !== undefined)
                                if (typeof message.speed0 !== "number")
                                    return "speed0: number expected";
                            if (message.speed1 !== undefined)
                                if (typeof message.speed1 !== "number")
                                    return "speed1: number expected";
                            if (message.speed2 !== undefined)
                                if (typeof message.speed2 !== "number")
                                    return "speed2: number expected";
                            if (message.speed3 !== undefined)
                                if (typeof message.speed3 !== "number")
                                    return "speed3: number expected";
                            return null;
                        };

                        WeatherMapping.fromObject = function fromObject(object) {
                            if (object instanceof $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.WeatherMapping)
                                return object;
                            var message = new $root.keyhole.dbroot.ClientOptionsProto.PrecipitationsOptions.WeatherMapping();
                            if (object.colorAbgr !== undefined && object.colorAbgr !== null)
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
                            if (object.elongation !== undefined && object.elongation !== null)
                                message.elongation = Number(object.elongation);
                            if (object.opacity !== undefined && object.opacity !== null)
                                message.opacity = Number(object.opacity);
                            if (object.fogDensity !== undefined && object.fogDensity !== null)
                                message.fogDensity = Number(object.fogDensity);
                            if (object.speed0 !== undefined && object.speed0 !== null)
                                message.speed0 = Number(object.speed0);
                            if (object.speed1 !== undefined && object.speed1 !== null)
                                message.speed1 = Number(object.speed1);
                            if (object.speed2 !== undefined && object.speed2 !== null)
                                message.speed2 = Number(object.speed2);
                            if (object.speed3 !== undefined && object.speed3 !== null)
                                message.speed3 = Number(object.speed3);
                            return message;
                        };

                        WeatherMapping.from = WeatherMapping.fromObject;

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
                            if (message.colorAbgr !== undefined && message.colorAbgr !== null && message.hasOwnProperty("colorAbgr"))
                                object.colorAbgr = message.colorAbgr;
                            if (message.weatherType !== undefined && message.weatherType !== null && message.hasOwnProperty("weatherType"))
                                object.weatherType = options.enums === String ? $types[1][message.weatherType] : message.weatherType;
                            if (message.elongation !== undefined && message.elongation !== null && message.hasOwnProperty("elongation"))
                                object.elongation = message.elongation;
                            if (message.opacity !== undefined && message.opacity !== null && message.hasOwnProperty("opacity"))
                                object.opacity = message.opacity;
                            if (message.fogDensity !== undefined && message.fogDensity !== null && message.hasOwnProperty("fogDensity"))
                                object.fogDensity = message.fogDensity;
                            if (message.speed0 !== undefined && message.speed0 !== null && message.hasOwnProperty("speed0"))
                                object.speed0 = message.speed0;
                            if (message.speed1 !== undefined && message.speed1 !== null && message.hasOwnProperty("speed1"))
                                object.speed1 = message.speed1;
                            if (message.speed2 !== undefined && message.speed2 !== null && message.hasOwnProperty("speed2"))
                                object.speed2 = message.speed2;
                            if (message.speed3 !== undefined && message.speed3 !== null && message.hasOwnProperty("speed3"))
                                object.speed3 = message.speed3;
                            return object;
                        };

                        WeatherMapping.prototype.toObject = function toObject(options) {
                            return this.constructor.toObject(this, options);
                        };

                        WeatherMapping.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };

                        WeatherMapping.WeatherType = (function() {
                            var valuesById = {}, values = Object.create(valuesById);
                            values["NO_PRECIPITATION"] = 0;
                            values["RAIN"] = 1;
                            values["SNOW"] = 2;
                            return values;
                        })();

                        return WeatherMapping;
                    })();

                    return PrecipitationsOptions;
                })();

                ClientOptionsProto.CaptureOptions = (function() {

                    function CaptureOptions(properties) {
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                this[keys[i]] = properties[keys[i]];
                    }

                    CaptureOptions.prototype.allowSaveAsImage = true;
                    CaptureOptions.prototype.maxFreeCaptureRes = 2400;
                    CaptureOptions.prototype.maxPremiumCaptureRes = 4800;

                    CaptureOptions.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length,
                            message = new $root.keyhole.dbroot.ClientOptionsProto.CaptureOptions();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1:
                                    message.allowSaveAsImage = reader.bool();
                                    break;
                                case 2:
                                    message.maxFreeCaptureRes = reader.int32();
                                    break;
                                case 3:
                                    message.maxPremiumCaptureRes = reader.int32();
                                    break;
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
                        if (message.allowSaveAsImage !== undefined)
                            if (typeof message.allowSaveAsImage !== "boolean")
                                return "allowSaveAsImage: boolean expected";
                        if (message.maxFreeCaptureRes !== undefined)
                            if (!$util.isInteger(message.maxFreeCaptureRes))
                                return "maxFreeCaptureRes: integer expected";
                        if (message.maxPremiumCaptureRes !== undefined)
                            if (!$util.isInteger(message.maxPremiumCaptureRes))
                                return "maxPremiumCaptureRes: integer expected";
                        return null;
                    };

                    CaptureOptions.fromObject = function fromObject(object) {
                        if (object instanceof $root.keyhole.dbroot.ClientOptionsProto.CaptureOptions)
                            return object;
                        var message = new $root.keyhole.dbroot.ClientOptionsProto.CaptureOptions();
                        if (object.allowSaveAsImage !== undefined && object.allowSaveAsImage !== null)
                            message.allowSaveAsImage = Boolean(object.allowSaveAsImage);
                        if (object.maxFreeCaptureRes !== undefined && object.maxFreeCaptureRes !== null)
                            message.maxFreeCaptureRes = object.maxFreeCaptureRes | 0;
                        if (object.maxPremiumCaptureRes !== undefined && object.maxPremiumCaptureRes !== null)
                            message.maxPremiumCaptureRes = object.maxPremiumCaptureRes | 0;
                        return message;
                    };

                    CaptureOptions.from = CaptureOptions.fromObject;

                    CaptureOptions.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.defaults) {
                            object.allowSaveAsImage = true;
                            object.maxFreeCaptureRes = 2400;
                            object.maxPremiumCaptureRes = 4800;
                        }
                        if (message.allowSaveAsImage !== undefined && message.allowSaveAsImage !== null && message.hasOwnProperty("allowSaveAsImage"))
                            object.allowSaveAsImage = message.allowSaveAsImage;
                        if (message.maxFreeCaptureRes !== undefined && message.maxFreeCaptureRes !== null && message.hasOwnProperty("maxFreeCaptureRes"))
                            object.maxFreeCaptureRes = message.maxFreeCaptureRes;
                        if (message.maxPremiumCaptureRes !== undefined && message.maxPremiumCaptureRes !== null && message.hasOwnProperty("maxPremiumCaptureRes"))
                            object.maxPremiumCaptureRes = message.maxPremiumCaptureRes;
                        return object;
                    };

                    CaptureOptions.prototype.toObject = function toObject(options) {
                        return this.constructor.toObject(this, options);
                    };

                    CaptureOptions.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };

                    return CaptureOptions;
                })();

                ClientOptionsProto.MapsOptions = (function() {

                    function MapsOptions(properties) {
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                this[keys[i]] = properties[keys[i]];
                    }

                    MapsOptions.prototype.enableMaps = false;
                    MapsOptions.prototype.docsAutoDownloadEnabled = false;
                    MapsOptions.prototype.docsAutoDownloadInterval = 0;
                    MapsOptions.prototype.docsAutoUploadEnabled = false;
                    MapsOptions.prototype.docsAutoUploadDelay = 0;

                    MapsOptions.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length,
                            message = new $root.keyhole.dbroot.ClientOptionsProto.MapsOptions();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1:
                                    message.enableMaps = reader.bool();
                                    break;
                                case 2:
                                    message.docsAutoDownloadEnabled = reader.bool();
                                    break;
                                case 3:
                                    message.docsAutoDownloadInterval = reader.int32();
                                    break;
                                case 4:
                                    message.docsAutoUploadEnabled = reader.bool();
                                    break;
                                case 5:
                                    message.docsAutoUploadDelay = reader.int32();
                                    break;
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
                        if (message.enableMaps !== undefined)
                            if (typeof message.enableMaps !== "boolean")
                                return "enableMaps: boolean expected";
                        if (message.docsAutoDownloadEnabled !== undefined)
                            if (typeof message.docsAutoDownloadEnabled !== "boolean")
                                return "docsAutoDownloadEnabled: boolean expected";
                        if (message.docsAutoDownloadInterval !== undefined)
                            if (!$util.isInteger(message.docsAutoDownloadInterval))
                                return "docsAutoDownloadInterval: integer expected";
                        if (message.docsAutoUploadEnabled !== undefined)
                            if (typeof message.docsAutoUploadEnabled !== "boolean")
                                return "docsAutoUploadEnabled: boolean expected";
                        if (message.docsAutoUploadDelay !== undefined)
                            if (!$util.isInteger(message.docsAutoUploadDelay))
                                return "docsAutoUploadDelay: integer expected";
                        return null;
                    };

                    MapsOptions.fromObject = function fromObject(object) {
                        if (object instanceof $root.keyhole.dbroot.ClientOptionsProto.MapsOptions)
                            return object;
                        var message = new $root.keyhole.dbroot.ClientOptionsProto.MapsOptions();
                        if (object.enableMaps !== undefined && object.enableMaps !== null)
                            message.enableMaps = Boolean(object.enableMaps);
                        if (object.docsAutoDownloadEnabled !== undefined && object.docsAutoDownloadEnabled !== null)
                            message.docsAutoDownloadEnabled = Boolean(object.docsAutoDownloadEnabled);
                        if (object.docsAutoDownloadInterval !== undefined && object.docsAutoDownloadInterval !== null)
                            message.docsAutoDownloadInterval = object.docsAutoDownloadInterval | 0;
                        if (object.docsAutoUploadEnabled !== undefined && object.docsAutoUploadEnabled !== null)
                            message.docsAutoUploadEnabled = Boolean(object.docsAutoUploadEnabled);
                        if (object.docsAutoUploadDelay !== undefined && object.docsAutoUploadDelay !== null)
                            message.docsAutoUploadDelay = object.docsAutoUploadDelay | 0;
                        return message;
                    };

                    MapsOptions.from = MapsOptions.fromObject;

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
                        if (message.enableMaps !== undefined && message.enableMaps !== null && message.hasOwnProperty("enableMaps"))
                            object.enableMaps = message.enableMaps;
                        if (message.docsAutoDownloadEnabled !== undefined && message.docsAutoDownloadEnabled !== null && message.hasOwnProperty("docsAutoDownloadEnabled"))
                            object.docsAutoDownloadEnabled = message.docsAutoDownloadEnabled;
                        if (message.docsAutoDownloadInterval !== undefined && message.docsAutoDownloadInterval !== null && message.hasOwnProperty("docsAutoDownloadInterval"))
                            object.docsAutoDownloadInterval = message.docsAutoDownloadInterval;
                        if (message.docsAutoUploadEnabled !== undefined && message.docsAutoUploadEnabled !== null && message.hasOwnProperty("docsAutoUploadEnabled"))
                            object.docsAutoUploadEnabled = message.docsAutoUploadEnabled;
                        if (message.docsAutoUploadDelay !== undefined && message.docsAutoUploadDelay !== null && message.hasOwnProperty("docsAutoUploadDelay"))
                            object.docsAutoUploadDelay = message.docsAutoUploadDelay;
                        return object;
                    };

                    MapsOptions.prototype.toObject = function toObject(options) {
                        return this.constructor.toObject(this, options);
                    };

                    MapsOptions.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };

                    return MapsOptions;
                })();

                return ClientOptionsProto;
            })();

            dbroot.FetchingOptionsProto = (function() {

                function FetchingOptionsProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
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
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.FetchingOptionsProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.maxRequestsPerQuery = reader.int32();
                                break;
                            case 12:
                                message.forceMaxRequestsPerQuery = reader.bool();
                                break;
                            case 13:
                                message.sortBatches = reader.bool();
                                break;
                            case 2:
                                message.maxDrawable = reader.int32();
                                break;
                            case 3:
                                message.maxImagery = reader.int32();
                                break;
                            case 4:
                                message.maxTerrain = reader.int32();
                                break;
                            case 5:
                                message.maxQuadtree = reader.int32();
                                break;
                            case 6:
                                message.maxDioramaMetadata = reader.int32();
                                break;
                            case 7:
                                message.maxDioramaData = reader.int32();
                                break;
                            case 8:
                                message.maxConsumerFetchRatio = reader.float();
                                break;
                            case 9:
                                message.maxProEcFetchRatio = reader.float();
                                break;
                            case 10:
                                message.safeOverallQps = reader.float();
                                break;
                            case 11:
                                message.safeImageryQps = reader.float();
                                break;
                            case 14:
                                message.domainsForHttps = reader.string();
                                break;
                            case 15:
                                message.hostsForHttp = reader.string();
                                break;
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
                    if (message.maxRequestsPerQuery !== undefined)
                        if (!$util.isInteger(message.maxRequestsPerQuery))
                            return "maxRequestsPerQuery: integer expected";
                    if (message.forceMaxRequestsPerQuery !== undefined)
                        if (typeof message.forceMaxRequestsPerQuery !== "boolean")
                            return "forceMaxRequestsPerQuery: boolean expected";
                    if (message.sortBatches !== undefined)
                        if (typeof message.sortBatches !== "boolean")
                            return "sortBatches: boolean expected";
                    if (message.maxDrawable !== undefined)
                        if (!$util.isInteger(message.maxDrawable))
                            return "maxDrawable: integer expected";
                    if (message.maxImagery !== undefined)
                        if (!$util.isInteger(message.maxImagery))
                            return "maxImagery: integer expected";
                    if (message.maxTerrain !== undefined)
                        if (!$util.isInteger(message.maxTerrain))
                            return "maxTerrain: integer expected";
                    if (message.maxQuadtree !== undefined)
                        if (!$util.isInteger(message.maxQuadtree))
                            return "maxQuadtree: integer expected";
                    if (message.maxDioramaMetadata !== undefined)
                        if (!$util.isInteger(message.maxDioramaMetadata))
                            return "maxDioramaMetadata: integer expected";
                    if (message.maxDioramaData !== undefined)
                        if (!$util.isInteger(message.maxDioramaData))
                            return "maxDioramaData: integer expected";
                    if (message.maxConsumerFetchRatio !== undefined)
                        if (typeof message.maxConsumerFetchRatio !== "number")
                            return "maxConsumerFetchRatio: number expected";
                    if (message.maxProEcFetchRatio !== undefined)
                        if (typeof message.maxProEcFetchRatio !== "number")
                            return "maxProEcFetchRatio: number expected";
                    if (message.safeOverallQps !== undefined)
                        if (typeof message.safeOverallQps !== "number")
                            return "safeOverallQps: number expected";
                    if (message.safeImageryQps !== undefined)
                        if (typeof message.safeImageryQps !== "number")
                            return "safeImageryQps: number expected";
                    if (message.domainsForHttps !== undefined)
                        if (!$util.isString(message.domainsForHttps))
                            return "domainsForHttps: string expected";
                    if (message.hostsForHttp !== undefined)
                        if (!$util.isString(message.hostsForHttp))
                            return "hostsForHttp: string expected";
                    return null;
                };

                FetchingOptionsProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.FetchingOptionsProto)
                        return object;
                    var message = new $root.keyhole.dbroot.FetchingOptionsProto();
                    if (object.maxRequestsPerQuery !== undefined && object.maxRequestsPerQuery !== null)
                        message.maxRequestsPerQuery = object.maxRequestsPerQuery | 0;
                    if (object.forceMaxRequestsPerQuery !== undefined && object.forceMaxRequestsPerQuery !== null)
                        message.forceMaxRequestsPerQuery = Boolean(object.forceMaxRequestsPerQuery);
                    if (object.sortBatches !== undefined && object.sortBatches !== null)
                        message.sortBatches = Boolean(object.sortBatches);
                    if (object.maxDrawable !== undefined && object.maxDrawable !== null)
                        message.maxDrawable = object.maxDrawable | 0;
                    if (object.maxImagery !== undefined && object.maxImagery !== null)
                        message.maxImagery = object.maxImagery | 0;
                    if (object.maxTerrain !== undefined && object.maxTerrain !== null)
                        message.maxTerrain = object.maxTerrain | 0;
                    if (object.maxQuadtree !== undefined && object.maxQuadtree !== null)
                        message.maxQuadtree = object.maxQuadtree | 0;
                    if (object.maxDioramaMetadata !== undefined && object.maxDioramaMetadata !== null)
                        message.maxDioramaMetadata = object.maxDioramaMetadata | 0;
                    if (object.maxDioramaData !== undefined && object.maxDioramaData !== null)
                        message.maxDioramaData = object.maxDioramaData | 0;
                    if (object.maxConsumerFetchRatio !== undefined && object.maxConsumerFetchRatio !== null)
                        message.maxConsumerFetchRatio = Number(object.maxConsumerFetchRatio);
                    if (object.maxProEcFetchRatio !== undefined && object.maxProEcFetchRatio !== null)
                        message.maxProEcFetchRatio = Number(object.maxProEcFetchRatio);
                    if (object.safeOverallQps !== undefined && object.safeOverallQps !== null)
                        message.safeOverallQps = Number(object.safeOverallQps);
                    if (object.safeImageryQps !== undefined && object.safeImageryQps !== null)
                        message.safeImageryQps = Number(object.safeImageryQps);
                    if (object.domainsForHttps !== undefined && object.domainsForHttps !== null)
                        message.domainsForHttps = String(object.domainsForHttps);
                    if (object.hostsForHttp !== undefined && object.hostsForHttp !== null)
                        message.hostsForHttp = String(object.hostsForHttp);
                    return message;
                };

                FetchingOptionsProto.from = FetchingOptionsProto.fromObject;

                FetchingOptionsProto.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.maxRequestsPerQuery = 1;
                        object.forceMaxRequestsPerQuery = false;
                        object.sortBatches = false;
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
                        object.domainsForHttps = "google.com gstatic.com";
                        object.hostsForHttp = "";
                    }
                    if (message.maxRequestsPerQuery !== undefined && message.maxRequestsPerQuery !== null && message.hasOwnProperty("maxRequestsPerQuery"))
                        object.maxRequestsPerQuery = message.maxRequestsPerQuery;
                    if (message.forceMaxRequestsPerQuery !== undefined && message.forceMaxRequestsPerQuery !== null && message.hasOwnProperty("forceMaxRequestsPerQuery"))
                        object.forceMaxRequestsPerQuery = message.forceMaxRequestsPerQuery;
                    if (message.sortBatches !== undefined && message.sortBatches !== null && message.hasOwnProperty("sortBatches"))
                        object.sortBatches = message.sortBatches;
                    if (message.maxDrawable !== undefined && message.maxDrawable !== null && message.hasOwnProperty("maxDrawable"))
                        object.maxDrawable = message.maxDrawable;
                    if (message.maxImagery !== undefined && message.maxImagery !== null && message.hasOwnProperty("maxImagery"))
                        object.maxImagery = message.maxImagery;
                    if (message.maxTerrain !== undefined && message.maxTerrain !== null && message.hasOwnProperty("maxTerrain"))
                        object.maxTerrain = message.maxTerrain;
                    if (message.maxQuadtree !== undefined && message.maxQuadtree !== null && message.hasOwnProperty("maxQuadtree"))
                        object.maxQuadtree = message.maxQuadtree;
                    if (message.maxDioramaMetadata !== undefined && message.maxDioramaMetadata !== null && message.hasOwnProperty("maxDioramaMetadata"))
                        object.maxDioramaMetadata = message.maxDioramaMetadata;
                    if (message.maxDioramaData !== undefined && message.maxDioramaData !== null && message.hasOwnProperty("maxDioramaData"))
                        object.maxDioramaData = message.maxDioramaData;
                    if (message.maxConsumerFetchRatio !== undefined && message.maxConsumerFetchRatio !== null && message.hasOwnProperty("maxConsumerFetchRatio"))
                        object.maxConsumerFetchRatio = message.maxConsumerFetchRatio;
                    if (message.maxProEcFetchRatio !== undefined && message.maxProEcFetchRatio !== null && message.hasOwnProperty("maxProEcFetchRatio"))
                        object.maxProEcFetchRatio = message.maxProEcFetchRatio;
                    if (message.safeOverallQps !== undefined && message.safeOverallQps !== null && message.hasOwnProperty("safeOverallQps"))
                        object.safeOverallQps = message.safeOverallQps;
                    if (message.safeImageryQps !== undefined && message.safeImageryQps !== null && message.hasOwnProperty("safeImageryQps"))
                        object.safeImageryQps = message.safeImageryQps;
                    if (message.domainsForHttps !== undefined && message.domainsForHttps !== null && message.hasOwnProperty("domainsForHttps"))
                        object.domainsForHttps = message.domainsForHttps;
                    if (message.hostsForHttp !== undefined && message.hostsForHttp !== null && message.hasOwnProperty("hostsForHttp"))
                        object.hostsForHttp = message.hostsForHttp;
                    return object;
                };

                FetchingOptionsProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                FetchingOptionsProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return FetchingOptionsProto;
            })();

            dbroot.TimeMachineOptionsProto = (function() {

                function TimeMachineOptionsProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                TimeMachineOptionsProto.prototype.serverUrl = "";
                TimeMachineOptionsProto.prototype.isTimemachine = false;
                TimeMachineOptionsProto.prototype.dwellTimeMs = 500;
                TimeMachineOptionsProto.prototype.discoverabilityAltitudeMeters = 15000;

                TimeMachineOptionsProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.TimeMachineOptionsProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.serverUrl = reader.string();
                                break;
                            case 2:
                                message.isTimemachine = reader.bool();
                                break;
                            case 3:
                                message.dwellTimeMs = reader.int32();
                                break;
                            case 4:
                                message.discoverabilityAltitudeMeters = reader.int32();
                                break;
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
                    if (message.serverUrl !== undefined)
                        if (!$util.isString(message.serverUrl))
                            return "serverUrl: string expected";
                    if (message.isTimemachine !== undefined)
                        if (typeof message.isTimemachine !== "boolean")
                            return "isTimemachine: boolean expected";
                    if (message.dwellTimeMs !== undefined)
                        if (!$util.isInteger(message.dwellTimeMs))
                            return "dwellTimeMs: integer expected";
                    if (message.discoverabilityAltitudeMeters !== undefined)
                        if (!$util.isInteger(message.discoverabilityAltitudeMeters))
                            return "discoverabilityAltitudeMeters: integer expected";
                    return null;
                };

                TimeMachineOptionsProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.TimeMachineOptionsProto)
                        return object;
                    var message = new $root.keyhole.dbroot.TimeMachineOptionsProto();
                    if (object.serverUrl !== undefined && object.serverUrl !== null)
                        message.serverUrl = String(object.serverUrl);
                    if (object.isTimemachine !== undefined && object.isTimemachine !== null)
                        message.isTimemachine = Boolean(object.isTimemachine);
                    if (object.dwellTimeMs !== undefined && object.dwellTimeMs !== null)
                        message.dwellTimeMs = object.dwellTimeMs | 0;
                    if (object.discoverabilityAltitudeMeters !== undefined && object.discoverabilityAltitudeMeters !== null)
                        message.discoverabilityAltitudeMeters = object.discoverabilityAltitudeMeters | 0;
                    return message;
                };

                TimeMachineOptionsProto.from = TimeMachineOptionsProto.fromObject;

                TimeMachineOptionsProto.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.serverUrl = "";
                        object.isTimemachine = false;
                        object.dwellTimeMs = 500;
                        object.discoverabilityAltitudeMeters = 15000;
                    }
                    if (message.serverUrl !== undefined && message.serverUrl !== null && message.hasOwnProperty("serverUrl"))
                        object.serverUrl = message.serverUrl;
                    if (message.isTimemachine !== undefined && message.isTimemachine !== null && message.hasOwnProperty("isTimemachine"))
                        object.isTimemachine = message.isTimemachine;
                    if (message.dwellTimeMs !== undefined && message.dwellTimeMs !== null && message.hasOwnProperty("dwellTimeMs"))
                        object.dwellTimeMs = message.dwellTimeMs;
                    if (message.discoverabilityAltitudeMeters !== undefined && message.discoverabilityAltitudeMeters !== null && message.hasOwnProperty("discoverabilityAltitudeMeters"))
                        object.discoverabilityAltitudeMeters = message.discoverabilityAltitudeMeters;
                    return object;
                };

                TimeMachineOptionsProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                TimeMachineOptionsProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return TimeMachineOptionsProto;
            })();

            dbroot.AutopiaOptionsProto = (function() {

                function AutopiaOptionsProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                AutopiaOptionsProto.prototype.metadataServerUrl = "http://cbk0.google.com/cbk";
                AutopiaOptionsProto.prototype.depthmapServerUrl = "http://cbk0.google.com/cbk";
                AutopiaOptionsProto.prototype.coverageOverlayUrl = "";
                AutopiaOptionsProto.prototype.maxImageryQps = 0;
                AutopiaOptionsProto.prototype.maxMetadataDepthmapQps = 0;

                AutopiaOptionsProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.AutopiaOptionsProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.metadataServerUrl = reader.string();
                                break;
                            case 2:
                                message.depthmapServerUrl = reader.string();
                                break;
                            case 3:
                                message.coverageOverlayUrl = reader.string();
                                break;
                            case 4:
                                message.maxImageryQps = reader.float();
                                break;
                            case 5:
                                message.maxMetadataDepthmapQps = reader.float();
                                break;
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
                    if (message.metadataServerUrl !== undefined)
                        if (!$util.isString(message.metadataServerUrl))
                            return "metadataServerUrl: string expected";
                    if (message.depthmapServerUrl !== undefined)
                        if (!$util.isString(message.depthmapServerUrl))
                            return "depthmapServerUrl: string expected";
                    if (message.coverageOverlayUrl !== undefined)
                        if (!$util.isString(message.coverageOverlayUrl))
                            return "coverageOverlayUrl: string expected";
                    if (message.maxImageryQps !== undefined)
                        if (typeof message.maxImageryQps !== "number")
                            return "maxImageryQps: number expected";
                    if (message.maxMetadataDepthmapQps !== undefined)
                        if (typeof message.maxMetadataDepthmapQps !== "number")
                            return "maxMetadataDepthmapQps: number expected";
                    return null;
                };

                AutopiaOptionsProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.AutopiaOptionsProto)
                        return object;
                    var message = new $root.keyhole.dbroot.AutopiaOptionsProto();
                    if (object.metadataServerUrl !== undefined && object.metadataServerUrl !== null)
                        message.metadataServerUrl = String(object.metadataServerUrl);
                    if (object.depthmapServerUrl !== undefined && object.depthmapServerUrl !== null)
                        message.depthmapServerUrl = String(object.depthmapServerUrl);
                    if (object.coverageOverlayUrl !== undefined && object.coverageOverlayUrl !== null)
                        message.coverageOverlayUrl = String(object.coverageOverlayUrl);
                    if (object.maxImageryQps !== undefined && object.maxImageryQps !== null)
                        message.maxImageryQps = Number(object.maxImageryQps);
                    if (object.maxMetadataDepthmapQps !== undefined && object.maxMetadataDepthmapQps !== null)
                        message.maxMetadataDepthmapQps = Number(object.maxMetadataDepthmapQps);
                    return message;
                };

                AutopiaOptionsProto.from = AutopiaOptionsProto.fromObject;

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
                    if (message.metadataServerUrl !== undefined && message.metadataServerUrl !== null && message.hasOwnProperty("metadataServerUrl"))
                        object.metadataServerUrl = message.metadataServerUrl;
                    if (message.depthmapServerUrl !== undefined && message.depthmapServerUrl !== null && message.hasOwnProperty("depthmapServerUrl"))
                        object.depthmapServerUrl = message.depthmapServerUrl;
                    if (message.coverageOverlayUrl !== undefined && message.coverageOverlayUrl !== null && message.hasOwnProperty("coverageOverlayUrl"))
                        object.coverageOverlayUrl = message.coverageOverlayUrl;
                    if (message.maxImageryQps !== undefined && message.maxImageryQps !== null && message.hasOwnProperty("maxImageryQps"))
                        object.maxImageryQps = message.maxImageryQps;
                    if (message.maxMetadataDepthmapQps !== undefined && message.maxMetadataDepthmapQps !== null && message.hasOwnProperty("maxMetadataDepthmapQps"))
                        object.maxMetadataDepthmapQps = message.maxMetadataDepthmapQps;
                    return object;
                };

                AutopiaOptionsProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                AutopiaOptionsProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return AutopiaOptionsProto;
            })();

            dbroot.CSIOptionsProto = (function() {

                function CSIOptionsProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                CSIOptionsProto.prototype.samplingPercentage = 0;
                CSIOptionsProto.prototype.experimentId = "";

                CSIOptionsProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.CSIOptionsProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.samplingPercentage = reader.int32();
                                break;
                            case 2:
                                message.experimentId = reader.string();
                                break;
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
                    if (message.samplingPercentage !== undefined)
                        if (!$util.isInteger(message.samplingPercentage))
                            return "samplingPercentage: integer expected";
                    if (message.experimentId !== undefined)
                        if (!$util.isString(message.experimentId))
                            return "experimentId: string expected";
                    return null;
                };

                CSIOptionsProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.CSIOptionsProto)
                        return object;
                    var message = new $root.keyhole.dbroot.CSIOptionsProto();
                    if (object.samplingPercentage !== undefined && object.samplingPercentage !== null)
                        message.samplingPercentage = object.samplingPercentage | 0;
                    if (object.experimentId !== undefined && object.experimentId !== null)
                        message.experimentId = String(object.experimentId);
                    return message;
                };

                CSIOptionsProto.from = CSIOptionsProto.fromObject;

                CSIOptionsProto.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.samplingPercentage = 0;
                        object.experimentId = "";
                    }
                    if (message.samplingPercentage !== undefined && message.samplingPercentage !== null && message.hasOwnProperty("samplingPercentage"))
                        object.samplingPercentage = message.samplingPercentage;
                    if (message.experimentId !== undefined && message.experimentId !== null && message.hasOwnProperty("experimentId"))
                        object.experimentId = message.experimentId;
                    return object;
                };

                CSIOptionsProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                CSIOptionsProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return CSIOptionsProto;
            })();

            dbroot.SearchTabProto = (function() {

                function SearchTabProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                SearchTabProto.prototype.isVisible = false;
                SearchTabProto.prototype.tabLabel = null;
                SearchTabProto.prototype.baseUrl = "";
                SearchTabProto.prototype.viewportPrefix = "";
                SearchTabProto.prototype.inputBox = $util.emptyArray;
                SearchTabProto.prototype.requirement = null;

                var $types = {
                    1 : "keyhole.dbroot.StringIdOrValueProto",
                    4 : "keyhole.dbroot.SearchTabProto.InputBoxInfo",
                    5 : "keyhole.dbroot.RequirementProto"
                };
                $lazyTypes.push($types);

                SearchTabProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.SearchTabProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.isVisible = reader.bool();
                                break;
                            case 2:
                                message.tabLabel = $types[1].decode(reader, reader.uint32());
                                break;
                            case 3:
                                message.baseUrl = reader.string();
                                break;
                            case 4:
                                message.viewportPrefix = reader.string();
                                break;
                            case 5:
                                if (!(message.inputBox && message.inputBox.length))
                                    message.inputBox = [];
                                message.inputBox.push($types[4].decode(reader, reader.uint32()));
                                break;
                            case 6:
                                message.requirement = $types[5].decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                SearchTabProto.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (typeof message.isVisible !== "boolean")
                        return "isVisible: boolean expected";
                    if (message.tabLabel !== undefined && message.tabLabel !== null) {
                        var error = $types[1].verify(message.tabLabel);
                        if (error)
                            return "tabLabel." + error;
                    }
                    if (message.baseUrl !== undefined)
                        if (!$util.isString(message.baseUrl))
                            return "baseUrl: string expected";
                    if (message.viewportPrefix !== undefined)
                        if (!$util.isString(message.viewportPrefix))
                            return "viewportPrefix: string expected";
                    if (message.inputBox !== undefined) {
                        if (!Array.isArray(message.inputBox))
                            return "inputBox: array expected";
                        for (var i = 0; i < message.inputBox.length; ++i) {
                            var error = $types[4].verify(message.inputBox[i]);
                            if (error)
                                return "inputBox." + error;
                        }
                    }
                    if (message.requirement !== undefined && message.requirement !== null) {
                        var error = $types[5].verify(message.requirement);
                        if (error)
                            return "requirement." + error;
                    }
                    return null;
                };

                SearchTabProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.SearchTabProto)
                        return object;
                    var message = new $root.keyhole.dbroot.SearchTabProto();
                    if (object.isVisible !== undefined && object.isVisible !== null)
                        message.isVisible = Boolean(object.isVisible);
                    if (object.tabLabel !== undefined && object.tabLabel !== null) {
                        if (typeof object.tabLabel !== "object")
                            throw TypeError(".keyhole.dbroot.SearchTabProto.tabLabel: object expected");
                        message.tabLabel = $types[1].fromObject(object.tabLabel);
                    }
                    if (object.baseUrl !== undefined && object.baseUrl !== null)
                        message.baseUrl = String(object.baseUrl);
                    if (object.viewportPrefix !== undefined && object.viewportPrefix !== null)
                        message.viewportPrefix = String(object.viewportPrefix);
                    if (object.inputBox) {
                        if (!Array.isArray(object.inputBox))
                            throw TypeError(".keyhole.dbroot.SearchTabProto.inputBox: array expected");
                        message.inputBox = [];
                        for (var i = 0; i < object.inputBox.length; ++i) {
                            if (typeof object.inputBox[i] !== "object")
                                throw TypeError(".keyhole.dbroot.SearchTabProto.inputBox: object expected");
                            message.inputBox[i] = $types[4].fromObject(object.inputBox[i]);
                        }
                    }
                    if (object.requirement !== undefined && object.requirement !== null) {
                        if (typeof object.requirement !== "object")
                            throw TypeError(".keyhole.dbroot.SearchTabProto.requirement: object expected");
                        message.requirement = $types[5].fromObject(object.requirement);
                    }
                    return message;
                };

                SearchTabProto.from = SearchTabProto.fromObject;

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
                    if (message.isVisible !== undefined && message.isVisible !== null && message.hasOwnProperty("isVisible"))
                        object.isVisible = message.isVisible;
                    if (message.tabLabel !== undefined && message.tabLabel !== null && message.hasOwnProperty("tabLabel"))
                        object.tabLabel = $types[1].toObject(message.tabLabel, options);
                    if (message.baseUrl !== undefined && message.baseUrl !== null && message.hasOwnProperty("baseUrl"))
                        object.baseUrl = message.baseUrl;
                    if (message.viewportPrefix !== undefined && message.viewportPrefix !== null && message.hasOwnProperty("viewportPrefix"))
                        object.viewportPrefix = message.viewportPrefix;
                    if (message.inputBox !== undefined && message.inputBox !== null && message.hasOwnProperty("inputBox")) {
                        object.inputBox = [];
                        for (var j = 0; j < message.inputBox.length; ++j)
                            object.inputBox[j] = $types[4].toObject(message.inputBox[j], options);
                    }
                    if (message.requirement !== undefined && message.requirement !== null && message.hasOwnProperty("requirement"))
                        object.requirement = $types[5].toObject(message.requirement, options);
                    return object;
                };

                SearchTabProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                SearchTabProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                SearchTabProto.InputBoxInfo = (function() {

                    function InputBoxInfo(properties) {
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                this[keys[i]] = properties[keys[i]];
                    }

                    InputBoxInfo.prototype.label = null;
                    InputBoxInfo.prototype.queryVerb = "";
                    InputBoxInfo.prototype.queryPrepend = "";

                    var $types = {
                        0 : "keyhole.dbroot.StringIdOrValueProto"
                    };
                    $lazyTypes.push($types);

                    InputBoxInfo.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length,
                            message = new $root.keyhole.dbroot.SearchTabProto.InputBoxInfo();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1:
                                    message.label = $types[0].decode(reader, reader.uint32());
                                    break;
                                case 2:
                                    message.queryVerb = reader.string();
                                    break;
                                case 3:
                                    message.queryPrepend = reader.string();
                                    break;
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };

                    InputBoxInfo.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        var error = $types[0].verify(message.label);
                        if (error)
                            return "label." + error;
                        if (!$util.isString(message.queryVerb))
                            return "queryVerb: string expected";
                        if (message.queryPrepend !== undefined)
                            if (!$util.isString(message.queryPrepend))
                                return "queryPrepend: string expected";
                        return null;
                    };

                    InputBoxInfo.fromObject = function fromObject(object) {
                        if (object instanceof $root.keyhole.dbroot.SearchTabProto.InputBoxInfo)
                            return object;
                        var message = new $root.keyhole.dbroot.SearchTabProto.InputBoxInfo();
                        if (object.label !== undefined && object.label !== null) {
                            if (typeof object.label !== "object")
                                throw TypeError(".keyhole.dbroot.SearchTabProto.InputBoxInfo.label: object expected");
                            message.label = $types[0].fromObject(object.label);
                        }
                        if (object.queryVerb !== undefined && object.queryVerb !== null)
                            message.queryVerb = String(object.queryVerb);
                        if (object.queryPrepend !== undefined && object.queryPrepend !== null)
                            message.queryPrepend = String(object.queryPrepend);
                        return message;
                    };

                    InputBoxInfo.from = InputBoxInfo.fromObject;

                    InputBoxInfo.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.defaults) {
                            object.label = null;
                            object.queryVerb = "";
                            object.queryPrepend = "";
                        }
                        if (message.label !== undefined && message.label !== null && message.hasOwnProperty("label"))
                            object.label = $types[0].toObject(message.label, options);
                        if (message.queryVerb !== undefined && message.queryVerb !== null && message.hasOwnProperty("queryVerb"))
                            object.queryVerb = message.queryVerb;
                        if (message.queryPrepend !== undefined && message.queryPrepend !== null && message.hasOwnProperty("queryPrepend"))
                            object.queryPrepend = message.queryPrepend;
                        return object;
                    };

                    InputBoxInfo.prototype.toObject = function toObject(options) {
                        return this.constructor.toObject(this, options);
                    };

                    InputBoxInfo.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };

                    return InputBoxInfo;
                })();

                return SearchTabProto;
            })();

            dbroot.CobrandProto = (function() {

                function CobrandProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                CobrandProto.prototype.logoUrl = "";
                CobrandProto.prototype.xCoord = null;
                CobrandProto.prototype.yCoord = null;
                CobrandProto.prototype.tiePoint = 6;
                CobrandProto.prototype.screenSize = 0;

                var $types = {
                    1 : "keyhole.dbroot.CobrandProto.Coord",
                    2 : "keyhole.dbroot.CobrandProto.Coord",
                    3 : "keyhole.dbroot.CobrandProto.TiePoint"
                };
                $lazyTypes.push($types);

                CobrandProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.CobrandProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.logoUrl = reader.string();
                                break;
                            case 2:
                                message.xCoord = $types[1].decode(reader, reader.uint32());
                                break;
                            case 3:
                                message.yCoord = $types[2].decode(reader, reader.uint32());
                                break;
                            case 4:
                                message.tiePoint = reader.uint32();
                                break;
                            case 5:
                                message.screenSize = reader.double();
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                CobrandProto.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (!$util.isString(message.logoUrl))
                        return "logoUrl: string expected";
                    if (message.xCoord !== undefined && message.xCoord !== null) {
                        var error = $types[1].verify(message.xCoord);
                        if (error)
                            return "xCoord." + error;
                    }
                    if (message.yCoord !== undefined && message.yCoord !== null) {
                        var error = $types[2].verify(message.yCoord);
                        if (error)
                            return "yCoord." + error;
                    }
                    if (message.tiePoint !== undefined)
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
                    if (message.screenSize !== undefined)
                        if (typeof message.screenSize !== "number")
                            return "screenSize: number expected";
                    return null;
                };

                CobrandProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.CobrandProto)
                        return object;
                    var message = new $root.keyhole.dbroot.CobrandProto();
                    if (object.logoUrl !== undefined && object.logoUrl !== null)
                        message.logoUrl = String(object.logoUrl);
                    if (object.xCoord !== undefined && object.xCoord !== null) {
                        if (typeof object.xCoord !== "object")
                            throw TypeError(".keyhole.dbroot.CobrandProto.xCoord: object expected");
                        message.xCoord = $types[1].fromObject(object.xCoord);
                    }
                    if (object.yCoord !== undefined && object.yCoord !== null) {
                        if (typeof object.yCoord !== "object")
                            throw TypeError(".keyhole.dbroot.CobrandProto.yCoord: object expected");
                        message.yCoord = $types[2].fromObject(object.yCoord);
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
                    if (object.screenSize !== undefined && object.screenSize !== null)
                        message.screenSize = Number(object.screenSize);
                    return message;
                };

                CobrandProto.from = CobrandProto.fromObject;

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
                    if (message.logoUrl !== undefined && message.logoUrl !== null && message.hasOwnProperty("logoUrl"))
                        object.logoUrl = message.logoUrl;
                    if (message.xCoord !== undefined && message.xCoord !== null && message.hasOwnProperty("xCoord"))
                        object.xCoord = $types[1].toObject(message.xCoord, options);
                    if (message.yCoord !== undefined && message.yCoord !== null && message.hasOwnProperty("yCoord"))
                        object.yCoord = $types[2].toObject(message.yCoord, options);
                    if (message.tiePoint !== undefined && message.tiePoint !== null && message.hasOwnProperty("tiePoint"))
                        object.tiePoint = options.enums === String ? $types[3][message.tiePoint] : message.tiePoint;
                    if (message.screenSize !== undefined && message.screenSize !== null && message.hasOwnProperty("screenSize"))
                        object.screenSize = message.screenSize;
                    return object;
                };

                CobrandProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                CobrandProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                CobrandProto.Coord = (function() {

                    function Coord(properties) {
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                this[keys[i]] = properties[keys[i]];
                    }

                    Coord.prototype.value = 0;
                    Coord.prototype.isRelative = false;

                    Coord.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length,
                            message = new $root.keyhole.dbroot.CobrandProto.Coord();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1:
                                    message.value = reader.double();
                                    break;
                                case 2:
                                    message.isRelative = reader.bool();
                                    break;
                                default:
                                    reader.skipType(tag & 7);
                                    break;
                            }
                        }
                        return message;
                    };

                    Coord.verify = function verify(message) {
                        if (typeof message !== "object" || message === null)
                            return "object expected";
                        if (typeof message.value !== "number")
                            return "value: number expected";
                        if (message.isRelative !== undefined)
                            if (typeof message.isRelative !== "boolean")
                                return "isRelative: boolean expected";
                        return null;
                    };

                    Coord.fromObject = function fromObject(object) {
                        if (object instanceof $root.keyhole.dbroot.CobrandProto.Coord)
                            return object;
                        var message = new $root.keyhole.dbroot.CobrandProto.Coord();
                        if (object.value !== undefined && object.value !== null)
                            message.value = Number(object.value);
                        if (object.isRelative !== undefined && object.isRelative !== null)
                            message.isRelative = Boolean(object.isRelative);
                        return message;
                    };

                    Coord.from = Coord.fromObject;

                    Coord.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.defaults) {
                            object.value = 0;
                            object.isRelative = false;
                        }
                        if (message.value !== undefined && message.value !== null && message.hasOwnProperty("value"))
                            object.value = message.value;
                        if (message.isRelative !== undefined && message.isRelative !== null && message.hasOwnProperty("isRelative"))
                            object.isRelative = message.isRelative;
                        return object;
                    };

                    Coord.prototype.toObject = function toObject(options) {
                        return this.constructor.toObject(this, options);
                    };

                    Coord.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };

                    return Coord;
                })();

                CobrandProto.TiePoint = (function() {
                    var valuesById = {}, values = Object.create(valuesById);
                    values["TOP_LEFT"] = 0;
                    values["TOP_CENTER"] = 1;
                    values["TOP_RIGHT"] = 2;
                    values["MID_LEFT"] = 3;
                    values["MID_CENTER"] = 4;
                    values["MID_RIGHT"] = 5;
                    values["BOTTOM_LEFT"] = 6;
                    values["BOTTOM_CENTER"] = 7;
                    values["BOTTOM_RIGHT"] = 8;
                    return values;
                })();

                return CobrandProto;
            })();

            dbroot.DatabaseDescriptionProto = (function() {

                function DatabaseDescriptionProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                DatabaseDescriptionProto.prototype.databaseName = null;
                DatabaseDescriptionProto.prototype.databaseUrl = "";

                var $types = {
                    0 : "keyhole.dbroot.StringIdOrValueProto"
                };
                $lazyTypes.push($types);

                DatabaseDescriptionProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.DatabaseDescriptionProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.databaseName = $types[0].decode(reader, reader.uint32());
                                break;
                            case 2:
                                message.databaseUrl = reader.string();
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                DatabaseDescriptionProto.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.databaseName !== undefined && message.databaseName !== null) {
                        var error = $types[0].verify(message.databaseName);
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
                    if (object.databaseName !== undefined && object.databaseName !== null) {
                        if (typeof object.databaseName !== "object")
                            throw TypeError(".keyhole.dbroot.DatabaseDescriptionProto.databaseName: object expected");
                        message.databaseName = $types[0].fromObject(object.databaseName);
                    }
                    if (object.databaseUrl !== undefined && object.databaseUrl !== null)
                        message.databaseUrl = String(object.databaseUrl);
                    return message;
                };

                DatabaseDescriptionProto.from = DatabaseDescriptionProto.fromObject;

                DatabaseDescriptionProto.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.databaseName = null;
                        object.databaseUrl = "";
                    }
                    if (message.databaseName !== undefined && message.databaseName !== null && message.hasOwnProperty("databaseName"))
                        object.databaseName = $types[0].toObject(message.databaseName, options);
                    if (message.databaseUrl !== undefined && message.databaseUrl !== null && message.hasOwnProperty("databaseUrl"))
                        object.databaseUrl = message.databaseUrl;
                    return object;
                };

                DatabaseDescriptionProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                DatabaseDescriptionProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return DatabaseDescriptionProto;
            })();

            dbroot.ConfigScriptProto = (function() {

                function ConfigScriptProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                ConfigScriptProto.prototype.scriptName = "";
                ConfigScriptProto.prototype.scriptData = "";

                ConfigScriptProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.ConfigScriptProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.scriptName = reader.string();
                                break;
                            case 2:
                                message.scriptData = reader.string();
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
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
                    if (object.scriptName !== undefined && object.scriptName !== null)
                        message.scriptName = String(object.scriptName);
                    if (object.scriptData !== undefined && object.scriptData !== null)
                        message.scriptData = String(object.scriptData);
                    return message;
                };

                ConfigScriptProto.from = ConfigScriptProto.fromObject;

                ConfigScriptProto.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.scriptName = "";
                        object.scriptData = "";
                    }
                    if (message.scriptName !== undefined && message.scriptName !== null && message.hasOwnProperty("scriptName"))
                        object.scriptName = message.scriptName;
                    if (message.scriptData !== undefined && message.scriptData !== null && message.hasOwnProperty("scriptData"))
                        object.scriptData = message.scriptData;
                    return object;
                };

                ConfigScriptProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                ConfigScriptProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return ConfigScriptProto;
            })();

            dbroot.SwoopParamsProto = (function() {

                function SwoopParamsProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                SwoopParamsProto.prototype.startDistInMeters = 0;

                SwoopParamsProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.SwoopParamsProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.startDistInMeters = reader.double();
                                break;
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
                    if (message.startDistInMeters !== undefined)
                        if (typeof message.startDistInMeters !== "number")
                            return "startDistInMeters: number expected";
                    return null;
                };

                SwoopParamsProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.SwoopParamsProto)
                        return object;
                    var message = new $root.keyhole.dbroot.SwoopParamsProto();
                    if (object.startDistInMeters !== undefined && object.startDistInMeters !== null)
                        message.startDistInMeters = Number(object.startDistInMeters);
                    return message;
                };

                SwoopParamsProto.from = SwoopParamsProto.fromObject;

                SwoopParamsProto.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults)
                        object.startDistInMeters = 0;
                    if (message.startDistInMeters !== undefined && message.startDistInMeters !== null && message.hasOwnProperty("startDistInMeters"))
                        object.startDistInMeters = message.startDistInMeters;
                    return object;
                };

                SwoopParamsProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                SwoopParamsProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return SwoopParamsProto;
            })();

            dbroot.PostingServerProto = (function() {

                function PostingServerProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                PostingServerProto.prototype.name = null;
                PostingServerProto.prototype.baseUrl = null;
                PostingServerProto.prototype.postWizardPath = null;
                PostingServerProto.prototype.fileSubmitPath = null;

                var $types = {
                    0 : "keyhole.dbroot.StringIdOrValueProto",
                    1 : "keyhole.dbroot.StringIdOrValueProto",
                    2 : "keyhole.dbroot.StringIdOrValueProto",
                    3 : "keyhole.dbroot.StringIdOrValueProto"
                };
                $lazyTypes.push($types);

                PostingServerProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.PostingServerProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.name = $types[0].decode(reader, reader.uint32());
                                break;
                            case 2:
                                message.baseUrl = $types[1].decode(reader, reader.uint32());
                                break;
                            case 3:
                                message.postWizardPath = $types[2].decode(reader, reader.uint32());
                                break;
                            case 4:
                                message.fileSubmitPath = $types[3].decode(reader, reader.uint32());
                                break;
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
                    if (message.name !== undefined && message.name !== null) {
                        var error = $types[0].verify(message.name);
                        if (error)
                            return "name." + error;
                    }
                    if (message.baseUrl !== undefined && message.baseUrl !== null) {
                        var error = $types[1].verify(message.baseUrl);
                        if (error)
                            return "baseUrl." + error;
                    }
                    if (message.postWizardPath !== undefined && message.postWizardPath !== null) {
                        var error = $types[2].verify(message.postWizardPath);
                        if (error)
                            return "postWizardPath." + error;
                    }
                    if (message.fileSubmitPath !== undefined && message.fileSubmitPath !== null) {
                        var error = $types[3].verify(message.fileSubmitPath);
                        if (error)
                            return "fileSubmitPath." + error;
                    }
                    return null;
                };

                PostingServerProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.PostingServerProto)
                        return object;
                    var message = new $root.keyhole.dbroot.PostingServerProto();
                    if (object.name !== undefined && object.name !== null) {
                        if (typeof object.name !== "object")
                            throw TypeError(".keyhole.dbroot.PostingServerProto.name: object expected");
                        message.name = $types[0].fromObject(object.name);
                    }
                    if (object.baseUrl !== undefined && object.baseUrl !== null) {
                        if (typeof object.baseUrl !== "object")
                            throw TypeError(".keyhole.dbroot.PostingServerProto.baseUrl: object expected");
                        message.baseUrl = $types[1].fromObject(object.baseUrl);
                    }
                    if (object.postWizardPath !== undefined && object.postWizardPath !== null) {
                        if (typeof object.postWizardPath !== "object")
                            throw TypeError(".keyhole.dbroot.PostingServerProto.postWizardPath: object expected");
                        message.postWizardPath = $types[2].fromObject(object.postWizardPath);
                    }
                    if (object.fileSubmitPath !== undefined && object.fileSubmitPath !== null) {
                        if (typeof object.fileSubmitPath !== "object")
                            throw TypeError(".keyhole.dbroot.PostingServerProto.fileSubmitPath: object expected");
                        message.fileSubmitPath = $types[3].fromObject(object.fileSubmitPath);
                    }
                    return message;
                };

                PostingServerProto.from = PostingServerProto.fromObject;

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
                    if (message.name !== undefined && message.name !== null && message.hasOwnProperty("name"))
                        object.name = $types[0].toObject(message.name, options);
                    if (message.baseUrl !== undefined && message.baseUrl !== null && message.hasOwnProperty("baseUrl"))
                        object.baseUrl = $types[1].toObject(message.baseUrl, options);
                    if (message.postWizardPath !== undefined && message.postWizardPath !== null && message.hasOwnProperty("postWizardPath"))
                        object.postWizardPath = $types[2].toObject(message.postWizardPath, options);
                    if (message.fileSubmitPath !== undefined && message.fileSubmitPath !== null && message.hasOwnProperty("fileSubmitPath"))
                        object.fileSubmitPath = $types[3].toObject(message.fileSubmitPath, options);
                    return object;
                };

                PostingServerProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                PostingServerProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return PostingServerProto;
            })();

            dbroot.PlanetaryDatabaseProto = (function() {

                function PlanetaryDatabaseProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                PlanetaryDatabaseProto.prototype.url = null;
                PlanetaryDatabaseProto.prototype.name = null;

                var $types = {
                    0 : "keyhole.dbroot.StringIdOrValueProto",
                    1 : "keyhole.dbroot.StringIdOrValueProto"
                };
                $lazyTypes.push($types);

                PlanetaryDatabaseProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.PlanetaryDatabaseProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.url = $types[0].decode(reader, reader.uint32());
                                break;
                            case 2:
                                message.name = $types[1].decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                PlanetaryDatabaseProto.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    var error = $types[0].verify(message.url);
                    if (error)
                        return "url." + error;
                    var error = $types[1].verify(message.name);
                    if (error)
                        return "name." + error;
                    return null;
                };

                PlanetaryDatabaseProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.PlanetaryDatabaseProto)
                        return object;
                    var message = new $root.keyhole.dbroot.PlanetaryDatabaseProto();
                    if (object.url !== undefined && object.url !== null) {
                        if (typeof object.url !== "object")
                            throw TypeError(".keyhole.dbroot.PlanetaryDatabaseProto.url: object expected");
                        message.url = $types[0].fromObject(object.url);
                    }
                    if (object.name !== undefined && object.name !== null) {
                        if (typeof object.name !== "object")
                            throw TypeError(".keyhole.dbroot.PlanetaryDatabaseProto.name: object expected");
                        message.name = $types[1].fromObject(object.name);
                    }
                    return message;
                };

                PlanetaryDatabaseProto.from = PlanetaryDatabaseProto.fromObject;

                PlanetaryDatabaseProto.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.url = null;
                        object.name = null;
                    }
                    if (message.url !== undefined && message.url !== null && message.hasOwnProperty("url"))
                        object.url = $types[0].toObject(message.url, options);
                    if (message.name !== undefined && message.name !== null && message.hasOwnProperty("name"))
                        object.name = $types[1].toObject(message.name, options);
                    return object;
                };

                PlanetaryDatabaseProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                PlanetaryDatabaseProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return PlanetaryDatabaseProto;
            })();

            dbroot.LogServerProto = (function() {

                function LogServerProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                LogServerProto.prototype.url = null;
                LogServerProto.prototype.enable = false;
                LogServerProto.prototype.throttlingFactor = 1;

                var $types = {
                    0 : "keyhole.dbroot.StringIdOrValueProto"
                };
                $lazyTypes.push($types);

                LogServerProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.LogServerProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.url = $types[0].decode(reader, reader.uint32());
                                break;
                            case 2:
                                message.enable = reader.bool();
                                break;
                            case 3:
                                message.throttlingFactor = reader.int32();
                                break;
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
                    if (message.url !== undefined && message.url !== null) {
                        var error = $types[0].verify(message.url);
                        if (error)
                            return "url." + error;
                    }
                    if (message.enable !== undefined)
                        if (typeof message.enable !== "boolean")
                            return "enable: boolean expected";
                    if (message.throttlingFactor !== undefined)
                        if (!$util.isInteger(message.throttlingFactor))
                            return "throttlingFactor: integer expected";
                    return null;
                };

                LogServerProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.LogServerProto)
                        return object;
                    var message = new $root.keyhole.dbroot.LogServerProto();
                    if (object.url !== undefined && object.url !== null) {
                        if (typeof object.url !== "object")
                            throw TypeError(".keyhole.dbroot.LogServerProto.url: object expected");
                        message.url = $types[0].fromObject(object.url);
                    }
                    if (object.enable !== undefined && object.enable !== null)
                        message.enable = Boolean(object.enable);
                    if (object.throttlingFactor !== undefined && object.throttlingFactor !== null)
                        message.throttlingFactor = object.throttlingFactor | 0;
                    return message;
                };

                LogServerProto.from = LogServerProto.fromObject;

                LogServerProto.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.url = null;
                        object.enable = false;
                        object.throttlingFactor = 1;
                    }
                    if (message.url !== undefined && message.url !== null && message.hasOwnProperty("url"))
                        object.url = $types[0].toObject(message.url, options);
                    if (message.enable !== undefined && message.enable !== null && message.hasOwnProperty("enable"))
                        object.enable = message.enable;
                    if (message.throttlingFactor !== undefined && message.throttlingFactor !== null && message.hasOwnProperty("throttlingFactor"))
                        object.throttlingFactor = message.throttlingFactor;
                    return object;
                };

                LogServerProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                LogServerProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return LogServerProto;
            })();

            dbroot.EndSnippetProto = (function() {

                function EndSnippetProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
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

                var $types = {
                    0 : "keyhole.dbroot.PlanetModelProto",
                    1 : "keyhole.dbroot.StringIdOrValueProto",
                    3 : "keyhole.dbroot.MfeDomainFeaturesProto",
                    6 : "keyhole.dbroot.StringIdOrValueProto",
                    9 : "keyhole.dbroot.StringIdOrValueProto",
                    10 : "keyhole.dbroot.StringIdOrValueProto",
                    12 : "keyhole.dbroot.StringIdOrValueProto",
                    14 : "keyhole.dbroot.StringIdOrValueProto",
                    15 : "keyhole.dbroot.StringIdOrValueProto",
                    16 : "keyhole.dbroot.StringIdOrValueProto",
                    17 : "keyhole.dbroot.StringIdOrValueProto",
                    18 : "keyhole.dbroot.StringIdOrValueProto",
                    19 : "keyhole.dbroot.StringIdOrValueProto",
                    20 : "keyhole.dbroot.StringIdOrValueProto",
                    21 : "keyhole.dbroot.StringIdOrValueProto",
                    22 : "keyhole.dbroot.StringIdOrValueProto",
                    23 : "keyhole.dbroot.StringIdOrValueProto",
                    24 : "keyhole.dbroot.StringIdOrValueProto",
                    25 : "keyhole.dbroot.StringIdOrValueProto",
                    26 : "keyhole.dbroot.StringIdOrValueProto",
                    27 : "keyhole.dbroot.StringIdOrValueProto",
                    28 : "keyhole.dbroot.StringIdOrValueProto",
                    29 : "keyhole.dbroot.StringIdOrValueProto",
                    30 : "keyhole.dbroot.StringIdOrValueProto",
                    33 : "keyhole.dbroot.StringIdOrValueProto",
                    35 : "keyhole.dbroot.StringIdOrValueProto",
                    36 : "keyhole.dbroot.ClientOptionsProto",
                    37 : "keyhole.dbroot.FetchingOptionsProto",
                    38 : "keyhole.dbroot.TimeMachineOptionsProto",
                    39 : "keyhole.dbroot.CSIOptionsProto",
                    40 : "keyhole.dbroot.SearchTabProto",
                    41 : "keyhole.dbroot.CobrandProto",
                    42 : "keyhole.dbroot.DatabaseDescriptionProto",
                    43 : "keyhole.dbroot.ConfigScriptProto",
                    44 : "keyhole.dbroot.StringIdOrValueProto",
                    45 : "keyhole.dbroot.SwoopParamsProto",
                    46 : "keyhole.dbroot.PostingServerProto",
                    47 : "keyhole.dbroot.PostingServerProto",
                    48 : "keyhole.dbroot.PlanetaryDatabaseProto",
                    49 : "keyhole.dbroot.LogServerProto",
                    50 : "keyhole.dbroot.AutopiaOptionsProto",
                    51 : "keyhole.dbroot.EndSnippetProto.SearchConfigProto",
                    52 : "keyhole.dbroot.EndSnippetProto.SearchInfoProto",
                    55 : "keyhole.dbroot.StringIdOrValueProto",
                    56 : "keyhole.dbroot.StringIdOrValueProto",
                    57 : "keyhole.dbroot.StringIdOrValueProto",
                    58 : "keyhole.dbroot.StringIdOrValueProto",
                    59 : "keyhole.dbroot.StringIdOrValueProto",
                    61 : "keyhole.dbroot.EndSnippetProto.RockTreeDataProto",
                    62 : "keyhole.dbroot.EndSnippetProto.FilmstripConfigProto",
                    64 : "keyhole.dbroot.StringIdOrValueProto",
                    65 : "keyhole.dbroot.StringIdOrValueProto",
                    66 : "keyhole.dbroot.EndSnippetProto.StarDataProto",
                    67 : "keyhole.dbroot.StringIdOrValueProto",
                    68 : "keyhole.dbroot.StringIdOrValueProto"
                };
                $lazyTypes.push($types);

                EndSnippetProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.EndSnippetProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.model = $types[0].decode(reader, reader.uint32());
                                break;
                            case 2:
                                message.authServerUrl = $types[1].decode(reader, reader.uint32());
                                break;
                            case 3:
                                message.disableAuthentication = reader.bool();
                                break;
                            case 4:
                                if (!(message.mfeDomains && message.mfeDomains.length))
                                    message.mfeDomains = [];
                                message.mfeDomains.push($types[3].decode(reader, reader.uint32()));
                                break;
                            case 5:
                                message.mfeLangParam = reader.string();
                                break;
                            case 6:
                                message.adsUrlPatterns = reader.string();
                                break;
                            case 7:
                                message.reverseGeocoderUrl = $types[6].decode(reader, reader.uint32());
                                break;
                            case 8:
                                message.reverseGeocoderProtocolVersion = reader.int32();
                                break;
                            case 9:
                                message.skyDatabaseIsAvailable = reader.bool();
                                break;
                            case 10:
                                message.skyDatabaseUrl = $types[9].decode(reader, reader.uint32());
                                break;
                            case 11:
                                message.defaultWebPageIntlUrl = $types[10].decode(reader, reader.uint32());
                                break;
                            case 12:
                                message.numStartUpTips = reader.int32();
                                break;
                            case 13:
                                message.startUpTipsUrl = $types[12].decode(reader, reader.uint32());
                                break;
                            case 51:
                                message.numProStartUpTips = reader.int32();
                                break;
                            case 52:
                                message.proStartUpTipsUrl = $types[14].decode(reader, reader.uint32());
                                break;
                            case 64:
                                message.startupTipsIntlUrl = $types[15].decode(reader, reader.uint32());
                                break;
                            case 14:
                                message.userGuideIntlUrl = $types[16].decode(reader, reader.uint32());
                                break;
                            case 15:
                                message.supportCenterIntlUrl = $types[17].decode(reader, reader.uint32());
                                break;
                            case 16:
                                message.businessListingIntlUrl = $types[18].decode(reader, reader.uint32());
                                break;
                            case 17:
                                message.supportAnswerIntlUrl = $types[19].decode(reader, reader.uint32());
                                break;
                            case 18:
                                message.supportTopicIntlUrl = $types[20].decode(reader, reader.uint32());
                                break;
                            case 19:
                                message.supportRequestIntlUrl = $types[21].decode(reader, reader.uint32());
                                break;
                            case 20:
                                message.earthIntlUrl = $types[22].decode(reader, reader.uint32());
                                break;
                            case 21:
                                message.addContentUrl = $types[23].decode(reader, reader.uint32());
                                break;
                            case 22:
                                message.sketchupNotInstalledUrl = $types[24].decode(reader, reader.uint32());
                                break;
                            case 23:
                                message.sketchupErrorUrl = $types[25].decode(reader, reader.uint32());
                                break;
                            case 24:
                                message.freeLicenseUrl = $types[26].decode(reader, reader.uint32());
                                break;
                            case 25:
                                message.proLicenseUrl = $types[27].decode(reader, reader.uint32());
                                break;
                            case 48:
                                message.tutorialUrl = $types[28].decode(reader, reader.uint32());
                                break;
                            case 49:
                                message.keyboardShortcutsUrl = $types[29].decode(reader, reader.uint32());
                                break;
                            case 50:
                                message.releaseNotesUrl = $types[30].decode(reader, reader.uint32());
                                break;
                            case 26:
                                message.hideUserData = reader.bool();
                                break;
                            case 27:
                                message.useGeLogo = reader.bool();
                                break;
                            case 28:
                                message.dioramaDescriptionUrlBase = $types[33].decode(reader, reader.uint32());
                                break;
                            case 29:
                                message.dioramaDefaultColor = reader.uint32();
                                break;
                            case 53:
                                message.dioramaBlacklistUrl = $types[35].decode(reader, reader.uint32());
                                break;
                            case 30:
                                message.clientOptions = $types[36].decode(reader, reader.uint32());
                                break;
                            case 31:
                                message.fetchingOptions = $types[37].decode(reader, reader.uint32());
                                break;
                            case 32:
                                message.timeMachineOptions = $types[38].decode(reader, reader.uint32());
                                break;
                            case 33:
                                message.csiOptions = $types[39].decode(reader, reader.uint32());
                                break;
                            case 34:
                                if (!(message.searchTab && message.searchTab.length))
                                    message.searchTab = [];
                                message.searchTab.push($types[40].decode(reader, reader.uint32()));
                                break;
                            case 35:
                                if (!(message.cobrandInfo && message.cobrandInfo.length))
                                    message.cobrandInfo = [];
                                message.cobrandInfo.push($types[41].decode(reader, reader.uint32()));
                                break;
                            case 36:
                                if (!(message.validDatabase && message.validDatabase.length))
                                    message.validDatabase = [];
                                message.validDatabase.push($types[42].decode(reader, reader.uint32()));
                                break;
                            case 37:
                                if (!(message.configScript && message.configScript.length))
                                    message.configScript = [];
                                message.configScript.push($types[43].decode(reader, reader.uint32()));
                                break;
                            case 38:
                                message.deauthServerUrl = $types[44].decode(reader, reader.uint32());
                                break;
                            case 39:
                                message.swoopParameters = $types[45].decode(reader, reader.uint32());
                                break;
                            case 40:
                                message.bbsServerInfo = $types[46].decode(reader, reader.uint32());
                                break;
                            case 41:
                                message.dataErrorServerInfo = $types[47].decode(reader, reader.uint32());
                                break;
                            case 42:
                                if (!(message.planetaryDatabase && message.planetaryDatabase.length))
                                    message.planetaryDatabase = [];
                                message.planetaryDatabase.push($types[48].decode(reader, reader.uint32()));
                                break;
                            case 43:
                                message.logServer = $types[49].decode(reader, reader.uint32());
                                break;
                            case 44:
                                message.autopiaOptions = $types[50].decode(reader, reader.uint32());
                                break;
                            case 54:
                                message.searchConfig = $types[51].decode(reader, reader.uint32());
                                break;
                            case 45:
                                message.searchInfo = $types[52].decode(reader, reader.uint32());
                                break;
                            case 46:
                                message.elevationServiceBaseUrl = reader.string();
                                break;
                            case 47:
                                message.elevationProfileQueryDelay = reader.int32();
                                break;
                            case 55:
                                message.proUpgradeUrl = $types[55].decode(reader, reader.uint32());
                                break;
                            case 56:
                                message.earthCommunityUrl = $types[56].decode(reader, reader.uint32());
                                break;
                            case 57:
                                message.googleMapsUrl = $types[57].decode(reader, reader.uint32());
                                break;
                            case 58:
                                message.sharingUrl = $types[58].decode(reader, reader.uint32());
                                break;
                            case 59:
                                message.privacyPolicyUrl = $types[59].decode(reader, reader.uint32());
                                break;
                            case 60:
                                message.doGplusUserCheck = reader.bool();
                                break;
                            case 61:
                                message.rocktreeDataProto = $types[61].decode(reader, reader.uint32());
                                break;
                            case 62:
                                if (!(message.filmstripConfig && message.filmstripConfig.length))
                                    message.filmstripConfig = [];
                                message.filmstripConfig.push($types[62].decode(reader, reader.uint32()));
                                break;
                            case 63:
                                message.showSigninButton = reader.bool();
                                break;
                            case 65:
                                message.proMeasureUpsellUrl = $types[64].decode(reader, reader.uint32());
                                break;
                            case 66:
                                message.proPrintUpsellUrl = $types[65].decode(reader, reader.uint32());
                                break;
                            case 67:
                                message.starDataProto = $types[66].decode(reader, reader.uint32());
                                break;
                            case 68:
                                message.feedbackUrl = $types[67].decode(reader, reader.uint32());
                                break;
                            case 69:
                                message.oauth2LoginUrl = $types[68].decode(reader, reader.uint32());
                                break;
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
                    if (message.model !== undefined && message.model !== null) {
                        var error = $types[0].verify(message.model);
                        if (error)
                            return "model." + error;
                    }
                    if (message.authServerUrl !== undefined && message.authServerUrl !== null) {
                        var error = $types[1].verify(message.authServerUrl);
                        if (error)
                            return "authServerUrl." + error;
                    }
                    if (message.disableAuthentication !== undefined)
                        if (typeof message.disableAuthentication !== "boolean")
                            return "disableAuthentication: boolean expected";
                    if (message.mfeDomains !== undefined) {
                        if (!Array.isArray(message.mfeDomains))
                            return "mfeDomains: array expected";
                        for (var i = 0; i < message.mfeDomains.length; ++i) {
                            var error = $types[3].verify(message.mfeDomains[i]);
                            if (error)
                                return "mfeDomains." + error;
                        }
                    }
                    if (message.mfeLangParam !== undefined)
                        if (!$util.isString(message.mfeLangParam))
                            return "mfeLangParam: string expected";
                    if (message.adsUrlPatterns !== undefined)
                        if (!$util.isString(message.adsUrlPatterns))
                            return "adsUrlPatterns: string expected";
                    if (message.reverseGeocoderUrl !== undefined && message.reverseGeocoderUrl !== null) {
                        var error = $types[6].verify(message.reverseGeocoderUrl);
                        if (error)
                            return "reverseGeocoderUrl." + error;
                    }
                    if (message.reverseGeocoderProtocolVersion !== undefined)
                        if (!$util.isInteger(message.reverseGeocoderProtocolVersion))
                            return "reverseGeocoderProtocolVersion: integer expected";
                    if (message.skyDatabaseIsAvailable !== undefined)
                        if (typeof message.skyDatabaseIsAvailable !== "boolean")
                            return "skyDatabaseIsAvailable: boolean expected";
                    if (message.skyDatabaseUrl !== undefined && message.skyDatabaseUrl !== null) {
                        var error = $types[9].verify(message.skyDatabaseUrl);
                        if (error)
                            return "skyDatabaseUrl." + error;
                    }
                    if (message.defaultWebPageIntlUrl !== undefined && message.defaultWebPageIntlUrl !== null) {
                        var error = $types[10].verify(message.defaultWebPageIntlUrl);
                        if (error)
                            return "defaultWebPageIntlUrl." + error;
                    }
                    if (message.numStartUpTips !== undefined)
                        if (!$util.isInteger(message.numStartUpTips))
                            return "numStartUpTips: integer expected";
                    if (message.startUpTipsUrl !== undefined && message.startUpTipsUrl !== null) {
                        var error = $types[12].verify(message.startUpTipsUrl);
                        if (error)
                            return "startUpTipsUrl." + error;
                    }
                    if (message.numProStartUpTips !== undefined)
                        if (!$util.isInteger(message.numProStartUpTips))
                            return "numProStartUpTips: integer expected";
                    if (message.proStartUpTipsUrl !== undefined && message.proStartUpTipsUrl !== null) {
                        var error = $types[14].verify(message.proStartUpTipsUrl);
                        if (error)
                            return "proStartUpTipsUrl." + error;
                    }
                    if (message.startupTipsIntlUrl !== undefined && message.startupTipsIntlUrl !== null) {
                        var error = $types[15].verify(message.startupTipsIntlUrl);
                        if (error)
                            return "startupTipsIntlUrl." + error;
                    }
                    if (message.userGuideIntlUrl !== undefined && message.userGuideIntlUrl !== null) {
                        var error = $types[16].verify(message.userGuideIntlUrl);
                        if (error)
                            return "userGuideIntlUrl." + error;
                    }
                    if (message.supportCenterIntlUrl !== undefined && message.supportCenterIntlUrl !== null) {
                        var error = $types[17].verify(message.supportCenterIntlUrl);
                        if (error)
                            return "supportCenterIntlUrl." + error;
                    }
                    if (message.businessListingIntlUrl !== undefined && message.businessListingIntlUrl !== null) {
                        var error = $types[18].verify(message.businessListingIntlUrl);
                        if (error)
                            return "businessListingIntlUrl." + error;
                    }
                    if (message.supportAnswerIntlUrl !== undefined && message.supportAnswerIntlUrl !== null) {
                        var error = $types[19].verify(message.supportAnswerIntlUrl);
                        if (error)
                            return "supportAnswerIntlUrl." + error;
                    }
                    if (message.supportTopicIntlUrl !== undefined && message.supportTopicIntlUrl !== null) {
                        var error = $types[20].verify(message.supportTopicIntlUrl);
                        if (error)
                            return "supportTopicIntlUrl." + error;
                    }
                    if (message.supportRequestIntlUrl !== undefined && message.supportRequestIntlUrl !== null) {
                        var error = $types[21].verify(message.supportRequestIntlUrl);
                        if (error)
                            return "supportRequestIntlUrl." + error;
                    }
                    if (message.earthIntlUrl !== undefined && message.earthIntlUrl !== null) {
                        var error = $types[22].verify(message.earthIntlUrl);
                        if (error)
                            return "earthIntlUrl." + error;
                    }
                    if (message.addContentUrl !== undefined && message.addContentUrl !== null) {
                        var error = $types[23].verify(message.addContentUrl);
                        if (error)
                            return "addContentUrl." + error;
                    }
                    if (message.sketchupNotInstalledUrl !== undefined && message.sketchupNotInstalledUrl !== null) {
                        var error = $types[24].verify(message.sketchupNotInstalledUrl);
                        if (error)
                            return "sketchupNotInstalledUrl." + error;
                    }
                    if (message.sketchupErrorUrl !== undefined && message.sketchupErrorUrl !== null) {
                        var error = $types[25].verify(message.sketchupErrorUrl);
                        if (error)
                            return "sketchupErrorUrl." + error;
                    }
                    if (message.freeLicenseUrl !== undefined && message.freeLicenseUrl !== null) {
                        var error = $types[26].verify(message.freeLicenseUrl);
                        if (error)
                            return "freeLicenseUrl." + error;
                    }
                    if (message.proLicenseUrl !== undefined && message.proLicenseUrl !== null) {
                        var error = $types[27].verify(message.proLicenseUrl);
                        if (error)
                            return "proLicenseUrl." + error;
                    }
                    if (message.tutorialUrl !== undefined && message.tutorialUrl !== null) {
                        var error = $types[28].verify(message.tutorialUrl);
                        if (error)
                            return "tutorialUrl." + error;
                    }
                    if (message.keyboardShortcutsUrl !== undefined && message.keyboardShortcutsUrl !== null) {
                        var error = $types[29].verify(message.keyboardShortcutsUrl);
                        if (error)
                            return "keyboardShortcutsUrl." + error;
                    }
                    if (message.releaseNotesUrl !== undefined && message.releaseNotesUrl !== null) {
                        var error = $types[30].verify(message.releaseNotesUrl);
                        if (error)
                            return "releaseNotesUrl." + error;
                    }
                    if (message.hideUserData !== undefined)
                        if (typeof message.hideUserData !== "boolean")
                            return "hideUserData: boolean expected";
                    if (message.useGeLogo !== undefined)
                        if (typeof message.useGeLogo !== "boolean")
                            return "useGeLogo: boolean expected";
                    if (message.dioramaDescriptionUrlBase !== undefined && message.dioramaDescriptionUrlBase !== null) {
                        var error = $types[33].verify(message.dioramaDescriptionUrlBase);
                        if (error)
                            return "dioramaDescriptionUrlBase." + error;
                    }
                    if (message.dioramaDefaultColor !== undefined)
                        if (!$util.isInteger(message.dioramaDefaultColor))
                            return "dioramaDefaultColor: integer expected";
                    if (message.dioramaBlacklistUrl !== undefined && message.dioramaBlacklistUrl !== null) {
                        var error = $types[35].verify(message.dioramaBlacklistUrl);
                        if (error)
                            return "dioramaBlacklistUrl." + error;
                    }
                    if (message.clientOptions !== undefined && message.clientOptions !== null) {
                        var error = $types[36].verify(message.clientOptions);
                        if (error)
                            return "clientOptions." + error;
                    }
                    if (message.fetchingOptions !== undefined && message.fetchingOptions !== null) {
                        var error = $types[37].verify(message.fetchingOptions);
                        if (error)
                            return "fetchingOptions." + error;
                    }
                    if (message.timeMachineOptions !== undefined && message.timeMachineOptions !== null) {
                        var error = $types[38].verify(message.timeMachineOptions);
                        if (error)
                            return "timeMachineOptions." + error;
                    }
                    if (message.csiOptions !== undefined && message.csiOptions !== null) {
                        var error = $types[39].verify(message.csiOptions);
                        if (error)
                            return "csiOptions." + error;
                    }
                    if (message.searchTab !== undefined) {
                        if (!Array.isArray(message.searchTab))
                            return "searchTab: array expected";
                        for (var i = 0; i < message.searchTab.length; ++i) {
                            var error = $types[40].verify(message.searchTab[i]);
                            if (error)
                                return "searchTab." + error;
                        }
                    }
                    if (message.cobrandInfo !== undefined) {
                        if (!Array.isArray(message.cobrandInfo))
                            return "cobrandInfo: array expected";
                        for (var i = 0; i < message.cobrandInfo.length; ++i) {
                            var error = $types[41].verify(message.cobrandInfo[i]);
                            if (error)
                                return "cobrandInfo." + error;
                        }
                    }
                    if (message.validDatabase !== undefined) {
                        if (!Array.isArray(message.validDatabase))
                            return "validDatabase: array expected";
                        for (var i = 0; i < message.validDatabase.length; ++i) {
                            var error = $types[42].verify(message.validDatabase[i]);
                            if (error)
                                return "validDatabase." + error;
                        }
                    }
                    if (message.configScript !== undefined) {
                        if (!Array.isArray(message.configScript))
                            return "configScript: array expected";
                        for (var i = 0; i < message.configScript.length; ++i) {
                            var error = $types[43].verify(message.configScript[i]);
                            if (error)
                                return "configScript." + error;
                        }
                    }
                    if (message.deauthServerUrl !== undefined && message.deauthServerUrl !== null) {
                        var error = $types[44].verify(message.deauthServerUrl);
                        if (error)
                            return "deauthServerUrl." + error;
                    }
                    if (message.swoopParameters !== undefined && message.swoopParameters !== null) {
                        var error = $types[45].verify(message.swoopParameters);
                        if (error)
                            return "swoopParameters." + error;
                    }
                    if (message.bbsServerInfo !== undefined && message.bbsServerInfo !== null) {
                        var error = $types[46].verify(message.bbsServerInfo);
                        if (error)
                            return "bbsServerInfo." + error;
                    }
                    if (message.dataErrorServerInfo !== undefined && message.dataErrorServerInfo !== null) {
                        var error = $types[47].verify(message.dataErrorServerInfo);
                        if (error)
                            return "dataErrorServerInfo." + error;
                    }
                    if (message.planetaryDatabase !== undefined) {
                        if (!Array.isArray(message.planetaryDatabase))
                            return "planetaryDatabase: array expected";
                        for (var i = 0; i < message.planetaryDatabase.length; ++i) {
                            var error = $types[48].verify(message.planetaryDatabase[i]);
                            if (error)
                                return "planetaryDatabase." + error;
                        }
                    }
                    if (message.logServer !== undefined && message.logServer !== null) {
                        var error = $types[49].verify(message.logServer);
                        if (error)
                            return "logServer." + error;
                    }
                    if (message.autopiaOptions !== undefined && message.autopiaOptions !== null) {
                        var error = $types[50].verify(message.autopiaOptions);
                        if (error)
                            return "autopiaOptions." + error;
                    }
                    if (message.searchConfig !== undefined && message.searchConfig !== null) {
                        var error = $types[51].verify(message.searchConfig);
                        if (error)
                            return "searchConfig." + error;
                    }
                    if (message.searchInfo !== undefined && message.searchInfo !== null) {
                        var error = $types[52].verify(message.searchInfo);
                        if (error)
                            return "searchInfo." + error;
                    }
                    if (message.elevationServiceBaseUrl !== undefined)
                        if (!$util.isString(message.elevationServiceBaseUrl))
                            return "elevationServiceBaseUrl: string expected";
                    if (message.elevationProfileQueryDelay !== undefined)
                        if (!$util.isInteger(message.elevationProfileQueryDelay))
                            return "elevationProfileQueryDelay: integer expected";
                    if (message.proUpgradeUrl !== undefined && message.proUpgradeUrl !== null) {
                        var error = $types[55].verify(message.proUpgradeUrl);
                        if (error)
                            return "proUpgradeUrl." + error;
                    }
                    if (message.earthCommunityUrl !== undefined && message.earthCommunityUrl !== null) {
                        var error = $types[56].verify(message.earthCommunityUrl);
                        if (error)
                            return "earthCommunityUrl." + error;
                    }
                    if (message.googleMapsUrl !== undefined && message.googleMapsUrl !== null) {
                        var error = $types[57].verify(message.googleMapsUrl);
                        if (error)
                            return "googleMapsUrl." + error;
                    }
                    if (message.sharingUrl !== undefined && message.sharingUrl !== null) {
                        var error = $types[58].verify(message.sharingUrl);
                        if (error)
                            return "sharingUrl." + error;
                    }
                    if (message.privacyPolicyUrl !== undefined && message.privacyPolicyUrl !== null) {
                        var error = $types[59].verify(message.privacyPolicyUrl);
                        if (error)
                            return "privacyPolicyUrl." + error;
                    }
                    if (message.doGplusUserCheck !== undefined)
                        if (typeof message.doGplusUserCheck !== "boolean")
                            return "doGplusUserCheck: boolean expected";
                    if (message.rocktreeDataProto !== undefined && message.rocktreeDataProto !== null) {
                        var error = $types[61].verify(message.rocktreeDataProto);
                        if (error)
                            return "rocktreeDataProto." + error;
                    }
                    if (message.filmstripConfig !== undefined) {
                        if (!Array.isArray(message.filmstripConfig))
                            return "filmstripConfig: array expected";
                        for (var i = 0; i < message.filmstripConfig.length; ++i) {
                            var error = $types[62].verify(message.filmstripConfig[i]);
                            if (error)
                                return "filmstripConfig." + error;
                        }
                    }
                    if (message.showSigninButton !== undefined)
                        if (typeof message.showSigninButton !== "boolean")
                            return "showSigninButton: boolean expected";
                    if (message.proMeasureUpsellUrl !== undefined && message.proMeasureUpsellUrl !== null) {
                        var error = $types[64].verify(message.proMeasureUpsellUrl);
                        if (error)
                            return "proMeasureUpsellUrl." + error;
                    }
                    if (message.proPrintUpsellUrl !== undefined && message.proPrintUpsellUrl !== null) {
                        var error = $types[65].verify(message.proPrintUpsellUrl);
                        if (error)
                            return "proPrintUpsellUrl." + error;
                    }
                    if (message.starDataProto !== undefined && message.starDataProto !== null) {
                        var error = $types[66].verify(message.starDataProto);
                        if (error)
                            return "starDataProto." + error;
                    }
                    if (message.feedbackUrl !== undefined && message.feedbackUrl !== null) {
                        var error = $types[67].verify(message.feedbackUrl);
                        if (error)
                            return "feedbackUrl." + error;
                    }
                    if (message.oauth2LoginUrl !== undefined && message.oauth2LoginUrl !== null) {
                        var error = $types[68].verify(message.oauth2LoginUrl);
                        if (error)
                            return "oauth2LoginUrl." + error;
                    }
                    return null;
                };

                EndSnippetProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.EndSnippetProto)
                        return object;
                    var message = new $root.keyhole.dbroot.EndSnippetProto();
                    if (object.model !== undefined && object.model !== null) {
                        if (typeof object.model !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.model: object expected");
                        message.model = $types[0].fromObject(object.model);
                    }
                    if (object.authServerUrl !== undefined && object.authServerUrl !== null) {
                        if (typeof object.authServerUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.authServerUrl: object expected");
                        message.authServerUrl = $types[1].fromObject(object.authServerUrl);
                    }
                    if (object.disableAuthentication !== undefined && object.disableAuthentication !== null)
                        message.disableAuthentication = Boolean(object.disableAuthentication);
                    if (object.mfeDomains) {
                        if (!Array.isArray(object.mfeDomains))
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.mfeDomains: array expected");
                        message.mfeDomains = [];
                        for (var i = 0; i < object.mfeDomains.length; ++i) {
                            if (typeof object.mfeDomains[i] !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.mfeDomains: object expected");
                            message.mfeDomains[i] = $types[3].fromObject(object.mfeDomains[i]);
                        }
                    }
                    if (object.mfeLangParam !== undefined && object.mfeLangParam !== null)
                        message.mfeLangParam = String(object.mfeLangParam);
                    if (object.adsUrlPatterns !== undefined && object.adsUrlPatterns !== null)
                        message.adsUrlPatterns = String(object.adsUrlPatterns);
                    if (object.reverseGeocoderUrl !== undefined && object.reverseGeocoderUrl !== null) {
                        if (typeof object.reverseGeocoderUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.reverseGeocoderUrl: object expected");
                        message.reverseGeocoderUrl = $types[6].fromObject(object.reverseGeocoderUrl);
                    }
                    if (object.reverseGeocoderProtocolVersion !== undefined && object.reverseGeocoderProtocolVersion !== null)
                        message.reverseGeocoderProtocolVersion = object.reverseGeocoderProtocolVersion | 0;
                    if (object.skyDatabaseIsAvailable !== undefined && object.skyDatabaseIsAvailable !== null)
                        message.skyDatabaseIsAvailable = Boolean(object.skyDatabaseIsAvailable);
                    if (object.skyDatabaseUrl !== undefined && object.skyDatabaseUrl !== null) {
                        if (typeof object.skyDatabaseUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.skyDatabaseUrl: object expected");
                        message.skyDatabaseUrl = $types[9].fromObject(object.skyDatabaseUrl);
                    }
                    if (object.defaultWebPageIntlUrl !== undefined && object.defaultWebPageIntlUrl !== null) {
                        if (typeof object.defaultWebPageIntlUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.defaultWebPageIntlUrl: object expected");
                        message.defaultWebPageIntlUrl = $types[10].fromObject(object.defaultWebPageIntlUrl);
                    }
                    if (object.numStartUpTips !== undefined && object.numStartUpTips !== null)
                        message.numStartUpTips = object.numStartUpTips | 0;
                    if (object.startUpTipsUrl !== undefined && object.startUpTipsUrl !== null) {
                        if (typeof object.startUpTipsUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.startUpTipsUrl: object expected");
                        message.startUpTipsUrl = $types[12].fromObject(object.startUpTipsUrl);
                    }
                    if (object.numProStartUpTips !== undefined && object.numProStartUpTips !== null)
                        message.numProStartUpTips = object.numProStartUpTips | 0;
                    if (object.proStartUpTipsUrl !== undefined && object.proStartUpTipsUrl !== null) {
                        if (typeof object.proStartUpTipsUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.proStartUpTipsUrl: object expected");
                        message.proStartUpTipsUrl = $types[14].fromObject(object.proStartUpTipsUrl);
                    }
                    if (object.startupTipsIntlUrl !== undefined && object.startupTipsIntlUrl !== null) {
                        if (typeof object.startupTipsIntlUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.startupTipsIntlUrl: object expected");
                        message.startupTipsIntlUrl = $types[15].fromObject(object.startupTipsIntlUrl);
                    }
                    if (object.userGuideIntlUrl !== undefined && object.userGuideIntlUrl !== null) {
                        if (typeof object.userGuideIntlUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.userGuideIntlUrl: object expected");
                        message.userGuideIntlUrl = $types[16].fromObject(object.userGuideIntlUrl);
                    }
                    if (object.supportCenterIntlUrl !== undefined && object.supportCenterIntlUrl !== null) {
                        if (typeof object.supportCenterIntlUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.supportCenterIntlUrl: object expected");
                        message.supportCenterIntlUrl = $types[17].fromObject(object.supportCenterIntlUrl);
                    }
                    if (object.businessListingIntlUrl !== undefined && object.businessListingIntlUrl !== null) {
                        if (typeof object.businessListingIntlUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.businessListingIntlUrl: object expected");
                        message.businessListingIntlUrl = $types[18].fromObject(object.businessListingIntlUrl);
                    }
                    if (object.supportAnswerIntlUrl !== undefined && object.supportAnswerIntlUrl !== null) {
                        if (typeof object.supportAnswerIntlUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.supportAnswerIntlUrl: object expected");
                        message.supportAnswerIntlUrl = $types[19].fromObject(object.supportAnswerIntlUrl);
                    }
                    if (object.supportTopicIntlUrl !== undefined && object.supportTopicIntlUrl !== null) {
                        if (typeof object.supportTopicIntlUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.supportTopicIntlUrl: object expected");
                        message.supportTopicIntlUrl = $types[20].fromObject(object.supportTopicIntlUrl);
                    }
                    if (object.supportRequestIntlUrl !== undefined && object.supportRequestIntlUrl !== null) {
                        if (typeof object.supportRequestIntlUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.supportRequestIntlUrl: object expected");
                        message.supportRequestIntlUrl = $types[21].fromObject(object.supportRequestIntlUrl);
                    }
                    if (object.earthIntlUrl !== undefined && object.earthIntlUrl !== null) {
                        if (typeof object.earthIntlUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.earthIntlUrl: object expected");
                        message.earthIntlUrl = $types[22].fromObject(object.earthIntlUrl);
                    }
                    if (object.addContentUrl !== undefined && object.addContentUrl !== null) {
                        if (typeof object.addContentUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.addContentUrl: object expected");
                        message.addContentUrl = $types[23].fromObject(object.addContentUrl);
                    }
                    if (object.sketchupNotInstalledUrl !== undefined && object.sketchupNotInstalledUrl !== null) {
                        if (typeof object.sketchupNotInstalledUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.sketchupNotInstalledUrl: object expected");
                        message.sketchupNotInstalledUrl = $types[24].fromObject(object.sketchupNotInstalledUrl);
                    }
                    if (object.sketchupErrorUrl !== undefined && object.sketchupErrorUrl !== null) {
                        if (typeof object.sketchupErrorUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.sketchupErrorUrl: object expected");
                        message.sketchupErrorUrl = $types[25].fromObject(object.sketchupErrorUrl);
                    }
                    if (object.freeLicenseUrl !== undefined && object.freeLicenseUrl !== null) {
                        if (typeof object.freeLicenseUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.freeLicenseUrl: object expected");
                        message.freeLicenseUrl = $types[26].fromObject(object.freeLicenseUrl);
                    }
                    if (object.proLicenseUrl !== undefined && object.proLicenseUrl !== null) {
                        if (typeof object.proLicenseUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.proLicenseUrl: object expected");
                        message.proLicenseUrl = $types[27].fromObject(object.proLicenseUrl);
                    }
                    if (object.tutorialUrl !== undefined && object.tutorialUrl !== null) {
                        if (typeof object.tutorialUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.tutorialUrl: object expected");
                        message.tutorialUrl = $types[28].fromObject(object.tutorialUrl);
                    }
                    if (object.keyboardShortcutsUrl !== undefined && object.keyboardShortcutsUrl !== null) {
                        if (typeof object.keyboardShortcutsUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.keyboardShortcutsUrl: object expected");
                        message.keyboardShortcutsUrl = $types[29].fromObject(object.keyboardShortcutsUrl);
                    }
                    if (object.releaseNotesUrl !== undefined && object.releaseNotesUrl !== null) {
                        if (typeof object.releaseNotesUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.releaseNotesUrl: object expected");
                        message.releaseNotesUrl = $types[30].fromObject(object.releaseNotesUrl);
                    }
                    if (object.hideUserData !== undefined && object.hideUserData !== null)
                        message.hideUserData = Boolean(object.hideUserData);
                    if (object.useGeLogo !== undefined && object.useGeLogo !== null)
                        message.useGeLogo = Boolean(object.useGeLogo);
                    if (object.dioramaDescriptionUrlBase !== undefined && object.dioramaDescriptionUrlBase !== null) {
                        if (typeof object.dioramaDescriptionUrlBase !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.dioramaDescriptionUrlBase: object expected");
                        message.dioramaDescriptionUrlBase = $types[33].fromObject(object.dioramaDescriptionUrlBase);
                    }
                    if (object.dioramaDefaultColor !== undefined && object.dioramaDefaultColor !== null)
                        message.dioramaDefaultColor = object.dioramaDefaultColor >>> 0;
                    if (object.dioramaBlacklistUrl !== undefined && object.dioramaBlacklistUrl !== null) {
                        if (typeof object.dioramaBlacklistUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.dioramaBlacklistUrl: object expected");
                        message.dioramaBlacklistUrl = $types[35].fromObject(object.dioramaBlacklistUrl);
                    }
                    if (object.clientOptions !== undefined && object.clientOptions !== null) {
                        if (typeof object.clientOptions !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.clientOptions: object expected");
                        message.clientOptions = $types[36].fromObject(object.clientOptions);
                    }
                    if (object.fetchingOptions !== undefined && object.fetchingOptions !== null) {
                        if (typeof object.fetchingOptions !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.fetchingOptions: object expected");
                        message.fetchingOptions = $types[37].fromObject(object.fetchingOptions);
                    }
                    if (object.timeMachineOptions !== undefined && object.timeMachineOptions !== null) {
                        if (typeof object.timeMachineOptions !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.timeMachineOptions: object expected");
                        message.timeMachineOptions = $types[38].fromObject(object.timeMachineOptions);
                    }
                    if (object.csiOptions !== undefined && object.csiOptions !== null) {
                        if (typeof object.csiOptions !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.csiOptions: object expected");
                        message.csiOptions = $types[39].fromObject(object.csiOptions);
                    }
                    if (object.searchTab) {
                        if (!Array.isArray(object.searchTab))
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.searchTab: array expected");
                        message.searchTab = [];
                        for (var i = 0; i < object.searchTab.length; ++i) {
                            if (typeof object.searchTab[i] !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.searchTab: object expected");
                            message.searchTab[i] = $types[40].fromObject(object.searchTab[i]);
                        }
                    }
                    if (object.cobrandInfo) {
                        if (!Array.isArray(object.cobrandInfo))
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.cobrandInfo: array expected");
                        message.cobrandInfo = [];
                        for (var i = 0; i < object.cobrandInfo.length; ++i) {
                            if (typeof object.cobrandInfo[i] !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.cobrandInfo: object expected");
                            message.cobrandInfo[i] = $types[41].fromObject(object.cobrandInfo[i]);
                        }
                    }
                    if (object.validDatabase) {
                        if (!Array.isArray(object.validDatabase))
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.validDatabase: array expected");
                        message.validDatabase = [];
                        for (var i = 0; i < object.validDatabase.length; ++i) {
                            if (typeof object.validDatabase[i] !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.validDatabase: object expected");
                            message.validDatabase[i] = $types[42].fromObject(object.validDatabase[i]);
                        }
                    }
                    if (object.configScript) {
                        if (!Array.isArray(object.configScript))
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.configScript: array expected");
                        message.configScript = [];
                        for (var i = 0; i < object.configScript.length; ++i) {
                            if (typeof object.configScript[i] !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.configScript: object expected");
                            message.configScript[i] = $types[43].fromObject(object.configScript[i]);
                        }
                    }
                    if (object.deauthServerUrl !== undefined && object.deauthServerUrl !== null) {
                        if (typeof object.deauthServerUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.deauthServerUrl: object expected");
                        message.deauthServerUrl = $types[44].fromObject(object.deauthServerUrl);
                    }
                    if (object.swoopParameters !== undefined && object.swoopParameters !== null) {
                        if (typeof object.swoopParameters !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.swoopParameters: object expected");
                        message.swoopParameters = $types[45].fromObject(object.swoopParameters);
                    }
                    if (object.bbsServerInfo !== undefined && object.bbsServerInfo !== null) {
                        if (typeof object.bbsServerInfo !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.bbsServerInfo: object expected");
                        message.bbsServerInfo = $types[46].fromObject(object.bbsServerInfo);
                    }
                    if (object.dataErrorServerInfo !== undefined && object.dataErrorServerInfo !== null) {
                        if (typeof object.dataErrorServerInfo !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.dataErrorServerInfo: object expected");
                        message.dataErrorServerInfo = $types[47].fromObject(object.dataErrorServerInfo);
                    }
                    if (object.planetaryDatabase) {
                        if (!Array.isArray(object.planetaryDatabase))
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.planetaryDatabase: array expected");
                        message.planetaryDatabase = [];
                        for (var i = 0; i < object.planetaryDatabase.length; ++i) {
                            if (typeof object.planetaryDatabase[i] !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.planetaryDatabase: object expected");
                            message.planetaryDatabase[i] = $types[48].fromObject(object.planetaryDatabase[i]);
                        }
                    }
                    if (object.logServer !== undefined && object.logServer !== null) {
                        if (typeof object.logServer !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.logServer: object expected");
                        message.logServer = $types[49].fromObject(object.logServer);
                    }
                    if (object.autopiaOptions !== undefined && object.autopiaOptions !== null) {
                        if (typeof object.autopiaOptions !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.autopiaOptions: object expected");
                        message.autopiaOptions = $types[50].fromObject(object.autopiaOptions);
                    }
                    if (object.searchConfig !== undefined && object.searchConfig !== null) {
                        if (typeof object.searchConfig !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.searchConfig: object expected");
                        message.searchConfig = $types[51].fromObject(object.searchConfig);
                    }
                    if (object.searchInfo !== undefined && object.searchInfo !== null) {
                        if (typeof object.searchInfo !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.searchInfo: object expected");
                        message.searchInfo = $types[52].fromObject(object.searchInfo);
                    }
                    if (object.elevationServiceBaseUrl !== undefined && object.elevationServiceBaseUrl !== null)
                        message.elevationServiceBaseUrl = String(object.elevationServiceBaseUrl);
                    if (object.elevationProfileQueryDelay !== undefined && object.elevationProfileQueryDelay !== null)
                        message.elevationProfileQueryDelay = object.elevationProfileQueryDelay | 0;
                    if (object.proUpgradeUrl !== undefined && object.proUpgradeUrl !== null) {
                        if (typeof object.proUpgradeUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.proUpgradeUrl: object expected");
                        message.proUpgradeUrl = $types[55].fromObject(object.proUpgradeUrl);
                    }
                    if (object.earthCommunityUrl !== undefined && object.earthCommunityUrl !== null) {
                        if (typeof object.earthCommunityUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.earthCommunityUrl: object expected");
                        message.earthCommunityUrl = $types[56].fromObject(object.earthCommunityUrl);
                    }
                    if (object.googleMapsUrl !== undefined && object.googleMapsUrl !== null) {
                        if (typeof object.googleMapsUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.googleMapsUrl: object expected");
                        message.googleMapsUrl = $types[57].fromObject(object.googleMapsUrl);
                    }
                    if (object.sharingUrl !== undefined && object.sharingUrl !== null) {
                        if (typeof object.sharingUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.sharingUrl: object expected");
                        message.sharingUrl = $types[58].fromObject(object.sharingUrl);
                    }
                    if (object.privacyPolicyUrl !== undefined && object.privacyPolicyUrl !== null) {
                        if (typeof object.privacyPolicyUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.privacyPolicyUrl: object expected");
                        message.privacyPolicyUrl = $types[59].fromObject(object.privacyPolicyUrl);
                    }
                    if (object.doGplusUserCheck !== undefined && object.doGplusUserCheck !== null)
                        message.doGplusUserCheck = Boolean(object.doGplusUserCheck);
                    if (object.rocktreeDataProto !== undefined && object.rocktreeDataProto !== null) {
                        if (typeof object.rocktreeDataProto !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.rocktreeDataProto: object expected");
                        message.rocktreeDataProto = $types[61].fromObject(object.rocktreeDataProto);
                    }
                    if (object.filmstripConfig) {
                        if (!Array.isArray(object.filmstripConfig))
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.filmstripConfig: array expected");
                        message.filmstripConfig = [];
                        for (var i = 0; i < object.filmstripConfig.length; ++i) {
                            if (typeof object.filmstripConfig[i] !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.filmstripConfig: object expected");
                            message.filmstripConfig[i] = $types[62].fromObject(object.filmstripConfig[i]);
                        }
                    }
                    if (object.showSigninButton !== undefined && object.showSigninButton !== null)
                        message.showSigninButton = Boolean(object.showSigninButton);
                    if (object.proMeasureUpsellUrl !== undefined && object.proMeasureUpsellUrl !== null) {
                        if (typeof object.proMeasureUpsellUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.proMeasureUpsellUrl: object expected");
                        message.proMeasureUpsellUrl = $types[64].fromObject(object.proMeasureUpsellUrl);
                    }
                    if (object.proPrintUpsellUrl !== undefined && object.proPrintUpsellUrl !== null) {
                        if (typeof object.proPrintUpsellUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.proPrintUpsellUrl: object expected");
                        message.proPrintUpsellUrl = $types[65].fromObject(object.proPrintUpsellUrl);
                    }
                    if (object.starDataProto !== undefined && object.starDataProto !== null) {
                        if (typeof object.starDataProto !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.starDataProto: object expected");
                        message.starDataProto = $types[66].fromObject(object.starDataProto);
                    }
                    if (object.feedbackUrl !== undefined && object.feedbackUrl !== null) {
                        if (typeof object.feedbackUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.feedbackUrl: object expected");
                        message.feedbackUrl = $types[67].fromObject(object.feedbackUrl);
                    }
                    if (object.oauth2LoginUrl !== undefined && object.oauth2LoginUrl !== null) {
                        if (typeof object.oauth2LoginUrl !== "object")
                            throw TypeError(".keyhole.dbroot.EndSnippetProto.oauth2LoginUrl: object expected");
                        message.oauth2LoginUrl = $types[68].fromObject(object.oauth2LoginUrl);
                    }
                    return message;
                };

                EndSnippetProto.from = EndSnippetProto.fromObject;

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
                        object.numProStartUpTips = 0;
                        object.proStartUpTipsUrl = null;
                        object.startupTipsIntlUrl = null;
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
                        object.tutorialUrl = null;
                        object.keyboardShortcutsUrl = null;
                        object.releaseNotesUrl = null;
                        object.hideUserData = false;
                        object.useGeLogo = true;
                        object.dioramaDescriptionUrlBase = null;
                        object.dioramaDefaultColor = 4291281607;
                        object.dioramaBlacklistUrl = null;
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
                        object.searchConfig = null;
                        object.searchInfo = null;
                        object.elevationServiceBaseUrl = "http://maps.google.com/maps/api/elevation/";
                        object.elevationProfileQueryDelay = 500;
                        object.proUpgradeUrl = null;
                        object.earthCommunityUrl = null;
                        object.googleMapsUrl = null;
                        object.sharingUrl = null;
                        object.privacyPolicyUrl = null;
                        object.doGplusUserCheck = false;
                        object.rocktreeDataProto = null;
                        object.showSigninButton = false;
                        object.proMeasureUpsellUrl = null;
                        object.proPrintUpsellUrl = null;
                        object.starDataProto = null;
                        object.feedbackUrl = null;
                        object.oauth2LoginUrl = null;
                    }
                    if (message.model !== undefined && message.model !== null && message.hasOwnProperty("model"))
                        object.model = $types[0].toObject(message.model, options);
                    if (message.authServerUrl !== undefined && message.authServerUrl !== null && message.hasOwnProperty("authServerUrl"))
                        object.authServerUrl = $types[1].toObject(message.authServerUrl, options);
                    if (message.disableAuthentication !== undefined && message.disableAuthentication !== null && message.hasOwnProperty("disableAuthentication"))
                        object.disableAuthentication = message.disableAuthentication;
                    if (message.mfeDomains !== undefined && message.mfeDomains !== null && message.hasOwnProperty("mfeDomains")) {
                        object.mfeDomains = [];
                        for (var j = 0; j < message.mfeDomains.length; ++j)
                            object.mfeDomains[j] = $types[3].toObject(message.mfeDomains[j], options);
                    }
                    if (message.mfeLangParam !== undefined && message.mfeLangParam !== null && message.hasOwnProperty("mfeLangParam"))
                        object.mfeLangParam = message.mfeLangParam;
                    if (message.adsUrlPatterns !== undefined && message.adsUrlPatterns !== null && message.hasOwnProperty("adsUrlPatterns"))
                        object.adsUrlPatterns = message.adsUrlPatterns;
                    if (message.reverseGeocoderUrl !== undefined && message.reverseGeocoderUrl !== null && message.hasOwnProperty("reverseGeocoderUrl"))
                        object.reverseGeocoderUrl = $types[6].toObject(message.reverseGeocoderUrl, options);
                    if (message.reverseGeocoderProtocolVersion !== undefined && message.reverseGeocoderProtocolVersion !== null && message.hasOwnProperty("reverseGeocoderProtocolVersion"))
                        object.reverseGeocoderProtocolVersion = message.reverseGeocoderProtocolVersion;
                    if (message.skyDatabaseIsAvailable !== undefined && message.skyDatabaseIsAvailable !== null && message.hasOwnProperty("skyDatabaseIsAvailable"))
                        object.skyDatabaseIsAvailable = message.skyDatabaseIsAvailable;
                    if (message.skyDatabaseUrl !== undefined && message.skyDatabaseUrl !== null && message.hasOwnProperty("skyDatabaseUrl"))
                        object.skyDatabaseUrl = $types[9].toObject(message.skyDatabaseUrl, options);
                    if (message.defaultWebPageIntlUrl !== undefined && message.defaultWebPageIntlUrl !== null && message.hasOwnProperty("defaultWebPageIntlUrl"))
                        object.defaultWebPageIntlUrl = $types[10].toObject(message.defaultWebPageIntlUrl, options);
                    if (message.numStartUpTips !== undefined && message.numStartUpTips !== null && message.hasOwnProperty("numStartUpTips"))
                        object.numStartUpTips = message.numStartUpTips;
                    if (message.startUpTipsUrl !== undefined && message.startUpTipsUrl !== null && message.hasOwnProperty("startUpTipsUrl"))
                        object.startUpTipsUrl = $types[12].toObject(message.startUpTipsUrl, options);
                    if (message.numProStartUpTips !== undefined && message.numProStartUpTips !== null && message.hasOwnProperty("numProStartUpTips"))
                        object.numProStartUpTips = message.numProStartUpTips;
                    if (message.proStartUpTipsUrl !== undefined && message.proStartUpTipsUrl !== null && message.hasOwnProperty("proStartUpTipsUrl"))
                        object.proStartUpTipsUrl = $types[14].toObject(message.proStartUpTipsUrl, options);
                    if (message.startupTipsIntlUrl !== undefined && message.startupTipsIntlUrl !== null && message.hasOwnProperty("startupTipsIntlUrl"))
                        object.startupTipsIntlUrl = $types[15].toObject(message.startupTipsIntlUrl, options);
                    if (message.userGuideIntlUrl !== undefined && message.userGuideIntlUrl !== null && message.hasOwnProperty("userGuideIntlUrl"))
                        object.userGuideIntlUrl = $types[16].toObject(message.userGuideIntlUrl, options);
                    if (message.supportCenterIntlUrl !== undefined && message.supportCenterIntlUrl !== null && message.hasOwnProperty("supportCenterIntlUrl"))
                        object.supportCenterIntlUrl = $types[17].toObject(message.supportCenterIntlUrl, options);
                    if (message.businessListingIntlUrl !== undefined && message.businessListingIntlUrl !== null && message.hasOwnProperty("businessListingIntlUrl"))
                        object.businessListingIntlUrl = $types[18].toObject(message.businessListingIntlUrl, options);
                    if (message.supportAnswerIntlUrl !== undefined && message.supportAnswerIntlUrl !== null && message.hasOwnProperty("supportAnswerIntlUrl"))
                        object.supportAnswerIntlUrl = $types[19].toObject(message.supportAnswerIntlUrl, options);
                    if (message.supportTopicIntlUrl !== undefined && message.supportTopicIntlUrl !== null && message.hasOwnProperty("supportTopicIntlUrl"))
                        object.supportTopicIntlUrl = $types[20].toObject(message.supportTopicIntlUrl, options);
                    if (message.supportRequestIntlUrl !== undefined && message.supportRequestIntlUrl !== null && message.hasOwnProperty("supportRequestIntlUrl"))
                        object.supportRequestIntlUrl = $types[21].toObject(message.supportRequestIntlUrl, options);
                    if (message.earthIntlUrl !== undefined && message.earthIntlUrl !== null && message.hasOwnProperty("earthIntlUrl"))
                        object.earthIntlUrl = $types[22].toObject(message.earthIntlUrl, options);
                    if (message.addContentUrl !== undefined && message.addContentUrl !== null && message.hasOwnProperty("addContentUrl"))
                        object.addContentUrl = $types[23].toObject(message.addContentUrl, options);
                    if (message.sketchupNotInstalledUrl !== undefined && message.sketchupNotInstalledUrl !== null && message.hasOwnProperty("sketchupNotInstalledUrl"))
                        object.sketchupNotInstalledUrl = $types[24].toObject(message.sketchupNotInstalledUrl, options);
                    if (message.sketchupErrorUrl !== undefined && message.sketchupErrorUrl !== null && message.hasOwnProperty("sketchupErrorUrl"))
                        object.sketchupErrorUrl = $types[25].toObject(message.sketchupErrorUrl, options);
                    if (message.freeLicenseUrl !== undefined && message.freeLicenseUrl !== null && message.hasOwnProperty("freeLicenseUrl"))
                        object.freeLicenseUrl = $types[26].toObject(message.freeLicenseUrl, options);
                    if (message.proLicenseUrl !== undefined && message.proLicenseUrl !== null && message.hasOwnProperty("proLicenseUrl"))
                        object.proLicenseUrl = $types[27].toObject(message.proLicenseUrl, options);
                    if (message.tutorialUrl !== undefined && message.tutorialUrl !== null && message.hasOwnProperty("tutorialUrl"))
                        object.tutorialUrl = $types[28].toObject(message.tutorialUrl, options);
                    if (message.keyboardShortcutsUrl !== undefined && message.keyboardShortcutsUrl !== null && message.hasOwnProperty("keyboardShortcutsUrl"))
                        object.keyboardShortcutsUrl = $types[29].toObject(message.keyboardShortcutsUrl, options);
                    if (message.releaseNotesUrl !== undefined && message.releaseNotesUrl !== null && message.hasOwnProperty("releaseNotesUrl"))
                        object.releaseNotesUrl = $types[30].toObject(message.releaseNotesUrl, options);
                    if (message.hideUserData !== undefined && message.hideUserData !== null && message.hasOwnProperty("hideUserData"))
                        object.hideUserData = message.hideUserData;
                    if (message.useGeLogo !== undefined && message.useGeLogo !== null && message.hasOwnProperty("useGeLogo"))
                        object.useGeLogo = message.useGeLogo;
                    if (message.dioramaDescriptionUrlBase !== undefined && message.dioramaDescriptionUrlBase !== null && message.hasOwnProperty("dioramaDescriptionUrlBase"))
                        object.dioramaDescriptionUrlBase = $types[33].toObject(message.dioramaDescriptionUrlBase, options);
                    if (message.dioramaDefaultColor !== undefined && message.dioramaDefaultColor !== null && message.hasOwnProperty("dioramaDefaultColor"))
                        object.dioramaDefaultColor = message.dioramaDefaultColor;
                    if (message.dioramaBlacklistUrl !== undefined && message.dioramaBlacklistUrl !== null && message.hasOwnProperty("dioramaBlacklistUrl"))
                        object.dioramaBlacklistUrl = $types[35].toObject(message.dioramaBlacklistUrl, options);
                    if (message.clientOptions !== undefined && message.clientOptions !== null && message.hasOwnProperty("clientOptions"))
                        object.clientOptions = $types[36].toObject(message.clientOptions, options);
                    if (message.fetchingOptions !== undefined && message.fetchingOptions !== null && message.hasOwnProperty("fetchingOptions"))
                        object.fetchingOptions = $types[37].toObject(message.fetchingOptions, options);
                    if (message.timeMachineOptions !== undefined && message.timeMachineOptions !== null && message.hasOwnProperty("timeMachineOptions"))
                        object.timeMachineOptions = $types[38].toObject(message.timeMachineOptions, options);
                    if (message.csiOptions !== undefined && message.csiOptions !== null && message.hasOwnProperty("csiOptions"))
                        object.csiOptions = $types[39].toObject(message.csiOptions, options);
                    if (message.searchTab !== undefined && message.searchTab !== null && message.hasOwnProperty("searchTab")) {
                        object.searchTab = [];
                        for (var j = 0; j < message.searchTab.length; ++j)
                            object.searchTab[j] = $types[40].toObject(message.searchTab[j], options);
                    }
                    if (message.cobrandInfo !== undefined && message.cobrandInfo !== null && message.hasOwnProperty("cobrandInfo")) {
                        object.cobrandInfo = [];
                        for (var j = 0; j < message.cobrandInfo.length; ++j)
                            object.cobrandInfo[j] = $types[41].toObject(message.cobrandInfo[j], options);
                    }
                    if (message.validDatabase !== undefined && message.validDatabase !== null && message.hasOwnProperty("validDatabase")) {
                        object.validDatabase = [];
                        for (var j = 0; j < message.validDatabase.length; ++j)
                            object.validDatabase[j] = $types[42].toObject(message.validDatabase[j], options);
                    }
                    if (message.configScript !== undefined && message.configScript !== null && message.hasOwnProperty("configScript")) {
                        object.configScript = [];
                        for (var j = 0; j < message.configScript.length; ++j)
                            object.configScript[j] = $types[43].toObject(message.configScript[j], options);
                    }
                    if (message.deauthServerUrl !== undefined && message.deauthServerUrl !== null && message.hasOwnProperty("deauthServerUrl"))
                        object.deauthServerUrl = $types[44].toObject(message.deauthServerUrl, options);
                    if (message.swoopParameters !== undefined && message.swoopParameters !== null && message.hasOwnProperty("swoopParameters"))
                        object.swoopParameters = $types[45].toObject(message.swoopParameters, options);
                    if (message.bbsServerInfo !== undefined && message.bbsServerInfo !== null && message.hasOwnProperty("bbsServerInfo"))
                        object.bbsServerInfo = $types[46].toObject(message.bbsServerInfo, options);
                    if (message.dataErrorServerInfo !== undefined && message.dataErrorServerInfo !== null && message.hasOwnProperty("dataErrorServerInfo"))
                        object.dataErrorServerInfo = $types[47].toObject(message.dataErrorServerInfo, options);
                    if (message.planetaryDatabase !== undefined && message.planetaryDatabase !== null && message.hasOwnProperty("planetaryDatabase")) {
                        object.planetaryDatabase = [];
                        for (var j = 0; j < message.planetaryDatabase.length; ++j)
                            object.planetaryDatabase[j] = $types[48].toObject(message.planetaryDatabase[j], options);
                    }
                    if (message.logServer !== undefined && message.logServer !== null && message.hasOwnProperty("logServer"))
                        object.logServer = $types[49].toObject(message.logServer, options);
                    if (message.autopiaOptions !== undefined && message.autopiaOptions !== null && message.hasOwnProperty("autopiaOptions"))
                        object.autopiaOptions = $types[50].toObject(message.autopiaOptions, options);
                    if (message.searchConfig !== undefined && message.searchConfig !== null && message.hasOwnProperty("searchConfig"))
                        object.searchConfig = $types[51].toObject(message.searchConfig, options);
                    if (message.searchInfo !== undefined && message.searchInfo !== null && message.hasOwnProperty("searchInfo"))
                        object.searchInfo = $types[52].toObject(message.searchInfo, options);
                    if (message.elevationServiceBaseUrl !== undefined && message.elevationServiceBaseUrl !== null && message.hasOwnProperty("elevationServiceBaseUrl"))
                        object.elevationServiceBaseUrl = message.elevationServiceBaseUrl;
                    if (message.elevationProfileQueryDelay !== undefined && message.elevationProfileQueryDelay !== null && message.hasOwnProperty("elevationProfileQueryDelay"))
                        object.elevationProfileQueryDelay = message.elevationProfileQueryDelay;
                    if (message.proUpgradeUrl !== undefined && message.proUpgradeUrl !== null && message.hasOwnProperty("proUpgradeUrl"))
                        object.proUpgradeUrl = $types[55].toObject(message.proUpgradeUrl, options);
                    if (message.earthCommunityUrl !== undefined && message.earthCommunityUrl !== null && message.hasOwnProperty("earthCommunityUrl"))
                        object.earthCommunityUrl = $types[56].toObject(message.earthCommunityUrl, options);
                    if (message.googleMapsUrl !== undefined && message.googleMapsUrl !== null && message.hasOwnProperty("googleMapsUrl"))
                        object.googleMapsUrl = $types[57].toObject(message.googleMapsUrl, options);
                    if (message.sharingUrl !== undefined && message.sharingUrl !== null && message.hasOwnProperty("sharingUrl"))
                        object.sharingUrl = $types[58].toObject(message.sharingUrl, options);
                    if (message.privacyPolicyUrl !== undefined && message.privacyPolicyUrl !== null && message.hasOwnProperty("privacyPolicyUrl"))
                        object.privacyPolicyUrl = $types[59].toObject(message.privacyPolicyUrl, options);
                    if (message.doGplusUserCheck !== undefined && message.doGplusUserCheck !== null && message.hasOwnProperty("doGplusUserCheck"))
                        object.doGplusUserCheck = message.doGplusUserCheck;
                    if (message.rocktreeDataProto !== undefined && message.rocktreeDataProto !== null && message.hasOwnProperty("rocktreeDataProto"))
                        object.rocktreeDataProto = $types[61].toObject(message.rocktreeDataProto, options);
                    if (message.filmstripConfig !== undefined && message.filmstripConfig !== null && message.hasOwnProperty("filmstripConfig")) {
                        object.filmstripConfig = [];
                        for (var j = 0; j < message.filmstripConfig.length; ++j)
                            object.filmstripConfig[j] = $types[62].toObject(message.filmstripConfig[j], options);
                    }
                    if (message.showSigninButton !== undefined && message.showSigninButton !== null && message.hasOwnProperty("showSigninButton"))
                        object.showSigninButton = message.showSigninButton;
                    if (message.proMeasureUpsellUrl !== undefined && message.proMeasureUpsellUrl !== null && message.hasOwnProperty("proMeasureUpsellUrl"))
                        object.proMeasureUpsellUrl = $types[64].toObject(message.proMeasureUpsellUrl, options);
                    if (message.proPrintUpsellUrl !== undefined && message.proPrintUpsellUrl !== null && message.hasOwnProperty("proPrintUpsellUrl"))
                        object.proPrintUpsellUrl = $types[65].toObject(message.proPrintUpsellUrl, options);
                    if (message.starDataProto !== undefined && message.starDataProto !== null && message.hasOwnProperty("starDataProto"))
                        object.starDataProto = $types[66].toObject(message.starDataProto, options);
                    if (message.feedbackUrl !== undefined && message.feedbackUrl !== null && message.hasOwnProperty("feedbackUrl"))
                        object.feedbackUrl = $types[67].toObject(message.feedbackUrl, options);
                    if (message.oauth2LoginUrl !== undefined && message.oauth2LoginUrl !== null && message.hasOwnProperty("oauth2LoginUrl"))
                        object.oauth2LoginUrl = $types[68].toObject(message.oauth2LoginUrl, options);
                    return object;
                };

                EndSnippetProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                EndSnippetProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                EndSnippetProto.SearchConfigProto = (function() {

                    function SearchConfigProto(properties) {
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                this[keys[i]] = properties[keys[i]];
                    }

                    SearchConfigProto.prototype.searchServer = $util.emptyArray;
                    SearchConfigProto.prototype.oneboxService = $util.emptyArray;
                    SearchConfigProto.prototype.kmlSearchUrl = null;
                    SearchConfigProto.prototype.kmlRenderUrl = null;
                    SearchConfigProto.prototype.searchHistoryUrl = null;
                    SearchConfigProto.prototype.errorPageUrl = null;

                    var $types = {
                        0 : "keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer",
                        1 : "keyhole.dbroot.EndSnippetProto.SearchConfigProto.OneboxServiceProto",
                        2 : "keyhole.dbroot.StringIdOrValueProto",
                        3 : "keyhole.dbroot.StringIdOrValueProto",
                        4 : "keyhole.dbroot.StringIdOrValueProto",
                        5 : "keyhole.dbroot.StringIdOrValueProto"
                    };
                    $lazyTypes.push($types);

                    SearchConfigProto.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length,
                            message = new $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1:
                                    if (!(message.searchServer && message.searchServer.length))
                                        message.searchServer = [];
                                    message.searchServer.push($types[0].decode(reader, reader.uint32()));
                                    break;
                                case 2:
                                    if (!(message.oneboxService && message.oneboxService.length))
                                        message.oneboxService = [];
                                    message.oneboxService.push($types[1].decode(reader, reader.uint32()));
                                    break;
                                case 3:
                                    message.kmlSearchUrl = $types[2].decode(reader, reader.uint32());
                                    break;
                                case 4:
                                    message.kmlRenderUrl = $types[3].decode(reader, reader.uint32());
                                    break;
                                case 6:
                                    message.searchHistoryUrl = $types[4].decode(reader, reader.uint32());
                                    break;
                                case 5:
                                    message.errorPageUrl = $types[5].decode(reader, reader.uint32());
                                    break;
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
                        if (message.searchServer !== undefined) {
                            if (!Array.isArray(message.searchServer))
                                return "searchServer: array expected";
                            for (var i = 0; i < message.searchServer.length; ++i) {
                                var error = $types[0].verify(message.searchServer[i]);
                                if (error)
                                    return "searchServer." + error;
                            }
                        }
                        if (message.oneboxService !== undefined) {
                            if (!Array.isArray(message.oneboxService))
                                return "oneboxService: array expected";
                            for (var i = 0; i < message.oneboxService.length; ++i) {
                                var error = $types[1].verify(message.oneboxService[i]);
                                if (error)
                                    return "oneboxService." + error;
                            }
                        }
                        if (message.kmlSearchUrl !== undefined && message.kmlSearchUrl !== null) {
                            var error = $types[2].verify(message.kmlSearchUrl);
                            if (error)
                                return "kmlSearchUrl." + error;
                        }
                        if (message.kmlRenderUrl !== undefined && message.kmlRenderUrl !== null) {
                            var error = $types[3].verify(message.kmlRenderUrl);
                            if (error)
                                return "kmlRenderUrl." + error;
                        }
                        if (message.searchHistoryUrl !== undefined && message.searchHistoryUrl !== null) {
                            var error = $types[4].verify(message.searchHistoryUrl);
                            if (error)
                                return "searchHistoryUrl." + error;
                        }
                        if (message.errorPageUrl !== undefined && message.errorPageUrl !== null) {
                            var error = $types[5].verify(message.errorPageUrl);
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
                                message.searchServer[i] = $types[0].fromObject(object.searchServer[i]);
                            }
                        }
                        if (object.oneboxService) {
                            if (!Array.isArray(object.oneboxService))
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.oneboxService: array expected");
                            message.oneboxService = [];
                            for (var i = 0; i < object.oneboxService.length; ++i) {
                                if (typeof object.oneboxService[i] !== "object")
                                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.oneboxService: object expected");
                                message.oneboxService[i] = $types[1].fromObject(object.oneboxService[i]);
                            }
                        }
                        if (object.kmlSearchUrl !== undefined && object.kmlSearchUrl !== null) {
                            if (typeof object.kmlSearchUrl !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.kmlSearchUrl: object expected");
                            message.kmlSearchUrl = $types[2].fromObject(object.kmlSearchUrl);
                        }
                        if (object.kmlRenderUrl !== undefined && object.kmlRenderUrl !== null) {
                            if (typeof object.kmlRenderUrl !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.kmlRenderUrl: object expected");
                            message.kmlRenderUrl = $types[3].fromObject(object.kmlRenderUrl);
                        }
                        if (object.searchHistoryUrl !== undefined && object.searchHistoryUrl !== null) {
                            if (typeof object.searchHistoryUrl !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.searchHistoryUrl: object expected");
                            message.searchHistoryUrl = $types[4].fromObject(object.searchHistoryUrl);
                        }
                        if (object.errorPageUrl !== undefined && object.errorPageUrl !== null) {
                            if (typeof object.errorPageUrl !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.errorPageUrl: object expected");
                            message.errorPageUrl = $types[5].fromObject(object.errorPageUrl);
                        }
                        return message;
                    };

                    SearchConfigProto.from = SearchConfigProto.fromObject;

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
                            object.searchHistoryUrl = null;
                            object.errorPageUrl = null;
                        }
                        if (message.searchServer !== undefined && message.searchServer !== null && message.hasOwnProperty("searchServer")) {
                            object.searchServer = [];
                            for (var j = 0; j < message.searchServer.length; ++j)
                                object.searchServer[j] = $types[0].toObject(message.searchServer[j], options);
                        }
                        if (message.oneboxService !== undefined && message.oneboxService !== null && message.hasOwnProperty("oneboxService")) {
                            object.oneboxService = [];
                            for (var j = 0; j < message.oneboxService.length; ++j)
                                object.oneboxService[j] = $types[1].toObject(message.oneboxService[j], options);
                        }
                        if (message.kmlSearchUrl !== undefined && message.kmlSearchUrl !== null && message.hasOwnProperty("kmlSearchUrl"))
                            object.kmlSearchUrl = $types[2].toObject(message.kmlSearchUrl, options);
                        if (message.kmlRenderUrl !== undefined && message.kmlRenderUrl !== null && message.hasOwnProperty("kmlRenderUrl"))
                            object.kmlRenderUrl = $types[3].toObject(message.kmlRenderUrl, options);
                        if (message.searchHistoryUrl !== undefined && message.searchHistoryUrl !== null && message.hasOwnProperty("searchHistoryUrl"))
                            object.searchHistoryUrl = $types[4].toObject(message.searchHistoryUrl, options);
                        if (message.errorPageUrl !== undefined && message.errorPageUrl !== null && message.hasOwnProperty("errorPageUrl"))
                            object.errorPageUrl = $types[5].toObject(message.errorPageUrl, options);
                        return object;
                    };

                    SearchConfigProto.prototype.toObject = function toObject(options) {
                        return this.constructor.toObject(this, options);
                    };

                    SearchConfigProto.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };

                    SearchConfigProto.SearchServer = (function() {

                        function SearchServer(properties) {
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    this[keys[i]] = properties[keys[i]];
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

                        var $types = {
                            0 : "keyhole.dbroot.StringIdOrValueProto",
                            1 : "keyhole.dbroot.StringIdOrValueProto",
                            2 : "keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.ResultType",
                            3 : "keyhole.dbroot.StringIdOrValueProto",
                            4 : "keyhole.dbroot.StringIdOrValueProto",
                            5 : "keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SupplementalUi",
                            6 : "keyhole.dbroot.StringIdOrValueProto",
                            7 : "keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SearchletProto",
                            8 : "keyhole.dbroot.RequirementProto",
                            9 : "keyhole.dbroot.StringIdOrValueProto"
                        };
                        $lazyTypes.push($types);

                        SearchServer.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length,
                                message = new $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                    case 1:
                                        message.name = $types[0].decode(reader, reader.uint32());
                                        break;
                                    case 2:
                                        message.url = $types[1].decode(reader, reader.uint32());
                                        break;
                                    case 3:
                                        message.type = reader.uint32();
                                        break;
                                    case 4:
                                        message.htmlTransformUrl = $types[3].decode(reader, reader.uint32());
                                        break;
                                    case 5:
                                        message.kmlTransformUrl = $types[4].decode(reader, reader.uint32());
                                        break;
                                    case 6:
                                        message.supplementalUi = $types[5].decode(reader, reader.uint32());
                                        break;
                                    case 9:
                                        if (!(message.suggestion && message.suggestion.length))
                                            message.suggestion = [];
                                        message.suggestion.push($types[6].decode(reader, reader.uint32()));
                                        break;
                                    case 7:
                                        if (!(message.searchlet && message.searchlet.length))
                                            message.searchlet = [];
                                        message.searchlet.push($types[7].decode(reader, reader.uint32()));
                                        break;
                                    case 8:
                                        message.requirements = $types[8].decode(reader, reader.uint32());
                                        break;
                                    case 10:
                                        message.suggestServer = $types[9].decode(reader, reader.uint32());
                                        break;
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
                            if (message.name !== undefined && message.name !== null) {
                                var error = $types[0].verify(message.name);
                                if (error)
                                    return "name." + error;
                            }
                            if (message.url !== undefined && message.url !== null) {
                                var error = $types[1].verify(message.url);
                                if (error)
                                    return "url." + error;
                            }
                            if (message.type !== undefined)
                                switch (message.type) {
                                    default:
                                        return "type: enum value expected";
                                    case 0:
                                    case 1:
                                        break;
                                }
                            if (message.htmlTransformUrl !== undefined && message.htmlTransformUrl !== null) {
                                var error = $types[3].verify(message.htmlTransformUrl);
                                if (error)
                                    return "htmlTransformUrl." + error;
                            }
                            if (message.kmlTransformUrl !== undefined && message.kmlTransformUrl !== null) {
                                var error = $types[4].verify(message.kmlTransformUrl);
                                if (error)
                                    return "kmlTransformUrl." + error;
                            }
                            if (message.supplementalUi !== undefined && message.supplementalUi !== null) {
                                var error = $types[5].verify(message.supplementalUi);
                                if (error)
                                    return "supplementalUi." + error;
                            }
                            if (message.suggestion !== undefined) {
                                if (!Array.isArray(message.suggestion))
                                    return "suggestion: array expected";
                                for (var i = 0; i < message.suggestion.length; ++i) {
                                    var error = $types[6].verify(message.suggestion[i]);
                                    if (error)
                                        return "suggestion." + error;
                                }
                            }
                            if (message.searchlet !== undefined) {
                                if (!Array.isArray(message.searchlet))
                                    return "searchlet: array expected";
                                for (var i = 0; i < message.searchlet.length; ++i) {
                                    var error = $types[7].verify(message.searchlet[i]);
                                    if (error)
                                        return "searchlet." + error;
                                }
                            }
                            if (message.requirements !== undefined && message.requirements !== null) {
                                var error = $types[8].verify(message.requirements);
                                if (error)
                                    return "requirements." + error;
                            }
                            if (message.suggestServer !== undefined && message.suggestServer !== null) {
                                var error = $types[9].verify(message.suggestServer);
                                if (error)
                                    return "suggestServer." + error;
                            }
                            return null;
                        };

                        SearchServer.fromObject = function fromObject(object) {
                            if (object instanceof $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer)
                                return object;
                            var message = new $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer();
                            if (object.name !== undefined && object.name !== null) {
                                if (typeof object.name !== "object")
                                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.name: object expected");
                                message.name = $types[0].fromObject(object.name);
                            }
                            if (object.url !== undefined && object.url !== null) {
                                if (typeof object.url !== "object")
                                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.url: object expected");
                                message.url = $types[1].fromObject(object.url);
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
                            if (object.htmlTransformUrl !== undefined && object.htmlTransformUrl !== null) {
                                if (typeof object.htmlTransformUrl !== "object")
                                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.htmlTransformUrl: object expected");
                                message.htmlTransformUrl = $types[3].fromObject(object.htmlTransformUrl);
                            }
                            if (object.kmlTransformUrl !== undefined && object.kmlTransformUrl !== null) {
                                if (typeof object.kmlTransformUrl !== "object")
                                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.kmlTransformUrl: object expected");
                                message.kmlTransformUrl = $types[4].fromObject(object.kmlTransformUrl);
                            }
                            if (object.supplementalUi !== undefined && object.supplementalUi !== null) {
                                if (typeof object.supplementalUi !== "object")
                                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.supplementalUi: object expected");
                                message.supplementalUi = $types[5].fromObject(object.supplementalUi);
                            }
                            if (object.suggestion) {
                                if (!Array.isArray(object.suggestion))
                                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.suggestion: array expected");
                                message.suggestion = [];
                                for (var i = 0; i < object.suggestion.length; ++i) {
                                    if (typeof object.suggestion[i] !== "object")
                                        throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.suggestion: object expected");
                                    message.suggestion[i] = $types[6].fromObject(object.suggestion[i]);
                                }
                            }
                            if (object.searchlet) {
                                if (!Array.isArray(object.searchlet))
                                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.searchlet: array expected");
                                message.searchlet = [];
                                for (var i = 0; i < object.searchlet.length; ++i) {
                                    if (typeof object.searchlet[i] !== "object")
                                        throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.searchlet: object expected");
                                    message.searchlet[i] = $types[7].fromObject(object.searchlet[i]);
                                }
                            }
                            if (object.requirements !== undefined && object.requirements !== null) {
                                if (typeof object.requirements !== "object")
                                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.requirements: object expected");
                                message.requirements = $types[8].fromObject(object.requirements);
                            }
                            if (object.suggestServer !== undefined && object.suggestServer !== null) {
                                if (typeof object.suggestServer !== "object")
                                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.suggestServer: object expected");
                                message.suggestServer = $types[9].fromObject(object.suggestServer);
                            }
                            return message;
                        };

                        SearchServer.from = SearchServer.fromObject;

                        SearchServer.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.arrays || options.defaults) {
                                object.suggestion = [];
                                object.searchlet = [];
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
                            if (message.name !== undefined && message.name !== null && message.hasOwnProperty("name"))
                                object.name = $types[0].toObject(message.name, options);
                            if (message.url !== undefined && message.url !== null && message.hasOwnProperty("url"))
                                object.url = $types[1].toObject(message.url, options);
                            if (message.type !== undefined && message.type !== null && message.hasOwnProperty("type"))
                                object.type = options.enums === String ? $types[2][message.type] : message.type;
                            if (message.htmlTransformUrl !== undefined && message.htmlTransformUrl !== null && message.hasOwnProperty("htmlTransformUrl"))
                                object.htmlTransformUrl = $types[3].toObject(message.htmlTransformUrl, options);
                            if (message.kmlTransformUrl !== undefined && message.kmlTransformUrl !== null && message.hasOwnProperty("kmlTransformUrl"))
                                object.kmlTransformUrl = $types[4].toObject(message.kmlTransformUrl, options);
                            if (message.supplementalUi !== undefined && message.supplementalUi !== null && message.hasOwnProperty("supplementalUi"))
                                object.supplementalUi = $types[5].toObject(message.supplementalUi, options);
                            if (message.suggestion !== undefined && message.suggestion !== null && message.hasOwnProperty("suggestion")) {
                                object.suggestion = [];
                                for (var j = 0; j < message.suggestion.length; ++j)
                                    object.suggestion[j] = $types[6].toObject(message.suggestion[j], options);
                            }
                            if (message.searchlet !== undefined && message.searchlet !== null && message.hasOwnProperty("searchlet")) {
                                object.searchlet = [];
                                for (var j = 0; j < message.searchlet.length; ++j)
                                    object.searchlet[j] = $types[7].toObject(message.searchlet[j], options);
                            }
                            if (message.requirements !== undefined && message.requirements !== null && message.hasOwnProperty("requirements"))
                                object.requirements = $types[8].toObject(message.requirements, options);
                            if (message.suggestServer !== undefined && message.suggestServer !== null && message.hasOwnProperty("suggestServer"))
                                object.suggestServer = $types[9].toObject(message.suggestServer, options);
                            return object;
                        };

                        SearchServer.prototype.toObject = function toObject(options) {
                            return this.constructor.toObject(this, options);
                        };

                        SearchServer.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };

                        SearchServer.ResultType = (function() {
                            var valuesById = {}, values = Object.create(valuesById);
                            values["RESULT_TYPE_KML"] = 0;
                            values["RESULT_TYPE_XML"] = 1;
                            return values;
                        })();

                        SearchServer.SupplementalUi = (function() {

                            function SupplementalUi(properties) {
                                if (properties)
                                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                        this[keys[i]] = properties[keys[i]];
                            }

                            SupplementalUi.prototype.url = null;
                            SupplementalUi.prototype.label = null;
                            SupplementalUi.prototype.height = 160;

                            var $types = {
                                0 : "keyhole.dbroot.StringIdOrValueProto",
                                1 : "keyhole.dbroot.StringIdOrValueProto"
                            };
                            $lazyTypes.push($types);

                            SupplementalUi.decode = function decode(reader, length) {
                                if (!(reader instanceof $Reader))
                                    reader = $Reader.create(reader);
                                var end = length === undefined ? reader.len : reader.pos + length,
                                    message = new $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SupplementalUi();
                                while (reader.pos < end) {
                                    var tag = reader.uint32();
                                    switch (tag >>> 3) {
                                        case 1:
                                            message.url = $types[0].decode(reader, reader.uint32());
                                            break;
                                        case 2:
                                            message.label = $types[1].decode(reader, reader.uint32());
                                            break;
                                        case 3:
                                            message.height = reader.int32();
                                            break;
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
                                if (message.url !== undefined && message.url !== null) {
                                    var error = $types[0].verify(message.url);
                                    if (error)
                                        return "url." + error;
                                }
                                if (message.label !== undefined && message.label !== null) {
                                    var error = $types[1].verify(message.label);
                                    if (error)
                                        return "label." + error;
                                }
                                if (message.height !== undefined)
                                    if (!$util.isInteger(message.height))
                                        return "height: integer expected";
                                return null;
                            };

                            SupplementalUi.fromObject = function fromObject(object) {
                                if (object instanceof $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SupplementalUi)
                                    return object;
                                var message = new $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SupplementalUi();
                                if (object.url !== undefined && object.url !== null) {
                                    if (typeof object.url !== "object")
                                        throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SupplementalUi.url: object expected");
                                    message.url = $types[0].fromObject(object.url);
                                }
                                if (object.label !== undefined && object.label !== null) {
                                    if (typeof object.label !== "object")
                                        throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SupplementalUi.label: object expected");
                                    message.label = $types[1].fromObject(object.label);
                                }
                                if (object.height !== undefined && object.height !== null)
                                    message.height = object.height | 0;
                                return message;
                            };

                            SupplementalUi.from = SupplementalUi.fromObject;

                            SupplementalUi.toObject = function toObject(message, options) {
                                if (!options)
                                    options = {};
                                var object = {};
                                if (options.defaults) {
                                    object.url = null;
                                    object.label = null;
                                    object.height = 160;
                                }
                                if (message.url !== undefined && message.url !== null && message.hasOwnProperty("url"))
                                    object.url = $types[0].toObject(message.url, options);
                                if (message.label !== undefined && message.label !== null && message.hasOwnProperty("label"))
                                    object.label = $types[1].toObject(message.label, options);
                                if (message.height !== undefined && message.height !== null && message.hasOwnProperty("height"))
                                    object.height = message.height;
                                return object;
                            };

                            SupplementalUi.prototype.toObject = function toObject(options) {
                                return this.constructor.toObject(this, options);
                            };

                            SupplementalUi.prototype.toJSON = function toJSON() {
                                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                            };

                            return SupplementalUi;
                        })();

                        SearchServer.SearchletProto = (function() {

                            function SearchletProto(properties) {
                                if (properties)
                                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                        this[keys[i]] = properties[keys[i]];
                            }

                            SearchletProto.prototype.url = null;
                            SearchletProto.prototype.name = null;
                            SearchletProto.prototype.requirements = null;

                            var $types = {
                                0 : "keyhole.dbroot.StringIdOrValueProto",
                                1 : "keyhole.dbroot.StringIdOrValueProto",
                                2 : "keyhole.dbroot.RequirementProto"
                            };
                            $lazyTypes.push($types);

                            SearchletProto.decode = function decode(reader, length) {
                                if (!(reader instanceof $Reader))
                                    reader = $Reader.create(reader);
                                var end = length === undefined ? reader.len : reader.pos + length,
                                    message = new $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SearchletProto();
                                while (reader.pos < end) {
                                    var tag = reader.uint32();
                                    switch (tag >>> 3) {
                                        case 1:
                                            message.url = $types[0].decode(reader, reader.uint32());
                                            break;
                                        case 2:
                                            message.name = $types[1].decode(reader, reader.uint32());
                                            break;
                                        case 3:
                                            message.requirements = $types[2].decode(reader, reader.uint32());
                                            break;
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
                                if (message.url !== undefined && message.url !== null) {
                                    var error = $types[0].verify(message.url);
                                    if (error)
                                        return "url." + error;
                                }
                                if (message.name !== undefined && message.name !== null) {
                                    var error = $types[1].verify(message.name);
                                    if (error)
                                        return "name." + error;
                                }
                                if (message.requirements !== undefined && message.requirements !== null) {
                                    var error = $types[2].verify(message.requirements);
                                    if (error)
                                        return "requirements." + error;
                                }
                                return null;
                            };

                            SearchletProto.fromObject = function fromObject(object) {
                                if (object instanceof $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SearchletProto)
                                    return object;
                                var message = new $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SearchletProto();
                                if (object.url !== undefined && object.url !== null) {
                                    if (typeof object.url !== "object")
                                        throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SearchletProto.url: object expected");
                                    message.url = $types[0].fromObject(object.url);
                                }
                                if (object.name !== undefined && object.name !== null) {
                                    if (typeof object.name !== "object")
                                        throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SearchletProto.name: object expected");
                                    message.name = $types[1].fromObject(object.name);
                                }
                                if (object.requirements !== undefined && object.requirements !== null) {
                                    if (typeof object.requirements !== "object")
                                        throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.SearchServer.SearchletProto.requirements: object expected");
                                    message.requirements = $types[2].fromObject(object.requirements);
                                }
                                return message;
                            };

                            SearchletProto.from = SearchletProto.fromObject;

                            SearchletProto.toObject = function toObject(message, options) {
                                if (!options)
                                    options = {};
                                var object = {};
                                if (options.defaults) {
                                    object.url = null;
                                    object.name = null;
                                    object.requirements = null;
                                }
                                if (message.url !== undefined && message.url !== null && message.hasOwnProperty("url"))
                                    object.url = $types[0].toObject(message.url, options);
                                if (message.name !== undefined && message.name !== null && message.hasOwnProperty("name"))
                                    object.name = $types[1].toObject(message.name, options);
                                if (message.requirements !== undefined && message.requirements !== null && message.hasOwnProperty("requirements"))
                                    object.requirements = $types[2].toObject(message.requirements, options);
                                return object;
                            };

                            SearchletProto.prototype.toObject = function toObject(options) {
                                return this.constructor.toObject(this, options);
                            };

                            SearchletProto.prototype.toJSON = function toJSON() {
                                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                            };

                            return SearchletProto;
                        })();

                        return SearchServer;
                    })();

                    SearchConfigProto.OneboxServiceProto = (function() {

                        function OneboxServiceProto(properties) {
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    this[keys[i]] = properties[keys[i]];
                        }

                        OneboxServiceProto.prototype.serviceUrl = null;
                        OneboxServiceProto.prototype.requirements = null;

                        var $types = {
                            0 : "keyhole.dbroot.StringIdOrValueProto",
                            1 : "keyhole.dbroot.RequirementProto"
                        };
                        $lazyTypes.push($types);

                        OneboxServiceProto.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length,
                                message = new $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.OneboxServiceProto();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                    case 1:
                                        message.serviceUrl = $types[0].decode(reader, reader.uint32());
                                        break;
                                    case 2:
                                        message.requirements = $types[1].decode(reader, reader.uint32());
                                        break;
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
                            if (message.serviceUrl !== undefined && message.serviceUrl !== null) {
                                var error = $types[0].verify(message.serviceUrl);
                                if (error)
                                    return "serviceUrl." + error;
                            }
                            if (message.requirements !== undefined && message.requirements !== null) {
                                var error = $types[1].verify(message.requirements);
                                if (error)
                                    return "requirements." + error;
                            }
                            return null;
                        };

                        OneboxServiceProto.fromObject = function fromObject(object) {
                            if (object instanceof $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.OneboxServiceProto)
                                return object;
                            var message = new $root.keyhole.dbroot.EndSnippetProto.SearchConfigProto.OneboxServiceProto();
                            if (object.serviceUrl !== undefined && object.serviceUrl !== null) {
                                if (typeof object.serviceUrl !== "object")
                                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.OneboxServiceProto.serviceUrl: object expected");
                                message.serviceUrl = $types[0].fromObject(object.serviceUrl);
                            }
                            if (object.requirements !== undefined && object.requirements !== null) {
                                if (typeof object.requirements !== "object")
                                    throw TypeError(".keyhole.dbroot.EndSnippetProto.SearchConfigProto.OneboxServiceProto.requirements: object expected");
                                message.requirements = $types[1].fromObject(object.requirements);
                            }
                            return message;
                        };

                        OneboxServiceProto.from = OneboxServiceProto.fromObject;

                        OneboxServiceProto.toObject = function toObject(message, options) {
                            if (!options)
                                options = {};
                            var object = {};
                            if (options.defaults) {
                                object.serviceUrl = null;
                                object.requirements = null;
                            }
                            if (message.serviceUrl !== undefined && message.serviceUrl !== null && message.hasOwnProperty("serviceUrl"))
                                object.serviceUrl = $types[0].toObject(message.serviceUrl, options);
                            if (message.requirements !== undefined && message.requirements !== null && message.hasOwnProperty("requirements"))
                                object.requirements = $types[1].toObject(message.requirements, options);
                            return object;
                        };

                        OneboxServiceProto.prototype.toObject = function toObject(options) {
                            return this.constructor.toObject(this, options);
                        };

                        OneboxServiceProto.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };

                        return OneboxServiceProto;
                    })();

                    return SearchConfigProto;
                })();

                EndSnippetProto.SearchInfoProto = (function() {

                    function SearchInfoProto(properties) {
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                this[keys[i]] = properties[keys[i]];
                    }

                    SearchInfoProto.prototype.defaultUrl = "http://maps.google.com/maps";
                    SearchInfoProto.prototype.geocodeParam = "q";

                    SearchInfoProto.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length,
                            message = new $root.keyhole.dbroot.EndSnippetProto.SearchInfoProto();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1:
                                    message.defaultUrl = reader.string();
                                    break;
                                case 2:
                                    message.geocodeParam = reader.string();
                                    break;
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
                        if (message.defaultUrl !== undefined)
                            if (!$util.isString(message.defaultUrl))
                                return "defaultUrl: string expected";
                        if (message.geocodeParam !== undefined)
                            if (!$util.isString(message.geocodeParam))
                                return "geocodeParam: string expected";
                        return null;
                    };

                    SearchInfoProto.fromObject = function fromObject(object) {
                        if (object instanceof $root.keyhole.dbroot.EndSnippetProto.SearchInfoProto)
                            return object;
                        var message = new $root.keyhole.dbroot.EndSnippetProto.SearchInfoProto();
                        if (object.defaultUrl !== undefined && object.defaultUrl !== null)
                            message.defaultUrl = String(object.defaultUrl);
                        if (object.geocodeParam !== undefined && object.geocodeParam !== null)
                            message.geocodeParam = String(object.geocodeParam);
                        return message;
                    };

                    SearchInfoProto.from = SearchInfoProto.fromObject;

                    SearchInfoProto.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.defaults) {
                            object.defaultUrl = "http://maps.google.com/maps";
                            object.geocodeParam = "q";
                        }
                        if (message.defaultUrl !== undefined && message.defaultUrl !== null && message.hasOwnProperty("defaultUrl"))
                            object.defaultUrl = message.defaultUrl;
                        if (message.geocodeParam !== undefined && message.geocodeParam !== null && message.hasOwnProperty("geocodeParam"))
                            object.geocodeParam = message.geocodeParam;
                        return object;
                    };

                    SearchInfoProto.prototype.toObject = function toObject(options) {
                        return this.constructor.toObject(this, options);
                    };

                    SearchInfoProto.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };

                    return SearchInfoProto;
                })();

                EndSnippetProto.RockTreeDataProto = (function() {

                    function RockTreeDataProto(properties) {
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                this[keys[i]] = properties[keys[i]];
                    }

                    RockTreeDataProto.prototype.url = null;

                    var $types = {
                        0 : "keyhole.dbroot.StringIdOrValueProto"
                    };
                    $lazyTypes.push($types);

                    RockTreeDataProto.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length,
                            message = new $root.keyhole.dbroot.EndSnippetProto.RockTreeDataProto();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1:
                                    message.url = $types[0].decode(reader, reader.uint32());
                                    break;
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
                        if (message.url !== undefined && message.url !== null) {
                            var error = $types[0].verify(message.url);
                            if (error)
                                return "url." + error;
                        }
                        return null;
                    };

                    RockTreeDataProto.fromObject = function fromObject(object) {
                        if (object instanceof $root.keyhole.dbroot.EndSnippetProto.RockTreeDataProto)
                            return object;
                        var message = new $root.keyhole.dbroot.EndSnippetProto.RockTreeDataProto();
                        if (object.url !== undefined && object.url !== null) {
                            if (typeof object.url !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.RockTreeDataProto.url: object expected");
                            message.url = $types[0].fromObject(object.url);
                        }
                        return message;
                    };

                    RockTreeDataProto.from = RockTreeDataProto.fromObject;

                    RockTreeDataProto.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.defaults)
                            object.url = null;
                        if (message.url !== undefined && message.url !== null && message.hasOwnProperty("url"))
                            object.url = $types[0].toObject(message.url, options);
                        return object;
                    };

                    RockTreeDataProto.prototype.toObject = function toObject(options) {
                        return this.constructor.toObject(this, options);
                    };

                    RockTreeDataProto.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };

                    return RockTreeDataProto;
                })();

                EndSnippetProto.FilmstripConfigProto = (function() {

                    function FilmstripConfigProto(properties) {
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                this[keys[i]] = properties[keys[i]];
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

                    var $types = {
                        0 : "keyhole.dbroot.RequirementProto",
                        1 : "keyhole.dbroot.StringIdOrValueProto",
                        2 : "keyhole.dbroot.StringIdOrValueProto",
                        3 : "keyhole.dbroot.StringIdOrValueProto",
                        4 : "keyhole.dbroot.StringIdOrValueProto",
                        5 : "keyhole.dbroot.StringIdOrValueProto",
                        6 : "keyhole.dbroot.StringIdOrValueProto",
                        9 : "keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.AlleycatImageryTypeProto"
                    };
                    $lazyTypes.push($types);

                    FilmstripConfigProto.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length,
                            message = new $root.keyhole.dbroot.EndSnippetProto.FilmstripConfigProto();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1:
                                    message.requirements = $types[0].decode(reader, reader.uint32());
                                    break;
                                case 2:
                                    message.alleycatUrlTemplate = $types[1].decode(reader, reader.uint32());
                                    break;
                                case 9:
                                    message.fallbackAlleycatUrlTemplate = $types[2].decode(reader, reader.uint32());
                                    break;
                                case 3:
                                    message.metadataUrlTemplate = $types[3].decode(reader, reader.uint32());
                                    break;
                                case 4:
                                    message.thumbnailUrlTemplate = $types[4].decode(reader, reader.uint32());
                                    break;
                                case 5:
                                    message.kmlUrlTemplate = $types[5].decode(reader, reader.uint32());
                                    break;
                                case 6:
                                    message.featuredToursUrl = $types[6].decode(reader, reader.uint32());
                                    break;
                                case 7:
                                    message.enableViewportFallback = reader.bool();
                                    break;
                                case 8:
                                    message.viewportFallbackDistance = reader.uint32();
                                    break;
                                case 10:
                                    if (!(message.imageryType && message.imageryType.length))
                                        message.imageryType = [];
                                    message.imageryType.push($types[9].decode(reader, reader.uint32()));
                                    break;
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
                        if (message.requirements !== undefined && message.requirements !== null) {
                            var error = $types[0].verify(message.requirements);
                            if (error)
                                return "requirements." + error;
                        }
                        if (message.alleycatUrlTemplate !== undefined && message.alleycatUrlTemplate !== null) {
                            var error = $types[1].verify(message.alleycatUrlTemplate);
                            if (error)
                                return "alleycatUrlTemplate." + error;
                        }
                        if (message.fallbackAlleycatUrlTemplate !== undefined && message.fallbackAlleycatUrlTemplate !== null) {
                            var error = $types[2].verify(message.fallbackAlleycatUrlTemplate);
                            if (error)
                                return "fallbackAlleycatUrlTemplate." + error;
                        }
                        if (message.metadataUrlTemplate !== undefined && message.metadataUrlTemplate !== null) {
                            var error = $types[3].verify(message.metadataUrlTemplate);
                            if (error)
                                return "metadataUrlTemplate." + error;
                        }
                        if (message.thumbnailUrlTemplate !== undefined && message.thumbnailUrlTemplate !== null) {
                            var error = $types[4].verify(message.thumbnailUrlTemplate);
                            if (error)
                                return "thumbnailUrlTemplate." + error;
                        }
                        if (message.kmlUrlTemplate !== undefined && message.kmlUrlTemplate !== null) {
                            var error = $types[5].verify(message.kmlUrlTemplate);
                            if (error)
                                return "kmlUrlTemplate." + error;
                        }
                        if (message.featuredToursUrl !== undefined && message.featuredToursUrl !== null) {
                            var error = $types[6].verify(message.featuredToursUrl);
                            if (error)
                                return "featuredToursUrl." + error;
                        }
                        if (message.enableViewportFallback !== undefined)
                            if (typeof message.enableViewportFallback !== "boolean")
                                return "enableViewportFallback: boolean expected";
                        if (message.viewportFallbackDistance !== undefined)
                            if (!$util.isInteger(message.viewportFallbackDistance))
                                return "viewportFallbackDistance: integer expected";
                        if (message.imageryType !== undefined) {
                            if (!Array.isArray(message.imageryType))
                                return "imageryType: array expected";
                            for (var i = 0; i < message.imageryType.length; ++i) {
                                var error = $types[9].verify(message.imageryType[i]);
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
                        if (object.requirements !== undefined && object.requirements !== null) {
                            if (typeof object.requirements !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.requirements: object expected");
                            message.requirements = $types[0].fromObject(object.requirements);
                        }
                        if (object.alleycatUrlTemplate !== undefined && object.alleycatUrlTemplate !== null) {
                            if (typeof object.alleycatUrlTemplate !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.alleycatUrlTemplate: object expected");
                            message.alleycatUrlTemplate = $types[1].fromObject(object.alleycatUrlTemplate);
                        }
                        if (object.fallbackAlleycatUrlTemplate !== undefined && object.fallbackAlleycatUrlTemplate !== null) {
                            if (typeof object.fallbackAlleycatUrlTemplate !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.fallbackAlleycatUrlTemplate: object expected");
                            message.fallbackAlleycatUrlTemplate = $types[2].fromObject(object.fallbackAlleycatUrlTemplate);
                        }
                        if (object.metadataUrlTemplate !== undefined && object.metadataUrlTemplate !== null) {
                            if (typeof object.metadataUrlTemplate !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.metadataUrlTemplate: object expected");
                            message.metadataUrlTemplate = $types[3].fromObject(object.metadataUrlTemplate);
                        }
                        if (object.thumbnailUrlTemplate !== undefined && object.thumbnailUrlTemplate !== null) {
                            if (typeof object.thumbnailUrlTemplate !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.thumbnailUrlTemplate: object expected");
                            message.thumbnailUrlTemplate = $types[4].fromObject(object.thumbnailUrlTemplate);
                        }
                        if (object.kmlUrlTemplate !== undefined && object.kmlUrlTemplate !== null) {
                            if (typeof object.kmlUrlTemplate !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.kmlUrlTemplate: object expected");
                            message.kmlUrlTemplate = $types[5].fromObject(object.kmlUrlTemplate);
                        }
                        if (object.featuredToursUrl !== undefined && object.featuredToursUrl !== null) {
                            if (typeof object.featuredToursUrl !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.featuredToursUrl: object expected");
                            message.featuredToursUrl = $types[6].fromObject(object.featuredToursUrl);
                        }
                        if (object.enableViewportFallback !== undefined && object.enableViewportFallback !== null)
                            message.enableViewportFallback = Boolean(object.enableViewportFallback);
                        if (object.viewportFallbackDistance !== undefined && object.viewportFallbackDistance !== null)
                            message.viewportFallbackDistance = object.viewportFallbackDistance >>> 0;
                        if (object.imageryType) {
                            if (!Array.isArray(object.imageryType))
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.imageryType: array expected");
                            message.imageryType = [];
                            for (var i = 0; i < object.imageryType.length; ++i) {
                                if (typeof object.imageryType[i] !== "object")
                                    throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.imageryType: object expected");
                                message.imageryType[i] = $types[9].fromObject(object.imageryType[i]);
                            }
                        }
                        return message;
                    };

                    FilmstripConfigProto.from = FilmstripConfigProto.fromObject;

                    FilmstripConfigProto.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.arrays || options.defaults)
                            object.imageryType = [];
                        if (options.defaults) {
                            object.requirements = null;
                            object.alleycatUrlTemplate = null;
                            object.fallbackAlleycatUrlTemplate = null;
                            object.metadataUrlTemplate = null;
                            object.thumbnailUrlTemplate = null;
                            object.kmlUrlTemplate = null;
                            object.featuredToursUrl = null;
                            object.enableViewportFallback = false;
                            object.viewportFallbackDistance = 0;
                        }
                        if (message.requirements !== undefined && message.requirements !== null && message.hasOwnProperty("requirements"))
                            object.requirements = $types[0].toObject(message.requirements, options);
                        if (message.alleycatUrlTemplate !== undefined && message.alleycatUrlTemplate !== null && message.hasOwnProperty("alleycatUrlTemplate"))
                            object.alleycatUrlTemplate = $types[1].toObject(message.alleycatUrlTemplate, options);
                        if (message.fallbackAlleycatUrlTemplate !== undefined && message.fallbackAlleycatUrlTemplate !== null && message.hasOwnProperty("fallbackAlleycatUrlTemplate"))
                            object.fallbackAlleycatUrlTemplate = $types[2].toObject(message.fallbackAlleycatUrlTemplate, options);
                        if (message.metadataUrlTemplate !== undefined && message.metadataUrlTemplate !== null && message.hasOwnProperty("metadataUrlTemplate"))
                            object.metadataUrlTemplate = $types[3].toObject(message.metadataUrlTemplate, options);
                        if (message.thumbnailUrlTemplate !== undefined && message.thumbnailUrlTemplate !== null && message.hasOwnProperty("thumbnailUrlTemplate"))
                            object.thumbnailUrlTemplate = $types[4].toObject(message.thumbnailUrlTemplate, options);
                        if (message.kmlUrlTemplate !== undefined && message.kmlUrlTemplate !== null && message.hasOwnProperty("kmlUrlTemplate"))
                            object.kmlUrlTemplate = $types[5].toObject(message.kmlUrlTemplate, options);
                        if (message.featuredToursUrl !== undefined && message.featuredToursUrl !== null && message.hasOwnProperty("featuredToursUrl"))
                            object.featuredToursUrl = $types[6].toObject(message.featuredToursUrl, options);
                        if (message.enableViewportFallback !== undefined && message.enableViewportFallback !== null && message.hasOwnProperty("enableViewportFallback"))
                            object.enableViewportFallback = message.enableViewportFallback;
                        if (message.viewportFallbackDistance !== undefined && message.viewportFallbackDistance !== null && message.hasOwnProperty("viewportFallbackDistance"))
                            object.viewportFallbackDistance = message.viewportFallbackDistance;
                        if (message.imageryType !== undefined && message.imageryType !== null && message.hasOwnProperty("imageryType")) {
                            object.imageryType = [];
                            for (var j = 0; j < message.imageryType.length; ++j)
                                object.imageryType[j] = $types[9].toObject(message.imageryType[j], options);
                        }
                        return object;
                    };

                    FilmstripConfigProto.prototype.toObject = function toObject(options) {
                        return this.constructor.toObject(this, options);
                    };

                    FilmstripConfigProto.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };

                    FilmstripConfigProto.AlleycatImageryTypeProto = (function() {

                        function AlleycatImageryTypeProto(properties) {
                            if (properties)
                                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                    this[keys[i]] = properties[keys[i]];
                        }

                        AlleycatImageryTypeProto.prototype.imageryTypeId = 0;
                        AlleycatImageryTypeProto.prototype.imageryTypeLabel = "";
                        AlleycatImageryTypeProto.prototype.metadataUrlTemplate = null;
                        AlleycatImageryTypeProto.prototype.thumbnailUrlTemplate = null;
                        AlleycatImageryTypeProto.prototype.kmlUrlTemplate = null;

                        var $types = {
                            2 : "keyhole.dbroot.StringIdOrValueProto",
                            3 : "keyhole.dbroot.StringIdOrValueProto",
                            4 : "keyhole.dbroot.StringIdOrValueProto"
                        };
                        $lazyTypes.push($types);

                        AlleycatImageryTypeProto.decode = function decode(reader, length) {
                            if (!(reader instanceof $Reader))
                                reader = $Reader.create(reader);
                            var end = length === undefined ? reader.len : reader.pos + length,
                                message = new $root.keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.AlleycatImageryTypeProto();
                            while (reader.pos < end) {
                                var tag = reader.uint32();
                                switch (tag >>> 3) {
                                    case 1:
                                        message.imageryTypeId = reader.int32();
                                        break;
                                    case 2:
                                        message.imageryTypeLabel = reader.string();
                                        break;
                                    case 3:
                                        message.metadataUrlTemplate = $types[2].decode(reader, reader.uint32());
                                        break;
                                    case 4:
                                        message.thumbnailUrlTemplate = $types[3].decode(reader, reader.uint32());
                                        break;
                                    case 5:
                                        message.kmlUrlTemplate = $types[4].decode(reader, reader.uint32());
                                        break;
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
                            if (message.imageryTypeId !== undefined)
                                if (!$util.isInteger(message.imageryTypeId))
                                    return "imageryTypeId: integer expected";
                            if (message.imageryTypeLabel !== undefined)
                                if (!$util.isString(message.imageryTypeLabel))
                                    return "imageryTypeLabel: string expected";
                            if (message.metadataUrlTemplate !== undefined && message.metadataUrlTemplate !== null) {
                                var error = $types[2].verify(message.metadataUrlTemplate);
                                if (error)
                                    return "metadataUrlTemplate." + error;
                            }
                            if (message.thumbnailUrlTemplate !== undefined && message.thumbnailUrlTemplate !== null) {
                                var error = $types[3].verify(message.thumbnailUrlTemplate);
                                if (error)
                                    return "thumbnailUrlTemplate." + error;
                            }
                            if (message.kmlUrlTemplate !== undefined && message.kmlUrlTemplate !== null) {
                                var error = $types[4].verify(message.kmlUrlTemplate);
                                if (error)
                                    return "kmlUrlTemplate." + error;
                            }
                            return null;
                        };

                        AlleycatImageryTypeProto.fromObject = function fromObject(object) {
                            if (object instanceof $root.keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.AlleycatImageryTypeProto)
                                return object;
                            var message = new $root.keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.AlleycatImageryTypeProto();
                            if (object.imageryTypeId !== undefined && object.imageryTypeId !== null)
                                message.imageryTypeId = object.imageryTypeId | 0;
                            if (object.imageryTypeLabel !== undefined && object.imageryTypeLabel !== null)
                                message.imageryTypeLabel = String(object.imageryTypeLabel);
                            if (object.metadataUrlTemplate !== undefined && object.metadataUrlTemplate !== null) {
                                if (typeof object.metadataUrlTemplate !== "object")
                                    throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.AlleycatImageryTypeProto.metadataUrlTemplate: object expected");
                                message.metadataUrlTemplate = $types[2].fromObject(object.metadataUrlTemplate);
                            }
                            if (object.thumbnailUrlTemplate !== undefined && object.thumbnailUrlTemplate !== null) {
                                if (typeof object.thumbnailUrlTemplate !== "object")
                                    throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.AlleycatImageryTypeProto.thumbnailUrlTemplate: object expected");
                                message.thumbnailUrlTemplate = $types[3].fromObject(object.thumbnailUrlTemplate);
                            }
                            if (object.kmlUrlTemplate !== undefined && object.kmlUrlTemplate !== null) {
                                if (typeof object.kmlUrlTemplate !== "object")
                                    throw TypeError(".keyhole.dbroot.EndSnippetProto.FilmstripConfigProto.AlleycatImageryTypeProto.kmlUrlTemplate: object expected");
                                message.kmlUrlTemplate = $types[4].fromObject(object.kmlUrlTemplate);
                            }
                            return message;
                        };

                        AlleycatImageryTypeProto.from = AlleycatImageryTypeProto.fromObject;

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
                            if (message.imageryTypeId !== undefined && message.imageryTypeId !== null && message.hasOwnProperty("imageryTypeId"))
                                object.imageryTypeId = message.imageryTypeId;
                            if (message.imageryTypeLabel !== undefined && message.imageryTypeLabel !== null && message.hasOwnProperty("imageryTypeLabel"))
                                object.imageryTypeLabel = message.imageryTypeLabel;
                            if (message.metadataUrlTemplate !== undefined && message.metadataUrlTemplate !== null && message.hasOwnProperty("metadataUrlTemplate"))
                                object.metadataUrlTemplate = $types[2].toObject(message.metadataUrlTemplate, options);
                            if (message.thumbnailUrlTemplate !== undefined && message.thumbnailUrlTemplate !== null && message.hasOwnProperty("thumbnailUrlTemplate"))
                                object.thumbnailUrlTemplate = $types[3].toObject(message.thumbnailUrlTemplate, options);
                            if (message.kmlUrlTemplate !== undefined && message.kmlUrlTemplate !== null && message.hasOwnProperty("kmlUrlTemplate"))
                                object.kmlUrlTemplate = $types[4].toObject(message.kmlUrlTemplate, options);
                            return object;
                        };

                        AlleycatImageryTypeProto.prototype.toObject = function toObject(options) {
                            return this.constructor.toObject(this, options);
                        };

                        AlleycatImageryTypeProto.prototype.toJSON = function toJSON() {
                            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                        };

                        return AlleycatImageryTypeProto;
                    })();

                    return FilmstripConfigProto;
                })();

                EndSnippetProto.StarDataProto = (function() {

                    function StarDataProto(properties) {
                        if (properties)
                            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                                this[keys[i]] = properties[keys[i]];
                    }

                    StarDataProto.prototype.url = null;

                    var $types = {
                        0 : "keyhole.dbroot.StringIdOrValueProto"
                    };
                    $lazyTypes.push($types);

                    StarDataProto.decode = function decode(reader, length) {
                        if (!(reader instanceof $Reader))
                            reader = $Reader.create(reader);
                        var end = length === undefined ? reader.len : reader.pos + length,
                            message = new $root.keyhole.dbroot.EndSnippetProto.StarDataProto();
                        while (reader.pos < end) {
                            var tag = reader.uint32();
                            switch (tag >>> 3) {
                                case 1:
                                    message.url = $types[0].decode(reader, reader.uint32());
                                    break;
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
                        if (message.url !== undefined && message.url !== null) {
                            var error = $types[0].verify(message.url);
                            if (error)
                                return "url." + error;
                        }
                        return null;
                    };

                    StarDataProto.fromObject = function fromObject(object) {
                        if (object instanceof $root.keyhole.dbroot.EndSnippetProto.StarDataProto)
                            return object;
                        var message = new $root.keyhole.dbroot.EndSnippetProto.StarDataProto();
                        if (object.url !== undefined && object.url !== null) {
                            if (typeof object.url !== "object")
                                throw TypeError(".keyhole.dbroot.EndSnippetProto.StarDataProto.url: object expected");
                            message.url = $types[0].fromObject(object.url);
                        }
                        return message;
                    };

                    StarDataProto.from = StarDataProto.fromObject;

                    StarDataProto.toObject = function toObject(message, options) {
                        if (!options)
                            options = {};
                        var object = {};
                        if (options.defaults)
                            object.url = null;
                        if (message.url !== undefined && message.url !== null && message.hasOwnProperty("url"))
                            object.url = $types[0].toObject(message.url, options);
                        return object;
                    };

                    StarDataProto.prototype.toObject = function toObject(options) {
                        return this.constructor.toObject(this, options);
                    };

                    StarDataProto.prototype.toJSON = function toJSON() {
                        return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                    };

                    return StarDataProto;
                })();

                return EndSnippetProto;
            })();

            dbroot.DbRootRefProto = (function() {

                function DbRootRefProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                DbRootRefProto.prototype.url = "";
                DbRootRefProto.prototype.isCritical = false;
                DbRootRefProto.prototype.requirements = null;

                var $types = {
                    2 : "keyhole.dbroot.RequirementProto"
                };
                $lazyTypes.push($types);

                DbRootRefProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.DbRootRefProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 2:
                                message.url = reader.string();
                                break;
                            case 1:
                                message.isCritical = reader.bool();
                                break;
                            case 3:
                                message.requirements = $types[2].decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
                    return message;
                };

                DbRootRefProto.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (!$util.isString(message.url))
                        return "url: string expected";
                    if (message.isCritical !== undefined)
                        if (typeof message.isCritical !== "boolean")
                            return "isCritical: boolean expected";
                    if (message.requirements !== undefined && message.requirements !== null) {
                        var error = $types[2].verify(message.requirements);
                        if (error)
                            return "requirements." + error;
                    }
                    return null;
                };

                DbRootRefProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.DbRootRefProto)
                        return object;
                    var message = new $root.keyhole.dbroot.DbRootRefProto();
                    if (object.url !== undefined && object.url !== null)
                        message.url = String(object.url);
                    if (object.isCritical !== undefined && object.isCritical !== null)
                        message.isCritical = Boolean(object.isCritical);
                    if (object.requirements !== undefined && object.requirements !== null) {
                        if (typeof object.requirements !== "object")
                            throw TypeError(".keyhole.dbroot.DbRootRefProto.requirements: object expected");
                        message.requirements = $types[2].fromObject(object.requirements);
                    }
                    return message;
                };

                DbRootRefProto.from = DbRootRefProto.fromObject;

                DbRootRefProto.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.url = "";
                        object.isCritical = false;
                        object.requirements = null;
                    }
                    if (message.url !== undefined && message.url !== null && message.hasOwnProperty("url"))
                        object.url = message.url;
                    if (message.isCritical !== undefined && message.isCritical !== null && message.hasOwnProperty("isCritical"))
                        object.isCritical = message.isCritical;
                    if (message.requirements !== undefined && message.requirements !== null && message.hasOwnProperty("requirements"))
                        object.requirements = $types[2].toObject(message.requirements, options);
                    return object;
                };

                DbRootRefProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                DbRootRefProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return DbRootRefProto;
            })();

            dbroot.DatabaseVersionProto = (function() {

                function DatabaseVersionProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                DatabaseVersionProto.prototype.quadtreeVersion = 0;

                DatabaseVersionProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.DatabaseVersionProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.quadtreeVersion = reader.uint32();
                                break;
                            default:
                                reader.skipType(tag & 7);
                                break;
                        }
                    }
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
                    if (object.quadtreeVersion !== undefined && object.quadtreeVersion !== null)
                        message.quadtreeVersion = object.quadtreeVersion >>> 0;
                    return message;
                };

                DatabaseVersionProto.from = DatabaseVersionProto.fromObject;

                DatabaseVersionProto.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults)
                        object.quadtreeVersion = 0;
                    if (message.quadtreeVersion !== undefined && message.quadtreeVersion !== null && message.hasOwnProperty("quadtreeVersion"))
                        object.quadtreeVersion = message.quadtreeVersion;
                    return object;
                };

                DatabaseVersionProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                DatabaseVersionProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return DatabaseVersionProto;
            })();

            dbroot.DbRootProto = (function() {

                function DbRootProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
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

                var $types = {
                    0 : "keyhole.dbroot.StringIdOrValueProto",
                    4 : "keyhole.dbroot.ProviderInfoProto",
                    5 : "keyhole.dbroot.NestedFeatureProto",
                    6 : "keyhole.dbroot.StyleAttributeProto",
                    7 : "keyhole.dbroot.StyleMapProto",
                    8 : "keyhole.dbroot.EndSnippetProto",
                    9 : "keyhole.dbroot.StringEntryProto",
                    12 : "keyhole.dbroot.DbRootRefProto",
                    13 : "keyhole.dbroot.DatabaseVersionProto"
                };
                $lazyTypes.push($types);

                DbRootProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.DbRootProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 15:
                                message.databaseName = $types[0].decode(reader, reader.uint32());
                                break;
                            case 1:
                                message.imageryPresent = reader.bool();
                                break;
                            case 14:
                                message.protoImagery = reader.bool();
                                break;
                            case 2:
                                message.terrainPresent = reader.bool();
                                break;
                            case 3:
                                if (!(message.providerInfo && message.providerInfo.length))
                                    message.providerInfo = [];
                                message.providerInfo.push($types[4].decode(reader, reader.uint32()));
                                break;
                            case 4:
                                if (!(message.nestedFeature && message.nestedFeature.length))
                                    message.nestedFeature = [];
                                message.nestedFeature.push($types[5].decode(reader, reader.uint32()));
                                break;
                            case 5:
                                if (!(message.styleAttribute && message.styleAttribute.length))
                                    message.styleAttribute = [];
                                message.styleAttribute.push($types[6].decode(reader, reader.uint32()));
                                break;
                            case 6:
                                if (!(message.styleMap && message.styleMap.length))
                                    message.styleMap = [];
                                message.styleMap.push($types[7].decode(reader, reader.uint32()));
                                break;
                            case 7:
                                message.endSnippet = $types[8].decode(reader, reader.uint32());
                                break;
                            case 8:
                                if (!(message.translationEntry && message.translationEntry.length))
                                    message.translationEntry = [];
                                message.translationEntry.push($types[9].decode(reader, reader.uint32()));
                                break;
                            case 9:
                                message.language = reader.string();
                                break;
                            case 10:
                                message.version = reader.int32();
                                break;
                            case 11:
                                if (!(message.dbrootReference && message.dbrootReference.length))
                                    message.dbrootReference = [];
                                message.dbrootReference.push($types[12].decode(reader, reader.uint32()));
                                break;
                            case 13:
                                message.databaseVersion = $types[13].decode(reader, reader.uint32());
                                break;
                            case 16:
                                message.refreshTimeout = reader.int32();
                                break;
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
                    if (message.databaseName !== undefined && message.databaseName !== null) {
                        var error = $types[0].verify(message.databaseName);
                        if (error)
                            return "databaseName." + error;
                    }
                    if (message.imageryPresent !== undefined)
                        if (typeof message.imageryPresent !== "boolean")
                            return "imageryPresent: boolean expected";
                    if (message.protoImagery !== undefined)
                        if (typeof message.protoImagery !== "boolean")
                            return "protoImagery: boolean expected";
                    if (message.terrainPresent !== undefined)
                        if (typeof message.terrainPresent !== "boolean")
                            return "terrainPresent: boolean expected";
                    if (message.providerInfo !== undefined) {
                        if (!Array.isArray(message.providerInfo))
                            return "providerInfo: array expected";
                        for (var i = 0; i < message.providerInfo.length; ++i) {
                            var error = $types[4].verify(message.providerInfo[i]);
                            if (error)
                                return "providerInfo." + error;
                        }
                    }
                    if (message.nestedFeature !== undefined) {
                        if (!Array.isArray(message.nestedFeature))
                            return "nestedFeature: array expected";
                        for (var i = 0; i < message.nestedFeature.length; ++i) {
                            var error = $types[5].verify(message.nestedFeature[i]);
                            if (error)
                                return "nestedFeature." + error;
                        }
                    }
                    if (message.styleAttribute !== undefined) {
                        if (!Array.isArray(message.styleAttribute))
                            return "styleAttribute: array expected";
                        for (var i = 0; i < message.styleAttribute.length; ++i) {
                            var error = $types[6].verify(message.styleAttribute[i]);
                            if (error)
                                return "styleAttribute." + error;
                        }
                    }
                    if (message.styleMap !== undefined) {
                        if (!Array.isArray(message.styleMap))
                            return "styleMap: array expected";
                        for (var i = 0; i < message.styleMap.length; ++i) {
                            var error = $types[7].verify(message.styleMap[i]);
                            if (error)
                                return "styleMap." + error;
                        }
                    }
                    if (message.endSnippet !== undefined && message.endSnippet !== null) {
                        var error = $types[8].verify(message.endSnippet);
                        if (error)
                            return "endSnippet." + error;
                    }
                    if (message.translationEntry !== undefined) {
                        if (!Array.isArray(message.translationEntry))
                            return "translationEntry: array expected";
                        for (var i = 0; i < message.translationEntry.length; ++i) {
                            var error = $types[9].verify(message.translationEntry[i]);
                            if (error)
                                return "translationEntry." + error;
                        }
                    }
                    if (message.language !== undefined)
                        if (!$util.isString(message.language))
                            return "language: string expected";
                    if (message.version !== undefined)
                        if (!$util.isInteger(message.version))
                            return "version: integer expected";
                    if (message.dbrootReference !== undefined) {
                        if (!Array.isArray(message.dbrootReference))
                            return "dbrootReference: array expected";
                        for (var i = 0; i < message.dbrootReference.length; ++i) {
                            var error = $types[12].verify(message.dbrootReference[i]);
                            if (error)
                                return "dbrootReference." + error;
                        }
                    }
                    if (message.databaseVersion !== undefined && message.databaseVersion !== null) {
                        var error = $types[13].verify(message.databaseVersion);
                        if (error)
                            return "databaseVersion." + error;
                    }
                    if (message.refreshTimeout !== undefined)
                        if (!$util.isInteger(message.refreshTimeout))
                            return "refreshTimeout: integer expected";
                    return null;
                };

                DbRootProto.fromObject = function fromObject(object) {
                    if (object instanceof $root.keyhole.dbroot.DbRootProto)
                        return object;
                    var message = new $root.keyhole.dbroot.DbRootProto();
                    if (object.databaseName !== undefined && object.databaseName !== null) {
                        if (typeof object.databaseName !== "object")
                            throw TypeError(".keyhole.dbroot.DbRootProto.databaseName: object expected");
                        message.databaseName = $types[0].fromObject(object.databaseName);
                    }
                    if (object.imageryPresent !== undefined && object.imageryPresent !== null)
                        message.imageryPresent = Boolean(object.imageryPresent);
                    if (object.protoImagery !== undefined && object.protoImagery !== null)
                        message.protoImagery = Boolean(object.protoImagery);
                    if (object.terrainPresent !== undefined && object.terrainPresent !== null)
                        message.terrainPresent = Boolean(object.terrainPresent);
                    if (object.providerInfo) {
                        if (!Array.isArray(object.providerInfo))
                            throw TypeError(".keyhole.dbroot.DbRootProto.providerInfo: array expected");
                        message.providerInfo = [];
                        for (var i = 0; i < object.providerInfo.length; ++i) {
                            if (typeof object.providerInfo[i] !== "object")
                                throw TypeError(".keyhole.dbroot.DbRootProto.providerInfo: object expected");
                            message.providerInfo[i] = $types[4].fromObject(object.providerInfo[i]);
                        }
                    }
                    if (object.nestedFeature) {
                        if (!Array.isArray(object.nestedFeature))
                            throw TypeError(".keyhole.dbroot.DbRootProto.nestedFeature: array expected");
                        message.nestedFeature = [];
                        for (var i = 0; i < object.nestedFeature.length; ++i) {
                            if (typeof object.nestedFeature[i] !== "object")
                                throw TypeError(".keyhole.dbroot.DbRootProto.nestedFeature: object expected");
                            message.nestedFeature[i] = $types[5].fromObject(object.nestedFeature[i]);
                        }
                    }
                    if (object.styleAttribute) {
                        if (!Array.isArray(object.styleAttribute))
                            throw TypeError(".keyhole.dbroot.DbRootProto.styleAttribute: array expected");
                        message.styleAttribute = [];
                        for (var i = 0; i < object.styleAttribute.length; ++i) {
                            if (typeof object.styleAttribute[i] !== "object")
                                throw TypeError(".keyhole.dbroot.DbRootProto.styleAttribute: object expected");
                            message.styleAttribute[i] = $types[6].fromObject(object.styleAttribute[i]);
                        }
                    }
                    if (object.styleMap) {
                        if (!Array.isArray(object.styleMap))
                            throw TypeError(".keyhole.dbroot.DbRootProto.styleMap: array expected");
                        message.styleMap = [];
                        for (var i = 0; i < object.styleMap.length; ++i) {
                            if (typeof object.styleMap[i] !== "object")
                                throw TypeError(".keyhole.dbroot.DbRootProto.styleMap: object expected");
                            message.styleMap[i] = $types[7].fromObject(object.styleMap[i]);
                        }
                    }
                    if (object.endSnippet !== undefined && object.endSnippet !== null) {
                        if (typeof object.endSnippet !== "object")
                            throw TypeError(".keyhole.dbroot.DbRootProto.endSnippet: object expected");
                        message.endSnippet = $types[8].fromObject(object.endSnippet);
                    }
                    if (object.translationEntry) {
                        if (!Array.isArray(object.translationEntry))
                            throw TypeError(".keyhole.dbroot.DbRootProto.translationEntry: array expected");
                        message.translationEntry = [];
                        for (var i = 0; i < object.translationEntry.length; ++i) {
                            if (typeof object.translationEntry[i] !== "object")
                                throw TypeError(".keyhole.dbroot.DbRootProto.translationEntry: object expected");
                            message.translationEntry[i] = $types[9].fromObject(object.translationEntry[i]);
                        }
                    }
                    if (object.language !== undefined && object.language !== null)
                        message.language = String(object.language);
                    if (object.version !== undefined && object.version !== null)
                        message.version = object.version | 0;
                    if (object.dbrootReference) {
                        if (!Array.isArray(object.dbrootReference))
                            throw TypeError(".keyhole.dbroot.DbRootProto.dbrootReference: array expected");
                        message.dbrootReference = [];
                        for (var i = 0; i < object.dbrootReference.length; ++i) {
                            if (typeof object.dbrootReference[i] !== "object")
                                throw TypeError(".keyhole.dbroot.DbRootProto.dbrootReference: object expected");
                            message.dbrootReference[i] = $types[12].fromObject(object.dbrootReference[i]);
                        }
                    }
                    if (object.databaseVersion !== undefined && object.databaseVersion !== null) {
                        if (typeof object.databaseVersion !== "object")
                            throw TypeError(".keyhole.dbroot.DbRootProto.databaseVersion: object expected");
                        message.databaseVersion = $types[13].fromObject(object.databaseVersion);
                    }
                    if (object.refreshTimeout !== undefined && object.refreshTimeout !== null)
                        message.refreshTimeout = object.refreshTimeout | 0;
                    return message;
                };

                DbRootProto.from = DbRootProto.fromObject;

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
                        object.databaseName = null;
                        object.imageryPresent = true;
                        object.protoImagery = false;
                        object.terrainPresent = false;
                        object.endSnippet = null;
                        object.language = "en";
                        object.version = 5;
                        object.databaseVersion = null;
                        object.refreshTimeout = 0;
                    }
                    if (message.databaseName !== undefined && message.databaseName !== null && message.hasOwnProperty("databaseName"))
                        object.databaseName = $types[0].toObject(message.databaseName, options);
                    if (message.imageryPresent !== undefined && message.imageryPresent !== null && message.hasOwnProperty("imageryPresent"))
                        object.imageryPresent = message.imageryPresent;
                    if (message.protoImagery !== undefined && message.protoImagery !== null && message.hasOwnProperty("protoImagery"))
                        object.protoImagery = message.protoImagery;
                    if (message.terrainPresent !== undefined && message.terrainPresent !== null && message.hasOwnProperty("terrainPresent"))
                        object.terrainPresent = message.terrainPresent;
                    if (message.providerInfo !== undefined && message.providerInfo !== null && message.hasOwnProperty("providerInfo")) {
                        object.providerInfo = [];
                        for (var j = 0; j < message.providerInfo.length; ++j)
                            object.providerInfo[j] = $types[4].toObject(message.providerInfo[j], options);
                    }
                    if (message.nestedFeature !== undefined && message.nestedFeature !== null && message.hasOwnProperty("nestedFeature")) {
                        object.nestedFeature = [];
                        for (var j = 0; j < message.nestedFeature.length; ++j)
                            object.nestedFeature[j] = $types[5].toObject(message.nestedFeature[j], options);
                    }
                    if (message.styleAttribute !== undefined && message.styleAttribute !== null && message.hasOwnProperty("styleAttribute")) {
                        object.styleAttribute = [];
                        for (var j = 0; j < message.styleAttribute.length; ++j)
                            object.styleAttribute[j] = $types[6].toObject(message.styleAttribute[j], options);
                    }
                    if (message.styleMap !== undefined && message.styleMap !== null && message.hasOwnProperty("styleMap")) {
                        object.styleMap = [];
                        for (var j = 0; j < message.styleMap.length; ++j)
                            object.styleMap[j] = $types[7].toObject(message.styleMap[j], options);
                    }
                    if (message.endSnippet !== undefined && message.endSnippet !== null && message.hasOwnProperty("endSnippet"))
                        object.endSnippet = $types[8].toObject(message.endSnippet, options);
                    if (message.translationEntry !== undefined && message.translationEntry !== null && message.hasOwnProperty("translationEntry")) {
                        object.translationEntry = [];
                        for (var j = 0; j < message.translationEntry.length; ++j)
                            object.translationEntry[j] = $types[9].toObject(message.translationEntry[j], options);
                    }
                    if (message.language !== undefined && message.language !== null && message.hasOwnProperty("language"))
                        object.language = message.language;
                    if (message.version !== undefined && message.version !== null && message.hasOwnProperty("version"))
                        object.version = message.version;
                    if (message.dbrootReference !== undefined && message.dbrootReference !== null && message.hasOwnProperty("dbrootReference")) {
                        object.dbrootReference = [];
                        for (var j = 0; j < message.dbrootReference.length; ++j)
                            object.dbrootReference[j] = $types[12].toObject(message.dbrootReference[j], options);
                    }
                    if (message.databaseVersion !== undefined && message.databaseVersion !== null && message.hasOwnProperty("databaseVersion"))
                        object.databaseVersion = $types[13].toObject(message.databaseVersion, options);
                    if (message.refreshTimeout !== undefined && message.refreshTimeout !== null && message.hasOwnProperty("refreshTimeout"))
                        object.refreshTimeout = message.refreshTimeout;
                    return object;
                };

                DbRootProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                DbRootProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                return DbRootProto;
            })();

            dbroot.EncryptedDbRootProto = (function() {

                function EncryptedDbRootProto(properties) {
                    if (properties)
                        for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            this[keys[i]] = properties[keys[i]];
                }

                EncryptedDbRootProto.prototype.encryptionType = 0;
                EncryptedDbRootProto.prototype.encryptionData = $util.newBuffer([]);
                EncryptedDbRootProto.prototype.dbrootData = $util.newBuffer([]);

                var $types = {
                    0 : "keyhole.dbroot.EncryptedDbRootProto.EncryptionType"
                };
                $lazyTypes.push($types);

                EncryptedDbRootProto.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    var end = length === undefined ? reader.len : reader.pos + length,
                        message = new $root.keyhole.dbroot.EncryptedDbRootProto();
                    while (reader.pos < end) {
                        var tag = reader.uint32();
                        switch (tag >>> 3) {
                            case 1:
                                message.encryptionType = reader.uint32();
                                break;
                            case 2:
                                message.encryptionData = reader.bytes();
                                break;
                            case 3:
                                message.dbrootData = reader.bytes();
                                break;
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
                    if (message.encryptionType !== undefined)
                        switch (message.encryptionType) {
                            default:
                                return "encryptionType: enum value expected";
                            case 0:
                                break;
                        }
                    if (message.encryptionData !== undefined)
                        if (!(message.encryptionData && typeof message.encryptionData.length === "number" || $util.isString(message.encryptionData)))
                            return "encryptionData: buffer expected";
                    if (message.dbrootData !== undefined)
                        if (!(message.dbrootData && typeof message.dbrootData.length === "number" || $util.isString(message.dbrootData)))
                            return "dbrootData: buffer expected";
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
                    if (object.encryptionData !== undefined && object.encryptionData !== null)
                        if (typeof object.encryptionData === "string")
                            $util.base64.decode(object.encryptionData, message.encryptionData = $util.newBuffer($util.base64.length(object.encryptionData)), 0);
                        else if (object.encryptionData.length)
                            message.encryptionData = object.encryptionData;
                    if (object.dbrootData !== undefined && object.dbrootData !== null)
                        if (typeof object.dbrootData === "string")
                            $util.base64.decode(object.dbrootData, message.dbrootData = $util.newBuffer($util.base64.length(object.dbrootData)), 0);
                        else if (object.dbrootData.length)
                            message.dbrootData = object.dbrootData;
                    return message;
                };

                EncryptedDbRootProto.from = EncryptedDbRootProto.fromObject;

                EncryptedDbRootProto.toObject = function toObject(message, options) {
                    if (!options)
                        options = {};
                    var object = {};
                    if (options.defaults) {
                        object.encryptionType = options.enums === String ? "ENCRYPTION_XOR" : 0;
                        object.encryptionData = options.bytes === String ? "" : [];
                        object.dbrootData = options.bytes === String ? "" : [];
                    }
                    if (message.encryptionType !== undefined && message.encryptionType !== null && message.hasOwnProperty("encryptionType"))
                        object.encryptionType = options.enums === String ? $types[0][message.encryptionType] : message.encryptionType;
                    if (message.encryptionData !== undefined && message.encryptionData !== null && message.hasOwnProperty("encryptionData"))
                        object.encryptionData = options.bytes === String ? $util.base64.encode(message.encryptionData, 0, message.encryptionData.length) : options.bytes === Array ? Array.prototype.slice.call(message.encryptionData) : message.encryptionData;
                    if (message.dbrootData !== undefined && message.dbrootData !== null && message.hasOwnProperty("dbrootData"))
                        object.dbrootData = options.bytes === String ? $util.base64.encode(message.dbrootData, 0, message.dbrootData.length) : options.bytes === Array ? Array.prototype.slice.call(message.dbrootData) : message.dbrootData;
                    return object;
                };

                EncryptedDbRootProto.prototype.toObject = function toObject(options) {
                    return this.constructor.toObject(this, options);
                };

                EncryptedDbRootProto.prototype.toJSON = function toJSON() {
                    return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
                };

                EncryptedDbRootProto.EncryptionType = (function() {
                    var valuesById = {}, values = Object.create(valuesById);
                    values["ENCRYPTION_XOR"] = 0;
                    return values;
                })();

                return EncryptedDbRootProto;
            })();

            return dbroot;
        })();

        return keyhole;
    })();

    $util.lazyResolve($root, $lazyTypes);

    // End generated code

    return $root.keyhole.dbroot;
};
