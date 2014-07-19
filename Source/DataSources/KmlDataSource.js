/*global define*/
define(['../Core/createGuid',
        '../Core/defined',
        '../Core/Cartographic',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/ClockRange',
        '../Core/ClockStep',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/RuntimeError',
        '../Core/Ellipsoid',
        '../Core/Event',
        '../Core/getFilenameFromUri',
        '../Core/Iso8601',
        '../Core/JulianDate',
        '../Core/Math',
        '../Core/NearFarScalar',
        '../Core/PolygonPipeline',
        '../Core/Rectangle',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Core/loadBlob',
        '../Core/loadXML',
        './ConstantProperty',
        './ConstantPositionProperty',
        './ColorMaterialProperty',
        './SampledPositionProperty',
        './TimeIntervalCollectionProperty',
        '../Scene/LabelStyle',
        '../Scene/VerticalOrigin',
        './CompositeEntityCollection',
        './DataSourceClock',
        './Entity',
        './EntityCollection',
        './PathGraphics',
        './PolylineGraphics',
        './PolygonGraphics',
        './RectangleGraphics',
        './LabelGraphics',
        './BillboardGraphics',
        './ImageMaterialProperty',
        './PolylineOutlineMaterialProperty',
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        '../ThirdParty/zip'
    ], function(
        createGuid,
        defined,
        Cartographic,
        Cartesian2,
        Cartesian3,
        Color,
        ClockRange,
        ClockStep,
        defineProperties,
        DeveloperError,
        RuntimeError,
        Ellipsoid,
        Event,
        getFilenameFromUri,
        Iso8601,
        JulianDate,
        CesiumMath,
        NearFarScalar,
        PolygonPipeline,
        Rectangle,
        TimeInterval,
        TimeIntervalCollection,
        loadBlob,
        loadXML,
        ConstantProperty,
        ConstantPositionProperty,
        ColorMaterialProperty,
        SampledPositionProperty,
        TimeIntervalCollectionProperty,
        LabelStyle,
        VerticalOrigin,
        CompositeEntityCollection,
        DataSourceClock,
        Entity,
        EntityCollection,
        PathGraphics,
        PolylineGraphics,
        PolygonGraphics,
        RectangleGraphics,
        LabelGraphics,
        BillboardGraphics,
        ImageMaterialProperty,
        PolylineOutlineMaterialProperty,
        Uri,
        when,
        zip) {
    "use strict";

    var scratchCartographic = new Cartographic();
    var scratchCartesian = new Cartesian3();

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

    function getNode(node, tagName) {
        return node.getElementsByTagName(tagName)[0];
    }

    function getNumericValue(node, tagName) {
        var element = node.getElementsByTagName(tagName)[0];
        return defined(element) ? parseFloat(element.textContent) : undefined;
    }

    function getStringValue(node, tagName) {
        var element = node.getElementsByTagName(tagName)[0];
        return defined(element) ? element.textContent : undefined;
    }

    function getBooleanValue(node, tagName) {
        var element = node.getElementsByTagName(tagName)[0];
        return defined(element) ? element.textContent === '1' : undefined;
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

    function processPlacemark(dataSource, parent, placemark, entityCollection, styleCollection, sourceUri, uriResolver) {
        var id = createId(placemark.id);
        var entity = entityCollection.getOrCreateEntity(id);

        if (defined(parent)) {
            entity.parent = parent;
        }

        var styleEntity = processInlineStyles(dataSource, placemark, styleCollection, sourceUri, uriResolver);

        var name = getStringValue(placemark, 'name');
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
        var visibility = getBooleanValue(placemark, 'visibility');
        entity.uiShow = defined(visibility) ? visibility : true;

        for (var i = 0, len = nodes.length; i < len; i++) {
            var node = nodes.item(i);
            var nodeName = node.nodeName;
            if (nodeName === 'TimeSpan') {
                entity.availability = processTimeSpan(node);
            } else if (nodeName === 'description') {
                entity.description = new ConstantProperty(node.textContent);
            } else if (featureTypes.hasOwnProperty(nodeName)) {
                foundGeometry = true;
                mergeStyles(nodeName, styleEntity, entity);
                featureTypes[nodeName](dataSource, entity, placemark, node, entityCollection);
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
                billboard.image = new ConstantProperty('http://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png');
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

        entity.name = getStringValue(groundOverlay, 'name');
        var nodes = groundOverlay.childNodes;

        var timeSpan = getNode(groundOverlay, 'TimeSpan');
        if (defined(timeSpan)) {
            entity.availability = processTimeSpan(timeSpan);
        }

        var description = getStringValue(groundOverlay, 'description');
        entity.description = defined(description) ? new ConstantProperty(description) : undefined;

        var visibility = getBooleanValue(groundOverlay, 'visibility');
        entity.uiShow = defined(visibility) ? visibility : true;

        var latLonBox = getNode(groundOverlay, 'LatLonBox');
        if (defined(latLonBox)) {
            //TODO: Apparently values beyond the global extent are valid
            //and should wrap around.
            var west = Math.max(-180, Math.min(180, getNumericValue(latLonBox, 'west')));
            var south = Math.max(-90, Math.min(90, getNumericValue(latLonBox, 'south')));
            var east = Math.max(-180, Math.min(180, getNumericValue(latLonBox, 'east')));
            var north = Math.max(-90, Math.min(90, getNumericValue(latLonBox, 'north')));

            var cb = Ellipsoid.WGS84;

            var rectangle = entity.rectangle;
            if (!defined(rectangle)) {
                rectangle = new RectangleGraphics();
                entity.rectangle = rectangle;
            }
            var extent = Rectangle.fromDegrees(west, south, east, north);
            rectangle.coordinates = new ConstantProperty(extent);
            entity.position = new ConstantPositionProperty(Ellipsoid.WGS84.cartographicToCartesian(Rectangle.getCenter(extent, scratchCartesian), scratchCartographic));

            var material;
            var href = getStringValue(groundOverlay, 'href');
            if (defined(href)) {
                var icon = resolveHref(href, dataSource, sourceUri, uriResolver);
                material = new ImageMaterialProperty();
                material.image = new ConstantProperty(icon);
            } else {
                var color = getColorValue(groundOverlay, 'color');
                if (defined(color)) {
                    material = ColorMaterialProperty.fromColor(color);
                }
            }
            rectangle.material = material;

            var rotation = getNumericValue(latLonBox, 'rotation');
            if (defined(rotation)) {
                rectangle.rotation = new ConstantProperty(CesiumMath.toRadians(rotation));
            }

            var altitudeMode = getStringValue(groundOverlay, 'altitudeMode');
            if (defined(altitudeMode)) {
                if (altitudeMode === 'absolute') {
                    //TODO absolute means relative to sea level, not the ellipsoid.
                    var altitude = getNumericValue(groundOverlay, 'altitude');
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

    function processPoint(dataSource, entity, kml, node) {
        //TODO extrude, altitudeMode, gx:altitudeMode
        var el = node.getElementsByTagName('coordinates');

        var cartesian3 = readCoordinate(el[0], getStringValue(node, 'altitudeMode'));
        entity.position = new ConstantPositionProperty(cartesian3);

        //Anything with a position gets a billboard
        if (!defined(entity.billboard)) {
            entity.billboard = createDefaultBillboard();
        }
    }

    function processLineString(dataSource, entity, kml, node) {
        //TODO gx:altitudeOffset, extrude, tessellate, altitudeMode, gx:altitudeMode, gx:drawOrder
        var el = node.getElementsByTagName('coordinates');
        var coordinates = readCoordinates(el[0]);

        if (!defined(entity.polyline)) {
            entity.polyline = new PolylineGraphics();
        }
        entity.polyline.positions = new ConstantProperty(coordinates);
    }

    function processLinearRing(dataSource, entity, kml, node) {
        //TODO gx:altitudeOffset, extrude, tessellate, altitudeMode, altitudeModeEnum
        var el = node.getElementsByTagName('coordinates');
        var coordinates = readCoordinates(el[0]);

        //This should be a warning instead of an error.
        //if (!Cartesian3.equals(coordinates[0], coordinates[coordinates.length - 1])) {
        //    throw new RuntimeError('The first and last coordinate tuples must be the same.');
        //}

        //TODO Should we be doing this here?  If we don't, it can trigger exceptions later on, should it?
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

    function processPolygon(dataSource, entity, kml, node) {
        //TODO innerBoundaryIS, tessellate, altitudeMode

        if (!defined(entity.polygon)) {
            entity.polygon = new PolygonGraphics();
        }

        var altitudeMode = getStringValue(node, 'altitudeMode');
        var perPositionHeight = defined(altitudeMode) && (altitudeMode !== 'clampToGround') && (altitudeMode !== 'clampToSeaFloor');
        entity.polygon.perPositionHeight = new ConstantProperty(perPositionHeight);

        var extrude = getBooleanValue(node, 'extrude');
        if (defined(extrude) && extrude) {
            entity.polygon.extrudedHeight = new ConstantProperty(0);
        }

        var el = node.getElementsByTagName('outerBoundaryIs');
        var positions;
        for (var j = 0; j < el.length; j++) {
            processLinearRing(dataSource, entity, kml, el[j]);
            break;
        }
    }

    function processGxTrack(dataSource, entity, kml, node) {
        //TODO altitudeMode, gx:angles
        var altitudeMode = getStringValue(node, 'altitudeMode');
        var coordsEl = node.getElementsByTagName('coord');
        var coordinates = new Array(coordsEl.length);
        var timesEl = node.getElementsByTagName('when');
        var times = new Array(timesEl.length);
        for (var i = 0; i < times.length; i++) {
            coordinates[i] = readCoordinate(coordsEl[i], altitudeMode);
            times[i] = JulianDate.fromIso8601(timesEl[i].textContent);
        }
        var property = new SampledPositionProperty();
        property.addSamples(times, coordinates);
        entity.position = property;
    }

    function processGxMultiTrack(dataSource, entity, kml, node, entityCollection) {
        //TODO gx:interpolate, altitudeMode

        var childNodes = node.childNodes;
        for (var i = 0, len = childNodes.length; i < len; i++) {
            var childNode = childNodes.item(i);
            var childNodeName = childNode.nodeName;

            if (featureTypes.hasOwnProperty(childNodeName)) {
                var childNodeId = createId(childNode);
                var childEntity = entityCollection.getOrCreateEntity(childNodeId);
                childEntity.parent = entity;

                mergeStyles(childNodeName, entity, childEntity);

                var geometryHandler = featureTypes[childNodeName];
                geometryHandler(dataSource, childEntity, kml, childNode, entityCollection);
            }
        }
    }

    function processMultiGeometry(dataSource, entity, kml, node, entityCollection) {
        var childNodes = node.childNodes;
        for (var i = 0, len = childNodes.length; i < len; i++) {
            var childNode = childNodes.item(i);
            var childNodeName = childNode.nodeName;

            if (featureTypes.hasOwnProperty(childNodeName)) {
                var childNodeId = createId(childNode);
                var childEntity = entityCollection.getOrCreateEntity(childNodeId);
                childEntity.parent = entity;

                mergeStyles(childNodeName, entity, childEntity);

                var geometryHandler = featureTypes[childNodeName];
                geometryHandler(dataSource, childEntity, kml, childNode, entityCollection);
            }
        }
    }

    function processTimeSpan(node) {
        var result;

        var beginNode = node.getElementsByTagName('begin')[0];
        var beginDate = defined(beginNode) ? JulianDate.fromIso8601(beginNode.textContent) : undefined;

        var endNode = node.getElementsByTagName('end')[0];
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
                var scale = getNumericValue(node, 'scale');
                var color = getColorValue(node, 'color');
                var icon = resolveHref(getStringValue(node, 'href'), dataSource, sourceUri, uriResolver);

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
                var labelScale = getNumericValue(node, 'scale');
                var labelColor = getColorValue(node, 'color');

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
                var lineColor = getColorValue(node, 'color');
                var lineWidth = getNumericValue(node, 'width');
                var lineOuterColor = getColorValue(node, 'outerColor');
                var lineOuterWidth = getNumericValue(node, 'outerWidth');
                if (defined(lineOuterWidth) && (lineOuterWidth < 0 || lineOuterWidth > 1.0)) {
                    throw new RuntimeError('gx:outerWidth must be a value between 0 and 1.0');
                }

                polyline.width = defined(lineWidth) ? new ConstantProperty(Math.max(lineWidth, 1.0)) : new ConstantProperty(1.0);
                material = new PolylineOutlineMaterialProperty();
                material.color = defined(lineColor) ? new ConstantProperty(lineColor) : new ConstantProperty(new Color(1, 1, 1, 1));
                material.outlineColor = defined(lineOuterColor) ? new ConstantProperty(lineOuterColor) : new ConstantProperty(new Color(0, 0, 0, 1));
                material.outlineWidth = defined(lineOuterWidth) ? new ConstantProperty(lineOuterWidth) : new ConstantProperty(0);
                polyline.material = material;
                entity.polyline = polyline;
            } else if (node.nodeName === 'PolyStyle') {
                entity.polygon = defined(entity.polygon) ? entity.polygon : new PolygonGraphics();
                var polygonColor = getColorValue(node, 'color');
                polygonColor = defined(polygonColor) ? polygonColor : new Color(1, 1, 1, 1);
                material = new ColorMaterialProperty();
                material.color = new ConstantProperty(polygonColor);
                entity.polygon.material = material;

                var fill = getBooleanValue(node, 'fill');
                if (defined(fill)) {
                    entity.polygon.fill = new ConstantProperty(fill);
                }
                var outline = getBooleanValue(node, 'outline');
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
        case 'gx:Track':
            targetEntity.polygon = undefined;
            targetEntity.polyline = undefined;
            break;
        case 'gx:MultiTrack':
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
        var inlineStyles = placeMark.getElementsByTagName('Style');
        var inlineStylesLength = inlineStyles.length;
        if (inlineStylesLength > 0) {
            //Google earth seems to always use the last inline style only.
            processStyle(dataSource, inlineStyles.item(inlineStylesLength - 1), result, sourceUri, uriResolver);
        }

        var externalStyles = placeMark.getElementsByTagName('styleUrl');
        if (externalStyles.length > 0) {
            //Google earth seems to always use the first external style only.
            var styleEntity = styleCollection.getById(externalStyles.item(0).textContent);
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
    //their id into the rovided styleCollection.
    //Returns an array of promises that will resolve when
    //each style is loaded.
    function processStyles(dataSource, kml, styleCollection, sourceUri, isExternal, uriResolver) {
        var i;
        var id;
        var styleEntity;

        var styleNodes = kml.getElementsByTagName('Style');
        var styleNodesLength = styleNodes.length;
        for (i = styleNodesLength - 1; i >= 0; i--) {
            var node = styleNodes.item(i);
            var attributes = node.attributes;
            id = defined(attributes.id) ? attributes.id.value : undefined;
            if (defined(id)) {
                id = '#' + id;
                if (isExternal && defined(sourceUri)) {
                    id = sourceUri + id;
                }
                if (!defined(styleCollection.getById(id))) {
                    styleEntity = styleCollection.getOrCreateEntity(id);
                    processStyle(dataSource, node, styleEntity, sourceUri, uriResolver);
                }
            }
        }

        var styleMaps = kml.getElementsByTagName('StyleMap');
        var styleMapsLength = styleMaps.length;
        for (i = 0; i < styleMapsLength; i++) {
            var styleMap = styleMaps.item(i);
            id = defined(styleMap.attributes.id) ? styleMap.attributes.id.value : undefined;
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
                            styleEntity = styleCollection.getOrCreateEntity(id);
                            var base = styleCollection.getOrCreateEntity(styleUrl.textContent);
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

    function iterateNodes(dataSource, node, parent, entityCollection, styleCollection, sourceUri, uriResolver) {
        var nodeName = node.nodeName;
        if (nodeName === 'Placemark') {
            processPlacemark(dataSource, parent, node, entityCollection, styleCollection, sourceUri, uriResolver);
        } else if (nodeName === 'Folder') {
            parent = new Entity(createId(node));
            parent.name = getStringValue(node, 'name');
            entityCollection.add(parent);
        } else if (nodeName === 'GroundOverlay') {
            processGroundOverlay(dataSource, parent, node, entityCollection, styleCollection, sourceUri, uriResolver);
        } else if (nodeName === 'NetworkLink') {
            parent = new Entity(createId(node));
            parent.name = getStringValue(node, 'name');
            //            var linkUrl = getStringValue(node, 'Link').trim();
            //            var networkLinkSource = new KmlDataSource(dataSource._proxy);
            //            when(networkLinkSource.loadUrl(linkUrl), function() {
            //                dataSource._composite.addCollection(networkLinkSource.getEntityCollection(), 0);
            //            });
        }

        var childNodes = node.childNodes;
        var length = childNodes.length;
        for (var i = 0; i < length; i++) {
            iterateNodes(dataSource, childNodes[i], parent, entityCollection, styleCollection, sourceUri, uriResolver);
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

        var entityCollection = dataSource._entityCollection;
        entityCollection.suspendEvents();
        var styleCollection = new EntityCollection();

        //Since KML external styles can be asynchonous, we start off
        //my loading all styles first, before doing anything else.
        return when.all(processStyles(dataSource, kml, styleCollection, sourceUri, false, uriResolver), function() {
            iterateNodes(dataSource, kml, undefined, entityCollection, styleCollection, sourceUri, uriResolver);
            entityCollection.resumeEvents();
            dataSource._isLoading = false;
            dataSource._isLoadingEvent.raiseEvent(dataSource, false);
            dataSource._changed.raiseEvent(dataSource);
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
            // onprogress callback, currently unutilized.
        });
    }

    function loadKmz(dataSource, blob, sourceUri, deferred) {
        var uriResolver = {};
        zip.createReader(new zip.BlobReader(blob), function(reader) {
            reader.getEntries(function(entries) {
                var promises = [];
                var foundKML = false;
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    if (!entry.directory) {
                        var innerDefer = when.defer();
                        promises.push(innerDefer.promise);
                        var filename = entry.filename.toLowerCase();
                        if (!foundKML && endsWith(filename, '.kml')) {
                            //Only the first KML file found in the zip is used.
                            //https://developers.google.com/kml/documentation/kmzarchives
                            foundKML = true;
                            loadXmlFromZip(reader, entry, uriResolver, innerDefer);
                        } else {
                            loadDataUriFromZip(reader, entry, uriResolver, innerDefer);
                        }
                    }
                }

                when.all(promises, function() {
                    loadKml(dataSource, uriResolver.kml, sourceUri, uriResolver);
                    reader.close();
                    deferred.resolve(dataSource);
                });
            });
        }, function(error) {
            deferred.reject(error);
        });
    }

    function endsWith(str, suffix) {
        var strLength = str.length;
        var suffixLength = suffix.length;
        return (suffixLength < strLength) && (str.indexOf(suffix, strLength - suffixLength) !== -1);
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
        this._isLoadingEvent = new Event();
        this._clock = undefined;
        this._entityCollection = new EntityCollection();
        this._name = undefined;
        this._isLoading = false;
        this._proxy = proxy;
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
                var availability = this._entityCollection.computeAvailability();
                if (availability.equals(Iso8601.MAXIMUM_INTERVAL)) {
                    return undefined;
                }
                var clock = new DataSourceClock();
                clock.startTime = availability.start;
                clock.stopTime = availability.stop;
                clock.currentTime = availability.start;
                clock.clockRange = ClockRange.LOOP_STOP;
                clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
                clock.multiplier = Math.min(Math.max(JulianDate.secondsDifference(availability.stop, availability.start) / 60, 60), 50000000);
                return clock;
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
                return this._isLoadingEvent;
            }
        }
    });

    /**
     * Asynchronously loads the provided KML document, replacing any existing data.
     *
     * @param {Document} kml The parsed KML document to be processed.
     * @param {string} sourceUrl The url of the document which is used for resolving relative links and other KML features.
     *
     * @returns {Promise} a promise that will resolve when the KML is processed.
     */
    KmlDataSource.prototype.load = function(kml, sourceUrl) {
        if (!defined(kml)) {
            throw new DeveloperError('kml is required.');
        }

        this._entityCollection.removeAll();
        return loadKml(this, kml, sourceUrl);
    };

    /**
     * Asynchronously loads the provided KMZ Blob, replacing any existing data.
     *
     * @param {Blob} kmz The KMZ document to be processed.
     * @param {string} sourceUrl The url of the document which is used for resolving relative links and other KML features.
     *
     * @returns {Promise} a promise that will resolve when the KMZ is processed.
     */
    KmlDataSource.prototype.loadKmz = function(kmz, sourceUrl) {
        if (!defined(kmz)) {
            throw new DeveloperError('kmz is required.');
        }

        var deferred = when.defer();
        loadKmz(this, kmz, sourceUrl, deferred);
        return deferred.promise;
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

        var that = this;
        return when(loadBlob(proxyUrl(url, this._proxy)), function(blob) {
            var deferred = when.defer();

            //Get the blob "magic number" to determine if it's a zip or KML
            var slice = blob.slice(0, 4);
            var reader = new FileReader();
            reader.onload = function(e) {
                var buffer = reader.result;
                var view = new DataView(buffer);

                //If it's a zip file, treat it as a KMZ
                if (view.getUint32(0, false) === 0x504b0304) {
                    return loadKmz(that, blob, url, deferred);
                }

                //Else, read it as an XML file.
                reader = new FileReader();
                reader.addEventListener("loadend", function() {
                    var parser = new DOMParser();
                    that.load(parser.parseFromString(reader.result, 'text/xml'), url);
                    deferred.resolve();
                });
                reader.readAsText(blob);
            };
            reader.readAsArrayBuffer(slice);
            return deferred;
        }, function(error) {
            that._error.raiseEvent(that, error);
            return when.reject(error);
        });
    };

    return KmlDataSource;
});
