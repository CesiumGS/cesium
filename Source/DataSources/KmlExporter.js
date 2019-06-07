define([
    './BillboardGraphics',
    './CompositePositionProperty',
    './ModelGraphics',
    './SampledPositionProperty',
    './SampledProperty',
    './ScaledPositionProperty',
    './RectangleGraphics',
    '../Core/Cartesian2',
    '../Core/Cartesian3',
    '../Core/Cartographic',
    '../Core/Color',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/Ellipsoid',
    '../Core/isArray',
    '../Core/Iso8601',
    '../Core/JulianDate',
    '../Core/Math',
    '../Core/Rectangle',
    '../Core/Resource',
    '../Core/TimeInterval',
    '../Core/TimeIntervalCollection',
    '../Scene/HeightReference',
    '../Scene/HorizontalOrigin',
    '../Scene/VerticalOrigin'
], function(
    BillboardGraphics,
    CompositePositionProperty,
    ModelGraphics,
    SampledPositionProperty,
    SampledProperty,
    ScaledPositionProperty,
    RectangleGraphics,
    Cartesian2,
    Cartesian3,
    Cartographic,
    Color,
    defaultValue,
    defined,
    Ellipsoid,
    isArray,
    Iso8601,
    JulianDate,
    CesiumMath,
    Rectangle,
    Resource,
    TimeInterval,
    TimeIntervalCollection,
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

            return '';
        }

        function defaultModelCallback(model, time) {
            var uri = model.uri;
            if (!defined(uri)) {
                return '';
            }

            uri = uri.getValue(time);
            if (typeof uri !== 'string') {
                uri = uri.url;
            }

            return uri;
        }

        function ValueGetter(time) {
            this._time = time;
        }

        ValueGetter.prototype.get = function(property, defaultVal) {
            var value;
            if (defined(property)) {
                value = defined(property.getValue) ? property.getValue(this._time) : property;
            }

            return defaultValue(value, defaultVal);
        };

        ValueGetter.prototype.getColor = function(property, defaultVal) {
            var result = this.get(property, defaultVal);
            if (defined(result)) {
                return colorToString(result);
            }
        };

        ValueGetter.prototype.getMaterialType = function(property) {
            if (!defined(property)) {
                return;
            }

            return property.getValue(this._time);
        };

        function StyleCache() {
            this._ids = {};
            this._styles = {};
            this._count = 0;
        }

        StyleCache.prototype.get = function(element) {
            var ids = this._ids;
            var key = element.innerHTML;
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

            var firstElement = parentElement.childNodes[0];
            for (var key in styles) {
                if (styles.hasOwnProperty(key)) {
                    parentElement.insertBefore(styles[key], firstElement);
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
         * @param {Function} [options.textureCallback] A callback that will be called with an image, URI or Canvas. By default it will use the URI or a data URI of the image or canvas.
         * @param {JulianDate} [options.time=entities.computeAvailability().start] The time value to use to get properties that are not time varying in KML.
         * @param {TimeInterval} [options.defaultAvailability=entities.computeAvailability()] The interval that will be sampled if an entity doesn't have an availability.
         * @param {Number} [options.sampleDuration=60] The number of seconds to sample properties that are varying in KML.
         */
        function KmlExporter(entities, options) {
            options = defaultValue(options, defaultValue.EMPTY_OBJECT);
            this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

            var styleCache = this._styleCache = new StyleCache();
            this._textureCallback = defaultValue(options.textureCallback, defaultTextureCallback);
            this._modelCallback = defaultValue(options.modelCallback, defaultModelCallback);

            // Use the start time as the default because just in case they define
            //  properties with an interval even if they don't change.
            var entityAvailability = entities.computeAvailability();
            var time = this._time = (defined(options.time) ? options.time : entityAvailability.start);
            this._valueGetter = new ValueGetter(time);

            // Figure out how we will sample dynamic position properties
            var defaultAvailability = defaultValue(options.defaultAvailability, entityAvailability);
            var sampleDuration = this._sampleDuration = defaultValue(options.sampleDuration, 60);

            // Make sure we don't have infinite availability if we need to sample
            if (defaultAvailability.start === Iso8601.MINIMUM_VALUE) {
                if (defaultAvailability.stop === Iso8601.MAXIMUM_VALUE) {
                    // Infinite, so just use the default
                    defaultAvailability = new TimeInterval();
                } else {
                    // No start time, so just sample 10 times before the stop
                    JulianDate.addSeconds(defaultAvailability.stop, -10*sampleDuration, defaultAvailability.start);
                }
            } else if (defaultAvailability.stop === Iso8601.MAXIMUM_VALUE) {
                // No stop time, so just sample 10 times after the start
                JulianDate.addSeconds(defaultAvailability.start, 10*sampleDuration, defaultAvailability.stop);
            }

            // Wrap it in a TimeIntervalCollection because that is what entity.availability is
            this._defaultAvailability = new TimeIntervalCollection([defaultAvailability]);

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
            var valueGetter = that._valueGetter;

            var count = entities.length;
            var geometries;
            var styles;
            for (var i = 0; i < count; ++i) {
                var entity = entities[i];
                geometries = [];
                styles = [];

                createPoint(that, entity, geometries, styles);
                createLineString(that, entity.polyline, geometries, styles);
                createPolygon(that, entity.rectangle, geometries, styles);
                createPolygon(that, entity.polygon, geometries, styles);
                createModel(that, entity, entity.model, geometries, styles);

                var geometryCount = geometries.length;
                if (geometryCount > 0) {
                    var placemark = kmlDoc.createElement('Placemark');
                    placemark.setAttribute('id', entity.id);

                    var name = entity.name;
                    var labelGraphics = entity.label;
                    if (defined(labelGraphics)) {
                        var labelStyle = kmlDoc.createElement('LabelStyle');

                        // KML only shows the name as a label, so just change the name if we need to show a label
                        var text = valueGetter.get(labelGraphics.text);
                        name = (defined(text) && text.length > 0) ? text : name;

                        var color = valueGetter.getColor(labelGraphics.fillColor);
                        if (defined(color)) {
                            labelStyle.appendChild(createBasicElementWithText(kmlDoc, 'color', color));
                            labelStyle.appendChild(createBasicElementWithText(kmlDoc, 'colorMode', 'normal'));
                        }

                        var scale = valueGetter.get(labelGraphics.scale);
                        if (defined(scale)) {
                            labelStyle.appendChild(createBasicElementWithText(kmlDoc, 'scale', scale));
                        }

                        styles.push(labelStyle);
                    }

                    placemark.appendChild(createBasicElementWithText(kmlDoc, 'name', name));
                    placemark.appendChild(createBasicElementWithText(kmlDoc, 'visibility', entity.show));
                    placemark.appendChild(createBasicElementWithText(kmlDoc, 'description', entity.description));

                    var availability = entity.availability;
                    if (defined(availability)) {
                        var timeSpan = kmlDoc.createElement('TimeSpan');

                        if (!JulianDate.equals(availability.start, Iso8601.MINIMUM_VALUE)) {
                            timeSpan.appendChild(createBasicElementWithText(kmlDoc, 'begin',
                                JulianDate.toIso8601(availability.start)));
                        }

                        if (!JulianDate.equals(availability.stop, Iso8601.MAXIMUM_VALUE)) {
                            timeSpan.appendChild(createBasicElementWithText(kmlDoc, 'end',
                                JulianDate.toIso8601(availability.stop)));
                        }

                        placemark.appendChild(timeSpan);
                    }

                    parentNode.appendChild(placemark);

                    var styleCount = styles.length;
                    if (styleCount > 0) {
                        var style = kmlDoc.createElement('Style');
                        for (var styleIndex = 0; styleIndex < styleCount; ++styleIndex) {
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
                    // The Placemark and Folder can't have the same ID
                    if (geometryCount === 0) {
                        folderNode.setAttribute('id', entity.id);
                    }

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
        var scratchJulianDate = new JulianDate();

        function createPoint(that, entity, geometries, styles) {
            var kmlDoc = that._kmlDoc;
            var ellipsoid = that._ellipsoid;

            var pointGraphics = defaultValue(entity.billboard, entity.point);
            if (!defined(pointGraphics) && !defined(entity.path)) {
                return;
            }

            // If the point isn't constant then create gx:Track or gx:MultiTrack
            var entityPositionProperty = entity.position;
            if (!entityPositionProperty.isConstant) {
                createTracks(that, entity, pointGraphics, geometries, styles);
                return;
            }

            entityPositionProperty.getValue(Iso8601.MINIMUM_VALUE, scratchCartesian3);
            var coordinates = createBasicElementWithText(kmlDoc, 'coordinates',
                getCoordinates(scratchCartesian3, ellipsoid));

            var pointGeometry = kmlDoc.createElement('Point');

            // Set altitude mode
            var altitudeMode = kmlDoc.createElement('altitudeMode');
            altitudeMode.appendChild(getAltitudeMode(that, pointGraphics.heightReference));
            pointGeometry.appendChild(altitudeMode);

            pointGeometry.appendChild(coordinates);
            geometries.push(pointGeometry);

            // Create style
            var iconStyle = (pointGraphics instanceof BillboardGraphics) ?
                createIconStyleFromBillboard(that, pointGraphics) : createIconStyleFromPoint(that, pointGraphics);
            styles.push(iconStyle);
        }

        function createTracks(that, entity, pointGraphics, geometries, styles) {
            var kmlDoc = that._kmlDoc;
            var ellipsoid = that._ellipsoid;
            var valueGetter = that._valueGetter;

            var intervals;
            var entityPositionProperty = entity.position;
            var useEntityPositionProperty = true;
            if (entityPositionProperty instanceof CompositePositionProperty) {
                intervals = entityPositionProperty.intervals;
                useEntityPositionProperty = false;
            } else {
                intervals = defaultValue(entity.availability, that._defaultAvailability);
            }

            var isModel = (pointGraphics instanceof ModelGraphics);

            var i;
            var tracks = [];
            for (i = 0; i < intervals.length; ++i) {
                var interval = intervals.get(i);
                var positionProperty = useEntityPositionProperty ? entityPositionProperty : interval.data;

                var trackAltitudeMode = kmlDoc.createElement('altitudeMode');
                // This is something that KML importing uses to handle clampToGround,
                //  so just extract the internal property and set the altitudeMode.
                if (positionProperty instanceof ScaledPositionProperty) {
                    positionProperty = positionProperty._value;
                    trackAltitudeMode.appendChild(getAltitudeMode(that, HeightReference.CLAMP_TO_GROUND));
                } else if (defined(pointGraphics)){
                    trackAltitudeMode.appendChild(getAltitudeMode(that, pointGraphics.heightReference));
                } else {
                    // Path graphics only, which has no height reference
                    trackAltitudeMode.appendChild(getAltitudeMode(that, HeightReference.NONE));
                }

                // We need the raw samples, so just use the internal SampledProperty
                if (positionProperty instanceof SampledPositionProperty) {
                    positionProperty = positionProperty._property;
                }

                var positionTimes = [];
                var positionValues = [];

                if (positionProperty.isConstant) {
                    positionProperty.getValue(Iso8601.MINIMUM_VALUE, scratchCartesian3);
                    var constCoordinates = createBasicElementWithText(kmlDoc, 'coordinates',
                        getCoordinates(scratchCartesian3, ellipsoid));

                    // This interval is constant so add a track with the same position
                    positionTimes.push(JulianDate.toIso8601(interval.start));
                    positionValues.push(constCoordinates);
                    positionTimes.push(JulianDate.toIso8601(interval.stop));
                    positionValues.push(constCoordinates);
                } else if (positionProperty instanceof SampledProperty) {
                    var times = positionProperty._times;
                    var values = positionProperty._values;

                    for (var j = 0; j < times.length; ++j) {
                        positionTimes.push(JulianDate.toIso8601(times[j]));
                        Cartesian3.fromArray(values, j*3, scratchCartesian3);
                        positionValues.push(getCoordinates(scratchCartesian3, ellipsoid));
                    }
                } else {
                    var duration = that._sampleDuration;
                    interval.start.clone(scratchJulianDate);
                    if (!interval.isStartIncluded) {
                        JulianDate.addSeconds(scratchJulianDate, duration, scratchJulianDate);
                    }

                    var stopDate = interval.stop;
                    while (JulianDate.lessThan(scratchJulianDate, stopDate)) {
                        positionProperty.getValue(scratchJulianDate, scratchCartesian3);

                        positionTimes.push(JulianDate.toIso8601(scratchJulianDate));
                        positionValues.push(getCoordinates(scratchCartesian3, ellipsoid));

                        JulianDate.addSeconds(scratchJulianDate, duration, scratchJulianDate);
                    }

                    if (interval.isStopIncluded && JulianDate.equals(scratchJulianDate, stopDate)) {
                        positionProperty.getValue(scratchJulianDate, scratchCartesian3);

                        positionTimes.push(JulianDate.toIso8601(scratchJulianDate));
                        positionValues.push(getCoordinates(scratchCartesian3, ellipsoid));
                    }
                }

                var trackGeometry = kmlDoc.createElementNS(gxNamespace, 'Track');
                trackGeometry.appendChild(trackAltitudeMode);

                for (var k = 0; k < positionTimes.length; ++k) {
                    var when = createBasicElementWithText(kmlDoc, 'when', positionTimes[k]);
                    var coord = createBasicElementWithText(kmlDoc, 'coord', positionValues[k], gxNamespace);

                    trackGeometry.appendChild(when);
                    trackGeometry.appendChild(coord);
                }

                if (isModel) {
                    trackGeometry.appendChild(createModelGeometry(that, pointGraphics));
                }

                tracks.push(trackGeometry);
            }

            // If one track, then use it otherwise combine into a multitrack
            if (tracks.length === 1) {
                geometries.push(tracks[0]);
            } else if (tracks.length > 1) {
                var multiTrackGeometry = kmlDoc.createElementNS(gxNamespace, 'MultiTrack');

                for (i = 0; i < tracks.length; ++i) {
                    multiTrackGeometry.appendChild(tracks[i]);
                }

                geometries.push(multiTrackGeometry);
            }

            // Create style
            if (defined(pointGraphics) && !isModel) {
                var iconStyle = (pointGraphics instanceof BillboardGraphics) ?
                    createIconStyleFromBillboard(that, pointGraphics) : createIconStyleFromPoint(that, pointGraphics);
                styles.push(iconStyle);
            }

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

            var color = valueGetter.getColor(pointGraphics.color);
            if (defined(color)) {
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

            var scale = valueGetter.get(billboardGraphics.scale);
            if (defined(scale)) {
                iconStyle.appendChild(createBasicElementWithText(kmlDoc, 'scale', scale));
            }

            var pixelOffset = valueGetter.get(billboardGraphics.pixelOffset);
            if (defined(pixelOffset)) {
                scale = defaultValue(scale, 1.0);

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
            if (defined(rotation) && Cartesian3.equals(Cartesian3.UNIT_Z, alignedAxis)) {
                rotation = CesiumMath.toDegrees(-rotation);
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
            var positionsProperty = polylineGraphics.positions;
            var cartesians = valueGetter.get(positionsProperty);
            var coordinates = createBasicElementWithText(kmlDoc, 'coordinates',
                getCoordinates(cartesians, ellipsoid));
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

            // TODO: <gx:physicalWidth>?

            styles.push(lineStyle);
        }

        function getRectangleBoundaries(that, rectangleGraphics, extrudedHeight) {
            var kmlDoc = that._kmlDoc;
            var valueGetter = that._valueGetter;

            var coordinates;
            var height = valueGetter.get(rectangleGraphics.height, 0.0);

            if (extrudedHeight > 0) {
                // We extrude up and KML extrudes down, so if we extrude, set the polygon height to
                // the extruded height so KML will look similar to Cesium
                height = extrudedHeight;
            }

            var coordinatesProperty = rectangleGraphics.coordinates;
            var rectangle = valueGetter.get(coordinatesProperty);

            var coordinateStrings = [];
            var cornerFunction = [Rectangle.northeast, Rectangle.southeast, Rectangle.southwest, Rectangle.northwest];

            for (var i = 0; i < 4; ++i) {
                cornerFunction[i](rectangle, scratchCartographic);
                coordinateStrings.push(CesiumMath.toDegrees(scratchCartographic.longitude) + ',' +
                    CesiumMath.toDegrees(scratchCartographic.latitude) + ',' + height);
            }

            coordinates = createBasicElementWithText(kmlDoc, 'coordinates', coordinateStrings.join(' '));

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

        function getPolygonBoundaries(that, polygonGraphics, extrudedHeight) {
            var kmlDoc = that._kmlDoc;
            var valueGetter = that._valueGetter;

            var height = valueGetter.get(polygonGraphics.height, 0.0);
            var perPositionHeight = valueGetter.get(polygonGraphics.perPositionHeight, false);

            if (!perPositionHeight && (extrudedHeight > 0)) {
                // We extrude up and KML extrudes down, so if we extrude, set the polygon height to
                // the extruded height so KML will look similar to Cesium
                height = extrudedHeight;
            }

            var boundaries = [];
            var hierarchyProperty = polygonGraphics.hierarchy;
            var hierarchy = valueGetter.get(hierarchyProperty);

            // Polygon hierarchy can sometimes just be an array of positions
            var positions = isArray(hierarchy) ? hierarchy : hierarchy.positions;

            // Polygon boundaries
            var outerBoundaryIs = kmlDoc.createElement('outerBoundaryIs');
            outerBoundaryIs.appendChild(getLinearRing(that, positions, height, perPositionHeight));
            boundaries.push(outerBoundaryIs);

            // Hole boundaries
            var holes = hierarchy.holes;
            if (defined(holes)) {
                var holeCount = holes.length;
                for (var i = 0; i < holeCount; ++i) {
                    var innerBoundaryIs = kmlDoc.createElement('innerBoundaryIs');
                    innerBoundaryIs.appendChild(getLinearRing(that, holes[i].positions, height, perPositionHeight));
                    boundaries.push(innerBoundaryIs);
                }
            }

            return boundaries;
        }

        function createPolygon(that, geometry, geometries, styles) {
            var kmlDoc = that._kmlDoc;
            var valueGetter = that._valueGetter;

            if (!defined(geometry)) {
                return;
            }

            // Detect textured quads and use ground overlays instead
            var isRectangle = (geometry instanceof RectangleGraphics);
            if (isRectangle && valueGetter.getMaterialType(geometry.material) === 'Image') {
                // TODO
                // TODO: stRotation
                return;
            }

            var polygonGeometry = kmlDoc.createElement('Polygon');

            var extrudedHeight = valueGetter.get(geometry.extrudedHeight, 0.0);
            if (extrudedHeight > 0) {
                polygonGeometry.appendChild(createBasicElementWithText(kmlDoc, 'extrude', true));
            }

            // Set boundaries
            var boundaries = isRectangle ? getRectangleBoundaries(that, geometry, extrudedHeight) :
                getPolygonBoundaries(that, geometry, extrudedHeight);

            var boundaryCount = boundaries.length;
            for (var i = 0; i < boundaryCount; ++i) {
                polygonGeometry.appendChild(boundaries[i]);
            }

            // Set altitude mode
            var altitudeMode = kmlDoc.createElement('altitudeMode');
            altitudeMode.appendChild(getAltitudeMode(that, geometry.heightReference));
            polygonGeometry.appendChild(altitudeMode);

            geometries.push(polygonGeometry);

            // Create style
            var polyStyle = kmlDoc.createElement('PolyStyle');

            var fill = valueGetter.get(geometry.fill, false);
            if (fill) {
                polyStyle.appendChild(createBasicElementWithText(kmlDoc, 'fill', fill));
            }

            processMaterial(that, geometry.material, polyStyle);

            var outline = valueGetter.get(geometry.outline, false);
            if (outline) {
                polyStyle.appendChild(createBasicElementWithText(kmlDoc, 'outline', outline));

                // Outline uses LineStyle
                var lineStyle = kmlDoc.createElement('LineStyle');

                var outlineWidth = valueGetter.get(geometry.outlineWidth, 1.0);
                lineStyle.appendChild(createBasicElementWithText(kmlDoc, 'width', outlineWidth));

                var outlineColor = valueGetter.getColor(geometry.outlineColor, Color.BLACK);
                lineStyle.appendChild(createBasicElementWithText(kmlDoc, 'color', outlineColor));
                lineStyle.appendChild(createBasicElementWithText(kmlDoc, 'colorMode', 'normal'));

                styles.push(lineStyle);
            }

            styles.push(polyStyle);
        }

        function createModelGeometry(that, modelGraphics) {
            var kmlDoc = that._kmlDoc;
            var valueGetter = that._valueGetter;

            var modelGeometry = kmlDoc.createElement('Model');

            var scale = valueGetter.get(modelGraphics.scale);
            if (defined(scale)) {
                var scaleElement = kmlDoc.createElement('scale');
                scaleElement.appendChild(createBasicElementWithText(kmlDoc, 'x', scale));
                scaleElement.appendChild(createBasicElementWithText(kmlDoc, 'y', scale));
                scaleElement.appendChild(createBasicElementWithText(kmlDoc, 'z', scale));
                modelGeometry.appendChild(scaleElement);
            }

            var link = kmlDoc.createElement('Link');
            var uri = that._modelCallback(modelGraphics, that._time);

            link.appendChild(createBasicElementWithText(kmlDoc, 'href', uri));
            modelGeometry.appendChild(link);

            return modelGeometry;
        }

        function createModel(that, entity, modelGraphics, geometries, styles) {
            var kmlDoc = that._kmlDoc;
            var ellipsoid = that._ellipsoid;

            if (!defined(modelGraphics)) {
                return;
            }

            // If the point isn't constant then create gx:Track or gx:MultiTrack
            var entityPositionProperty = entity.position;
            if (!entityPositionProperty.isConstant) {
                createTracks(that, entity, modelGraphics, geometries, styles);
                return;
            }

            var modelGeometry = createModelGeometry(that, modelGraphics);

            // Set altitude mode
            var altitudeMode = kmlDoc.createElement('altitudeMode');
            altitudeMode.appendChild(getAltitudeMode(that, modelGraphics.heightReference));
            modelGeometry.appendChild(altitudeMode);

            entityPositionProperty.getValue(Iso8601.MINIMUM_VALUE, scratchCartesian3);
            var coordinates = createBasicElementWithText(kmlDoc, 'coordinates',
                getCoordinates(scratchCartesian3, ellipsoid));

            modelGeometry.appendChild(coordinates);

            geometries.push(modelGeometry);
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
            var type = valueGetter.getMaterialType(materialProperty);
            switch(type) {
                case 'Color':
                case 'Grid':
                case 'PolylineGlow':
                    color = colorToString(material.color);
                    break;
                case 'PolylineOutline':
                    color = colorToString(material.color);

                    var outlineColor = colorToString(material.outlineColor);
                    var outlineWidth = material.outlineWidth;
                    style.appendChild(createBasicElementWithText(kmlDoc, 'outerColor', outlineColor, gxNamespace));
                    style.appendChild(createBasicElementWithText(kmlDoc, 'outerWidth', outlineWidth, gxNamespace));
                    break;
                case 'Stripe':
                    color = colorToString(material.oddColor);
                    break;
            }

            if (defined(color)) {
                style.appendChild(createBasicElementWithText(kmlDoc, 'color', color));
                style.appendChild(createBasicElementWithText(kmlDoc, 'colorMode', 'normal'));
            }
        }

        function getAltitudeMode(that, heightReferenceProperty) {
            var kmlDoc = that._kmlDoc;
            var valueGetter = that._valueGetter;

            var heightReference = valueGetter.get(heightReferenceProperty, HeightReference.NONE);
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
            if (!isArray(coordinates)) {
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
