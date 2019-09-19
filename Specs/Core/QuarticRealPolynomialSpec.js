import { Math as CesiumMath } from '../../Source/Cesium.js';
import { QuarticRealPolynomial } from '../../Source/Cesium.js';

describe('Core/QuarticRealPolynomial', function() {

    it('discriminant throws without a', function() {
        expect(function() {
            QuarticRealPolynomial.computeDiscriminant();
        }).toThrowDeveloperError();
    });

    it('discriminant throws without b', function() {
        expect(function() {
            QuarticRealPolynomial.computeDiscriminant(1.0);
        }).toThrowDeveloperError();
    });

    it('discriminant throws without c', function() {
        expect(function() {
            QuarticRealPolynomial.computeDiscriminant(1.0, 1.0);
        }).toThrowDeveloperError();
    });

    it('discriminant throws without d', function() {
        expect(function() {
            QuarticRealPolynomial.computeDiscriminant(1.0, 1.0, 1.0);
        }).toThrowDeveloperError();
    });

    it('discriminant throws without e', function() {
        expect(function() {
            QuarticRealPolynomial.computeDiscriminant(1.0, 1.0, 1.0, 1.0);
        }).toThrowDeveloperError();
    });

    it('discriminant', function() {
        var a = 1;
        var b = 2;
        var c = 3;
        var d = 4;
        var e = 5;

        var a2 = a * a;
        var a3 = a2 * a;
        var b2 = b * b;
        var b3 = b2 * b;
        var c2 = c * c;
        var c3 = c2 * c;
        var d2 = d * d;
        var d3 = d2 * d;
        var e2 = e * e;
        var e3 = e2 * e;

        var expected = b2 * c2 * d2 - 4.0 * b3 * d3 - 4.0 * a * c3 * d2 + 18 * a * b * c * d3 - 27.0 * a2 * d2 * d2 + 256.0 * a3 * e3 + e * (18.0 * b3 * c * d - 4.0 * b2 * c3 + 16.0 * a * c2 * c2 - 80.0 * a * b * c2 * d - 6.0 * a * b2 * d2 + 144.0 * a2 * c * d2) + e2 * (144.0 * a * b2 * c - 27.0 * b2 * b2 - 128.0 * a2 * c2 - 192.0 * a2 * b * d);
        var actual = QuarticRealPolynomial.computeDiscriminant(a, b, c, d, e);
        expect(actual).toEqual(expected);
    });

    it('real roots throws without a', function() {
        expect(function() {
            QuarticRealPolynomial.computeRealRoots();
        }).toThrowDeveloperError();
    });

    it('real roots throws without b', function() {
        expect(function() {
            QuarticRealPolynomial.computeRealRoots(1.0);
        }).toThrowDeveloperError();
    });

    it('real roots throws without c', function() {
        expect(function() {
            QuarticRealPolynomial.computeRealRoots(1.0, 1.0);
        }).toThrowDeveloperError();
    });

    it('real roots throws without d', function() {
        expect(function() {
            QuarticRealPolynomial.computeRealRoots(1.0, 1.0, 1.0);
        }).toThrowDeveloperError();
    });

    it('real roots throws without e', function() {
        expect(function() {
            QuarticRealPolynomial.computeRealRoots(1.0, 1.0, 1.0, 1.0);
        }).toThrowDeveloperError();
    });

    it('four repeated roots', function() {
        var roots = QuarticRealPolynomial.computeRealRoots(2.0, -16.0, 48.0, -64.0, 32.0);
        expect(roots.length).toEqual(4);
        expect(roots[0]).toEqualEpsilon(2.0, CesiumMath.EPSILON15);
        expect(roots[1]).toEqualEpsilon(2.0, CesiumMath.EPSILON15);
        expect(roots[2]).toEqualEpsilon(2.0, CesiumMath.EPSILON15);
        expect(roots[3]).toEqualEpsilon(2.0, CesiumMath.EPSILON15);
    });

    it('two pairs of repeated roots', function() {
        var roots = QuarticRealPolynomial.computeRealRoots(2.0, 0.0, -4.0, 0.0, 2.0);
        expect(roots.length).toEqual(4);
        expect(roots[0]).toEqualEpsilon(-1.0, CesiumMath.EPSILON15);
        expect(roots[1]).toEqualEpsilon(-1.0, CesiumMath.EPSILON15);
        expect(roots[2]).toEqualEpsilon(1.0, CesiumMath.EPSILON15);
        expect(roots[3]).toEqualEpsilon(1.0, CesiumMath.EPSILON15);
    });

    it('one pair of repeated roots', function() {
        var roots = QuarticRealPolynomial.computeRealRoots(2.0, -8.0, 16.0, -16.0, 6.0);
        expect(roots.length).toEqual(2);
        expect(roots[0]).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
        expect(roots[1]).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
    });

    it('two unique and one pair of repeated roots', function() {
        var roots = QuarticRealPolynomial.computeRealRoots(2.0, 8.0, -6.0, -20.0, 16.0);
        expect(roots.length).toEqual(4);
        expect(roots[0]).toEqualEpsilon(-4.0, CesiumMath.EPSILON15);
        expect(roots[1]).toEqualEpsilon(-2.0, CesiumMath.EPSILON15);
        expect(roots[2]).toEqualEpsilon(1.0, CesiumMath.EPSILON15);
        expect(roots[3]).toEqualEpsilon(1.0, CesiumMath.EPSILON15);
    });

    it('four unique roots', function() {
        var roots = QuarticRealPolynomial.computeRealRoots(2.0, 4.0, -26.0, -28.0, 48.0);
        expect(roots.length).toEqual(4);
        expect(roots[0]).toEqualEpsilon(-4.0, CesiumMath.EPSILON15);
        expect(roots[1]).toEqualEpsilon(-2.0, CesiumMath.EPSILON15);
        expect(roots[2]).toEqualEpsilon(1.0, CesiumMath.EPSILON15);
        expect(roots[3]).toEqualEpsilon(3.0, CesiumMath.EPSILON15);
    });

    it('complex roots', function() {
        var roots = QuarticRealPolynomial.computeRealRoots(3.0, -8.0, 14.0, -8.0, 3.0);
        expect(roots.length).toEqual(0);
    });

    it('cubic case', function() {
        var roots = QuarticRealPolynomial.computeRealRoots(0.0, 2.0, 6.0, -26.0, -30.0);
        expect(roots.length).toEqual(3);
        expect(roots[0]).toEqualEpsilon(-5.0, CesiumMath.EPSILON15);
        expect(roots[1]).toEqualEpsilon(-1.0, CesiumMath.EPSILON15);
        expect(roots[2]).toEqualEpsilon(3.0, CesiumMath.EPSILON15);
    });

    it('stability 1', function() {
        var a = 1.0;
        var b = -27121.309311434146;
        var c = 0.0;
        var d = -26760.571078686513;
        var e = -1.0;

        var expected = [ -0.000037368410630733706, 27121.3093478151];
        var actual = QuarticRealPolynomial.computeRealRoots(a, b, c, d, e);
        expect(actual.length).toEqual(expected.length);
        expect(actual[0]).toEqualEpsilon(expected[0], CesiumMath.EPSILON12);
        expect(actual[1]).toEqualEpsilon(expected[1], CesiumMath.EPSILON12);
    });

    it('stability 2', function() {
        var a = -1.0;
        var b = -26959.661445199898;
        var c = 0.0;
        var d = -26675.609408851604;
        var e = 1.0;

        var expected = [ -26959.661481901538, 0.000037487427107407711 ];
        var actual = QuarticRealPolynomial.computeRealRoots(a, b, c, d, e);
        expect(actual.length).toEqual(expected.length);
        expect(actual[0]).toEqualEpsilon(expected[0], CesiumMath.EPSILON11);
        expect(actual[1]).toEqualEpsilon(expected[1], CesiumMath.EPSILON11);
    });

    it('stability 3', function() {
        var a = -1.0;
        var b = 20607.270539372261;
        var c = 0.0;
        var d = 20333.159863900513;
        var e = 1.0;

        var expected = [ -0.000049180747737409547, 20607.270587253341 ];
        var actual = QuarticRealPolynomial.computeRealRoots(a, b, c, d, e);
        expect(actual.length).toEqual(expected.length);
        expect(actual[0]).toEqualEpsilon(expected[0], CesiumMath.EPSILON11);
        expect(actual[1]).toEqualEpsilon(expected[1], CesiumMath.EPSILON11);
    });
});
