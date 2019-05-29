define([
    './BillboardGraphics',
    './ColorMaterialProperty',
    './CompositeMaterialProperty',
    './CompositePositionProperty',
    './GridMaterialProperty',
    './ImageMaterialProperty',
    './PolylineGlowMaterialProperty',
    './PolylineOutlineMaterialProperty',
    './SampledPositionProperty',
    './SampledProperty',
    './StripeMaterialProperty',
    './RectangleGraphics',
    '../Core/Cartesian2',
    '../Core/Cartesian3',
    '../Core/Cartographic',
    '../Core/Color',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/Ellipsoid',
    '../Core/Iso8601',
    '../Core/JulianDate',
    '../Core/Math',
    '../Core/Rectangle',
    '../Core/Resource',
    '../Scene/HeightReference',
    '../Scene/HorizontalOrigin',
    '../Scene/VerticalOrigin'
], function(
    BillboardGraphics,
    ColorMaterialProperty,
    CompositeMaterialProperty,
    CompositePositionProperty,
    GridMaterialProperty,
    ImageMaterialProperty,
    PolylineGlowMaterialProperty,
    PolylineOutlineMaterialProperty,
    SampledPositionProperty,
    SampledProperty,
    StripeMaterialProperty,
    RectangleGraphics,
    Cartesian2,
    Cartesian3,
    Cartographic,
    Color,
    defaultValue,
    defined,
    Ellipsoid,
    Iso8601,
    JulianDate,
    CesiumMath,
    Rectangle,
    Resource,
    HeightReference,
    HorizontalOrigin,
    VerticalOrigin) {
        'use strict';

        var BILLBOARD_SIZE = 32;
        var kmlNamespace = 'http://www.opengis.net/kml/2.2';
        var gxNamespace = 'http://www.google.com/kml/ext/2.2';
        var xmlnsNamespace = 'http://www.w3.org/2000/xmlns/';

        function defaultTextureCallback(texture) {
            if (typeof texture === 'string') {
                return texture;
            }

            if (texture instanceof Resource) {
                return texture.url;
            }

            if (texture instanceof HTMLCanvasElement) {
                return texture.toDataURL();
            }

            if (texture instanceof HTMLImageElement) {
                return ''; // TODO
            }

            return '';
        }

        function ValueGetter(time) {
            this._time = time;
        }

        ValueGetter.prototype.get = function(property, defaultVal) {
            var value;
            if (defined(property)) {
                value = property.getValue(this._time);
            }

            return defaultValue(value, defaultVal);
        };

        ValueGetter.prototype.getColor = function(property, defaultVal) {
            var result = this.get(property, defaultVal);
            if (defined(result)) {
                return colorToString(result);
            }
        };

        function StyleCache() {
            this._ids = {};
            this._styles = {};
            this._count = 0;
        }

        StyleCache.prototype.get = function(element) {
            // TODO: Recursively sort for better caching

            var ids = this._ids;
            var key = element.innerHTML; // TODO: Maybe use hash
            if (defined(ids[key])) {
                return ids[key];
            }

            var styleId = 'style-' + (++this._count);
            element.setAttribute('id', styleId);

            // Store with #
            styleId = '#' + styleId;
            ids[key] = styleId;
            this._styles[key] = element;

            return styleId;
        };

        StyleCache.prototype.save = function(parentElement) {
            var styles = this._styles;

            // TODO: Put in beginning
            for (var key in styles) {
                if (styles.hasOwnProperty(key)) {
                    parentElement.appendChild(styles[key]);
                }
            }
        };

        /**
         * @alias KmlExporter
         * @constructor
         *
         * @param {EntityCollection} entities The EntityCollection to export as KML
         * @param {Object} options An object with the following properties:
         * @param {Function} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid for the output file
         * @param {JulianDate} [options.time=JulianDate.fromIso8601(Iso8601.MINIMUM_VALUE)] The time value to use to get properties that are not time varying in KML
         * @param {Function} [options.textureCallback] A callback that will be called with an image, URI or Canvas. By default it will use the URI or a data URI of the image or canvas
         */
        function KmlExporter(entities, options) {
            options = defaultValue(options, defaultValue.EMPTY_OBJECT);
            this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
            this._valueGetter = new ValueGetter(defined(options.time) ? options.time.toIso8601() : Iso8601.MINIMUM_VALUE);
            var styleCache = this._styleCache = new StyleCache();
            this._textureCallback = defaultValue(options.textureCallback, defaultTextureCallback);

            var kmlDoc = this._kmlDoc = document.implementation.createDocument(kmlNamespace, 'kml');
            var kmlElement = kmlDoc.documentElement;
            kmlElement.setAttributeNS(xmlnsNamespace, 'xmlns:gx', gxNamespace);

            var kmlDocumentElement = kmlDoc.createElement('Document');
            kmlElement.appendChild(kmlDocumentElement);

            var rootEntities = entities.values.filter(function(entity) {
                return !defined(entity.parent);
            });
            recurseEntities(this, kmlDocumentElement, rootEntities);

            styleCache.save(kmlDocumentElement);
        }

        KmlExporter.prototype.toString = function() {
            var serializer = new XMLSerializer();
            return serializer.serializeToString(this._kmlDoc);
        };

        function recurseEntities(that, parentNode, entities) {
            var kmlDoc = that._kmlDoc;
            var styleCache = that._styleCache;

            var count = entities.length;
            var geometries;
            var styles;
            for (var i = 0; i < count; ++i) {
                var entity = entities[i];
                geometries = [];
                styles = [];

                createPoint(that, entity, entity.point, geometries, styles);
                createPoint(that, entity, entity.billboard, geometries, styles);
                createLineString(that, entity.polyline, geometries, styles);
                createPolygon(that, entity.rectangle, geometries, styles);
                createPolygon(that, entity.polygon, geometries, styles);

                // TODO: Handle the rest of the geometries

                var geometryCount = geometries.length;
                if (geometryCount > 0) {
                    var placemark = kmlDoc.createElement('Placemark');
                    placemark.setAttribute('id', entity.id);

                    placemark.appendChild(createBasicElementWithText(kmlDoc, 'name', entity.name));
                    placemark.appendChild(createBasicElementWithText(kmlDoc, 'visibility', entity.show));
                    placemark.appendChild(createBasicElementWithText(kmlDoc, 'description', entity.description));

                    var availability = entity.availability;
                    if (defined(availability)) {
                        var timeSpan = kmlDoc.createElement('TimeSpan');
                        timeSpan.appendChild(createBasicElementWithText(kmlDoc, 'begin',
                            JulianDate.toIso8601(availability.start)));
                        timeSpan.appendChild(createBasicElementWithText(kmlDoc, 'end',
                            JulianDate.toIso8601(availability.stop)));

                        placemark.appendChild(timeSpan);
                    }

                    parentNode.appendChild(placemark);

                    var styleCount = styles.length;
                    if (styleCount > 0) {
                        // TODO: Merge if we went up with multiple of same type
                        // TODO: Multigeometries may need to be split up
                        var style = kmlDoc.createElement('Style');
                        for (var styleIndex = 0; styleIndex < geometryCount; ++styleIndex) {
                            style.appendChild(styles[styleIndex]);
                        }

                        placemark.appendChild(createBasicElementWithText(kmlDoc, 'styleUrl', styleCache.get(style)));
                    }

                    if (geometries.length === 1) {
                        placemark.appendChild(geometries[0]);
                    } else if (geometries.length > 1) {
                        var multigeometry = kmlDoc.createElement('MultiGeometry');
                        for (var geometryIndex = 0; geometryIndex < geometryCount; ++geometryIndex) {
                            multigeometry.appendChild(geometries[geometryIndex]);
                        }
                        placemark.appendChild(multigeometry);
                    }
                }

                var children = entity._children;
                if (children.length > 0) {
                    var folderNode = kmlDoc.createElement('Folder');
                    // TODO: Maybe id, but can't duplicate if there is a Placemark

                    folderNode.appendChild(createBasicElementWithText(kmlDoc, 'name', entity.name));
                    folderNode.appendChild(createBasicElementWithText(kmlDoc, 'visibility', entity.show));
                    folderNode.appendChild(createBasicElementWithText(kmlDoc, 'description', entity.description));

                    parentNode.appendChild(folderNode);

                    recurseEntities(that, folderNode, children);
                }
            }
        }

        var scratchCartesian3 = new Cartesian3();
        var scratchCartographic = new Cartographic();

        function createPoint(that, entity, geometry, geometries, styles) {
            var kmlDoc = that._kmlDoc;
            var ellipsoid = that._ellipsoid;

            if (!defined(geometry)) {
                return;
            }

            // Set coordinates
            var coordinates;
            var positionProperty = entity.position;
            if (positionProperty.isConstant) {
                positionProperty.getValue(Iso8601.MINIMUM_VALUE, scratchCartesian3);
                coordinates = createBasicElementWithText(kmlDoc, 'coordinates',
                    getCoordinates(scratchCartesian3, ellipsoid));
            } else if (positionProperty instanceof SampledPositionProperty || positionProperty instanceof SampledProperty) {
                return createTrack(that, entity, geometries, styles);
            } else if (positionProperty instanceof CompositePositionProperty) {
                // TODO: Multitrack
            } else {
                // TODO: Something else time dynamic
            }

            var pointGeometry = kmlDoc.createElement('Point');

            // Set altitude mode
            var altitudeMode = kmlDoc.createElement('altitudeMode');
            altitudeMode.appendChild(getAltitudeMode(that, geometry.heightReference));
            pointGeometry.appendChild(altitudeMode);

            pointGeometry.appendChild(coordinates);
            geometries.push(pointGeometry);

            // Create style
            var iconStyle = (geometry instanceof BillboardGraphics) ?
                createIconStyleFromBillboard(that, geometry) : createIconStyleFromPoint(that, geometry);
            styles.push(iconStyle);
        }

        function createTrack(that, entity, geometry, geometries, styles) {
            var kmlDoc = that._kmlDoc;
            var ellipsoid = that._ellipsoid;
            var valueGetter = that._valueGetter;

            var trackGeometry = kmlDoc.createElementNS(gxNamespace, 'Track');

            var positions = entity.position;
            var positionTimes = positions._times;
            var positionValues = positions._values;
            var count = positionTimes.length;

            for (var i = 0; i < count; ++i) {
                var when = createBasicElementWithText(kmlDoc, 'when', JulianDate.toIso8601(positionTimes[i]));
                var coord = createBasicElementWithText(kmlDoc, 'coord', getCoordinates(positionValues[i], ellipsoid), gxNamespace);

                trackGeometry.appendChild(when);
                trackGeometry.appendChild(coord);
            }

            geometries.push(trackGeometry);

            // Create style
            var iconStyle = (geometry instanceof BillboardGraphics) ?
                createIconStyleFromBillboard(that, geometry) : createIconStyleFromPoint(that, geometry);
            styles.push(iconStyle);

            // See if we have a line that needs to be drawn
            var path = entity.path;
            if (defined(path)) {
                var width = valueGetter.get(path.width);
                var material = path.material;
                if (defined(material) || defined(width)) {
                    var lineStyle = kmlDoc.createElement('LineStyle');
                    if (defined(width)) {
                        lineStyle.appendChild(createBasicElementWithText(kmlDoc, 'width', width));
                    }

                    processMaterial(that, material, lineStyle);
                    styles.push(lineStyle);
                }
            }
        }

        function createIconStyleFromPoint(that, pointGraphics) {
            var kmlDoc = that._kmlDoc;
            var valueGetter = that._valueGetter;

            var iconStyle = kmlDoc.createElement('IconStyle');

            var color = valueGetter.get(pointGraphics.color);
            if (defined(color)) {
                color = colorToString(color);

                iconStyle.appendChild(createBasicElementWithText(kmlDoc, 'color', color));
                iconStyle.appendChild(createBasicElementWithText(kmlDoc, 'colorMode', 'normal'));
            }

            var pixelSize = valueGetter.get(pointGraphics.pixelSize);
            if (defined(pixelSize)) {
                iconStyle.appendChild(createBasicElementWithText(kmlDoc, 'scale', pixelSize / BILLBOARD_SIZE));
            }

            return iconStyle;
        }

        function createIconStyleFromBillboard(that, billboardGraphics) {
            var kmlDoc = that._kmlDoc;
            var valueGetter = that._valueGetter;

            var iconStyle = kmlDoc.createElement('IconStyle');

            var image = valueGetter.get(billboardGraphics.image);
            if (defined(image)) {
                image = that._textureCallback(image);

                var icon = kmlDoc.createElement('Icon');
                icon.appendChild(createBasicElementWithText(kmlDoc, 'href', image));

                var imageSubRegion = valueGetter.get(billboardGraphics.imageSubRegion);
                if (defined(imageSubRegion)) {
                    icon.appendChild(createBasicElementWithText(kmlDoc, 'x', imageSubRegion.x, gxNamespace));
                    icon.appendChild(createBasicElementWithText(kmlDoc, 'y', imageSubRegion.y, gxNamespace));
                    icon.appendChild(createBasicElementWithText(kmlDoc, 'w', imageSubRegion.width, gxNamespace));
                    icon.appendChild(createBasicElementWithText(kmlDoc, 'h', imageSubRegion.height, gxNamespace));
                }

                iconStyle.appendChild(icon);
            }

            var color = valueGetter.getColor(billboardGraphics.color);
            if (defined(color)) {
                iconStyle.appendChild(createBasicElementWithText(kmlDoc, 'color', color));
                iconStyle.appendChild(createBasicElementWithText(kmlDoc, 'colorMode', 'normal'));
            }

            var scale = valueGetter.get(billboardGraphics.scale, 1.0);
            if (defined(scale)) {
                iconStyle.appendChild(createBasicElementWithText(kmlDoc, 'scale', scale));
            }

            var pixelOffset = valueGetter.get(billboardGraphics.pixelOffset);
            if (defined(pixelOffset)) {
                Cartesian2.divideByScalar(pixelOffset, scale, pixelOffset);

                var width = valueGetter.get(billboardGraphics.width, BILLBOARD_SIZE);
                var height = valueGetter.get(billboardGraphics.height, BILLBOARD_SIZE);

                // KML Hotspots are from the bottom left, but we work from the top left

                // Move to left
                var horizontalOrigin = valueGetter.get(billboardGraphics.horizontalOrigin, HorizontalOrigin.CENTER);
                if (horizontalOrigin === HorizontalOrigin.CENTER) {
                    pixelOffset.x -= width * 0.5;
                } else if (horizontalOrigin === HorizontalOrigin.RIGHT) {
                    pixelOffset.x -= width;
                }

                // Move to bottom
                var verticalOrigin = valueGetter.get(billboardGraphics.verticalOrigin, VerticalOrigin.CENTER);
                if (verticalOrigin === VerticalOrigin.TOP) {
                    pixelOffset.y += height;
                } else if (verticalOrigin === VerticalOrigin.CENTER) {
                    pixelOffset.y += height * 0.5;
                }

                var hotSpot = kmlDoc.createElement('hotSpot');
                hotSpot.setAttribute('x', -pixelOffset.x);
                hotSpot.setAttribute('y', pixelOffset.y);
                hotSpot.setAttribute('xunits', 'pixels');
                hotSpot.setAttribute('yunits', 'pixels');

                iconStyle.appendChild(hotSpot);
            }

            // We can only specify heading so if axis isn't Z, then we skip the rotation
            // GE treats a heading of zero as no heading but can still point north using a 360 degree angle
            var rotation = valueGetter.get(billboardGraphics.rotation);
            var alignedAxis = valueGetter.get(billboardGraphics.alignedAxis);
            if (defined(rotation) && alignedAxis === Cartesian3.UNIT_Z) {
                rotation = Math.toDegrees(-rotation);
                if (rotation === 0) {
                    rotation = 360;
                }

                iconStyle.appendChild(createBasicElementWithText(kmlDoc, 'heading', rotation));
            }

            return iconStyle;
        }

        function createLineString(that, polylineGraphics, geometries, styles) {
            var kmlDoc = that._kmlDoc;
            var ellipsoid = that._ellipsoid;
            var valueGetter = that._valueGetter;

            if (!defined(polylineGraphics)) {
                return;
            }

            var lineStringGeometry = kmlDoc.createElement('LineString');

            // Set altitude mode
            var altitudeMode = kmlDoc.createElement('altitudeMode');
            var clampToGround = valueGetter.get(polylineGraphics.clampToGround, false);
            var altitudeModeText;
            if (clampToGround) {
                lineStringGeometry.appendChild(createBasicElementWithText(kmlDoc, 'tesselate', true));
                altitudeModeText = kmlDoc.createTextNode('clampToGround');
            } else {
                altitudeModeText = kmlDoc.createTextNode('absolute');
            }
            altitudeMode.appendChild(altitudeModeText);
            lineStringGeometry.appendChild(altitudeMode);

            // Set coordinates
            var coordinates;
            var positionsProperty = polylineGraphics.positions;
            if (positionsProperty.isConstant) {
                var cartesians = positionsProperty.getValue(Iso8601.MINIMUM_VALUE);
                coordinates = createBasicElementWithText(kmlDoc, 'coordinates',
                    getCoordinates(cartesians, ellipsoid));
            } else {
                // TODO: Time dynamic
            }
            lineStringGeometry.appendChild(coordinates);

            // Set draw order
            var zIndex = valueGetter.get(polylineGraphics.zIndex);
            if (clampToGround && defined(zIndex)) {
                lineStringGeometry.appendChild(createBasicElementWithText(kmlDoc, 'drawOrder', zIndex, gxNamespace));
            }

            geometries.push(lineStringGeometry);

            // Create style
            var lineStyle = kmlDoc.createElement('LineStyle');

            var width = valueGetter.get(polylineGraphics.width);
            if (defined(width)) {
                lineStyle.appendChild(createBasicElementWithText(kmlDoc, 'width', width));
            }

            processMaterial(that, polylineGraphics.material, lineStyle);

            // TODO: <gx:physicalWidth> and gx:labelVisibility>

            styles.push(lineStyle);
        }

        function getRectangleBoundaries(that, rectangleGraphics) {
            var kmlDoc = that._kmlDoc;
            var valueGetter = that._valueGetter;

            var coordinates;
            var height = valueGetter.get(rectangleGraphics.height, 0.0);

            var coordinatesProperty = rectangleGraphics.coordinates;
            if (coordinatesProperty.isConstant) {
                var rectangle = coordinatesProperty.getValue(Iso8601.MINIMUM_VALUE);

                var coordinateStrings = [];
                var cornerFunction = [Rectangle.northeast, Rectangle.southeast, Rectangle.southwest, Rectangle.northwest];

                for (var i = 0; i < 4; ++i) {
                    cornerFunction[i](rectangle, scratchCartographic);
                    coordinateStrings.push(CesiumMath.toDegrees(scratchCartographic.longitude) + ',' +
                        CesiumMath.toDegrees(scratchCartographic.latitude) + ',' + height);
                }

                coordinates = createBasicElementWithText(kmlDoc, 'coordinates', coordinateStrings.join(' '));
            } else {
                // TODO: Time dynamic
            }

            var outerBoundaryIs = kmlDoc.createElement('outerBoundaryIs');
            var linearRing = kmlDoc.createElement('LinearRing');
            linearRing.appendChild(coordinates);
            outerBoundaryIs.appendChild(linearRing);

            return [outerBoundaryIs];
        }

        function getLinearRing(that, positions, height, perPositionHeight) {
            var kmlDoc = that._kmlDoc;
            var ellipsoid = that._ellipsoid;

            var coordinateStrings = [];
            var positionCount = positions.length;
            for (var i = 0; i < positionCount; ++i) {
                Cartographic.fromCartesian(positions[i], ellipsoid, scratchCartographic);
                coordinateStrings.push(CesiumMath.toDegrees(scratchCartographic.longitude) + ',' +
                    CesiumMath.toDegrees(scratchCartographic.latitude) + ',' +
                    (perPositionHeight ? scratchCartographic.height : height));
            }

            var coordinates = createBasicElementWithText(kmlDoc, 'coordinates', coordinateStrings.join(' '));
            var linearRing = kmlDoc.createElement('LinearRing');
            linearRing.appendChild(coordinates);

            return linearRing;
        }

        function getPolygonBoundaries(that, polygonGraphics) {
            var kmlDoc = that._kmlDoc;
            var valueGetter = that._valueGetter;

            var height = valueGetter.get(polygonGraphics.height, 0.0);
            var perPositionHeight = valueGetter.get(polygonGraphics.perPositionHeight, false);

            var boundaries = [];
            var hierarchyProperty = polygonGraphics.hierarchy;
            if (hierarchyProperty.isConstant) {
                var hierarchy = hierarchyProperty.getValue(Iso8601.MINIMUM_VALUE);

                // Polygon boundaries
                var outerBoundaryIs = kmlDoc.createElement('outerBoundaryIs');
                outerBoundaryIs.appendChild(getLinearRing(that, hierarchy.positions, height, perPositionHeight));
                boundaries.push(outerBoundaryIs);

                // Hole boundaries
                var holes = hierarchy.holes;
                var holeCount = holes.length;
                for (var i = 0; i < holeCount; ++i) {
                    var innerBoundaryIs = kmlDoc.createElement('innerBoundaryIs');
                    innerBoundaryIs.appendChild(getLinearRing(that, holes[i].positions, height, perPositionHeight));
                    boundaries.push(innerBoundaryIs);
                }
            } else {
                // TODO: Time dynamic
            }

            return boundaries;
        }

        function createPolygon(that, geometry, geometries, styles) {
            var kmlDoc = that._kmlDoc;
            var valueGetter = that._valueGetter;

            if (!defined(geometry)) {
                return;
            }

            // TODO: Detect textured quads and use ground overlays instead

            var polygonGeometry = kmlDoc.createElement('Polygon');

            // Set boundaries
            var boundaries = (geometry instanceof RectangleGraphics) ?
                getRectangleBoundaries(that, geometry) : getPolygonBoundaries(kmlDoc, geometry);

            var boundaryCount = boundaries.length;
            for (var i = 0; i < boundaryCount; ++i) {
                polygonGeometry.appendChild(boundaries[i]);
            }

            // Set altitude mode
            var altitudeMode = kmlDoc.createElement('altitudeMode');
            altitudeMode.appendChild(getAltitudeMode(that, geometry.heightReference));
            polygonGeometry.appendChild(altitudeMode);

            // Set draw order
            var zIndex = valueGetter.get(geometry.zIndex);
            if (defined(zIndex)) {
                polygonGeometry.appendChild(createBasicElementWithText(kmlDoc, 'drawOrder', zIndex, gxNamespace));
            }

            // TODO: extrudedHeight, rotation, stRotation, closeTop, closeBottom

            geometries.push(polygonGeometry);

            // Create style
            var polyStyle = kmlDoc.createElement('PolyStyle');

            var fill = valueGetter.get(geometry.fill, false);
            if (fill) {
                polyStyle.appendChild(createBasicElementWithText(kmlDoc, 'width', fill));
            }

            processMaterial(that, geometry.material, polyStyle);

            var outline = valueGetter.get(geometry.outline, false);
            if (outline) {
                polyStyle.appendChild(createBasicElementWithText(kmlDoc, 'outline', outline));

                // Outline uses LineStyle
                var lineStyle = kmlDoc.createElement('LineStyle');

                var outlineWidth = valueGetter.get(geometry.outlineWidth, 1.0);
                lineStyle.appendChild(createBasicElementWithText(kmlDoc, 'width', outlineWidth));

                var outlineColor = valueGetter.get(geometry.outlineColor, Color.BLACK);
                lineStyle.appendChild(createBasicElementWithText(kmlDoc, 'color', outlineColor));
                lineStyle.appendChild(createBasicElementWithText(kmlDoc, 'colorMode', 'normal'));

                styles.push(lineStyle);
            }

            styles.push(polyStyle);
        }

        function processMaterial(that, materialProperty, style) {
            var kmlDoc = that._kmlDoc;
            var valueGetter = that._valueGetter;

            if (!defined(materialProperty)) {
                return;
            }

            var material = valueGetter.get(materialProperty);
            if (!defined(material)) {
                return;
            }

            var color;
            if (materialProperty instanceof ColorMaterialProperty) {
                color = colorToString(material.color);
            } else if (materialProperty instanceof CompositeMaterialProperty) {
                // TODO
            } else if (materialProperty instanceof GridMaterialProperty) {
                color = colorToString(material.color);

                // TODO
            } else if (materialProperty instanceof ImageMaterialProperty) {
                // TODO: We'll need to use GroundOverlays for this
            } else if (materialProperty instanceof PolylineGlowMaterialProperty) {
                // TODO
            } else if (materialProperty instanceof PolylineOutlineMaterialProperty) {
                color = colorToString(material.color);

                var outlineColor = colorToString(material.outlineColor);
                var outlineWidth = material.outlineWidth;
                style.appendChild(createBasicElementWithText(kmlDoc, 'outerColor', outlineColor, gxNamespace));
                style.appendChild(createBasicElementWithText(kmlDoc, 'outerWidth', outlineWidth, gxNamespace));
            } else if (materialProperty instanceof StripeMaterialProperty) {
                // TODO
            } else {
                // TODO: Unknown Material
            }

            if (defined(color)) {
                style.appendChild(createBasicElementWithText(kmlDoc, 'color', color));
                style.appendChild(createBasicElementWithText(kmlDoc, 'colorMode', 'normal'));
            }
        }

        function getAltitudeMode(that, heightReferenceProperty) {
            var kmlDoc = that._kmlDoc;
            var valueGetter = that._valueGetter;

            var heightReference = valueGetter.get(heightReferenceProperty, HeightReference.CLAMP_TO_GROUND);
            var altitudeModeText;
            switch (heightReference) {
                case HeightReference.NONE:
                    altitudeModeText = kmlDoc.createTextNode('absolute');
                    break;
                case HeightReference.CLAMP_TO_GROUND:
                    altitudeModeText = kmlDoc.createTextNode('clampToGround');
                    break;
                case HeightReference.RELATIVE_TO_GROUND:
                    altitudeModeText = kmlDoc.createTextNode('relativeToGround');
                    break;
            }

            return altitudeModeText;
        }

        function getCoordinates(coordinates, ellipsoid) {
            if (!Array.isArray(coordinates)) {
                coordinates = [coordinates];
            }

            var count = coordinates.length;
            var coordinateStrings = [];
            for (var i = 0; i < count; ++i) {
                Cartographic.fromCartesian(coordinates[i], ellipsoid, scratchCartographic);
                coordinateStrings.push(CesiumMath.toDegrees(scratchCartographic.longitude) + ',' +
                    CesiumMath.toDegrees(scratchCartographic.latitude) + ',' +
                    scratchCartographic.height);
            }

            return coordinateStrings.join(' ');
        }

        function createBasicElementWithText(kmlDoc, elementName, elementValue, namespace) {
            elementValue = defaultValue(elementValue, '');

            if (typeof elementValue === 'boolean') {
                elementValue = elementValue ? '1' : '0';
            }

            // Create element with optional namespace
            var element = defined(namespace) ? kmlDoc.createElementNS(namespace, elementName) : kmlDoc.createElement(elementName);

            // Wrap value in CDATA section if it contains HTML
            var text = ((elementValue === 'string') && (elementValue.indexOf('<') !== -1)) ?
                kmlDoc.createCDATASection(elementValue) : kmlDoc.createTextNode(elementValue);

            element.appendChild(text);

            return element;
        }

        function colorToString(color) {
            var result = '';
            var bytes = color.toBytes();
            for (var i = 3; i >= 0; --i) {
                result += (bytes[i] < 16) ? ('0' + bytes[i].toString(16)) : bytes[i].toString(16);
            }

            return result;
        }

        return KmlExporter;
    });
