defineSuite([
         'Renderer/UniformDataType'
     ], function(
         UniformDatatype) {
    "use strict";
    /*global it, expect*/

    it("FLOAT", function() {
        var float = UniformDatatype.FLOAT;
        expect(float.getGLSL()).toEqual("float");
    });

    it("FLOAT_VECTOR2", function() {
        var float = UniformDatatype.FLOAT_VECTOR2;
        expect(float.getGLSL()).toEqual("vec2");
    });

    it("FLOAT_VECTOR3", function() {
        var float = UniformDatatype.FLOAT_VECTOR3;
        expect(float.getGLSL()).toEqual("vec3");
    });

    it("FLOAT_VECTOR4", function() {
        var float = UniformDatatype.FLOAT_VECTOR4;
        expect(float.getGLSL()).toEqual("vec4");
    });

    it("INT", function() {
        var i = UniformDatatype.INT;
        expect(i.getGLSL()).toEqual("int");
    });

    it("INT_VECTOR2", function() {
        var i = UniformDatatype.INT_VECTOR2;
        expect(i.getGLSL()).toEqual("ivec2");
    });

    it("INT_VECTOR3", function() {
        var i = UniformDatatype.INT_VECTOR3;
        expect(i.getGLSL()).toEqual("ivec3");
    });

    it("INT_VECTOR4", function() {
        var i = UniformDatatype.INT_VECTOR4;
        expect(i.getGLSL()).toEqual("ivec4");
    });

    it("BOOL", function() {
        var b = UniformDatatype.BOOL;
        expect(b.getGLSL()).toEqual("bool");
    });

    it("BOOL_VECTOR2", function() {
        var b = UniformDatatype.BOOL_VECTOR2;
        expect(b.getGLSL()).toEqual("bvec2");
    });

    it("BOOL_VECTOR3", function() {
        var b = UniformDatatype.BOOL_VECTOR3;
        expect(b.getGLSL()).toEqual("bvec3");
    });

    it("BOOL_VECTOR4", function() {
        var b = UniformDatatype.BOOL_VECTOR4;
        expect(b.getGLSL()).toEqual("bvec4");
    });

    it("FLOAT_MATRIX2", function() {
        var m = UniformDatatype.FLOAT_MATRIX2;
        expect(m.getGLSL()).toEqual("mat2");
    });

    it("FLOAT_MATRIX2", function() {
        var m = UniformDatatype.FLOAT_MATRIX2;
        expect(m.getGLSL()).toEqual("mat2");
    });

    it("FLOAT_MATRIX3", function() {
        var m = UniformDatatype.FLOAT_MATRIX3;
        expect(m.getGLSL()).toEqual("mat3");
    });

    it("FLOAT_MATRIX4", function() {
        var m = UniformDatatype.FLOAT_MATRIX4;
        expect(m.getGLSL()).toEqual("mat4");
    });

    it("SAMPLER_2D", function() {
        var s = UniformDatatype.SAMPLER_2D;
        expect(s.getGLSL()).toEqual("sampler2D");
    });

    it("SAMPLER_CUBE", function() {
        var s = UniformDatatype.SAMPLER_CUBE;
        expect(s.getGLSL()).toEqual("samplerCube");
    });
});