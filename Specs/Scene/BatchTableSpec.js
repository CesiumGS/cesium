/*global defineSuite*/
defineSuite([
    'Scene/BatchTable',
    'Core/Cartesian4',
    'Core/ComponentDatatype',
    'Renderer/PixelDatatype',
    'Renderer/Texture',
    'Specs/createScene'
], function(
    BatchTable,
    Cartesian4,
    ComponentDatatype,
    PixelDatatype,
    Texture,
    createScene) {
    'use strict';

    var unsignedByteAttributes = [{
        functionName : 'batchTable_getShow',
        componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute : 1
    }, {
        functionName : 'batchTable_getPickColor',
        componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute : 4,
        normalize : true
    }];

    var floatAttributes = [{
        functionName : 'batchTable_getShow',
        componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute : 1
    }, {
        functionName : 'batchTable_getCenter',
        componentDatatype : ComponentDatatype.FLOAT,
        componentsPerAttribute : 3
    }];

    var batchTable;
    var scene;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        batchTable = batchTable && !batchTable.isDestroyed() && batchTable.destroy();
    });

    it('constructor', function() {
        batchTable = new BatchTable(unsignedByteAttributes, 2);
        expect(batchTable.attributes).toBe(unsignedByteAttributes);
        expect(batchTable.numberOfInstances).toEqual(2);
    });

    it('constructior throws without attributes', function() {
        expect(function() {
            batchTable = new BatchTable(undefined, 5);
        }).toThrowDeveloperError();
    });

    it('constructor throws without number of instances', function() {
        expect(function() {
            batchTable = new BatchTable(unsignedByteAttributes, undefined);
        }).toThrowDeveloperError();
    });

    it('sets and gets entries in the table', function() {
        batchTable = new BatchTable(unsignedByteAttributes, 5);

        var i;
        var color = new Cartesian4(0, 1, 2, 3);

        for (i = 0; i < batchTable.numberOfInstances; ++i) {
            batchTable.setBatchedAttribute(i, 0, 1);
            batchTable.setBatchedAttribute(i, 1, color);
        }

        for (i = 0; i < batchTable.numberOfInstances; ++i) {
            expect(batchTable.getBatchedAttribute(3, 0)).toEqual(1);
            expect(batchTable.getBatchedAttribute(3, 1)).toEqual(color);
        }

        color = new Cartesian4(4, 5, 6, 7);
        batchTable.setBatchedAttribute(3, 0, 0);
        batchTable.setBatchedAttribute(3, 1, color);
        expect(batchTable.getBatchedAttribute(3, 0)).toEqual(0);
        expect(batchTable.getBatchedAttribute(3, 1)).toEqual(color);
    });

    it('gets with result parameter', function() {
        batchTable = new BatchTable(unsignedByteAttributes, 5);
        var color = new Cartesian4(0, 1, 2, 3);
        batchTable.setBatchedAttribute(0, 1, color);

        var result = new Cartesian4();
        var returndValue = batchTable.getBatchedAttribute(0, 1, result);
        expect(returndValue).toBe(result);
        expect(result).toEqual(color);
    });

    it('get entry throws when instance index is out of range', function() {
        batchTable = new BatchTable(unsignedByteAttributes, 5);
        expect(function() {
            batchTable.getBatchedAttribute(-1, 0);
        }).toThrowDeveloperError();
        expect(function() {
            batchTable.getBatchedAttribute(100, 0);
        }).toThrowDeveloperError();
    });

    it('get entry throws when attribute index is out of range', function() {
        batchTable = new BatchTable(unsignedByteAttributes, 5);
        expect(function() {
            batchTable.getBatchedAttribute(0, -1);
        }).toThrowDeveloperError();
        expect(function() {
            batchTable.getBatchedAttribute(0, 100);
        }).toThrowDeveloperError();
    });

    it('set entry throws when instance index is out of range', function() {
        batchTable = new BatchTable(unsignedByteAttributes, 5);
        expect(function() {
            batchTable.setBatchedAttribute(-1, 0, 0);
        }).toThrowDeveloperError();
        expect(function() {
            batchTable.setBatchedAttribute(100, 0, 1);
        }).toThrowDeveloperError();
    });

    it('set entry throws when attribute index is out of range', function() {
        batchTable = new BatchTable(unsignedByteAttributes, 5);
        expect(function() {
            batchTable.setBatchedAttribute(0, -1, 1);
        }).toThrowDeveloperError();
        expect(function() {
            batchTable.setBatchedAttribute(0, 100, 1);
        }).toThrowDeveloperError();
    });

    it('set entry throws when value is undefined', function() {
        batchTable = new BatchTable(unsignedByteAttributes, 5);
        expect(function() {
            batchTable.setBatchedAttribute(0, 0, undefined);
        }).toThrowDeveloperError();
    });

    it('creates a uniform callback with unsigned byte texture', function() {
        batchTable = new BatchTable(unsignedByteAttributes, 5);
        batchTable.update(scene.frameState);

        var uniforms = batchTable.getUniformMapCallback()({});
        expect(uniforms.batchTexture).toBeDefined();
        expect(uniforms.batchTexture()).toBeInstanceOf(Texture);
        expect(uniforms.batchTexture().pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);
        expect(uniforms.batchTextureDimensions).toBeDefined();
        expect(uniforms.batchTextureDimensions().x).toBeGreaterThan(0);
        expect(uniforms.batchTextureDimensions().y).toBeGreaterThan(0);
        expect(uniforms.batchTextureStep).toBeDefined();
        expect(uniforms.batchTextureStep().x).toBeGreaterThan(0);
        expect(uniforms.batchTextureStep().y).toBeGreaterThan(0);
        expect(uniforms.batchTextureStep().z).toBeGreaterThan(0);
        expect(uniforms.batchTextureStep().w).toBeGreaterThan(0);
    });

    it('creates a uniform callback with unsigned byte texture', function() {
        batchTable = new BatchTable(floatAttributes, 5);

        if (scene.context.floatingPointTexture) {
            batchTable.update(scene.frameState);

            var uniforms = batchTable.getUniformMapCallback()({});
            expect(uniforms.batchTexture).toBeDefined();
            expect(uniforms.batchTexture()).toBeInstanceOf(Texture);
            expect(uniforms.batchTexture().pixelDatatype).toEqual(PixelDatatype.FLOAT);
            expect(uniforms.batchTextureDimensions).toBeDefined();
            expect(uniforms.batchTextureDimensions().x).toBeGreaterThan(0);
            expect(uniforms.batchTextureDimensions().y).toBeGreaterThan(0);
            expect(uniforms.batchTextureStep).toBeDefined();
            expect(uniforms.batchTextureStep().x).toBeGreaterThan(0);
            expect(uniforms.batchTextureStep().y).toBeGreaterThan(0);
            expect(uniforms.batchTextureStep().z).toBeGreaterThan(0);
            expect(uniforms.batchTextureStep().w).toBeGreaterThan(0);
        } else {
            expect(function() {
                batchTable.update(scene.frameState);
            }).toThrowRuntimeError();
        }
    });

    it('create shader functions', function() {
        batchTable = new BatchTable(unsignedByteAttributes, 5);

        var shader = 'void main() { gl_Position = vec4(0.0); }';
        var modifiedShader = batchTable.getVertexShaderCallback()(shader);
        expect(modifiedShader.indexOf(batchTable.attributes[0].functionName)).not.toEqual(-1);
        expect(modifiedShader.indexOf(batchTable.attributes[1].functionName)).not.toEqual(-1);
    });

    it('isDestroyed', function() {
        batchTable = new BatchTable(unsignedByteAttributes, 5);
        expect(batchTable.isDestroyed()).toEqual(false);
        batchTable.destroy();
        expect(batchTable.isDestroyed()).toEqual(true);
    });
}, 'WebGL');