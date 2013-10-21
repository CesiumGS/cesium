/*global define*/
define(['../Core/createGuid',
        '../Core/defined',
        '../Core/Cartographic',
        '../Core/Cartesian2',
        '../Core/Color',
        '../Core/ClockRange',
        '../Core/ClockStep',
        '../Core/DeveloperError',
        '../Core/RuntimeError',
        '../Core/Ellipsoid',
        '../Core/Event',
        '../Core/getFilenameFromUri',
        '../Core/Iso8601',
        '../Core/JulianDate',
        '../Core/NearFarScalar',
        '../Core/TimeInterval',
        '../Core/PolygonPipeline',
        '../Core/loadBlob',
        '../Core/loadXML',
        './ConstantProperty',
        './ConstantPositionProperty',
        './ColorMaterialProperty',
        './SampledPositionProperty',
        './TimeIntervalCollectionProperty',
        '../Scene/LabelStyle',
        '../Scene/VerticalOrigin',
        './DynamicClock',
        './DynamicObject',
        './DynamicObjectCollection',
        './DynamicPath',
        './DynamicPolyline',
        './DynamicPolygon',
        './DynamicLabel',
        './DynamicBillboard',
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        '../ThirdParty/zip'
    ], function(
        createGuid,
        defined,
        Cartographic,
        Cartesian2,
        Color,
        ClockRange,
        ClockStep,
        DeveloperError,
        RuntimeError,
        Ellipsoid,
        Event,
        getFilenameFromUri,
        Iso8601,
        JulianDate,
        NearFarScalar,
        TimeInterval,
        PolygonPipeline,
        loadBlob,
        loadXML,
        ConstantProperty,
        ConstantPositionProperty,
        ColorMaterialProperty,
        SampledPositionProperty,
        TimeIntervalCollectionProperty,
        LabelStyle,
        VerticalOrigin,
        DynamicClock,
        DynamicObject,
        DynamicObjectCollection,
        DynamicPath,
        DynamicPolyline,
        DynamicPolygon,
        DynamicLabel,
        DynamicBillboard,
        Uri,
        when,
        zip) {
    "use strict";

    var scratch = new Cartographic();

    function createId(node) {
        return defined(node.id) && node.id.length !== 0 ? node.id : createGuid();
    }

    //Helper functions
    function readCoordinate(element) {
        var digits = element.textContent.trim().split(/[\s,\n]+/g);
        scratch = Cartographic.fromDegrees(digits[0], digits[1], defined(digits[2]) ? parseFloat(digits[2]) : 0, scratch);
        return Ellipsoid.WGS84.cartographicToCartesian(scratch);
    }

    function readCoordinates(element) {
        var tuples = element.textContent.trim().split(/[\s\n]+/g);
        var numberOfCoordinates = tuples.length;
        var result = new Array(numberOfCoordinates);
        var resultIndex = 0;

        for (var i = 0; i < tuples.length; i++) {
            var coordinates = tuples[i].split(/[\s,\n]+/g);
            scratch = Cartographic.fromDegrees(parseFloat(coordinates[0]), parseFloat(coordinates[1]), defined(coordinates[2]) ? parseFloat(coordinates[2]) : 0, scratch);
            result[resultIndex++] = Ellipsoid.WGS84.cartographicToCartesian(scratch);
        }
        return result;
    }

    function equalCoordinateTuples(tuple1, tuple2) {
        return tuple1[0] === tuple2[0] && tuple1[1] === tuple2[1] && tuple1[2] === tuple2[2];
    }

    function getNumericValue(node, tagName) {
        var element = node.getElementsByTagName(tagName)[0];
        return defined(element) ? parseFloat(element.textContent) : undefined;
    }

    function getStringValue(node, tagName) {
        var element = node.getElementsByTagName(tagName)[0];
        var value = defined(element) ? element.textContent : undefined;
        return value;
    }

    function getColorValue(node, tagName) {
        var red, green, blue, alpha;
        var element = node.getElementsByTagName(tagName)[0];
        var colorModeNode = node.getElementsByTagName('colorMode')[0];
        var value = defined(element) ? element.textContent : undefined;
        if (!defined(value)) {
            return undefined;
        }
        var colorMode = defined(colorModeNode) ? colorModeNode.textContent : undefined;
        if (colorMode === 'random') {
            var options = {};
            alpha = parseInt(value.substring(0, 2), 16) / 255.0;
            blue = parseInt(value.substring(2, 4), 16) / 255.0;
            green = parseInt(value.substring(4, 6), 16) / 255.0;
            red = parseInt(value.substring(6, 8), 16) / 255.0;
            if (red > 0) {
                options.maximumRed = red;
            } else {
                options.red = 0;
            }
            if (green > 0) {
                options.maximumGreen = green;
            } else {
                options.green = 0;
            }
            if (blue > 0) {
                options.maximumBlue = blue;
            } else {
                options.blue = 0;
            }
            options.alpha = alpha;
            return Color.fromRandom(options);
        }
        //normal mode as default
        alpha = parseInt(value.substring(0, 2), 16) / 255.0;
        blue = parseInt(value.substring(2, 4), 16) / 255.0;
        green = parseInt(value.substring(4, 6), 16) / 255.0;
        red = parseInt(value.substring(6, 8), 16) / 255.0;
        return new Color(red, green, blue, alpha);
    }

    // KML processing functions
    function processPlacemark(dataSource, parent, placemark, dynamicObjectCollection, styleCollection, sourceUri, uriResolver) {
        var id = createId(placemark.id);
        var dynamicObject = dynamicObjectCollection.getOrCreateObject(id);

        if (defined(parent)) {
            dynamicObject.parent = parent;
        }

        var styleObject = processInlineStyles(placemark, styleCollection, sourceUri, uriResolver);

        var name = getStringValue(placemark, 'name');
        if (defined(name)) {
            if (!defined(dynamicObject.label)) {
                dynamicObject.label = new DynamicLabel();
                dynamicObject.label.font = new ConstantProperty('16pt Arial');
                dynamicObject.label.style = new ConstantProperty(LabelStyle.FILL_AND_OUTLINE);
                dynamicObject.label.pixelOffset = new ConstantProperty(new Cartesian2(0, 16));
                dynamicObject.label.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);
                dynamicObject.label.translucencyByDistance = new ConstantProperty(new NearFarScalar(1500000, 1.0, 3400000, 0.0));
            }
            dynamicObject.label.text = new ConstantProperty(name);
            dynamicObject.name = name;
        }

        var foundGeometry = false;
        var nodes = placemark.childNodes;
        for (var i = 0, len = nodes.length; i < len; i++) {
            var node = nodes.item(i);
            var nodeName = node.nodeName;
            if (nodeName === 'TimeSpan') {
                dynamicObject.availability = processTimeSpan(node);
            } else if (nodeName === 'description') {
                dynamicObject.balloon = new ConstantProperty(node.textContent);
            } else if (featureTypes.hasOwnProperty(nodeName)) {
                foundGeometry = true;
                mergeStyles(nodeName, styleObject, dynamicObject);
                featureTypes[nodeName](dataSource, dynamicObject, placemark, node, dynamicObjectCollection);
            }
        }
        if (!foundGeometry) {
            mergeStyles(undefined, styleObject, dynamicObject);
        }

        var billboard = dynamicObject.billboard;
        if (defined(billboard)) {
            if (!defined(billboard.image)) {
                billboard.image = new ConstantProperty('http://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png');
            }
        }
    }

    function processPoint(dataSource, dynamicObject, kml, node) {
        //TODO extrude, altitudeMode, gx:altitudeMode
        var el = node.getElementsByTagName('coordinates');

        var cartesian3 = readCoordinate(el[0]);
        dynamicObject.position = new ConstantPositionProperty(cartesian3);

        //Anything with a position gets a billboard
        if (!defined(dynamicObject.billboard)) {
            dynamicObject.billboard = createDefaultBillboard();
        }
    }

    function processLineString(dataSource, dynamicObject, kml, node) {
        //TODO gx:altitudeOffset, extrude, tessellate, altitudeMode, gx:altitudeMode, gx:drawOrder
        var el = node.getElementsByTagName('coordinates');
        var coordinates = readCoordinates(el[0]);

        dynamicObject.vertexPositions = new ConstantProperty(coordinates);
    }

    function processLinearRing(dataSource, dynamicObject, kml, node) {
        //TODO gx:altitudeOffset, extrude, tessellate, altitudeMode, altitudeModeEnum
        var el = node.getElementsByTagName('coordinates');
        var coordinates = readCoordinates(el[0]);

        if (!equalCoordinateTuples(coordinates[0], coordinates[el.length - 1])) {
            throw new RuntimeError('The first and last coordinate tuples must be the same.');
        }
        //TODO Should we be doing this here?
        coordinates = PolygonPipeline.removeDuplicates(coordinates);
        if (coordinates.length > 3) {
            dynamicObject.vertexPositions = new ConstantProperty(coordinates);
        }
    }

    function processPolygon(dataSource, dynamicObject, kml, node) {
        //TODO innerBoundaryIS, tessellate, altitudeMode
        var el = node.getElementsByTagName('outerBoundaryIs');
        for (var j = 0; j < el.length; j++) {
            processLinearRing(dataSource, dynamicObject, kml, el[j]);
        }

        if (defined(dynamicObject.vertexPositions)) {
            //TODO KML polygons can take into account altitude for each point, we currently can't.
            var extrude = getNumericValue(node, 'extrude');
            if (extrude === 1) {
                var tmp = dynamicObject.vertexPositions.getValue()[0];
                if (!defined(dynamicObject.polygon)) {
                    dynamicObject.polygon = new DynamicPolygon();
                }
                dynamicObject.polygon.height = new ConstantProperty(0);
                dynamicObject.polygon.extrudedHeight = new ConstantProperty(Ellipsoid.WGS84.cartesianToCartographic(tmp).height);
            }
        }
    }

    function processGxTrack(dataSource, dynamicObject, kml, node) {
        //TODO altitudeMode, gx:angles
        var coordsEl = node.getElementsByTagName('coord');
        var coordinates = new Array(coordsEl.length);
        var timesEl = node.getElementsByTagName('when');
        var times = new Array(timesEl.length);
        for (var i = 0; i < times.length; i++) {
            coordinates[i] = readCoordinate(coordsEl[i]);
            times[i] = JulianDate.fromIso8601(timesEl[i].textContent);
        }
        var property = new SampledPositionProperty();
        property.addSamples(times, coordinates);
        dynamicObject.position = property;
    }

    function processGxMultiTrack(dataSource, dynamicObject, kml, node, dynamicObjectCollection) {
        //TODO gx:interpolate, altitudeMode

        var childNodes = node.childNodes;
        for (var i = 0, len = childNodes.length; i < len; i++) {
            var childNode = childNodes.item(i);
            var childNodeName = childNode.nodeName;

            if (featureTypes.hasOwnProperty(childNodeName)) {
                var childNodeId = createId(childNode);
                var childObject = dynamicObjectCollection.getOrCreateObject(childNodeId);
                childObject.parent = dynamicObject;

                mergeStyles(childNodeName, dynamicObject, childObject);

                var geometryHandler = featureTypes[childNodeName];
                geometryHandler(dataSource, childObject, kml, childNode, dynamicObjectCollection);
            }
        }
    }

    function processMultiGeometry(dataSource, dynamicObject, kml, node, dynamicObjectCollection) {
        var childNodes = node.childNodes;
        for (var i = 0, len = childNodes.length; i < len; i++) {
            var childNode = childNodes.item(i);
            var childNodeName = childNode.nodeName;

            if (featureTypes.hasOwnProperty(childNodeName)) {
                var childNodeId = createId(childNode);
                var childObject = dynamicObjectCollection.getOrCreateObject(childNodeId);
                childObject.parent = dynamicObject;

                mergeStyles(childNodeName, dynamicObject, childObject);

                var geometryHandler = featureTypes[childNodeName];
                geometryHandler(dataSource, childObject, kml, childNode, dynamicObjectCollection);
            }
        }
    }

    function processTimeSpan(node) {
        var beginNode = node.getElementsByTagName('begin')[0];
        var beginDate = defined(beginNode) ? JulianDate.fromIso8601(beginNode.textContent) : undefined;

        var endNode = node.getElementsByTagName('end')[0];
        var endDate = defined(endNode) ? JulianDate.fromIso8601(endNode.textContent) : undefined;

        if (defined(beginDate) && defined(endDate)) {
            return new TimeInterval(beginDate, endDate, true, true, true);
        }

        if (defined(beginDate)) {
            return new TimeInterval(beginDate, Iso8601.MAXIMUM_VALUE, true, false, true);
        }

        if (defined(endDate)) {
            return new TimeInterval(Iso8601.MINIMUM_VALUE, endDate, false, true, true);
        }

        return undefined;
    }

    //Object that holds all supported Geometry
    var featureTypes = {
        Point : processPoint,
        LineString : processLineString,
        LinearRing : processLinearRing,
        Polygon : processPolygon,
        'gx:Track' : processGxTrack,
        'gx:MultiTrack' : processGxMultiTrack,
        MultiGeometry : processMultiGeometry
    };

    function createDefaultBillboard() {
        var billboard = new DynamicBillboard();
        billboard.width = new ConstantProperty(32);
        billboard.height = new ConstantProperty(32);
        billboard.scaleByDistance = new ConstantProperty(new NearFarScalar(2414016, 1.0, 1.6093e+7, 0.1));
        return billboard;
    }

    function processStyle(styleNode, dynamicObject, sourceUri, uriResolver) {
        for (var i = 0, len = styleNode.childNodes.length; i < len; i++) {
            var node = styleNode.childNodes.item(i);

            if (node.nodeName === 'IconStyle') {
                //Map style to billboard properties
                //TODO heading, hotSpot
                var scale = getNumericValue(node, 'scale');
                var color = getColorValue(node, 'color');
                var icon = getStringValue(node, 'href');
                var iconResolved = false;
                if (defined(uriResolver)) {
                    var blob = uriResolver[icon];
                    if (defined(blob)) {
                        iconResolved = true;
                        icon = blob;
                    }
                }
                if (!iconResolved && defined(sourceUri)) {
                    var baseUri = new Uri(document.location.href);
                    sourceUri = new Uri(sourceUri);
                    icon = new Uri(icon).resolve(sourceUri.resolve(baseUri)).toString();
                }

                var billboard = dynamicObject.billboard;
                if (!defined(billboard)) {
                    billboard = createDefaultBillboard();
                    dynamicObject.billboard = billboard;
                }
                if (defined(icon)) {
                    billboard.image = new ConstantProperty(icon);
                }
                if (defined(scale)) {
                    billboard.scale = new ConstantProperty(scale);
                }
                if (defined(color)) {
                    billboard.color = new ConstantProperty(color);
                }
            } else if (node.nodeName === 'LabelStyle') {
                //Map style to label properties
                var label = defined(dynamicObject.label) ? dynamicObject.label : new DynamicLabel();
                var labelScale = getNumericValue(node, 'scale');
                var labelColor = getColorValue(node, 'color');

                label.translucencyByDistance = new ConstantProperty(new NearFarScalar(1500000, 1.0, 3400000, 0.0));
                label.scale = defined(labelScale) ? new ConstantProperty(labelScale) : new ConstantProperty(1.0);
                label.fillColor = defined(labelColor) ? new ConstantProperty(labelColor) : new ConstantProperty(new Color(1, 1, 1, 1));
                label.text = defined(dynamicObject.name) ? new ConstantProperty(dynamicObject.name) : undefined;
                label.pixelOffset = new ConstantProperty(new Cartesian2(0, 16));
                label.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);
                label.font = new ConstantProperty('16pt Arial');
                label.style = new ConstantProperty(LabelStyle.FILL_AND_OUTLINE);
                dynamicObject.label = label;
            } else if (node.nodeName === 'LineStyle') {
                //Map style to line properties
                //TODO PhysicalWidth, labelVisibility
                var polyline = defined(dynamicObject.polyline) ? dynamicObject.polyline : new DynamicPolyline();
                var lineColor = getColorValue(node, 'color');
                var lineWidth = getNumericValue(node, 'width');
                var lineOuterColor = getColorValue(node, 'outerColor');
                var lineOuterWidth = getNumericValue(node, 'outerWidth');
                if (defined(lineOuterWidth) && (lineOuterWidth < 0 || lineOuterWidth > 1.0)) {
                    throw new RuntimeError('gx:outerWidth must be a value between 0 and 1.0');
                }

                polyline.color = defined(lineColor) ? new ConstantProperty(lineColor) : new ConstantProperty(new Color(1, 1, 1, 1));
                polyline.width = defined(lineWidth) ? new ConstantProperty(lineWidth) : new ConstantProperty(1.0);
                polyline.outlineColor = defined(lineOuterColor) ? new ConstantProperty(lineOuterColor) : undefined;
                polyline.outlineWidth = defined(lineOuterWidth) ? new ConstantProperty(lineOuterWidth) : undefined;
                dynamicObject.polyline = polyline;
            } else if (node.nodeName === 'PolyStyle') {
                //Map style to polygon properties
                //TODO Fill, Outline
                dynamicObject.polygon = defined(dynamicObject.polygon) ? dynamicObject.polygon : new DynamicPolygon();
                var polygonColor = getColorValue(node, 'color');
                polygonColor = defined(polygonColor) ? polygonColor : new Color(1, 1, 1, 1);
                var material = new ColorMaterialProperty();
                material.color = new ConstantProperty(polygonColor);
                dynamicObject.polygon.material = material;
            }
        }
    }

    function mergeStyles(geometryType, styleObject, targetObject) {
        targetObject.merge(styleObject);

        //If a shared style has multiple styles, for example PolyStyle and
        //and LineStyle, an object can end up with styles it shouldn't have.
        //After we merge, remove any such styles.
        switch (geometryType) {
        case 'Point':
            targetObject.path = undefined;
            targetObject.polygon = undefined;
            targetObject.polyline = undefined;
            break;
        case 'LineString':
        case 'LinearRing':
            targetObject.billboard = undefined;
            targetObject.label = undefined;
            targetObject.path = undefined;
            targetObject.point = undefined;
            targetObject.polygon = undefined;
            break;
        case 'Polygon':
            targetObject.billboard = undefined;
            targetObject.label = undefined;
            targetObject.path = undefined;
            targetObject.point = undefined;
            break;
        case 'gx:Track':
            targetObject.polygon = undefined;
            targetObject.polyline = undefined;
            break;
        case 'gx:MultiTrack':
            targetObject.polygon = undefined;
            targetObject.polyline = undefined;
            break;
        case 'MultiGeometry':
            break;
        default:
            break;
        }
    }

    //Processes and merges any inline styles for the provided node into the provided dynamic object.
    function processInlineStyles(placeMark, styleCollection, sourceUri, uriResolver) {
        var result = new DynamicObject();

        //KML_TODO Validate the behavior for multiple/conflicting styles.
        var inlineStyles = placeMark.getElementsByTagName('Style');
        var inlineStylesLength = inlineStyles.length;
        if (inlineStylesLength > 0) {
            //Google earth seems to always use the last inline style only.
            processStyle(inlineStyles.item(inlineStylesLength - 1), result, sourceUri, uriResolver);
        }

        var externalStyles = placeMark.getElementsByTagName('styleUrl');
        if (externalStyles.length > 0) {
            //Google earth seems to always use the first external style only.
            var styleObject = styleCollection.getById(externalStyles.item(0).textContent);
            if (typeof styleObject !== 'undefined') {
                result.merge(styleObject);
            }
        }
        return result;
    }

    //Asynchronously processes an external style file.
    function processExternalStyles(uri, styleCollection) {
        return when(loadXML(uri), function(styleKml) {
            return processStyles(styleKml, styleCollection, uri, true);
        });
    }

    //Processes all shared and external styles and stores
    //their id into the rovided styleCollection.
    //Returns an array of promises that will resolve when
    //each style is loaded.
    function processStyles(kml, styleCollection, sourceUri, isExternal, uriResolver) {
        var i;
        var id;
        var styleObject;

        var styleNodes = kml.getElementsByTagName('Style');
        var styleNodesLength = styleNodes.length;
        for (i = styleNodesLength - 1; i >= 0; i--) {
            var node = styleNodes.item(i);
            var attributes = node.attributes;
            id = defined(attributes.id) ? attributes.id.textContent : undefined;
            if (defined(id)) {
                id = '#' + id;
                if (isExternal && defined(sourceUri)) {
                    id = sourceUri + id;
                }
                if (!defined(styleCollection.getById(id))) {
                    styleObject = styleCollection.getOrCreateObject(id);
                    processStyle(node, styleObject, sourceUri, uriResolver);
                }
            }
        }

        var styleMaps = kml.getElementsByTagName('StyleMap');
        var styleMapsLength = styleMaps.length;
        for (i = 0; i < styleMapsLength; i++) {
            var styleMap = styleMaps.item(i);
            id = defined(styleMap.attributes.id) ? styleMap.attributes.id.textContent : undefined;
            if (defined(id)) {
                var pairs = styleMap.childNodes;
                for (var p = 0; p < pairs.length; p++) {
                    var pair = pairs[p];
                    if (pair.nodeName !== 'Pair') {
                        continue;
                    }
                    var key = pair.getElementsByTagName('key')[0];
                    if (defined(key) && key.textContent === 'normal') {
                        var styleUrl = pair.getElementsByTagName('styleUrl')[0];
                        id = '#' + id;
                        if (isExternal && defined(sourceUri)) {
                            id = sourceUri + id;
                        }
                        if (!defined(styleCollection.getById(id))) {
                            styleObject = styleCollection.getOrCreateObject(id);
                            var base = styleCollection.getOrCreateObject(styleUrl.textContent);
                            if (defined(base)) {
                                styleObject.merge(base);
                            }
                        }
                        break;
                    }
                }
            }
        }

        var externalStyleHash = {};
        var promises = [];
        var styleUrlNodes = kml.getElementsByTagName('styleUrl');
        var styleUrlNodesLength = styleUrlNodes.length;
        for (i = 0; i < styleUrlNodesLength; i++) {
            var styleReference = styleUrlNodes[i].textContent;
            if (styleReference[0] !== '#') {
                var tokens = styleReference.split('#');
                if (tokens.length !== 2) {
                    throw new RuntimeError('Unable to parse style: ' + styleReference);
                }
                var uri = tokens[0];
                if (!defined(externalStyleHash[uri])) {
                    if (defined(sourceUri)) {
                        var baseUri = new Uri(document.location.href);
                        sourceUri = new Uri(sourceUri);
                        uri = new Uri(uri).resolve(sourceUri.resolve(baseUri)).toString();
                    }
                    promises.push(processExternalStyles(uri, styleCollection, sourceUri));
                }
            }
        }

        return promises;
    }

    function iterateNodes(dataSource, node, parent, dynamicObjectCollection, styleCollection, sourceUri, uriResolver) {
        var nodeName = node.nodeName;
        if (nodeName === 'Placemark') {
            processPlacemark(dataSource, parent, node, dynamicObjectCollection, styleCollection, sourceUri, uriResolver);
        } else if (nodeName === 'Folder') {
            parent = new DynamicObject(createId(node));
            parent.name = getStringValue(node, 'name');
            dynamicObjectCollection.add(parent);
        }

        var childNodes = node.childNodes;
        var length = childNodes.length;
        for (var i = 0; i < length; i++) {
            iterateNodes(dataSource, childNodes[i], parent, dynamicObjectCollection, styleCollection, sourceUri, uriResolver);
        }
    }

    function loadKml(dataSource, kml, sourceUri, uriResolver) {
        dataSource._isLoading = true;
        dataSource._isLoadingEvent.raiseEvent(dataSource, true);
        var name;
        var document = kml.getElementsByTagName('Document');
        if (document.length > 0) {
            var childNodes = document[0].childNodes;
            var length = childNodes.length;
            for (var i = 0; i < length; i++) {
                var node = childNodes[i];
                if (node.nodeName === 'name') {
                    name = node.textContent;
                    break;
                }
            }
        }
        if (!defined(name) && defined(sourceUri)) {
            name = getFilenameFromUri(sourceUri);
        }
        dataSource._name = name;

        var dynamicObjectCollection = dataSource._dynamicObjectCollection;
        var styleCollection = new DynamicObjectCollection();

        //Since KML external styles can be asynchonous, we start off
        //my loading all styles first, before doing anything else.
        return when.all(processStyles(kml, styleCollection, sourceUri, false, uriResolver), function() {
            iterateNodes(dataSource, kml, undefined, dynamicObjectCollection, styleCollection, sourceUri, uriResolver);
            dataSource._isLoading = false;
            dataSource._isLoadingEvent.raiseEvent(dataSource, false);
            dataSource._changed.raiseEvent(this);
        });
    }

    function loadXmlFromZip(reader, entry, uriResolver, deferred) {
        entry.getData(new zip.TextWriter(), function(xmlString) {
            var parser = new DOMParser();
            uriResolver.kml = parser.parseFromString(xmlString, 'text/xml');
            deferred.resolve();
        }, function(current, total) {
            // onprogress callback
        });
    }

    function loadDataUriFromZip(reader, entry, uriResolver, deferred) {
        entry.getData(new zip.Data64URIWriter(), function(dataUri) {
            uriResolver[entry.filename] = dataUri;
            deferred.resolve();
        }, function(current, total) {
            // onprogress callback
        });
    }

    function loadKmz(dataSource, blob, sourceUri, deferred) {
        var uriResolver = {};
        zip.createReader(new zip.BlobReader(blob), function(reader) {
            reader.getEntries(function(entries) {
                var promises = [];
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    if (!entry.directory) {
                        var innerDefer = when.defer();
                        promises.push(innerDefer.promise);
                        var filename = entry.filename.toUpperCase();
                        if (filename === 'DOC.KML') {
                            loadXmlFromZip(reader, entry, uriResolver, innerDefer);
                        } else {
                            loadDataUriFromZip(reader, entry, uriResolver, innerDefer);
                        }
                    }
                }

                when.all(promises, function() {
                    loadKml(dataSource, uriResolver.kml, sourceUri, uriResolver);
                    // close the zip reader
                    reader.close(function() {
                        // onclose callback
                    });
                    deferred.resolve(dataSource);
                });
            });
        }, function(error) {
            deferred.reject(error);
        });
    }

    /**
     * A {@link DataSource} which processes KML.
     * @alias KmlDataSource
     * @constructor
     */
    var KmlDataSource = function() {
        this._changed = new Event();
        this._error = new Event();
        this._isLoadingEvent = new Event();
        this._clock = undefined;
        this._dynamicObjectCollection = new DynamicObjectCollection();
        this._timeVarying = true;
        this._name = undefined;
        this._isLoading = false;
    };

    /**
     * Gets an event that will be raised when non-time-varying data changes
     * or if the return value of getIsTimeVarying changes.
     * @memberof DataSource
     *
     * @returns {Event} The event.
     */
    KmlDataSource.prototype.getChangedEvent = function() {
        return this._changed;
    };

    /**
     * Gets an event that will be raised if an error is encountered during processing.
     * @memberof KmlDataSource
     *
     * @returns {Event} The event.
     */
    KmlDataSource.prototype.getErrorEvent = function() {
        return this._error;
    };

    /**
     * Gets an event that will be raised when the data source either starts or stops loading.
     * @memberof DataSource
     * @function
     *
     * @returns {Event} The event.
     */
    KmlDataSource.prototype.getLoadingEvent = function() {
        return this._isLoadingEvent;
    };
    /**
     * Gets a value indicating if this data source is actively loading data.  If the return value of
     * this function changes, the loading event will be raised.
     * @memberof DataSource
     * @function
     *
     * @returns {Boolean} True if this data source is actively loading data, false otherwise.
     */
    KmlDataSource.prototype.getIsLoading = function() {
        return this._isLoading;
    };

    KmlDataSource.prototype.getName = function() {
        return this._name;
    };

    /**
     * Gets the top level clock defined in KML or the availability of the
     * underlying data if no clock is defined.  If the KML document only contains
     * infinite data, undefined will be returned.
     * @memberof KmlDataSource
     *
     * @returns {DynamicClock} The clock associated with the current KML data, or undefined if none exists.
     */
    KmlDataSource.prototype.getClock = function() {
        var availability = this._dynamicObjectCollection.computeAvailability();
        if (availability.equals(Iso8601.MAXIMUM_INTERVAL)) {
            return undefined;
        }
        var clock = new DynamicClock();
        clock.startTime = availability.start;
        clock.stopTime = availability.stop;
        clock.currentTime = availability.start;
        clock.clockRange = ClockRange.LOOP_STOP;
        clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
        clock.multiplier = Math.min(Math.max(availability.start.getSecondsDifference(availability.stop) / 60, 60), 50000000);
        return clock;
    };

    /**
     * Gets the DynamicObjectCollection generated by this data source.
     * @memberof DataSource
     *
     * @returns {DynamicObjectCollection} The collection of objects generated by this data source.
     */
    KmlDataSource.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    KmlDataSource.prototype.update = function() {
        return true;
    };

    /**
     * Gets a value indicating if the data varies with simulation time.  If the return value of
     * this function changes, the changed event will be raised.
     * @memberof DataSource
     *
     * @returns {Boolean} True if the data is varies with simulation time, false otherwise.
     */
    KmlDataSource.prototype.getIsTimeVarying = function() {
        return true;
    };

    /**
     * Asynchronously loads the provided KML, replacing any existing data.
     *
     * @param {Document} kml The parsed KML document to be processed.
     *
     * @returns {Promise} a promise that will resolve when the KML is processed.
     *
     * @exception {DeveloperError} kml is required.
     */
    KmlDataSource.prototype.load = function(kml, source) {
        if (!defined(kml)) {
            throw new DeveloperError('kml is required.');
        }

        this._dynamicObjectCollection.removeAll();
        return loadKml(this, kml, source);
    };

    /**
     * Asynchronously loads the provided KMZ, replacing any existing data.
     *
     * @param {Blob} kmz The KMZ document to be processed.
     *
     * @returns {Promise} a promise that will resolve when the KMZ is processed.
     *
     * @exception {DeveloperError} kmz is required.
     */
    KmlDataSource.prototype.loadKmz = function(kmz, url) {
        if (!defined(kmz)) {
            throw new DeveloperError('kmz is required.');
        }

        var deferred = when.defer();
        loadKmz(this, kmz, url, deferred);
        return deferred.promise;
    };

    /**
     * Asynchronously loads the KMZ at the provided url, replacing any existing data.
     *
     * @param {Object} url The url to be processed.
     *
     * @returns {Promise} a promise that will resolve when the KMZ is processed.
     *
     * @exception {DeveloperError} url is required.
     */
    KmlDataSource.prototype.loadUrl = function(url) {
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }

        var that = this;
        return when(loadBlob(url), function(blob) {
            var deferred = when.defer();

            //Get the blob "magic number" to determine if it's a zip or KML
            var slice = blob.slice(0, 4);
            var reader = new FileReader();
            reader.readAsArrayBuffer(slice);
            reader.onload = function(e) {
                var buffer = reader.result;
                var view = new DataView(buffer);

                //If it's a zip file, treat it as a KMZ
                if (view.getUint32(0, false) === 0x504b0304) {
                    return loadKmz(that, blob, url, deferred);
                }

                //Else, reader it as an XML file.
                reader = new FileReader();
                reader.addEventListener("loadend", function() {
                    var parser = new DOMParser();
                    that.load(parser.parseFromString(reader.result, 'text/xml'), url);
                    deferred.resolve();
                });
                reader.readAsText(blob);
            };
            return deferred;
        }, function(error) {
            that._error.raiseEvent(that, error);
            return when.reject(error);
        });
    };

    return KmlDataSource;
});
