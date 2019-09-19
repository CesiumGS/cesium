import { DistanceDisplayCondition } from '../../Source/Cesium.js';
import createPackableSpecs from '../createPackableSpecs.js';

describe('Core/DistanceDisplayCondition', function() {

    it('default constructs', function() {
        var dc = new DistanceDisplayCondition();
        expect(dc.near).toEqual(0.0);
        expect(dc.far).toEqual(Number.MAX_VALUE);
    });

    it('constructs with parameters', function() {
        var near = 10.0;
        var far = 100.0;
        var dc = new DistanceDisplayCondition(near, far);
        expect(dc.near).toEqual(near);
        expect(dc.far).toEqual(far);
    });

    it('gets and sets properties', function() {
        var dc = new DistanceDisplayCondition();

        var near = 10.0;
        var far = 100.0;
        dc.near = near;
        dc.far = far;

        expect(dc.near).toEqual(near);
        expect(dc.far).toEqual(far);
    });

    it('determines equality with static function', function() {
        var dc = new DistanceDisplayCondition(10.0, 100.0);
        expect(DistanceDisplayCondition.equals(dc, new DistanceDisplayCondition(10.0, 100.0))).toEqual(true);
        expect(DistanceDisplayCondition.equals(dc, new DistanceDisplayCondition(11.0, 100.0))).toEqual(false);
        expect(DistanceDisplayCondition.equals(dc, new DistanceDisplayCondition(10.0, 101.0))).toEqual(false);
        expect(DistanceDisplayCondition.equals(dc, undefined)).toEqual(false);
    });

    it('determines equality with prototype function', function() {
        var dc = new DistanceDisplayCondition(10.0, 100.0);
        expect(dc.equals(new DistanceDisplayCondition(10.0, 100.0))).toEqual(true);
        expect(dc.equals(new DistanceDisplayCondition(11.0, 100.0))).toEqual(false);
        expect(dc.equals(new DistanceDisplayCondition(10.0, 101.0))).toEqual(false);
        expect(dc.equals(undefined)).toEqual(false);
    });

    it('static clones', function() {
        var dc = new DistanceDisplayCondition(10.0, 100.0);
        var result = DistanceDisplayCondition.clone(dc);
        expect(dc).toEqual(result);
    });

    it('static clone with a result parameter', function() {
        var dc = new DistanceDisplayCondition(10.0, 100.0);
        var result = new DistanceDisplayCondition();
        var returnedResult = DistanceDisplayCondition.clone(dc, result);
        expect(dc).not.toBe(result);
        expect(result).toBe(returnedResult);
        expect(dc).toEqual(result);
    });

    it('static clone works with a result parameter that is an input parameter', function() {
        var dc = new DistanceDisplayCondition(10.0, 100.0);
        var returnedResult = DistanceDisplayCondition.clone(dc, dc);
        expect(dc).toBe(returnedResult);
    });

    it('clones', function() {
        var dc = new DistanceDisplayCondition(10.0, 100.0);
        var result = dc.clone();
        expect(dc).toEqual(result);
    });

    it('clone with a result parameter', function() {
        var dc = new DistanceDisplayCondition(10.0, 100.0);
        var result = new DistanceDisplayCondition();
        var returnedResult = dc.clone(result);
        expect(dc).not.toBe(result);
        expect(result).toBe(returnedResult);
        expect(dc).toEqual(result);
    });

    it('clone works with a result parameter that is an input parameter', function() {
        var dc = new DistanceDisplayCondition(10.0, 100.0);
        var returnedResult = dc.clone(dc);
        expect(dc).toBe(returnedResult);
    });

    createPackableSpecs(DistanceDisplayCondition, new DistanceDisplayCondition(1, 2), [1, 2]);
});
