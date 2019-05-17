define([
    '../Core/Cartesian2',
    '../Core/Cartesian3',
    '../Core/Cartographic',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/Ellipsoid',
    '../Core/Iso8601',
    '../Core/Math',
    '../Scene/HeightReference',
    '../Scene/HorizontalOrigin',
    '../Scene/VerticalOrigin'
], function(
    Cartesian2,
    Cartesian3,
    Cartographic,
    defaultValue,
    defined,
    Ellipsoid,
    Iso8601,
    CesiumMath,
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

            if (texture instanceof HTMLCanvasElement) {
                return texture.toDataURL();
            }

            if (texture instanceof HTMLImageElement) {
                return ''; // TODO
            }

            return '';
        }

        /**
         * @alias KmlExporter
         * @constructor
         *
         * @param {EntityCollection} entities The EntityCollection to export as KML
         * @param {Object} options An object with the following properties:
         * @param {Function} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid for the output file
         * @param {Function} [options.textureCallback] A callback that will be called with an image, URI or Canvas. By default it will use the URI or a data URI of the image or canvas
         */
        function KmlExporter(entities, options) {
            options = defaultValue(options, defaultValue.EMPTY_OBJECT);
            this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
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
        }

        KmlExporter.prototype.toString = function() {
            var serializer = new XMLSerializer();
            return serializer.serializeToString(this._kmlDoc);
        };

        function recurseEntities(that, parentNode, entities) {
            var kmlDoc = that._kmlDoc;

            var count = Math.min(10, entities.length); // TODO
            var geometries;
            for (var i = 0; i < count; ++i) {
                var entity = entities[i];
                geometries = [];

                createPoint(that, entity, entity.point, geometries);
                createPoint(that, entity, entity.billboard, geometries);
                createLineString(that, entity.polyline, geometries);
                createPolygon(that, entity.polygon, geometries);
                createPolygon(that, entity.rectangle, geometries);

                // TODO: Handle the rest of the geometries

                var geometryCount = geometries.length;
                if (geometryCount > 0) {
                    var placemark = kmlDoc.createElement('Placemark');
                    placemark.setAttribute('id', entity.id);

                    placemark.appendChild(createBasicElementWithText(kmlDoc, 'name', entity.name));
                    placemark.appendChild(createBasicElementWithText(kmlDoc, 'visibility', entity.show));
                    placemark.appendChild(createBasicElementWithText(kmlDoc, 'description', entity.description));

                    parentNode.appendChild(placemark);

                    if (geometries.length === 1) {
                        placemark.appendChild(geometries[0]);
                    } else if (geometries.length > 1) {
                        var multigeometry = kmlDoc.createElement('MultiGeometry');
                        for (var j = 0; j < geometryCount; ++j) {
                            multigeometry.appendChild(geometries[j]);
                        }
                        placemark.appendChild(multigeometry);
                    }
                }

                var children = entity._children;
                if (children.length > 0) {
                    var folderNode = kmlDoc.createElement('Folder');
                    folderNode.setAttribute('name', entity.name);
                    parentNode.appendChild(folderNode);

                    recurseEntities(that, folderNode, children);
                }
            }
        }

        var scratchCartesian3 = new Cartesian3();
        var scratchCartographic = new Cartographic();

        function createPoint(that, entity, geometry, geometries) {
            var kmlDoc = that._kmlDoc;
            var ellipsoid = that._ellipsoid;

            if (!defined(geometry)) {
                return;
            }

            var pointGeometry = kmlDoc.createElement('Point');

            // Set altitude mode
            var altitudeMode = kmlDoc.createElement('altitudeMode');
            altitudeMode.appendChild(getAltitudeMode(kmlDoc, geometry.heightReference));
            pointGeometry.appendChild(altitudeMode);

            // Set coordinates
            var coordinates;
            var positionProperty = entity.position;
            if (positionProperty.isConstant) {
                positionProperty.getValue(Iso8601.MINIMUM_VALUE, scratchCartesian3);
                coordinates = createBasicElementWithText(kmlDoc, 'coordinates',
                    getCoordinates(scratchCartesian3, ellipsoid));
            } else {
                // TODO: Time dynamic
            }

            pointGeometry.appendChild(coordinates);

            geometries.push(pointGeometry);
        }

        function createIconStyleFromPoint(pointGraphics) {

        }

        function createIconStyleFromBillboard(that, billboardGraphics) {
            var kmlDoc = that._kmlDoc;
            var iconStyle = kmlDoc.createElement('IconStyle');

            var image = getValue(billboardGraphics.image);
            if (defined(image)) {
                image = that._textureCallback(image);

                var icon = kmlDoc.createElement('Icon');
                icon.appendChild(createBasicElementWithText(kmlDoc, 'href', image));

                var imageSubRegion = getValue(billboardGraphics.imageSubRegion);
                if (defined(imageSubRegion)) {
                    icon.appendChild(createBasicElementWithText(kmlDoc, 'x', imageSubRegion.x, gxNamespace));
                    icon.appendChild(createBasicElementWithText(kmlDoc, 'y', imageSubRegion.y, gxNamespace));
                    icon.appendChild(createBasicElementWithText(kmlDoc, 'w', imageSubRegion.width, gxNamespace));
                    icon.appendChild(createBasicElementWithText(kmlDoc, 'h', imageSubRegion.height, gxNamespace));
                }

                iconStyle.appendChild(icon);
            }

            var color = getValue(billboardGraphics.color);
            if (defined(color)) {
                color = colorToString(color);

                iconStyle.appendChild(createBasicElementWithText(kmlDoc, 'color', color));
                iconStyle.appendChild(createBasicElementWithText(kmlDoc, 'colorMode', 'normal'));
            }

            var scale = getValue(billboardGraphics.scale, 1.0);
            if (defined(scale)) {
                iconStyle.appendChild(createBasicElementWithText(kmlDoc, 'scale', scale));
            }

            var pixelOffset = getValue(billboardGraphics.pixelOffset);
            if (defined(pixelOffset)) {
                Cartesian2.divideByScalar(pixelOffset, scale, pixelOffset);

                var width = getValue(billboardGraphics.width, BILLBOARD_SIZE);
                var height = getValue(billboardGraphics.height, BILLBOARD_SIZE);

                // KML Hotspots are from the bottom left, but we work from the top left

                // Move to left
                var horizontalOrigin = getValue(billboardGraphics.horizontalOrigin, HorizontalOrigin.CENTER);
                if (horizontalOrigin === HorizontalOrigin.CENTER) {
                    pixelOffset.x -= width * 0.5;
                } else if (horizontalOrigin === HorizontalOrigin.RIGHT) {
                    pixelOffset.x -= width;
                }

                // Move to bottom
                var verticalOrigin = getValue(billboardGraphics.verticalOrigin, VerticalOrigin.CENTER);
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
            var rotation = getValue(billboardGraphics.rotation);
            var alignedAxis = getValue(billboardGraphics.alignedAxis);
            if (defined(rotation) && alignedAxis === Cartesian3.UNIT_Z) {
                if (rotation === 0) {
                    rotation = 360;
                }
                rotation = Math.toDegrees(-rotation);
            }
        }

        function createLineString(that, polyline, geometries) {
            var kmlDoc = that._kmlDoc;
            var ellipsoid = that._ellipsoid;

            if (!defined(polyline)) {
                return;
            }

            var lineStringGeometry = kmlDoc.createElement('LineString');
            geometries.push(lineStringGeometry);
        }

        function createPolygon(that, polygonOrRectangle, geometries) {
            var kmlDoc = that._kmlDoc;
            var ellipsoid = that._ellipsoid;

            if (!defined(polygonOrRectangle)) {
                return;
            }

            var polygonGeometry = kmlDoc.createElement('Polygon');
            geometries.push(polygonGeometry);
        }

        function getAltitudeMode(kmlDoc, heightReferenceProperty) {
            // TODO: Time dynamic
            var heightReference = defined(heightReferenceProperty) ?
                heightReferenceProperty.getValue(Iso8601.MINIMUM_VALUE) : HeightReference.NONE;
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

        function getCoordinates(kmlDoc, coordinates, ellipsoid) {
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
            if (typeof elementValue === 'boolean') {
                elementValue = elementValue ? '1' : '0';
            }

            if (elementValue.indexOf('<') !== -1) {
                elementValue = '<![CDATA[' + elementValue + ']]>';
            }

            var element = defined(namespace) ? kmlDoc.createElementNS(namespace, elementName) : kmlDoc.createElement(elementName);
            var text = kmlDoc.createTextNode(elementValue);

            element.appendChild(text);

            return element;
        }

        function colorToString(color) {
            var result = '';
            var bytes = color.toBytes();
            for (var i=3;i>=0;--i) {
                result += (bytes[i] < 16) ? ('0' + bytes[i].toString(16)) : bytes[i].toString(16);
            }

            return result;
        }

        function getValue(property, defaultVal) {
            var value;
            if (defined(property)) {
                if (property.isConstant) {
                    value = property.getValue(Iso8601.MINIMUM_VALUE);
                } else {
                    // TODO
                }
            }

            return defaultValue(value, defaultVal);
        }

        return KmlExporter;
    });
