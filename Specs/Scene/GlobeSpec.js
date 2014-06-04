/*global defineSuite*/
defineSuite([
        'Scene/Globe',
        'Core/defined',
        'Core/Ellipsoid',
        'Core/Rectangle',
        'Renderer/ClearCommand',
        'Scene/SingleTileImageryProvider',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/destroyContext',
        'Specs/render'
    ], function(
        Globe,
        defined,
        Ellipsoid,
        Rectangle,
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
    var globe;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        frameState = createFrameState();
        globe = new Globe();
    });

    afterEach(function() {
        globe.destroy();
    });

    /**
     * Repeatedly calls update until the load queue is empty.  You must wrap any code to follow
     * this in a "runs" function.
     */
    function updateUntilDone(globe) {
        // update until the load queue is empty.
        waitsFor(function() {
            globe._surface._debug.enableDebugOutput = true;
            var commandList = [];
            globe.update(context, frameState, commandList);
            return !defined(globe._surface._tileLoadQueue.head) && globe._surface._debug.tilesWaitingForChildren === 0;
        }, 'updating to complete');
    }

    it('renders with enableLighting', function() {
        globe.enableLighting = true;

        var layerCollection = globe.imageryLayers;
        layerCollection.removeAll();
        layerCollection.addImageryProvider(new SingleTileImageryProvider({url : 'Data/Images/Red16x16.png'}));

        frameState.camera.viewRectangle(new Rectangle(0.0001, 0.0001, 0.0025, 0.0025), Ellipsoid.WGS84);

        updateUntilDone(globe);

        runs(function() {
            ClearCommand.ALL.execute(context);
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);

            render(context, frameState, globe);
            expect(context.readPixels()).toNotEqual([0, 0, 0, 0]);
        });
    });
}, 'WebGL');