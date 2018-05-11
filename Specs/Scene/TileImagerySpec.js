defineSuite([
        'Scene/TileImagery',
        'Scene/ImageryState'
    ], function(
        TileImagery,
        ImageryState) {
    'use strict';

    it('does not use ancestor ready imagery that needs to be reprojected', function() {
        var imageryLayer = {
            _calculateTextureTranslationAndScale: function() {}
        };

        var grandparentImagery = {
            imageryLayer: imageryLayer,
            level: 0,
            x: 0,
            y: 0,
            state: ImageryState.READY,
            texture: {},
            textureWebMercator: {},
            addReference: function() {}
        };

        var parentImagery = {
            imageryLayer: imageryLayer,
            parent: grandparentImagery,
            level: 1,
            x: 0,
            y: 0,
            state: ImageryState.READY,
            texture: undefined,
            textureWebMercator: {},
            processStateMachine: function() {
                ++this.processStateMachineCalls;
            },
            processStateMachineCalls: 0,
            addReference: function() {}
        };

        var thisImagery = {
            imageryLayer: imageryLayer,
            parent: parentImagery,
            level: 2,
            x: 0,
            y: 0,
            state: ImageryState.FAILED,
            processStateMachine: function() {},
            addReference: function() {}
        };

        // This TileImagery needs reprojected imagery, and:
        // * thisImagery has failed
        // * parentImagery needs to be reprojected
        // * grandparentImagery is good to go
        // When we process the state machine, it should selected grandparentImagery for rendering
        // and process the state machine of parentImagery.
        var tileImagery = new TileImagery(thisImagery, undefined, false);

        tileImagery.processStateMachine({}, {});

        expect(tileImagery.readyImagery).toBe(grandparentImagery);
        expect(parentImagery.processStateMachineCalls).toBe(1);
    });
});
