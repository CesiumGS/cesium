/*global defineSuite*/
defineSuite([
         'Renderer/Command',
         'Core/BoundingSphere',
         'Core/Matrix4',
         'Core/PrimitiveType'
     ], function(
         Command,
         BoundingSphere,
         Matrix4,
         PrimitiveType) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('clones draw arguments', function() {
        var c = new Command();
        c.boundingVolume = new BoundingSphere();
        c.modelMatrix = Matrix4.IDENTITY;
        c.offset = 1;
        c.count = 10;
        c.primitiveType = PrimitiveType.TRIANGLES;
        c.renderState = null;
        c.shaderProgram = null;
        c.uniformMap = null;
        c.vertexArray = null;

        var d = c.cloneDrawArguments();
        expect(d.boundingVolume).toBeUndefined();
        expect(d.modelMatrix).toBeUndefined();
        expect(d.offset).toEqual(1);
        expect(d.count).toEqual(10);
        expect(d.primitiveType).toEqual(PrimitiveType.TRIANGLES);
        expect(d.renderState).toBeNull();
        expect(d.shaderProgram).toBeNull();
        expect(d.uniformMap).toBeNull();
        expect(d.vertexArray).toBeNull();
    });

    it('clones', function() {
        var c = new Command();
        c.boundingVolume = new BoundingSphere();
        c.modelMatrix = Matrix4.IDENTITY;
        c.offset = 1;
        c.count = 10;
        c.primitiveType = PrimitiveType.TRIANGLES;
        c.renderState = null;
        c.shaderProgram = null;
        c.uniformMap = null;
        c.vertexArray = null;

        var d = c.clone();
        expect(d.boundingVolume).toEqual(new BoundingSphere());
        expect(d.modelMatrix).toEqual(Matrix4.IDENTITY);
        expect(d.offset).toEqual(1);
        expect(d.count).toEqual(10);
        expect(d.primitiveType).toEqual(PrimitiveType.TRIANGLES);
        expect(d.renderState).toBeNull();
        expect(d.shaderProgram).toBeNull();
        expect(d.uniformMap).toBeNull();
        expect(d.vertexArray).toBeNull();
    });

    it('static clone draw arguments throws without a command', function() {
        expect(function() {
            Command.cloneDrawArguments();
        }).toThrow();
    });

    it('static clone throws without a command', function() {
        expect(function() {
            Command.clone();
        }).toThrow();
    });
});