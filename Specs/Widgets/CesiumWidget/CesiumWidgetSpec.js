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
         'Scene/SkyBox',
         'Scene/TileCoordinatesImageryProvider',
         'Specs/EventHelper'
     ], function(
         CesiumWidget,
         Clock,
         ScreenSpaceEventHandler,
         CentralBody,
         EllipsoidTerrainProvider,
         Scene,
         SceneMode,
         SceneTransitioner,
         SkyBox,
         TileCoordinatesImageryProvider,
         EventHelper) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var container;
    var widget;
    beforeEach(function() {
        container = document.createElement('div');
        container.id = 'container';
        container.style.width = '1px';
        container.style.height = '1px';
        container.style.overflow = 'hidden';
        container.style.position = 'relative';
        document.body.appendChild(container);
    });

    afterEach(function() {
        if (widget && !widget.isDestroyed()) {
            widget = widget.destroy();
        }
        document.body.removeChild(container);
    });

    it('can create, render, and destroy', function() {
        widget = new CesiumWidget(container);
        expect(widget.isDestroyed()).toEqual(false);
        expect(widget.container).toBeInstanceOf(HTMLElement);
        expect(widget.canvas).toBeInstanceOf(HTMLElement);
        expect(widget.creditContainer).toBeInstanceOf(HTMLElement);
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
        widget = new CesiumWidget('container');
    });

    it('sets expected options clock', function() {
        var options = {
            clock : new Clock()
        };
        widget = new CesiumWidget(container, options);
        expect(widget.clock).toBe(options.clock);
    });

    it('can set scene mode 2D', function() {
        widget = new CesiumWidget(container, {
            sceneMode : SceneMode.SCENE2D
        });
        expect(widget.scene.mode).toBe(SceneMode.SCENE2D);
    });

    it('can set scene mode Columbus', function() {
        widget = new CesiumWidget(container, {
            sceneMode : SceneMode.COLUMBUS_VIEW
        });
        expect(widget.scene.mode).toBe(SceneMode.COLUMBUS_VIEW);
    });

    it('can disable render loop', function() {
        widget = new CesiumWidget(container, {
            useDefaultRenderLoop : false
        });
        expect(widget.useDefaultRenderLoop).toBe(false);
    });

    it('sets expected options imageryProvider', function() {
        var options = {
            imageryProvider : new TileCoordinatesImageryProvider()
        };
        widget = new CesiumWidget(container, options);
        var imageryLayers = widget.centralBody.getImageryLayers();
        expect(imageryLayers.getLength()).toEqual(1);
        expect(imageryLayers.get(0).getImageryProvider()).toBe(options.imageryProvider);
    });

    it('does not create an ImageryProvider if option is false', function() {
        widget = new CesiumWidget(container, {
            imageryProvider : false
        });
        var imageryLayers = widget.centralBody.getImageryLayers();
        expect(imageryLayers.getLength()).toEqual(0);
    });

    it('sets expected options terrainProvider', function() {
        var options = {
            terrainProvider : new EllipsoidTerrainProvider()
        };
        widget = new CesiumWidget(container, options);
        expect(widget.centralBody.terrainProvider).toBe(options.terrainProvider);
    });

    it('sets expected options skyBox', function() {
        var options = {
            skyBox : new SkyBox({
                sources : {
                    positiveX : './Data/Images/Blue.png',
                    negativeX : './Data/Images/Green.png',
                    positiveY : './Data/Images/Blue.png',
                    negativeY : './Data/Images/Green.png',
                    positiveZ : './Data/Images/Blue.png',
                    negativeZ : './Data/Images/Green.png'
                }
            })
        };
        widget = new CesiumWidget(container, options);
        expect(widget.scene.skyBox).toBe(options.skyBox);
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

        widget = new CesiumWidget(container, {
            contextOptions : contextOptions
        });

        var contextAttributes = widget.scene.getContext()._gl.getContextAttributes();
        expect(contextAttributes).toEqual(contextOptions);
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

    it('raises onRenderLoopError and stops the render loop when render throws', function() {
        widget = new CesiumWidget(container);
        expect(widget.useDefaultRenderLoop).toEqual(true);

        var spyListener = jasmine.createSpy('listener');
        widget.onRenderLoopError.addEventListener(spyListener);

        var error = 'foo';
        widget.render = function() {
            throw error;
        };

        waitsFor(function() {
            return spyListener.wasCalled;
        });

        runs(function() {
            expect(spyListener).toHaveBeenCalledWith(widget, error);
            expect(widget.useDefaultRenderLoop).toEqual(false);
        });
    });

    it('shows the error panel when render throws', function() {
        widget = new CesiumWidget(container);

        var error = 'foo';
        widget.render = function() {
            throw error;
        };

        waitsFor(function() {
            return !widget.useDefaultRenderLoop;
        });

        runs(function() {
            expect(widget._element.querySelector('.cesium-widget-errorPanel')).not.toBeNull();
            expect(widget._element.querySelector('.cesium-widget-errorPanel-message').textContent).toEqual(error);

            // click the OK button to dismiss the panel
            EventHelper.fireClick(widget._element.querySelector('.cesium-widget-button'));

            expect(widget._element.querySelector('.cesium-widget-errorPanel')).toBeNull();
        });
    });

    it('does not show the error panel if disabled', function() {
        widget = new CesiumWidget(container, {
            showRenderLoopErrors : false
        });

        var error = 'foo';
        widget.render = function() {
            throw error;
        };

        waitsFor(function() {
            return !widget.useDefaultRenderLoop;
        });

        runs(function() {
            expect(widget._element.querySelector('.cesium-widget-errorPanel')).toBeNull();
        });
    });
}, 'WebGL');
