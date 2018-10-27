defineSuite([
        'Core/PrimitiveType',
        'Renderer/DrawCommand',
        'Renderer/Pass'
    ], function(
        PrimitiveType,
        DrawCommand,
        Pass) {
    'use strict';

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

    it('shallow clones', function() {
        var c = new DrawCommand({
            boundingVolume : {},
            cull : false,
            modelMatrix :  {},
            primitiveType : PrimitiveType.TRIANGLE_FAN,
            vertexArray : {},
            count : 3,
            offset : 3,
            instanceCount : 2,
            shaderProgram : {},
            uniformMap : {},
            renderState : {},
            framebuffer : {},
            pass : Pass.TRANSLUCENT,
            executeInClosestFrustum : true,
            owner : {},
            debugShowBoundingVolume : true
        });

        var clone = DrawCommand.shallowClone(c);

        expect(clone.boundingVolume).toBe(c.boundingVolume);
        expect(clone.cull).toEqual(c.cull);
        expect(clone.modelMatrix).toBe(c.modelMatrix);
        expect(clone.primitiveType).toEqual(c.primitiveType);
        expect(clone.vertexArray).toBe(c.vertexArray);
        expect(clone.count).toEqual(c.count);
        expect(clone.offset).toEqual(c.offset);
        expect(clone.instanceCount).toEqual(c.instanceCount);
        expect(clone.shaderProgram).toBe(c.shaderProgram);
        expect(clone.uniformMap).toBe(c.uniformMap);
        expect(clone.renderState).toBe(c.renderState);
        expect(clone.framebuffer).toBe(c.framebuffer);
        expect(clone.pass).toEqual(c.pass);
        expect(clone.executeInClosestFrustum).toEqual(c.executeInClosestFrustum);
        expect(clone.owner).toBe(c.owner);
        expect(clone.debugShowBoundingVolume).toEqual(c.debugShowBoundingVolume);
    });

    it('shallow clones with result', function() {
        var c = new DrawCommand({
            boundingVolume : {},
            cull : false,
            modelMatrix :  {},
            primitiveType : PrimitiveType.TRIANGLE_FAN,
            vertexArray : {},
            count : 3,
            offset : 3,
            instanceCount : 2,
            shaderProgram : {},
            uniformMap : {},
            renderState : {},
            framebuffer : {},
            pass : Pass.TRANSLUCENT,
            executeInClosestFrustum : true,
            owner : {},
            debugShowBoundingVolume : true
        });

        var result = new DrawCommand();
        var clone = DrawCommand.shallowClone(c, result);

        expect(result).toBe(clone);
        expect(clone.boundingVolume).toBe(c.boundingVolume);
        expect(clone.cull).toEqual(c.cull);
        expect(clone.modelMatrix).toBe(c.modelMatrix);
        expect(clone.primitiveType).toEqual(c.primitiveType);
        expect(clone.vertexArray).toBe(c.vertexArray);
        expect(clone.count).toEqual(c.count);
        expect(clone.offset).toEqual(c.offset);
        expect(clone.instanceCount).toEqual(c.instanceCount);
        expect(clone.shaderProgram).toBe(c.shaderProgram);
        expect(clone.uniformMap).toBe(c.uniformMap);
        expect(clone.renderState).toBe(c.renderState);
        expect(clone.framebuffer).toBe(c.framebuffer);
        expect(clone.pass).toEqual(c.pass);
        expect(clone.executeInClosestFrustum).toEqual(c.executeInClosestFrustum);
        expect(clone.owner).toBe(c.owner);
        expect(clone.debugShowBoundingVolume).toEqual(c.debugShowBoundingVolume);
    });

    it('shallow clone returns undefined', function() {
        expect(DrawCommand.shallowClone()).toBeUndefined();
    });
});
