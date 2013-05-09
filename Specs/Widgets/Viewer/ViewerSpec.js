/*global defineSuite*/
defineSuite(['Widgets/Viewer/Viewer',
             'Widgets/Animation/Animation',
             'Widgets/BaseLayerPicker/BaseLayerPicker',
             'Widgets/CesiumWidget/CesiumWidget',
             'Widgets/FullscreenButton/FullscreenButton',
             'Widgets/HomeButton/HomeButton',
             'Widgets/SceneModePicker/SceneModePicker',
             'Widgets/Timeline/Timeline',
             'DynamicScene/DataSourceCollection'
            ], function(
                    Viewer,
                    Animation,
                    BaseLayerPicker,
                    CesiumWidget,
                    FullscreenButton,
                    HomeButton,
                    SceneModePicker,
                    Timeline,
                    DataSourceCollection) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var cssElement;
    beforeAll(function(){
        cssElement = document.createElement('link');
        cssElement.href = '/Source/Widgets/Viewer/Viewer.css';
        cssElement.rel = 'stylesheet';
        cssElement.type = 'text/css';
        document.body.appendChild(cssElement);
    });

    afterAll(function(){
        document.body.removeChild(cssElement);
    });

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

    it('can shut off HomeButtom', function() {
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

    it('can shut off HomeButtom', function() {
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