/*global defineSuite*/
defineSuite([
        'Widgets/Viewer/viewerEntityMixin',
        'Core/Cartesian3',
        'DataSources/ConstantPositionProperty',
        'DataSources/ConstantProperty',
        'DataSources/Entity',
        'Scene/CameraFlightPath',
        'Specs/MockDataSource',
        'Widgets/Viewer/Viewer'
    ], function(
        viewerEntityMixin,
        Cartesian3,
        ConstantPositionProperty,
        ConstantProperty,
        Entity,
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
        viewer.extend(viewerEntityMixin);
        expect(viewer.hasOwnProperty('trackedEntity')).toEqual(true);
        expect(viewer.hasOwnProperty('selectedEntity')).toEqual(true);
    });

    it('can get and set trackedEntity', function() {
        viewer = new Viewer(container);
        viewer.extend(viewerEntityMixin);

        var entity = new Entity();
        entity.position = new ConstantProperty(new Cartesian3(123456, 123456, 123456));

        viewer.trackedEntity = entity;
        expect(viewer.trackedEntity).toBe(entity);

        viewer.trackedEntity = undefined;
        expect(viewer.trackedEntity).toBeUndefined();
    });

    it('can get and set selectedEntity', function() {
        var viewer = new Viewer(container);
        viewer.extend(viewerEntityMixin);

        var dataSource = new MockDataSource();
        viewer.dataSources.add(dataSource);

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(123456, 123456, 123456));

        dataSource.entities.add(entity);

        viewer.selectedEntity = entity;
        expect(viewer.selectedEntity).toBe(entity);

        viewer.selectedEntity = undefined;
        expect(viewer.selectedEntity).toBeUndefined();

        viewer.destroy();
    });

    it('home button resets tracked object', function() {
        viewer = new Viewer(container);
        viewer.extend(viewerEntityMixin);

        var entity = new Entity();
        entity.position = new ConstantProperty(new Cartesian3(123456, 123456, 123456));

        viewer.trackedEntity = entity;
        expect(viewer.trackedEntity).toBe(entity);

        //Needed to avoid actually creating a flight when we issue the home command.
        spyOn(CameraFlightPath, 'createTween').andReturn({
            startObject : {},
            stopObject: {},
            duration : 0.0
        });

        viewer.homeButton.viewModel.command();
        expect(viewer.trackedEntity).toBeUndefined();
    });

    it('throws with undefined viewer', function() {
        expect(function() {
            viewerEntityMixin(undefined);
        }).toThrowDeveloperError();
    });

    it('throws if trackedEntity property already added by another mixin.', function() {
        viewer = new Viewer(container);
        viewer.trackedEntity = true;
        expect(function() {
            viewer.extend(viewerEntityMixin);
        }).toThrowDeveloperError();
    });

    it('throws if selectedEntity property already added by another mixin.', function() {
        viewer = new Viewer(container);
        viewer.selectedEntity = true;
        expect(function() {
            viewer.extend(viewerEntityMixin);
        }).toThrowDeveloperError();
    });

    it('returns to home when a tracked object is removed', function() {
        viewer = new Viewer(container);

        //one data source that is added before mixing in
        var preMixinDataSource = new MockDataSource();
        viewer.dataSources.add(preMixinDataSource);

        var beforeEntity = new Entity();
        beforeEntity.position = new ConstantProperty(new Cartesian3(123456, 123456, 123456));
        preMixinDataSource.entities.add(beforeEntity);

        viewer.extend(viewerEntityMixin);

        //one data source that is added after mixing in
        var postMixinDataSource = new MockDataSource();
        viewer.dataSources.add(postMixinDataSource);

        var entity = new Entity();
        entity.position = new ConstantProperty(new Cartesian3(123456, 123456, 123456));
        postMixinDataSource.entities.add(entity);

        viewer.trackedEntity = entity;
        expect(viewer.trackedEntity).toBe(entity);

        // spy on the home button's command
        Object.defineProperty(viewer.homeButton.viewModel, 'command', {
            value : jasmine.createSpy('command')
        });

        postMixinDataSource.entities.remove(entity);

        expect(viewer.homeButton.viewModel.command).toHaveBeenCalled();

        // reset the spy before removing the other entity
        viewer.homeButton.viewModel.command.reset();

        viewer.trackedEntity = beforeEntity;
        preMixinDataSource.entities.remove(beforeEntity);

        expect(viewer.homeButton.viewModel.command).toHaveBeenCalled();
    });

    it('removes data source listeners when destroyed', function() {
        viewer = new Viewer(container);

        //one data source that is added before mixing in
        var preMixinDataSource = new MockDataSource();
        viewer.dataSources.add(preMixinDataSource);

        viewer.extend(viewerEntityMixin);

        //one data source that is added after mixing in
        var postMixinDataSource = new MockDataSource();
        viewer.dataSources.add(postMixinDataSource);

        var preMixinListenerCount = preMixinDataSource.entities.collectionChanged._listeners.length;
        var postMixinListenerCount = postMixinDataSource.entities.collectionChanged._listeners.length;

        viewer = viewer.destroy();

        expect(preMixinDataSource.entities.collectionChanged._listeners.length).not.toEqual(preMixinListenerCount);
        expect(postMixinDataSource.entities.collectionChanged._listeners.length).not.toEqual(postMixinListenerCount);
    });
}, 'WebGL');