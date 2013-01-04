/*global defineSuite*/
defineSuite([
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/renderFragment',
         'Shaders/Ray',
         'Shaders/ConstructiveSolidGeometry'
     ], 'Renderer/ConstructiveSolidGeometry', function(
         createContext,
         destroyContext,
         renderFragment,
         ShadersRay,
         ShadersConstructiveSolidGeometry) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
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

    it('czm_quadraticRealPolynomialRealRoots: negative b', function() {
        var fs =
            'void main() { ' +
            '  czm_quadraticRoots r = czm_quadraticRealPolynomialRealRoots(2.0, -4.0, -6.0);' + // 2(x+1)(x-3)
            '  gl_FragColor = vec4((r.numberOfRoots == 2) && (r.root0 == -1.0) && (r.root1 == 3.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_quadraticRealPolynomialRealRoots: positive b', function() {
        var fs =
            'void main() { ' +
            '  czm_quadraticRoots r = czm_quadraticRealPolynomialRealRoots(2.0, 4.0, -6.0);' + // 2(x+1)(x-3)
            '  gl_FragColor = vec4((r.numberOfRoots == 2) && (r.root0 == -3.0) && (r.root1 == 1.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_quadraticRealPolynomialRealRoots: marginally negative radical case', function() {
        var fs =
            'void main() { ' +
            '  czm_quadraticRoots r = czm_quadraticRealPolynomialRealRoots(2.0, -3.999999999999999, 2.0);' + // 2(x-1)(x-1)
            '  gl_FragColor = vec4((r.numberOfRoots == 2) && czm_equalsEpsilon(r.root0, 1.0) && czm_equalsEpsilon(r.root1, 1.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_quadraticRealPolynomialRealRoots: complex roots', function() {
        var fs =
            'void main() { ' +
            '  czm_quadraticRoots r = czm_quadraticRealPolynomialRealRoots(2.0, -4.0, 6.0);' + // f(x) = 2x^2 - 4x + 6
            '  gl_FragColor = vec4(r.numberOfRoots == 0); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_quadraticRealPolynomialRealRoots: intractable', function() {
        var fs =
            'void main() { ' +
            '  czm_quadraticRoots r = czm_quadraticRealPolynomialRealRoots(0.0, 0.0, -3.0);' + // f(x) = -3
            '  gl_FragColor = vec4(r.numberOfRoots == 0); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_quadraticRealPolynomialRealRoots: linear', function() {
        var fs =
            'void main() { ' +
            '  czm_quadraticRoots r = czm_quadraticRealPolynomialRealRoots(0.0, 2.0, 8.0);' + // f(x) = 2x + 8
            '  gl_FragColor = vec4((r.numberOfRoots == 1) && (r.root0 == -4.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_quadraticRealPolynomialRealRoots: 2nd order monomial', function() {
        var fs =
            'void main() { ' +
            '  czm_quadraticRoots r = czm_quadraticRealPolynomialRealRoots(3.0, 0.0, 0.0);' + // f(x) = 3x^2
            '  gl_FragColor = vec4((r.numberOfRoots == 2) && (r.root0 == 0.0) && (r.root1 == 0.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_quadraticRealPolynomialRealRoots: parabolic complex roots', function() {
        var fs =
            'void main() { ' +
            '  czm_quadraticRoots r = czm_quadraticRealPolynomialRealRoots(3.0, 0.0, 18.0);' + // f(x) = 2x^2 + 18
            '  gl_FragColor = vec4(r.numberOfRoots == 0); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_quadraticRealPolynomialRealRoots: parabolic real roots', function() {
        var fs =
            'void main() { ' +
            '  czm_quadraticRoots r = czm_quadraticRealPolynomialRealRoots(2.0, 0.0, -18.0);' + // f(x) = 2x^2 - 18
            '  gl_FragColor = vec4((r.numberOfRoots == 2) && (r.root0 == -3.0) && (r.root1 == 3.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_quadraticRealPolynomialRealRoots: zero and negative root', function() {
        var fs =
            'void main() { ' +
            '  czm_quadraticRoots r = czm_quadraticRealPolynomialRealRoots(2.0, 6.0, 0.0);' + // f(x) = 2x^2 + 6x
            '  gl_FragColor = vec4((r.numberOfRoots == 2) && (r.root0 == -3.0) && (r.root1 == 0.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_quadraticRealPolynomialRealRoots: zero and positive root', function() {
        var fs =
            'void main() { ' +
            '  czm_quadraticRoots r = czm_quadraticRealPolynomialRealRoots(2.0, -6.0, 0.0);' + // f(x) = 2x^2 - 6x
            '  gl_FragColor = vec4((r.numberOfRoots == 2) && (r.root0 == 0.0) && (r.root1 == 3.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    ///////////////////////////////////////////////////////////////////////

    it('czm_raySphereIntersectionInterval: fails to intersect (1)', function() {
        var fs =
            'void main() { ' +
            '  czm_ray ray = czm_ray(vec3(0.0), vec3(-1.0, 0.0, 0.0));' +
            '  czm_sphere sphere = czm_sphere(vec3(2.0, 0.0, 0.0), 1.0); ' +
            '  czm_raySegment i = czm_raySphereIntersectionInterval(ray, sphere);' +
            '  gl_FragColor = vec4(czm_isEmpty(i)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_raySphereIntersectionInterval: fails to intersect (2)', function() {
        var fs =
            'void main() { ' +
            '  czm_ray ray = czm_ray(vec3(0.0, 2.0, 0.0), vec3(1.0, 0.0, 0.0));' +
            '  czm_sphere sphere = czm_sphere(vec3(2.0, 0.0, 0.0), 1.0); ' +
            '  czm_raySegment i = czm_raySphereIntersectionInterval(ray, sphere);' +
            '  gl_FragColor = vec4(czm_isEmpty(i)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_raySphereIntersectionInterval: fails to intersect (3)', function() {
        var fs =
            'void main() { ' +
            '  czm_ray ray = czm_ray(vec3(0.0), normalize(vec3(1.0, 2.0, 0.0)));' +
            '  czm_sphere sphere = czm_sphere(vec3(2.0, 0.0, 0.0), 1.0); ' +
            '  czm_raySegment i = czm_raySphereIntersectionInterval(ray, sphere);' +
            '  gl_FragColor = vec4(czm_isEmpty(i)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_raySphereIntersectionInterval: fails to intersect (4)', function() {
        var fs =
            'void main() { ' +
            '  czm_ray ray = czm_ray(vec3(0.0), vec3(-1.0, 0.0, 0.0));' +
            '  czm_sphere sphere = czm_sphere(vec3(2.0, 0.0, 0.0), 0.0); ' +
            '  czm_raySegment i = czm_raySphereIntersectionInterval(ray, sphere);' +
            '  gl_FragColor = vec4(czm_isEmpty(i)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_raySphereIntersectionInterval: outside ray intersects', function() {
        var fs =
            'void main() { ' +
            '  czm_ray ray = czm_ray(vec3(0.0), vec3(1.0, 0.0, 0.0));' +
            '  czm_sphere sphere = czm_sphere(vec3(2.0, 0.0, 0.0), 1.0); ' +
            '  czm_raySegment i = czm_raySphereIntersectionInterval(ray, sphere);' +
            '  gl_FragColor = vec4(i == czm_raySegment(1.0, 3.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_raySphereIntersectionInterval: outside ray intersects at tangent', function() {
        var fs =
            'void main() { ' +
            '  czm_ray ray = czm_ray(vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0));' +
            '  czm_sphere sphere = czm_sphere(vec3(2.0, 0.0, 0.0), 1.0); ' +
            '  czm_raySegment i = czm_raySphereIntersectionInterval(ray, sphere);' +
            '  gl_FragColor = vec4(i == czm_raySegment(2.0, 2.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_raySphereIntersectionInterval: inside ray intersects 0', function() {
        var fs =
            'void main() { ' +
            '  czm_ray ray = czm_ray(vec3(2.0, 0.0, 0.0), vec3(1.0, 0.0, 0.0));' +
            '  czm_sphere sphere = czm_sphere(vec3(2.0, 0.0, 0.0), 1.0); ' +
            '  czm_raySegment i = czm_raySphereIntersectionInterval(ray, sphere);' +
            '  gl_FragColor = vec4(i == czm_raySegment(0.0, 1.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_raySphereIntersectionInterval: inside ray intersects 1', function() {
        var fs =
            'void main() { ' +
            '  czm_ray ray = czm_ray(vec3(2.0, 0.0, 0.0), vec3(-1.0, 0.0, 0.0));' +
            '  czm_sphere sphere = czm_sphere(vec3(2.0, 0.0, 0.0), 1.0); ' +
            '  czm_raySegment i = czm_raySphereIntersectionInterval(ray, sphere);' +
            '  gl_FragColor = vec4(i == czm_raySegment(0.0, 1.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    ///////////////////////////////////////////////////////////////////////

    it('czm_sphereNormal: 0', function() {
        var fs =
            'void main() { ' +
            '  vec3 normal = czm_sphereNormal(czm_sphere(vec3(0.0), 1.0), vec3(1.0, 0.0, 0.0));' +
            '  gl_FragColor = vec4(normal == vec3(1.0, 0.0, 0.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_sphereNormal: 1', function() {
        var fs =
            'void main() { ' +
            '  vec3 normal = czm_sphereNormal(czm_sphere(vec3(0.0, 1.0, 0.0), 1.0), vec3(0.0, 2.0, 0.0));' +
            '  gl_FragColor = vec4(normal == vec3(0.0, 1.0, 0.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    ///////////////////////////////////////////////////////////////////////

    it('czm_ellipsoidContainsPoint: does not contain point 0', function() {
        var fs =
            'void main() {' +
            '  czm_ellipsoid ellipsoid = czm_ellipsoidNew(vec3(0.0), vec3(3.0, 2.0, 1.0));' + // center, radii
            '  vec3 point = vec3(4.0, 0.0, 0.0);' +
            '  gl_FragColor = vec4(!czm_ellipsoidContainsPoint(ellipsoid, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_ellipsoidContainsPoint: does not contain point 1', function() {
        var fs =
            'void main() {' +
            '  czm_ellipsoid ellipsoid = czm_ellipsoidNew(vec3(0.0), vec3(3.0, 2.0, 1.0));' + // center, radii
            '  vec3 point = vec3(-4.0, 0.0, 0.0);' +
            '  gl_FragColor = vec4(!czm_ellipsoidContainsPoint(ellipsoid, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_ellipsoidContainsPoint: does not contain point 2', function() {
        var fs =
            'void main() {' +
            '  czm_ellipsoid ellipsoid = czm_ellipsoidNew(vec3(0.0), vec3(3.0, 2.0, 1.0));' + // center, radii
            '  vec3 point = vec3(0.0, 0.0, 2.0);' +
            '  gl_FragColor = vec4(!czm_ellipsoidContainsPoint(ellipsoid, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_ellipsoidContainsPoint: does not contain point 3', function() {
        var fs = 'void main() {' + 'czm_ellipsoid ellipsoid = czm_ellipsoidNew(vec3(0.0), vec3(3.0, 2.0, 1.0));' + // center, radii
        'vec3 point = vec3(0.0, 0.0, -2.0);' + 'gl_FragColor = vec4(!czm_ellipsoidContainsPoint(ellipsoid, point)); }';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_ellipsoidContainsPoint: contains point 0', function() {
        var fs =
            'void main() {' +
            '  czm_ellipsoid ellipsoid = czm_ellipsoidNew(vec3(0.0), vec3(3.0, 2.0, 1.0));' + // center, radii
            '  vec3 point = vec3(2.0, 0.0, 0.0);' +
            '  gl_FragColor = vec4(czm_ellipsoidContainsPoint(ellipsoid, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_ellipsoidContainsPoint: contains point 1', function() {
        var fs =
            'void main() {' +
            '  czm_ellipsoid ellipsoid = czm_ellipsoidNew(vec3(0.0), vec3(3.0, 2.0, 1.0));' + // center, radii
            '  vec3 point = vec3(-2.0, 0.0, 0.0);' +
            '  gl_FragColor = vec4(czm_ellipsoidContainsPoint(ellipsoid, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_ellipsoidContainsPoint: contains point 2', function() {
        var fs =
            'void main() {' +
            '  czm_ellipsoid ellipsoid = czm_ellipsoidNew(vec3(0.0), vec3(3.0, 2.0, 1.0));' + // center, radii
            '  vec3 point = vec3(0.0, 1.0, 0.0);' +
            '  gl_FragColor = vec4(czm_ellipsoidContainsPoint(ellipsoid, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_ellipsoidContainsPoint: contains point 3', function() {
        var fs =
            'void main() {' +
            '  czm_ellipsoid ellipsoid = czm_ellipsoidNew(vec3(0.0), vec3(3.0, 2.0, 1.0));' + // center, radii
            '  vec3 point = vec3(0.0, -1.0, 0.0);' +
            '  gl_FragColor = vec4(czm_ellipsoidContainsPoint(ellipsoid, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    ///////////////////////////////////////////////////////////////////////

    it('czm_coneContainsPoint: does not contain point 0', function() {
        var fs =
            'void main() {' +
            '  czm_cone cone = czm_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  vec3 point = vec3(1.0, 0.0, 0.0);' +
            '  gl_FragColor = vec4(!czm_coneContainsPoint(cone, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_coneContainsPoint: does not contain point 1', function() {
        var fs =
            'void main() {' +
            '  czm_cone cone = czm_coneNew(vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  vec3 point = vec3(-1.0, 0.0, 0.0);' +
            '  gl_FragColor = vec4(!czm_coneContainsPoint(cone, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_coneContainsPoint: does not contain point 2', function() {
        var fs =
            'void main() {' +
            '  czm_cone cone = czm_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  vec3 point = vec3(0.0, 0.0, -1.0);' +
            '  gl_FragColor = vec4(!czm_coneContainsPoint(cone, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_coneContainsPoint: does not contain point 2', function() {
        var fs =
            'void main() {' +
            '  czm_cone cone = czm_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(120.0));' + // vertex, axis, halfAperture
            '  vec3 point = vec3(0.0, 0.0, -1.0);' +
            '  gl_FragColor = vec4(!czm_coneContainsPoint(cone, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_coneContainsPoint: contains point 0', function() {
        var fs =
            'void main() {' +
            '  czm_cone cone = czm_coneNew(vec3(0.0, 0.0, 2.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  vec3 point = vec3(0.0, 0.0, 3.0);' +
            '  gl_FragColor = vec4(czm_coneContainsPoint(cone, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_coneContainsPoint: contains point 1', function() {
        var fs =
            'void main() {' +
            '  czm_cone cone = czm_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  vec3 point = vec3(1.0, 0.0, 2.0);' +
            '  gl_FragColor = vec4(czm_coneContainsPoint(cone, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_coneContainsPoint: contains point 2', function() {
        var fs =
            'void main() {' +
            '  czm_cone cone = czm_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(120.0));' + // vertex, axis, halfAperture
            '  vec3 point = vec3(1.0, 0.0, 0.0);' +
            '  gl_FragColor = vec4(czm_coneContainsPoint(cone, point)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    ///////////////////////////////////////////////////////////////////////

    it('czm_rayConeIntersectionInterval: half aperture of 0.0', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(0.0, 0.0, -1.0), vec3(0.0, 0.0, -1.0));' + // origin, direction
            '  czm_cone cone = czm_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(0.0));' + // vertex, axis, halfAperture
            '  czm_raySegmentCollection result = czm_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4(result.count == 0); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    // Fails on AMD with or without ANGLE
    xit('czm_rayConeIntersectionInterval: half aperture of 90.0', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(1.0, 1.0, -1.0), vec3(0.0, 0.0, 1.0));' + // origin, direction
            '  czm_cone cone = czm_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(90.0));' + // vertex, axis, halfAperture
            '  czm_raySegmentCollection result = czm_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4((result.count == 1) ' +
            '    && czm_equalsEpsilon(1.0, result.intervals[0].start, czm_epsilon6) ' +
            '    && (result.intervals[0].stop == czm_infinity)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_rayConeIntersectionInterval: half aperture of 180.0', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(0.0, 0.0, -1.0), vec3(0.0, 0.0, -1.0));' + // origin, direction
            '  czm_cone cone = czm_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(180.0));' + // vertex, axis, halfAperture
            '  czm_raySegmentCollection result = czm_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4((result.count == 1) ' +
            '    && czm_equalsEpsilon(0.0, result.intervals[0].start) ' +
            '    && (result.intervals[0].stop == czm_infinity)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_rayConeIntersectionInterval: ray misses cone 0', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(0.0, 0.0, -1.0), vec3(0.0, 0.0, -1.0));' + // origin, direction
            '  czm_cone cone = czm_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  czm_raySegmentCollection result = czm_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4(result.count == 0); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_rayConeIntersectionInterval: ray misses cone 1', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(0.0), vec3(1.0, 0.0, 0.0));' + // origin, direction
            '  czm_cone cone = czm_coneNew(vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0), radians(45.0) );' + // vertex, axis, halfAperture
            '  czm_raySegmentCollection result = czm_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4(result.count == 0); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_rayConeIntersectionInterval: outside ray intersects 0 - on cone surface', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(4.0, 1.0, 2.0), normalize(vec3(-1.0, 0.0, 1.0)));' + // origin, direction
            '  czm_cone cone = czm_coneNew(vec3(1.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  czm_raySegmentCollection result = czm_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4(' +
            '    (result.count == 1) && ' +
            '    czm_equalsEpsilon(cos(cone.halfAperture), dot(normalize(czm_pointAlongRay(ray, result.intervals[0].start) - cone.vertex), cone.axis))); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_rayConeIntersectionInterval: outside ray intersects 0 - normal is perpendicular to cone surface', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(4.0, 1.0, 2.0), normalize(vec3(-1.0, 0.0, 1.0)));' + // origin, direction
            '  czm_cone cone = czm_coneNew(vec3(1.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  czm_raySegmentCollection result = czm_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4(' +
            '    (result.count == 1) && ' +
            '    czm_equalsEpsilon(dot(czm_coneNormal(cone, czm_pointAlongRay(ray, result.intervals[0].start)), czm_pointAlongRay(ray, result.intervals[0].start) - cone.vertex), 0.0, czm_epsilon6)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_rayConeIntersectionInterval: outside ray intersects 1', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // origin, direction
            '  czm_cone cone = czm_coneNew(vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  czm_raySegmentCollection result = czm_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4((result.count == 1) && czm_equalsEpsilon(1.0, result.intervals[0].start)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_rayConeIntersectionInterval: outside ray intersects 2', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(0.0), vec3(1.0, 0.0, 0.0));' + // origin, direction
            '  czm_cone cone = czm_coneNew(vec3(2.0, 1.0, 0.0), vec3(0.0, -1.0, 0.0), radians(45.0));' + // vertex, axis, halfAperture
            '  czm_raySegmentCollection result = czm_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4((result.count == 1) && czm_equalsEpsilon(result.intervals[0].start, 1.0, czm_epsilon6) && czm_equalsEpsilon(result.intervals[0].stop, 3.0, czm_epsilon6)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_rayConeIntersectionInterval: outside ray intersects at vertex', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(-1.0, 0.0, 0.0), vec3(1.0, 0.0, 0.0));' + // origin, direction
            '  czm_cone cone = czm_coneNew(vec3(0.0), vec3(0.0, 0.0, 1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  czm_raySegmentCollection result = czm_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4((result.count == 1) && (result.intervals[0] == czm_raySegment(1.0, 1.0))); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_rayConeIntersectionInterval: inside ray intersects at vertex', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // origin, direction
            '  czm_cone cone = czm_coneNew(vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, -1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  czm_raySegmentCollection result = czm_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4((result.count == 1) && (result.intervals[0] == czm_raySegment(0.0, 1.0))); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_rayConeIntersectionInterval: inside ray intersects 1', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(0.0), vec3(1.0, 0.0, 0.0));' + // origin, direction
            '  czm_cone cone = czm_coneNew(vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, -1.0), radians(45.0));' + // vertex, axis, halfAperture
            '  czm_raySegmentCollection result = czm_rayConeIntersectionInterval(ray, cone);' +
            '  gl_FragColor = vec4((result.count == 1) && czm_equalsEpsilon(result.intervals[0].start, 0.0, czm_epsilon6) && czm_equalsEpsilon(result.intervals[0].stop, 1.0, czm_epsilon6)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    ///////////////////////////////////////////////////////////////////////

    it('czm_rayHalfspaceIntersectionInterval: ray origin outside and directed away', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0));' + // origin, direction
            '  czm_halfspace halfspace = czm_halfspace(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // center, normal
            '  czm_raySegment i = czm_rayHalfspaceIntersectionInterval(ray, halfspace);' +
            '  gl_FragColor = vec4(czm_isEmpty(i)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_rayHalfspaceIntersectionInterval: ray origin outside and directed parallel', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 0.0));' + // origin, direction
            '  czm_halfspace halfspace = czm_halfspace(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // center, normal
            '  czm_raySegment i = czm_rayHalfspaceIntersectionInterval(ray, halfspace);' +
            '  gl_FragColor = vec4(czm_isEmpty(i)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_rayHalfspaceIntersectionInterval: ray origin outside and directed inward', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(1.0, 1.0, 1.0), vec3(0.0, 0.0, -1.0));' + // origin, direction
            '  czm_halfspace halfspace = czm_halfspace(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // center, normal
            '  czm_raySegment i = czm_rayHalfspaceIntersectionInterval(ray, halfspace);' +
            '  gl_FragColor = vec4(czm_equalsEpsilon(i.start, 1.0) && czm_equalsEpsilon(i.stop, czm_infinity)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_rayHalfspaceIntersectionInterval: ray origin on surface and directed away', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // origin, direction
            '  czm_halfspace halfspace = czm_halfspace(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // center, normal
            '  czm_raySegment i = czm_rayHalfspaceIntersectionInterval(ray, halfspace);' +
            '  gl_FragColor = vec4(czm_isEmpty(i)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_rayHalfspaceIntersectionInterval: ray origin on surface and directed parallel', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(0.0), vec3(1.0, 0.0, 0.0));' + // origin, direction
            '  czm_halfspace halfspace = czm_halfspace(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // center, normal
            '  czm_raySegment i = czm_rayHalfspaceIntersectionInterval(ray, halfspace);' +
            '  gl_FragColor = vec4(czm_isEmpty(i)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_rayHalfspaceIntersectionInterval: ray origin on surface and directed inward', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(1.0, 1.0, 0.0), vec3(0.0, 0.0, -1.0));' + // origin, direction
            '  czm_halfspace halfspace = czm_halfspace(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // center, normal
            '  czm_raySegment i = czm_rayHalfspaceIntersectionInterval(ray, halfspace);' +
            '  gl_FragColor = vec4(czm_equalsEpsilon(i.start, 0.0) && czm_equalsEpsilon(i.stop, czm_infinity)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_rayHalfspaceIntersectionInterval: ray origin inside and directed outward', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(1.0, 1.0, -1.0), vec3(0.0, 0.0, 1.0));' + // origin, direction
            '  czm_halfspace halfspace = czm_halfspace(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // center, normal
            '  czm_raySegment i = czm_rayHalfspaceIntersectionInterval(ray, halfspace);' +
            '  gl_FragColor = vec4(czm_equalsEpsilon(i.start, 0.0) && czm_equalsEpsilon(i.stop, 1.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_rayHalfspaceIntersectionInterval: ray origin inside and directed parallel', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(1.0, 1.0, -1.0), vec3(1.0, 0.0, 0.0));' + // origin, direction
            '  czm_halfspace halfspace = czm_halfspace(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // center, normal
            '  czm_raySegment i = czm_rayHalfspaceIntersectionInterval(ray, halfspace);' +
            '  gl_FragColor = vec4(czm_equalsEpsilon(i.start, 0.0) && czm_equalsEpsilon(i.stop, czm_infinity)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_rayHalfspaceIntersectionInterval: ray origin inside and directed inward', function() {
        var fs =
            'void main() {' +
            '  czm_ray ray = czm_ray(vec3(1.0, 1.0, -1.0), vec3(0.0, 0.0, -1.0));' + // origin, direction
            '  czm_halfspace halfspace = czm_halfspace(vec3(0.0), vec3(0.0, 0.0, 1.0));' + // center, normal
            '  czm_raySegment i = czm_rayHalfspaceIntersectionInterval(ray, halfspace);' +
            '  gl_FragColor = vec4(czm_equalsEpsilon(i.start, 0.0) && czm_equalsEpsilon(i.stop, czm_infinity)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });
}, 'WebGL');