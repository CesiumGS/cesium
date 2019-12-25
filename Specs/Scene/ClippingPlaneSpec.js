import { Cartesian3 } from '../../Source/Cesium.js';
import { Math as CesiumMath } from '../../Source/Cesium.js';
import { Matrix3 } from '../../Source/Cesium.js';
import { Matrix4 } from '../../Source/Cesium.js';
import { Plane } from '../../Source/Cesium.js';
import { ClippingPlane } from '../../Source/Cesium.js';

describe('Scene/ClippingPlane', function() {

    it('constructs', function() {
        var normal = Cartesian3.UNIT_X;
        var distance = 1.0;
        var clippingPlane = new ClippingPlane(normal, distance);
        expect(clippingPlane.normal).toEqual(normal);
        expect(clippingPlane.distance).toEqual(distance);
    });

    it('runs onChangeCallback when changed', function() {
        var normal = Cartesian3.UNIT_X;
        var distance = 1.0;
        var changeCount = 0;

        var clippingPlane = new ClippingPlane(normal, distance);
        clippingPlane.onChangeCallback = function(index) {
            expect(index).toEqual(clippingPlane.index);
            changeCount++;
        };

        // Distance change
        clippingPlane.distance += 0.1;
        expect(changeCount).toEqual(1);

        // Distance non-change
        clippingPlane.distance += 0.0;
        expect(changeCount).toEqual(1);

        // Normal change
        clippingPlane.normal = Cartesian3.UNIT_Z;
        expect(changeCount).toEqual(2);

        // Normal non-change
        clippingPlane.normal = Cartesian3.UNIT_Z;
        expect(changeCount).toEqual(2);

        // Normal member change
        clippingPlane.normal.x += 1.0;
        expect(changeCount).toEqual(3);
    });

    it('can be instantiated from a Plane', function() {
        var plane = new Plane(Cartesian3.UNIT_X, 1.0);
        var clippingPlane = ClippingPlane.fromPlane(plane);
        expect(Cartesian3.equals(clippingPlane.normal, plane.normal)).toBe(true);
        expect(clippingPlane.distance).toEqual(plane.distance);

        var scratchClippingPlane = new ClippingPlane(Cartesian3.UNIT_Y, 0.0);
        clippingPlane = ClippingPlane.fromPlane(plane, scratchClippingPlane);
        expect(Cartesian3.equals(clippingPlane.normal, plane.normal)).toBe(true);
        expect(clippingPlane.distance).toEqual(plane.distance);
        expect(clippingPlane).toBe(scratchClippingPlane);
    });

    it('clones', function() {
        var clippingPlane = new ClippingPlane(Cartesian3.UNIT_X, 1.0);
        var cloneClippingPlane = ClippingPlane.clone(clippingPlane);
        expect(Cartesian3.equals(clippingPlane.normal, cloneClippingPlane.normal)).toBe(true);
        expect(clippingPlane.distance).toEqual(cloneClippingPlane.distance);

        var scratchClippingPlane = new ClippingPlane(Cartesian3.UNIT_Y, 0.0);
        cloneClippingPlane = ClippingPlane.clone(clippingPlane, scratchClippingPlane);
        expect(Cartesian3.equals(clippingPlane.normal, cloneClippingPlane.normal)).toBe(true);
        expect(clippingPlane.distance).toEqual(cloneClippingPlane.distance);
        expect(cloneClippingPlane).toBe(scratchClippingPlane);
    });

    it('works with Plane math', function() {
        var normal = new Cartesian3(1.0, 2.0, 3.0);
        normal = Cartesian3.normalize(normal, normal);
        var clippingPlane = new ClippingPlane(normal, 12.34);

        var transform = Matrix4.fromUniformScale(2.0);
        transform = Matrix4.multiplyByMatrix3(transform, Matrix3.fromRotationY(Math.PI), transform);

        var transformedPlane = Plane.transform(clippingPlane, transform);
        expect(transformedPlane.distance).toEqual(clippingPlane.distance * 2.0);
        expect(transformedPlane.normal.x).toEqualEpsilon(-clippingPlane.normal.x, CesiumMath.EPSILON10);
        expect(transformedPlane.normal.y).toEqual(clippingPlane.normal.y);
        expect(transformedPlane.normal.z).toEqual(-clippingPlane.normal.z);
    });
});
