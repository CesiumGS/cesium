defineSuite([
    'DataSources/KmlExporter',
    'Core/Cartesian3',
    'Core/Color',
    'Core/defined',
    'Core/Iso8601',
    'Core/Math',
    'Core/PerspectiveFrustum',
    'Core/Rectangle',
    'DataSources/Entity',
    'DataSources/EntityCollection',
    'DataSources/KmlDataSource',
    'Scene/HeightReference',
    'Specs/pollToPromise'
], function(
    KmlExporter,
    Cartesian3,
    Color,
    defined,
    Iso8601,
    CesiumMath,
    PerspectiveFrustum,
    Rectangle,
    Entity,
    EntityCollection,
    KmlDataSource,
    HeightReference,
    pollToPromise) {
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

        function checkTagWithProperties(element, properties) {
            var numberOfProperties = Object.keys(properties).length;
            var attributes = properties._;
            if (defined(attributes)) {
                --numberOfProperties; // Attributes

                var elementAttributes = element.attributes;
                expect(elementAttributes.length).toBe(Object.keys(attributes).length);
                for (var j = 0; j < elementAttributes.length; ++j) {
                    var nodeAttribute = elementAttributes[j];
                    var attribute = attributes[nodeAttribute.name];
                    expect(attribute).toEqual(nodeAttribute.value);
                }
            }

            var childNodes = element.childNodes;
            expect(childNodes.length).toBe(numberOfProperties);
            for (var i = 0; i < childNodes.length; ++i) {
                var node = childNodes[i];
                var property = properties[node.tagName];
                expect(property).toBeDefined();

                if (defined(property.getValue)) {
                    property = property.getValue(Iso8601.MINIMUM_VALUE);
                }

                if (Array.isArray(property)) {
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

        it('Hierarchy', function() {
            var entity1 = new Entity({
                id: 'e1',
                name: 'entity1',
                show: false,
                description: 'This is an entity'
            });

            var entity2 = new Entity({
                id: 'e2',
                name: 'entity2',
                show: true,
                description: 'This is another entity',
                parent: entity1
            });

            var entity3 = new Entity({
                id: 'e3',
                name: 'entity3',
                show: true,
                description: 'This is an entity with geometry',
                parent: entity2,
                position: Cartesian3.fromDegrees(-75.59777, 40.03883),
                point: {}
            });

            var entities = new EntityCollection();
            entities.add(entity1);
            entities.add(entity2);
            entities.add(entity3);

            var kmlExporter = new KmlExporter(entities);

            var kmlDoc = kmlExporter._kmlDoc;

            // <kml>
            var kml = kmlDoc.documentElement;
            var kmlChildNodes = kml.childNodes;
            expect(kml.localName).toEqual('kml');
            expect(kmlChildNodes.length).toBe(1);

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
                                    coordinates: [-75.59777, 40.03883, 0]
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

            checkTagWithProperties(kml, hierarchy);
        });

        describe('Points', function() {
            it('Constant Postion', function() {
                var entities = new EntityCollection();

                var entity1 = new Entity({
                    id: 'e1',
                    name: 'entity1',
                    show: true,
                    description: 'This is an entity',
                    position: Cartesian3.fromDegrees(-75.59777, 40.03883, 12),
                    point: {
                        color: Color.LINEN,
                        pixelSize: 3,
                        heightReference: HeightReference.CLAMP_TO_GROUND
                    }
                });

                entities.add(entity1);

                var kmlExporter = new KmlExporter(entities);

                var kmlDoc = kmlExporter._kmlDoc;

                // <kml>
                var kml = kmlDoc.documentElement;
                var kmlChildNodes = kml.childNodes;
                expect(kml.localName).toEqual('kml');
                expect(kmlChildNodes.length).toBe(1);

                var hierarchy = {
                    Document: {
                        Style: {
                            _: {
                                id: 'style-1'
                            },
                            IconStyle: {
                                color: 'ffe6f0fa',
                                colorMode: 'normal',
                                scale: 3 / 32
                            }
                        },
                        Placemark: {
                            _: {
                                id: entity1.id
                            },
                            Point: {
                                altitudeMode: 'clampToGround',
                                coordinates: [-75.59777, 40.03883, 12]
                            },
                            name: entity1.name,
                            visibility: '1',
                            description: entity1.description,
                            styleUrl: '#style-1'
                        }
                    }
                };

                checkTagWithProperties(kml, hierarchy);
            });

            it('Altitude modes', function() {

            });
        });

        describe('Billboards', function() {

        });

        describe('Polylines', function() {

        });

        describe('Rectangles', function() {

        });

        describe('Polygons', function() {

        });
    });
