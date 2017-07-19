defineSuite([
        'Renderer/ShaderProgram',
        'Renderer/ContextLimits',
        'Renderer/ShaderSource',
        'Specs/createContext'
    ], function(
        ShaderProgram,
        ContextLimits,
        ShaderSource,
        createContext) {
    'use strict';

    var webglStub = !!window.webglStub;
    var context;
    var sp;

    var injectedTestFunctions = {
        czm_circularDependency1 : 'void czm_circularDependency1() { czm_circularDependency2(); }',
        czm_circularDependency2 : 'void czm_circularDependency2() { czm_circularDependency1(); }',
        czm_testFunction3 : 'void czm_testFunction3(vec4 color) { czm_testFunction2(color); }',
        czm_testFunction2 : 'void czm_testFunction2(vec4 color) { czm_testFunction1(color); }',
        czm_testFunction1 : 'void czm_testFunction1(vec4 color) { gl_FragColor = color; }',
        czm_testDiamondDependency1 : 'vec4 czm_testDiamondDependency1(vec4 color) { return czm_testAddAlpha(color); }',
        czm_testDiamondDependency2 : 'vec4 czm_testDiamondDependency2(vec4 color) { return czm_testAddAlpha(color); }',
        czm_testAddAlpha : 'vec4 czm_testAddAlpha(vec4 color) { color.a = clamp(color.a + 0.1, 0.0, 1.0); return color; }',
        czm_testAddRed : 'vec4 czm_testAddRed(vec4 color) { color.r = clamp(color.r + 0.1, 0.0, 1.0); return color; }',
        czm_testAddGreen : 'vec4 czm_testAddGreen(vec4 color) { color.g = clamp(color.g + 0.1, 0.0, 1.0); return color; }',
        czm_testAddRedGreenAlpha : 'vec4 czm_testAddRedGreenAlpha(vec4 color) { color = czm_testAddRed(color); color = czm_testAddGreen(color); color = czm_testAddAlpha(color); return color; }',
        czm_testFunction4 : 'void czm_testFunction4(vec4 color) { color = czm_testAddAlpha(color); color = czm_testAddRedGreenAlpha(color); czm_testFunction3(color); }',
        czm_testFunctionWithComment : '/**\n czm_circularDependency1()  \n*/\nvoid czm_testFunctionWithComment(vec4 color) { czm_testFunction1(color); }'
    };

    beforeAll(function() {
        context = createContext();

        for ( var functionName in injectedTestFunctions) {
            if (injectedTestFunctions.hasOwnProperty(functionName)) {
                ShaderSource._czmBuiltinsAndUniforms[functionName] = injectedTestFunctions[functionName];
            }
        }
    });

    afterAll(function() {
        context.destroyForSpecs();

        for ( var functionName in injectedTestFunctions) {
            if (injectedTestFunctions.hasOwnProperty(functionName)) {
                delete ShaderSource._czmBuiltinsAndUniforms[functionName];
            }
        }
    });

    afterEach(function() {
        sp = sp && sp.destroy();
    });

    it('has vertex and fragment shader source', function() {
        var vs = 'void main() { gl_Position = vec4(1.0); }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs
        });

        var expectedVSText = new ShaderSource({
            sources : [vs]
        }).createCombinedVertexShader(context);

        expect(sp._vertexShaderText).toEqual(expectedVSText);

        var expectedFSText = new ShaderSource({
            sources : [fs]
        }).createCombinedFragmentShader(context);

        expect(sp._fragmentShaderText).toEqual(expectedFSText);
    });

    it('has a position vertex attribute', function() {
        var vs = 'attribute vec4 position; void main() { gl_Position = position; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs
        });

        if (webglStub) {
            return; // WebGL Stub does not return vertex attribute and uniforms in the shader
        }

        expect(sp.numberOfVertexAttributes).toEqual(1);
        expect(sp.vertexAttributes.position.name).toEqual('position');
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

        sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : attributes
        });

        if (webglStub) {
            return; // WebGL Stub does not return vertex attribute and uniforms in the shader
        }

        expect(sp.numberOfVertexAttributes).toEqual(3);
        expect(sp.vertexAttributes.position.name).toEqual('position');
        expect(sp.vertexAttributes.position.index).toEqual(attributes.position);
        expect(sp.vertexAttributes.normal.name).toEqual('normal');
        expect(sp.vertexAttributes.normal.index).toEqual(attributes.normal);
        expect(sp.vertexAttributes.heat.name).toEqual('heat');
        expect(sp.vertexAttributes.heat.index).toEqual(attributes.heat);
    });

    it('has an automatic uniform', function() {
        var vs = 'uniform vec4 u_vec4; void main() { gl_Position = u_vec4; }';
        var fs = 'void main() { gl_FragColor = vec4((czm_viewport.x == 0.0) && (czm_viewport.y == 0.0) && (czm_viewport.z == 1.0) && (czm_viewport.w == 1.0)); }';
        sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs
        });

        if (webglStub) {
            return; // WebGL Stub does not return vertex attribute and uniforms in the shader
        }

        expect(sp.allUniforms.u_vec4.name).toEqual('u_vec4');
        expect(sp.allUniforms.czm_viewport.name).toEqual('czm_viewport');
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
        sp = ShaderProgram.fromCache({
            context : d,
            vertexShaderSource : vs,
            fragmentShaderSource : fs
        });

        if (webglStub) {
            return; // WebGL Stub does not return vertex attribute and uniforms in the shader
        }

        expect(sp.allUniforms.u_float.name).toEqual('u_float');
        expect(sp.allUniforms.u_vec2.name).toEqual('u_vec2');
        expect(sp.allUniforms.u_vec3.name).toEqual('u_vec3');
        expect(sp.allUniforms.u_vec4.name).toEqual('u_vec4');
        expect(sp.allUniforms.u_int.name).toEqual('u_int');
        expect(sp.allUniforms.u_ivec2.name).toEqual('u_ivec2');
        expect(sp.allUniforms.u_ivec3.name).toEqual('u_ivec3');
        expect(sp.allUniforms.u_ivec4.name).toEqual('u_ivec4');
        expect(sp.allUniforms.u_bool.name).toEqual('u_bool');
        expect(sp.allUniforms.u_bvec2.name).toEqual('u_bvec2');
        expect(sp.allUniforms.u_bvec3.name).toEqual('u_bvec3');
        expect(sp.allUniforms.u_bvec4.name).toEqual('u_bvec4');
        expect(sp.allUniforms.u_mat2.name).toEqual('u_mat2');
        expect(sp.allUniforms.u_mat3.name).toEqual('u_mat3');
        expect(sp.allUniforms.u_mat4.name).toEqual('u_mat4');
        expect(sp.allUniforms.u_sampler2D.name).toEqual('u_sampler2D');
        expect(sp.allUniforms.u_samplerCube.name).toEqual('u_samplerCube');
    });

    it('has a struct uniform', function() {
        var vs = 'uniform struct { float f; vec4 v; } u_struct; void main() { gl_Position = u_struct.f * u_struct.v; }';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs
        });

        if (webglStub) {
            return; // WebGL Stub does not return vertex attribute and uniforms in the shader
        }

        expect(sp.allUniforms['u_struct.f'].name).toEqual('u_struct.f');
        expect(sp.allUniforms['u_struct.v'].name).toEqual('u_struct.v');
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
        sp = ShaderProgram.fromCache({
            context : d,
            vertexShaderSource : vs,
            fragmentShaderSource : fs
        });

        if (webglStub) {
            return; // WebGL Stub does not return vertex attribute and uniforms in the shader
        }

        expect(sp.allUniforms.u_float.name).toEqual('u_float');
        expect(sp.allUniforms.u_vec2.name).toEqual('u_vec2');
        expect(sp.allUniforms.u_vec3.name).toEqual('u_vec3');
        expect(sp.allUniforms.u_vec4.name).toEqual('u_vec4');
        expect(sp.allUniforms.u_int.name).toEqual('u_int');
        expect(sp.allUniforms.u_ivec2.name).toEqual('u_ivec2');
        expect(sp.allUniforms.u_ivec3.name).toEqual('u_ivec3');
        expect(sp.allUniforms.u_ivec4.name).toEqual('u_ivec4');
        expect(sp.allUniforms.u_bool.name).toEqual('u_bool');
        expect(sp.allUniforms.u_bvec2.name).toEqual('u_bvec2');
        expect(sp.allUniforms.u_bvec3.name).toEqual('u_bvec3');
        expect(sp.allUniforms.u_bvec4.name).toEqual('u_bvec4');
        expect(sp.allUniforms.u_mat2.name).toEqual('u_mat2');
        expect(sp.allUniforms.u_mat3.name).toEqual('u_mat3');
        expect(sp.allUniforms.u_mat4.name).toEqual('u_mat4');
        expect(sp.allUniforms.u_sampler2D.name).toEqual('u_sampler2D');
        expect(sp.allUniforms.u_samplerCube.name).toEqual('u_samplerCube');

        expect(sp.allUniforms.u_float.value.length).toEqual(2);
        expect(sp.allUniforms.u_vec2.value.length).toEqual(2);
        expect(sp.allUniforms.u_vec3.value.length).toEqual(2);
        expect(sp.allUniforms.u_vec4.value.length).toEqual(2);
        expect(sp.allUniforms.u_int.value.length).toEqual(2);
        expect(sp.allUniforms.u_ivec2.value.length).toEqual(2);
        expect(sp.allUniforms.u_ivec3.value.length).toEqual(2);
        expect(sp.allUniforms.u_ivec4.value.length).toEqual(2);
        expect(sp.allUniforms.u_bool.value.length).toEqual(2);
        expect(sp.allUniforms.u_bvec2.value.length).toEqual(2);
        expect(sp.allUniforms.u_bvec3.value.length).toEqual(2);
        expect(sp.allUniforms.u_bvec4.value.length).toEqual(2);
        expect(sp.allUniforms.u_mat2.value.length).toEqual(2);
        expect(sp.allUniforms.u_mat3.value.length).toEqual(2);
        expect(sp.allUniforms.u_mat4.value.length).toEqual(2);
        expect(sp.allUniforms.u_sampler2D.value.length).toEqual(2);
        expect(sp.allUniforms.u_samplerCube.value.length).toEqual(2);
    });

    it('has predefined constants', function() {
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

        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has built-in constant, structs, and functions', function() {
        var fs =
            'void main() { \n' +
            '  czm_materialInput materialInput; \n' +
            '  czm_material material = czm_getDefaultMaterial(materialInput); \n' +
            '  material.diffuse = vec3(1.0, 1.0, 1.0); \n' +
            '  material.alpha = 1.0; \n' +
            '  material.diffuse = czm_hue(material.diffuse, czm_twoPi); \n' +
            '  gl_FragColor = vec4(material.diffuse, material.alpha); \n' +
            '}';

        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('creates duplicate uniforms if precision of uniforms in vertex and fragment shader do not match', function() {
        var highpFloatSupported = ContextLimits.highpFloatSupported;
        ContextLimits._highpFloatSupported = false;
        var vs = 'attribute vec4 position; uniform float u_value; varying float v_value; void main() { gl_PointSize = 1.0; v_value = u_value * czm_viewport.z; gl_Position = position; }';
        var fs = 'uniform float u_value; varying float v_value; void main() { gl_FragColor = vec4(u_value * v_value * czm_viewport.z); }';
        var uniformMap = {
            u_value : function() {
                return 1.0;
            }
        };

        sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs
        });

        if (!webglStub) {
            // WebGL Stub does not return vertex attribute and uniforms in the shader
            expect(sp.allUniforms.u_value).toBeDefined();
            expect(sp.allUniforms.czm_mediump_u_value).toBeDefined();
        }

        expect({
            context : context,
            vertexShader : vs,
            fragmentShader : fs,
            uniformMap : uniformMap
        }).notContextToRender([0, 0, 0, 0]);

        ContextLimits._highpFloatSupported = highpFloatSupported;
    });

    it('1 level function dependency', function() {
        var fs =
            'void main() { \n' +
            '  czm_testFunction1(vec4(1.0)); \n' +
            '}';

        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('2 level function dependency', function() {
        var fs =
            'void main() { \n' +
            '  czm_testFunction2(vec4(1.0)); \n' +
            '}';

        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('3 level function dependency', function() {
        var fs =
            'void main() { \n' +
            '  czm_testFunction3(vec4(1.0)); \n' +
            '}';

        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('diamond dependency', function() {
        var fs =
            'void main() { \n' +
            '  vec4 color = vec4(1.0, 1.0, 1.0, 0.8); \n' +
            '  color = czm_testDiamondDependency1(color); \n' +
            '  color = czm_testDiamondDependency2(color); \n' +
            '  gl_FragColor = color; \n' +
            '}';

        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('diamond plus 3 level function dependency', function() {
        var fs =
            'void main() { \n' +
            '  vec4 color = vec4(1.0, 1.0, 1.0, 0.8); \n' +
            '  color = czm_testDiamondDependency1(color); \n' +
            '  color = czm_testDiamondDependency2(color); \n' +
            '  czm_testFunction3(color); \n' +
            '}';

        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('big mess of function dependencies', function() {
        var fs =
            'void main() { \n' +
            '  vec4 color = vec4(0.9, 0.9, 1.0, 0.6); \n' +
            '  color = czm_testDiamondDependency1(color); \n' +
            '  color = czm_testDiamondDependency2(color); \n' +
            '  czm_testFunction4(color); \n' +
            '}';

        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('doc comment with reference to another function', function() {
        var fs =
            'void main() { \n' +
            '  vec4 color = vec4(1.0, 1.0, 1.0, 1.0); \n' +
            '  czm_testFunctionWithComment(color); \n' +
            '}';

        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('compiles with #version at the top', function() {
        var vs =
            '#version 100 \n' +
            'attribute vec4 position; void main() { gl_Position = position; }';
        var fs =
            '#version 100 \n' +
            'void main() { gl_FragColor = vec4(1.0); }';
        sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs
        });
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
        sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs
        });
    });

    it('fails vertex shader compile', function() {
        if (webglStub) {
            return; // WebGL Stub does not actually try to compile the shader
        }

        var vs = 'does not compile.';
        var fs = 'void main() { gl_FragColor = vec4(1.0); }';
        sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs
        });

        expect(function() {
            sp._bind();
        }).toThrowRuntimeError();
    });

    it('fails fragment shader compile', function() {
        if (webglStub) {
            return; // WebGL Stub does not actually try to compile the shader
        }

        var vs = 'void main() { gl_Position = vec4(0.0); }';
        var fs = 'does not compile.';
        sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs
        });

        expect(function() {
            sp._bind();
        }).toThrowRuntimeError();
    });

    it('fails to link', function() {
        if (webglStub) {
            return; // WebGL Stub does not actually try to compile and link the shader
        }

        var vs = 'void nomain() { }';
        var fs = 'void nomain() { }';
        sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs
        });

        expect(function() {
            sp._bind();
        }).toThrowRuntimeError();
    });

    it('fails with built-in function circular dependency', function() {
        var vs = 'void main() { gl_Position = vec4(0.0); }';
        var fs = 'void main() { czm_circularDependency1(); gl_FragColor = vec4(1.0); }';
        expect(function() {
            sp = ShaderProgram.fromCache({
                context : context,
                vertexShaderSource : vs,
                fragmentShaderSource : fs
            });
            sp._bind();
        }).toThrowDeveloperError();
    });
}, 'WebGL');
