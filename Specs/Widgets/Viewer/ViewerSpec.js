/*global defineSuite*/
defineSuite(['Widgets/Viewer/Viewer',
             'Widgets/Animation/Animation',
             'Widgets/BaseLayerPicker/BaseLayerPicker',
             'Widgets/BaseLayerPicker/ImageryProviderViewModel',
             'Widgets/CesiumWidget/CesiumWidget',
             'Widgets/FullscreenButton/FullscreenButton',
             'Widgets/HomeButton/HomeButton',
             'Widgets/SceneModePicker/SceneModePicker',
             'Widgets/Timeline/Timeline',
             'DynamicScene/DataSourceCollection',
             'Scene/EllipsoidTerrainProvider',
             'Scene/SceneMode'
            ], function(
                    Viewer,
                    Animation,
                    BaseLayerPicker,
                    ImageryProviderViewModel,
                    CesiumWidget,
                    FullscreenButton,
                    HomeButton,
                    SceneModePicker,
                    Timeline,
                    DataSourceCollection,
                    EllipsoidTerrainProvider,
                    SceneMode) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor sets default values', function() {
        var viewer = new Viewer(document.body);
        expect(viewer.container).toBe(document.body);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        expect(viewer.dataSources).toBeInstanceOf(DataSourceCollection);
        viewer.destroy();
    });

    it('can shut off HomeButton', function() {
        var viewer = new Viewer(document.body, {
            homeButton : false
        });
        expect(viewer.container).toBe(document.body);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeUndefined();
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.destroy();
    });

    it('can shut off SceneModePicker', function() {
        var viewer = new Viewer(document.body, {
            sceneModePicker : false
        });
        expect(viewer.container).toBe(document.body);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeUndefined();
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.destroy();
    });

    it('can shut off BaseLayerPicker', function() {
        var viewer = new Viewer(document.body, {
            baseLayerPicker : false
        });
        expect(viewer.container).toBe(document.body);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeUndefined();
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.destroy();
    });

    it('can shut off Animation', function() {
        var viewer = new Viewer(document.body, {
            animation : false
        });
        expect(viewer.container).toBe(document.body);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeUndefined();
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.destroy();
    });

    it('can shut off Timeline', function() {
        var viewer = new Viewer(document.body, {
            timeline : false
        });
        expect(viewer.container).toBe(document.body);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeUndefined();
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.destroy();
    });

    it('can shut off FullscreenButton', function() {
        var viewer = new Viewer(document.body, {
            fullscreenButton : false
        });
        expect(viewer.container).toBe(document.body);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeUndefined();
        viewer.destroy();
    });

    it('can set terrainProvider', function() {
        var provider = new EllipsoidTerrainProvider();
        var viewer = new Viewer(document.body, {
            terrainProvider : provider
        });
        expect(viewer.cesiumWidget.centralBody.terrainProvider).toBe(provider);
        viewer.destroy();
    });

    it('can set fullScreenElement', function() {
        var testElement = document.createElement('span');
        var viewer = new Viewer(document.body, {
            fullscreenElement : testElement
        });
        expect(viewer.fullscreenButton.viewModel.fullscreenElement()).toBe(testElement);
        viewer.destroy();
    });

    it('can set scene mode', function() {
        var viewer = new Viewer(document.body, {
            sceneMode : SceneMode.SCENE2D
        });
        expect(viewer.cesiumWidget.scene.mode).toBe(SceneMode.SCENE2D);
        viewer.destroy();
    });

    var testProvider = {
            isReady : function() {
                return false;
            }
        };

    var testProviderViewModel = ImageryProviderViewModel.fromConstants({
        name : 'name',
        tooltip : 'tooltip',
        iconUrl : 'url',
        creationFunction : function() {
            return testProvider;
        }
    });

    it('can set selectedImageryProviderViewModel', function() {
        var viewer = new Viewer(document.body, {
            selectedImageryProviderViewModel : testProviderViewModel
        });
        expect(viewer.cesiumWidget.centralBody.getImageryLayers().getLength()).toEqual(1);
        expect(viewer.cesiumWidget.centralBody.getImageryLayers().get(0).getImageryProvider()).toBe(testProvider);
        expect(viewer.baseLayerPicker.viewModel.selectedItem()).toBe(testProviderViewModel);
        viewer.destroy();
    });

    it('can set imageryProviderViewModels', function() {
        var models = [testProviderViewModel];
        var viewer = new Viewer(document.body, {
            imageryProviderViewModels : models
        });
        expect(viewer.cesiumWidget.centralBody.getImageryLayers().getLength()).toEqual(1);
        expect(viewer.cesiumWidget.centralBody.getImageryLayers().get(0).getImageryProvider()).toBe(testProvider);
        expect(viewer.baseLayerPicker.viewModel.selectedItem()).toBe(testProviderViewModel);
        expect(viewer.baseLayerPicker.viewModel.imageryProviderViewModels()).toBe(models);
        viewer.destroy();
    });


    it('constructor works with container id string', function() {
        var container = document.createElement('span');
        container.id = 'container';
        document.body.appendChild(container);
        var viewer = new Viewer('container');
        expect(viewer.container).toBe(container);
        viewer.destroy();
        document.body.removeChild(container);
    });

    it('constructor throws with undefined container', function() {
        expect(function() {
            return new Viewer(undefined);
        }).toThrow();
    });

    it('constructor throws with non-existant string container', function() {
        expect(function() {
            return new Viewer('container');
        }).toThrow();
    });
});