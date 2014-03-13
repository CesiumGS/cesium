/*global defineSuite*/
defineSuite([
         'Scene/CentralBody',
         'Core/defined',
         'Core/Ellipsoid',
         'Core/Extent',
         'Renderer/ClearCommand',
         'Scene/SingleTileImageryProvider',
         'Specs/createContext',
         'Specs/createFrameState',
         'Specs/destroyContext',
         'Specs/render'
     ], function(
         CentralBody,
         defined,
         Ellipsoid,
         Extent,
         ClearCommand,
         SingleTileImageryProvider,
         createContext,
         createFrameState,
         destroyContext,
         render) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var frameState;
    var cb;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        frameState = createFrameState();
        cb = new CentralBody();
    });

    afterEach(function() {
        cb.destroy();
    });

    /**
     * Repeatedly calls update until the load queue is empty.  You must wrap any code to follow
     * this in a "runs" function.
     */
    function updateUntilDone(cb) {
        // update until the load queue is empty.
        waitsFor(function() {
            cb._surface._debug.enableDebugOutput = true;
            var commandList = [];
            cb.update(context, frameState, commandList);
            return !defined(cb._surface._tileLoadQueue.head) && cb._surface._debug.tilesWaitingForChildren === 0;
        }, 'updating to complete');
    }

    it('renders with enableLighting', function() {
        cb.enableLighting = true;

        var layerCollection = cb.imageryLayers;
        layerCollection.removeAll();
        layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        frameState.camera.viewExtent(new Extent(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

        updateUntilDone(cb);

        runs(function() {
            ClearCommand.ALL.execute(context);
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);

            render(context, frameState, cb);
            expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
        });
    });
}, 'WebGL');