/*global defineSuite*/
defineSuite([
         'Renderer/UniformDatatype'
     ], function(
         UniformDatatype) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('FLOAT', function() {
        expect(UniformDatatype.FLOAT.getGLSL()).toEqual('float');
    });

    it('FLOAT_VEC2', function() {
        expect(UniformDatatype.FLOAT_VEC2.getGLSL()).toEqual('vec2');
    });

    it('FLOAT_VEC3', function() {
        expect(UniformDatatype.FLOAT_VEC3.getGLSL()).toEqual('vec3');
    });

    it('FLOAT_VEC4', function() {
        expect(UniformDatatype.FLOAT_VEC4.getGLSL()).toEqual('vec4');
    });

    it('INT', function() {
        expect(UniformDatatype.INT.getGLSL()).toEqual('int');
    });

    it('INT_VEC2', function() {
        expect(UniformDatatype.INT_VEC2.getGLSL()).toEqual('ivec2');
    });

    it('INT_VEC3', function() {
        expect(UniformDatatype.INT_VEC3.getGLSL()).toEqual('ivec3');
    });

    it('INT_VEC4', function() {
        expect(UniformDatatype.INT_VEC4.getGLSL()).toEqual('ivec4');
    });

    it('BOOL', function() {
        expect(UniformDatatype.BOOL.getGLSL()).toEqual('bool');
    });

    it('BOOL_VEC2', function() {
        expect(UniformDatatype.BOOL_VEC2.getGLSL()).toEqual('bvec2');
    });

    it('BOOL_VEC3', function() {
        expect(UniformDatatype.BOOL_VEC3.getGLSL()).toEqual('bvec3');
    });

    it('BOOL_VEC4', function() {
        expect(UniformDatatype.BOOL_VEC4.getGLSL()).toEqual('bvec4');
    });

    it('FLOAT_MAT2', function() {
        expect(UniformDatatype.FLOAT_MAT2.getGLSL()).toEqual('mat2');
    });

    it('FLOAT_MAT2', function() {
        expect(UniformDatatype.FLOAT_MAT2.getGLSL()).toEqual('mat2');
    });

    it('FLOAT_MAT3', function() {
        expect(UniformDatatype.FLOAT_MAT3.getGLSL()).toEqual('mat3');
    });

    it('FLOAT_MAT4', function() {
        expect(UniformDatatype.FLOAT_MAT4.getGLSL()).toEqual('mat4');
    });

    it('SAMPLER_2D', function() {
        expect(UniformDatatype.SAMPLER_2D.getGLSL()).toEqual('sampler2D');
    });

    it('SAMPLER_CUBE', function() {
        expect(UniformDatatype.SAMPLER_CUBE.getGLSL()).toEqual('samplerCube');
    });
});