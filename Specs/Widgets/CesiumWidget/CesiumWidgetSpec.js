/*global defineSuite*/
defineSuite([
         'Widgets/CesiumWidget/CesiumWidget',
         'Core/Clock',
         'Core/ScreenSpaceEventHandler',
         'Scene/CentralBody',
         'Scene/EllipsoidTerrainProvider',
         'Scene/Scene',
         'Scene/SceneMode',
         'Scene/SceneTransitioner',
         'Scene/TileCoordinatesImageryProvider'
     ], function(
         CesiumWidget,
         Clock,
         ScreenSpaceEventHandler,
         CentralBody,
         EllipsoidTerrainProvider,
         Scene,
         SceneMode,
         SceneTransitioner,
         TileCoordinatesImageryProvider) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

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

    it('can create, render, and destroy', function() {
        var widget = new CesiumWidget(container);
        expect(widget.isDestroyed()).toEqual(false);
        expect(widget.container).toBeInstanceOf(HTMLElement);
        expect(widget.canvas).toBeInstanceOf(HTMLElement);
        expect(widget.cesiumLogo).toBeInstanceOf(HTMLElement);
        expect(widget.scene).toBeInstanceOf(Scene);
        expect(widget.centralBody).toBeInstanceOf(CentralBody);
        expect(widget.clock).toBeInstanceOf(Clock);
        expect(widget.sceneTransitioner).toBeInstanceOf(SceneTransitioner);
        expect(widget.screenSpaceEventHandler).toBeInstanceOf(ScreenSpaceEventHandler);
        widget.render();
        widget.destroy();
        expect(widget.isDestroyed()).toEqual(true);
    });

    it('can pass id string for container', function() {
        var widget = new CesiumWidget('container');
        widget.destroy();
    });

    it('sets expected options clock', function() {
        var options = {
            clock : new Clock()
        };
        var widget = new CesiumWidget(container, options);
        expect(widget.clock).toBe(options.clock);
        widget.destroy();
    });

    it('can set scene mode 2D', function() {
        var widget = new CesiumWidget(container, {
            sceneMode : SceneMode.SCENE2D
        });
        expect(widget.scene.mode).toBe(SceneMode.SCENE2D);
        widget.destroy();
    });

    it('can set scene mode Columbus', function() {
        var widget = new CesiumWidget(container, {
            sceneMode : SceneMode.COLUMBUS_VIEW
        });
        expect(widget.scene.mode).toBe(SceneMode.COLUMBUS_VIEW);
        widget.destroy();
    });

    it('can disable render loop', function() {
        var widget = new CesiumWidget(container, {
            useDefaultRenderLoop : false
        });
        expect(widget.useDefaultRenderLoop).toBe(false);
        widget.destroy();
    });

    it('sets expected options imageryProvider', function() {
        var options = {
            imageryProvider : new TileCoordinatesImageryProvider()
        };
        var widget = new CesiumWidget(container, options);
        var imageryLayers = widget.centralBody.getImageryLayers();
        expect(imageryLayers.getLength()).toEqual(1);
        expect(imageryLayers.get(0).getImageryProvider()).toBe(options.imageryProvider);
        widget.destroy();
    });

    it('does not create an ImageryProvider if option is false', function() {
        var widget = new CesiumWidget(container, {
            imageryProvider : false
        });
        var imageryLayers = widget.centralBody.getImageryLayers();
        expect(imageryLayers.getLength()).toEqual(0);
        widget.destroy();
    });

    it('sets expected options terrainProvider', function() {
        var options = {
            terrainProvider : new EllipsoidTerrainProvider()
        };
        var widget = new CesiumWidget(container, options);
        expect(widget.centralBody.terrainProvider).toBe(options.terrainProvider);
        widget.destroy();
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

        var widget = new CesiumWidget(container, {
            contextOptions : contextOptions
        });

        var contextAttributes = widget.scene.getContext()._gl.getContextAttributes();
        expect(contextAttributes).toEqual(contextOptions);
        widget.destroy();
    });

    it('throws if no container provided', function() {
        expect(function() {
            return new CesiumWidget(undefined);
        }).toThrow();
    });

    it('throws if no container id does not exist', function() {
        expect(function() {
            return new CesiumWidget('doesnotexist');
        }).toThrow();
    });
});
