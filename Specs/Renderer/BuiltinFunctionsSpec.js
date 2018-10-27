defineSuite([
        'Core/BoundingRectangle',
        'Core/Cartesian3',
        'Core/Cartesian4',
        'Core/Math',
        'Core/EncodedCartesian3',
        'Specs/createCamera',
        'Specs/createContext',
        'Specs/createFrameState'
    ], 'Renderer/BuiltinFunctions', function(
        BoundingRectangle,
        Cartesian3,
        Cartesian4,
        CesiumMath,
        EncodedCartesian3,
        createCamera,
        createContext,
        createFrameState) {
    'use strict';

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    it('has czm_transpose (2x2)', function() {
        var fs =
            'void main() { ' +
            '  mat2 m = mat2(1.0, 2.0, 3.0, 4.0); ' +
            '  mat2 mt = mat2(1.0, 3.0, 2.0, 4.0); ' +
            '  gl_FragColor = vec4(czm_transpose(m) == mt); ' +
            '}';

        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has czm_transpose (3x3)', function() {
        var fs =
            'void main() { ' +
            '  mat3 m = mat3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0); ' +
            '  mat3 mt = mat3(1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0); ' +
            '  gl_FragColor = vec4(czm_transpose(m) == mt); ' +
            '}';

        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has czm_transpose (4x4)', function() {
        var fs =
            'void main() { ' +
            '  mat4 m = mat4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);' +
            '  mat4 mt = mat4(1.0, 5.0, 9.0, 13.0, 2.0, 6.0, 10.0, 14.0, 3.0, 7.0, 11.0, 15.0, 4.0, 8.0, 12.0, 16.0);' +
            '  gl_FragColor = vec4(czm_transpose(m) == mt); ' +
            '}';

        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has czm_eyeToWindowCoordinates', function() {
        var camera = createCamera();
        camera.frustum.near = 1.0;

        var canvas = context.canvas;
        var width = canvas.clientWidth;
        var height = canvas.clientHeight;
        var vp = new BoundingRectangle(0.0, 0.0, width, height);
        context.uniformState.viewport = vp;
        context.uniformState.update(createFrameState(context, camera));

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

        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has czm_windowToEyeCoordinates', function() {
        var camera = createCamera();
        camera.frustum.near = 1.0;

        var canvas = context.canvas;
        var width = canvas.clientWidth;
        var height = canvas.clientHeight;
        var vp = new BoundingRectangle(0.0, 0.0, width, height);
        context.uniformState.viewport = vp;
        context.uniformState.update(createFrameState(context, camera));

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

        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();

        fs =
        'void main() { ' +
        '  float z = czm_projection[3][2] / czm_projection[2][2];' +
        '  float x = z / czm_projection[0][0];' +
        '  float y = z / czm_projection[1][1];' +
        '  vec3 pointEC = vec3(x, y, z);' +
        '  vec4 actual = czm_windowToEyeCoordinates(vec2(0.0, 0.0), 0.0);' +
        '  vec3 diff = actual.xyz - pointEC;' +
        '  gl_FragColor = vec4(all(lessThan(diff, vec3(czm_epsilon6))));' +
        '}';

        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has czm_planeDistance', function() {
        var fs =
            'void main() { ' +
            '  vec4 plane = vec4(1.0, 0.0, 0.0, 0.0); ' +
            '  vec3 point = vec3(1.0, 0.0, 0.0); ' +
            '  float expected = 1.0; ' +
            '  float actual = czm_planeDistance(plane, point); ' +
            '  gl_FragColor = vec4(actual == expected); ' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();

        fs =
            'void main() { ' +
            '  vec4 plane = vec4(1.0, 0.0, 0.0, 0.0); ' +
            '  vec3 point = vec3(1.0, 0.0, 0.0); ' +
            '  float expected = 1.0; ' +
            '  float actual = czm_planeDistance(plane.xyz, plane.w, point); ' +
            '  gl_FragColor = vec4(actual == expected); ' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has czm_lineDistance', function() {
        var fs =
            'void main() { ' +
            '  vec2 point1 = vec2(0.0, 0.0); ' +
            '  vec2 point2 = vec2(1.0, 0.0); ' +
            '  vec2 point = vec2(0.5, 1.0); ' +
            '  float expected = 1.0; ' +
            '  float actual = czm_lineDistance(point1, point2, point); ' +
            '  gl_FragColor = vec4(actual == expected); ' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has czm_tangentToEyeSpaceMatrix', function() {
        var fs =
            'void main() { ' +
            '  vec3 tangent = vec3(1.0, 0.0, 0.0); ' +
            '  vec3 bitangent = vec3(0.0, 1.0, 0.0); ' +
            '  vec3 normal = vec3(0.0, 0.0, 1.0); ' +
            '  mat3 expected = mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0); ' +
            '  mat3 actual = czm_tangentToEyeSpaceMatrix(normal, tangent, bitangent); ' +
            '  gl_FragColor = vec4(actual == expected); ' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has czm_translateRelativeToEye', function() {
        var camera = createCamera({
            offset : new Cartesian3(1.0, 2.0, 3.0)
        });
        context.uniformState.update(createFrameState(context, camera));

        var p = new Cartesian3(6.0, 5.0, 4.0);
        var encoded = EncodedCartesian3.fromCartesian(p);

        var uniformMap = {
            u_high : function() {
                return encoded.high;
            },
            u_low : function() {
                return encoded.low;
            }
        };

        var fs =
            'uniform vec3 u_high;' +
            'uniform vec3 u_low;' +
            'void main() { ' +
            '  vec4 p = czm_translateRelativeToEye(u_high, u_low);' +
            '  gl_FragColor = vec4(p == vec4(5.0, 3.0, 1.0, 1.0)); ' +
            '}';

        expect({
            context : context,
            fragmentShader : fs,
            uniformMap : uniformMap
        }).contextToRender();
    });

    it('has czm_antialias', function() {
        var fs =
            'void main() {' +
            '  vec4 color0 = vec4(1.0, 0.0, 0.0, 1.0);' +
            '  vec4 color1 = vec4(0.0, 1.0, 0.0, 1.0);' +
            '  vec4 result = czm_antialias(color0, color1, color1, 0.5);' +
            ' gl_FragColor = vec4(result == color1);' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('czm_pointAlongRay: point at ray origin', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(czm_pointAlongRay(czm_ray(vec3(0.0), vec3(1.0, 0.0, 0.0)), 0.0) == vec3(0.0)); ' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('czm_pointAlongRay: point in front of ray origin', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(czm_pointAlongRay(czm_ray(vec3(0.0), vec3(1.0, 0.0, 0.0)), 2.0) == vec3(2.0, 0.0, 0.0)); ' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('czm_pointAlongRay: point behind ray origin', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(czm_pointAlongRay(czm_ray(vec3(0.0), vec3(0.0, 1.0, 0.0)), -2.0) == vec3(0.0, -2.0, 0.0)); ' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has czm_octDecode(vec2)', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(all(lessThanEqual(abs(czm_octDecode(vec2(128.0, 128.0)) - vec3(0.0, 0.0, 1.0)), vec3(0.01)))); ' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has czm_octDecode(float)', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(all(lessThanEqual(abs(czm_octDecode(32896.0) - vec3(0.0, 0.0, 1.0)), vec3(0.01)))); ' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has czm_octDecode(vec2, vec3, vec3, vec3)', function() {
        var fs =
            'void main() { ' +
            '  vec3 a, b, c;' +
            '  czm_octDecode(vec2(8454016.0, 8421631.0), a, b, c);' +
            '  bool decoded = all(lessThanEqual(abs(a - vec3(1.0, 0.0, 0.0)), vec3(0.01)));' +
            '  decoded = decoded && all(lessThanEqual(abs(b - vec3(0.0, 1.0, 0.0)), vec3(0.01)));' +
            '  decoded = decoded && all(lessThanEqual(abs(c - vec3(0.0, 0.0, 1.0)), vec3(0.01)));' +
            '  gl_FragColor = vec4(decoded);' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has czm_decompressTextureCoordinates', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(czm_decompressTextureCoordinates(8386559.0) == vec2(0.4998779, 0.4998779)); ' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has signNotZero : float', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(czm_signNotZero(0.0) == 1.0, ' +
            '                      czm_signNotZero(5.0) == 1.0, ' +
            '                      czm_signNotZero(-5.0) == -1.0, 1.0); ' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has signNotZero : vec2', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(czm_signNotZero(vec2(0.0, 0.0)) == vec2(1.0, 1.0), ' +
            '                      czm_signNotZero(vec2(1.0, 1.0)) == vec2(1.0, 1.0), ' +
            '                      czm_signNotZero(vec2(-1.0, -1.0)) == vec2(-1.0, -1.0), ' +
            '                      czm_signNotZero(vec2(-1.0, 0.0)) == vec2(-1.0, 1.0)); ' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has signNotZero : vec3', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(czm_signNotZero(vec3(0.0, 0.0, 0.0)) == vec3(1.0, 1.0, 1.0), ' +
            '                      czm_signNotZero(vec3(1.0, 1.0, 1.0)) == vec3(1.0, 1.0, 1.0), ' +
            '                      czm_signNotZero(vec3(-1.0, -1.0, -1.0)) == vec3(-1.0, -1.0, -1.0), ' +
            '                      czm_signNotZero(vec3(-1.0, 0.0, 1.0)) == vec3(-1.0, 1.0, 1.0)); ' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has signNotZero : vec4', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(czm_signNotZero(vec4(0.0, 0.0, 0.0, 0.0)) == vec4(1.0), ' +
            '                      czm_signNotZero(vec4(1.0, 1.0, 1.0, 1.0)) == vec4(1.0), ' +
            '                      czm_signNotZero(vec4(-1.0, -1.0, -1.0, -1.0)) == vec4(-1.0), ' +
            '                      czm_signNotZero(vec4(-1.0, 0.0, 1.0, -10.0)) == vec4(-1.0, 1.0, 1.0, -1.0)); ' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has czm_cosineAndSine in all 4 quadrants', function() {
        var fs =
            'bool isBounded(float value, float min, float max) { ' +
            '  return ((value < max) && (value > min)); ' +
            '}' +
            'void main() { ' +
            '  gl_FragColor = vec4(isBounded(czm_cosineAndSine(czm_piOverFour).x, 0.707106, 0.707107) && isBounded(czm_cosineAndSine(czm_piOverFour).y, 0.707106, 0.707107), ' +
            '                      isBounded(czm_cosineAndSine(czm_pi - czm_piOverFour).x, -0.707107, -0.707106) && isBounded(czm_cosineAndSine(czm_pi - czm_piOverFour).y, 0.707106, 0.707107), ' +
            '                      isBounded(czm_cosineAndSine(-czm_piOverFour).x, 0.707106, 0.707107) && isBounded(czm_cosineAndSine(-czm_piOverFour).y, -0.707107, -0.707106), ' +
            '                      isBounded(czm_cosineAndSine(-czm_pi + czm_piOverFour).x, -0.707107, -0.707106) && isBounded(czm_cosineAndSine(-czm_pi + czm_piOverFour).y, -0.707107, -0.707106)); ' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('can calculate nearFarScalar', function() {
        var fs =
            'vec4 testNearFarScalar = vec4(10.0, 1.0, 20.0, 0.0);' +
            'void main() { ' +
            '  gl_FragColor = vec4(czm_nearFarScalar(testNearFarScalar, 5.0 * 5.0) == 1.0, ' +
            '                      czm_nearFarScalar(testNearFarScalar, 10.0 * 10.0) == 1.0, ' +
            '                      czm_nearFarScalar(testNearFarScalar, 20.0 * 20.0) == 0.0, ' +
            '                      czm_nearFarScalar(testNearFarScalar, 50.0 * 50.0) == 0.0); ' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has czm_cascadeColor', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(all(equal(czm_cascadeColor(vec4(0.5)), vec4(1.0, 0.5, 1.0, 2.0))));' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has czm_approximateSphericalCoordinates', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(all(equal(czm_approximateSphericalCoordinates(vec3(1.0, 0.0, 0.0)), vec2(0.0, 0.0))));' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has czm_transformPlane', function() {
        var fs =
            'void main() { ' +
            '  mat4 uniformScale2 = mat4(2.0, 0.0, 0.0, 0.0,' +
            '                            0.0, 2.0, 0.0, 0.0,' +
            '                            0.0, 0.0, 2.0, 0.0,' +
            '                            0.0, 0.0, 0.0, 1.0);' +
            '  gl_FragColor = vec4(all(equal(czm_transformPlane(vec4(1.0, 0.0, 0.0, 10.0), uniformScale2), vec4(1.0, 0.0, 0.0, 20.0))));' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has czm_unpackFloat', function() {
        var packed = Cartesian4.packFloat(1);
        var vec4 = 'vec4(' + packed.x + ', ' + packed.y + ', ' + packed.z + ', ' + packed.w + ')';
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(czm_unpackFloat(' + vec4 + '));' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has czm_branchFreeTernary', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(czm_branchFreeTernary(true, 1.0, 0.0));' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();

        fs =
            'void main() { ' +
            '  gl_FragColor = vec4(czm_branchFreeTernary(true, vec2(1.0), vec2(0.0)), 1.0, 1.0);' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();

        fs =
            'void main() { ' +
            '  gl_FragColor = vec4(czm_branchFreeTernary(true, vec3(1.0), vec3(0.0)), 1.0);' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();

        fs =
            'void main() { ' +
            '  gl_FragColor = czm_branchFreeTernary(true, vec4(1.0), vec4(0.0));' +
            '}';
        expect({
            context : context,
            fragmentShader : fs
        }).contextToRender();
    });

    it('has czm_fastApproximateAtan', function() {
        var fsAtan =
            'void main() { ' +
            '  gl_FragColor = vec4(czm_fastApproximateAtan(0.0) == 0.0);' +
            '}';
        expect({
            context : context,
            fragmentShader : fsAtan
        }).contextToRender();

        var fsAtan2 =
            'void main() { ' +
            '  gl_FragColor = vec4(czm_fastApproximateAtan(1.0, 0.0) == 0.0);' +
            '}';
        expect({
            context : context,
            fragmentShader : fsAtan2
        }).contextToRender();
    });

}, 'WebGL');
