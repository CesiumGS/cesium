/*global defineSuite*/
defineSuite(['DynamicScene/KmlDataSource',
             'DynamicScene/DynamicObjectCollection',
             'Core/loadXML',
             'Core/Event'
            ], function(
                    KmlDataSource,
                    loadXML,
                    DynamicObjectCollection,
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
        expect(dataSource.getIsTimeVarying()).toEqual(false);
    });

    it('Test loading Kml', function() {
        var dataSource = new KmlDataSource();
        var url = 'http://localhost:8080/Apps/CesiumViewer/Gallery/KML_Samples.kml';

        dataSource.loadUrl(url);
    });
});