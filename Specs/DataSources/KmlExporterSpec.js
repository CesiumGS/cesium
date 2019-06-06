defineSuite([
    'DataSources/KmlExporter',
    'Core/BoundingRectangle',
    'Core/Cartesian2',
    'Core/Cartesian3',
    'Core/Cartographic',
    'Core/Color',
    'Core/defined',
    'Core/Iso8601',
    'Core/JulianDate',
    'Core/Math',
    'Core/PerspectiveFrustum',
    'Core/Rectangle',
    'Core/TimeInterval',
    'DataSources/CallbackProperty',
    'DataSources/ColorMaterialProperty',
    'DataSources/Entity',
    'DataSources/EntityCollection',
    'DataSources/KmlDataSource',
    'DataSources/PolylineOutlineMaterialProperty',
    'DataSources/SampledPositionProperty',
    'Scene/HeightReference',
    'Scene/HorizontalOrigin',
    'Scene/VerticalOrigin'
], function(
    KmlExporter,
    BoundingRectangle,
    Cartesian2,
    Cartesian3,
    Cartographic,
    Color,
    defined,
    Iso8601,
    JulianDate,
    CesiumMath,
    PerspectiveFrustum,
    Rectangle,
    TimeInterval,
    CallbackProperty,
    ColorMaterialProperty,
    Entity,
    EntityCollection,
    KmlDataSource,
    PolylineOutlineMaterialProperty,
    SampledPositionProperty,
    HeightReference,
    HorizontalOrigin,
    VerticalOrigin) {
        'use strict';

        function download(filename, data) {
            var blob = new Blob([data], { type: 'application/xml' });
            if (window.navigator.msSaveOrOpenBlob) {
                window.navigator.msSaveBlob(blob, filename);
            } else {
                var elem = window.document.createElement('a');
                elem.href = window.URL.createObjectURL(blob);
                elem.download = filename;
                document.body.appendChild(elem);
                elem.click();
                document.body.removeChild(elem);
            }
        }

        var options = {
            camera: {
                positionWC: new Cartesian3(0.0, 0.0, 0.0),
                directionWC: new Cartesian3(0.0, 0.0, 1.0),
                upWC: new Cartesian3(0.0, 1.0, 0.0),
                pitch: 0.0,
                heading: 0.0,
                frustum: new PerspectiveFrustum(),
                computeViewRectangle: function() {
                    return Rectangle.MAX_VALUE;
                },
                pickEllipsoid: function() {
                    return undefined;
                }
            },
            canvas: {
                clientWidth: 512,
                clientHeight: 512
            }
        };

        xit('test', function() {
            return KmlDataSource.load('../Apps/SampleData/kml/facilities/facilities.kml', options)
                .then(function(datasource) {
                    var exporter = new KmlExporter(datasource.entities);

                    var kml = exporter.toString();
                    download('test.kml', kml);
                });
        });

        function checkKmlDoc(kmlDoc, properties) {
            var kml = kmlDoc.documentElement;
            var kmlChildNodes = kml.childNodes;
            expect(kml.localName).toEqual('kml');
            expect(kmlChildNodes.length).toBe(1);

            checkTagWithProperties(kml, properties);
        }

        function checkTagWithProperties(element, properties) {
            var attributes = properties._;
            if (defined(attributes)) {
                var elementAttributes = element.attributes;
                expect(elementAttributes.length).toBe(Object.keys(attributes).length);
                for (var j = 0; j < elementAttributes.length; ++j) {
                    var nodeAttribute = elementAttributes[j];
                    var attribute = attributes[nodeAttribute.name];

                    if (typeof attribute === 'string') {
                        expect(nodeAttribute.value).toEqual(attribute);
                    } else if (typeof attribute === 'number') {
                        expect(Number(nodeAttribute.value)).toEqualEpsilon(attribute, CesiumMath.EPSILON7);
                    } else {
                        fail();
                    }
                }
            }

            var childNodes = element.childNodes;
            for (var i = 0; i < childNodes.length; ++i) {
                var node = childNodes[i];
                var property = properties[node.tagName];
                expect(property).toBeDefined();

                if (defined(property.getValue)) {
                    property = property.getValue(Iso8601.MINIMUM_VALUE);
                }

                if (typeof property === 'function') {
                    expect(property(node.textContent)).toBe(true);
                } else if (Array.isArray(property)) {
                    var values = node.textContent.split(/\s*,\s*/);
                    expect(values.length).toBe(property.length);
                    for (var k = 0; k < property.length; ++k) {
                        var p = property[k];
                        var v = values[k];
                        if (typeof p === 'string') {
                            expect(v).toEqual(p);
                        } else if (typeof p === 'number') {
                            expect(Number(v)).toEqualEpsilon(p, CesiumMath.EPSILON7);
                        } else {
                            fail();
                        }
                    }
                } else if (typeof property === 'string') {
                    expect(node.textContent).toEqual(property);
                } else if (typeof property === 'number') {
                    expect(Number(node.textContent)).toEqualEpsilon(property, CesiumMath.EPSILON7);
                } else {
                    checkTagWithProperties(node, property);
                }
            }
        }

        var counter = 0;
        var expectedPointPosition = [-75.59777, 40.03883, 12];
        var pointPosition = Cartesian3.fromDegrees(expectedPointPosition[0], expectedPointPosition[1], expectedPointPosition[2]);
        function createEntity(properties) {
            ++counter;
            var options = {
                id: 'e' + counter,
                name: 'entity' + counter,
                show: true,
                description: 'This is entity number ' + counter,
                position: pointPosition
            };

            if (defined(properties)) {
                for (var propertyName in properties) {
                    if (properties.hasOwnProperty(propertyName)) {
                        options[propertyName] = properties[propertyName];
                    }
                }
            }

            return new Entity(options);
        }

        function createExpectResult(entity) {
            return {
                Document: {
                    Style: {
                        _: {
                            id: 'style-1'
                        }
                    },
                    Placemark: {
                        _: {
                            id: entity.id
                        },
                        name: entity.name,
                        visibility: entity.show ? 1 : 0,
                        description: entity.description,
                        styleUrl: '#style-1'
                    }
                }
            };
        }

        beforeEach(function() {
            counter = 0;
        });

        it('Hierarchy', function() {
            var entity1 = createEntity({
                show: false,
                position: undefined
            });

            var entity2 = createEntity({
                position: undefined,
                parent: entity1
            });

            var entity3 = createEntity({
                parent: entity2,
                point: {}
            });

            var entities = new EntityCollection();
            entities.add(entity1);
            entities.add(entity2);
            entities.add(entity3);

            var hierarchy = {
                Document: {
                    Style: {
                        _: {
                            id: 'style-1'
                        },
                        IconStyle: {}
                    },
                    Folder: {
                        _: {
                            id: entity1.id
                        },
                        name: entity1.name,
                        visibility: '0',
                        description: entity1.description,
                        Folder: {
                            _: {
                                id: entity2.id
                            },
                            name: entity2.name,
                            visibility: '1',
                            description: entity2.description,
                            Placemark: {
                                _: {
                                    id: entity3.id
                                },
                                Point: {
                                    altitudeMode: 'clampToGround',
                                    coordinates: expectedPointPosition
                                },
                                name: entity3.name,
                                visibility: '1',
                                description: entity3.description,
                                styleUrl: '#style-1'
                            }
                        }
                    }
                }
            };

            var kmlExporter = new KmlExporter(entities);
            checkKmlDoc(kmlExporter._kmlDoc, hierarchy);
        });

        describe('Point Geometry', function() {
            it('Point with constant position', function() {
                var entity1 = createEntity({
                    point: {
                        color: Color.LINEN,
                        pixelSize: 3,
                        heightReference: HeightReference.CLAMP_TO_GROUND
                    }
                });

                var entities = new EntityCollection();
                entities.add(entity1);

                var expectedResult = createExpectResult(entity1);
                expectedResult.Document.Style.IconStyle = {
                    color: 'ffe6f0fa',
                    colorMode: 'normal',
                    scale: 3 / 32
                };
                expectedResult.Document.Placemark.Point = {
                    altitudeMode: 'clampToGround',
                    coordinates: expectedPointPosition
                };

                var kmlExporter = new KmlExporter(entities);
                checkKmlDoc(kmlExporter._kmlDoc, expectedResult);
            });

            it('Billboard with constant position', function() {
                var entity1 = createEntity({
                    billboard: {
                        image: 'http://test.invalid/image.jpg',
                        imageSubRegion: new BoundingRectangle(12,0,24,36),
                        color: Color.LINEN,
                        scale: 2,
                        pixelOffset: new Cartesian2(2, 3),
                        width: 24,
                        height: 36,
                        horizontalOrigin: HorizontalOrigin.LEFT,
                        verticalOrigin: VerticalOrigin.BOTTOM,
                        rotation: CesiumMath.toRadians(10),
                        alignedAxis: Cartesian3.UNIT_Z,
                        heightReference: HeightReference.CLAMP_TO_GROUND
                    }
                });

                var entities = new EntityCollection();
                entities.add(entity1);

                var expectedResult = createExpectResult(entity1);
                expectedResult.Document.Style.IconStyle = {
                    Icon: {
                        href: 'http://test.invalid/image.jpg',
                        x: 12,
                        y: 0,
                        w: 24,
                        h: 36
                    },
                    color: 'ffe6f0fa',
                    colorMode: 'normal',
                    scale: 2,
                    hotSpot: {
                        _: {
                            x: -2 / 2,
                            y: 3 / 2,
                            xunits: 'pixels',
                            yunits: 'pixels'
                        }
                    },
                    heading: -10
                };
                expectedResult.Document.Placemark.Point = {
                    altitudeMode: 'clampToGround',
                    coordinates: expectedPointPosition
                };

                var kmlExporter = new KmlExporter(entities);
                checkKmlDoc(kmlExporter._kmlDoc, expectedResult);
            });

            it('Billboard with AlignedAxis not Z', function() {
                var entity1 = createEntity({
                    billboard: {
                        rotation: CesiumMath.toRadians(10),
                        alignedAxis: Cartesian3.UNIT_Y
                    }
                });

                var entities = new EntityCollection();
                entities.add(entity1);

                var expectedResult = createExpectResult(entity1);
                expectedResult.Document.Style.IconStyle = {};
                expectedResult.Document.Placemark.Point = {
                    altitudeMode: 'clampToGround',
                    coordinates: expectedPointPosition
                };

                var kmlExporter = new KmlExporter(entities);
                checkKmlDoc(kmlExporter._kmlDoc, expectedResult);
            });

            it('Billboard with 0 degree heading should be 360', function() {
                var entity1 = createEntity({
                    billboard: {
                        rotation: CesiumMath.toRadians(0),
                        alignedAxis: Cartesian3.UNIT_Z
                    }
                });

                var entities = new EntityCollection();
                entities.add(entity1);

                var expectedResult = createExpectResult(entity1);
                expectedResult.Document.Style.IconStyle = {
                    heading: 360
                };
                expectedResult.Document.Placemark.Point = {
                    altitudeMode: 'clampToGround',
                    coordinates: expectedPointPosition
                };

                var kmlExporter = new KmlExporter(entities);
                checkKmlDoc(kmlExporter._kmlDoc, expectedResult);
            });

            it('Billboard with HotSpot at the center', function() {
                var entity1 = createEntity({
                    billboard: {
                        pixelOffset: new Cartesian2(2, 3),
                        width: 24,
                        height: 36,
                        horizontalOrigin: HorizontalOrigin.CENTER,
                        verticalOrigin: VerticalOrigin.CENTER
                    }
                });

                var entities = new EntityCollection();
                entities.add(entity1);

                var expectedResult = createExpectResult(entity1);
                expectedResult.Document.Style.IconStyle = {
                    hotSpot: {
                        _: {
                            x: -(2 - 12),
                            y: 3 + 18,
                            xunits: 'pixels',
                            yunits: 'pixels'
                        }
                    }
                };
                expectedResult.Document.Placemark.Point = {
                    altitudeMode: 'clampToGround',
                    coordinates: expectedPointPosition
                };

                var kmlExporter = new KmlExporter(entities);
                checkKmlDoc(kmlExporter._kmlDoc, expectedResult);
            });

            it('Billboard with HotSpot at the TopRight', function() {
                var entity1 = createEntity({
                    billboard: {
                        pixelOffset: new Cartesian2(2, 3),
                        width: 24,
                        height: 36,
                        horizontalOrigin: HorizontalOrigin.RIGHT,
                        verticalOrigin: VerticalOrigin.TOP
                    }
                });

                var entities = new EntityCollection();
                entities.add(entity1);

                var expectedResult = createExpectResult(entity1);
                expectedResult.Document.Style.IconStyle = {
                    hotSpot: {
                        _: {
                            x: -(2 - 24),
                            y: 3 + 36,
                            xunits: 'pixels',
                            yunits: 'pixels'
                        }
                    }
                };
                expectedResult.Document.Placemark.Point = {
                    altitudeMode: 'clampToGround',
                    coordinates: expectedPointPosition
                };

                var kmlExporter = new KmlExporter(entities);
                checkKmlDoc(kmlExporter._kmlDoc, expectedResult);
            });

            it('Billboard with a Canvas image', function() {
                var entity1 = createEntity({
                    billboard: {
                        image: document.createElement('canvas')
                    }
                });

                var entities = new EntityCollection();
                entities.add(entity1);

                var expectedResult = createExpectResult(entity1);
                expectedResult.Document.Style.IconStyle = {
                    Icon: {
                        href: 'http://test.invalid/images/myTexture.jpg'
                    }
                };
                expectedResult.Document.Placemark.Point = {
                    altitudeMode: 'clampToGround',
                    coordinates: expectedPointPosition
                };

                var kmlExporter = new KmlExporter(entities, {
                    textureCallback: function(texture) {
                        if (texture instanceof HTMLCanvasElement) {
                            return 'http://test.invalid/images/myTexture.jpg';
                        }

                        fail();
                    }
                });
                checkKmlDoc(kmlExporter._kmlDoc, expectedResult);
            });
        });

        describe('Tracks', function() {
            var times = [
                JulianDate.fromIso8601('2019-06-17'),
                JulianDate.fromIso8601('2019-06-18'),
                JulianDate.fromIso8601('2019-06-19')
            ];
            var positions = [
                Cartesian3.fromDegrees(-75.59777, 40.03883, 12),
                Cartesian3.fromDegrees(-76.59777, 39.03883, 12),
                Cartesian3.fromDegrees(-77.59777, 38.03883, 12)
            ];

            function checkWhen(textContent) {
                var count = times.length;
                for (var i=0;i<count;++i) {
                    if (textContent === JulianDate.toIso8601(times[i])) {
                        return true;
                    }
                }

                return false;
            }

            function checkCoord(textContent) {
                var values = textContent.split(/\s*,\s*/);
                expect(values.length).toBe(3);

                var cartographic1 = new Cartographic();
                var cartographic2 = new Cartographic();
                var count = positions.length;
                for (var i=0;i<count;++i) {
                    Cartographic.fromCartesian(positions[i], undefined, cartographic1);
                    Cartographic.fromDegrees(Number(values[0]), Number(values[1]), Number(values[2]), cartographic2);
                    if (Cartographic.equalsEpsilon(cartographic1, cartographic2, CesiumMath.EPSILON7)) {
                        return true;
                    }
                }

                return false;
            }

            it('SampledPosition', function() {
                var position = new SampledPositionProperty();
                position.addSamples(times, positions);

                var entity1 = createEntity({
                    position: position,
                    point: {}
                });

                var entities = new EntityCollection();
                entities.add(entity1);

                var expectedResult = createExpectResult(entity1);
                expectedResult.Document.Style.IconStyle = {};
                expectedResult.Document.Placemark.Track = {
                    altitudeMode: 'clampToGround',
                    when: checkWhen,
                    coord: checkCoord
                };

                var kmlExporter = new KmlExporter(entities);
                checkKmlDoc(kmlExporter._kmlDoc, expectedResult);
            });

            it('CallbackProperty', function() {
                var index = 0;
                var position = new CallbackProperty(function(time) {
                    expect(index < times.length);
                    expect(JulianDate.equals(time, times[index])).toBe(true);

                    return positions[index++];
                }, false);

                var entity1 = createEntity({
                    position: position,
                    point: {}
                });

                var entities = new EntityCollection();
                entities.add(entity1);

                var expectedResult = createExpectResult(entity1);
                expectedResult.Document.Style.IconStyle = {};
                expectedResult.Document.Placemark.Track = {
                    altitudeMode: 'clampToGround',
                    when: checkWhen,
                    coord: checkCoord
                };

                var kmlExporter = new KmlExporter(entities, {
                    defaultAvailability: new TimeInterval({
                        start: times[0],
                        stop: times[2]
                    }),
                    sampleDuration: JulianDate.secondsDifference(times[1], times[0])
                });
                checkKmlDoc(kmlExporter._kmlDoc, expectedResult);
            });
        });

        describe('Polylines', function() {
            var positions = [
                Cartesian3.fromDegrees(-1, -1, 12),
                Cartesian3.fromDegrees(1, -1, 12),
                Cartesian3.fromDegrees(1, 1, 12),
                Cartesian3.fromDegrees(-1, 1, 12)
            ];

            it('Clamped to ground', function() {
                var entity1 = createEntity({
                    polyline: {
                        positions: positions,
                        clampToGround: true,
                        material: new ColorMaterialProperty(Color.GREEN),
                        width: 5,
                        zIndex: 2
                    }
                });

                var entities = new EntityCollection();
                entities.add(entity1);

                var expectedResult = createExpectResult(entity1);
                expectedResult.Document.Style.LineStyle = {

                };
                expectedResult.Document.Placemark.Polyline = {
                    altitudeMode: 'clampToGround',
                    coordinates: expectedPointPosition
                };

                var kmlExporter = new KmlExporter(entities);
                checkKmlDoc(kmlExporter._kmlDoc, expectedResult);
            });

            it('Not clamped to ground', function() {
                var entity1 = createEntity({
                    polyline: {
                        positions: positions,
                        clampToGround: false,
                        material: new ColorMaterialProperty(Color.GREEN),
                        width: 5,
                        zIndex: 2
                    }
                });

                var entities = new EntityCollection();
                entities.add(entity1);

                var expectedResult = createExpectResult(entity1);
                expectedResult.Document.Style.LineStyle = {

                };
                expectedResult.Document.Placemark.Polyline = {
                    altitudeMode: 'clampToGround',
                    coordinates: expectedPointPosition
                };

                var kmlExporter = new KmlExporter(entities);
                checkKmlDoc(kmlExporter._kmlDoc, expectedResult);
            });

            it('With outline', function() {
                var entity1 = createEntity({
                    polyline: {
                        positions: positions,
                        clampToGround: false,
                        material: new PolylineOutlineMaterialProperty({
                            color: Color.GREEN,
                            outlineColor: Color.BLUE,
                            outlineWidth: 2
                        }),
                        width: 5,
                        zIndex: 2
                    }
                });

                var entities = new EntityCollection();
                entities.add(entity1);

                var expectedResult = createExpectResult(entity1);
                expectedResult.Document.Style.LineStyle = {

                };
                expectedResult.Document.Placemark.Polyline = {
                    altitudeMode: 'clampToGround',
                    coordinates: expectedPointPosition
                };

                var kmlExporter = new KmlExporter(entities);
                checkKmlDoc(kmlExporter._kmlDoc, expectedResult);
            });
        });

        describe('Polygons', function() {
            var positions = [
                Cartesian3.fromDegrees(-1, -1, 12),
                Cartesian3.fromDegrees(1, -1, 12),
                Cartesian3.fromDegrees(1, 1, 12),
                Cartesian3.fromDegrees(-1, 1, 12)
            ];

            it('Polygon with outline', function(){
                var entity1 = createEntity({
                    polygon: {
                        hierarchy: positions,
                        height: 10,
                        perPositionHeight: false,
                        heightReference: HeightReference.CLAMP_TO_GROUND,
                        extrudedHeight: 0,
                        fill: true,
                        material: new ColorMaterialProperty(Color.GREEN),
                        outline: true,
                        outlineWidth: 5,
                        outlineColor: Color.BLUE,
                        zIndex: 2
                    }
                });

                var entities = new EntityCollection();
                entities.add(entity1);

                var expectedResult = createExpectResult(entity1);
                expectedResult.Document.Style.PolyStyle = {

                };
                expectedResult.Document.Style.LineStyle = {

                };
                expectedResult.Document.Placemark.Polygon = {
                    altitudeMode: 'clampToGround',
                    coordinates: expectedPointPosition
                };

                var kmlExporter = new KmlExporter(entities);
                checkKmlDoc(kmlExporter._kmlDoc, expectedResult);
            });

            it('Polygon with extrusion', function(){
                var entity1 = createEntity({
                    polygon: {
                        hierarchy: positions,
                        height: 10,
                        perPositionHeight: false,
                        extrudedHeight: 20
                    }
                });

                var entities = new EntityCollection();
                entities.add(entity1);

                var expectedResult = createExpectResult(entity1);
                expectedResult.Document.Style.PolyStyle = {

                };
                expectedResult.Document.Style.LineStyle = {

                };
                expectedResult.Document.Placemark.Polygon = {
                    altitudeMode: 'clampToGround',
                    coordinates: expectedPointPosition
                };

                var kmlExporter = new KmlExporter(entities);
                checkKmlDoc(kmlExporter._kmlDoc, expectedResult);
            });

            it('Polygon with extrusion and perPositionHeights', function(){
                var entity1 = createEntity({
                    polygon: {
                        hierarchy: positions,
                        height: 10,
                        perPositionHeight: true,
                        extrudedHeight: 20
                    }
                });

                var entities = new EntityCollection();
                entities.add(entity1);

                var expectedResult = createExpectResult(entity1);
                expectedResult.Document.Style.PolyStyle = {

                };
                expectedResult.Document.Style.LineStyle = {

                };
                expectedResult.Document.Placemark.Polygon = {
                    altitudeMode: 'clampToGround',
                    coordinates: expectedPointPosition
                };

                var kmlExporter = new KmlExporter(entities);
                checkKmlDoc(kmlExporter._kmlDoc, expectedResult);
            });

            it('Rectangle', function(){
                var entity1 = createEntity({
                    rectangle: {
                        hierarchy: Rectangle.fromDegrees(-1, -1, 1, 1),
                        height: 10,
                        perPositionHeight: false,
                        heightReference: HeightReference.CLAMP_TO_GROUND,
                        extrudedHeight: 0,
                        fill: true,
                        material: new ColorMaterialProperty(Color.GREEN),
                        outline: true,
                        outlineWidth: 5,
                        outlineColor: Color.BLUE,
                        zIndex: 2
                    }
                });

                var entities = new EntityCollection();
                entities.add(entity1);

                var expectedResult = createExpectResult(entity1);
                expectedResult.Document.Style.PolyStyle = {

                };
                expectedResult.Document.Style.LineStyle = {

                };
                expectedResult.Document.Placemark.Polygon = {
                    altitudeMode: 'clampToGround',
                    coordinates: expectedPointPosition
                };

                var kmlExporter = new KmlExporter(entities);
                checkKmlDoc(kmlExporter._kmlDoc, expectedResult);
            });
        });

        describe('Models', function() {

        });
    });
