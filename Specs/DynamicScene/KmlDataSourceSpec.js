/*global defineSuite*/
defineSuite(['DynamicScene/KmlDataSource',
             'DynamicScene/DynamicObjectCollection',
             'DynamicScene/DynamicBillboard',
             'DynamicScene/DynamicPolyline',
             'Core/loadXML',
             'Core/Cartographic',
             'Core/Ellipsoid',
             'Core/Event',
             'Core/Math'
            ], function(
                    KmlDataSource,
                    DynamicObjectCollection,
                    DynamicBillboard,
                    DynamicPolyline,
                    loadXML,
                    Cartographic,
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

    it('handlesLineGeometry', function() {
        var txt = '<?xml version="1.0" encoding="UTF-8"?> <kml xmlns="http://www.opengis.net/kml/2.2"><Document>';
        txt = txt + '<name>LineString.kml</name>  <open>1</open> <LookAt><longitude>-122.36415</longitude><latitude>37.824553</latitude>';
        txt = txt + '<altitude>0</altitude><range>150</range>    <tilt>50</tilt> <heading>0</heading> </LookAt>';
        txt = txt + '<Placemark> <name>unextruded</name> <LineString> <extrude>1</extrude><tessellate>1</tessellate>';
        txt = txt + '<coordinates>-122.364383,37.824664,0 -122.364152,37.824322,0</coordinates></LineString></Placemark>';
        txt = txt + '<Placemark> <name>extruded</name><LineString><extrude>1</extrude><tessellate>1</tessellate><altitudeMode>relativeToGround</altitudeMode>';
        txt = txt + '<coordinates>-122.364167,37.824787,50 -122.363917,37.824423,50</coordinates></LineString></Placemark></Document></kml>';
        var dataSource = new KmlDataSource();

        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(txt, "text/xml");

        dataSource.load(xmlDoc);
        expect(dataSource.getDynamicObjectCollection()).toBeInstanceOf(DynamicObjectCollection);
        expect(dataSource.getDynamicObjectCollection().getObjects().length).toEqual(1);
        expect(dataSource.getDynamicObjectCollection().getObjects()[0].polyline).toBeInstanceOf(DynamicPolyline);
        expect(dataSource.getDynamicObjectCollection().getObjects()[0].position).toBeDefined();
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