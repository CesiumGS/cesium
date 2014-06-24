/*global defineSuite*/
defineSuite([
        'Widgets/Viewer/viewerDynamicObjectMixin',
        'Core/Cartesian3',
        'DynamicScene/ConstantPositionProperty',
        'DynamicScene/ConstantProperty',
        'DynamicScene/DynamicObject',
        'Scene/CameraFlightPath',
        'Specs/MockDataSource',
        'Widgets/Viewer/Viewer'
    ], function(
        viewerDynamicObjectMixin,
        Cartesian3,
        ConstantPositionProperty,
        ConstantProperty,
        DynamicObject,
        CameraFlightPath,
        MockDataSource,
        Viewer) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var container;
    var viewer;
    beforeEach(function() {
        container = document.createElement('span');
        container.id = 'container';
        container.style.display = 'none';
        document.body.appendChild(container);
    });

    afterEach(function() {
        if (viewer && !viewer.isDestroyed()) {
            viewer = viewer.destroy();
        }

        document.body.removeChild(container);
    });

    it('adds properties', function() {
        viewer = new Viewer(container);
        viewer.extend(viewerDynamicObjectMixin);
        expect(viewer.hasOwnProperty('trackedObject')).toEqual(true);
        expect(viewer.hasOwnProperty('selectedObject')).toEqual(true);
    });

    it('can get and set trackedObject', function() {
        viewer = new Viewer(container);
        viewer.extend(viewerDynamicObjectMixin);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantProperty(new Cartesian3(123456, 123456, 123456));

        viewer.trackedObject = dynamicObject;
        expect(viewer.trackedObject).toBe(dynamicObject);

        viewer.trackedObject = undefined;
        expect(viewer.trackedObject).toBeUndefined();
    });

    it('can get and set selectedObject', function() {
        var viewer = new Viewer(container);
        viewer.extend(viewerDynamicObjectMixin);

        var dataSource = new MockDataSource();
        viewer.dataSources.add(dataSource);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantPositionProperty(new Cartesian3(123456, 123456, 123456));

        dataSource.dynamicObjects.add(dynamicObject);

        viewer.selectedObject = dynamicObject;
        expect(viewer.selectedObject).toBe(dynamicObject);

        viewer.selectedObject = undefined;
        expect(viewer.selectedObject).toBeUndefined();

        viewer.destroy();
    });

    it('home button resets tracked object', function() {
        viewer = new Viewer(container);
        viewer.extend(viewerDynamicObjectMixin);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantProperty(new Cartesian3(123456, 123456, 123456));

        viewer.trackedObject = dynamicObject;
        expect(viewer.trackedObject).toBe(dynamicObject);

        //Needed to avoid actually creating a flight when we issue the home command.
        spyOn(CameraFlightPath, 'createTween').andReturn({
            startObject : {},
            stopObject: {},
            duration : 0.0
        });

        viewer.homeButton.viewModel.command();
        expect(viewer.trackedObject).toBeUndefined();
    });

    it('throws with undefined viewer', function() {
        expect(function() {
            viewerDynamicObjectMixin(undefined);
        }).toThrowDeveloperError();
    });

    it('throws if trackedObject property already added by another mixin.', function() {
        viewer = new Viewer(container);
        viewer.trackedObject = true;
        expect(function() {
            viewer.extend(viewerDynamicObjectMixin);
        }).toThrowDeveloperError();
    });

    it('throws if selectedObject property already added by another mixin.', function() {
        viewer = new Viewer(container);
        viewer.selectedObject = true;
        expect(function() {
            viewer.extend(viewerDynamicObjectMixin);
        }).toThrowDeveloperError();
    });

    it('returns to home when a tracked object is removed', function() {
        viewer = new Viewer(container);

        //one data source that is added before mixing in
        var preMixinDataSource = new MockDataSource();
        viewer.dataSources.add(preMixinDataSource);

        var beforeDynamicObject = new DynamicObject();
        beforeDynamicObject.position = new ConstantProperty(new Cartesian3(123456, 123456, 123456));
        preMixinDataSource.dynamicObjects.add(beforeDynamicObject);

        viewer.extend(viewerDynamicObjectMixin);

        //one data source that is added after mixing in
        var postMixinDataSource = new MockDataSource();
        viewer.dataSources.add(postMixinDataSource);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantProperty(new Cartesian3(123456, 123456, 123456));
        postMixinDataSource.dynamicObjects.add(dynamicObject);

        viewer.trackedObject = dynamicObject;
        expect(viewer.trackedObject).toBe(dynamicObject);

        // spy on the home button's command
        Object.defineProperty(viewer.homeButton.viewModel, 'command', {
            value : jasmine.createSpy('command')
        });

        postMixinDataSource.dynamicObjects.remove(dynamicObject);

        expect(viewer.homeButton.viewModel.command).toHaveBeenCalled();

        // reset the spy before removing the other dynamic object
        viewer.homeButton.viewModel.command.reset();

        viewer.trackedObject = beforeDynamicObject;
        preMixinDataSource.dynamicObjects.remove(beforeDynamicObject);

        expect(viewer.homeButton.viewModel.command).toHaveBeenCalled();
    });

    it('removes data source listeners when destroyed', function() {
        viewer = new Viewer(container);

        //one data source that is added before mixing in
        var preMixinDataSource = new MockDataSource();
        viewer.dataSources.add(preMixinDataSource);

        viewer.extend(viewerDynamicObjectMixin);

        //one data source that is added after mixing in
        var postMixinDataSource = new MockDataSource();
        viewer.dataSources.add(postMixinDataSource);

        var preMixinListenerCount = preMixinDataSource.dynamicObjects.collectionChanged._listeners.length;
        var postMixinListenerCount = postMixinDataSource.dynamicObjects.collectionChanged._listeners.length;

        viewer = viewer.destroy();

        expect(preMixinDataSource.dynamicObjects.collectionChanged._listeners.length).not.toEqual(preMixinListenerCount);
        expect(postMixinDataSource.dynamicObjects.collectionChanged._listeners.length).not.toEqual(postMixinListenerCount);
    });
}, 'WebGL');