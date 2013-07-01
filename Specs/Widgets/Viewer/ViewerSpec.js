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
             'DynamicScene/DataSourceDisplay',
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
                    DataSourceDisplay,
                    DataSourceCollection,
                    EllipsoidTerrainProvider,
                    SceneMode) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var testProvider = {
            isReady : function() {
                return false;
            }
        };

    var testProviderViewModel = new ImageryProviderViewModel({
        name : 'name',
        tooltip : 'tooltip',
        iconUrl : 'url',
        creationFunction : function() {
            return testProvider;
        }
    });

    var container;
    beforeEach(function(){
        container = document.createElement('span');
        container.id = 'container';
        container.style.width = '1px';
        container.style.height = '1px';
        document.body.appendChild(container);
    });

    afterEach(function(){
        document.body.removeChild(container);
    });

    it('constructor sets default values', function() {
        var viewer = new Viewer(container);
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        expect(viewer.dataSourceDisplay).toBeInstanceOf(DataSourceDisplay);
        expect(viewer.dataSources).toBeInstanceOf(DataSourceCollection);
        expect(viewer.canvas).toBe(viewer.cesiumWidget.canvas);
        expect(viewer.cesiumLogo).toBe(viewer.cesiumWidget.cesiumLogo);
        expect(viewer.sceneTransitioner).toBe(viewer.cesiumWidget.sceneTransitioner);
        expect(viewer.screenSpaceEventHandler).toBe(viewer.cesiumWidget.screenSpaceEventHandler);
        expect(viewer.isDestroyed()).toEqual(false);
        viewer.destroy();
        expect(viewer.isDestroyed()).toEqual(true);
    });

    it('constructor works with container id string', function() {
        var viewer = new Viewer('container');
        expect(viewer.container).toBe(container);
        viewer.destroy();
    });

    it('can shut off HomeButton', function() {
        var viewer = new Viewer(container, {
            homeButton : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeUndefined();
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.resize();
        viewer.render();
        viewer.destroy();
    });

    it('can shut off SceneModePicker', function() {
        var viewer = new Viewer(container, {
            sceneModePicker : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeUndefined();
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.resize();
        viewer.render();
        viewer.destroy();
    });

    it('can shut off BaseLayerPicker', function() {
        var viewer = new Viewer(container, {
            baseLayerPicker : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeUndefined();
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.resize();
        viewer.render();
        viewer.destroy();
    });

    it('can shut off Animation', function() {
        var viewer = new Viewer(container, {
            animation : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeUndefined();
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.resize();
        viewer.render();
        viewer.destroy();
    });

    it('can shut off Timeline', function() {
        var viewer = new Viewer(container, {
            timeline : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeUndefined();
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.resize();
        viewer.render();
        viewer.destroy();
    });

    it('can shut off FullscreenButton', function() {
        var viewer = new Viewer(container, {
            fullscreenButton : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeUndefined();
        viewer.resize();
        viewer.render();
        viewer.destroy();
    });

    it('can shut off FullscreenButton and Timeline', function() {
        var viewer = new Viewer(container, {
            timeline: false,
            fullscreenButton : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeUndefined();
        expect(viewer.fullscreenButton).toBeUndefined();
        viewer.resize();
        viewer.render();
        viewer.destroy();
    });

    it('can shut off FullscreenButton, Timeline, and Animation', function() {
        var viewer = new Viewer(container, {
            timeline: false,
            fullscreenButton : false,
            animation : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeUndefined(Animation);
        expect(viewer.timeline).toBeUndefined();
        expect(viewer.fullscreenButton).toBeUndefined();
        viewer.resize();
        viewer.render();
        viewer.destroy();
    });

    it('can set terrainProvider', function() {
        var provider = new EllipsoidTerrainProvider();
        var viewer = new Viewer(container, {
            terrainProvider : provider
        });
        expect(viewer.centralBody.terrainProvider).toBe(provider);
        viewer.destroy();
    });

    it('can set fullScreenElement', function() {
        var testElement = document.createElement('span');
        var viewer = new Viewer(container, {
            fullscreenElement : testElement
        });
        expect(viewer.fullscreenButton.viewModel.fullscreenElement).toBe(testElement);
        viewer.destroy();
    });

    it('can set contextOptions', function() {
        var contextOptions = {
            alpha : true,
            depth : true, //TODO Change to false when https://bugzilla.mozilla.org/show_bug.cgi?id=745912 is fixed.
            stencil : true,
            antialias : false,
            premultipliedAlpha : false,
            preserveDrawingBuffer : true
        };

        var viewer = new Viewer(container, {
            contextOptions : contextOptions
        });

        var contextAttributes = viewer.scene.getContext()._gl.getContextAttributes();
        expect(contextAttributes).toEqual(contextOptions);
        viewer.destroy();
    });

    it('can set scene mode', function() {
        var viewer = new Viewer(container, {
            sceneMode : SceneMode.SCENE2D
        });
        expect(viewer.scene.mode).toBe(SceneMode.SCENE2D);
        viewer.destroy();
    });

    it('can set selectedImageryProviderViewModel', function() {
        var viewer = new Viewer(container, {
            selectedImageryProviderViewModel : testProviderViewModel
        });
        expect(viewer.centralBody.getImageryLayers().getLength()).toEqual(1);
        expect(viewer.centralBody.getImageryLayers().get(0).getImageryProvider()).toBe(testProvider);
        expect(viewer.baseLayerPicker.viewModel.selectedItem).toBe(testProviderViewModel);
        viewer.destroy();
    });

    it('can set imageryProvider when BaseLayerPicker is disabled', function() {
        var viewer = new Viewer(container, {
            baseLayerPicker : false,
            imageryProvider : testProvider
        });
        expect(viewer.centralBody.getImageryLayers().getLength()).toEqual(1);
        expect(viewer.centralBody.getImageryLayers().get(0).getImageryProvider()).toBe(testProvider);
        viewer.destroy();
    });

    it('can set imageryProviderViewModels', function() {
        var models = [testProviderViewModel];
        var viewer = new Viewer(container, {
            imageryProviderViewModels : models
        });
        expect(viewer.centralBody.getImageryLayers().getLength()).toEqual(1);
        expect(viewer.centralBody.getImageryLayers().get(0).getImageryProvider()).toBe(testProvider);
        expect(viewer.baseLayerPicker.viewModel.selectedItem).toBe(testProviderViewModel);
        expect(viewer.baseLayerPicker.viewModel.imageryProviderViewModels).toEqual(models);
        viewer.destroy();
    });

    it('can disable render loop', function() {
        var viewer = new Viewer(container, {
            useDefaultRenderLoop : false
        });
        expect(viewer.useDefaultRenderLoop).toBe(false);
        viewer.destroy();
    });

    it('constructor throws with undefined container', function() {
        expect(function() {
            return new Viewer(undefined);
        }).toThrow();
    });

    it('constructor throws with non-existant string container', function() {
        expect(function() {
            return new Viewer('doesNotExist');
        }).toThrow();
    });

    it('constructor throws if using selectedImageryProviderViewModel with BaseLayerPicker disabled', function() {
        expect(function() {
            return new Viewer(container, {
                baseLayerPicker : false,
                selectedImageryProviderViewModel : testProviderViewModel
            });
        }).toThrow();
    });

    it('constructor throws if using imageryProvider with BaseLayerPicker enabled', function() {
        expect(function() {
            return new Viewer(container, {
                imageryProvider : testProvider
            });
        }).toThrow();
    });

    it('extend throws with undefined mixin', function() {
        var viewer = new Viewer(container);
        expect(function() {
            return viewer.extend(undefined);
        }).toThrow();
        viewer.destroy();
    });
});