/*global defineSuite*/
defineSuite([
        'Renderer/DrawCommand',
        'Core/PrimitiveType',
        'Scene/Pass'
    ], function(
        DrawCommand,
        PrimitiveType,
        Pass) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('constructs', function() {
        var c = new DrawCommand();
        expect(c.boundingVolume).toBeUndefined();
        expect(c.cull).toEqual(true);
        expect(c.modelMatrix).toBeUndefined();
        expect(c.primitiveType).toEqual(PrimitiveType.TRIANGLES);
        expect(c.vertexArray).toBeUndefined();
        expect(c.count).toBeUndefined();
        expect(c.offset).toEqual(0);
        expect(c.instanceCount).toEqual(0);
        expect(c.shaderProgram).toBeUndefined();
        expect(c.uniformMap).toBeUndefined();
        expect(c.renderState).toBeUndefined();
        expect(c.framebuffer).toBeUndefined();
        expect(c.pass).toBeUndefined();
        expect(c.executeInClosestFrustum).toEqual(false);
        expect(c.owner).toBeUndefined();
        expect(c.debugShowBoundingVolume).toEqual(false);
    });

    it('constructs with options', function() {
        var boundingVolume = {};
        var modelMatrix = {};
        var primitiveType = PrimitiveType.TRIANGLE_FAN;
        var vertexArray = {};
        var shaderProgram = {};
        var uniformMap = {};
        var renderState = {};
        var framebuffer = {};
        var pass = Pass.TRANSLUCENT;
        var owner = {};

        var c = new DrawCommand({
            boundingVolume : boundingVolume,
            cull : false,
            modelMatrix :  modelMatrix,
            primitiveType : primitiveType,
            vertexArray : vertexArray,
            count : 3,
            offset : 3,
            instanceCount : 2,
            shaderProgram : shaderProgram,
            uniformMap : uniformMap,
            renderState : renderState,
            framebuffer : framebuffer,
            pass : pass,
            executeInClosestFrustum : true,
            owner : owner,
            debugShowBoundingVolume : true
        });

        expect(c.boundingVolume).toBe(boundingVolume);
        expect(c.cull).toEqual(false);
        expect(c.modelMatrix).toBe(modelMatrix);
        expect(c.primitiveType).toEqual(primitiveType);
        expect(c.vertexArray).toBe(vertexArray);
        expect(c.count).toEqual(3);
        expect(c.offset).toEqual(3);
        expect(c.instanceCount).toEqual(2);
        expect(c.shaderProgram).toBe(shaderProgram);
        expect(c.uniformMap).toBe(uniformMap);
        expect(c.renderState).toBe(renderState);
        expect(c.framebuffer).toBe(framebuffer);
        expect(c.pass).toEqual(pass);
        expect(c.executeInClosestFrustum).toEqual(true);
        expect(c.owner).toBe(owner);
        expect(c.debugShowBoundingVolume).toEqual(true);
    });
});
