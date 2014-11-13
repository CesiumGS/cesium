/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/ClockRange',
        '../Core/ClockStep',
        '../Core/Color',
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/Event',
        '../Core/getFilenameFromUri',
        '../Core/Iso8601',
        '../Core/JulianDate',
        '../Core/loadBlob',
        '../Core/loadXML',
        '../Core/Math',
        '../Core/NearFarScalar',
        '../Core/PinBuilder',
        '../Core/PolygonPipeline',
        '../Core/Rectangle',
        '../Core/RuntimeError',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Scene/LabelStyle',
        '../Scene/VerticalOrigin',
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        '../ThirdParty/zip',
        './BillboardGraphics',
        './ColorMaterialProperty',
        './ConstantPositionProperty',
        './ConstantProperty',
        './DataSource',
        './DataSourceClock',
        './Entity',
        './EntityCollection',
        './ImageMaterialProperty',
        './LabelGraphics',
        './PolygonGraphics',
        './PolylineGraphics',
        './PolylineOutlineMaterialProperty',
        './RectangleGraphics',
        './SampledPositionProperty'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartographic,
        ClockRange,
        ClockStep,
        Color,
        createGuid,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        Event,
        getFilenameFromUri,
        Iso8601,
        JulianDate,
        loadBlob,
        loadXML,
        CesiumMath,
        NearFarScalar,
        PinBuilder,
        PolygonPipeline,
        Rectangle,
        RuntimeError,
        TimeInterval,
        TimeIntervalCollection,
        LabelStyle,
        VerticalOrigin,
        Uri,
        when,
        zip,
        BillboardGraphics,
        ColorMaterialProperty,
        ConstantPositionProperty,
        ConstantProperty,
        DataSource,
        DataSourceClock,
        Entity,
        EntityCollection,
        ImageMaterialProperty,
        LabelGraphics,
        PolygonGraphics,
        PolylineGraphics,
        PolylineOutlineMaterialProperty,
        RectangleGraphics,
        SampledPositionProperty) {
    "use strict";

    var parser = new DOMParser();
    var scratchCartographic = new Cartographic();
    var scratchCartesian = new Cartesian3();

    function isZipFile(blob) {
        if (blob.size < 4) {
            return false;
        }

        var magicBlob = blob.slice(0, 4);
        var deferred = when.defer();
        var reader = new FileReader();
        reader.addEventListener('load', function() {
            deferred.resolve(new DataView(reader.result).getUint32(0, false) === 0x504b0304);
        });
        reader.addEventListener('error', function() {
            deferred.reject(new RuntimeError('Error reading blob.'));
        });
        reader.readAsArrayBuffer(magicBlob);
        return deferred;
    }

    var readBlob = {
        asText : function(blob) {
            var deferred = when.defer();
            var reader = new FileReader();
            reader.addEventListener('load', function() {
                deferred.resolve(reader.result);
            });
            reader.addEventListener('error', function() {
                deferred.reject(new RuntimeError('Error reading blob as text.'));
            });
            reader.readAsText(blob);
            return deferred;
        }
    };

    function loadXmlFromZip(reader, entry, uriResolver, deferred) {
        entry.getData(new zip.TextWriter(), function(text) {
            uriResolver.kml = parser.parseFromString(text, 'application/xml');
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
            // onprogress callback, currently unutilized.
        });
    }

    function proxyUrl(url, proxy) {
        if (defined(proxy)) {
            url = proxy.getURL(url);
        }
        return url;
    }

    function createId(node) {
        return defined(node) && defined(node.id) && node.id.length !== 0 ? node.id : createGuid();
    }

    //Helper functions
    function readCoordinate(element, altitudeMode) {
        var baseHeight = 0;
        switch (altitudeMode) {
        case 'absolute':
            //TODO MSL + height
            break;
        case 'relativeToGround':
            //TODO Terrain + height
            break;
        case 'clampToGround ':
            //TODO on terrain, ignore altitude
            break;
        default:
            //TODO Same as clampToGround
            break;
        }
        var digits = element.textContent.trim().split(/[\s,\n]+/g);
        scratchCartographic = Cartographic.fromDegrees(digits[0], digits[1], defined(digits[2]) ? parseFloat(digits[2]) : 0, scratchCartographic);
        return Ellipsoid.WGS84.cartographicToCartesian(scratchCartographic);
    }

    function readCoordinates(element) {
        //TODO: height is referenced to altitude mode
        var tuples = element.textContent.trim().split(/[\s\n]+/g);
        var numberOfCoordinates = tuples.length;
        var result = new Array(numberOfCoordinates);
        var resultIndex = 0;

        for (var i = 0; i < tuples.length; i++) {
            var coordinates = tuples[i].split(/[\s,\n]+/g);
            scratchCartographic = Cartographic.fromDegrees(parseFloat(coordinates[0]), parseFloat(coordinates[1]), defined(coordinates[2]) ? parseFloat(coordinates[2]) : 0, scratchCartographic);
            result[resultIndex++] = Ellipsoid.WGS84.cartographicToCartesian(scratchCartographic);
        }
        return result;
    }

    var namespaces = {
        kml : [null, undefined, 'http://www.opengis.net/kml/2.2', 'http://earth.google.com/kml/2.2', 'http://earth.google.com/kml/2.1', 'http://earth.google.com/kml/2.0'],
        gx : ['http://www.google.com/kml/ext/2.2'],
        atom : ['http://www.w3.org/2005/Atom']
    };

    function queryFirstNode(node, tagName, namespace) {
        var childNodes = node.childNodes;
        var length = childNodes.length;
        for (var q = 0; q < length; q++) {
            var child = childNodes[q];
            if (child.localName === tagName && namespace.indexOf(child.namespaceURI) !== -1) {
                return child;
            }
        }
        return undefined;
    }

    function queryNodes(node, tagName, namespace) {
        var result = [];
        var childNodes = node.getElementsByTagName(tagName);
        var length = childNodes.length;
        for (var q = 0; q < length; q++) {
            var child = childNodes[q];
            if (child.localName === tagName && namespace.indexOf(child.namespaceURI) !== -1) {
                result.push(child);
            }
        }
        return result;
    }

    function queryChildNodes(node, tagName, namespace) {
        var result = [];
        var childNodes = node.childNodes;
        var length = childNodes.length;
        for (var q = 0; q < length; q++) {
            var child = childNodes[q];
            if (child.localName === tagName && namespace.indexOf(child.namespaceURI) !== -1) {
                result.push(child);
            }
        }
        return result;
    }

    function queryNumericValue(node, tagName, namespace) {
        var resultNode = queryFirstNode(node, tagName, namespace);
        if (defined(resultNode)) {
            var result = parseFloat(resultNode.textContent);
            return !isNaN(result) ? result : undefined;
        }
        return undefined;
    }

    function queryStringValue(node, tagName, namespace) {
        var result = queryFirstNode(node, tagName, namespace);
        if (defined(result)) {
            return result.textContent;
        }
        return undefined;
    }

    function queryBooleanValue(node, tagName, namespace) {
        var result = queryFirstNode(node, tagName, namespace);
        if (defined(result)) {
            return result.textContent === '1';
        }
        return undefined;
    }

    function resolveHref(href, dataSource, sourceUri, uriResolver) {
        var hrefResolved = false;
        if (defined(uriResolver)) {
            var blob = uriResolver[href];
            if (defined(blob)) {
                hrefResolved = true;
                href = blob;
            }
        }
        if (!hrefResolved && defined(sourceUri)) {
            var baseUri = new Uri(document.location.href);
            sourceUri = new Uri(sourceUri);
            href = new Uri(href).resolve(sourceUri.resolve(baseUri)).toString();
            href = proxyUrl(href, dataSource._proxy);
        }
        return href;
    }

    var colorOptions = {};
    function queryColorValue(node, tagName, namespace) {
        var colorString = queryStringValue(node, tagName, namespace);
        if (!defined(colorString)) {
            return;
        }

        var alpha = parseInt(colorString.substring(0, 2), 16) / 255.0;
        var blue = parseInt(colorString.substring(2, 4), 16) / 255.0;
        var green = parseInt(colorString.substring(4, 6), 16) / 255.0;
        var red = parseInt(colorString.substring(6, 8), 16) / 255.0;

        if (queryStringValue(node, 'colorMode', namespace) !== 'random') {
            return new Color(red, green, blue, alpha);
        }

        if (red > 0) {
            colorOptions.maximumRed = red;
        } else {
            colorOptions.red = 0;
        }
        if (green > 0) {
            colorOptions.maximumGreen = green;
        } else {
            colorOptions.green = 0;
        }
        if (blue > 0) {
            colorOptions.maximumBlue = blue;
        } else {
            colorOptions.blue = 0;
        }
        colorOptions.alpha = alpha;
        return Color.fromRandom(colorOptions);
    }

    function processPoint(dataSource, entity, kml, node) {
        //TODO extrude, altitudeMode, gx:altitudeMode
        var coordinatesNode = queryFirstNode(node, 'coordinates', namespaces.kml);
        var cartesian3 = readCoordinate(coordinatesNode, queryStringValue(node, 'altitudeMode', namespaces.kml));
        entity.position = new ConstantPositionProperty(cartesian3);
    }

    function processLineString(dataSource, entity, kml, node) {
        var coordinatesNode = queryFirstNode(node, 'coordinates', namespaces.kml);
        if (defined(coordinatesNode)) {
            var coordinates = readCoordinates(coordinatesNode);
            if (defined(coordinates)) {
                if (!defined(entity.polyline)) {
                    entity.polyline = new PolylineGraphics();
                }
                entity.polyline.positions = new ConstantProperty(coordinates);
            }
        }
    }

    function processLinearRing(dataSource, entity, kml, node) {
        var coordinatesNode = queryFirstNode(node, 'coordinates', namespaces.kml);
        if (defined(coordinatesNode)) {
            var coordinates = readCoordinates(coordinatesNode);
            if (defined(coordinates)) {
                coordinates = PolygonPipeline.removeDuplicates(coordinates);

                if (coordinates.length > 3) {
                    if (defined(entity.polyline)) {
                        entity.polyline.positions = new ConstantProperty(coordinates);
                    }
                    if (defined(entity.polygon)) {
                        entity.polygon.positions = new ConstantProperty(coordinates);
                    }
                }
            }
        }
    }

    function processPolygon(dataSource, entity, kml, node) {
        //TODO innerBoundaryIS, tessellate, altitudeMode

        if (!defined(entity.polygon)) {
            entity.polygon = new PolygonGraphics();
        }

        var altitudeMode = queryStringValue(node, 'altitudeMode', namespaces.kml);
        var perPositionHeight = defined(altitudeMode) && (altitudeMode !== 'clampToGround') && (altitudeMode !== 'clampToSeaFloor');
        entity.polygon.perPositionHeight = new ConstantProperty(perPositionHeight);

        if (defaultValue(queryBooleanValue(node, 'extrude', namespaces.kml), false)) {
            entity.polygon.extrudedHeight = new ConstantProperty(0);
        }

        var outerNodes = queryChildNodes(node, 'outerBoundaryIs', namespaces.kml);
        var positions;
        for (var j = 0; j < outerNodes.length; j++) {
            processLinearRing(dataSource, entity, kml, queryFirstNode(outerNodes[j], 'LinearRing', namespaces.kml));
            break;
        }
    }

    function processGxTrack(dataSource, entity, kml, node) {
        //TODO altitudeMode, gx:angles
        var altitudeMode = queryStringValue(node, 'altitudeMode', namespaces.kml);
        var coordNodes = queryChildNodes(node, 'coord', namespaces.gx);
        var timeNodes = queryChildNodes(node, 'when', namespaces.kml);

        var coordinates = new Array(coordNodes.length);
        var times = new Array(timeNodes.length);
        for (var i = 0; i < times.length; i++) {
            coordinates[i] = readCoordinate(coordNodes[i], altitudeMode);
            times[i] = JulianDate.fromIso8601(timeNodes[i].textContent);
        }
        var property = new SampledPositionProperty();
        property.addSamples(times, coordinates);
        entity.position = property;
    }

    function processGxMultiTrack(dataSource, entity, kml, node, entityCollection) {
        var altitudeMode = queryStringValue(node, 'altitudeMode', namespaces.gx);
        if (!defined(altitudeMode)) {
            altitudeMode = queryStringValue(node, 'altitudeMode', namespaces.kml);
        }
        var interpolate = queryBooleanValue(node, 'interpolate', namespaces.kml);

        var trackNodes = queryChildNodes(node, 'Track', namespaces.gx);
        for (var i = 0, len = trackNodes.length; i < len; i++) {
            var trackNode = trackNodes[i];
            var trackNodeId = createId(trackNode);
            var trackEntity = entityCollection.getOrCreateEntity(trackNodeId);
            trackEntity.parent = entity;

            mergeStyles(trackNode.localName, entity, trackEntity);
            processGxTrack(dataSource, trackEntity, kml, trackNode, entityCollection);
        }
    }

    function processMultiGeometry(dataSource, entity, kml, node, entityCollection) {
        var childNodes = node.childNodes;
        for (var i = 0, len = childNodes.length; i < len; i++) {
            var childNode = childNodes.item(i);
            var childNodeName = childNode.nodeName;

            if (geometryTypes.hasOwnProperty(childNodeName)) {
                var childNodeId = createId(childNode);
                var childEntity = entityCollection.getOrCreateEntity(childNodeId);
                childEntity.parent = entity;

                mergeStyles(childNodeName, entity, childEntity);

                var geometryHandler = geometryTypes[childNodeName];
                geometryHandler(dataSource, childEntity, kml, childNode, entityCollection);
            }
        }
    }

    function processTimeSpan(node) {
        var result;

        var beginNode = queryFirstNode(node, 'begin', namespaces.kml);
        var beginDate = defined(beginNode) ? JulianDate.fromIso8601(beginNode.textContent) : undefined;

        var endNode = queryFirstNode(node, 'end', namespaces.kml);
        var endDate = defined(endNode) ? JulianDate.fromIso8601(endNode.textContent) : undefined;

        if (defined(beginDate) && defined(endDate)) {
            if (JulianDate.lessThan(endDate, beginDate)) {
                var tmp = beginDate;
                beginDate = endDate;
                endDate = tmp;
            }
            result = new TimeIntervalCollection();
            result.addInterval(new TimeInterval({
                start : beginDate,
                stop : endDate
            }));
        } else if (defined(beginDate)) {
            result = new TimeIntervalCollection();
            result.addInterval(new TimeInterval({
                start : beginDate,
                stop : Iso8601.MAXIMUM_VALUE
            }));
        } else if (defined(endDate)) {
            result = new TimeIntervalCollection();
            result.addInterval(new TimeInterval({
                start : Iso8601.MINIMUM_VALUE,
                stop : endDate
            }));
        }

        return result;
    }

    var geometryTypes = {
        Point : processPoint,
        LineString : processLineString,
        LinearRing : processLinearRing,
        Polygon : processPolygon,
        Track : processGxTrack,
        MultiTrack : processGxMultiTrack,
        MultiGeometry : processMultiGeometry
    };

    function createDefaultBillboard() {
        var billboard = new BillboardGraphics();
        billboard.width = new ConstantProperty(32);
        billboard.height = new ConstantProperty(32);
        billboard.scaleByDistance = new ConstantProperty(new NearFarScalar(2414016, 1.0, 1.6093e+7, 0.1));
        return billboard;
    }

    function processStyle(dataSource, styleNode, entity, sourceUri, uriResolver) {
        for (var i = 0, len = styleNode.childNodes.length; i < len; i++) {
            var node = styleNode.childNodes.item(i);
            var material;
            if (node.nodeName === 'IconStyle') {
                //Map style to billboard properties
                //TODO heading, hotSpot
                var scale = queryNumericValue(node, 'scale', namespaces.kml);
                var color = queryColorValue(node, 'color', namespaces.kml);
                var iconNode = queryFirstNode(node, 'Icon', namespaces.kml);
                var href = defined(iconNode) ? queryStringValue(iconNode, 'href', namespaces.kml) : undefined;
                var icon = defined(href) ? resolveHref(href, dataSource, sourceUri, uriResolver) : undefined;

                var billboard = entity.billboard;
                if (!defined(billboard)) {
                    billboard = createDefaultBillboard();
                    entity.billboard = billboard;
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
                var label = defined(entity.label) ? entity.label : new LabelGraphics();
                var labelScale = queryNumericValue(node, 'scale', namespaces.kml);
                var labelColor = queryColorValue(node, 'color', namespaces.kml);

                label.translucencyByDistance = new ConstantProperty(new NearFarScalar(1500000, 1.0, 3400000, 0.0));
                label.scale = defined(labelScale) ? new ConstantProperty(labelScale) : new ConstantProperty(1.0);
                label.fillColor = defined(labelColor) ? new ConstantProperty(labelColor) : new ConstantProperty(new Color(1, 1, 1, 1));
                label.text = defined(entity.name) ? new ConstantProperty(entity.name) : undefined;
                label.pixelOffset = new ConstantProperty(new Cartesian2(0, -16));
                label.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);
                label.font = new ConstantProperty('16pt Arial');
                label.style = new ConstantProperty(LabelStyle.FILL_AND_OUTLINE);
                entity.label = label;
            } else if (node.nodeName === 'LineStyle') {
                //Map style to line properties
                //TODO PhysicalWidth, labelVisibility
                var polyline = defined(entity.polyline) ? entity.polyline : new PolylineGraphics();
                var lineColor = queryColorValue(node, 'color', namespaces.kml);
                var lineWidth = queryNumericValue(node, 'width', namespaces.kml);
//                var outerColorString = queryStringValue(node, 'outerColor', namespace.gx);
//                var lineOuterColor = Color.fromCssColorString(outerColorString);
//                var lineOuterWidth = queryNumericValue(node, 'outerWidth', namespace.gx);
//                if (defined(lineOuterWidth) && (lineOuterWidth < 0 || lineOuterWidth > 1.0)) {
//                    throw new RuntimeError('gx:outerWidth must be a value between 0 and 1.0');
//                }

                polyline.width = defined(lineWidth) ? new ConstantProperty(Math.max(lineWidth, 1.0)) : new ConstantProperty(1.0);
                material = new PolylineOutlineMaterialProperty();
                material.color = defined(lineColor) ? new ConstantProperty(lineColor) : new ConstantProperty(new Color(1, 1, 1, 1));
//                material.outlineColor = defined(lineOuterColor) ? new ConstantProperty(lineOuterColor) : new ConstantProperty(new Color(0, 0, 0, 1));
//                material.outlineWidth = defined(lineOuterWidth) ? new ConstantProperty(lineOuterWidth) : new ConstantProperty(0);
                polyline.material = material;
                entity.polyline = polyline;
            } else if (node.nodeName === 'PolyStyle') {
                entity.polygon = defined(entity.polygon) ? entity.polygon : new PolygonGraphics();
                var polygonColor = queryColorValue(node, 'color', namespaces.kml);
                polygonColor = defined(polygonColor) ? polygonColor : new Color(1, 1, 1, 1);
                material = new ColorMaterialProperty();
                material.color = new ConstantProperty(polygonColor);
                entity.polygon.material = material;

                var fill = queryBooleanValue(node, 'fill', namespaces.kml);
                if (defined(fill)) {
                    entity.polygon.fill = new ConstantProperty(fill);
                }
                var outline = queryBooleanValue(node, 'outline', namespaces.kml);
                if (defined(outline)) {
                    entity.polygon.outline = new ConstantProperty(outline);
                }
            }
        }
    }

    function mergeStyles(geometryType, styleEntity, targetEntity) {
        targetEntity.merge(styleEntity);

        //If a shared style has multiple styles, for example PolyStyle and
        //and LineStyle, an Entity can end up with styles it shouldn't have.
        //After we merge, remove any such styles.
        switch (geometryType) {
        case 'Point':
            targetEntity.path = undefined;
            targetEntity.polygon = undefined;
            targetEntity.polyline = undefined;
            break;
        case 'LineString':
        case 'LinearRing':
            targetEntity.billboard = undefined;
            targetEntity.label = undefined;
            targetEntity.path = undefined;
            targetEntity.point = undefined;
            targetEntity.polygon = undefined;
            break;
        case 'Polygon':
            targetEntity.billboard = undefined;
            targetEntity.label = undefined;
            targetEntity.path = undefined;
            targetEntity.point = undefined;
            if (defined(targetEntity.polyline)) {
                if (!defined(targetEntity.polygon)) {
                    targetEntity.polygon = new PolygonGraphics();
                }
                targetEntity.polygon.outline = defined(targetEntity.polyline.show) ? targetEntity.polyline.show : new ConstantProperty(true);
                if (defined(targetEntity.polyline.material)) {
                    targetEntity.polygon.outlineColor = targetEntity.polyline.material.color;
                }
            }
            targetEntity.polyline = undefined;
            break;
        case 'Track':
            targetEntity.polygon = undefined;
            targetEntity.polyline = undefined;
            break;
        case 'MultiTrack':
            targetEntity.polygon = undefined;
            targetEntity.polyline = undefined;
            break;
        case 'MultiGeometry':
            break;
        default:
            break;
        }
    }

    //Processes and merges any inline styles for the provided node into the provided entity.
    function processInlineStyles(dataSource, placeMark, styleCollection, sourceUri, uriResolver) {
        var result = new Entity();
        var inlineStyles = queryChildNodes(placeMark, 'Style', namespaces.kml);
        var inlineStylesLength = inlineStyles.length;
        if (inlineStylesLength > 0) {
            //Google earth seems to always use the last inline style only.
            processStyle(dataSource, inlineStyles[inlineStylesLength - 1], result, sourceUri, uriResolver);
        }

        //Google earth seems to always use the first external style only.
        var externalStyle = queryFirstNode(placeMark, 'styleUrl', namespaces.kml);
        if (defined(externalStyle)) {
            var styleEntity = styleCollection.getById(externalStyle.textContent);
            if (typeof styleEntity !== 'undefined') {
                result.merge(styleEntity);
            }
        }
        return result;
    }

    //Asynchronously processes an external style file.
    function processExternalStyles(dataSource, uri, styleCollection) {
        return when(loadXML(proxyUrl(uri, dataSource._proxy)), function(styleKml) {
            return processStyles(dataSource, styleKml, styleCollection, uri, true);
        });
    }

    //Processes all shared and external styles and stores
    //their id into the provided styleCollection.
    //Returns an array of promises that will resolve when
    //each style is loaded.
    function processStyles(dataSource, kml, styleCollection, sourceUri, isExternal, uriResolver) {
        var i;
        var id;
        var styleEntity;

        var styleNodes = queryNodes(kml, 'Style', namespaces.kml);
        var styleNodesLength = styleNodes.length;
        for (i = 0; i < styleNodesLength; i++) {
            var node = styleNodes[i];
            var attributes = node.attributes;
            id = defined(attributes.id) ? attributes.id.value : undefined;
            if (defined(id)) {
                id = '#' + id;
                if (isExternal && defined(sourceUri)) {
                    id = sourceUri + id;
                }
                if (!defined(styleCollection.getById(id))) {
                    styleEntity = new Entity(id);
                    styleCollection.add(styleEntity);
                    processStyle(dataSource, node, styleEntity, sourceUri, uriResolver);
                }
            }
        }

        var styleMaps = queryNodes(kml, 'StyleMap', namespaces.kml);
        var styleMapsLength = styleMaps.length;
        for (i = 0; i < styleMapsLength; i++) {
            var styleMap = styleMaps[i];
            id = defined(styleMap.attributes.id) ? styleMap.attributes.id.value : undefined;
            if (defined(id)) {
                var pairs = styleMap.childNodes;
                for (var p = 0; p < pairs.length; p++) {
                    var pair = pairs[p];
                    if (pair.nodeName !== 'Pair') {
                        continue;
                    }
                    if (queryStringValue(pair, 'key', namespaces.kml) === 'normal') {
                        var styleUrl = queryStringValue(pair, 'styleUrl', namespaces.kml);
                        id = '#' + id;
                        if (isExternal && defined(sourceUri)) {
                            id = sourceUri + id;
                        }
                        if (!defined(styleCollection.getById(id))) {
                            styleEntity = styleCollection.getOrCreateEntity(id);
                            var base = styleCollection.getOrCreateEntity(styleUrl);
                            if (defined(base)) {
                                styleEntity.merge(base);
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
                    promises.push(processExternalStyles(dataSource, uri, styleCollection, sourceUri));
                }
            }
        }

        return promises;
    }

    function processDocument(dataSource, parent, node, entityCollection, styleCollection, sourceUri, uriResolver) {
        var featureTypeNames = Object.keys(featureTypes);
        var featureTypeNamesLength = featureTypeNames.length;

        for (var i = 0; i < featureTypeNamesLength; i++) {
            var featureName = featureTypeNames[i];
            var processFeatureNode = featureTypes[featureName];

            var childNodes = node.childNodes;
            var length = childNodes.length;
            for (var q = 0; q < length; q++) {
                var child = childNodes[q];
                if (child.localName === featureName && namespaces.kml.indexOf(child.namespaceURI) !== -1) {
                    processFeatureNode(dataSource, parent, child, entityCollection, styleCollection, sourceUri, uriResolver);
                }
            }
        }
    }

    function processFolder(dataSource, parent, node, entityCollection, styleCollection, sourceUri, uriResolver) {
        parent = new Entity(createId(node));
        parent.name = queryStringValue(node, 'name', namespaces.kml);
        entityCollection.add(parent);
        processDocument(dataSource, parent, node, entityCollection, styleCollection, sourceUri, uriResolver);
    }

    function processPlacemark(dataSource, parent, placemark, entityCollection, styleCollection, sourceUri, uriResolver) {
        var id = createId(placemark.id);
        var entity = entityCollection.getOrCreateEntity(id);

        if (defined(parent)) {
            entity.parent = parent;
        }

        var styleEntity = processInlineStyles(dataSource, placemark, styleCollection, sourceUri, uriResolver);

        var name = queryStringValue(placemark, 'name', namespaces.kml);
        if (defined(name)) {
            if (!defined(entity.label)) {
                entity.label = new LabelGraphics();
                entity.label.font = new ConstantProperty('16pt Arial');
                entity.label.style = new ConstantProperty(LabelStyle.FILL_AND_OUTLINE);
                entity.label.pixelOffset = new ConstantProperty(new Cartesian2(0, -16));
                entity.label.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);
                entity.label.translucencyByDistance = new ConstantProperty(new NearFarScalar(1500000, 1.0, 3400000, 0.0));
            }
            entity.label.text = new ConstantProperty(name);
            entity.name = name;
        }

        var foundGeometry = false;
        var nodes = placemark.childNodes;
        var visibility = queryBooleanValue(placemark, 'visibility', namespaces.kml);
        entity.uiShow = defined(visibility) ? visibility : true;

        for (var i = 0, len = nodes.length; i < len; i++) {
            var node = nodes.item(i);
            var nodeName = node.localName;
            if (nodeName === 'TimeSpan') {
                entity.availability = processTimeSpan(node);
            } else if (nodeName === 'description') {
                entity.description = new ConstantProperty(node.textContent);
            } else if (geometryTypes.hasOwnProperty(nodeName)) {
                foundGeometry = true;
                mergeStyles(nodeName, styleEntity, entity);
                geometryTypes[nodeName](dataSource, entity, placemark, node, entityCollection);
            }
        }

        if (!foundGeometry) {
            mergeStyles(undefined, styleEntity, entity);
        }

        var billboard = entity.billboard;
        var label = entity.label;
        if (defined(billboard) || defined(label)) {
            if (!defined(billboard)) {
                billboard = new BillboardGraphics();
                entity.billboard = billboard;
            }
            if (!defined(billboard.image)) {
                billboard.image = new ConstantProperty(dataSource._pinBuilder.fromColor(Color.YELLOW, 64).toDataURL());
            }
        }
    }

    function processGroundOverlay(dataSource, parent, groundOverlay, entityCollection, styleCollection, sourceUri, uriResolver) {
        var id = createId(groundOverlay.id);
        var entity = entityCollection.getOrCreateEntity(id);

        //TODO
        //<gx:altitudeMode>
        //<gx:LatLonQuad>
        //drawOrder
        if (defined(parent)) {
            entity.parent = parent;
        }

        var styleEntity = processInlineStyles(dataSource, groundOverlay, styleCollection, sourceUri, uriResolver);

        entity.name = queryStringValue(groundOverlay, 'name', namespaces.kml);
        var nodes = groundOverlay.childNodes;

        var timeSpan = queryFirstNode(groundOverlay, 'TimeSpan', namespaces.kml);
        if (defined(timeSpan)) {
            entity.availability = processTimeSpan(timeSpan);
        }

        var description = queryStringValue(groundOverlay, 'description', namespaces.kml);
        entity.description = defined(description) ? new ConstantProperty(description) : undefined;

        var visibility = queryBooleanValue(groundOverlay, 'visibility', namespaces.kml);
        entity.uiShow = defined(visibility) ? visibility : true;

        var latLonBox = queryFirstNode(groundOverlay, 'LatLonBox', namespaces.kml);
        if (defined(latLonBox)) {
            //TODO: Apparently values beyond the global extent are valid
            //and should wrap around; which we currently don't handle.
            var west = Math.max(-180, Math.min(180, queryNumericValue(latLonBox, 'west', namespaces.kml)));
            var south = Math.max(-90, Math.min(90, queryNumericValue(latLonBox, 'south', namespaces.kml)));
            var east = Math.max(-180, Math.min(180, queryNumericValue(latLonBox, 'east', namespaces.kml)));
            var north = Math.max(-90, Math.min(90, queryNumericValue(latLonBox, 'north', namespaces.kml)));

            var cb = Ellipsoid.WGS84;

            var rectangle = entity.rectangle;
            if (!defined(rectangle)) {
                rectangle = new RectangleGraphics();
                entity.rectangle = rectangle;
            }
            var extent = Rectangle.fromDegrees(west, south, east, north);
            rectangle.coordinates = new ConstantProperty(extent);
            entity.position = new ConstantPositionProperty(Ellipsoid.WGS84.cartographicToCartesian(
                    Rectangle.center(extent, scratchCartesian), scratchCartographic));

            var material;
            var iconNode = queryFirstNode(groundOverlay, 'Icon', namespaces.kml);
            var href = defined(iconNode) ? queryStringValue(iconNode, 'href', namespaces.kml) : undefined;
            if (defined(href)) {
                var icon = resolveHref(href, dataSource, sourceUri, uriResolver);
                material = new ImageMaterialProperty();
                material.image = new ConstantProperty(icon);
            } else {
                var color = queryColorValue(groundOverlay, 'color', namespaces.kml);
                if (defined(color)) {
                    material = ColorMaterialProperty.fromColor(color);
                }
            }
            rectangle.material = material;

            var rotation = queryNumericValue(latLonBox, 'rotation', namespaces.kml);
            if (defined(rotation)) {
                rectangle.rotation = new ConstantProperty(CesiumMath.toRadians(rotation));
            }

            var altitudeMode = queryStringValue(groundOverlay, 'altitudeMode', namespaces.kml);
            if (defined(altitudeMode)) {
                if (altitudeMode === 'absolute') {
                    //TODO absolute means relative to sea level, not the ellipsoid.
                    var altitude = queryNumericValue(groundOverlay, 'altitude', namespaces.kml);
                    rectangle.height = new ConstantProperty(defined(altitude) ? altitude : 0);
                } else if (altitudeMode === 'clampToGround') {
                    //TODO conform to terrain.
                } else {
                    throw new RuntimeError('Unknown enumeration: ' + altitudeMode);
                }
            }
        }

        mergeStyles('GroundOverlay', styleEntity, entity);
    }

    function processUnsupported(dataSource, parent, node, entityCollection, styleCollection, sourceUri, uriResolver) {
        window.console.log('Unsupported feature: ' + node.nodeName);
    }

    var featureTypes = {
        Document : processDocument,
        Folder : processFolder,
        Placemark : processPlacemark,
        NetworkLink : processUnsupported,
        GroundOverlay : processGroundOverlay,
        PhotoOverlay : processUnsupported,
        ScreenOverlay : processUnsupported
    };

    function processFeatureNode(dataSource, node, parent, entityCollection, styleCollection, sourceUri, uriResolver) {
        var featureProocessor = featureTypes[node.nodeName];
        if (!defined(featureProocessor)) {
            featureProocessor = featureTypes[node.nodeName];
        }
        if (defined(featureProocessor)) {
            featureProocessor(dataSource, parent, node, entityCollection, styleCollection, sourceUri, uriResolver);
        } else {
            window.console.log('Unsupported feature node: ' + node.nodeName);
        }
    }

    function loadKml(dataSource, kml, sourceUri, uriResolver) {
        var docElement = queryFirstNode(kml.documentElement, 'Document', namespaces.kml);
        var name = docElement ? queryStringValue(docElement, 'name', namespaces.kml) : undefined;
        if (!defined(name) && defined(sourceUri)) {
            name = getFilenameFromUri(sourceUri);
        }

        if (dataSource._name !== name) {
            dataSource._name = name;
            dataSource._changed.raiseEvent(dataSource);
        }

        var styleCollection = new EntityCollection();
        return when.all(processStyles(dataSource, kml, styleCollection, sourceUri, false, uriResolver), function() {
            var entityCollection = dataSource._entityCollection;
            processFeatureNode(dataSource, kml.documentElement.firstElementChild, undefined, entityCollection, styleCollection, sourceUri, uriResolver);

            var availability = entityCollection.computeAvailability();
            if (availability.equals(Iso8601.MAXIMUM_INTERVAL)) {
                if (defined(dataSource._clock)) {
                    dataSource._clock = undefined;
                    dataSource._changed.raiseEvent(dataSource);
                }
            } else {
                var clock = new DataSourceClock();
                clock.startTime = availability.start;
                clock.stopTime = availability.stop;
                clock.currentTime = availability.start;
                clock.clockRange = ClockRange.LOOP_STOP;
                clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
                clock.multiplier = Math.min(Math.max(JulianDate.secondsDifference(availability.stop, availability.start) / 60, 60), 50000000);
                if (!defined(dataSource._clock) || !(dataSource._clock.equals(clock))) {
                    dataSource._clock = clock;
                    dataSource._changed.raiseEvent(dataSource);
                }
            }

            DataSource.setLoading(dataSource, false);
            return dataSource;
        });
    }

    function loadKmz(dataSource, blob, sourceUri) {
        var deferred = when.defer();
        zip.createReader(new zip.BlobReader(blob), function(reader) {
            reader.getEntries(function(entries) {
                var promises = [];
                var foundKML = false;
                var uriResolver = {};
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    if (!entry.directory) {
                        var innerDefer = when.defer();
                        promises.push(innerDefer.promise);
                        if (!foundKML && /\.kml$/i.test(entry.filename)) {
                            //Only the first KML file found in the zip is used.
                            //https://developers.google.com/kml/documentation/kmzarchives
                            foundKML = true;
                            loadXmlFromZip(reader, entry, uriResolver, innerDefer);
                        } else {
                            loadDataUriFromZip(reader, entry, uriResolver, innerDefer);
                        }
                    }
                }
                when.all(promises).then(function() {
                    reader.close();
                    if (!defined(uriResolver.kml)) {
                        deferred.reject(new RuntimeError('KMZ file does not contain a KML document.'));
                        return;
                    }
                    return loadKml(dataSource, uriResolver.kml, sourceUri, uriResolver).then(deferred.resolve);
                }).otherwise(deferred.reject);
            });
        }, function(e) {
            deferred.reject(e);
        });

        return deferred;
    }

    /**
     * A {@link DataSource} which processes Keyhole Markup Language (KML).
     * @alias KmlDataSource
     * @constructor
     *
     * @see https://developers.google.com/kml/
     * @see http://www.opengeospatial.org/standards/kml/
     */
    var KmlDataSource = function(proxy) {
        this._changed = new Event();
        this._error = new Event();
        this._loading = new Event();
        this._clock = undefined;
        this._entityCollection = new EntityCollection();
        this._name = undefined;
        this._isLoading = false;
        this._proxy = proxy;
        this._pinBuilder = new PinBuilder();
    };

    defineProperties(KmlDataSource.prototype, {
        /**
         * Gets a human-readable name for this instance.
         * @memberof KmlDataSource.prototype
         * @type {String}
         */
        name : {
            get : function() {
                return this._name;
            }
        },
        /**
         * Gets the clock settings defined by the loaded CZML.  If no clock is explicitly
         * defined in the CZML, the combined availability of all entities is returned.  If
         * only static data exists, this value is undefined.
         * @memberof KmlDataSource.prototype
         * @type {DataSourceClock}
         */
        clock : {
            get : function() {
                return this._clock;
            }
        },
        /**
         * Gets the collection of {@link Entity} instances.
         * @memberof KmlDataSource.prototype
         * @type {EntityCollection}
         */
        entities : {
            get : function() {
                return this._entityCollection;
            }
        },
        /**
         * Gets a value indicating if the data source is currently loading data.
         * @memberof KmlDataSource.prototype
         * @type {Boolean}
         */
        isLoading : {
            get : function() {
                return this._isLoading;
            }
        },
        /**
         * Gets an event that will be raised when the underlying data changes.
         * @memberof KmlDataSource.prototype
         * @type {Event}
         */
        changedEvent : {
            get : function() {
                return this._changed;
            }
        },
        /**
         * Gets an event that will be raised if an error is encountered during processing.
         * @memberof KmlDataSource.prototype
         * @type {Event}
         */
        errorEvent : {
            get : function() {
                return this._error;
            }
        },
        /**
         * Gets an event that will be raised when the data source either starts or stops loading.
         * @memberof KmlDataSource.prototype
         * @type {Event}
         */
        loadingEvent : {
            get : function() {
                return this._loading;
            }
        }
    });

    /**
     * Asynchronously loads the provided KML document, replacing any existing data.
     *
     * @param {Document} kml The parsed KML document to be processed.
     * @param {string} sourceUri The url of the document which is used for resolving relative links and other KML features.
     *
     * @returns {Promise} a promise that will resolve when the KML is processed.
     */
    KmlDataSource.prototype.load = function(kml, sourceUri) {
        if (!defined(kml)) {
            throw new DeveloperError('kml is required.');
        }

        DataSource.setLoading(this, true);
        var that = this;
        return when(loadKml(this, kml, sourceUri, undefined)).otherwise(function(error) {
            DataSource.setLoading(that, false);
            that._error.raiseEvent(that, error);
            return when.reject(error);
        });
    };

    /**
     * Asynchronously loads the provided KMZ Blob, replacing any existing data.
     *
     * @param {Blob} kmz The KMZ document to be processed.
     * @param {string} sourceUri The url of the document which is used for resolving relative links and other KML features.
     *
     * @returns {Promise} a promise that will resolve when the KMZ is processed.
     */
    KmlDataSource.prototype.loadKmz = function(kmz, sourceUri) {
        if (!defined(kmz)) {
            throw new DeveloperError('kmz is required.');
        }

        DataSource.setLoading(this, true);
        var that = this;
        return when(loadKmz(this, kmz, sourceUri)).otherwise(function(error) {
            DataSource.setLoading(that, false);
            that._error.raiseEvent(that, error);
            return when.reject(error);
        });
    };

    /**
     * Asynchronously loads the KML or KMZ file at the provided url, replacing any existing data.
     *
     * @param {Object} url The url to be processed.
     *
     * @returns {Promise} a promise that will resolve when the KMZ is processed.
     */
    KmlDataSource.prototype.loadUrl = function(url) {
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }

        DataSource.setLoading(this, true);
        var that = this;
        return when(loadBlob(proxyUrl(url, this._proxy))).then(function(blob) {
            return isZipFile(blob).then(function(isZip) {
                if (isZip) {
                    return loadKmz(that, blob, url);
                }
                return when(readBlob.asText(blob)).then(function(text) {
                    var kml = parser.parseFromString(text, 'application/xml');
                    //There's no official way to validate if the parse was successful.
                    //The following if check seems to detect the error on all supported browsers.
                    if ((defined(kml.body) && kml.body !== null) || kml.documentElement.tagName === 'parsererror') {
                        throw new RuntimeError(kml.body.innerText);
                    }
                    return loadKml(that, kml, url, undefined);
                });
            });
        }).otherwise(function(error) {
            DataSource.setLoading(that, false);
            that._error.raiseEvent(that, error);
            return when.reject(error);
        });
    };

    return KmlDataSource;
});