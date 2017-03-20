/* global define */
define([
    './Cartesian3',
    './Cartesian4',
    './defaultValue',
    './defined',
    './DeveloperError'
], function(
    Cartesian3,
    Cartesian4,
    defaultValue,
    defined,
    DeveloperError) {
    'use strict';

    // Variety of noise helper functions for creating pseudo-random behavior
    var taylorInvSqrt = function(r, result) {
        var val = 1.79284291400159;
        return Cartesian4.subtract(Cartesian4.fromElements(val, val, val, val, result), Cartesian3.multiplyByScalar(r, 0.85373472095314, result), result);
    }

    // Recreations of various glsl functions
    var swizzleVec3 = function(vec, a, b, c, result) {
        return Cartesian3.fromElements(vec[a], vec[b], vec[c], result);
    }

    var swizzleVec4 = function(vec, a, b, c, d, result) {
        return Cartesian4.fromElements(vec[a], vec[b], vec[c], vec[d], result);
    }

    var floorVec3 = function(vec, result) {
        return Cartesian3.fromElements(Math.floor(vec.x), Math.floor(vec.y), Math.floor(vec.z), result);
    }

    var floorVec4 = function(vec, result) {
        return Cartesian4.fromElements(Math.floor(vec.x), Math.floor(vec.y), Math.floor(vec.z), Math.floor(vec.w), result);
    }

    var mod289 = function(x, result) {
        return Cartesian3.subtract(x, Cartesian3.multiplyByScalar(floorVec3(Cartesian3.multiplyByScalar(x, (1.0 / 289.0), result)), 289.0, result), result);
    }

    // mod289(((x * 34.0) + 1.0) * x)
    var permute = function(x, result) {
        return mod289(Cartesian3.multiplyByScalar(Cartesian3.add(Cartesian3.multiplyByScalar(x, 34.0, result), new Cartesian3(1.0, 1.0, 1.0), result), x, result));
    }

    var step = function(edge, val) {
        return (val < edge) ? 0.0 : 1.0;
    }

    var stepVec3 = function(edge, val, result) {
        return Cartesian3.fromElements(step(edge.x, val.x), step(edge.y, val.y), step(edge.z, val.z), result);
    }

    var stepVec4 = function(edge, val, result) {
        return Cartesian4.fromElements(step(edge.x, val.x), step(edge.y, val.y), step(edge.z, val.z), step(edge.w, val.w), result);
    }

    var vec3AddConstant = function(vec, val, result) {
        return Cartesian3.fromElements(vec.x + val, vec.y + val, vec.z + val, result);
    }

    var vec4AddConstant = function(vec, val, result) {
        return Cartesian4.fromElements(vec.x + val, vec.y + val, vec.z + val, vec.w + val, result);
    }

    var D = new Cartesian4(0.0, 0.5, 1.0, 2.0);
    var Cx = new Cartesian3(1.0 / 6.0, 1.0 / 6.0, 1.0 / 6.0);
    var Cy = new Cartesian3(1.0 / 3.0, 1.0 / 3.0, 1.0 / 3.0);
    var Dy = new Cartesian3(0.5, 0.5, 0.5);

    var scratchVec3_1 = new Cartesian3();
    var scratchVec3_2 = new Cartesian3();
    var scratchVec3_3 = new Cartesian3();
    //var scratchVec3_4 = new Cartesian3();
    var scratchVec4_1 = new Cartesian4();
    var scratchVec4_2 = new Cartesian4();
    var scratchVec4_3 = new Cartesian4();

    /**
     * Produces a 3D simplex noise value.
     *
     * @name czm_noise
     *
     * @param {vec3} czm_seed The seed for the pseudo-random noise function.
     *
     * @returns {float} returns a pseudo-random noise value.
     */
    function noise(seed) {
        if (!defined(seed)) {
            throw new DeveloperError('seed is required.');
        }

        // First corner
        var scratch = Cartesian3.dot(seed, Cy);
        var i = vec3AddConstant(seed, scratch, i);
        i = floorVec3(i);
        scratch = Cartesian3.dot(i, Cx);
        var x0 = Cartesian3.add(seed, vec3AddConstant(i, scratch, x0), x0);

        // Other corners
        var g = stepVec3(swizzleVec3(x0, 1, 2, 0, g), x0, g);
        var l = Cartesian3.subtract(Cartesian3.fromElements(1.0, 1.0, 1.0, scratchVec3_1), g, l);
        var i1 = Cartesian3.minimumByComponent(g, swizzleVec3(l, 2, 0, 1, i1), i1);
        var i2 = Cartesian3.maximumByComponent(g, swizzleVec3(l, 2, 0, 1, i2), i2);

        var x1 = Cartesian3.add(Cartesian3.subtract(x0, i1, x1), Cx, x1);
        var x2 = Cartesian3.add(Cartesian3.subtract(x0, i2, x1), Cy, x2);
        var x3 = Cartesian3.subtract(x0, Dy, x3);

        // Permutations
        i = mod289(i);
        var p = permute(permute(permute(
            Cartesian4.add(
                Cartesian4.add(
                    Cartesian4.add(i.z, Cartesian4.fromElements(0.0, i1.z, i2.z, 1.0, scratchVec4_1), scratchVec4_1),
                    Cartesian4.add(i.y, Cartesian4.fromElements(0.0, i1.y, i2.y, 1.0, scratchVec4_2), scratchVec4_2), scratchVec4_1),
                Cartesian4.add(i.x, Cartesian4.fromElements(0.0, i1.x, i2.x, 1.0, scratchVec4_3), scratchVec4_3)), p)));

        // Gradients: 7 x 7 points over a square, mapped onto an octahedron.
        // The ring size 17 * 17 = 289 is close to a multiple of 49 (49 * 6 = 294)
        var n_ = 0.142857142857; // 1.0 / 7.0
        var ns = Cartesian3.subtract(Cartesian3.multiplyByScalar(swizzleVec3(D, 3, 1, 2, scratchVec3_1), n_, scratchVec3_2), swizzleVec3(D, 0, 2, 0, scratchVec3_3), ns);

        var j = Cartesian4.multiplyComponents(Cartesian4.subtract(p, Cartesian4.fromElements(49.0, 49.0, 49.0, 49.0), j),
            floorVec4(Cartesian4.multiplyByScalar(p, ns.z * ns.z), j), j);  // mod(p, 7 * 7)

        var x_ = floorVec4(Cartesian4.multiplyByScalar(j, ns.z, x_), x_);
        var y_ = floorVec4(Cartesian4.subtract(j, Cartesian4.multiplyByScalar(x_, 7.0, y_), y_), y_);    // mod(j, N)

        var x = vec4AddConstant(Cartesian4.multiplyByScalar(x_, ns.x, x_), ns.y, x);
        var y = vec4AddConstant(Cartesian4.multiplyByScalar(y_, ns.x, y_), ns.y, y);
        var h = Cartesian4.subtract(Cartesian4.fromElements(1.0, 1.0, 1.0, 1.0, h), Cartesian4.subtract(Cartesian4.abs(x), Cartesian4.abs(y), scratchVec4_1), h);

        var b0 = Cartesian4.fromElements(x.x, x.y, y.x, y.y, b0);
        var b1 = Cartesian4.fromElements(x.z, x.w, y.z, y.w, b1);

        var s0 = vec4AddConstant(Cartesian4.multiplyByScalar(floorVec4(b0, b0), 2.0, b0), 1.0, s0);
        var s1 = vec4AddConstant(Cartesian4.multiplyByScalar(floorVec4(b1, b1), 2.0, b1), 1.0, s1);
        var sh = -stepVec4(h, Cartesian4.fromElements(0.0, 0.0, 0.0, 0.0, scratchVec4_1));

        var a0 = Cartesian4.add(swizzleVec4(b0, 0, 2, 1, 3, scratchVec4_3),
            Cartesian4.multiply(swizzleVec4(s0, 0, 2, 1, 3, scratchVec4_1), swizzleVec4(sh, 0, 0, 1, 1, scratchVec4_2), a0), a0);
        var a1 = Cartesian4.add(swizzleVec4(b1, 0, 2, 1, 3, scratchVec4_3),
            Cartesian4.multiply(swizzleVec4(s1, 0, 2, 1, 3, scratchVec4_1), swizzleVec4(sh, 2, 2, 3, 3, scratchVec4_2), a1), a1);

        var p0 = Cartesian3.fromElements(a0.x, a0.y, h.x, p0);
        var p1 = Cartesian3.fromElements(a0.z, a0.w, h.y, p1);
        var p2 = Cartesian3.fromElements(a1.x, a1.y, h.z, p2);
        var p3 = Cartesian3.fromElements(a1.z, a1.w, h.w, p3);

        // Normalise gradients
        var norm = taylorInvSqrt(Cartesian4.fromElements(Cartesian3.dot(p0, p0),
                                                        Cartesian3.dot(p1, p1),
                                                        Cartesian3.dot(p2, p2),
                                                        Cartesian3.dot(p3, p3),
                                                        scratchVec4_1), norm);
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        // TO HEEEEEEERE :D

        // Mix final noise value
        var m = Cartesian4.maximumByComponent(Cartesian4.subtract(
            new Cartesian4(0.6, 0.6, 0.6, 0.6),
            new Cartesian4(Cartesian3.dot(x0, x0),
                Cartesian3.dot(x1, x1),
                Cartesian3.dot(x2, x2),
                Cartesian3.dot(x3, x3)), m));
        m = m * m;
        return 42.0 * Cartesian4.dot(Cartesian4.multiply(m, m),
                new Cartesian4(Cartesian3.dot(p0, x0),
                    Cartesian3.dot(p1, x1),
                    Cartesian3.dot(p2, x2),
                    Cartesian3.dot(p3, x3)));
    }

    return noise;
});
