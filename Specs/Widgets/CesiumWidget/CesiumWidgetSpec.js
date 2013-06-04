/*global defineSuite*/
defineSuite([
         'Widgets/CesiumWidget/CesiumWidget',
         'Core/Clock',
         'Scene/CentralBody',
         'Scene/EllipsoidTerrainProvider',
         'Scene/Scene',
         'Scene/SceneTransitioner',
         'Scene/TileCoordinatesImageryProvider'
     ], function(
         CesiumWidget,
         Clock,
         CentralBody,
         EllipsoidTerrainProvider,
         Scene,
         SceneTransitioner,
         TileCoordinatesImageryProvider) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('can create, render, and destroy', function() {
        var container = document.createElement('div');
        container.id = 'testContainer';
        document.body.appendChild(container);
        var widget = new CesiumWidget(container);
        expect(widget.isDestroyed()).toEqual(false);
        expect(widget.container).toBeInstanceOf(HTMLElement);
        expect(widget.canvas).toBeInstanceOf(HTMLElement);
        expect(widget.cesiumLogo).toBeInstanceOf(HTMLElement);
        expect(widget.scene).toBeInstanceOf(Scene);
        expect(widget.centralBody).toBeInstanceOf(CentralBody);
        expect(widget.clock).toBeInstanceOf(Clock);
        expect(widget.sceneTransitioner).toBeInstanceOf(SceneTransitioner);
        widget.render();
        widget.destroy();
        expect(widget.isDestroyed()).toEqual(true);
        document.body.removeChild(container);
    });

    it('can pass id string for container', function() {
        var container = document.createElement('div');
        container.id = 'testContainer';
        document.body.appendChild(container);
        var widget = new CesiumWidget('testContainer');
        widget.destroy();
        document.body.removeChild(container);
    });

    it('sets expected options clock', function() {
        var options = {
            clock : new Clock()
        };
        var widget = new CesiumWidget(document.body, options);
        expect(widget.clock).toBe(options.clock);
        widget.destroy();
    });

    it('sets expected options imageryProvider', function() {
        var options = {
            imageryProvider : new TileCoordinatesImageryProvider()
        };
        var widget = new CesiumWidget(document.body, options);
        var imageryLayers = widget.centralBody.getImageryLayers();
        expect(imageryLayers.getLength()).toEqual(1);
        expect(imageryLayers.get(0).getImageryProvider()).toBe(options.imageryProvider);
        widget.destroy();
    });

    it('sets expected options terrainProvider', function() {
        var options = {
            terrainProvider : new EllipsoidTerrainProvider()
        };
        var widget = new CesiumWidget(document.body, options);
        expect(widget.centralBody.terrainProvider).toBe(options.terrainProvider);
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