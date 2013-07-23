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
        expect(dataSource.getDynamicObjectCollection().getObjects().length).toEqual(1);
        expect(dataSource.getDynamicObjectCollection().getObjects()[0].position.getValueCartesian()).toEqual(cartesianPosition);
    });

    it('handles Point Geometry without altitude', function() {
        var position = new Cartographic(CesiumMath.toRadians(1), CesiumMath.toRadians(2), 0);
        var cartesianPosition = Ellipsoid.WGS84.cartographicToCartesian(position);
        var pointKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Placemark>\
              <Point>\
                <coordinates>1,2</coordinates>\
              </Point>\
            </Placemark>\
            </Document>\
            </kml>';

        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(pointKml, "text/xml");

        var dataSource = new KmlDataSource();
        dataSource.load(xmlDoc);
        expect(dataSource.getDynamicObjectCollection().getObjects().length).toEqual(1);
        expect(dataSource.getDynamicObjectCollection().getObjects()[0].position.getValueCartesian()).toEqual(cartesianPosition);
    });

    it('handles Point Geometry with LabelStyle', function() {
        var position = new Cartographic(CesiumMath.toRadians(1), CesiumMath.toRadians(2), 0);
        var cartesianPosition = Ellipsoid.WGS84.cartographicToCartesian(position);
        var name = new ConstantProperty('LabelStyle.kml');
        var scale = new ConstantProperty('1.5');
        var color = new ConstantProperty(Color.fromRgba(parseInt('ff0000cc', 16)));
        var pointKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Style id="randomLabelColor">\
                <LabelStyle>\
                    <color>ff0000cc</color>\
                    <scale>1.5</scale>\
                </LabelStyle>\
            </Style>\
            <Placemark>\
                <name>LabelStyle.kml</name>\
                <styleUrl>#randomLabelColor</styleUrl>\
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
        expect(dataSource.getDynamicObjectCollection().getObjects().length).toEqual(1);
        expect(dataSource.getDynamicObjectCollection().getObjects()[0].position.getValueCartesian()).toEqual(cartesianPosition);
        expect(dataSource.getDynamicObjectCollection().getObjects()[0].label.text._value).toEqual(name._value);
        expect(dataSource.getDynamicObjectCollection().getObjects()[0].label.scale._value).toEqual(scale._value);
        expect(dataSource.getDynamicObjectCollection().getObjects()[0].label.fillColor._value).toEqual(color._value);
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
        <coordinates>1,2,0 4,5,0</coordinates>\
      </LineString>\
    </Placemark>\
    </Document>\
    </kml>';

        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(lineKml, "text/xml");

        var dataSource = new KmlDataSource();
        dataSource.load(xmlDoc);
        expect(dataSource.getDynamicObjectCollection().getObjects().length).toEqual(1);
        //TODO test the two positions defined
    });

    it('Simple Test loading Kml', function() {
        var dataSource = new KmlDataSource();
        var url = 'http://localhost:8080/Apps/CesiumViewer/Gallery/simplePlacemark.kml';

        dataSource.loadUrl(url);
    });

    it('Test loading Kml', function() {
        var dataSource = new KmlDataSource();
        var url = 'http://localhost:8080/Apps/CesiumViewer/Gallery/KML_Samples.kml';

        dataSource.loadUrl(url);
    });
});