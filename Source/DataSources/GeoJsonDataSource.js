/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/getFilenameFromUri',
        '../Core/loadJson',
        '../Core/PinBuilder',
        '../Core/PolygonHierarchy',
        '../Core/RuntimeError',
        '../Scene/HeightReference',
        '../Scene/VerticalOrigin',
        '../ThirdParty/topojson',
        '../ThirdParty/when',
        './BillboardGraphics',
        './CallbackProperty',
        './ColorMaterialProperty',
        './ConstantPositionProperty',
        './ConstantProperty',
        './CorridorGraphics',
        './DataSource',
        './EntityCluster',
        './EntityCollection',
        './PolygonGraphics',
        './PolylineGraphics'
    ], function(
        Cartesian3,
        Color,
        createGuid,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        getFilenameFromUri,
        loadJson,
        PinBuilder,
        PolygonHierarchy,
        RuntimeError,
        HeightReference,
        VerticalOrigin,
        topojson,
        when,
        BillboardGraphics,
        CallbackProperty,
        ColorMaterialProperty,
        ConstantPositionProperty,
        ConstantProperty,
        CorridorGraphics,
        DataSource,
        EntityCluster,
        EntityCollection,
        PolygonGraphics,
        PolylineGraphics) {
    'use strict';

    function defaultCrsFunction(coordinates) {
        return Cartesian3.fromDegrees(coordinates[0], coordinates[1], coordinates[2]);
    }

    var crsNames = {
        'urn:ogc:def:crs:OGC:1.3:CRS84' : defaultCrsFunction,
        'EPSG:4326' : defaultCrsFunction,
        'urn:ogc:def:crs:EPSG::4326' : defaultCrsFunction
    };

    var crsLinkHrefs = {};
    var crsLinkTypes = {};
    var defaultMarkerSize = 48;
    var defaultMarkerSymbol;
    var defaultMarkerColor = Color.ROYALBLUE;
    var defaultStroke = Color.YELLOW;
    var defaultStrokeWidth = 2;
    var defaultFill = Color.fromBytes(255, 255, 0, 100);
    var defaultClampToGround = false;

    var defaultStrokeWidthProperty = new ConstantProperty(defaultStrokeWidth);
    var defaultStrokeMaterialProperty = new ColorMaterialProperty(defaultStroke);
    var defaultFillMaterialProperty = new ColorMaterialProperty(defaultFill);

    var sizes = {
        small : 24,
        medium : 48,
        large : 64
    };

    var simpleStyleIdentifiers = ['title', 'description', //
    'marker-size', 'marker-symbol', 'marker-color', 'stroke', //
    'stroke-opacity', 'stroke-width', 'fill', 'fill-opacity'];

    function defaultDescribe(properties, nameProperty) {
        var html = '';
        for ( var key in properties) {
            if (properties.hasOwnProperty(key)) {
                if (key === nameProperty || simpleStyleIdentifiers.indexOf(key) !== -1) {
                    continue;
                }
                var value = properties[key];
                if (defined(value)) {
                    if (typeof value === 'object') {
                        html += '<tr><th>' + key + '</th><td>' + defaultDescribe(value) + '</td></tr>';
                    } else {
                        html += '<tr><th>' + key + '</th><td>' + value + '</td></tr>';
                    }
                }
            }
        }

        if (html.length > 0) {
            html = '<table class="cesium-infoBox-defaultTable"><tbody>' + html + '</tbody></table>';
        }

        return html;
    }

    function createDescriptionCallback(describe, properties, nameProperty) {
        var description;
        return function(time, result) {
            if (!defined(description)) {
                description = describe(properties, nameProperty);
            }
            return description;
        };
    }

    function defaultDescribeProperty(properties, nameProperty) {
        return new CallbackProperty(createDescriptionCallback(defaultDescribe, properties, nameProperty), true);
    }

    //GeoJSON specifies only the Feature object has a usable id property
    //But since "multi" geometries create multiple entity,
    //we can't use it for them either.
    function createObject(geoJson, entityCollection, describe) {
        var id = geoJson.id;
        if (!defined(id) || geoJson.type !== 'Feature') {
            id = createGuid();
        } else {
            var i = 2;
            var finalId = id;
            while (defined(entityCollection.getById(finalId))) {
                finalId = id + "_" + i;
                i++;
            }
            id = finalId;
        }

        var entity = entityCollection.getOrCreateEntity(id);
        var properties = geoJson.properties;
        if (defined(properties)) {
            entity.properties = properties;

            var nameProperty;

            //Check for the simplestyle specified name first.
            var name = properties.title;
            if (defined(name)) {
                entity.name = name;
                nameProperty = 'title';
            } else {
                //Else, find the name by selecting an appropriate property.
                //The name will be obtained based on this order:
                //1) The first case-insensitive property with the name 'title',
                //2) The first case-insensitive property with the name 'name',
                //3) The first property containing the word 'title'.
                //4) The first property containing the word 'name',
                var namePropertyPrecedence = Number.MAX_VALUE;
                for ( var key in properties) {
                    if (properties.hasOwnProperty(key) && properties[key]) {
                        var lowerKey = key.toLowerCase();

                        if (namePropertyPrecedence > 1 && lowerKey === 'title') {
                            namePropertyPrecedence = 1;
                            nameProperty = key;
                            break;
                        } else if (namePropertyPrecedence > 2 && lowerKey === 'name') {
                            namePropertyPrecedence = 2;
                            nameProperty = key;
                        } else if (namePropertyPrecedence > 3 && /title/i.test(key)) {
                            namePropertyPrecedence = 3;
                            nameProperty = key;
                        } else if (namePropertyPrecedence > 4 && /name/i.test(key)) {
                            namePropertyPrecedence = 4;
                            nameProperty = key;
                        }
                    }
                }
                if (defined(nameProperty)) {
                    entity.name = properties[nameProperty];
                }
            }

            var description = properties.description;
            if (description !== null) {
                entity.description = !defined(description) ? describe(properties, nameProperty) : new ConstantProperty(description);
            }
        }
        return entity;
    }

    function coordinatesArrayToCartesianArray(coordinates, crsFunction) {
        var positions = new Array(coordinates.length);
        for (var i = 0; i < coordinates.length; i++) {
            positions[i] = crsFunction(coordinates[i]);
        }
        return positions;
    }

    // GeoJSON processing functions
    function processFeature(dataSource, feature, notUsed, crsFunction, options) {
        if (feature.geometry === null) {
            //Null geometry is allowed, so just create an empty entity instance for it.
            createObject(feature, dataSource._entityCollection, options.describe);
            return;
        }

        if (!defined(feature.geometry)) {
            throw new RuntimeError('feature.geometry is required.');
        }

        var geometryType = feature.geometry.type;
        var geometryHandler = geometryTypes[geometryType];
        if (!defined(geometryHandler)) {
            throw new RuntimeError('Unknown geometry type: ' + geometryType);
        }
        geometryHandler(dataSource, feature, feature.geometry, crsFunction, options);
    }

    function processFeatureCollection(dataSource, featureCollection, notUsed, crsFunction, options) {
        var features = featureCollection.features;
        for (var i = 0, len = features.length; i < len; i++) {
            processFeature(dataSource, features[i], undefined, crsFunction, options);
        }
    }

    function processGeometryCollection(dataSource, geoJson, geometryCollection, crsFunction, options) {
        var geometries = geometryCollection.geometries;
        for (var i = 0, len = geometries.length; i < len; i++) {
            var geometry = geometries[i];
            var geometryType = geometry.type;
            var geometryHandler = geometryTypes[geometryType];
            if (!defined(geometryHandler)) {
                throw new RuntimeError('Unknown geometry type: ' + geometryType);
            }
            geometryHandler(dataSource, geoJson, geometry, crsFunction, options);
        }
    }

    function createPoint(dataSource, geoJson, crsFunction, coordinates, options) {
        var symbol = options.markerSymbol;
        var color = options.markerColor;
        var size = options.markerSize;

        var properties = geoJson.properties;
        if (defined(properties)) {
            var cssColor = properties['marker-color'];
            if (defined(cssColor)) {
                color = Color.fromCssColorString(cssColor);
            }

            size = defaultValue(sizes[properties['marker-size']], size);
            var markerSymbol = properties['marker-symbol'];
            if (defined(markerSymbol)) {
                symbol = markerSymbol;
            }
        }

        var canvasOrPromise;
        if (defined(symbol)) {
            if (symbol.length === 1) {
                canvasOrPromise = dataSource._pinBuilder.fromText(symbol.toUpperCase(), color, size);
            } else {
                canvasOrPromise = dataSource._pinBuilder.fromMakiIconId(symbol, color, size);
            }
        } else {
            canvasOrPromise = dataSource._pinBuilder.fromColor(color, size);
        }

        var billboard = new BillboardGraphics();
        billboard.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);

        // Clamp to ground if there isn't a height specified
        if (coordinates.length === 2 && options.clampToGround) {
            billboard.heightReference = HeightReference.CLAMP_TO_GROUND;
        }

        var entity = createObject(geoJson, dataSource._entityCollection, options.describe);
        entity.billboard = billboard;
        entity.position = new ConstantPositionProperty(crsFunction(coordinates));

        var promise = when(canvasOrPromise).then(function(image) {
            billboard.image = new ConstantProperty(image);
        }).otherwise(function() {
            billboard.image = new ConstantProperty(dataSource._pinBuilder.fromColor(color, size));
        });

        dataSource._promises.push(promise);
    }

    function processPoint(dataSource, geoJson, geometry, crsFunction, options) {
        createPoint(dataSource, geoJson, crsFunction, geometry.coordinates, options);
    }

    function processMultiPoint(dataSource, geoJson, geometry, crsFunction, options) {
        var coordinates = geometry.coordinates;
        for (var i = 0; i < coordinates.length; i++) {
            createPoint(dataSource, geoJson, crsFunction, coordinates[i], options);
        }
    }

    function createLineString(dataSource, geoJson, crsFunction, coordinates, options) {
        var material = options.strokeMaterialProperty;
        var widthProperty = options.strokeWidthProperty;

        var properties = geoJson.properties;
        if (defined(properties)) {
            var width = properties['stroke-width'];
            if (defined(width)) {
                widthProperty = new ConstantProperty(width);
            }

            var color;
            var stroke = properties.stroke;
            if (defined(stroke)) {
                color = Color.fromCssColorString(stroke);
            }
            var opacity = properties['stroke-opacity'];
            if (defined(opacity) && opacity !== 1.0) {
                if (!defined(color)) {
                    color = material.color.clone();
                }
                color.alpha = opacity;
            }
            if (defined(color)) {
                material = new ColorMaterialProperty(color);
            }
        }

        var entity = createObject(geoJson, dataSource._entityCollection, options.describe);
        var graphics;
        if (options.clampToGround) {
            graphics = new CorridorGraphics();
            entity.corridor = graphics;
        } else {
            graphics = new PolylineGraphics();
            entity.polyline = graphics;
        }

        graphics.material = material;
        graphics.width = widthProperty;
        graphics.positions = new ConstantProperty(coordinatesArrayToCartesianArray(coordinates, crsFunction));
    }

    function processLineString(dataSource, geoJson, geometry, crsFunction, options) {
        createLineString(dataSource, geoJson, crsFunction, geometry.coordinates, options);
    }

    function processMultiLineString(dataSource, geoJson, geometry, crsFunction, options) {
        var lineStrings = geometry.coordinates;
        for (var i = 0; i < lineStrings.length; i++) {
            createLineString(dataSource, geoJson, crsFunction, lineStrings[i], options);
        }
    }

    function createPolygon(dataSource, geoJson, crsFunction, coordinates, options) {
        if (coordinates.length === 0 || coordinates[0].length === 0) {
            return;
        }

        var outlineColorProperty = options.strokeMaterialProperty.color;
        var material = options.fillMaterialProperty;
        var widthProperty = options.strokeWidthProperty;

        var properties = geoJson.properties;
        if (defined(properties)) {
            var width = properties['stroke-width'];
            if (defined(width)) {
                widthProperty = new ConstantProperty(width);
            }

            var color;
            var stroke = properties.stroke;
            if (defined(stroke)) {
                color = Color.fromCssColorString(stroke);
            }
            var opacity = properties['stroke-opacity'];
            if (defined(opacity) && opacity !== 1.0) {
                if (!defined(color)) {
                    color = options.strokeMaterialProperty.color.clone();
                }
                color.alpha = opacity;
            }

            if (defined(color)) {
                outlineColorProperty = new ConstantProperty(color);
            }

            var fillColor;
            var fill = properties.fill;
            if (defined(fill)) {
                fillColor = Color.fromCssColorString(fill);
                fillColor.alpha = material.color.alpha;
            }
            opacity = properties['fill-opacity'];
            if (defined(opacity) && opacity !== material.color.alpha) {
                if (!defined(fillColor)) {
                    fillColor = material.color.clone();
                }
                fillColor.alpha = opacity;
            }
            if (defined(fillColor)) {
                material = new ColorMaterialProperty(fillColor);
            }
        }

        var polygon = new PolygonGraphics();
        polygon.outline = new ConstantProperty(true);
        polygon.outlineColor = outlineColorProperty;
        polygon.outlineWidth = widthProperty;
        polygon.material = material;

        var holes = [];
        for (var i = 1, len = coordinates.length; i < len; i++) {
            holes.push(new PolygonHierarchy(coordinatesArrayToCartesianArray(coordinates[i], crsFunction)));
        }

        var positions = coordinates[0];
        polygon.hierarchy = new ConstantProperty(new PolygonHierarchy(coordinatesArrayToCartesianArray(positions, crsFunction), holes));
        if (positions[0].length > 2) {
            polygon.perPositionHeight = new ConstantProperty(true);
        } else if (!options.clampToGround) {
            polygon.height = 0;
        }

        var entity = createObject(geoJson, dataSource._entityCollection, options.describe);
        entity.polygon = polygon;
    }

    function processPolygon(dataSource, geoJson, geometry, crsFunction, options) {
        createPolygon(dataSource, geoJson, crsFunction, geometry.coordinates, options);
    }

    function processMultiPolygon(dataSource, geoJson, geometry, crsFunction, options) {
        var polygons = geometry.coordinates;
        for (var i = 0; i < polygons.length; i++) {
            createPolygon(dataSource, geoJson, crsFunction, polygons[i], options);
        }
    }

    function processTopology(dataSource, geoJson, geometry, crsFunction, options) {
        for ( var property in geometry.objects) {
            if (geometry.objects.hasOwnProperty(property)) {
                var feature = topojson.feature(geometry, geometry.objects[property]);
                var typeHandler = geoJsonObjectTypes[feature.type];
                typeHandler(dataSource, feature, feature, crsFunction, options);
            }
        }
    }

    var geoJsonObjectTypes = {
        Feature : processFeature,
        FeatureCollection : processFeatureCollection,
        GeometryCollection : processGeometryCollection,
        LineString : processLineString,
        MultiLineString : processMultiLineString,
        MultiPoint : processMultiPoint,
        MultiPolygon : processMultiPolygon,
        Point : processPoint,
        Polygon : processPolygon,
        Topology : processTopology
    };

    var geometryTypes = {
        GeometryCollection : processGeometryCollection,
        LineString : processLineString,
        MultiLineString : processMultiLineString,
        MultiPoint : processMultiPoint,
        MultiPolygon : processMultiPolygon,
        Point : processPoint,
        Polygon : processPolygon,
        Topology : processTopology
    };

    /**
     * A {@link DataSource} which processes both
     * {@link http://www.geojson.org/|GeoJSON} and {@link https://github.com/mbostock/topojson|TopoJSON} data.
     * {@link https://github.com/mapbox/simplestyle-spec|simplestyle-spec} properties will also be used if they
     * are present.
     *
     * @alias GeoJsonDataSource
     * @constructor
     *
     * @param {String} [name] The name of this data source.  If undefined, a name will be taken from
     *                        the name of the GeoJSON file.
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=GeoJSON%20and%20TopoJSON.html|Cesium Sandcastle GeoJSON and TopoJSON Demo}
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=GeoJSON%20simplestyle.html|Cesium Sandcastle GeoJSON simplestyle Demo}
     *
     * @example
     * var viewer = new Cesium.Viewer('cesiumContainer');
     * viewer.dataSources.add(Cesium.GeoJsonDataSource.load('../../SampleData/ne_10m_us_states.topojson', {
     *   stroke: Cesium.Color.HOTPINK,
     *   fill: Cesium.Color.PINK,
     *   strokeWidth: 3,
     *   markerSymbol: '?'
     * }));
     */
    function GeoJsonDataSource(name) {
        this._name = name;
        this._changed = new Event();
        this._error = new Event();
        this._isLoading = false;
        this._loading = new Event();
        this._entityCollection = new EntityCollection(this);
        this._promises = [];
        this._pinBuilder = new PinBuilder();
        this._entityCluster = new EntityCluster();
    }

    /**
     * Creates a Promise to a new instance loaded with the provided GeoJSON or TopoJSON data.
     *
     * @param {String|Object} data A url, GeoJSON object, or TopoJSON object to be loaded.
     * @param {Object} [options] An object with the following properties:
     * @param {String} [options.sourceUri] Overrides the url to use for resolving relative links.
     * @param {Number} [options.markerSize=GeoJsonDataSource.markerSize] The default size of the map pin created for each point, in pixels.
     * @param {String} [options.markerSymbol=GeoJsonDataSource.markerSymbol] The default symbol of the map pin created for each point.
     * @param {Color} [options.markerColor=GeoJsonDataSource.markerColor] The default color of the map pin created for each point.
     * @param {Color} [options.stroke=GeoJsonDataSource.stroke] The default color of polylines and polygon outlines.
     * @param {Number} [options.strokeWidth=GeoJsonDataSource.strokeWidth] The default width of polylines and polygon outlines.
     * @param {Color} [options.fill=GeoJsonDataSource.fill] The default color for polygon interiors.
     * @param {Boolean} [options.clampToGround=GeoJsonDataSource.clampToGround] true if we want the geometry features (polygons or linestrings) clamped to the ground. If true, lines will use corridors so use Entity.corridor instead of Entity.polyline.
     *
     * @returns {Promise.<GeoJsonDataSource>} A promise that will resolve when the data is loaded.
     */
    GeoJsonDataSource.load = function(data, options) {
        return new GeoJsonDataSource().load(data, options);
    };

    defineProperties(GeoJsonDataSource, {
        /**
         * Gets or sets the default size of the map pin created for each point, in pixels.
         * @memberof GeoJsonDataSource
         * @type {Number}
         * @default 48
         */
        markerSize : {
            get : function() {
                return defaultMarkerSize;
            },
            set : function(value) {
                defaultMarkerSize = value;
            }
        },
        /**
         * Gets or sets the default symbol of the map pin created for each point.
         * This can be any valid {@link http://mapbox.com/maki/|Maki} identifier, any single character,
         * or blank if no symbol is to be used.
         * @memberof GeoJsonDataSource
         * @type {String}
         */
        markerSymbol : {
            get : function() {
                return defaultMarkerSymbol;
            },
            set : function(value) {
                defaultMarkerSymbol = value;
            }
        },
        /**
         * Gets or sets the default color of the map pin created for each point.
         * @memberof GeoJsonDataSource
         * @type {Color}
         * @default Color.ROYALBLUE
         */
        markerColor : {
            get : function() {
                return defaultMarkerColor;
            },
            set : function(value) {
                defaultMarkerColor = value;
            }
        },
        /**
         * Gets or sets the default color of polylines and polygon outlines.
         * @memberof GeoJsonDataSource
         * @type {Color}
         * @default Color.BLACK
         */
        stroke : {
            get : function() {
                return defaultStroke;
            },
            set : function(value) {
                defaultStroke = value;
                defaultStrokeMaterialProperty.color.setValue(value);
            }
        },
        /**
         * Gets or sets the default width of polylines and polygon outlines.
         * @memberof GeoJsonDataSource
         * @type {Number}
         * @default 2.0
         */
        strokeWidth : {
            get : function() {
                return defaultStrokeWidth;
            },
            set : function(value) {
                defaultStrokeWidth = value;
                defaultStrokeWidthProperty.setValue(value);
            }
        },
        /**
         * Gets or sets default color for polygon interiors.
         * @memberof GeoJsonDataSource
         * @type {Color}
         * @default Color.YELLOW
         */
        fill : {
            get : function() {
                return defaultFill;
            },
            set : function(value) {
                defaultFill = value;
                defaultFillMaterialProperty = new ColorMaterialProperty(defaultFill);
            }
        },
        /**
         * Gets or sets default of whether to clamp to the ground.
         * @memberof GeoJsonDataSource
         * @type {Boolean}
         * @default false
         */
        clampToGround : {
            get : function() {
                return defaultClampToGround;
            },
            set : function(value) {
                defaultClampToGround = value;
            }
        },

        /**
         * Gets an object that maps the name of a crs to a callback function which takes a GeoJSON coordinate
         * and transforms it into a WGS84 Earth-fixed Cartesian.  Older versions of GeoJSON which
         * supported the EPSG type can be added to this list as well, by specifying the complete EPSG name,
         * for example 'EPSG:4326'.
         * @memberof GeoJsonDataSource
         * @type {Object}
         */
        crsNames : {
            get : function() {
                return crsNames;
            }
        },

        /**
         * Gets an object that maps the href property of a crs link to a callback function
         * which takes the crs properties object and returns a Promise that resolves
         * to a function that takes a GeoJSON coordinate and transforms it into a WGS84 Earth-fixed Cartesian.
         * Items in this object take precedence over those defined in <code>crsLinkHrefs</code>, assuming
         * the link has a type specified.
         * @memberof GeoJsonDataSource
         * @type {Object}
         */
        crsLinkHrefs : {
            get : function() {
                return crsLinkHrefs;
            }
        },

        /**
         * Gets an object that maps the type property of a crs link to a callback function
         * which takes the crs properties object and returns a Promise that resolves
         * to a function that takes a GeoJSON coordinate and transforms it into a WGS84 Earth-fixed Cartesian.
         * Items in <code>crsLinkHrefs</code> take precedence over this object.
         * @memberof GeoJsonDataSource
         * @type {Object}
         */
        crsLinkTypes : {
            get : function() {
                return crsLinkTypes;
            }
        }
    });

    defineProperties(GeoJsonDataSource.prototype, {
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
        },
        /**
         * Gets whether or not this data source should be displayed.
         * @memberof GeoJsonDataSource.prototype
         * @type {Boolean}
         */
        show : {
            get : function() {
                return this._entityCollection.show;
            },
            set : function(value) {
                this._entityCollection.show = value;
            }
        },

        /**
         * Gets or sets the clustering options for this data source. This object can be shared between multiple data sources.
         *
         * @memberof GeoJsonDataSource.prototype
         * @type {EntityCluster}
         */
        clustering : {
            get : function() {
                return this._entityCluster;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value must be defined.');
                }
                //>>includeEnd('debug');
                this._entityCluster = value;
            }
        }
    });

    /**
     * Asynchronously loads the provided GeoJSON or TopoJSON data, replacing any existing data.
     *
     * @param {String|Object} data A url, GeoJSON object, or TopoJSON object to be loaded.
     * @param {Object} [options] An object with the following properties:
     * @param {String} [options.sourceUri] Overrides the url to use for resolving relative links.
     * @param {GeoJsonDataSource~describe} [options.describe=GeoJsonDataSource.defaultDescribeProperty] A function which returns a Property object (or just a string),
     *                                                                                which converts the properties into an html description.
     * @param {Number} [options.markerSize=GeoJsonDataSource.markerSize] The default size of the map pin created for each point, in pixels.
     * @param {String} [options.markerSymbol=GeoJsonDataSource.markerSymbol] The default symbol of the map pin created for each point.
     * @param {Color} [options.markerColor=GeoJsonDataSource.markerColor] The default color of the map pin created for each point.
     * @param {Color} [options.stroke=GeoJsonDataSource.stroke] The default color of polylines and polygon outlines.
     * @param {Number} [options.strokeWidth=GeoJsonDataSource.strokeWidth] The default width of polylines and polygon outlines.
     * @param {Color} [options.fill=GeoJsonDataSource.fill] The default color for polygon interiors.
     * @param {Boolean} [options.clampToGround=GeoJsonDataSource.clampToGround] true if we want the features clamped to the ground.
     *
     * @returns {Promise.<GeoJsonDataSource>} a promise that will resolve when the GeoJSON is loaded.
     */
    GeoJsonDataSource.prototype.load = function(data, options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(data)) {
            throw new DeveloperError('data is required.');
        }
        //>>includeEnd('debug');

        DataSource.setLoading(this, true);

        var promise = data;
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var sourceUri = options.sourceUri;
        if (typeof data === 'string') {
            if (!defined(sourceUri)) {
                sourceUri = data;
            }
            promise = loadJson(data);
        }

        options = {
            describe: defaultValue(options.describe, defaultDescribeProperty),
            markerSize : defaultValue(options.markerSize, defaultMarkerSize),
            markerSymbol : defaultValue(options.markerSymbol, defaultMarkerSymbol),
            markerColor : defaultValue(options.markerColor, defaultMarkerColor),
            strokeWidthProperty : new ConstantProperty(defaultValue(options.strokeWidth, defaultStrokeWidth)),
            strokeMaterialProperty : new ColorMaterialProperty(defaultValue(options.stroke, defaultStroke)),
            fillMaterialProperty : new ColorMaterialProperty(defaultValue(options.fill, defaultFill)),
            clampToGround : defaultValue(options.clampToGround, defaultClampToGround)
        };

        var that = this;
        return when(promise, function(geoJson) {
            return load(that, geoJson, options, sourceUri);
        }).otherwise(function(error) {
            DataSource.setLoading(that, false);
            that._error.raiseEvent(that, error);
            console.log(error);
            return when.reject(error);
        });
    };

    function load(that, geoJson, options, sourceUri) {
        var name;
        if (defined(sourceUri)) {
            name = getFilenameFromUri(sourceUri);
        }

        if (defined(name) && that._name !== name) {
            that._name = name;
            that._changed.raiseEvent(that);
        }

        var typeHandler = geoJsonObjectTypes[geoJson.type];
        if (!defined(typeHandler)) {
            throw new RuntimeError('Unsupported GeoJSON object type: ' + geoJson.type);
        }

        //Check for a Coordinate Reference System.
        var crs = geoJson.crs;
        var crsFunction = crs !== null ? defaultCrsFunction : null;

        if (defined(crs)) {
            if (!defined(crs.properties)) {
                throw new RuntimeError('crs.properties is undefined.');
            }

            var properties = crs.properties;
            if (crs.type === 'name') {
                crsFunction = crsNames[properties.name];
                if (!defined(crsFunction)) {
                    throw new RuntimeError('Unknown crs name: ' + properties.name);
                }
            } else if (crs.type === 'link') {
                var handler = crsLinkHrefs[properties.href];
                if (!defined(handler)) {
                    handler = crsLinkTypes[properties.type];
                }

                if (!defined(handler)) {
                    throw new RuntimeError('Unable to resolve crs link: ' + JSON.stringify(properties));
                }

                crsFunction = handler(properties);
            } else if (crs.type === 'EPSG') {
                crsFunction = crsNames['EPSG:' + properties.code];
                if (!defined(crsFunction)) {
                    throw new RuntimeError('Unknown crs EPSG code: ' + properties.code);
                }
            } else {
                throw new RuntimeError('Unknown crs type: ' + crs.type);
            }
        }

        return when(crsFunction, function(crsFunction) {
            that._entityCollection.removeAll();

            // null is a valid value for the crs, but means the entire load process becomes a no-op
            // because we can't assume anything about the coordinates.
            if (crsFunction !== null) {
                typeHandler(that, geoJson, geoJson, crsFunction, options);
            }

            return when.all(that._promises, function() {
                that._promises.length = 0;
                DataSource.setLoading(that, false);
                return that;
            });
        });
    }

    /**
     * This callback is displayed as part of the GeoJsonDataSource class.
     * @callback GeoJsonDataSource~describe
     * @param {Object} properties The properties of the feature.
     * @param {String} nameProperty The property key that Cesium estimates to have the name of the feature.
     */

    return GeoJsonDataSource;
});
