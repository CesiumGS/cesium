/*global defineSuite*/
defineSuite(['DynamicScene/KmlDataSource',
             'DynamicScene/ConstantProperty',
             'DynamicScene/DynamicObjectCollection',
             'DynamicScene/DynamicMaterialProperty',
             'DynamicScene/DynamicBillboard',
             'DynamicScene/DynamicPolyline',
             'DynamicScene/DynamicPolygon',
             'Core/loadXML',
             'Core/Cartographic',
             'Core/Color',
             'Core/Ellipsoid',
             'Core/Event',
             'Core/JulianDate',
             'Core/Math'
         ], function(
            KmlDataSource,
            ConstantProperty,
            DynamicObjectCollection,
            DynamicMaterialProperty,
            DynamicBillboard,
            DynamicPolyline,
            DynamicPolygon,
            loadXML,
            Cartographic,
            Color,
            Ellipsoid,
            Event,
            JulianDate,
            CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var parser = new DOMParser();

    function coordinatesArrayToCartesianArray(coordinates) {
        var positions = new Array(coordinates.length);
        for ( var i = 0; i < coordinates.length; i++) {
            var cartographic = Cartographic.fromDegrees(coordinates[i][0], coordinates[i][1], coordinates[i][2]);
            positions[i] = Ellipsoid.WGS84.cartographicToCartesian(cartographic);
        }
        return positions;
    }

    it('default constructor has expected values', function() {
        var dataSource = new KmlDataSource();
        expect(dataSource.getChangedEvent()).toBeInstanceOf(Event);
        expect(dataSource.getErrorEvent()).toBeInstanceOf(Event);
        expect(dataSource.getClock()).toBeUndefined();
        expect(dataSource.getDynamicObjectCollection()).toBeInstanceOf(DynamicObjectCollection);
        expect(dataSource.getDynamicObjectCollection().getObjects().length).toEqual(0);
        expect(dataSource.getIsTimeVarying()).toEqual(true);
    });

    it('loads shared styles', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Style id="testStyle">\
              <IconStyle>\
                  <scale>3</scale>\
              </IconStyle>\
            </Style>\
            <Placemark>\
              <styleUrl>#testStyle</styleUrl>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var objects = dataSource.getDynamicObjectCollection().getObjects();
        expect(objects.length).toEqual(1);
        expect(objects[0].billboard.scale.getValue()).toEqual(3.0);
    });

    it('loads external styles', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Placemark>\
              <styleUrl>Data/KML/externalStyle.kml#testStyle</styleUrl>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var objects = dataSource.getDynamicObjectCollection().getObjects();
        waitsFor(function() {
            return objects.length === 1;
        });

        runs(function() {
            expect(objects[0].billboard.scale.getValue()).toEqual(3.0);
        });
    });

    it('inline styles take precedance over shared styles', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Style id="testStyle">\
              <IconStyle>\
                  <scale>3</scale>\
                  <Icon>\
                    <href>http://test.invalid</href>\
                  </Icon>\
              </IconStyle>\
            </Style>\
            <Placemark>\
              <styleUrl>#testStyle</styleUrl>\
              <Style>\
                <IconStyle>\
                  <scale>2</scale>\
                </IconStyle>\
              </Style>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var objects = dataSource.getDynamicObjectCollection().getObjects();
        expect(objects.length).toEqual(1);

        var billboard = objects[0].billboard;
        expect(billboard.scale.getValue()).toEqual(2.0);
        expect(billboard.image.getValue()).toEqual('http://test.invalid');
    });

    it('processPlacemark throws error with invalid geometry', function() {
        var placemarkKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Placemark>\
              <Invalid>\
                <coordinates> </coordinates>\
              </Invalid>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        expect(function() {
            dataSource.load(placemarkKml);
        }).toThrow();
    });

    it('processMultiGeometry throws error with invalid geometry', function() {
        var placemarkKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Placemark>\
            <MultiGeometry>\
              <Invalid>\
                <coordinates> </coordinates>\
              </Invalid>\
            </MultiGeometry>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        expect(function() {
            dataSource.load(placemarkKml);
        }).toThrow();
    });

    it('handles Point Geometry', function() {
        var position = new Cartographic(CesiumMath.toRadians(1), CesiumMath.toRadians(2), 3);
        var cartesianPosition = Ellipsoid.WGS84.cartographicToCartesian(position);
        var pointKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Placemark>\
              <Point>\
                <coordinates>1,2,3</coordinates>\
              </Point>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(pointKml, "text/xml"));

        var objects = dataSource.getDynamicObjectCollection().getObjects();
        expect(objects.length).toEqual(1);
        expect(objects[0].position.getValueCartesian()).toEqual(cartesianPosition);
    });

    it('Point throws error with invalid coordinates', function() {
        var pointKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Placemark>\
              <Point>\
                <coordinates> </coordinates>\
              </Point>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        expect(function() {
            dataSource.load(pointKml);
        }).toThrow();
    });

    it('handles Point Geometry with LabelStyle', function() {
        var name = new ConstantProperty('LabelStyle.kml');
        var scale = new ConstantProperty(1.5);
        var color = new ConstantProperty(Color.fromBytes(255, 0, 0, 0));
        var pointKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Placemark>\
            <name>LabelStyle.kml</name>\
                <Style id="randomLabelColor">\
                    <LabelStyle>\
                        <color>000000ff</color>\
                        <colorMode>normal</colorMode>\
                        <scale>1.5</scale>\
                    </LabelStyle>\
                </Style>\
            <Point>\
                <coordinates>1,2,0</coordinates>\
            </Point>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(pointKml, "text/xml"));

        var objects = dataSource.getDynamicObjectCollection().getObjects();
        expect(objects.length).toEqual(1);
        expect(objects[0].label.text.getValue()).toEqual(name.getValue());
        expect(objects[0].label.scale.getValue()).toEqual(scale.getValue());
        expect(objects[0].label.fillColor.red).toEqual(color.red);
        expect(objects[0].label.fillColor.green).toEqual(color.green);
        expect(objects[0].label.fillColor.blue).toEqual(color.blue);
        expect(objects[0].label.fillColor.alpha).toEqual(color.alpha);
    });

    it('handles Line Geometry with two sets of coordinates', function() {
        var position1 = new Cartographic(CesiumMath.toRadians(1), CesiumMath.toRadians(2), 0);
        var cartesianPosition1 = Ellipsoid.WGS84.cartographicToCartesian(position1);
        var position2 = new Cartographic(CesiumMath.toRadians(4), CesiumMath.toRadians(5), 0);
        var cartesianPosition2 = Ellipsoid.WGS84.cartographicToCartesian(position2);
        var lineKml = '<?xml version="1.0" encoding="UTF-8"?>\
    <kml xmlns="http://www.opengis.net/kml/2.2">\
    <Document>\
    <Placemark>\
      <LineString>\
        <coordinates>1,2,0 \
                     4,5,0 \
        </coordinates>\
      </LineString>\
    </Placemark>\
    </Document>\
    </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(lineKml, "text/xml"));

        var objects = dataSource.getDynamicObjectCollection().getObjects();
        expect(objects.length).toEqual(1);
        expect(objects[0].vertexPositions._value[0]).toEqual(cartesianPosition1);
        expect(objects[0].vertexPositions._value[1]).toEqual(cartesianPosition2);
    });

    it('LineString throws error with invalid coordinates', function() {
        var lineKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Placemark>\
              <LineString>\
                <coordinates>1 \
                             4,5,0 \
                </coordinates>\
              </LineString>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        expect(function() {
            dataSource.load(lineKml);
        }).toThrow();
    });

    it('handles Polygon geometry', function() {
        var coordinates = [[-122.365662, 37.826988, 0],
                [-122.365202, 37.826302, 0],
                [-122.364581, 37.82655, 0],
                [-122.365038, 37.827237, 0],
                [-122.365662, 37.826988, 0]];
        coordinates = coordinatesArrayToCartesianArray(coordinates);
        var polygon = new DynamicPolygon();
        polygon.material = new DynamicMaterialProperty();
        polygon.material.processCzmlIntervals({
            solidColor : {
                color : {
                    rgba : [255, 255, 255, 255]
                }
            }
        }, undefined, undefined);
        var polygonKml = '<?xml version="1.0" encoding="UTF-8"?>\
        <kml xmlns="http://www.opengis.net/kml/2.2">\
        <Placemark>\
          <Polygon>\
            <outerBoundaryIs>\
              <LinearRing>\
                <coordinates>\
                  -122.365662,37.826988,0\
                  -122.365202,37.826302,0\
                  -122.364581,37.82655,0\
                  -122.365038,37.827237,0\
                  -122.365662,37.826988,0\
                </coordinates>\
              </LinearRing>\
            </outerBoundaryIs>\
          </Polygon>\
        </Placemark>\
        </kml>';
        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(polygonKml, "text/xml"));

        var objects = dataSource.getDynamicObjectCollection().getObjects();
        var dynamicObject = objects[0];
        expect(objects.length).toEqual(1);
        expect(dynamicObject.polygon).toBeDefined();
        for(var i = 0; i < coordinates.length; i++){
            expect(dynamicObject.vertexPositions._value[i]).toEqual(coordinates[i]);
        }
    });

    it('handles MultiGeometry', function() {
        var position1 = new Cartographic(CesiumMath.toRadians(1), CesiumMath.toRadians(2), 0);
        var cartesianPosition1 = Ellipsoid.WGS84.cartographicToCartesian(position1);
        var position2 = new Cartographic(CesiumMath.toRadians(4), CesiumMath.toRadians(5), 0);
        var cartesianPosition2 = Ellipsoid.WGS84.cartographicToCartesian(position2);
        var position3 = new Cartographic(CesiumMath.toRadians(6), CesiumMath.toRadians(7), 0);
        var cartesianPosition3 = Ellipsoid.WGS84.cartographicToCartesian(position3);
        var position4 = new Cartographic(CesiumMath.toRadians(8), CesiumMath.toRadians(9), 0);
        var cartesianPosition4 = Ellipsoid.WGS84.cartographicToCartesian(position4);
        var multiKml = '<Placemark>\
            <MultiGeometry>\
              <LineString>\
                <coordinates>\
                  1,2,0\
                  4,5,0\
                </coordinates>\
              </LineString>\
              <LineString>\
                <coordinates>\
                  6,7,0\
                  8,9,0\
                </coordinates>\
              </LineString>\
            </MultiGeometry>\
          </Placemark>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(multiKml, "text/xml"));

        var objects = dataSource.getDynamicObjectCollection().getObjects();
        expect(objects.length).toEqual(2);
        expect(objects[0].vertexPositions._value[0]).toEqual(cartesianPosition1);
        expect(objects[0].vertexPositions._value[1]).toEqual(cartesianPosition2);
        expect(objects[1].vertexPositions._value[0]).toEqual(cartesianPosition3);
        expect(objects[1].vertexPositions._value[1]).toEqual(cartesianPosition4);
    });

    it('handles MultiGeometry with style', function() {
        var multiKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Style id="randomColorIcon">\
                <IconStyle>\
                    <color>ff00ff00</color>\
                    <colorMode>normal</colorMode>\
                    <scale>1.1</scale>\
                    <Icon>\
                    <href>http://maps.google.com/mapfiles/kml/pal3/icon21.png</href>\
                    </Icon>\
                </IconStyle>\
            </Style>\
            <Placemark>\
            <name>IconStyle.kml</name>\
            <styleUrl>#randomColorIcon</styleUrl>\
                <MultiGeometry>\
                <Point>\
                    <coordinates>-9.171441666666666,38.67883055555556,0</coordinates>\
                </Point>\
                <Point>\
                    <coordinates>-122.367375,37.829192,0</coordinates>\
                </Point>\
                </MultiGeometry>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(multiKml, "text/xml"));

        var objects = dataSource.getDynamicObjectCollection().getObjects();
        var object1 = objects[0];
        var object2 = objects[1];
        expect(objects.length).toEqual(2);
        expect(object1.billboard.scale.getValue()).toEqual(object2.billboard.scale.getValue());
        expect(object1.billboard.image.getValue()).toEqual(object2.billboard.image.getValue());
        expect(object1.billboard.color.red).toEqual(object2.billboard.color.red);
        expect(object1.billboard.color.green).toEqual(object2.billboard.color.green);
        expect(object1.billboard.color.blue).toEqual(object2.billboard.color.blue);
        expect(object1.billboard.color.alpha).toEqual(object2.billboard.color.alpha);
    });

    it('handles LineStyle', function() {
        var width = new ConstantProperty(4);
        var outerWidth = new ConstantProperty(0);
        var lineKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Style id="testStyle">\
            <LineStyle>\
            <color>000000ff</color>\
            <width>4</width>\
            <gx:labelVisibility>1</gx:labelVisibility>\
            <gx:outerColor>ffffffff</gx:outerColor>\
            <gx:outerWidth>0.0</gx:outerWidth>\
            <gx:physicalWidth>0.0</gx:physicalWidth>\
            <gx:labelVisibility>0</gx:labelVisibility>\
            </LineStyle>\
            </Style>\
            <Placemark>\
            <styleUrl>#testStyle</styleUrl>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(lineKml, "text/xml"));

        var objects = dataSource.getDynamicObjectCollection().getObjects();
        expect(objects.length).toEqual(1);
        expect(objects[0].polyline.width.getValue()).toEqual(width.getValue());
        expect(objects[0].polyline.outlineWidth.getValue()).toEqual(outerWidth.getValue());
    });

    it('handles PolyStyle', function() {
        var color = new Color(1, 0, 0, 0);
        var polyKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Style id="testStyle">\
                <PolyStyle>\
                    <color>000000ff</color>\
                    <colorMode>normal</colorMode>\
                    <fill>1</fill>\
                    <outline>1</outline>\
                </PolyStyle>\
            </Style>\
            <Placemark>\
            <styleUrl>#testStyle</styleUrl>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(polyKml, "text/xml"));

        var objects = dataSource.getDynamicObjectCollection().getObjects();
        var polygon = objects[0].polygon;
        var time = new JulianDate();
        var material = polygon.material.getValue(time);
        var generatedColor = material.uniforms.color;
        expect(objects.length).toEqual(1);
        expect(generatedColor.red).toEqual(color.red);
        expect(generatedColor.green).toEqual(color.green);
        expect(generatedColor.blue).toEqual(color.blue);
        expect(generatedColor.alpha).toEqual(color.alpha);
    });

    it('handles Color in normal mode', function() {
        var color = new Color(1, 0, 0, 1);
        var colorKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Style id="testStyle">\
            <IconStyle>\
                <color>ff0000ff</color>\
                <colorMode>normal</colorMode>\
            </IconStyle>\
            </Style>\
            <Placemark>\
            <styleUrl>#testStyle</styleUrl>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(colorKml, "text/xml"));

        var objects = dataSource.getDynamicObjectCollection().getObjects();
        var generatedColor = objects[0].billboard.color.getValue();
        expect(objects.length).toEqual(1);
        expect(generatedColor.red).toEqual(color.red);
        expect(generatedColor.green).toEqual(color.green);
        expect(generatedColor.blue).toEqual(color.blue);
        expect(generatedColor.alpha).toEqual(color.alpha);
    });

    it('handles Color in random mode', function() {
        var color = new Color(1, 0, 0, 1);
        var colorKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Style id="testStyle">\
            <IconStyle>\
                <color>ff0000ff</color>\
                <colorMode>random</colorMode>\
            </IconStyle>\
            </Style>\
            <Placemark>\
            <styleUrl>#testStyle</styleUrl>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(colorKml, "text/xml"));

        var objects = dataSource.getDynamicObjectCollection().getObjects();
        var generatedColor = objects[0].billboard.color.getValue();
        expect(objects.length).toEqual(1);
        expect(generatedColor.red <= color.red).toBe(true);
        expect(generatedColor.green).toEqual(color.green);
        expect(generatedColor.blue).toEqual(color.blue);
        expect(generatedColor.alpha).toEqual(color.alpha);
    });

    it('load throws with undefined KML', function() {
        var dataSource = new KmlDataSource();
        expect(function() {
            dataSource.load(undefined);
        }).toThrow();
    });

    it('loadUrl throws with undefined Url', function() {
        var dataSource = new KmlDataSource();
        expect(function() {
            dataSource.loadUrl(undefined);
        }).toThrow();
    });

    it('loadUrl raises error with invalid url', function() {
        var dataSource = new KmlDataSource();
        var thrown = false;
        dataSource.getErrorEvent().addEventListener(function() {
            thrown = true;
        });
        dataSource.loadUrl('invalid.kml');
        waitsFor(function() {
            return thrown;
        });
    });
});