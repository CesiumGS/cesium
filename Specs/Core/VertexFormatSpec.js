/*global defineSuite*/
defineSuite([
        'Core/VertexFormat',
        'Specs/createPackableSpecs'
    ], function(
        VertexFormat,
        createPackableSpecs) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    createPackableSpecs(VertexFormat, VertexFormat.POSITION_AND_NORMAL, [1.0, 1.0, 0.0, 0.0, 0.0, 0.0]);
});
