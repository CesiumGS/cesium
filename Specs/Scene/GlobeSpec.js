/*global defineSuite*/
defineSuite([
        'Scene/Globe',
        'Core/CesiumTerrainProvider',
        'Core/defined',
        'Core/Ellipsoid',
        'Core/loadWithXhr',
        'Core/Rectangle',
        'Renderer/ClearCommand',
        'Scene/SingleTileImageryProvider',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/pollToPromise',
        'Specs/render'
    ], function(
        Globe,
        CesiumTerrainProvider,
        defined,
        Ellipsoid,
        loadWithXhr,
        Rectangle,
        ClearCommand,
        SingleTileImageryProvider,
        createContext,
        createFrameState,
        pollToPromise,
        render) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var context;
    var frameState;
    var globe;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    beforeEach(function() {
        frameState = createFrameState();
        globe = new Globe();
    });

    afterEach(function() {
        globe.destroy();
        loadWithXhr.load = loadWithXhr.defaultLoad;
    });

    function returnTileJson(path) {
        var oldLoad = loadWithXhr.load;
        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            if (url.indexOf('layer.json') >= 0) {
                loadWithXhr.defaultLoad(path, responseType, method, data, headers, deferred);
            } else {
                return oldLoad(url, responseType, method, data, headers, deferred, overrideMimeType);
            }
        };
    }

    function returnVertexNormalTileJson() {
        return returnTileJson('Data/CesiumTerrainTileJson/VertexNormals.tile.json');
    }

    /**
     * Repeatedly calls update until the load queue is empty.  Returns a promise that resolves
     * when the load queue is empty.
     */
    function updateUntilDone(globe) {
        // update until the load queue is empty.
        return pollToPromise(function() {
            globe._surface._debug.enableDebugOutput = true;
            var commandList = [];
            globe.update(context, frameState, commandList);
            return globe._surface.tileProvider.ready && !defined(globe._surface._tileLoadQueue.head) && globe._surface._debug.tilesWaitingForChildren === 0;
        });
    }

    it('renders with enableLighting', function() {
        globe.enableLighting = true;

        var layerCollection = globe.imageryLayers;
        layerCollection.removeAll();
        layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        frameState.camera.viewRectangle(new Rectangle(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

        return updateUntilDone(globe).then(function() {
            ClearCommand.ALL.execute(context);
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);

            render(context, frameState, globe);
            expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
        });
    });

    it('renders with showWaterEffect set to false', function() {
        globe.showWaterEffect = false;

        var layerCollection = globe.imageryLayers;
        layerCollection.removeAll();
        layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        frameState.camera.viewRectangle(new Rectangle(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

        return updateUntilDone(globe).then(function() {
            ClearCommand.ALL.execute(context);
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);

            render(context, frameState, globe);
            expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
        });
    });

    it('renders terrain with enableLighting', function() {
        globe.enableLighting = true;

        var layerCollection = globe.imageryLayers;
        layerCollection.removeAll();
        layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            loadWithXhr.defaultLoad('Data/CesiumTerrainTileJson/tile.vertexnormals.terrain', responseType, method, data, headers, deferred);
        };

        returnVertexNormalTileJson();

        var terrainProvider = new CesiumTerrainProvider({
            url : 'made/up/url',
            requestVertexNormals : true
        });

        globe.terrainProvider = terrainProvider;

        return pollToPromise(function() {
            return terrainProvider.ready;
        }).then(function() {
            frameState.camera.viewRectangle(new Rectangle(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

            return updateUntilDone(globe).then(function() {
                ClearCommand.ALL.execute(context);
                expect(context.readPixels()).toEqual([0, 0, 0, 0]);

                render(context, frameState, globe);
                expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);
            });
        });
    });
}, 'WebGL');