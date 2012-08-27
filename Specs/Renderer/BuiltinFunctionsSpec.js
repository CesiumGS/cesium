/*global defineSuite*/
defineSuite([
         '../Specs/createContext',
         '../Specs/destroyContext',
         'Core/Math',
         'Core/Matrix4',
         'Core/PrimitiveType',
         'Renderer/BufferUsage'
     ], 'Renderer/BuiltinFunctions', function(
         createContext,
         destroyContext,
         CesiumMath,
         Matrix4,
         PrimitiveType,
         BufferUsage) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    var verifyDraw = function(fs) {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var sp = context.createShaderProgram(vs, fs);

        var va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        sp = sp.destroy();
        va = va.destroy();
    };

    it('has czm_tranpose (2x2)', function() {
        var fs =
            'void main() { ' +
            '  mat2 m = mat2(1.0, 2.0, 3.0, 4.0); ' +
            '  mat2 mt = mat2(1.0, 3.0, 2.0, 4.0); ' +
            '  gl_FragColor = vec4(czm_transpose(m) == mt); ' +
            '}';

        verifyDraw(fs);
    });

    it('has czm_tranpose (3x3)', function() {
        var fs =
            'void main() { ' +
            '  mat3 m = mat3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0); ' +
            '  mat3 mt = mat3(1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0); ' +
            '  gl_FragColor = vec4(czm_transpose(m) == mt); ' +
            '}';

        verifyDraw(fs);
    });

    it('has czm_tranpose (4x4)', function() {
        var fs =
            'void main() { ' +
            '  mat4 m = mat4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);' +
            '  mat4 mt = mat4(1.0, 5.0, 9.0, 13.0, 2.0, 6.0, 10.0, 14.0, 3.0, 7.0, 11.0, 15.0, 4.0, 8.0, 12.0, 16.0);' +
            '  gl_FragColor = vec4(czm_transpose(m) == mt); ' +
            '}';

        verifyDraw(fs);
    });

    it('has czm_eyeToWindowCoordinates', function() {
        var vp = context.getViewport();
        var perspective = Matrix4.computePerspectiveFieldOfView(CesiumMath.toRadians(60.0), vp.width / vp.height, 1.0, 10.0);
        context.getUniformState().setProjection(perspective);

        var fs =
            'void main() { ' +
            '  float z = czm_projection[3][2] / czm_projection[2][2];' +
            '  float x = z / czm_projection[0][0];' +
            '  float y = z / czm_projection[1][1];' +
            '  vec4 pointEC = vec4(x, y, z, 1.0);' +
            '  vec2 fragCoord = vec2(0.0, 0.0);' +
            '  vec4 actual = czm_eyeToWindowCoordinates(pointEC);' +
            '  vec2 diff = actual.xy - fragCoord;' +
            '  gl_FragColor = vec4(all(lessThan(diff, vec2(czm_epsilon6))));' +
            '}';

        verifyDraw(fs);
    });

    it('has czm_windowToEyeCoordinates', function() {
        var vp = context.getViewport();
        var perspective = Matrix4.computePerspectiveFieldOfView(CesiumMath.toRadians(60.0), vp.width / vp.height, 1.0, 10.0);
        context.getUniformState().setProjection(perspective);

        var fs =
            'void main() { ' +
            '  float z = czm_projection[3][2] / czm_projection[2][2];' +
            '  float x = z / czm_projection[0][0];' +
            '  float y = z / czm_projection[1][1];' +
            '  vec3 pointEC = vec3(x, y, z);' +
            '  vec4 fragCoord = vec4(0.0, 0.0, 0.0, -z);' +
            '  vec4 actual = czm_windowToEyeCoordinates(fragCoord);' +
            '  vec3 diff = actual.xyz - pointEC;' +
            '  gl_FragColor = vec4(all(lessThan(diff, vec3(czm_epsilon6))));' +
            '}';

        verifyDraw(fs);
    });
});