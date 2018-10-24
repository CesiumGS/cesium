defineSuite([
        'Scene/OctahedralProjectedCubeMap',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        OctahedralProjectedCubeMap,
        createScene,
        pollToPromise) {
    'use strict';

    var scene;
    var environmentMapUrl = './Data/EnvironmentMap/shanghai_bund_1k_ibl.ktx';

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    it('creates a packed texture', function() {
        var octahedralMap = new OctahedralProjectedCubeMap(environmentMapUrl);
        scene.primitives.add(octahedralMap);

        return pollToPromise(function() {
            scene.renderForSpecs();
            return octahedralMap.ready;
        }).then(function() {
            expect(octahedralMap.texture.width).toEqual(194);
            expect(octahedralMap.texture.height).toEqual(128);
            expect(octahedralMap.maximumMipmapLevel).toEqual(5);
        });
    });
}, 'WebGL');
