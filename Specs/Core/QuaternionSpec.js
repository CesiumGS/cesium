/*global defineSuite*/
defineSuite([
         'Core/Quaternion',
         'Core/Cartesian3',
         'Core/Cartesian4',
         'Core/Matrix3',
         'Core/Math'
     ], function(
         Quaternion,
         Cartesian3,
         Cartesian4,
         Matrix3,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

    it('construct0', function() {
        var q = new Quaternion();
        expect(q.x).toEqual(0.0);
        expect(q.y).toEqual(0.0);
        expect(q.z).toEqual(0.0);
        expect(q.w).toEqual(0.0);
    });

    it('construct1', function() {
        var q = new Quaternion(0.0, 1.0, 2.0, 1.0);
        expect(q.x).toEqual(0.0);
        expect(q.y).toEqual(1.0);
        expect(q.z).toEqual(2.0);
        expect(q.w).toEqual(1.0);
    });

    it('construct2', function() {
        var q = new Quaternion(0.0, 1.0, 2.0, 3.0);
        expect(q.x).toEqual(0.0);
        expect(q.y).toEqual(1.0);
        expect(q.z).toEqual(2.0);
        expect(q.w).toEqual(3.0);
    });

    it('clone', function() {
        var q = new Quaternion(1.0, 2.0, 3.0, 4.0);
        var r = q.clone();
        expect(q.equals(r)).toEqual(true);
    });

    it('ZERO', function() {
        var q = Quaternion.ZERO;
        expect(q.x).toEqual(0.0);
        expect(q.y).toEqual(0.0);
        expect(q.z).toEqual(0.0);
        expect(q.w).toEqual(0.0);
    });

    it('IDENTITY', function() {
        var q = Quaternion.IDENTITY;
        expect(q.x).toEqual(0.0);
        expect(q.y).toEqual(0.0);
        expect(q.z).toEqual(0.0);
        expect(q.w).toEqual(1.0);
    });

    it('conjugate', function() {
        var q = new Quaternion(1.0, 1.0, 1.0, 1.0).conjugate();
        expect(q.equals(new Quaternion(-1.0, -1.0, -1.0, 1.0))).toEqual(true);
    });

    it('normSquared', function() {
        var q = new Quaternion(2.0, 3.0, 4.0, 5.0);
        expect(q.normSquared()).toEqual(54.0);
    });

    it('norm', function() {
        var q = new Quaternion(2.0, 3.0, 4.0, 5.0);
        expect(q.norm()).toEqual(Math.sqrt(54.0));
    });

    it('normalize', function() {
        var q = new Quaternion(0.0, 2.0, 0.0, 0.0).normalize();
        expect(q.x).toEqual(0.0);
        expect(q.y).toEqual(1.0);
        expect(q.z).toEqual(0.0);
        expect(q.w).toEqual(0.0);
    });

    it('inverse', function() {
        var q = new Quaternion(2.0, 3.0, 4.0, 5.0);
        var normSquared = q.normSquared();
        expect(q.inverse().equals(new Quaternion(
                -2.0 / normSquared,
                -3.0 / normSquared,
                -4.0 / normSquared,
                5.0 / normSquared))).toEqual(true);
    });

    it('unitInverseEqualsConjugate', function() {
        var s = Math.sin(CesiumMath.PI_OVER_FOUR);
        var c = Math.cos(CesiumMath.PI_OVER_FOUR);
        var cartesian = new Cartesian3(1.0, 1.0, 1.0).normalize().multiplyByScalar(s);
        var q = new Quaternion(cartesian.x, cartesian.y, cartesian.z, c);
        expect(q.norm()).toEqual(1.0);
        expect(q.inverse().equals(q.conjugate())).toEqual(true);
    });

    it('add', function() {
        var q = new Quaternion(1.0, 2.0, 3.0, 4.0).add(new Quaternion(5.0, 6.0, 7.0, 8.0));
        expect(q.equals(new Quaternion(6.0, 8.0, 10.0, 12.0))).toEqual(true);
    });

    it('subtract', function() {
        var q = new Quaternion(5.0, 6.0, 7.0, 8.0).subtract(new Quaternion(1.0, 2.0, 3.0, 4.0));
        expect(q.equals(new Quaternion(4.0, 4.0, 4.0, 4.0))).toEqual(true);
    });

    it('negate', function() {
        var q = new Quaternion(1.0, 2.0, 3.0, 4.0).negate();
        expect(q.equals(new Quaternion(-1.0, -2.0, -3.0, -4.0))).toEqual(true);
    });

    it('dot', function() {
        var s = new Quaternion(2.0, 3.0, 4.0, 5.0).dot(new Quaternion(6.0, 7.0, 8.0, 9.0));
        expect(s).toEqual(2.0 * 6.0 + 3.0 * 7.0 + 4.0 * 8.0 + 5.0 * 9.0);
    });

    it('multiply', function() {
        var q = new Quaternion(1.0, 2.0, 3.0, 4.0).multiply(new Quaternion(1.0, 2.0, 3.0, 4.0));
        expect(q.equals(new Quaternion(8.0, 16.0, 24.0, 2.0))).toEqual(true);
    });

    it('multiplyByScalar', function() {
        var q = new Quaternion(1.0, 2.0, 3.0, 4.0).multiplyByScalar(2.0);
        expect(q.equals(new Quaternion(2.0, 4.0, 6.0, 8.0))).toEqual(true);
    });

    it('divideByScalar', function() {
        var q = new Quaternion(2.0, 4.0, 6.0, 8.0).divideByScalar(2.0);
        expect(q.equals(new Quaternion(1.0, 2.0, 3.0, 4.0))).toEqual(true);
    });

    it('rotate', function() {
        var s = Math.sin(CesiumMath.PI_OVER_FOUR);
        var c = Math.cos(CesiumMath.PI_OVER_FOUR);
        var cartesian = new Cartesian3(0.0, 0.0, 1.0).multiplyByScalar(s);
        var q = new Quaternion(cartesian.x, cartesian.y, cartesian.z, c);
        var xAxis = new Cartesian4(1.0, 0.0, 0.0, 0.0);
        var yAxis = new Cartesian4(0.0, 1.0, 0.0, 0.0);
        expect(q.rotate(xAxis).equalsEpsilon(yAxis, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('getAxis', function() {
        var s = Math.sin(CesiumMath.PI_OVER_FOUR);
        var c = Math.cos(CesiumMath.PI_OVER_FOUR);
        var cartesian = new Cartesian3(0.0, 0.0, 1.0).multiplyByScalar(s);
        var q = new Quaternion(cartesian.x, cartesian.y, cartesian.z, c);
        expect(q.getAxis().equals(new Cartesian3(0.0, 0.0, 1.0))).toEqual(true);
        q = new Quaternion(4.0, 3.0, 2.0, 1.0);
        expect(q.getAxis().equals(Cartesian3.ZERO)).toEqual(true);
    });

    it('getAngle', function() {
        var s = Math.sin(CesiumMath.PI_OVER_FOUR);
        var c = Math.cos(CesiumMath.PI_OVER_FOUR);
        var cartesian = new Cartesian3(0.0, 0.0, 1.0).multiplyByScalar(s);
        var q = new Quaternion(cartesian.x, cartesian.y, cartesian.z, c);
        expect(q.getAngle()).toEqual(CesiumMath.PI_OVER_TWO);
        q = new Quaternion(4.0, 3.0, 2.0, 1.0);
        expect(q.getAngle() === 0.0).toEqual(true);
    });

    it('lerp', function() {
        var q = new Quaternion(1.0, 2.0, 3.0, 4.0);
        var r = new Quaternion(5.0, 6.0, 7.0, 8.0);
        var t = 0.75;
        var s = q.multiplyByScalar(1.0 - t).add(r.multiplyByScalar(t));
        expect(q.lerp(0.0, r).equals(q)).toEqual(true);
        expect(q.lerp(1.0, r).equals(r)).toEqual(true);
        expect(q.lerp(t, r).equals(s)).toEqual(true);
    });

    it('slerp', function() {
        var q = new Quaternion(0.0, 0.0, 0.0, 1.0).normalize();
        var cartesian1 = new Cartesian3(0.0, 0.0, Math.sin(CesiumMath.PI_OVER_FOUR));
        var r = new Quaternion(cartesian1.x, cartesian1.y, cartesian1.z, Math.cos(CesiumMath.PI_OVER_FOUR));
        var cartesian2 = new Cartesian3(0.0, 0.0, Math.sin(Math.PI / 8.0));
        var s = new Quaternion(cartesian2.x, cartesian2.y, cartesian2.z, Math.cos(Math.PI / 8.0));
        expect(q.slerp(0.0, r).equals(q)).toEqual(true);
        expect(q.slerp(1.0, r).equals(r)).toEqual(true);
        expect(q.slerp(0.5, r).equalsEpsilon(s, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('slerp (2)', function() {
        var q = new Quaternion(0.0, 0.0, 0.0, -1.0).normalize();
        var cartesian1 = new Cartesian3(0.0, 0.0, Math.sin(CesiumMath.PI_OVER_FOUR));
        var r = new Quaternion(cartesian1.x, cartesian1.y, cartesian1.z, Math.cos(CesiumMath.PI_OVER_FOUR));
        expect(q.slerp(0.0, r).equals(q)).toEqual(true);
        expect(q.slerp(1.0, r).equalsEpsilon(new Quaternion(0.0, 0.0, -Math.sqrt(2) / 2.0, -Math.sqrt(2) / 2.0), CesiumMath.EPSILON10)).toEqual(true);
    });

    it('log', function() {
        var s = Math.sin(CesiumMath.PI_OVER_FOUR);
        var c = Math.cos(CesiumMath.PI_OVER_FOUR);
        var cartesian = new Cartesian3(0.0, 0.0, 1.0).multiplyByScalar(s);
        var q = new Quaternion(cartesian.x, cartesian.y, cartesian.z, c);
        expect(q.log().equals(new Cartesian3(0.0, 0.0, CesiumMath.PI_OVER_FOUR)));
    });

    it('power', function() {
        var s = Math.sin(CesiumMath.PI_OVER_FOUR);
        var c = Math.cos(CesiumMath.PI_OVER_FOUR);
        var cartesian = new Cartesian3(0.0, 0.0, 1.0).multiplyByScalar(s);
        var t = new Quaternion(cartesian.x, cartesian.y, cartesian.z, c);
        var u = t.power(2.0);
        var v = t.multiply(t);
        expect(u.equalsEpsilon(v, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('equalsEpsilon', function() {
        expect(new Quaternion(1.0, 1.0, 2.0, 1.0).equalsEpsilon(new Quaternion(1.0, 1.0, 2.0, 1.0), 0.0)).toEqual(true);
        expect(new Quaternion(1.0, 1.0, 2.0, 1.0).equalsEpsilon(new Quaternion(1.0, 1.0, 2.0, 2.0), 1.0)).toEqual(true);
        expect(new Quaternion(1.0, 1.0, 2.0, 1.0).equalsEpsilon(new Quaternion(1.0, 1.0, 2.0, 3.0), 1.0)).toEqual(false);
    });

    it('toString', function() {
        var q = new Quaternion(1.0, 2.0, 3.0, 4.0);
        expect(q.toString()).toEqual('(1, 2, 3, 4)');
    });

    it('fromAxisAngle', function() {
        var axis = new Cartesian3(0.0, 0.0, 1.0);
        var theta = CesiumMath.PI_OVER_TWO;

        var s = Math.sin(theta / 2.0);
        var c = Math.cos(theta / 2.0);
        var a = axis.multiplyByScalar(s);
        var q = new Quaternion(a.x, a.y, a.z, c);

        var r = Quaternion.fromAxisAngle(axis, theta);
        expect(r.equals(q)).toEqual(true);
    });

    it('fromRotationMatrix (1)', function() {
        var theta = CesiumMath.PI_OVER_TWO;

        var sHalfTheta = Math.sin(theta / 2.0);
        var cHalfTheta = Math.cos(theta / 2.0);

        var sTheta = Math.sin(theta);
        var cTheta = Math.cos(theta);

        var zAxis = new Cartesian3(0.0, 0.0, 1.0);
        var z = zAxis.multiplyByScalar(sHalfTheta);
        var q = new Quaternion(z.x, z.y, z.z, cHalfTheta);
        var zRotation = new Matrix3(cTheta, -sTheta, 0.0,
                                    sTheta,  cTheta, 0.0,
                                       0.0,     0.0, 1.0);
        expect(Quaternion.fromRotationMatrix(zRotation).equalsEpsilon(q, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('fromRotationMatrix (2)', function() {
        var theta = CesiumMath.PI_OVER_TWO;

        var sHalfTheta = Math.sin(theta / 2.0);
        var cHalfTheta = Math.cos(theta / 2.0);

        var sTheta = Math.sin(theta);
        var cTheta = Math.cos(theta);

        var yAxis = new Cartesian3(0.0, 1.0, 0.0);
        var y = yAxis.multiplyByScalar(sHalfTheta);
        var q = new Quaternion(y.x, y.y, y.z, cHalfTheta);
        var yRotation = new Matrix3( cTheta, 0.0, sTheta,
                                        0.0, 1.0,    0.0,
                                    -sTheta, 0.0, cTheta);
        expect(Quaternion.fromRotationMatrix(yRotation).equalsEpsilon(q, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('fromRotationMatrix (3)', function() {
        var theta = CesiumMath.PI_OVER_TWO;

        var sHalfTheta = Math.sin(theta / 2.0);
        var cHalfTheta = Math.cos(theta / 2.0);

        var sTheta = Math.sin(theta);
        var cTheta = Math.cos(theta);

        var xAxis = new Cartesian3(1.0, 0.0, 0.0);
        var x = xAxis.multiplyByScalar(sHalfTheta);
        var q = new Quaternion(x.x, x.y, x.z, cHalfTheta);
        var xRotation = new Matrix3(1.0,    0.0,     0.0,
                                    0.0, cTheta, -sTheta,
                                    0.0, sTheta,  cTheta);
        expect(Quaternion.fromRotationMatrix(xRotation).equalsEpsilon(q, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('fromRotationMatrix (4)', function() {
        var theta = CesiumMath.PI_OVER_TWO;

        var sHalfTheta = Math.sin(theta / 2.0);
        var cHalfTheta = Math.cos(theta / 2.0);

        var sTheta = Math.sin(theta);
        var cTheta = Math.cos(theta);

        var zAxis = new Cartesian3(0.0, 0.0, 1.0);
        var z = zAxis.multiplyByScalar(sHalfTheta);
        var q = new Quaternion(z.x, z.y, z.z, cHalfTheta);
        var zRotation = new Matrix3(cTheta, -sTheta, 0.0,
                                    sTheta,  cTheta, 0.0,
                                       0.0,     0.0, 1.0);
        expect(Quaternion.fromRotationMatrix(zRotation).equalsEpsilon(q, CesiumMath.EPSILON15)).toEqual(true);

        var yAxis = new Cartesian3(0.0, 1.0, 0.0);
        var y = yAxis.multiplyByScalar(sHalfTheta);
        q = new Quaternion(y.x, y.y, y.z, cHalfTheta);
        var yRotation = new Matrix3( cTheta, 0.0, sTheta,
                                        0.0, 1.0,    0.0,
                                    -sTheta, 0.0, cTheta);
        expect(Quaternion.fromRotationMatrix(yRotation).equalsEpsilon(q, CesiumMath.EPSILON15)).toEqual(true);

        var xAxis = new Cartesian3(1.0, 0.0, 0.0);
        var x = xAxis.multiplyByScalar(sHalfTheta);
        q = new Quaternion(x.x, x.y, x.z, cHalfTheta);
        var xRotation = new Matrix3(1.0,    0.0,     0.0,
                                    0.0, cTheta, -sTheta,
                                    0.0, sTheta,  cTheta);
        expect(Quaternion.fromRotationMatrix(xRotation).equalsEpsilon(q, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('fromRotationMatrix (5)', function() {
        var rotation = new Matrix3(1.0, 0.0, 0.0,
                                   0.0, 1.0, 0.0,
                                   0.0, 0.0, 1.0);
        var q = new Quaternion(0.0, 0.0, 0.0, Math.sqrt(2.0) / 2.0);
        expect(Quaternion.fromRotationMatrix(rotation).equalsEpsilon(q, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('exp', function() {
        var s = Math.sin(CesiumMath.PI_OVER_FOUR);
        var c = Math.cos(CesiumMath.PI_OVER_FOUR);
        var cartesian = new Cartesian3(0.0, 0.0, 1.0).multiplyByScalar(s);
        var q = new Quaternion(cartesian.x, cartesian.y, cartesian.z, c);
        expect(Quaternion.exp(new Cartesian3(0.0, 0.0, CesiumMath.PI_OVER_FOUR)).equals(q)).toEqual(true);
    });
});
