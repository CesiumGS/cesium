/*global defineSuite*/
defineSuite([
         'Specs/createContext',
         'Specs/destroyContext',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Cartesian4',
         'Core/Matrix2',
         'Core/Matrix3',
         'Core/Matrix4',
         'Core/PrimitiveType',
         'Renderer/BufferUsage',
         'Renderer/ClearCommand',
         'Renderer/UniformDatatype'
     ], 'Renderer/ShaderProgram', function(
         createContext,
         destroyContext,
         Cartesian2,
         Cartesian3,
         Cartesian4,
         Matrix2,
         Matrix3,
         Matrix4,
         PrimitiveType,
         BufferUsage,
         ClearCommand,
         UniformDatatype) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var sp;
    var va;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    it('has a position vertex attribute', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        expect(sp.getNumberOfVertexAttributes()).toEqual(1);
        expect(sp.getVertexAttributes().position.name).toEqual('position');
    });

    it('sets attribute indices', function() {
        var vs =
            'attribute vec4 position;' +
            'attribute vec3 normal;' +
            'attribute float heat;' +
            'void main() { gl_Position = position + vec4(normal, 0.0) + vec4(heat); }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';

        var attributes = {
            position : 3,
            normal : 2,
            heat : 1
        };
        sp = context.createShaderProgram(vs, fs, attributes);

        expect(sp.getNumberOfVertexAttributes()).toEqual(3);
        expect(sp.getVertexAttributes().position.name).toEqual('position');
        expect(sp.getVertexAttributes().position.index).toEqual(attributes.position);
        expect(sp.getVertexAttributes().normal.name).toEqual('normal');
        expect(sp.getVertexAttributes().normal.index).toEqual(attributes.normal);
        expect(sp.getVertexAttributes().heat.name).toEqual('heat');
        expect(sp.getVertexAttributes().heat.index).toEqual(attributes.heat);
    });

    it('has a uniform', function() {
        var vs = 'uniform vec4 u_vec4; void main() { gl_Position = u_vec4; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        var uniform = sp.getAllUniforms().u_vec4;

        expect(uniform.getName()).toEqual('u_vec4');
    });

    it('has an automatic uniform', function() {
        var vs = 'uniform vec4 u_vec4; void main() { gl_Position = u_vec4; }';
        var fs = 'void main() { gl_FragColor = vec4((czm_viewport.x == 0.0) && (czm_viewport.y == 0.0) && (czm_viewport.z == 1.0) && (czm_viewport.w == 1.0)); }';
        sp = context.createShaderProgram(vs, fs);

        expect(sp.getAllUniforms().u_vec4.getName()).toEqual('u_vec4');
        expect(sp.getAllUniforms().czm_viewport.getName()).toEqual('czm_viewport');

        expect(sp.getManualUniforms().u_vec4.getName()).toEqual('u_vec4');
        expect(sp.getManualUniforms().czm_viewport).not.toBeDefined();
    });

    it('has uniforms', function() {
        var vs = 'uniform float u_float; uniform vec4 u_vec4; uniform mat4 u_mat4; void main() { gl_Position = u_mat4 * u_float * u_vec4; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        expect(sp.getAllUniforms().u_float.getName()).toEqual('u_float');
        expect(sp.getAllUniforms().u_vec4.getName()).toEqual('u_vec4');
        expect(sp.getAllUniforms().u_mat4.getName()).toEqual('u_mat4');
    });

    it('has uniforms of every datatype', function() {
        var d = context;
        var vs =
            'uniform float u_float;' +
            'uniform vec2 u_vec2;' +
            'uniform vec3 u_vec3;' +
            'uniform vec4 u_vec4;' +
            'uniform int u_int;' +
            'uniform ivec2 u_ivec2;' +
            'uniform ivec3 u_ivec3;' +
            'uniform ivec4 u_ivec4;' +
            'uniform bool u_bool;' +
            'uniform bvec2 u_bvec2;' +
            'uniform bvec3 u_bvec3;' +
            'uniform bvec4 u_bvec4;' +
            'uniform mat2 u_mat2;' +
            'uniform mat3 u_mat3;' +
            'uniform mat4 u_mat4;' +
            'void main() { gl_Position = vec4(u_float) * vec4((u_mat2 * u_vec2), 0.0, 0.0) * vec4((u_mat3 * u_vec3), 0.0) * (u_mat4 * u_vec4) * vec4(u_int) * vec4(u_ivec2, 0.0, 0.0) * vec4(u_ivec3, 0.0) * vec4(u_ivec4) * vec4(u_bool) * vec4(u_bvec2, 0.0, 0.0) * vec4(u_bvec3, 0.0) * vec4(u_bvec4); }';
        var fs =
            'uniform sampler2D u_sampler2D;' +
            'uniform samplerCube u_samplerCube;' +
            'void main() { gl_FragColor = texture2D(u_sampler2D, vec2(0.0)) + textureCube(u_samplerCube, vec3(1.0)); }';
        sp = d.createShaderProgram(vs, fs);

        expect(sp.getAllUniforms().u_float.getName()).toEqual('u_float');
        expect(sp.getAllUniforms().u_vec2.getName()).toEqual('u_vec2');
        expect(sp.getAllUniforms().u_vec3.getName()).toEqual('u_vec3');
        expect(sp.getAllUniforms().u_vec4.getName()).toEqual('u_vec4');
        expect(sp.getAllUniforms().u_int.getName()).toEqual('u_int');
        expect(sp.getAllUniforms().u_ivec2.getName()).toEqual('u_ivec2');
        expect(sp.getAllUniforms().u_ivec3.getName()).toEqual('u_ivec3');
        expect(sp.getAllUniforms().u_ivec4.getName()).toEqual('u_ivec4');
        expect(sp.getAllUniforms().u_bool.getName()).toEqual('u_bool');
        expect(sp.getAllUniforms().u_bvec2.getName()).toEqual('u_bvec2');
        expect(sp.getAllUniforms().u_bvec3.getName()).toEqual('u_bvec3');
        expect(sp.getAllUniforms().u_bvec4.getName()).toEqual('u_bvec4');
        expect(sp.getAllUniforms().u_mat2.getName()).toEqual('u_mat2');
        expect(sp.getAllUniforms().u_mat3.getName()).toEqual('u_mat3');
        expect(sp.getAllUniforms().u_mat4.getName()).toEqual('u_mat4');
        expect(sp.getAllUniforms().u_sampler2D.getName()).toEqual('u_sampler2D');
        expect(sp.getAllUniforms().u_samplerCube.getName()).toEqual('u_samplerCube');

        expect(sp.getAllUniforms().u_float.getDatatype()).toEqual(UniformDatatype.FLOAT);
        expect(sp.getAllUniforms().u_vec2.getDatatype()).toEqual(UniformDatatype.FLOAT_VECTOR2);
        expect(sp.getAllUniforms().u_vec3.getDatatype()).toEqual(UniformDatatype.FLOAT_VECTOR3);
        expect(sp.getAllUniforms().u_vec4.getDatatype()).toEqual(UniformDatatype.FLOAT_VECTOR4);
        expect(sp.getAllUniforms().u_int.getDatatype()).toEqual(UniformDatatype.INT);
        expect(sp.getAllUniforms().u_ivec2.getDatatype()).toEqual(UniformDatatype.INT_VECTOR2);
        expect(sp.getAllUniforms().u_ivec3.getDatatype()).toEqual(UniformDatatype.INT_VECTOR3);
        expect(sp.getAllUniforms().u_ivec4.getDatatype()).toEqual(UniformDatatype.INT_VECTOR4);
        expect(sp.getAllUniforms().u_bool.getDatatype()).toEqual(UniformDatatype.BOOL);
        expect(sp.getAllUniforms().u_bvec2.getDatatype()).toEqual(UniformDatatype.BOOL_VECTOR2);
        expect(sp.getAllUniforms().u_bvec3.getDatatype()).toEqual(UniformDatatype.BOOL_VECTOR3);
        expect(sp.getAllUniforms().u_bvec4.getDatatype()).toEqual(UniformDatatype.BOOL_VECTOR4);
        expect(sp.getAllUniforms().u_mat2.getDatatype()).toEqual(UniformDatatype.FLOAT_MATRIX2);
        expect(sp.getAllUniforms().u_mat3.getDatatype()).toEqual(UniformDatatype.FLOAT_MATRIX3);
        expect(sp.getAllUniforms().u_mat4.getDatatype()).toEqual(UniformDatatype.FLOAT_MATRIX4);
        expect(sp.getAllUniforms().u_sampler2D.getDatatype()).toEqual(UniformDatatype.SAMPLER_2D);
        expect(sp.getAllUniforms().u_samplerCube.getDatatype()).toEqual(UniformDatatype.SAMPLER_CUBE);
    });

    it('has a struct uniform', function() {
        var vs = 'uniform struct { float f; vec4 v; } u_struct; void main() { gl_Position = u_struct.f * u_struct.v; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        expect(sp.getAllUniforms()['u_struct.f'].getName()).toEqual('u_struct.f');
        expect(sp.getAllUniforms()['u_struct.v'].getName()).toEqual('u_struct.v');
    });

    it('has a uniform array', function() {
        var vs = 'uniform vec4 u_vec4[2]; void main() { gl_Position = u_vec4[0] + u_vec4[1]; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);

        var uniform = sp.getAllUniforms().u_vec4;

        expect(uniform.getName()).toEqual('u_vec4');
        expect(uniform.value.length).toEqual(2);
    });

    it('has uniform arrays of every datatype', function() {
        var d = context;
        var vs =
            'uniform float u_float[2];' +
            'uniform vec2 u_vec2[2];' +
            'uniform vec3 u_vec3[2];' +
            'uniform vec4 u_vec4[2];' +
            'uniform int u_int[2];' +
            'uniform ivec2 u_ivec2[2];' +
            'uniform ivec3 u_ivec3[2];' +
            'uniform ivec4 u_ivec4[2];' +
            'uniform bool u_bool[2];' +
            'uniform bvec2 u_bvec2[2];' +
            'uniform bvec3 u_bvec3[2];' +
            'uniform bvec4 u_bvec4[2];' +
            'uniform mat2 u_mat2[2];' +
            'uniform mat3 u_mat3[2];' +
            'uniform mat4 u_mat4[2];' +
            'void main() { gl_Position = vec4(u_float[0]) * vec4(u_float[1]) * vec4((u_mat2[0] * u_vec2[0]), 0.0, 0.0) * vec4((u_mat2[1] * u_vec2[1]), 0.0, 0.0) * vec4((u_mat3[0] * u_vec3[0]), 0.0) * vec4((u_mat3[1] * u_vec3[1]), 0.0) * (u_mat4[0] * u_vec4[0]) * (u_mat4[1] * u_vec4[1]) * vec4(u_int[0]) * vec4(u_int[1]) * vec4(u_ivec2[0], 0.0, 0.0) * vec4(u_ivec2[1], 0.0, 0.0) * vec4(u_ivec3[0], 0.0) * vec4(u_ivec3[1], 0.0) * vec4(u_ivec4[0]) * vec4(u_ivec4[1]) * vec4(u_bool[0]) * vec4(u_bool[1]) * vec4(u_bvec2[0], 0.0, 0.0) * vec4(u_bvec2[1], 0.0, 0.0) * vec4(u_bvec3[0], 0.0) * vec4(u_bvec3[1], 0.0) * vec4(u_bvec4[0]) * vec4(u_bvec4[1]); }';
        var fs =
            'uniform sampler2D u_sampler2D[2];' +
            'uniform samplerCube u_samplerCube[2];' +
            'void main() { gl_FragColor = texture2D(u_sampler2D[0], vec2(0.0)) + texture2D(u_sampler2D[1], vec2(0.0)) + textureCube(u_samplerCube[0], vec3(1.0)) + textureCube(u_samplerCube[1], vec3(1.0)); }';
        sp = d.createShaderProgram(vs, fs);

        expect(sp.getAllUniforms().u_float.getName()).toEqual('u_float');
        expect(sp.getAllUniforms().u_vec2.getName()).toEqual('u_vec2');
        expect(sp.getAllUniforms().u_vec3.getName()).toEqual('u_vec3');
        expect(sp.getAllUniforms().u_vec4.getName()).toEqual('u_vec4');
        expect(sp.getAllUniforms().u_int.getName()).toEqual('u_int');
        expect(sp.getAllUniforms().u_ivec2.getName()).toEqual('u_ivec2');
        expect(sp.getAllUniforms().u_ivec3.getName()).toEqual('u_ivec3');
        expect(sp.getAllUniforms().u_ivec4.getName()).toEqual('u_ivec4');
        expect(sp.getAllUniforms().u_bool.getName()).toEqual('u_bool');
        expect(sp.getAllUniforms().u_bvec2.getName()).toEqual('u_bvec2');
        expect(sp.getAllUniforms().u_bvec3.getName()).toEqual('u_bvec3');
        expect(sp.getAllUniforms().u_bvec4.getName()).toEqual('u_bvec4');
        expect(sp.getAllUniforms().u_mat2.getName()).toEqual('u_mat2');
        expect(sp.getAllUniforms().u_mat3.getName()).toEqual('u_mat3');
        expect(sp.getAllUniforms().u_mat4.getName()).toEqual('u_mat4');
        expect(sp.getAllUniforms().u_sampler2D.getName()).toEqual('u_sampler2D');
        expect(sp.getAllUniforms().u_samplerCube.getName()).toEqual('u_samplerCube');

        expect(sp.getAllUniforms().u_float.getDatatype()).toEqual(UniformDatatype.FLOAT);
        expect(sp.getAllUniforms().u_vec2.getDatatype()).toEqual(UniformDatatype.FLOAT_VECTOR2);
        expect(sp.getAllUniforms().u_vec3.getDatatype()).toEqual(UniformDatatype.FLOAT_VECTOR3);
        expect(sp.getAllUniforms().u_vec4.getDatatype()).toEqual(UniformDatatype.FLOAT_VECTOR4);
        expect(sp.getAllUniforms().u_int.getDatatype()).toEqual(UniformDatatype.INT);
        expect(sp.getAllUniforms().u_ivec2.getDatatype()).toEqual(UniformDatatype.INT_VECTOR2);
        expect(sp.getAllUniforms().u_ivec3.getDatatype()).toEqual(UniformDatatype.INT_VECTOR3);
        expect(sp.getAllUniforms().u_ivec4.getDatatype()).toEqual(UniformDatatype.INT_VECTOR4);
        expect(sp.getAllUniforms().u_bool.getDatatype()).toEqual(UniformDatatype.BOOL);
        expect(sp.getAllUniforms().u_bvec2.getDatatype()).toEqual(UniformDatatype.BOOL_VECTOR2);
        expect(sp.getAllUniforms().u_bvec3.getDatatype()).toEqual(UniformDatatype.BOOL_VECTOR3);
        expect(sp.getAllUniforms().u_bvec4.getDatatype()).toEqual(UniformDatatype.BOOL_VECTOR4);
        expect(sp.getAllUniforms().u_mat2.getDatatype()).toEqual(UniformDatatype.FLOAT_MATRIX2);
        expect(sp.getAllUniforms().u_mat3.getDatatype()).toEqual(UniformDatatype.FLOAT_MATRIX3);
        expect(sp.getAllUniforms().u_mat4.getDatatype()).toEqual(UniformDatatype.FLOAT_MATRIX4);
        expect(sp.getAllUniforms().u_sampler2D.getDatatype()).toEqual(UniformDatatype.SAMPLER_2D);
        expect(sp.getAllUniforms().u_samplerCube.getDatatype()).toEqual(UniformDatatype.SAMPLER_CUBE);
    });

    it('sets uniforms', function() {
        var d = context;
        var vs =
            'uniform float u_float;' +
            'uniform vec2 u_vec2;' +
            'uniform vec3 u_vec3;' +
            'uniform vec4 u_vec4;' +
            'uniform int u_int;' +
            'uniform ivec2 u_ivec2;' +
            'uniform ivec3 u_ivec3;' +
            'uniform ivec4 u_ivec4;' +
            'uniform bool u_bool;' +
            'uniform bvec2 u_bvec2;' +
            'uniform bvec3 u_bvec3;' +
            'uniform bvec4 u_bvec4;' +
            'uniform mat2 u_mat2;' +
            'uniform mat3 u_mat3;' +
            'uniform mat4 u_mat4;' +
            'void main() { gl_Position = vec4(u_float) * vec4((u_mat2 * u_vec2), 0.0, 0.0) * vec4((u_mat3 * u_vec3), 0.0) * (u_mat4 * u_vec4) * vec4(u_int) * vec4(u_ivec2, 0.0, 0.0) * vec4(u_ivec3, 0.0) * vec4(u_ivec4) * vec4(u_bool) * vec4(u_bvec2, 0.0, 0.0) * vec4(u_bvec3, 0.0) * vec4(u_bvec4); }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = d.createShaderProgram(vs, fs);
        sp.getAllUniforms().u_float.value = 1.0;
        sp.getAllUniforms().u_vec2.value = new Cartesian2(1.0, 2.0);
        sp.getAllUniforms().u_vec3.value = new Cartesian3(1.0, 2.0, 3.0);
        sp.getAllUniforms().u_vec4.value = new Cartesian4(1.0, 2.0, 3.0, 4.0);
        sp.getAllUniforms().u_int.value = 1;
        sp.getAllUniforms().u_ivec2.value = new Cartesian2(1, 2);
        sp.getAllUniforms().u_ivec3.value = new Cartesian3(1, 2, 3);
        sp.getAllUniforms().u_ivec4.value = new Cartesian4(1, 2, 3, 4);
        sp.getAllUniforms().u_bool.value = true;
        sp.getAllUniforms().u_bvec2.value = new Cartesian2(true, true);
        sp.getAllUniforms().u_bvec3.value = new Cartesian3(true, true, true);
        sp.getAllUniforms().u_bvec4.value = new Cartesian4(true, true, true, true);
        sp.getAllUniforms().u_mat2.value = new Matrix2(1.0, 2.0, 3.0, 4.0);
        sp.getAllUniforms().u_mat3.value = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        sp.getAllUniforms().u_mat4.value = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);

        sp._bind();
        sp._setUniforms();

        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_float._getLocation())).toEqual(1.0);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_vec2._getLocation())).toEqual(new Float32Array([1.0, 2.0]));
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_vec3._getLocation())).toEqual(new Float32Array([1.0, 2.0, 3.0]));
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_vec4._getLocation())).toEqual(new Float32Array([1.0, 2.0, 3.0, 4.0]));
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_int._getLocation())).toEqual(1);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_ivec2._getLocation())).toEqual(new Int32Array([1, 2]));
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_ivec3._getLocation())).toEqual(new Int32Array([1, 2, 3]));
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_ivec4._getLocation())).toEqual(new Int32Array([1, 2, 3, 4]));
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_bool._getLocation())).toEqual(true);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_bvec2._getLocation())).toEqual([true, true]);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_bvec3._getLocation())).toEqual([true, true, true]);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_bvec4._getLocation())).toEqual([true, true, true, true]);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_mat2._getLocation())).toEqual([1.0, 3.0, 2.0, 4.0]);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_mat3._getLocation())).toEqual([1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0]);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_mat4._getLocation())).toEqual([1.0, 5.0, 9.0, 13.0, 2.0, 6.0, 10.0, 14.0, 3.0, 7.0, 11.0, 15.0, 4.0, 8.0, 12.0, 16.0]);
    });

    it('sets a struct uniform', function() {
        var d = context;
        var vs = 'uniform struct { float f; vec4 v; } u_struct; void main() { gl_Position = u_struct.f * u_struct.v; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = d.createShaderProgram(vs, fs);

        sp.getAllUniforms()['u_struct.f'].value = 1;
        sp.getAllUniforms()['u_struct.v'].value = new Cartesian4(1.0, 2.0, 3.0, 4.0);

        sp._bind();
        sp._setUniforms();

        expect(d._gl.getUniform(sp._program, sp.getAllUniforms()['u_struct.f']._getLocation())).toEqual(1);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms()['u_struct.v']._getLocation())).toEqual(new Float32Array([1.0, 2.0, 3.0, 4.0]));
    });

    it('sets a uniform array', function() {
        var d = context;
        var vs = 'uniform float u_float[2];' + 'void main() { gl_Position = vec4(u_float[0]) * vec4(u_float[1]); }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = d.createShaderProgram(vs, fs);
        sp.getAllUniforms().u_float.value = new Float32Array([1, 2]);

        sp._bind();
        sp._setUniforms();

        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_float._getLocations()[0])).toEqual(1);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_float._getLocations()[1])).toEqual(2);
    });

    it('sets uniform arrays', function() {
        var d = context;
        var vs =
            'uniform float u_float[2];' +
            'uniform vec2 u_vec2[2];' +
            'uniform vec3 u_vec3[2];' +
            'uniform vec4 u_vec4[2];' +
            'uniform int u_int[2];' +
            'uniform ivec2 u_ivec2[2];' +
            'uniform ivec3 u_ivec3[2];' +
            'uniform ivec4 u_ivec4[2];' +
            'uniform bool u_bool[2];' +
            'uniform bvec2 u_bvec2[2];' +
            'uniform bvec3 u_bvec3[2];' +
            'uniform bvec4 u_bvec4[2];' +
            'uniform mat2 u_mat2[2];' +
            'uniform mat3 u_mat3[2];' +
            'uniform mat4 u_mat4[2];' +
            'void main() { gl_Position = vec4(u_float[0]) * vec4(u_float[1]) * vec4((u_mat2[0] * u_vec2[0]), 0.0, 0.0) * vec4((u_mat2[1] * u_vec2[1]), 0.0, 0.0) * vec4((u_mat3[0] * u_vec3[0]), 0.0) * vec4((u_mat3[1] * u_vec3[1]), 0.0) * (u_mat4[0] * u_vec4[0]) * (u_mat4[1] * u_vec4[1]) * vec4(u_int[0]) * vec4(u_int[1]) * vec4(u_ivec2[0], 0.0, 0.0) * vec4(u_ivec2[1], 0.0, 0.0) * vec4(u_ivec3[0], 0.0) * vec4(u_ivec3[1], 0.0) * vec4(u_ivec4[0]) * vec4(u_ivec4[1]) * vec4(u_bool[0]) * vec4(u_bool[1]) * vec4(u_bvec2[0], 0.0, 0.0) * vec4(u_bvec2[1], 0.0, 0.0) * vec4(u_bvec3[0], 0.0) * vec4(u_bvec3[1], 0.0) * vec4(u_bvec4[0]) * vec4(u_bvec4[1]); }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = d.createShaderProgram(vs, fs);

        sp.getAllUniforms().u_float.value = [1.0, 2.0];
        sp.getAllUniforms().u_vec2.value = [new Cartesian2(1.0, 2.0), new Cartesian2(3.0, 4.0)];
        sp.getAllUniforms().u_vec3.value = [new Cartesian3(1.0, 2.0, 3.0), new Cartesian3(4.0, 5.0, 6.0)];
        sp.getAllUniforms().u_vec4.value = [new Cartesian4(1.0, 2.0, 3.0, 4.0), new Cartesian4(5.0, 6.0, 7.0, 8.0)];
        sp.getAllUniforms().u_int.value = [1, 2];
        sp.getAllUniforms().u_ivec2.value = [new Cartesian2(1, 2), new Cartesian2(3, 4)];
        sp.getAllUniforms().u_ivec3.value = [new Cartesian3(1, 2, 3), new Cartesian3(4, 5, 6)];
        sp.getAllUniforms().u_ivec4.value = [new Cartesian4(1, 2, 3, 4), new Cartesian4(5, 6, 7, 8)];
        sp.getAllUniforms().u_bool.value = [true, true];
        sp.getAllUniforms().u_bvec2.value = [new Cartesian2(true, true), new Cartesian2(true, true)];
        sp.getAllUniforms().u_bvec3.value = [new Cartesian3(true, true, true), new Cartesian3(true, true, true)];
        sp.getAllUniforms().u_bvec4.value = [new Cartesian4(true, true, true, true), new Cartesian4(true, true, true, true)];
        sp.getAllUniforms().u_mat2.value = [new Matrix2(1.0, 2.0, 3.0, 4.0), new Matrix2(5.0, 6.0, 7.0, 8.0)];
        sp.getAllUniforms().u_mat3.value = [new Matrix3(1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0), new Matrix3(9.0, 6.0, 3.0, 8.0, 5.0, 2.0, 7.0, 4.0, 1.0)];
        sp.getAllUniforms().u_mat4.value = [new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0), new Matrix4(16.0, 15.0, 14.0, 13.0, 12.0, 11.0, 10.0, 9.0, 8.0, 7.0, 6.0, 5.0, 4.0, 3.0, 2.0, 1.0)];

        sp._bind();
        sp._setUniforms();

        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_float._getLocations()[0])).toEqual(1.0);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_float._getLocations()[1])).toEqual(2.0);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_vec2._getLocations()[0])).toEqual(new Float32Array([1.0, 2.0]));
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_vec2._getLocations()[1])).toEqual(new Float32Array([3.0, 4.0]));
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_vec3._getLocations()[0])).toEqual(new Float32Array([1.0, 2.0, 3.0]));
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_vec3._getLocations()[1])).toEqual(new Float32Array([4.0, 5.0, 6.0]));
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_vec4._getLocations()[0])).toEqual(new Float32Array([1.0, 2.0, 3.0, 4.0]));
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_vec4._getLocations()[1])).toEqual(new Float32Array([5.0, 6.0, 7.0, 8.0]));
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_int._getLocations()[0])).toEqual(1);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_int._getLocations()[1])).toEqual(2);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_ivec2._getLocations()[0])).toEqual(new Int32Array([1, 2]));
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_ivec2._getLocations()[1])).toEqual(new Int32Array([3, 4]));
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_ivec3._getLocations()[0])).toEqual(new Int32Array([1, 2, 3]));
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_ivec3._getLocations()[1])).toEqual(new Int32Array([4, 5, 6]));
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_ivec4._getLocations()[0])).toEqual(new Int32Array([1, 2, 3, 4]));
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_ivec4._getLocations()[1])).toEqual(new Int32Array([5, 6, 7, 8]));
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_bool._getLocations()[0])).toEqual(true);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_bool._getLocations()[1])).toEqual(true);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_bvec2._getLocations()[0])).toEqual([true, true]);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_bvec2._getLocations()[1])).toEqual([true, true]);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_bvec3._getLocations()[0])).toEqual([true, true, true]);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_bvec3._getLocations()[1])).toEqual([true, true, true]);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_bvec4._getLocations()[0])).toEqual([true, true, true, true]);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_bvec4._getLocations()[1])).toEqual([true, true, true, true]);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_mat2._getLocations()[0])).toEqual([1.0, 3.0, 2.0, 4.0]);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_mat2._getLocations()[1])).toEqual([5.0, 7.0, 6.0, 8.0]);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_mat3._getLocations()[0])).toEqual([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0]);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_mat3._getLocations()[1])).toEqual([9.0, 8.0, 7.0, 6.0, 5.0, 4.0, 3.0, 2.0, 1.0]);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_mat4._getLocations()[0])).toEqual([1.0, 5.0, 9.0, 13.0, 2.0, 6.0, 10.0, 14.0, 3.0, 7.0, 11.0, 15.0, 4.0, 8.0, 12.0, 16.0]);
        expect(d._gl.getUniform(sp._program, sp.getAllUniforms().u_mat4._getLocations()[1])).toEqual([16.0, 12.0, 8.0, 4.0, 15.0, 11.0, 7.0, 3.0, 14.0, 10.0, 6.0, 2.0, 13.0, 9.0, 5.0, 1.0]);
    });

    it('has predefined constants', function() {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var fs =
            'void main() { ' +
            '  float f = ((czm_pi > 0.0) && \n' +
            '    (czm_oneOverPi > 0.0) && \n' +
            '    (czm_piOverTwo > 0.0) && \n' +
            '    (czm_piOverThree > 0.0) && \n' +
            '    (czm_piOverFour > 0.0) && \n' +
            '    (czm_piOverSix > 0.0) && \n' +
            '    (czm_threePiOver2 > 0.0) && \n' +
            '    (czm_twoPi > 0.0) && \n' +
            '    (czm_oneOverTwoPi > 0.0) && \n' +
            '    (czm_radiansPerDegree > 0.0) && \n' +
            '    (czm_degreesPerRadian > 0.0)) ? 1.0 : 0.0; \n' +
            '  gl_FragColor = vec4(f); \n' +
            '}';
        sp = context.createShaderProgram(vs, fs);

        va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('compiles with #version at the top', function() {
        var vs =
            '#version 100 \n' +
            'attribute vec4 position; void main() { gl_Position = position; }';
        var fs =
            '#version 100 \n' +
            'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);
    });

    it('compiles with #version after whitespace and comments', function() {
        var vs =
            '// comment before version directive. \n' +
            '#version 100 \n' +
            'attribute vec4 position; void main() { gl_Position = position; }';
        var fs =
            '\n' +
            '#version 100 \n' +
            'void main() { gl_FragColor = vec4(1.0); }';
        sp = context.createShaderProgram(vs, fs);
    });

    it('destroys', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        var s = context.createShaderProgram(vs, fs);

        expect(s.isDestroyed()).toEqual(false);
        s.destroy();
        expect(s.isDestroyed()).toEqual(true);
    });

    it('fails vertex shader compile', function() {
        var vs = 'does not compile.';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';

        expect(function() {
            sp = context.createShaderProgram(vs, fs);
        }).toThrow();
    });

    it('fails fragment shader compile', function() {
        var vs = 'void main() { gl_Position = vec4(0.0); }';
        var fs = 'does not compile.';

        expect(function() {
            sp = context.createShaderProgram(vs, fs);
        }).toThrow();
    });

    it('fails to link', function() {
        var vs = 'void nomain() { }';
        var fs = 'void nomain() { }';

        expect(function() {
            sp = context.createShaderProgram(vs, fs);
        }).toThrow();
    });

    it('fails to destroy', function() {
        var vs = 'void main() { gl_Position = vec4(1.0); }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        var s = context.createShaderProgram(vs, fs);
        s.destroy();

        expect(function() {
            s.destroy();
        }).toThrow();
    });
}, 'WebGL');