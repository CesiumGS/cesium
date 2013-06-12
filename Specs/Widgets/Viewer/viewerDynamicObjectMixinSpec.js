/*global defineSuite*/
defineSuite([
         'Widgets/Viewer/viewerDynamicObjectMixin',
         'Core/Cartesian3',
         'DynamicScene/DynamicObject',
         'Scene/CameraFlightPath',
         'Specs/MockProperty',
         'Widgets/Viewer/Viewer'
     ], function(
         viewerDynamicObjectMixin,
         Cartesian3,
         DynamicObject,
         CameraFlightPath,
         MockProperty,
         Viewer) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var container;
    beforeEach(function() {
        container = document.createElement('span');
        container.id = 'container';
        container.style.display = 'none';
        document.body.appendChild(container);
    });

    afterEach(function(){
        document.body.removeChild(container);
    });

    it('adds trackedObject property', function() {
        var viewer = new Viewer(container);
        viewer.extend(viewerDynamicObjectMixin);
        expect(viewer.trackedObject).toBeUndefined();
        viewer.destroy();
    });

    it('can get and set trackedObject', function() {
        var viewer = new Viewer(container);
        viewer.extend(viewerDynamicObjectMixin);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new MockProperty(new Cartesian3(123456, 123456, 123456));

        viewer.trackedObject = dynamicObject;
        expect(viewer.trackedObject).toBe(dynamicObject);

        viewer.trackedObject = undefined;
        expect(viewer.trackedObject).toBeUndefined();

        viewer.destroy();
    });

    it('home button resets tracked object', function() {
        var viewer = new Viewer(container);
        viewer.extend(viewerDynamicObjectMixin);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new MockProperty(new Cartesian3(123456, 123456, 123456));

        viewer.trackedObject = dynamicObject;
        expect(viewer.trackedObject).toBe(dynamicObject);

        //Needed to avoid actually creating a flight when we issue the home command.
        spyOn(CameraFlightPath, 'createAnimation').andReturn({
            duration : 0
        });

        viewer.homeButton.viewModel.command();
        expect(viewer.trackedObject).toBeUndefined();

        viewer.destroy();
    });

    it('throws with undefined viewer', function() {
        expect(function() {
            viewerDynamicObjectMixin(undefined);
        }).toThrow();
    });

    it('throws if dropTarget property already added by another mixin.', function() {
        var viewer = new Viewer(container);
        viewer.trackedObject = true;
        expect(function() {
            viewer.extend(viewerDynamicObjectMixin);
        }).toThrow();
        viewer.destroy();
    });
});