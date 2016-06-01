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
        '../Core/loadBlob',
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
        './EllipseGraphics',
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
        loadBlob,
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
        EllipseGraphics,
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

    var crsNames = {
    	'EPSG:4326' : defaultCrsFunction,
    	'urn:ogc:def:crs:EPSG::4326' : defaultCrsFunction,
    	'urn:ogc:def:crs:EPSG:6.6:4326' : defaultCrsFunction,
    	'http://www.opengis.net/gml/srs/epsg.xml#4326' : defaultCrsFunction
    };

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

    function proxyUrl(url, proxy) {
        if (defined(proxy)) {
            if (new Uri(url).isAbsolute()) {
                url = proxy.getURL(url);
            }
        }
        return url;
    }

    function processCoordinates(coordString, crsProperties) {
        var i;
        var coordString = coordString.replace(/\s\s+/g, ' ');
        var coords = coordString.split(" ");
        var crsFunction = crsProperties.crsFunction;
        var crsDimension = crsProperties.crsDimension;
        if(coords.length == crsDimension) {
            for(i = 0; i < coords.length; i++) {
                coords[i] = parseFloat(coords[i]);
            }
            return crsFunction(coords);
        }
        else {
            var coordinates = [];
            for(i = 0; i < coords.length; i += crsDimension) {
                if(crsDimension == 2) {
                    var c = [parseFloat(coords[i]), parseFloat(coords[i+1])];
                    coordinates.push(crsFunction(c));
                } else if(crsDimension == 3) {
                    var c = [parseFloat(coords[i]), parseFloat(coords[i+1]), parseFloat(coords[i+2])];
                    coordinates.push(crsFunction(c));
                }
            }
            return coordinates;
        }
    }

    function createObject(entityCollection, properties) {
        var id = createGuid();
        var entity = entityCollection.getOrCreateEntity(id);
        entity.addProperty('properties');
        entity.properties = properties;
        return entity;
    }

    function getCrsProperties(node, crsProperties) {
    	var crsName = node.getAttribute('srsName');
    	if(crsName) {
    		var crsFunction = crsNames[crsName];
    		if(!defined(crsFunction)) {
    			return RuntimeError('Unknown crs name: ' + crsName);
    		}
    		crsProperties.crsFunction = crsFunction;
    	}

    	var crsDimension = node.getAttribute('srsDimension');
    	if(crsDimension) {
    		crsDimension = parseInt(crsDimension);
    		crsProperties.crsDimension = crsDimension;
    	}
    	return crsProperties;
    }

    function processFeatureCollection(that, gml) {
        var documentNode = gml.documentElement;
        var featureCollection = documentNode.getElementsByTagNameNS(gmlns, "featureMember");
        if(featureCollection.length == 0) {
        	featureCollection = documentNode.getElementsByTagNameNS(gmlns, "featureMembers");
        }

		var crsProperties = {'crsFunction' : defaultCrsFunction, 'crsDimension' : 2};
        var boundedByNode = documentNode.getElementsByTagNameNS(gmlns, "boundedBy")[0];
        if(boundedByNode) {
        	crsProperties = getCrsProperties(boundedByNode.firstElementChild, crsProperties);
        }

        for(var i = 0; i < featureCollection.length; i++) {
            var features = featureCollection[i].children;
            for(var j = 0; j < features.length; j++) {
                processFeature(that, features[j], crsProperties);
            }
        }
    }

    function processFeature(that, feature, crsProperties) {
        var i, j, geometryHandler, geometryElements = [];
        var crsFunction = defaultCrsFunction;
        var properties = {};

        var boundedByNode = feature.getElementsByTagNameNS(gmlns, "boundedBy")[0];
        if(boundedByNode) {
        	crsProperties = getCrsProperties(feature.firstElementChild, crsProperties);
	        feature.removeChild(boundedByNode);
		}

        var elements = feature.children;
        for(i = 0; i < elements.length; i++) {
            var childCount = elements[i].childElementCount;
            if(childCount == 0) {
                //Non-nested non-spatial properties.
                properties[elements[i].localName] = elements[i].textContent;
            } else if(childCount > 0) {
            	//Nested and geometry properties.
            	var subElements = elements[i].children;
            	var prop = {};
            	for(j = 0; j < childCount; j++) {
            		if(subElements[j].namespaceURI === gmlns) {
            			geometryElements.push(subElements[j]);
            		} else {
            			prop[subElements[j].localName] = subElements[j].textContent;
            		}
            	}
            	if(Object.keys(prop).length) {
            		properties[elements[i].localName] = prop;
            	}
            }
        }
        for(i = 0; i < geometryElements.length; i++) {
        	geometryHandler = geometryPropertyTypes[geometryElements[i].localName];
        	geometryHandler(that, geometryElements[i], properties, crsProperties);
        }
    }

    function processPoint(that, point, properties, crsProperties) {
    	crsProperties = getCrsProperties(point, crsProperties);
        var coordString = point.firstElementChild.textContent;
        var coordinates = processCoordinates(coordString, crsProperties);
        createPoint(that, coordinates, properties, crsProperties);
    }

    function processMultiPoint(that, multiPoint, properties, crsProperties) {
        crsProperties = getCrsProperties(multiPoint, crsProperties);
        var pointMembers = multiPoint.getElementsByTagNameNS(gmlns, "pointMember");
        if(pointMembers.length == 0) {
        	pointMembers = multiPoint.getElementsByTagNameNS(gmlns, "pointMembers");
        }

        for(var i = 0; i < pointMembers.length; i++) {
            var points = pointMembers[i].children;
            for(var j = 0; j < points.length; j++) {
            	processPoint(that, points[j], properties, crsProperties);
            }
        }
    }

    function createPoint(that, coordinates, properties, crsProperties) {
        var canvasOrPromise = that._pinBuilder.fromColor(defaultMarkerColor, defaultMarkerSize);

        that._promises.push(when(canvasOrPromise, function(dataUrl) {
            var billboard = new BillboardGraphics();
            billboard.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);
            billboard.image = new ConstantProperty(dataUrl);

            var entity = createObject(that._entityCollection, properties);
            entity.billboard = billboard;
            entity.position = new ConstantPositionProperty(coordinates);
        }));
    }

    function processLineString(that, lineString, properties, crsProperties) {
        crsProperties = getCrsProperties(lineString, crsProperties);
        var coordString = lineString.firstElementChild.textContent;
        var coordinates = processCoordinates(coordString, crsProperties);
        createPolyline(that, coordinates, true, properties, crsProperties);
    }

    function processMultiLineString(that, multiLineString, properties, crsProperties) {
        crsProperties = getCrsProperties(multiLineString, crsProperties);
        var lineStringMembers = multiLineString.getElementsByTagNameNS(gmlns, "lineStringMember");
        if(lineStringMembers.length == 0) {
        	lineStringMembers = multiLineString.getElementsByTagNameNS(gmlns, "lineStringMembers");
        }
        for(var i = 0; i < lineStringMembers.length; i++) {
            var lineStrings = lineStringMembers[i].children;
            for(var j = 0; j < lineStrings.length; j++) {
            	processLineString(that, lineStrings[j], properties, crsProperties);
            }
        }
    }

    function processCurve(that, curve, properties, crsProperties) {
    	crsProperties = getCrsProperties(curve, crsProperties);
        var segments = curve.firstElementChild.children;
        processSegments(that, segments, properties, crsProperties);
    }

    function processMultiCurve(that, multiCurve, properties, crsProperties) {
    	crsProperties = getCrsProperties(multiCurve, crsProperties);
        var curveMembers = multiCurve.getElementsByTagNameNS(gmlns, "curveMember");
    	if(curveMembers.length == 0) {
    		curveMembers = multiCurve.getElementsByTagNameNS(gmlns, "curveMembers");
    	}

    	for(var i = 0; i < curveMembers.length; i++) {
    		var curves = curveMembers[i].children;
    		for(var j = 0; j < curves.length; j++) {
				var curveTypeHandler = curvePropertyTypes[curves[j].localName];
				curveTypeHandler(that, curves[j], properties, crsProperties);
    		}
    	}
    }

    function processSegments(that, segments, properties, crsProperties) {
        var polyline = {coordinates : [], followSurface : true};
        for(var i = 0; i < segments.length; i++) {
            var curveGeometryHandler = curveSegmentTypes[segments[i].localName];
            var polyline = curveGeometryHandler(that, segments[i], polyline, properties, crsProperties);
        }
        if(polyline.coordinates.length > 1) {
            createPolyline(that, polyline.coordinates, polyline.followSurface, properties);
        }
    }

    function processLineStringSegment(that, lineStringSegment, polyline, properties, crsProperties) {
        var coordString = lineStringSegment.firstElementChild.textContent;
        var coordinates = processCoordinates(coordString, crsProperties);

        if(polyline.followSurface == false) {
            polyline.coordinates.push(coordinates[0]);
            createPolyline(that, polyline.coordinates, polyline.followSurface, properties);
            polyline.coordinates = [];
            polyline.followSurface = true;
        }
        polyline.coordinates = polyline.coordinates.concat(coordinates);
        return polyline;
    }

    function processArc(that, arc, polyline, properties, crsProperties) {
        var coordString = arc.firstElementChild.textContent;
        var coordinates = processCoordinates(coordString, crsProperties);

        if(polyline.followSurface == true) {
            if(polyline.coordinates.length > 0) {
                polyline.coordinates.push(coordinates[0]);
                createPolyline(that, polyline.coordinates, polyline.followSurface, properties);
                polyline.coordinates = [];
            }
            polyline.followSurface = false;
        }
        polyline.coordinates = polyline.coordinates.concat(coordinates);
        return polyline;
    }

    function processCircleByCenterPoint(that, circleByCenterPoint, polyline, properties, crsProperties) {
        var elements = circleByCenterPoint;
        var center = processCoordinates((elements.getElementsByTagNameNS(gmlns, "pos"))[0].textContent, crsProperties);
        var radius = parseFloat((elements.getElementsByTagNameNS(gmlns, "radius"))[0].textContent);
        createCircle(that, center, radius, properties);

        if(polyline.followSurface == false) {
            polyline.coordinates.push(center);
            createPolyline(that, polyline.coordinates, polyline.followSurface, properties);
            polyline.coordinates = [];
            polyline.followSurface = true;
        }
        polyline.coordinates.push(center);
        return polyline;
    }

    //Incomplete. In this case, 3 points on the circumference of the circle will be given and
    //center and radius needs to be calculated.
    function processCircle(that, circle, polyline, properties, crsProperties) {
        //Raise error for now.
        if(polyline.followSurface == false) {
            polyline.coordinates.push(center);
            createPolyline(that, polyline.coordinates, polyline.followSurface, properties);
            polyline.coordinates = [];
            polyline.followSurface = true;
        }
        polyline.coordinates.push(center);
        return polyline;
    }

    function createPolyline(that, coordinates, followSurface, properties) {
        var polyline = new PolylineGraphics();
        polyline.material = defaultStrokeMaterialProperty;
        polyline.width = defaultStrokeWidthProperty;
        polyline.positions = new ConstantProperty(coordinates);
        polyline.followSurface = followSurface;

        var entity = createObject(that._entityCollection, properties);
        entity.polyline = polyline;
    }

    function createCircle(that, center, radius, properties) {
        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = radius;
        ellipse.semiMinorAxis = radius;
        ellipse.fill = false;
        ellipse.outline = true;
        var entity = createObject(that._entityCollection, properties);
        entity.ellipse = ellipse;
        entity.position = center;
    }

    function processPolygon(that, polygon, properties, crsProperties) {
        crsProperties = getCrsProperties(polygon, crsProperties);
        var exterior = polygon.getElementsByTagNameNS(gmlns, "exterior");
        var interior = polygon.getElementsByTagNameNS(gmlns, "interior");

        var surfaceBoundary;
        if(exterior.length == 0 && interior.length == 0) {
            surfaceBoundary = polygon.firstElementChild;
            surfaceBoundaryHandler = surfaceBoundaryTypes[surfaceBoundary.localName];
        }

        var holes = [], surfaceBoundaryHandler, surfaceBoundary, coordinates;
        for(var i = 0; i < interior.length; i++) {
        	surfaceBoundary = interior[i].firstElementChild;
            surfaceBoundaryHandler = surfaceBoundaryTypes[surfaceBoundary.localName];
            holes.push(surfaceBoundaryHandler(surfaceBoundary, [], crsProperties));
        }

        if(exterior.length == 1) {
            exterior = exterior[0];
        }
        var surfaceBoundary = exterior.firstElementChild;
        surfaceBoundaryHandler = surfaceBoundaryTypes[surfaceBoundary.localName];
        var hierarchy = surfaceBoundaryHandler(surfaceBoundary, holes, crsProperties);
        createPolygon(that, hierarchy, properties);
    }

    function processMultiPolygon(that, multiPolygon, properties, crsProperties) {
        crsProperties = getCrsProperties(multiPolygon, crsProperties);
        var polygonMembers = multiPolygon.getElementsByTagNameNS(gmlns, "polygonMember");
        if(lineStringMembers.length == 0) {
            polygonMembers = multiPolygon.getElementsByTagNameNS(gmlns, "polygonMembers");
        }
        for(var i = 0; i < polygonMembers.length; i++) {
            var polygons = polygonMembers[i].children;
            for(var j = 0; j < polygons.length; j++) {
                processPolygon(that, polygons[j], properties, crsProperties);
            }
        }
    }

    function processSurface(that, surface, properties, crsProperties) {
    	crsProperties = getCrsProperties(surface, crsProperties);
        var patches = surface.firstElementChild.children;
    	for(i = 0; i < patches.length; i++) {
    		processPolygon(that, patches[i], properties, crsProperties);
    	}
    }

    function processMultiSurface(that, multiSurface, properties, crsProperties) {
    	crsProperties = getCrsProperties(multiSurface, crsProperties);
        var surfaceMembers = multiSurface.getElementsByTagNameNS(gmlns, "surfaceMember");
    	if(surfaceMembers.length == 0) {
    		surfaceMembers = multiSurface.getElementsByTagNameNS(gmlns, "surfaceMembers");
    	}

    	for(var i = 0; i < surfaceMembers.length; i++) {
    		var surfaces = surfaceMembers[i].children;
    		for(var j = 0; j < surfaces.length; j++) {
    			var surfaceGeometryHandler = surfacePropertyTypes[surfaces[j].localName];
    			surfaceGeometryHandler(that, surfaces[j], properties, crsProperties);
    		}
    	}
    }

    function processLinearRing(linearRing, holes, crsProperties) {
        var coordString = linearRing.firstElementChild.textContent;
        var coordinates = processCoordinates(coordString, crsProperties);
        var hierarchy = new PolygonHierarchy(coordinates, holes);
        return hierarchy;
    }

    //processRing works with only LineStringSegment. Does not work with Arc,
    //CircleByCenterPoint and Circle. However, its very rare to find Arc,
    //CircleByCenterPoint and Circle as part of a polygon boundary.
    function processRing(ring, holes, crsProperties) {
    	var curveMember = ring.firstElementChild.firstElementChild;
    	var segments = curveMember.firstElementChild.children;
        var coordinates = [];
        for(i = 0; i < segments.length; i++) {
            if(segmengts[i].localName === "LineStringSegment") {
                var coordString = segments[i].firstElementChild;
                coordinates.concat(processCoordinates(coordString, crsProperties));
            } else {
                //Raise error.
            }
        }
        var hierarchy = new PolygonHierarchy(coordinates, holes);
        return hierarchy;
    }

    function createPolygon(that, hierarchy, properties) {
        var polygon = new PolygonGraphics();
        polygon.outline = new ConstantProperty(true);
        polygon.hierarchy = new ConstantProperty(hierarchy);
        var entity = createObject(that._entityCollection, properties);
        entity.polygon = polygon;
    }

    function processGeometry(that, geometry, properties, crsProperties) {
        crsProperties = getCrsProperties(geometry, crsProperties);
        var geometryMember = geometry.firstElementChild;
        var geometryHandler = geometryPropertyTypes[geometryMember.localName];
        geometryHandler(that, geometryMember, properties, crsProperties);
    }

    function processMultiGeometry(that, multiGeometry, properties, crsProperties) {
        crsProperties = getCrsProperties(multiGeometry, crsProperties);
        var geometryMembers = multiGeometry.getElementsByTagNameNS(gmlns, "geometryMember");
        if(geometryMembers.length == 0) {
            geometryMembers = multiGeometry.getElementsByTagNameNS(gmlns, "geometryMembers");
        }

        for(var i = 0; i < geometryMembers.length; i++) {
            var geometryElements = geometryMembers[i].children;
            for(var j = 0; j < geometryElements.length; j++) {
                var geometryHandler = geometryPropertyTypes[geometryElements[j].localName];
                geometryHandler(that, geometryElements[j], properties, crsProperties);
            }
        }
    }

    var geometryPropertyTypes = {
    	Point : processPoint,
    	MultiPoint : processMultiPoint,
    	LineString : processLineString,
    	MultiLineString : processMultiLineString,
    	Curve : processCurve,
    	MultiCurve : processMultiCurve,
    	Polygon : processPolygon,
    	MultiPolygon : processMultiPolygon,
    	Surface : processSurface,
    	MultiSurface : processMultiSurface,
        Geometry : processGeometry,
        MultiGeometry : processMultiGeometry
    };

    var curvePropertyTypes = {
    	Curve : processCurve,
    	LineString : processLineString
    };

    var curveSegmentTypes = {
    	Arc : processArc,
    	Circle : processCircle,
    	CircleByCenterPoint : processCircleByCenterPoint,
        LineStringSegment : processLineStringSegment
    };

    var surfacePropertyTypes = {
    	Polygon : processPolygon,
    	Surface : processSurface
    };

    var surfaceBoundaryTypes = {
        LinearRing : processLinearRing,
        Ring : processRing
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

    defineProperties(GmlDataSource, {
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

   	    options = defaultValue(options, defaultValue.EMPTY_OBJECT);
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
