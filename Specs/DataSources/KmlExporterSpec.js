defineSuite([
    'DataSources/KmlExporter',
    'Core/Cartesian3',
    'Core/defined',
    'Core/PerspectiveFrustum',
    'Core/Rectangle',
    'DataSources/Entity',
    'DataSources/EntityCollection',
    'DataSources/KmlDataSource',
    'Specs/pollToPromise'
], function(
    KmlExporter,
    Cartesian3,
    defined,
    PerspectiveFrustum,
    Rectangle,
    Entity,
    EntityCollection,
    KmlDataSource,
    pollToPromise) {
'use strict';

    function download(filename, data) {
        var blob = new Blob([data], {type: 'application/xml'});
        if(window.navigator.msSaveOrOpenBlob) {
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
        camera : {
            positionWC : new Cartesian3(0.0, 0.0, 0.0),
            directionWC : new Cartesian3(0.0, 0.0, 1.0),
            upWC : new Cartesian3(0.0, 1.0, 0.0),
            pitch : 0.0,
            heading : 0.0,
            frustum : new PerspectiveFrustum(),
            computeViewRectangle : function() {
                return Rectangle.MAX_VALUE;
            },
            pickEllipsoid : function() {
                return undefined;
            }
        },
        canvas : {
            clientWidth : 512,
            clientHeight : 512
        }
    };

    it('test', function() {
        return KmlDataSource.load('../Apps/SampleData/kml/facilities/facilities.kml', options)
            .then(function(datasource) {
                var exporter = new KmlExporter(datasource.entities);

                var kml = exporter.toString();
                download('test.kml', kml);
            });
    });

    function checkTagWithProperties(element, properties) {
        // TODO: Maybe check child length

        var childNodes = element.childNodes;
        for (var i=0;i<childNodes.length;++i) {
            var node = childNodes[i];
            var property = properties[node.tagName];
            expect(property).toBeDefined();

            var attributes = property.attributes;
            // TODO: Check attributes of node

            var children = property.children;
            if (defined(children)) {
                checkTagWithProperties(node, children);
            } else if(typeof property === 'string') {
                expect(node.textContent).toEqual(property);
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
                children: {
                    Style: {
                        attributes: {
                            id: 'style-1'
                        }
                    },
                    Folder: {
                        attributes: {
                            id: entity1.id
                        },
                        children: {
                            name: entity1.name,
                            visibility: '0',
                            description: entity1.description,
                            Folder: {
                                attributes: {
                                    id: entity2.id
                                },
                                children: {
                                    name: entity2.name,
                                    visibility: '1',
                                    description: entity2.description,
                                    Placemark: {
                                        attributes: {
                                            id: entity3.id
                                        },
                                        children: {
                                            Point: {

                                            }
                                        },
                                        name: entity3.name,
                                        visibility: '1',
                                        description: entity3.description
                                    }
                                }
                            }
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
                show: false,
                description: 'This is an entity'
            });

            entities.add();
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
