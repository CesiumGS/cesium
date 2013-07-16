/*global defineSuite*/
defineSuite(['DynamicScene/KmlDataSource',
             'DynamicScene/DynamicObjectCollection',
             'DynamicScene/DynamicBillboard',
             'Core/loadXML',
             'Core/Event'
            ], function(
                    KmlDataSource,
                    DynamicObjectCollection,
                    DynamicBillboard,
                    loadXML,
                    Event) {
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

    it('handlesPointGeometry', function() {
        var txt = '<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>';
        txt = txt + '<Style id="randomColorIcon">    <IconStyle>    <color>ffffff00</color>  <scale>2</scale>';
        txt = txt + '<Icon>  <href>http://maps.google.com/mapfiles/kml/pal3/icon23.png</href>  </Icon>  </IconStyle>   </Style>';
        txt = txt + '<Placemark>  <name>IconStyle.kml</name>      <styleUrl>#randomColorIcon</styleUrl>';
        txt = txt + '<Point>  <coordinates>-9.171441666666666,38.67883055555556,0</coordinates>   </Point>   </Placemark></Document></kml>';
        var dataSource = new KmlDataSource();

        var parser=new DOMParser();
        var xmlDoc=parser.parseFromString(txt,"text/xml");

        dataSource.load(xmlDoc);
        expect(dataSource.getDynamicObjectCollection()).toBeInstanceOf(DynamicObjectCollection);
        expect(dataSource.getDynamicObjectCollection().getObjects().length).toEqual(1);
        expect(dataSource.getDynamicObjectCollection().getObjects()[0].billboard).toBeInstanceOf(DynamicBillboard);
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