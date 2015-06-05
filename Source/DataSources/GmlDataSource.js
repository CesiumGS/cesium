/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/definedNotNull',
        '../Core/defineProperties',
        '../Core/deprecationWarning',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/getFilenameFromUri',
        '../Core/PinBuilder',
        '../Core/PolygonHierarchy',
        '../Core/RuntimeError',
        '../Scene/VerticalOrigin',
        '../ThirdParty/when',
        './BillboardGraphics',
        './CallbackProperty',
        './ColorMaterialProperty',
        './ConstantPositionProperty',
        './ConstantProperty',
        './DataSource',
        './EntityCollection',
        './PointGraphics',
        './PolygonGraphics',
        './PolylineGraphics'
    ], function(
        Cartesian3,
        Color,
        createGuid,
        defaultValue,
        defined,
        definedNotNull,
        defineProperties,
        deprecationWarning,
        DeveloperError,
        Event,
        getFilenameFromUri,
        PinBuilder,
        PolygonHierarchy,
        RuntimeError,
        VerticalOrigin,
        when,
        BillboardGraphics,
        CallbackProperty,
        ColorMaterialProperty,
        ConstantPositionProperty,
        ConstantProperty,
        DataSource,
        EntityCollection,
        PointGraphics,
        PolygonGraphics,
        PolylineGraphics) {
    "use strict";

    var parser = new DOMParser();

    var defaultMarkerSize = 48;
    var defaultMarkerSymbol;
    var defaultMarkerColor = Color.ROYALBLUE;
    var defaultStroke = Color.YELLOW;
    var defaultStrokeWidth = 2;
    var defaultFill = Color.fromBytes(255, 255, 0, 100);

    var defaultStrokeWidthProperty = new ConstantProperty(defaultStrokeWidth);
    var defaultStrokeMaterialProperty = new ColorMaterialProperty(defaultStroke);
    var defaultFillMaterialProperty = new ColorMaterialProperty(defaultFill);

    function defaultCrsFunction(coordinates) {
        return Cartesian3.fromDegrees(coordinates[0], coordinates[1], coordinates[2]);
    }

    var sizes = {
        small : 24,
        medium : 48,
        large : 64
    };

    var gmlns = "http://www.opengis.net/gml";

    function readBlobAsText(blob) {
        var deferred = when.defer();
        var reader = new FileReader();
        reader.addEventListener('load', function() {
            deferred.resolve(reader.result);
        });
        reader.addEventListener('error', function() {
            deferred.reject(reader.error);
        });
        reader.readAsText(blob);
        return deferred;
    }

    function createObject(entityCollection) {
        /*var id = geoJson.id;
        if (!definedNotNull(id) || geoJson.type !== 'Feature') {
            id = createGuid();
        } else {
            var i = 2;
            var finalId = id;
            while (defined(entityCollection.getById(finalId))) {
                finalId = id + "_" + i;
                i++;
            }
            id = finalId;
        }*/
        var id = createGuid();
        var entity = entityCollection.getOrCreateEntity(id);
        //entity.name = "new entity";
        return entity;
    }

    function processFeatureCollection(that, gml) {
        var documentNode = gml.documentElement;
        var featureCollection = documentNode.getElementsByTagNameNS(gmlns, "featureMember") || documentNode.getElementsByTagNameNS(gmlns, "featureMembers");
        for(var i=0; i<featureCollection.length; i++) {
            var features = featureCollection[i].children;
            for(var j=0; j<features.length; j++) {
                processFeature(that, features[j]);
            }
        }
    }

    function processFeature(that, feature, options) {
        var i, geometryHandler, geometryElement;
        var properties = feature.children;
        for(i=0; i<properties.length; i++) {
            var childCount = properties[i].childElementCount;
            //elementCount > 0 implies that the property is geometry property.
            //elementCount = 0 implies that the property is simple type(non-spatial).
            if(childCount > 0) {
                //elementCount = 2 when BoundBy is also present.
                if(childCount == 1) {
                    geometryElement = properties[i].firstElementChild;
                    geometryHandler = geometryTypes[geometryElement.localName];
                } else if(childCount == 2) {
                    //Get srs from BoundBy element.
                    geomtryElement = properties[i].firstElementChild;
                    geometryHandler = geometryTypes[geometryElement.localName];
                }
                geometryHandler(that, geometryElement, options);
            } else if(childCount == 0) {
                //Non-spatial property. Will deal with this later.
                ;
            }
        }
    }

    function processPoint(that, point, options) {
        var coordinates = point.firstElementChild.textContent;
        coordinates = coordinates.split(" ");
        for(var i=0; i<coordinates.length; i++) {
            coordinates[i] = parseFloat(coordinates[i]);
        }
        if(coordinates.length == 2) {
            coordinates.push(0.0);
        }
        createPoint(that, coordinates, options);
    }

    function createPoint(that, coordinates) {
        var canvasOrPromise = that._pinBuilder.fromColor(defaultMarkerColor, defaultMarkerSize);

        that._promises.push(when(canvasOrPromise, function(dataUrl) {
            var billboard = new BillboardGraphics();
            billboard.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);
            billboard.image = new ConstantProperty(dataUrl);

            var entity = createObject(that._entityCollection);
            entity.billboard = billboard;
            entity.position = new ConstantPositionProperty(defaultCrsFunction(coordinates));
        }));
    }

    var geometryTypes = {
        //GeometryCollection : processGeometryCollection,
        //LineString : processLineString,
        //MultiLineString : processMultiLineString,
        //MultiPoint : processMultiPoint,
        //MultiPolygon : processMultiPolygon,
        Point : processPoint
        //Polygon : processPolygon
    };

    function loadGml(that, gml, sourceUri) {
        var name;
        if (defined(sourceUri)) {
            name = getFilenameFromUri(sourceUri);
        }

        if (defined(name) && that._name !== name) {
            that._name = name;
            that._changed.raiseEvent(that);
        }
        var crsFunction = defaultCrsFunction;
        
        return when(crsFunction, function (crsFunction) {
            that._entityCollection.removeAll();
            processFeatureCollection(that, gml);

            return when.all(that._promises, function() {
                that._promises.length = 0;
                DataSource.setLoading(that, false);
                return that;
            });
        });
    }

    var GmlDataSource = function(name) {
        this._name = name;
        this._changed = new Event();
        this._error = new Event();
        this._isLoading = false;
        this._loading = new Event();
        this._entityCollection = new EntityCollection();
        this._promises = [];
        this._pinBuilder = new PinBuilder();
    };

    defineProperties(GmlDataSource.prototype, {
        /**
         * Gets a human-readable name for this instance.
         * @memberof GeoJsonDataSource.prototype
         * @type {String}
         */
        name : {
            get : function() {
                return this._name;
            }
        },
        /**
         * This DataSource only defines static data, therefore this property is always undefined.
         * @memberof GeoJsonDataSource.prototype
         * @type {DataSourceClock}
         */
        clock : {
            value : undefined,
            writable : false
        },
        /**
         * Gets the collection of {@link Entity} instances.
         * @memberof GeoJsonDataSource.prototype
         * @type {EntityCollection}
         */
        entities : {
            get : function() {
                return this._entityCollection;
            }
        },
        /**
         * Gets a value indicating if the data source is currently loading data.
         * @memberof GeoJsonDataSource.prototype
         * @type {Boolean}
         */
        isLoading : {
            get : function() {
                return this._isLoading;
            }
        },
        /**
         * Gets an event that will be raised when the underlying data changes.
         * @memberof GeoJsonDataSource.prototype
         * @type {Event}
         */
        changedEvent : {
            get : function() {
                return this._changed;
            }
        },
        /**
         * Gets an event that will be raised if an error is encountered during processing.
         * @memberof GeoJsonDataSource.prototype
         * @type {Event}
         */
        errorEvent : {
            get : function() {
                return this._error;
            }
        },
        /**
         * Gets an event that will be raised when the data source either starts or stops loading.
         * @memberof GeoJsonDataSource.prototype
         * @type {Event}
         */
        loadingEvent : {
            get : function() {
                return this._loading;
            }
        }
    });

    GmlDataSource.load = function(data, options) {
        return new GmlDataSource().load(data, options);
    };

    GmlDataSource.prototype.load = function(data, options) {
        if (!defined(data)) {
            throw new DeveloperError('data is required.');
        }
        DataSource.setLoading(this, true);
        var sourceUri = options.sourceUri;

        var promise = data;
        if (typeof data === 'string') {
            promise = loadBlob(proxyUrl(data, this._proxy));
            sourceUri = defaultValue(sourceUri, data);
        }

        var that = this;
        return when(promise, function(dataToLoad) {
            if (dataToLoad instanceof Blob) {
                return when(readBlobAsText(dataToLoad)).then(function(text) {
                    //There's no official way to validate if a parse was successful.
                    //The following check detects the error on various browsers.

                    //IE raises an exception
                    var gml;
                    var error;
                    try {
                        gml = parser.parseFromString(text, 'application/xml');
                    } catch (e) {
                        error = e.toString();
                    }

                    //The parse succeeds on Chrome and Firefox, but the error
                    //handling is different in each.
                    if (defined(error) || gml.body || gml.documentElement.tagName === 'parsererror') {
                        //Firefox has error information as the firstChild nodeValue.
                        var msg = defined(error) ? error : gml.documentElement.firstChild.nodeValue;

                        //Chrome has it in the body text.
                        if (!msg) {
                            msg = gml.body.innerText;
                        }

                        //Return the error
                        throw new RuntimeError(msg);
                    }
                    var ret = loadGml(that, gml, sourceUri);
                    return ret;
                });
            } else {
                return when(loadGml(that, dataToLoad, sourceUri));
            }
        }).otherwise(function(error) {
            DataSource.setLoading(that, false);
            that._error.raiseEvent(that, error);
            window.console.log(error);
            return when.reject(error);
        });
    };

    return GmlDataSource;
});
