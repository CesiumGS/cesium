/*global define*/
define([
        '../Core/BoundingRectangle',
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
        '../Core/PolygonHierarchy',
        '../Core/Rectangle',
        '../Core/RuntimeError',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Scene/HorizontalOrigin',
        '../Scene/LabelStyle',
        '../Scene/VerticalOrigin',
        '../ThirdParty/AutoLinker',
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        '../ThirdParty/zip',
        './BillboardGraphics',
        './DataSource',
        './DataSourceClock',
        './Entity',
        './EntityCollection',
        './LabelGraphics',
        './PolygonGraphics',
        './PolylineGraphics',
        './PolylineOutlineMaterialProperty',
        './PositionPropertyArray',
        './RectangleGraphics',
        './ReferenceProperty',
        './SampledPositionProperty',
        './SurfacePositionProperty',
        './CompositeProperty',
        './WallGraphics'
    ], function(
        BoundingRectangle,
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
        PolygonHierarchy,
        Rectangle,
        RuntimeError,
        TimeInterval,
        TimeIntervalCollection,
        HorizontalOrigin,
        LabelStyle,
        VerticalOrigin,
        AutoLinker,
        Uri,
        when,
        zip,
        BillboardGraphics,
        DataSource,
        DataSourceClock,
        Entity,
        EntityCollection,
        LabelGraphics,
        PolygonGraphics,
        PolylineGraphics,
        PolylineOutlineMaterialProperty,
        PositionPropertyArray,
        RectangleGraphics,
        ReferenceProperty,
        SampledPositionProperty,
        SurfacePositionProperty,
        CompositeProperty,
        WallGraphics) {
    "use strict";

    var parser = new DOMParser();
    var autoLinker = new AutoLinker({
        stripPrefix : false,
        twitter : false,
        email : false,
        replaceFn : function(linker, match) {
            if (!match.protocolUrlMatch) {
                //Prevent matching of non-explicit urls.
                //i.e. foo.id won't match but http://foo.id will
                return false;
            }
        }
    });

    var BILLBOARD_SIZE = 32;

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
            if ((new Uri(url)).scheme) {
                url = proxy.getURL(url);
            }
        }
        return url;
    }

    function createId(node) {
        var id = queryStringAttribute(node, 'id');
        return defined(id) ? id : createGuid();
    }

    function readCoordinate(element, altitudeMode) {
        var digits = element.textContent.trim().split(/[\s,\n]+/g);

        //This shouldn't happen here.
        var height = defined(digits[2]) ? parseFloat(digits[2]) : 0;
        if (altitudeMode === 'absolute') {
            //TODO
        } else if (altitudeMode === 'relativeToGround') {
            //TODO
        } else if (!defined(altitudeMode) || altitudeMode === 'clampToGround') {
            //TODO: clamp on terrain
            height = 0;
        } else {
            window.console.log('Unknown altitudeMode: ' + altitudeMode);
        }

        Cartographic.fromDegrees(digits[0], digits[1], height, scratchCartographic);
        return Ellipsoid.WGS84.cartographicToCartesian(scratchCartographic);
    }

    function isExtrudable(altitudeMode) {
        return altitudeMode === 'absolute' || altitudeMode === 'relativeToGround' || altitudeMode === 'relativeToSeaFloor';
    }

    function readCoordinates(element) {
        if(!defined(element)){
            return undefined;
        }
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

    function queryAttributeValue(node, attributeName) {
        if (!defined(node)) {
            return undefined;
        }
        var attributes = node.attributes;
        var length = attributes.length;
        for (var q = 0; q < length; q++) {
            var child = attributes[q];
            if (child.name === attributeName) {
                return child;
            }
        }
        return undefined;
    }

    function queryNumericAttribute(node, attributeName) {
        var resultNode = queryAttributeValue(node, attributeName);
        if (defined(resultNode)) {
            var result = parseFloat(resultNode.value);
            return !isNaN(result) ? result : undefined;
        }
        return undefined;
    }

    function queryStringAttribute(node, attributeName) {
        var result = queryAttributeValue(node, attributeName);
        if (defined(result)) {
            return result.value;
        }
        return undefined;
    }

    function queryFirstNode(node, tagName, namespace) {
        if (!defined(node)) {
            return undefined;
        }
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
        if (!defined(node)) {
            return undefined;
        }
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
        if (!defined(node)) {
            return [];
        }
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
        return defined(result) ? result.textContent === '1' : undefined;
    }

    function resolveHref(href, dataSource, sourceUri, uriResolver) {
        if (!defined(href)) {
            return undefined;
        }
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
            return undefined;
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

    function processTimeSpan(featureNode) {
        var node = queryFirstNode(featureNode, 'TimeSpan', namespaces.kml);
        if (!defined(node)) {
            return undefined;
        }
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

    function createDefaultBillboard(dataSource) {
        var billboard = new BillboardGraphics();
        billboard.width = BILLBOARD_SIZE;
        billboard.height = BILLBOARD_SIZE;
        billboard.scaleByDistance = new NearFarScalar(2414016, 1.0, 1.6093e+7, 0.1);
        return billboard;
    }

    function createDefaultLabel() {
        var label = new LabelGraphics();
        label.translucencyByDistance = new NearFarScalar(1500000, 1.0, 3400000, 0.0);
        label.pixelOffset = new Cartesian2(0, -16);
        label.verticalOrigin = VerticalOrigin.BOTTOM;
        label.font = '16pt sans-serif';
        label.style = LabelStyle.FILL_AND_OUTLINE;
        return label;
    }

    function processBillboardIcon(dataSource, node, targetEntity, sourceUri, uriResolver) {
        //Map style to billboard properties
        var scale = queryNumericValue(node, 'scale', namespaces.kml);
        var heading = queryNumericValue(node, 'heading', namespaces.kml);
        var color = queryColorValue(node, 'color', namespaces.kml);

        var iconNode = queryFirstNode(node, 'Icon', namespaces.kml);
        var href = queryStringValue(iconNode, 'href', namespaces.kml);
        var icon = resolveHref(href, dataSource, sourceUri, uriResolver);
        var x = queryNumericValue(iconNode, 'x', namespaces.gx);
        var y = queryNumericValue(iconNode, 'y', namespaces.gx);
        var w = queryNumericValue(iconNode, 'w', namespaces.gx);
        var h = queryNumericValue(iconNode, 'h', namespaces.gx);

        var hotSpotNode = queryFirstNode(node, 'hotSpot', namespaces.kml);
        var hotSpotX = queryNumericAttribute(hotSpotNode, 'x');
        var hotSpotY = queryNumericAttribute(hotSpotNode, 'y');
        var hotSpotXUnit = queryStringAttribute(hotSpotNode, 'xunits');
        var hotSpotYUnit = queryStringAttribute(hotSpotNode, 'yunits');

        var billboard = targetEntity.billboard;
        if (!defined(billboard)) {
            billboard = createDefaultBillboard(dataSource);
            targetEntity.billboard = billboard;
        }

        billboard.image = icon;
        billboard.scale = scale;
        billboard.color = color;

        if (defined(x) || defined(y) || defined(w) || defined(h)) {
            billboard.imageSubRegion = new BoundingRectangle(x, y, w, h);
        }

        //GE treats a heading of zero as no heading
        //Yes, this means it's impossible to actually point north in KML
        if (defined(heading) && heading !== 0) {
            billboard.rotation = CesiumMath.toRadians(-heading);
            billboard.alignedAxis = Cartesian3.UNIT_Z;
        }

        //Hotpot is the KML equivalent of pixel offset
        //The hotspot origin is the lower left, but we leave
        //our billboard origin at the center and simply
        //modify the pixel offset to take this into account
        scale = defaultValue(scale, 1.0);

        var xOffset;
        var yOffset;
        if (defined(hotSpotX)) {
            if (hotSpotXUnit === 'pixels') {
                xOffset = -hotSpotX * scale;
            } else if (hotSpotXUnit === 'insetPixels') {
                xOffset = (hotSpotX - BILLBOARD_SIZE) * scale;
            } else if (hotSpotXUnit === 'fraction') {
                xOffset = -BILLBOARD_SIZE * scale * hotSpotX;
            }
            xOffset += BILLBOARD_SIZE * 0.5 * scale;
        }

        if (defined(hotSpotY)) {
            if (hotSpotYUnit === 'pixels') {
                yOffset = hotSpotY;
            } else if (hotSpotYUnit === 'insetPixels') {
                yOffset = -hotSpotY;
            } else if (hotSpotYUnit === 'fraction') {
                yOffset = hotSpotY * BILLBOARD_SIZE;
            }
            yOffset -= BILLBOARD_SIZE * 0.5 * scale;
        }

        if (defined(xOffset) || defined(yOffset)) {
            billboard.pixelOffset = new Cartesian2(xOffset, yOffset);
        }
    }

    function applyStyle(dataSource, styleNode, targetEntity, sourceUri, uriResolver) {
        for (var i = 0, len = styleNode.childNodes.length; i < len; i++) {
            var node = styleNode.childNodes.item(i);
            var material;
            if (node.nodeName === 'IconStyle') {
                processBillboardIcon(dataSource, node, targetEntity, sourceUri, uriResolver);
            } else if (node.nodeName === 'LabelStyle') {
                var label = targetEntity.label;
                if (!defined(label)) {
                    label = createDefaultLabel();
                    targetEntity.label = label;
                }
                label.scale = queryNumericValue(node, 'scale', namespaces.kml);
                label.fillColor = queryColorValue(node, 'color', namespaces.kml);
                label.text = targetEntity.name;
            } else if (node.nodeName === 'LineStyle') {
                var polyline = targetEntity.polyline;
                if (!defined(polyline)) {
                    polyline = new PolylineGraphics();
                    targetEntity.polyline = polyline;
                }
                polyline.width = queryNumericValue(node, 'width', namespaces.kml);
                polyline.material = queryColorValue(node, 'color', namespaces.kml);
            } else if (node.nodeName === 'PolyStyle') {
                var polygon = targetEntity.polygon;
                if (!defined(polygon)) {
                    polygon = new PolygonGraphics();
                    targetEntity.polygon = polygon;
                }
                polygon.material = queryColorValue(node, 'color', namespaces.kml);
                polygon.fill = queryBooleanValue(node, 'fill', namespaces.kml);
                polygon.outline = queryBooleanValue(node, 'outline', namespaces.kml);
            } else if (node.nodeName === 'BalloonStyle') {
                var bgColor = queryColorValue(node, 'bgColor', namespaces.kml);
                var textColor = queryColorValue(node, 'textColor', namespaces.kml);
                var text = queryStringValue(node, 'text', namespaces.kml);

                //This is purely an internal property used in style processing,
                //it never ends up on the final entity.
                targetEntity.addProperty('balloonStyle');
                targetEntity.balloonStyle = {
                    bgColor : bgColor,
                    textColor : textColor,
                    text : text
                };
            }
        }
    }

    //Processes and merges any inline styles for the provided node into the provided entity.
    function computeFinalStyle(entity, dataSource, placeMark, styleCollection, sourceUri, uriResolver) {
        var result = new Entity();

        var inlineStyles = queryChildNodes(placeMark, 'Style', namespaces.kml);
        var inlineStylesLength = inlineStyles.length;
        if (inlineStylesLength > 0) {
            //Google earth seems to always use the last inline style only.
            applyStyle(dataSource, inlineStyles[inlineStylesLength - 1], result, sourceUri, uriResolver);
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
        if (defined(styleNodes)) {
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
                        styleEntity = new Entity({
                            id : id
                        });
                        styleCollection.add(styleEntity);
                        applyStyle(dataSource, node, styleEntity, sourceUri, uriResolver);
                    }
                }
            }
        }

        var styleMaps = queryNodes(kml, 'StyleMap', namespaces.kml);
        if (defined(styleMaps)) {
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

    function createDropLine(dataSource, entity, styleEntity) {
        var entityPosition = new ReferenceProperty(dataSource._entityCollection, entity.id, ['position']);
        var surfacePosition = new SurfacePositionProperty(entity.position, Ellipsoid.WGS84);
        entity.polyline = defined(styleEntity.polyline) ? styleEntity.polyline.clone() : new PolylineGraphics();
        entity.polyline.positions = new PositionPropertyArray([entityPosition, surfacePosition]);
    }

    function processPoint(dataSource, geometryNode, entity, styleEntity) {
        var coordinatesNode = queryFirstNode(geometryNode, 'coordinates', namespaces.kml);
        var altitudeMode = queryStringValue(geometryNode, 'altitudeMode', namespaces.kml);
        var extrude = queryBooleanValue(geometryNode, 'extrude', namespaces.kml);

        var position = readCoordinate(coordinatesNode, altitudeMode);
        entity.position = position;
        entity.billboard = styleEntity.billboard;

        if (extrude && isExtrudable(altitudeMode) && defined(position)) {
            createDropLine(dataSource, entity, styleEntity);
        }
    }

    function processLineStringOrLinearRing(dataSource, geometryNode, entity, styleEntity) {
        var coordinatesNode = queryFirstNode(geometryNode, 'coordinates', namespaces.kml);
        var altitudeMode = queryStringValue(geometryNode, 'altitudeMode', namespaces.kml);
        var extrude = queryBooleanValue(geometryNode, 'extrude', namespaces.kml);
        var tessellate = queryBooleanValue(geometryNode, 'tessellate', namespaces.kml);
        var canExtrude = isExtrudable(altitudeMode);

        var coordinates = readCoordinates(coordinatesNode);
        var polyline = styleEntity.polyline;
        if (extrude && canExtrude) {
            var wall = new WallGraphics();
            entity.wall = wall;
            wall.positions = coordinates;
            var polygon = styleEntity.polygon;

            if (defined(polyline)) {
                wall.material = polygon.material;
                wall.outline = true;
                wall.outlineColor = polyline.material.color;
                wall.outlineWidth = polyline.width;
            }
        } else {
            polyline = defined(polyline) ? polyline.clone() : new PolylineGraphics();
            entity.polyline = polyline;
            polyline.positions = coordinates;
            polyline.followSurface = tessellate && canExtrude;
        }
    }

    function processPolygon(dataSource, geometryNode, entity, styleEntity) {
        var outerBoundaryIsNode = queryFirstNode(geometryNode, 'outerBoundaryIs', namespaces.kml);
        var linearRingNode = queryFirstNode(outerBoundaryIsNode, 'LinearRing', namespaces.kml);
        var coordinatesNode = queryFirstNode(linearRingNode, 'coordinates', namespaces.kml);
        var coordinates = readCoordinates(coordinatesNode);
        var extrude = queryBooleanValue(geometryNode, 'extrude', namespaces.kml);
        var altitudeMode = queryStringValue(geometryNode, 'altitudeMode', namespaces.kml);
        var canExtrude = isExtrudable(altitudeMode);

        var polyline = styleEntity.polyline;
        var polygon = defined(styleEntity.polygon) ? styleEntity.polygon.clone() : new PolygonGraphics();
        polygon.outline = true;
        if (defined(polyline)) {
            if (defined(polyline.material)) {
                polygon.outlineColor = polyline.material.color;
            }
            polygon.outlineWidth = polyline.width;
        }
        entity.polygon = polygon;

        if (canExtrude) {
            if (defined(altitudeMode)) {
                polygon.perPositionHeight = true;
            }

            if (extrude) {
                polygon.extrudedHeight = 0;
            }
        }

        if (defined(coordinates)) {
            var hierarchy = new PolygonHierarchy(coordinates);
            var innerBoundaryIsNodes = queryChildNodes(geometryNode, 'innerBoundaryIs', namespaces.kml);
            for (var j = 0; j < innerBoundaryIsNodes.length; j++) {
                linearRingNode = queryChildNodes(innerBoundaryIsNodes[j], 'LinearRing', namespaces.kml);
                for (var k = 0; k < linearRingNode.length; k++) {
                    coordinatesNode = queryFirstNode(linearRingNode[k], 'coordinates', namespaces.kml);
                    coordinates = readCoordinates(coordinatesNode);
                    if (defined(coordinates)) {
                        hierarchy.holes.push(new PolygonHierarchy(coordinates));
                    }
                }
            }
            polygon.hierarchy = hierarchy;
        }
    }

    function processTrack(dataSource, geometryNode, entity, styleEntity) {
        var altitudeMode = queryStringValue(geometryNode, 'altitudeMode', namespaces.kml);
        var coordNodes = queryChildNodes(geometryNode, 'coord', namespaces.gx);
        var timeNodes = queryChildNodes(geometryNode, 'when', namespaces.kml);
        var extrude = queryBooleanValue(geometryNode, 'extrude', namespaces.kml);
        var canExtrude = isExtrudable(altitudeMode);

        if (coordNodes.length !== timeNodes.length) {
            throw new RuntimeError();
        }

        if (coordNodes.length > 0) {
            var coordinates = new Array(coordNodes.length);
            var times = new Array(timeNodes.length);
            for (var i = 0; i < times.length; i++) {
                coordinates[i] = readCoordinate(coordNodes[i], altitudeMode);
                times[i] = JulianDate.fromIso8601(timeNodes[i].textContent);
            }
            var property = new SampledPositionProperty();
            property.addSamples(times, coordinates);
            entity.position = property;
            entity.billboard = styleEntity.billboard;
            entity.availability = new TimeIntervalCollection();
            entity.availability.addInterval(new TimeInterval({
                start : times[0],
                stop : times[times.length - 1]
            }));

            if (canExtrude && extrude) {
                createDropLine(dataSource, entity, styleEntity);
            }
        }
    }

    function processMultiTrack(dataSource, geometryNode, entity, styleEntity) {
        var trackNodes = queryChildNodes(geometryNode, 'Track', namespaces.gx);
        var altitudeMode = queryStringValue(geometryNode, 'altitudeMode', namespaces.kml);
        var interpolate = queryBooleanValue(geometryNode, 'interpolate', namespaces.gx);
        var canExtrude = isExtrudable(altitudeMode);
        var extrude = queryBooleanValue(geometryNode, 'extrude', namespaces.kml);

        var times;
        var availability = new TimeIntervalCollection();
        var property = interpolate ? new SampledPositionProperty() : new CompositeProperty();
        entity.position = property;
        for (var i = 0, len = trackNodes.length; i < len; i++) {
            var trackNode = trackNodes[i];
            var timeNodes = queryChildNodes(trackNode, 'when', namespaces.kml);
            var coordNodes = queryChildNodes(trackNode, 'coord', namespaces.gx);

            if (coordNodes.length !== timeNodes.length) {
                throw new RuntimeError();
            }

            if (coordNodes.length > 0) {
                var coordinates = new Array(coordNodes.length);
                times = new Array(timeNodes.length);
                for (var x = 0; x < times.length; x++) {
                    coordinates[x] = readCoordinate(coordNodes[x], altitudeMode);
                    times[x] = JulianDate.fromIso8601(timeNodes[x].textContent);
                }
                if (interpolate) {
                    property.addSamples(times, coordinates);
                } else {
                    var data = new SampledPositionProperty();
                    property.addSamples(times, coordinates);
                    property.intervals.addInteval({
                        start : times[0],
                        stop : times[times.length - 1],
                        data : property
                    });
                    availability.addInterval({
                        start : times[0],
                        stop : times[times.length - 1]
                    });
                }
            }
        }

        if (interpolate) {
            times = property._times;
            availability.addInterval({
                start : times[0],
                stop : times[times.length - 1]
            });
        }

        if (defined(entity.availability)) {
            entity.availability = entity.availability.intersect(availability);
        } else {
            entity.availability = availability;
        }

        entity.billboard = styleEntity.billboard;
        if (canExtrude && extrude) {
            createDropLine(dataSource, entity, styleEntity);
        }
    }

    function processMultiGeometry(dataSource, geometryNode, entity, styleEntity) {
        var childNodes = geometryNode.childNodes;
        for (var i = 0, len = childNodes.length; i < len; i++) {
            var childNode = childNodes.item(i);
            var geometryProcessor = geometryTypes[childNode.localName];
            if (defined(geometryProcessor)) {
                var childNodeId = createId(childNode);
                var childEntity = dataSource._entityCollection.getOrCreateEntity(childNodeId);
                if (!defined(entity.kml)) {
                    entity.addProperty('kml');
                    entity.kml = {};
                }
                childEntity.parent = entity;
                childEntity.name = entity.name;
                childEntity.availability = entity.availability;
                childEntity.label = entity.label;
                childEntity.description = entity.description;
                geometryProcessor(dataSource, childNode, childEntity, styleEntity);
            }
        }
    }

    function processExtendedData(node, entity) {
        var extendedDataNode = queryFirstNode(node, 'ExtendedData', namespaces.kml);

        if (!defined(extendedDataNode)) {
            return undefined;
        }

        var result = {};
        var dataNodes = queryChildNodes(extendedDataNode, 'Data', namespaces.kml);
        if (defined(dataNodes)) {
            var length = dataNodes.length;
            for (var i = 0; i < length; i++) {
                var dataNode = dataNodes[i];
                var name = queryStringAttribute(dataNode, 'name');
                if (defined(name)) {
                    result[name] = {
                        displayName : queryStringValue(dataNode, 'displayName', namespaces.kml),
                        value : queryStringValue(dataNode, 'value', namespaces.kml)
                    };
                }
            }
        }
        entity.kml.extendedData = result;
    }

    function processDescription(node, entity, styleEntity) {
        var kmlData = entity.kml;
        var extendedData = kmlData.extendedData;
        var description = queryStringValue(node, 'description', namespaces.kml);

        var balloonStyle = defaultValue(entity.balloonStyle, styleEntity.balloonStyle);

        var background = Color.WHITE;
        var foreground = Color.BLACK;
        var text = description;

        if (defined(balloonStyle)) {
            background = defaultValue(balloonStyle.bgColor, Color.WHITE);
            foreground = defaultValue(balloonStyle.textColor, Color.BLACK);
            text = defaultValue(balloonStyle.text, description);
        }

        if (defined(text) || defined(extendedData)) {
            var value;

            var tmp = '<div style="';
            tmp += 'overflow-wrap:break-word;';
            tmp += 'background-color:' + background.toCssColorString() + ';';
            tmp += 'color:' + foreground.toCssColorString() + ';';
            tmp += '">';

            if (defined(text)) {
                text = text.replace('$[name]', defaultValue(entity.name, ''));
                text = text.replace('$[description]', defaultValue(description, ''));
                text = text.replace('$[address]', defaultValue(kmlData.address, ''));
                text = text.replace('$[Snippet]', defaultValue(kmlData.Snippet, ''));
                text = text.replace('$[id]', entity.id);

                //While not explicitly defined by the OGC spec, in Google Earth
                //The appearance of geDirections adds the directions to/from links
                //We simply replace this string with nothing.
                text = text.replace('$[geDirections]', '');

                if (defined(extendedData)) {
                    var matches = text.match(/\$\[.+?\]/g);
                    if (matches !== null) {
                        for (var i = 0; i < matches.length; i++) {
                            var token = matches[i];
                            var propertyName = token.substr(2, token.length - 3);
                            var isDisplayName = /\/displayName$/.test(propertyName);
                            propertyName = propertyName.replace(/\/displayName$/, '');

                            value = extendedData[propertyName];
                            if (defined(value)) {
                                value = isDisplayName ? value.displayName : value.value;
                            }
                            if (defined(value)) {
                                text = text.replace(token, defaultValue(value, ''));
                            }
                        }
                    }
                }
                tmp = tmp + text + '</div>';
            } else {
                //If no description exists, build a table out of the extended data
                tmp += '<table class="cesium-infoBox-defaultTable"><tbody>';
                for ( var key in extendedData) {
                    if (extendedData.hasOwnProperty(key)) {
                        value = extendedData[key];
                        tmp += '<tr><th>' + defaultValue(value.displayName, key) + '</th><td>' + defaultValue(value.value, '') + '</td></tr>';
                    }
                }
                tmp += '</tbody></table></div>';
            }

            //Turns non-explicit links into clickable links.
            tmp = autoLinker.link(tmp);

            //Use a temporary div to manipulate the links
            //so that they open in a new window.
            var div = document.createElement('div');
            div.innerHTML = tmp;
            var links = div.querySelectorAll('a');
            for (var q = 0; q < links.length; q++) {
                links[q].setAttribute('target', '_blank');
            }

            //Set the final HTML as the description.
            entity.description = div.innerHTML;
        }
    }

    function processFeature(dataSource, parent, featureNode, entityCollection, styleCollection, sourceUri, uriResolver) {
        var id = createId(featureNode);
        var entity = entityCollection.getOrCreateEntity(id);
        var kmlData = {};
        if (!defined(entity.kml)) {
            entity.addProperty('kml');
            entity.kml = kmlData;
        }

        var styleEntity = computeFinalStyle(entity, dataSource, featureNode, styleCollection, sourceUri, uriResolver);

        var name = queryStringValue(featureNode, 'name', namespaces.kml);
        entity.name = name;
        entity.parent = parent;
        entity.availability = processTimeSpan(featureNode);

        //var visibility = queryBooleanValue(featureNode, 'visibility', namespaces.kml);
        //entity.uiShow = defaultValue(visibility, true);
        //var open = queryBooleanValue(featureNode, 'open', namespaces.kml);

        var authorNode = queryFirstNode(featureNode, 'author', namespaces.atom);
        kmlData.author = {
            name : queryStringValue(authorNode, 'name', namespaces.atom),
            uri : queryStringValue(authorNode, 'uri', namespaces.atom),
            email : queryStringValue(authorNode, 'email', namespaces.atom)
        };

        var linkNode = queryFirstNode(featureNode, 'link', namespaces.atom);
        kmlData.link = {
            href : queryStringAttribute(linkNode, 'href'),
            hreflang : queryStringAttribute(linkNode, 'hreflang'),
            rel : queryStringAttribute(linkNode, 'rel'),
            type : queryStringAttribute(linkNode, 'type'),
            title : queryStringAttribute(linkNode, 'title'),
            length : queryStringAttribute(linkNode, 'length')
        };

        kmlData.address = queryStringValue(featureNode, 'address', namespaces.kml);
        kmlData.phoneNumber = queryStringValue(featureNode, 'phoneNumber', namespaces.kml);
        kmlData.Snippet = queryStringValue(featureNode, 'Snippet', namespaces.kml);

        processExtendedData(featureNode, entity);
        processDescription(featureNode, entity, styleEntity);

        return {
            entity : entity,
            styleEntity : styleEntity
        };
    }

    var geometryTypes = {
        Point : processPoint,
        LineString : processLineStringOrLinearRing,
        LinearRing : processLineStringOrLinearRing,
        Polygon : processPolygon,
        Track : processTrack,
        MultiTrack : processMultiTrack,
        MultiGeometry : processMultiGeometry
    };

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
        var r = processFeature(dataSource, parent, node, entityCollection, styleCollection, sourceUri, uriResolver);
        processDocument(dataSource, r.entity, node, entityCollection, styleCollection, sourceUri, uriResolver);
    }

    function processPlacemark(dataSource, parent, placemark, entityCollection, styleCollection, sourceUri, uriResolver) {
        var r = processFeature(dataSource, parent, placemark, entityCollection, styleCollection, sourceUri, uriResolver);
        var entity = r.entity;
        var styleEntity = r.styleEntity;

        var hasGeometry = false;
        var childNodes = placemark.childNodes;
        for (var i = 0, len = childNodes.length; i < len && !hasGeometry; i++) {
            var childNode = childNodes.item(i);
            var geometryProcessor = geometryTypes[childNode.localName];
            if (defined(geometryProcessor)) {
                geometryProcessor(dataSource, childNode, entity, styleEntity);
                hasGeometry = true;
            }
        }
        if (!hasGeometry) {
            entity.merge(styleEntity);
        } else if (defined(entity.position)) {
            //TODO Should this all really happen here?
            if (!defined(entity.billboard)) {
                entity.billboard = defined(styleEntity.billboard) ? styleEntity.billboard.clone() : createDefaultBillboard();
            }

            if (!defined(entity.billboard.image)) {
                entity.billboard.image = dataSource._pinBuilder.fromColor(Color.YELLOW, 64);
            }

            var label = entity.label;
            if (!defined(label)) {
                label = defined(styleEntity.label) ? styleEntity.label.clone() : createDefaultLabel();
                entity.label = label;
            }

            if (defined(entity.name)) {
                label.text = entity.name;
            }
        }
    }

    function processGroundOverlay(dataSource, parent, groundOverlay, entityCollection, styleCollection, sourceUri, uriResolver) {
        var r = processFeature(dataSource, parent, groundOverlay, entityCollection, styleCollection, sourceUri, uriResolver);
        var entity = r.entity;
        var styleEntity = r.stylEntity;

        var geometry;
        var isLatLonQuad = false;

        var positions = readCoordinates(queryFirstNode(groundOverlay, 'LatLonQuad', namespaces.gx));
        if (defined(positions)) {
            geometry = new PolygonGraphics();
            geometry.hierarchy = new PolygonHierarchy(positions);
            entity.polygon = geometry;
            isLatLonQuad = true;
        } else {
            geometry = new RectangleGraphics();
            entity.rectangle = geometry;

            var latLonBox = queryFirstNode(groundOverlay, 'LatLonBox', namespaces.kml);
            if (defined(latLonBox)) {
                var west = queryNumericValue(latLonBox, 'west', namespaces.kml);
                var south = queryNumericValue(latLonBox, 'south', namespaces.kml);
                var east = queryNumericValue(latLonBox, 'east', namespaces.kml);
                var north = queryNumericValue(latLonBox, 'north', namespaces.kml);

                if (defined(west)) {
                    west = CesiumMath.convertLongitudeRange(CesiumMath.toRadians(west));
                }
                if (defined(south)) {
                    south = CesiumMath.negativePiToPi(CesiumMath.toRadians(south));
                }
                if (defined(east)) {
                    east = CesiumMath.convertLongitudeRange(CesiumMath.toRadians(east));
                }
                if (defined(north)) {
                    north = CesiumMath.negativePiToPi(CesiumMath.toRadians(north));
                }
                geometry.coordinates = new Rectangle(west, south, east, north);

                var rotation = queryNumericValue(latLonBox, 'rotation', namespaces.kml);
                if (defined(rotation)) {
                    geometry.rotation = CesiumMath.toRadians(rotation);
                }
            }
        }

        var material;
        var iconNode = queryFirstNode(groundOverlay, 'Icon', namespaces.kml);
        var href = queryStringValue(iconNode, 'href', namespaces.kml);
        if (defined(href)) {
            if (isLatLonQuad) {
                window.console.log('gx:LatLonQuad Icon does not support texture projection.');
            }
            geometry.material = resolveHref(href, dataSource, sourceUri, uriResolver);
        } else {
            geometry.material = queryColorValue(groundOverlay, 'color', namespaces.kml);
        }

        var altitudeMode = queryStringValue(groundOverlay, 'altitudeMode', namespaces.kml);

        var altitude;
        if (defined(altitudeMode)) {
            if (altitudeMode === 'absolute') {
                //TODO absolute means relative to sea level, not the ellipsoid.
                geometry.height = queryNumericValue(groundOverlay, 'altitude', namespaces.kml);
            } else if (altitudeMode !== 'clampToGround') {
                window.console.log('Unknown altitudeMode: ' + altitudeMode);
            }
        } else {
            altitudeMode = queryStringValue(groundOverlay, 'altitudeMode', namespaces.gx);
            if (altitudeMode === 'relativeToSeaFloor') {
                window.console.log('altitudeMode relativeToSeaFloor is currently not supported');
            } else if (altitudeMode === 'clampToSeaFloor') {
                window.console.log('altitudeMode clampToSeaFloor is currently not supported');
            } else if (defined(altitudeMode)) {
                window.console.log('Unknown altitudeMode: ' + altitudeMode);
            }
        }
    }

    function processUnsupported(dataSource, parent, node, entityCollection, styleCollection, sourceUri, uriResolver) {
        window.console.log('Unsupported feature: ' + node.nodeName);
    }

    function processNetworkLink(dataSource, parent, node, entityCollection, styleCollection, sourceUri, uriResolver) {
        var r = processFeature(dataSource, parent, node, entityCollection, styleCollection, sourceUri, uriResolver);
        var networkEntity = r.entity;

        var link = queryFirstNode(node, 'Link', namespaces.kml);
        if (defined(link)) {
            var linkUrl = queryStringValue(link, 'href', namespaces.kml);
            if (defined(linkUrl)) {
                var networkLinkSource = new KmlDataSource(dataSource._proxy);
                var promise = when(networkLinkSource.loadUrl(linkUrl), function() {
                    var entities = networkLinkSource.entities.entities;
                    for (var i = 0; i < entities.length; i++) {
                        dataSource._entityCollection.suspendEvents();
                        entities[i].parent = networkEntity;
                        dataSource._entityCollection.add(entities[i]);
                        dataSource._entityCollection.resumeEvents();
                    }
                });

                dataSource._promises.push(promise);
            }
        }
    }

    var featureTypes = {
        Document : processDocument,
        Folder : processFolder,
        Placemark : processPlacemark,
        NetworkLink : processNetworkLink,
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
        dataSource._promises = [];

        var docElement = queryFirstNode(kml.documentElement, 'Document', namespaces.kml);
        var name = queryStringValue(docElement, 'name', namespaces.kml);
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
            var element = kml.documentElement;
            if (element.nodeName === 'kml') {
                element = element.firstElementChild;
            }
            processFeatureNode(dataSource, element, undefined, entityCollection, styleCollection, sourceUri, uriResolver);

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

            when.all(dataSource._promises, function(){
                DataSource.setLoading(dataSource, false);
            });

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
        this._promises = [];
    };

    /**
     * Creates a new instance and asynchronously loads the KML or KMZ file at the provided url.
     *
     * @param {string} url The url to be processed.
     *
     * @returns {KmlDataSource} A new instance set to load the specified url.
     */
    KmlDataSource.fromUrl = function(url, proxy) {
        var result = new KmlDataSource(proxy);
        result.loadUrl(url);
        return result;
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
     * @param {String} url The url to be processed.
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