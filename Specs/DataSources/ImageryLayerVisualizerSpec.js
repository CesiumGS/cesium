/*global defineSuite*/
defineSuite([
        'DataSources/ImageryLayerVisualizer',
        'DataSources/CzmlDataSource'
    ], function(
        ImageryLayerVisualizer,
        CzmlDataSource) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('foo', function() {
        var dataSource = new CzmlDataSource();
        dataSource.process([
            {
                id : 'document',
                version : '1.0'
            },
            {
                imageryLayer : {
                    alpha : 0.5,
                    zIndex : 10,
                    webMapService : {
                        url : 'http://geoserver.research.nicta.com.au/geotopo_250k/ows',
                        layers : 'railways',
                        parameters : {
                            format : 'image/png',
                            transparent : true,
                            styles : ''
                        }
                    }
                }
            }
        ]);
    });

}, 'WebGL');
