defineSuite([
        'Scene/Cesium3DTilePassState',
        'Scene/Cesium3DTilePass'
    ], function(
        Cesium3DTilePassState,
        Cesium3DTilePass) {
    'use strict';

    it('sets default values', function() {
        var passState = new Cesium3DTilePassState({
            pass : Cesium3DTilePass.RENDER
        });
        expect(passState.pass).toBe(Cesium3DTilePass.RENDER);
        expect(passState.commandList).toBeUndefined();
        expect(passState.camera).toBeUndefined();
        expect(passState.cullingVolume).toBeUndefined();
        expect(passState.ready).toBe(false);
    });

    it('constructed with options', function() {
        var mockCommandList = [];
        var mockCamera = {};
        var mockCullingVolume = {};
        var passState = new Cesium3DTilePassState({
            pass : Cesium3DTilePass.RENDER,
            commandList : mockCommandList,
            camera : mockCamera,
            cullingVolume : mockCullingVolume
        });
        expect(passState.pass).toBe(Cesium3DTilePass.RENDER);
        expect(passState.commandList).toBe(mockCommandList);
        expect(passState.camera).toBe(mockCamera);
        expect(passState.cullingVolume).toBe(mockCullingVolume);
    });

    it('throws if options is undefined', function() {
        expect(function() {
            return new Cesium3DTilePassState();
        }).toThrowDeveloperError();
    });

    it('throws if options.pass is undefined', function() {
        expect(function() {
            return new Cesium3DTilePassState({});
        }).toThrowDeveloperError();
    });
});
