/*global defineSuite*/
defineSuite([
         'Widgets/Viewer/viewerDynamicObjectMixin',
         'Specs/EventHelper',
         'Widgets/Viewer/Viewer'
     ], function(
         viewerDynamicObjectMixin,
         EventHelper,
         Viewer) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('adds trackedObject property', function() {
        var viewer = new Viewer(document.body);
        expect(viewer.hasOwnProperty('trackedObject')).toEqual(false);
        viewer.extend(viewerDynamicObjectMixin);
        expect(viewer.hasOwnProperty('trackedObject')).toEqual(true);
        expect(viewer.trackedObject).toBeUndefined();
        viewer.destroy();
    });
});