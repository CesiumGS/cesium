/*global define*/
define(['../Core/createGuid',
        '../Core/defined',
        '../Core/defaultValue',
        '../Core/Cartographic',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/ClockRange',
        '../Core/ClockStep',
        '../Core/DeveloperError',
        '../Core/RuntimeError',
        '../Core/Ellipsoid',
        '../Core/Event',
        '../Core/HermiteSpline',
        '../Core/Iso8601',
        '../Core/JulianDate',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/NearFarScalar',
        '../Core/OrientationInterpolator',
        '../Core/Quaternion',
        '../Core/TimeInterval',
        '../Core/loadBlob',
        '../Core/loadXML',
        './ConstantProperty',
        './ConstantPositionProperty',
        './ColorMaterialProperty',
        './SampledPositionProperty',
        './TimeIntervalCollectionProperty',
        '../Scene/LabelStyle',
        '../Scene/sampleTerrain',
        '../Scene/VerticalOrigin',
        './DynamicClock',
        './DynamicObject',
        './DynamicObjectCollection',
        './DynamicPath',
        './DynamicPolyline',
        './DynamicPolygon',
        './DynamicLabel',
        './DynamicBillboard',
        './processGxTour',
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        '../ThirdParty/zip/zip'
    ], function(
        createGuid,
        defined,
        defaultValue,
        Cartographic,
        Cartesian2,
        Cartesian3,
        Color,
        ClockRange,
        ClockStep,
        DeveloperError,
        RuntimeError,
        Ellipsoid,
        Event,
        HermiteSpline,
        Iso8601,
        JulianDate,
        CesiumMath,
        Matrix3,
        NearFarScalar,
        OrientationInterpolator,
        Quaternion,
        TimeInterval,
        loadBlob,
        loadXML,
        ConstantProperty,
        ConstantPositionProperty,
        ColorMaterialProperty,
        SampledPositionProperty,
        TimeIntervalCollectionProperty,
        LabelStyle,
        sampleTerrain,
        VerticalOrigin,
        DynamicClock,
        DynamicObject,
        DynamicObjectCollection,
        DynamicPath,
        DynamicPolyline,
        DynamicPolygon,
        DynamicLabel,
        DynamicBillboard,
        GxTourProcessor,
        Uri,
        when,
        zip) {
    "use strict";

    var scratch = new Cartographic();

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

        for ( var i = 0; i < tuples.length; i++) {
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
    function processPlacemark(dataSource, placemark, dynamicObjectCollection, styleCollection, sourceUri, uriResolver) {
        var id = defined(placemark.id) ? placemark.id : createGuid();
        var dynamicObject = dynamicObjectCollection.getOrCreateObject(id);

        var styleObject = processInlineStyles(placemark, styleCollection, sourceUri, uriResolver);

        var name = getStringValue(placemark, 'name');
        if (defined(name)) {
            if (!defined(dynamicObject.label)) {
                dynamicObject.label = new DynamicLabel();
                dynamicObject.label.font = new ConstantProperty('16pt Arial');
                dynamicObject.label.style = new ConstantProperty(LabelStyle.FILL_AND_OUTLINE);
                dynamicObject.label.pixelOffset = new ConstantProperty(new Cartesian2(0, -16));
                dynamicObject.label.verticalOrigin = new ConstantProperty(VerticalOrigin.TOP);
            }
            dynamicObject.label.text = new ConstantProperty(name);
        }

        var foundGeometry = false;
        var nodes = placemark.childNodes;
        for ( var i = 0, len = nodes.length; i < len; i++) {
            var node = nodes.item(i);
            var nodeName = node.nodeName;
            if (nodeName === 'TimeSpan') {
                dynamicObject.availability = processTimeSpan(node);
            } else if (featureTypes.hasOwnProperty(nodeName)) {
                foundGeometry = true;
                mergeStyles(nodeName, styleObject, dynamicObject);
                featureTypes[nodeName](dataSource, dynamicObject, placemark, node, dynamicObjectCollection);
            }
        }
        if (!foundGeometry) {
            mergeStyles(undefined, styleObject, dynamicObject);
        }
    }

    function processPoint(dataSource, dynamicObject, kml, node) {
        //TODO extrude, altitudeMode, gx:altitudeMode
        var el = node.getElementsByTagName('coordinates');

        var cartesian3 = readCoordinate(el[0]);
        dynamicObject.position = new ConstantPositionProperty(cartesian3);
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
        dynamicObject.vertexPositions = new ConstantProperty(coordinates);
    }

    function processPolygon(dataSource, dynamicObject, kml, node) {
        //TODO innerBoundaryIS, extrude, tessellate, altitudeMode
        var el = node.getElementsByTagName('outerBoundaryIs');
        for ( var j = 0; j < el.length; j++) {
            processLinearRing(dataSource, dynamicObject, kml, el[j]);
        }
    }

    function processGxTrack(dataSource, dynamicObject, kml, node) {
        //TODO altitudeMode, gx:angles
        var coordsEl = node.getElementsByTagName('coord');
        var coordinates = new Array(coordsEl.length);
        var timesEl = node.getElementsByTagName('when');
        var times = new Array(timesEl.length);
        for ( var i = 0; i < times.length; i++) {
            coordinates[i] = readCoordinate(coordsEl[i]);
            times[i] = JulianDate.fromIso8601(timesEl[i].textContent);
        }
        var property = new SampledPositionProperty();
        property.addSamples(times, coordinates);
        dynamicObject.position = property;
    }

    function processGxMultiTrack(dataSource, dynamicObject, kml, node, dynamicObjectCollection) {
        //TODO gx:interpolate, altitudeMode
        dynamicObjectCollection.remove(dynamicObject);

        var childNodes = node.childNodes;
        for ( var i = 0, len = childNodes.length; i < len; i++) {
            var childNode = childNodes.item(i);
            var childNodeName = childNode.nodeName;

            if (featureTypes.hasOwnProperty(childNodeName)) {
                var childNodeId = defined(childNode.id) ? childNode.id : createGuid();
                var childObject = dynamicObjectCollection.getOrCreateObject(childNodeId);

                mergeStyles(childNodeName, dynamicObject, childObject);

                var geometryHandler = featureTypes[childNodeName];
                geometryHandler(dataSource, childObject, kml, childNode, dynamicObjectCollection);
            }
        }
    }

    function processMultiGeometry(dataSource, dynamicObject, kml, node, dynamicObjectCollection) {
        dynamicObjectCollection.remove(dynamicObject);

        var childNodes = node.childNodes;
        for ( var i = 0, len = childNodes.length; i < len; i++) {
            var childNode = childNodes.item(i);
            var childNodeName = childNode.nodeName;

            if (featureTypes.hasOwnProperty(childNodeName)) {
                var childNodeId = defined(childNode.id) ? childNode.id : createGuid();
                var childObject = dynamicObjectCollection.getOrCreateObject(childNodeId);

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

    function processStyle(styleNode, dynamicObject, sourceUri, uriResolver) {
        for ( var i = 0, len = styleNode.childNodes.length; i < len; i++) {
            var node = styleNode.childNodes.item(i);

            if (node.nodeName === 'IconStyle') {
                //Map style to billboard properties
                //TODO heading, hotSpot
                var billboard = defined(dynamicObject.billboard) ? dynamicObject.billboard : new DynamicBillboard();
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

                billboard.width = new ConstantProperty(32);
                billboard.height = new ConstantProperty(32);
                billboard.image = defined(icon) ? new ConstantProperty(icon) : undefined;
                billboard.scale = defined(scale) ? new ConstantProperty(scale) : new ConstantProperty(1.0);
                billboard.color = defined(color) ? new ConstantProperty(color) : new ConstantProperty(new Color(1, 1, 1, 1));
                billboard.nearFarScalar = new ConstantProperty(new NearFarScalar(2414016, 1.0, 1.6093e+7, 0.0));
                dynamicObject.billboard = billboard;
            } else if (node.nodeName === 'LabelStyle') {
                //Map style to label properties
                var label = defined(dynamicObject.label) ? dynamicObject.label : new DynamicLabel();
                var labelScale = getNumericValue(node, 'scale');
                var labelColor = getColorValue(node, 'color');

                label.scale = defined(labelScale) ? new ConstantProperty(labelScale) : new ConstantProperty(1.0);
                label.fillColor = defined(labelColor) ? new ConstantProperty(labelColor) : new ConstantProperty(new Color(1, 1, 1, 1));
                label.text = defined(dynamicObject.name) ? new ConstantProperty(dynamicObject.name) : undefined;
                label.pixelOffset = new ConstantProperty(new Cartesian2(0, 16));
                label.verticalOrigin = new ConstantProperty(VerticalOrigin.TOP);
                label.font = new ConstantProperty('16pt Arial');
                label.style = new ConstantProperty(LabelStyle.FILL_AND_OUTLINE);
                dynamicObject.label = label;
                //default billboard image
                if (!defined(dynamicObject.billboard)) {
                    dynamicObject.billboard = new DynamicBillboard();
                    dynamicObject.billboard.image = new ConstantProperty('http://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png');
                    dynamicObject.billboard.width = new ConstantProperty(32);
                    dynamicObject.billboard.height = new ConstantProperty(32);
                }
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
            targetObject.polyline = undefined;
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
                var pairs = styleMap.children;
                for ( var p = 0; p < pairs.length; p++) {
                    var pair = pairs[p];
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


    /** -- Functions required for the gx:Tour parser module -- **/


    function createDynamicDataObject(dataSource, dynamicObjectCollection, tour) {
        var oripath = calcOrientationsAndPath(tour);

        // calculate the clock
        var start = new JulianDate();
        var duration = 0;
        for (var i = 0; i < tour.length - 1; ++i) {
            duration += tour[i].duration;
        }
        var end = start.addSeconds(duration / 1000);

        dataSource._clock = new DynamicClock();
        dataSource._clock.startTime   = start;
        dataSource._clock.currentTime = start;
        dataSource._clock.stopTime    = end;
        dataSource._clock.clockRange  = ClockRange.CLAMPED;

        // create a dynamic object based on the results
        // FIXME
        var object = dynamicObjectCollection.getOrCreateObject('gxTour:' + start.toIso8601());
        object.clock = dataSource._clock;
        object.gxTour = tour;
        object.availability = new TimeInterval(start, end, true, false);
        object.orientations = oripath.orientations;
        object.camerapath = oripath.path;
        object.durationms = duration;

        dataSource._changed.raiseEvent(dataSource);
    }

    /**
     * Create an orientation interpolator based on a gx:Tour
     *
     * @param tour a gxTour object, as returned by the GxTourProcessor
     * @return a pair, with an orientations an OrientationInterpolator, that will contain the
     *         camera orientations and a path that contains a spline describing the path
     *         as described by the tour
     */
    function calcOrientationsAndPath(tour) {
        // TODO: get the ellipsoid from some real source
        var ellipsoid = Ellipsoid.WGS84;

        var locations = [];         // sequence of geographic locations
        var orientations = [];      // sequence of {direction, up} objects
        var durations = [];         // sequence of anim durations

        // process the tour nodes, and calculate locations, orientations and durations
        for (var i = 0; i < tour.length; i++) {
            var node = defaultValue(tour[i], defaultValue.EMPTY_OBJECT);

            if (node.type === 'flyTo') {
                // generate camera orientation matrix (Right,Up,Dir)
                var mat1 = generateOrientationMatrix(node.camera.location, ellipsoid);
                // apply camera rotations
                mat1 = rotCameraMatrix(mat1,
                    node.camera.orientation[0],
                    node.camera.orientation[1],
                    node.camera.orientation[2]
                );

                var v1 = mat1.getColumn(1); /*rmat.multiplyByVector(mat1.getColumn(1), v1);*/ // up
                var v2 = mat1.getColumn(2); /* rmat.multiplyByVector(mat1.getColumn(2), v2); */ // dir
                // v11 = rmat.multiplyByVector(v1); // up
                // v22 = rmat.multiplyByVector(v2); // dir

                // Store results
                // Cartograpic!
                locations.push(node.camera.location);
                orientations.push({ direction: v2, up: v1 });
                durations.push(node.duration);
            } else {
                // TBD handle 'wait' nodes
            }
        }

        // create a path based on the calculated locations
        var points = [];
        var t = 0;
        for (var k = 0; k < locations.length; k++) {
            var pt = ellipsoid.cartographicToCartesian(locations[k]);
            // set orientations too
            var ori = createQuaternion(orientations[k].direction, orientations[k].up);

            points.push({point: pt, time: t, orientation: ori});
            t += durations[k];
        }
        var path = createSpline(points);

        return { orientations: new OrientationInterpolator(points), path: path };
    }

    function createSpline(points) {
        if (points.length > 2) {
            return new HermiteSpline(points);
        }

        // only two points, use linear interpolation
        var p = points[0];
        var q = points[1];

        return {
            getControlPoints : function() {
                return points;
            },

            evaluate : function(time, result) {
                time = CesiumMath.clamp(time, p.time, q.time);
                var t = (time - p.time) / (q.time - p.time);
                return Cartesian3.lerp(p.point, q.point, t, result);
            }
        };
    }

    function createQuaternion(direction, up, result) {
        var cqRight = new Cartesian3();
        var cqUp = new Cartesian3();
        var viewMat = new Matrix3();

        Cartesian3.cross(direction, up, cqRight);
        Cartesian3.cross(cqRight, direction, cqUp);
        viewMat[0] = cqRight.x;
        viewMat[1] = cqUp.x;
        viewMat[2] = -direction.x;
        viewMat[3] = cqRight.y;
        viewMat[4] = cqUp.y;
        viewMat[5] = -direction.y;
        viewMat[6] = cqRight.z;
        viewMat[7] = cqUp.z;
        viewMat[8] = -direction.z;

        return Quaternion.fromRotationMatrix(viewMat, result);
    }

    /**
     * Calculates default camera direction matrix based on input location
     * By default a cinematic camera should look exactly at the center of ellipsoid
     * Its up vector always points towards geograpic North.
     *
     * @param {Geographic} loc Actual geographic location
     * @param {Ellipsoid} ell Ellipsoid
     *
     * @returns {Matrix3} Matrix containing three column vectors: right, up and direction
     */
    var generateOrientationMatrix = function(loc, ell) {
        // Surface Normal
        var sNorm = ell.geodeticSurfaceNormalCartographic(loc);


        // calculate cinematic camera up and dir vectors
        // i.  sNorm X North => Left
        var myLeft = Cartesian3.normalize( Cartesian3.cross(sNorm, Cartesian3.UNIT_Z) );
        // ii. Left X Up => dir (north)
        var upp = Cartesian3.cross(myLeft, sNorm);  // upp should point to North
        var dirr = Cartesian3.negate(sNorm);      // dirr should point to the center

        var myRight = Cartesian3.negate(myLeft);

        // prepare rotation matrix (R U D)
        var mat1 = new Matrix3(
            myRight.x, upp.x, dirr.x,
            myRight.y, upp.y, dirr.y,
            myRight.z, upp.z, dirr.z
        );
        return mat1;
    };

    /**
     * Apply rotations to cam orientation matrix, which originally points to the center of
     * an ellipsoid and it's 'up' is pointing north.
     * The resulting matrix will have a camera pointing to the correct heading, with
     * a specified up-down tilt and rotation around its direction.
     *
     * @see https://developers.google.com/kml/documentation/cameras
     *
     * @param {Matrix3} mat Cam orientation matrix (R U D)
     * @param {number} h Heading as compass angle in degrees (0 < h < 360), 0 = North
     * @param {number} t Tilt Horizontal tilting angle in degrees. (-180 < t < 180), 0 = Down, 90 = Head forward
     * @param {number} r Left-right rotation angle in degrees. (-180 < t < 180)
     *
     * @returns {Matrix3} Matrix having rotations applied to.
     */
    var rotCameraMatrix = function(mat, h, t, r){
        var mh, mt, mr;

        // Heading
        if (h === 0) {
            mh = Matrix3.IDENTITY;
        } else {
            mh = Matrix3.fromRotationZ(CesiumMath.toRadians(360 - h));
        }

        // Tilt
        if (t !== 0) {
            mt = Matrix3.fromRotationX(CesiumMath.toRadians(-t));
        } else {
            mt = Matrix3.IDENTITY;
        }

        // perform these two rotations so that we can determine the direction vector for roll
        Matrix3.multiply(mat, mh, mat);
        Matrix3.multiply(mat, mt, mat);

        // Roll (-180 < 0 < 180)
        // Roll around the calculated direction axis
        if (r !== 0) {
            var right = mat.getColumn(0);
            var up = mat.getColumn(1);
            var direction = mat.getColumn(2);

            var rad = CesiumMath.toRadians(r);
            mr = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(direction, rad));

            Matrix3.multiplyByVector(mr, right, right);
            Matrix3.multiplyByVector(mr, up, up);
            Matrix3.multiplyByVector(mr, direction, direction);

            mat = mat.setColumn(0, right);
            mat = mat.setColumn(1, up);
            mat = mat.setColumn(2, direction);
        }

        return mat;
    };



    /**
     * The main callback function that transforms KML nodes to Cesium objects
     *
     * @param {DataSource} dataSource A KmlDataSource instance.
     * @param {DOM Node} kml
     * @param {String} sourceUri
     * @param {Object} uriResolver
     */
    function loadKml(dataSource, kml, sourceUri, uriResolver) {
        var dynamicObjectCollection = dataSource._dynamicObjectCollection;
        var styleCollection = new DynamicObjectCollection();

        //Since KML external styles can be asynchonous, we start off
        //by loading all styles first, before doing anything else.
        return when.all(processStyles(kml, styleCollection, sourceUri, false, uriResolver), function() {
            var i;
            var placemarks = kml.getElementsByTagName('Placemark');
            var length = placemarks.length;
            for ( i = 0; i < length; i++) {
                processPlacemark(dataSource, placemarks[i], dynamicObjectCollection, styleCollection, sourceUri, uriResolver);
            }

            /** Process gx:Tour nodes START **/
            // process gx:Tour
            var tourNodes = kml.getElementsByTagNameNS(GxTourProcessor.GX_NS, 'Tour');
            // TBD: why just one tour?
            if (tourNodes.length === 1) {
                var processor = new GxTourProcessor();
                processor.processTour(tourNodes[0]);
                var tour = processor.getPlaylist();

                if (typeof dataSource._terrainProvider !== 'undefined') {
                    // make sure that no point is below ground
                    var coordinates = [];

                    for (i = 0; i < tour.length; i++) {
                        var point = tour[i];
                        if (point.type === 'flyTo') {
                            coordinates.push(point.camera.location.clone());
                        }
                    }

                    when(sampleTerrain(dataSource._terrainProvider, 11, coordinates), function(coords) {
                        if (coords.length === tour.length) {
                            for (i = 0; i < coords.length; ++i) {
                                if (tour[i].camera.location.height < coords[i].height + 0.5) {
                                    tour[i].camera.location.height = coords[i].height + 0.5;
                                }
                            }
                        }

                        createDynamicDataObject(dataSource, dynamicObjectCollection, tour);
                    });

                } else {
                    createDynamicDataObject(dataSource, dynamicObjectCollection, tour);
                }
            }
            /** Process gx:Tour nodes END **/

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

    function loadKmz(dataSource, blob, deferred) {
        var uriResolver = {};
        zip.createReader(new zip.BlobReader(blob), function(reader) {
            reader.getEntries(function(entries) {
                var promises = [];
                for ( var i = 0; i < entries.length; i++) {
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
                    loadKml(dataSource, uriResolver.kml, undefined, uriResolver);
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
     *
     * @param {TerrainProvider} terrainProvider a terrain provider that is used to make sure
     *        that the camera position is always above ground
     */
    var KmlDataSource = function(terrainProvider) {
        this._changed = new Event();
        this._error = new Event();
        this._clock = undefined;
        this._dynamicObjectCollection = new DynamicObjectCollection();
        this._timeVarying = true;

        this._terrainProvider = defaultValue(terrainProvider, undefined);
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
     * Asynchronously loads the KML at the provided url, replacing any existing data.
     *
     * @param {Object} url The url to be processed.
     *
     * @returns {Promise} a promise that will resolve when the KML is processed.
     *
     * @exception {DeveloperError} url is required.
     */
    KmlDataSource.prototype.loadUrl = function(url) {
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }

        var dataSource = this;
        return when(loadXML(url), function(kml) {
            return dataSource.load(kml, url);
        }, function(error) {
            dataSource._error.raiseEvent(dataSource, error);
            return when.reject(error);
        });
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
    KmlDataSource.prototype.loadKmz = function(kmz) {
        if (!defined(kmz)) {
            throw new DeveloperError('kmz is required.');
        }

        var deferred = when.defer();
        loadKmz(this, kmz, deferred);
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
    KmlDataSource.prototype.loadKmzUrl = function(url) {
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }

        var that = this;
        return when(loadBlob(url), function(blob) {
            return that.loadKmz(blob);
        }, function(error) {
            that._error.raiseEvent(that, error);
            return when.reject(error);
        });
    };

    return KmlDataSource;
});