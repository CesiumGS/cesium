/*global defineSuite*/
defineSuite(['DynamicScene/KmlDataSource',
             'DynamicScene/ConstantProperty',
             'DynamicScene/DynamicObjectCollection',
             'DynamicScene/DynamicBillboard',
             'DynamicScene/DynamicPolyline',
             'Core/loadXML',
             'Core/Cartographic',
             'Core/Color',
             'Core/Ellipsoid',
             'Core/Event',
             'Core/Math'
            ], function(
                    KmlDataSource,
                    ConstantProperty,
                    DynamicObjectCollection,
                    DynamicBillboard,
                    DynamicPolyline,
                    loadXML,
                    Cartographic,
                    Color,
                    Ellipsoid,
                    Event,
                    CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

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
        var externalKml = '<?xml version="1.0" encoding="UTF-8"?>\
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

        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(externalKml, "text/xml");

        var dataSource = new KmlDataSource();
        dataSource.load(xmlDoc);

        var objects = dataSource.getDynamicObjectCollection().getObjects();
        expect(objects.length).toEqual(1);
        expect(objects[0].billboard.scale.getValue()).toEqual(3.0);
    });

    it('loads external styles', function() {
        var externalKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Placemark>\
              <styleUrl>Data/KML/externalStyle.kml#testStyle</styleUrl>\
            </Placemark>\
            </Document>\
            </kml>';

        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(externalKml, "text/xml");

        var dataSource = new KmlDataSource();
        dataSource.load(xmlDoc);

        var objects = dataSource.getDynamicObjectCollection().getObjects();
        expect(objects.length).toEqual(1);
        expect(objects[0].billboard.scale.getValue()).toEqual(3.0);
    });

    it('inline styles take precedance over shared styles', function() {
        var externalKml = '<?xml version="1.0" encoding="UTF-8"?>\
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

        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(externalKml, "text/xml");

        var dataSource = new KmlDataSource();
        dataSource.load(xmlDoc);

        var objects = dataSource.getDynamicObjectCollection().getObjects();
        expect(objects.length).toEqual(1);

        var billboard = objects[0].billboard;
        expect(billboard.scale.getValue()).toEqual(2.0);
        expect(billboard.image.getValue()).toEqual('http://test.invalid');
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

        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(pointKml, "text/xml");

        var dataSource = new KmlDataSource();
        dataSource.load(xmlDoc);

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

        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(pointKml, "text/xml");

        var dataSource = new KmlDataSource();
        dataSource.load(xmlDoc);

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

        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(lineKml, "text/xml");

        var dataSource = new KmlDataSource();
        dataSource.load(xmlDoc);

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

    it('handles Color in normal mode', function() {
        var color = new ConstantProperty(Color.fromBytes(255, 0, 0, 0));
        var colorKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Style id="testStyle">\
            <IconStyle>\
                <color>000000ff</color>\
                <colorMode>normal</colorMode>\
            </IconStyle>\
            </Style>\
            <Placemark>\
            <styleUrl>#testStyle</styleUrl>\
            </Placemark>\
            </Document>\
            </kml>';

        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(colorKml, "text/xml");

        var dataSource = new KmlDataSource();
        dataSource.load(xmlDoc);

        var objects = dataSource.getDynamicObjectCollection().getObjects();
        expect(objects.length).toEqual(1);
        expect(objects[0].billboard.color.red).toEqual(color.red);
        expect(objects[0].billboard.color.green).toEqual(color.green);
        expect(objects[0].billboard.color.blue).toEqual(color.blue);
        expect(objects[0].billboard.color.alpha).toEqual(color.alpha);
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