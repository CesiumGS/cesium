/*global defineSuite*/
defineSuite([
         '../Specs/createContext',
         '../Specs/destroyContext',
         '../Specs/renderFragment',
         'Shaders/Ray',
         'Shaders/ConstructiveSolidGeometry'
     ], 'Renderer/ConstructiveSolidGeometry', function(
         createContext,
         destroyContext,
         renderFragment,
         ShadersRay,
         ShadersConstructiveSolidGeometry) {
    "use strict";
    /*global xit,it,expect,beforeEach,afterEach*/

    var context;

    beforeEach(function() {
        context = createContext();
    });

    afterEach(function() {
        destroyContext(context);
    });

    renderFragment = (function(renderFragment) {
        return function(context, fs) {
            var fsSource =
                '#line 0\n' +
                ShadersRay +
                '#line 0\n' +
                ShadersConstructiveSolidGeometry +
                '#line 0\n' +
                fs;
            return renderFragment(context, fsSource);
        };
    })(renderFragment);

    ///////////////////////////////////////////////////////////////////////

    it('agi_quadraticRealPolynomialRealRoots: negative b', function() {
        var fs =
            'void main() { ' +
            '  agi_quadraticRoots r = agi_quadraticRealPolynomialRealRoots(2.0, -4.0, -6.0);' + // 2(x+1)(x-3)
            '  gl_FragColor = vec4((r.numberOfRoots == 2) && (r.root0 == -1.0) && (r.root1 == 3.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_quadraticRealPolynomialRealRoots: positive b', function() {
        var fs =
            'void main() { ' +
            '  agi_quadraticRoots r = agi_quadraticRealPolynomialRealRoots(2.0, 4.0, -6.0);' + // 2(x+1)(x-3)
            '  gl_FragColor = vec4((r.numberOfRoots == 2) && (r.root0 == -3.0) && (r.root1 == 1.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_quadraticRealPolynomialRealRoots: marginally negative radical case', function() {
        var fs =
            'void main() { ' +
            '  agi_quadraticRoots r = agi_quadraticRealPolynomialRealRoots(2.0, -3.999999999999999, 2.0);' + // 2(x-1)(x-1)
            '  gl_FragColor = vec4((r.numberOfRoots == 2) && agi_equalsEpsilon(r.root0, 1.0) && agi_equalsEpsilon(r.root1, 1.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_quadraticRealPolynomialRealRoots: complex roots', function() {
        var fs =
            'void main() { ' +
            '  agi_quadraticRoots r = agi_quadraticRealPolynomialRealRoots(2.0, -4.0, 6.0);' + // f(x) = 2x^2 - 4x + 6
            '  gl_FragColor = vec4(r.numberOfRoots == 0); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_quadraticRealPolynomialRealRoots: intractable', function() {
        var fs =
            'void main() { ' +
            '  agi_quadraticRoots r = agi_quadraticRealPolynomialRealRoots(0.0, 0.0, -3.0);' + // f(x) = -3
            '  gl_FragColor = vec4(r.numberOfRoots == 0); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_quadraticRealPolynomialRealRoots: linear', function() {
        var fs =
            'void main() { ' +
            '  agi_quadraticRoots r = agi_quadraticRealPolynomialRealRoots(0.0, 2.0, 8.0);' + // f(x) = 2x + 8
            '  gl_FragColor = vec4((r.numberOfRoots == 1) && (r.root0 == -4.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_quadraticRealPolynomialRealRoots: 2nd order monomial', function() {
        var fs =
            'void main() { ' +
            '  agi_quadraticRoots r = agi_quadraticRealPolynomialRealRoots(3.0, 0.0, 0.0);' + // f(x) = 3x^2
            '  gl_FragColor = vec4((r.numberOfRoots == 2) && (r.root0 == 0.0) && (r.root1 == 0.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_quadraticRealPolynomialRealRoots: parabolic complex roots', function() {
        var fs =
            'void main() { ' +
            '  agi_quadraticRoots r = agi_quadraticRealPolynomialRealRoots(3.0, 0.0, 18.0);' + // f(x) = 2x^2 + 18
            '  gl_FragColor = vec4(r.numberOfRoots == 0); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_quadraticRealPolynomialRealRoots: parabolic real roots', function() {
        var fs =
            'void main() { ' +
            '  agi_quadraticRoots r = agi_quadraticRealPolynomialRealRoots(2.0, 0.0, -18.0);' + // f(x) = 2x^2 - 18
            '  gl_FragColor = vec4((r.numberOfRoots == 2) && (r.root0 == -3.0) && (r.root1 == 3.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_quadraticRealPolynomialRealRoots: zero and negative root', function() {
        var fs =
            'void main() { ' +
            '  agi_quadraticRoots r = agi_quadraticRealPolynomialRealRoots(2.0, 6.0, 0.0);' + // f(x) = 2x^2 + 6x
            '  gl_FragColor = vec4((r.numberOfRoots == 2) && (r.root0 == -3.0) && (r.root1 == 0.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_quadraticRealPolynomialRealRoots: zero and positive root', function() {
        var fs =
            'void main() { ' +
            '  agi_quadraticRoots r = agi_quadraticRealPolynomialRealRoots(2.0, -6.0, 0.0);' + // f(x) = 2x^2 - 6x
            '  gl_FragColor = vec4((r.numberOfRoots == 2) && (r.root0 == 0.0) && (r.root1 == 3.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    ///////////////////////////////////////////////////////////////////////

    it('agi_raySphereIntersectionInterval: fails to intersect (1)', function() {
        var fs =
            'void main() { ' +
            '  agi_ray ray = agi_ray(vec3(0.0), vec3(-1.0, 0.0, 0.0));' +
            '  agi_sphere sphere = agi_sphere(vec3(2.0, 0.0, 0.0), 1.0); ' +
            '  agi_raySegment i = agi_raySphereIntersectionInterval(ray, sphere);' +
            '  gl_FragColor = vec4(agi_isEmpty(i)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_raySphereIntersectionInterval: fails to intersect (2)', function() {
        var fs =
            'void main() { ' +
            '  agi_ray ray = agi_ray(vec3(0.0, 2.0, 0.0), vec3(1.0, 0.0, 0.0));' +
            '  agi_sphere sphere = agi_sphere(vec3(2.0, 0.0, 0.0), 1.0); ' +
            '  agi_raySegment i = agi_raySphereIntersectionInterval(ray, sphere);' +
            '  gl_FragColor = vec4(agi_isEmpty(i)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_raySphereIntersectionInterval: fails to intersect (3)', function() {
        var fs =
            'void main() { ' +
            '  agi_ray ray = agi_ray(vec3(0.0), normalize(vec3(1.0, 2.0, 0.0)));' +
            '  agi_sphere sphere = agi_sphere(vec3(2.0, 0.0, 0.0), 1.0); ' +
            '  agi_raySegment i = agi_raySphereIntersectionInterval(ray, sphere);' +
            '  gl_FragColor = vec4(agi_isEmpty(i)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_raySphereIntersectionInterval: fails to intersect (4)', function() {
        var fs =
            'void main() { ' +
            '  agi_ray ray = agi_ray(vec3(0.0), vec3(-1.0, 0.0, 0.0));' +
            '  agi_sphere sphere = agi_sphere(vec3(2.0, 0.0, 0.0), 0.0); ' +
            '  agi_raySegment i = agi_raySphereIntersectionInterval(ray, sphere);' +
            '  gl_FragColor = vec4(agi_isEmpty(i)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_raySphereIntersectionInterval: outside ray intersects', function() {
        var fs =
            'void main() { ' +
            '  agi_ray ray = agi_ray(vec3(0.0), vec3(1.0, 0.0, 0.0));' +
            '  agi_sphere sphere = agi_sphere(vec3(2.0, 0.0, 0.0), 1.0); ' +
            '  agi_raySegment i = agi_raySphereIntersectionInterval(ray, sphere);' +
            '  gl_FragColor = vec4(i == agi_raySegment(1.0, 3.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_raySphereIntersectionInterval: outside ray intersects at tangent', function() {
        var fs =
            'void main() { ' +
            '  agi_ray ray = agi_ray(vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0));' +
            '  agi_sphere sphere = agi_sphere(vec3(2.0, 0.0, 0.0), 1.0); ' +
            '  agi_raySegment i = agi_raySphereIntersectionInterval(ray, sphere);' +
            '  gl_FragColor = vec4(i == agi_raySegment(2.0, 2.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_raySphereIntersectionInterval: inside ray intersects 0', function() {
        var fs =
            'void main() { ' +
            '  agi_ray ray = agi_ray(vec3(2.0, 0.0, 0.0), vec3(1.0, 0.0, 0.0));' +
            '  agi_sphere sphere = agi_sphere(vec3(2.0, 0.0, 0.0), 1.0); ' +
            '  agi_raySegment i = agi_raySphereIntersectionInterval(ray, sphere);' +
            '  gl_FragColor = vec4(i == agi_raySegment(0.0, 1.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_raySphereIntersectionInterval: inside ray intersects 1', function() {
        var fs =
            'void main() { ' +
            '  agi_ray ray = agi_ray(vec3(2.0, 0.0, 0.0), vec3(-1.0, 0.0, 0.0));' +
            '  agi_sphere sphere = agi_sphere(vec3(2.0, 0.0, 0.0), 1.0); ' +
            '  agi_raySegment i = agi_raySphereIntersectionInterval(ray, sphere);' +
            '  gl_FragColor = vec4(i == agi_raySegment(0.0, 1.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    ///////////////////////////////////////////////////////////////////////

    it('agi_sphereNormal: 0', function() {
        var fs =
            'void main() { ' +
            '  vec3 normal = agi_sphereNormal(agi_sphere(vec3(0.0), 1.0), vec3(1.0, 0.0, 0.0));' +
            '  gl_FragColor = vec4(normal == vec3(1.0, 0.0, 0.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_sphereNormal: 1', function() {
        var fs =
            'void main() { ' +
            '  vec3 normal = agi_sphereNormal(agi_sphere(vec3(0.0, 1.0, 0.0), 1.0), vec3(0.0, 2.0, 0.0));' +
            '  gl_FragColor = vec4(normal == vec3(0.0, 1.0, 0.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    ///////////////////////////////////////////////////////////////////////

    it('agi_ellipsoidContainsPoint: does not contain point 0', function() {
        var fs =
            'void main() {' +
            '  agi_ellipsoid ellipsoid = agi_ellipsoidNew(vec3(0.0), vec3(3.0, 2.0, 1.0));' + // center, radii
            '  vec3 point = vec3(4.0, 0.0, 0.0);' +
            '  gl_FragColor = vec4(!agi_ellipsoidContainsPoint(ellipsoid, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_ellipsoidContainsPoint: does not contain point 1', function() {
        var fs =
            'void main() {' +
            '  agi_ellipsoid ellipsoid = agi_ellipsoidNew(vec3(0.0), vec3(3.0, 2.0, 1.0));' + // center, radii
            '  vec3 point = vec3(-4.0, 0.0, 0.0);' +
            '  gl_FragColor = vec4(!agi_ellipsoidContainsPoint(ellipsoid, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_ellipsoidContainsPoint: does not contain point 2', function() {
        var fs =
            'void main() {' +
            '  agi_ellipsoid ellipsoid = agi_ellipsoidNew(vec3(0.0), vec3(3.0, 2.0, 1.0));' + // center, radii
            '  vec3 point = vec3(0.0, 0.0, 2.0);' +
            '  gl_FragColor = vec4(!agi_ellipsoidContainsPoint(ellipsoid, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_ellipsoidContainsPoint: does not contain point 3', function() {
        var fs = 'void main() {' + 'agi_ellipsoid ellipsoid = agi_ellipsoidNew(vec3(0.0), vec3(3.0, 2.0, 1.0));' + // center, radii
        'vec3 point = vec3(0.0, 0.0, -2.0);' + 'gl_FragColor = vec4(!agi_ellipsoidContainsPoint(ellipsoid, point)); }';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_ellipsoidContainsPoint: contains point 0', function() {
        var fs =
            'void main() {' +
            '  agi_ellipsoid ellipsoid = agi_ellipsoidNew(vec3(0.0), vec3(3.0, 2.0, 1.0));' + // center, radii
            '  vec3 point = vec3(2.0, 0.0, 0.0);' +
            '  gl_FragColor = vec4(agi_ellipsoidContainsPoint(ellipsoid, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_ellipsoidContainsPoint: contains point 1', function() {
        var fs =
            'void main() {' +
            '  agi_ellipsoid ellipsoid = agi_ellipsoidNew(vec3(0.0), vec3(3.0, 2.0, 1.0));' + // center, radii
            '  vec3 point = vec3(-2.0, 0.0, 0.0);' +
            '  gl_FragColor = vec4(agi_ellipsoidContainsPoint(ellipsoid, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_ellipsoidContainsPoint: contains point 2', function() {
        var fs =
            'void main() {' +
            '  agi_ellipsoid ellipsoid = agi_ellipsoidNew(vec3(0.0), vec3(3.0, 2.0, 1.0));' + // center, radii
            '  vec3 point = vec3(0.0, 1.0, 0.0);' +
            '  gl_FragColor = vec4(agi_ellipsoidContainsPoint(ellipsoid, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_ellipsoidContainsPoint: contains point 3', function() {
        var fs =
            'void main() {' +
            '  agi_ellipsoid ellipsoid = agi_ellipsoidNew(vec3(0.0), vec3(3.0, 2.0, 1.0));' + // center, radii
            '  vec3 point = vec3(0.0, -1.0, 0.0);' +
            '  gl_FragColor = vec4(agi_ellipsoidContainsPoint(ellipsoid, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    ///////////////////////////////////////////////////////////////////////

    it('agi_coneContainsPoint: does not contain point 0', function() {
        var fs =
            'void main() {' +
            '  agi_cone cone = agi_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  vec3 point = vec3(1.0, 0.0, 0.0);' +
            '  gl_FragColor = vec4(!agi_coneContainsPoint(cone, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_coneContainsPoint: does not contain point 1', function() {
        var fs =
            'void main() {' +
            '  agi_cone cone = agi_coneNew(vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  vec3 point = vec3(-1.0, 0.0, 0.0);' +
            '  gl_FragColor = vec4(!agi_coneContainsPoint(cone, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_coneContainsPoint: does not contain point 2', function() {
        var fs =
            'void main() {' +
            '  agi_cone cone = agi_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  vec3 point = vec3(0.0, 0.0, -1.0);' +
            '  gl_FragColor = vec4(!agi_coneContainsPoint(cone, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_coneContainsPoint: does not contain point 2', function() {
        var fs =
            'void main() {' +
            '  agi_cone cone = agi_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(120.0));' + // vertex, axis, halfAperture
            '  vec3 point = vec3(0.0, 0.0, -1.0);' +
            '  gl_FragColor = vec4(!agi_coneContainsPoint(cone, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_coneContainsPoint: contains point 0', function() {
        var fs =
            'void main() {' +
            '  agi_cone cone = agi_coneNew(vec3(0.0, 0.0, 2.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  vec3 point = vec3(0.0, 0.0, 3.0);' +
            '  gl_FragColor = vec4(agi_coneContainsPoint(cone, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_coneContainsPoint: contains point 1', function() {
        var fs =
            'void main() {' +
            '  agi_cone cone = agi_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  vec3 point = vec3(1.0, 0.0, 2.0);' +
            '  gl_FragColor = vec4(agi_coneContainsPoint(cone, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_coneContainsPoint: contains point 2', function() {
        var fs =
            'void main() {' +
            '  agi_cone cone = agi_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(120.0));' + // vertex, axis, halfAperture
            '  vec3 point = vec3(1.0, 0.0, 0.0);' +
            '  gl_FragColor = vec4(agi_coneContainsPoint(cone, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    ///////////////////////////////////////////////////////////////////////

    it('agi_rayConeIntersectionInterval: half aperture of 0.0', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(0.0, 0.0, -1.0), vec3(0.0, 0.0, -1.0));' + // origin, direction
            '  agi_cone cone = agi_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(0.0));' + // vertex, axis, halfAperture
            '  agi_raySegmentCollection result = agi_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4(result.count == 0); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    // Fails on AMD with or without ANGLE
    xit('agi_rayConeIntersectionInterval: half aperture of 90.0', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(1.0, 1.0, -1.0), vec3(0.0, 0.0, 1.0));' + // origin, direction
            '  agi_cone cone = agi_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(90.0));' + // vertex, axis, halfAperture
            '  agi_raySegmentCollection result = agi_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4((result.count == 1) ' +
            '    && agi_equalsEpsilon(1.0, result.intervals[0].start, agi_epsilon6) ' +
            '    && (result.intervals[0].stop == agi_infinity)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_rayConeIntersectionInterval: half aperture of 180.0', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(0.0, 0.0, -1.0), vec3(0.0, 0.0, -1.0));' + // origin, direction
            '  agi_cone cone = agi_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(180.0));' + // vertex, axis, halfAperture
            '  agi_raySegmentCollection result = agi_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4((result.count == 1) ' +
            '    && agi_equalsEpsilon(0.0, result.intervals[0].start) ' +
            '    && (result.intervals[0].stop == agi_infinity)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_rayConeIntersectionInterval: ray misses cone 0', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(0.0, 0.0, -1.0), vec3(0.0, 0.0, -1.0));' + // origin, direction
            '  agi_cone cone = agi_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  agi_raySegmentCollection result = agi_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4(result.count == 0); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_rayConeIntersectionInterval: ray misses cone 1', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(0.0), vec3(1.0, 0.0, 0.0));' + // origin, direction
            '  agi_cone cone = agi_coneNew(vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0), radians(45.0) );' + // vertex, axis, halfAperture
            '  agi_raySegmentCollection result = agi_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4(result.count == 0); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_rayConeIntersectionInterval: outside ray intersects 0 - on cone surface', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(4.0, 1.0, 2.0), normalize(vec3(-1.0, 0.0, 1.0)));' + // origin, direction
            '  agi_cone cone = agi_coneNew(vec3(1.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  agi_raySegmentCollection result = agi_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4(' +
            '    (result.count == 1) && ' +
            '    agi_equalsEpsilon(cos(cone.halfAperture), dot(normalize(agi_pointAlongRay(ray, result.intervals[0].start) - cone.vertex), cone.axis))); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_rayConeIntersectionInterval: outside ray intersects 0 - normal is perpendicular to cone surface', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(4.0, 1.0, 2.0), normalize(vec3(-1.0, 0.0, 1.0)));' + // origin, direction
            '  agi_cone cone = agi_coneNew(vec3(1.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  agi_raySegmentCollection result = agi_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4(' +
            '    (result.count == 1) && ' +
            '    agi_equalsEpsilon(dot(agi_coneNormal(cone, agi_pointAlongRay(ray, result.intervals[0].start)), agi_pointAlongRay(ray, result.intervals[0].start) - cone.vertex), 0.0, agi_epsilon6)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_rayConeIntersectionInterval: outside ray intersects 1', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // origin, direction
            '  agi_cone cone = agi_coneNew(vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  agi_raySegmentCollection result = agi_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4((result.count == 1) && agi_equalsEpsilon(1.0, result.intervals[0].start)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_rayConeIntersectionInterval: outside ray intersects 2', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(0.0), vec3(1.0, 0.0, 0.0));' + // origin, direction
            '  agi_cone cone = agi_coneNew(vec3(2.0, 1.0, 0.0), vec3(0.0, -1.0, 0.0), radians(45.0));' + // vertex, axis, halfAperture
            '  agi_raySegmentCollection result = agi_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4((result.count == 1) && agi_equalsEpsilon(result.intervals[0].start, 1.0, agi_epsilon6) && agi_equalsEpsilon(result.intervals[0].stop, 3.0, agi_epsilon6)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_rayConeIntersectionInterval: outside ray intersects at vertex', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(-1.0, 0.0, 0.0), vec3(1.0, 0.0, 0.0));' + // origin, direction
            '  agi_cone cone = agi_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  agi_raySegmentCollection result = agi_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4((result.count == 1) && (result.intervals[0] == agi_raySegment(1.0, 1.0))); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_rayConeIntersectionInterval: inside ray intersects at vertex', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // origin, direction
            '  agi_cone cone = agi_coneNew(vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, -1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  agi_raySegmentCollection result = agi_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4((result.count == 1) && (result.intervals[0] == agi_raySegment(0.0, 1.0))); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_rayConeIntersectionInterval: inside ray intersects 1', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(0.0), vec3(1.0, 0.0, 0.0));' + // origin, direction
            '  agi_cone cone = agi_coneNew(vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, -1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  agi_raySegmentCollection result = agi_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4((result.count == 1) && agi_equalsEpsilon(result.intervals[0].start, 0.0, agi_epsilon6) && agi_equalsEpsilon(result.intervals[0].stop, 1.0, agi_epsilon6)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    ///////////////////////////////////////////////////////////////////////

    it('agi_rayHalfspaceIntersectionInterval: ray origin outside and directed away', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0));' + // origin, direction
            '  agi_halfspace halfspace = agi_halfspace(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // center, normal
            '  agi_raySegment i = agi_rayHalfspaceIntersectionInterval(ray, halfspace);' +
            '  gl_FragColor = vec4(agi_isEmpty(i)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_rayHalfspaceIntersectionInterval: ray origin outside and directed parallel', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 0.0));' + // origin, direction
            '  agi_halfspace halfspace = agi_halfspace(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // center, normal
            '  agi_raySegment i = agi_rayHalfspaceIntersectionInterval(ray, halfspace);' +
            '  gl_FragColor = vec4(agi_isEmpty(i)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_rayHalfspaceIntersectionInterval: ray origin outside and directed inward', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(1.0, 1.0, 1.0), vec3(0.0, 0.0, -1.0));' + // origin, direction
            '  agi_halfspace halfspace = agi_halfspace(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // center, normal
            '  agi_raySegment i = agi_rayHalfspaceIntersectionInterval(ray, halfspace);' +
            '  gl_FragColor = vec4(agi_equalsEpsilon(i.start, 1.0) && agi_equalsEpsilon(i.stop, agi_infinity)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_rayHalfspaceIntersectionInterval: ray origin on surface and directed away', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // origin, direction
            '  agi_halfspace halfspace = agi_halfspace(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // center, normal
            '  agi_raySegment i = agi_rayHalfspaceIntersectionInterval(ray, halfspace);' +
            '  gl_FragColor = vec4(agi_isEmpty(i)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_rayHalfspaceIntersectionInterval: ray origin on surface and directed parallel', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(0.0), vec3(1.0, 0.0, 0.0));' + // origin, direction
            '  agi_halfspace halfspace = agi_halfspace(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // center, normal
            '  agi_raySegment i = agi_rayHalfspaceIntersectionInterval(ray, halfspace);' +
            '  gl_FragColor = vec4(agi_isEmpty(i)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_rayHalfspaceIntersectionInterval: ray origin on surface and directed inward', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(1.0, 1.0, 0.0), vec3(0.0, 0.0, -1.0));' + // origin, direction
            '  agi_halfspace halfspace = agi_halfspace(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // center, normal
            '  agi_raySegment i = agi_rayHalfspaceIntersectionInterval(ray, halfspace);' +
            '  gl_FragColor = vec4(agi_equalsEpsilon(i.start, 0.0) && agi_equalsEpsilon(i.stop, agi_infinity)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_rayHalfspaceIntersectionInterval: ray origin inside and directed outward', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(1.0, 1.0, -1.0), vec3(0.0, 0.0, 1.0));' + // origin, direction
            '  agi_halfspace halfspace = agi_halfspace(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // center, normal
            '  agi_raySegment i = agi_rayHalfspaceIntersectionInterval(ray, halfspace);' +
            '  gl_FragColor = vec4(agi_equalsEpsilon(i.start, 0.0) && agi_equalsEpsilon(i.stop, 1.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_rayHalfspaceIntersectionInterval: ray origin inside and directed parallel', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(1.0, 1.0, -1.0), vec3(1.0, 0.0, 0.0));' + // origin, direction
            '  agi_halfspace halfspace = agi_halfspace(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // center, normal
            '  agi_raySegment i = agi_rayHalfspaceIntersectionInterval(ray, halfspace);' +
            '  gl_FragColor = vec4(agi_equalsEpsilon(i.start, 0.0) && agi_equalsEpsilon(i.stop, agi_infinity)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });

    it('agi_rayHalfspaceIntersectionInterval: ray origin inside and directed inward', function() {
        var fs =
            'void main() {' +
            '  agi_ray ray = agi_ray(vec3(1.0, 1.0, -1.0), vec3(0.0, 0.0, -1.0));' + // origin, direction
            '  agi_halfspace halfspace = agi_halfspace(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // center, normal
            '  agi_raySegment i = agi_rayHalfspaceIntersectionInterval(ray, halfspace);' +
            '  gl_FragColor = vec4(agi_equalsEpsilon(i.start, 0.0) && agi_equalsEpsilon(i.stop, agi_infinity)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqualArray([255, 255, 255, 255]);
    });
});