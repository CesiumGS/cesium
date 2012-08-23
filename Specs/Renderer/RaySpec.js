/*global defineSuite*/
defineSuite([
         '../Specs/createContext',
         '../Specs/destroyContext',
         '../Specs/renderFragment',
         'Shaders/Ray'
     ], 'Renderer/Ray', function(
         createContext,
         destroyContext,
         renderFragment,
         ShadersRay) {
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
                ShadersRay +
                '#line 0\n' +
                fs;
            return renderFragment(context, fsSource);
        };
    })(renderFragment);

    ///////////////////////////////////////////////////////////////////////

    it('czm_pointAlongRay: point at ray origin', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(czm_pointAlongRay(czm_ray(vec3(0.0), vec3(1.0, 0.0, 0.0)), 0.0) == vec3(0.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_pointAlongRay: point in front of ray origin', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(czm_pointAlongRay(czm_ray(vec3(0.0), vec3(1.0, 0.0, 0.0)), 2.0) == vec3(2.0, 0.0, 0.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_pointAlongRay: point behind ray origin', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(czm_pointAlongRay(czm_ray(vec3(0.0), vec3(0.0, 1.0, 0.0)), -2.0) == vec3(0.0, -2.0, 0.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    ///////////////////////////////////////////////////////////////////////

    it('czm_intersect: no intersection 0', function() {
        var fs =
            'void main() {' +
            '  gl_FragColor = vec4(czm_isEmpty(czm_intersection(czm_raySegment(1.0, 2.0), czm_raySegment(3.0, 4.0)))); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_intersect: no intersection 1', function() {
        var fs =
            'void main() {' +
            '  gl_FragColor = vec4(czm_isEmpty(czm_intersection(czm_raySegment(3.0, 4.0), czm_raySegment(1.0, 2.0)))); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_intersect: no intersection 2', function() {
        var fs =
            'void main() {' +
            '  gl_FragColor = vec4(czm_isEmpty(czm_intersection(czm_raySegment(-2.0, -1.0), czm_raySegment(3.0, 4.0)))); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_intersect: intersection 0', function() {
        var fs =
            'void main() {' +
            '  gl_FragColor = vec4(czm_intersection(czm_raySegment(1.0, 2.0), czm_raySegment(1.0, 2.0)) == czm_raySegment(1.0, 2.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_intersect: intersection 1', function() {
        var fs =
            'void main() {' +
            '  gl_FragColor = vec4(czm_intersection(czm_raySegment(1.0, 3.0), czm_raySegment(2.0, 4.0)) == czm_raySegment(2.0, 3.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_intersect: intersection 2', function() {
        var fs =
            'void main() {' +
            '  gl_FragColor = vec4(czm_intersection(czm_raySegment(1.0, 2.0), czm_raySegment(2.0, 3.0)) == czm_raySegment(2.0, 2.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_intersect: intersection 3', function() {
        var fs =
            'void main() {' +
            '  gl_FragColor = vec4(czm_intersection(czm_raySegment(1.0, 4.0), czm_raySegment(2.0, 3.0)) == czm_raySegment(2.0, 3.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_intersect: intersection 4', function() {
        var fs =
            'void main() {' +
            '  gl_FragColor = vec4(czm_intersection(czm_raySegment(2.0, 3.0), czm_raySegment(1.0, 4.0)) == czm_raySegment(2.0, 3.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_intersect: intersection 5', function() {
        var fs =
            'void main() {' +
            '  gl_FragColor = vec4(czm_intersection(czm_raySegment(-3.0, 3.0), czm_raySegment(-1.0, 1.0)) == czm_raySegment(-1.0, 1.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    ///////////////////////////////////////////////////////////////////////

    it('czm_subtract: inner inside outer', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection i = czm_subtraction(czm_raySegment(1.0, 4.0), czm_raySegment(2.0, 3.0));' +
            '  gl_FragColor = vec4((i.intervals[0] == czm_raySegment(1.0, 2.0)) && (i.intervals[1] == czm_raySegment(3.0, 4.0))); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_subtract: inner inside outer on left boundary', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection i = czm_subtraction(czm_raySegment(1.0, 4.0), czm_raySegment(1.0, 2.0));' +
            '  gl_FragColor = vec4((i.intervals[0] == czm_raySegment(2.0, 4.0)) && (i.count == 1)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_subtract: inner inside outer on right boundary', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection i = czm_subtraction(czm_raySegment(1.0, 4.0), czm_raySegment(3.0, 4.0));' +
            '  gl_FragColor = vec4((i.intervals[0] == czm_raySegment(1.0, 3.0)) && (i.count == 1)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_subtract: inner equals outer', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection i = czm_subtraction(czm_raySegment(1.0, 4.0), czm_raySegment(1.0, 4.0));' +
            '  gl_FragColor = vec4(i.count == 0); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_subtract: inner is greater than outer', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection i = czm_subtraction(czm_raySegment(1.0, 4.0), czm_raySegment(0.0, 5.0));' +
            '  gl_FragColor = vec4(i.count == 0); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_subtract: inner overlaps outer at left boundary', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection i = czm_subtraction(czm_raySegment(1.0, 4.0), czm_raySegment(0.0, 2.0));' +
            '  gl_FragColor = vec4((i.intervals[0] == czm_raySegment(2.0, 4.0)) && (i.count == 1)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_subtract: inner overlaps outer at right boundary', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection i = czm_subtraction(czm_raySegment(1.0, 4.0), czm_raySegment(3.0, 5.0));' +
            '  gl_FragColor = vec4((i.intervals[0] == czm_raySegment(1.0, 3.0)) && (i.count == 1)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_subtract: inner touches at left boundary', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection i = czm_subtraction(czm_raySegment(1.0, 4.0), czm_raySegment(0.0, 1.0));' +
            '  gl_FragColor = vec4((i.intervals[0] == czm_raySegment(1.0, 4.0)) && (i.count == 1)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_subtract: inner touches at right boundary', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection i = czm_subtraction(czm_raySegment(1.0, 4.0), czm_raySegment(4.0, 5.0));' +
            '  gl_FragColor = vec4((i.intervals[0] == czm_raySegment(1.0, 4.0)) && (i.count == 1)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_subtract: inner is to the right of outer', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection i = czm_subtraction(czm_raySegment(1.0, 4.0), czm_raySegment(5.0, 6.0));' +
            '  gl_FragColor = vec4((i.intervals[0] == czm_raySegment(1.0, 4.0)) && (i.count == 1)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_subtract: inner is to the left of outer', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection i = czm_subtraction(czm_raySegment(1.0, 4.0), czm_raySegment(-1.0, 0.0));' +
            '  gl_FragColor = vec4((i.intervals[0] == czm_raySegment(1.0, 4.0)) && (i.count == 1)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    ///////////////////////////////////////////////////////////////////////

    it('czm_insertAt: last, first, middle', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection segments = czm_raySegmentCollectionNew();' +
            '  czm_insertAt(segments, czm_raySegment(5.0, 6.0), segments.count);' +
            '  czm_insertAt(segments, czm_raySegment(1.0, 2.0), 0);' +
            '  czm_insertAt(segments, czm_raySegment(3.0, 4.0), 1);' +
            '  gl_FragColor = vec4(' +
            '    (segments.count == 3)' +
            '    && (segments.intervals[0].start == 1.0) && (segments.intervals[0].stop == 2.0)' +
            '    && (segments.intervals[1].start == 3.0) && (segments.intervals[1].stop == 4.0)' +
            '    && (segments.intervals[2].start == 5.0) && (segments.intervals[2].stop == 6.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    ///////////////////////////////////////////////////////////////////////

    it('czm_removeAt: first', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection segments = czm_raySegmentCollectionNew();' +
            '  czm_insertAt(segments, czm_raySegment(5.0, 6.0), segments.count);' +
            '  czm_insertAt(segments, czm_raySegment(1.0, 2.0), 0);' +
            '  czm_insertAt(segments, czm_raySegment(3.0, 4.0), 1);' +
            '  czm_removeAt(segments, 0);' +
            '  gl_FragColor = vec4(' +
            '    (segments.count == 2)' +
            '    && (segments.intervals[0].start == 3.0) && (segments.intervals[0].stop == 4.0)' +
            '    && (segments.intervals[1].start == 5.0) && (segments.intervals[1].stop == 6.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_removeAt: middle', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection segments = czm_raySegmentCollectionNew();' +
            '  czm_insertAt(segments, czm_raySegment(5.0, 6.0), segments.count);' +
            '  czm_insertAt(segments, czm_raySegment(1.0, 2.0), 0);' +
            '  czm_insertAt(segments, czm_raySegment(3.0, 4.0), 1);' +
            '  czm_removeAt(segments, 1);' +
            '  gl_FragColor = vec4(' +
            '    (segments.count == 2)' +
            '    && (segments.intervals[0].start == 1.0) && (segments.intervals[0].stop == 2.0)' +
            '    && (segments.intervals[1].start == 5.0) && (segments.intervals[1].stop == 6.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_removeAt: last', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection segments = czm_raySegmentCollectionNew();' +
            '  czm_insertAt(segments, czm_raySegment(5.0, 6.0), segments.count);' +
            '  czm_insertAt(segments, czm_raySegment(1.0, 2.0), 0);' +
            '  czm_insertAt(segments, czm_raySegment(3.0, 4.0), 1);' +
            '  czm_removeAt(segments, 2);' +
            '  gl_FragColor = vec4(' +
            '    (segments.count == 2)' +
            '    && (segments.intervals[0].start == 1.0) && (segments.intervals[0].stop == 2.0)' +
            '    && (segments.intervals[1].start == 3.0) && (segments.intervals[1].stop == 4.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    ///////////////////////////////////////////////////////////////////////

    it('czm_intersect: {[5,8],[10,20]} with {[5,8],[10,20]}', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection collection1 = czm_raySegmentCollectionNew();' +
            '  czm_insertAt(collection1, czm_raySegment(5.0, 8.0), 0);' +
            '  czm_insertAt(collection1, czm_raySegment(10.0, 20.0), collection1.count);' +
            '  czm_raySegmentCollection collection2 = czm_raySegmentCollectionNew();' +
            '  czm_insertAt(collection2, czm_raySegment(5.0, 8.0), 0);' +
            '  czm_insertAt(collection2, czm_raySegment(10.0, 20.0), collection1.count);' +
            '  czm_raySegmentCollection intersection = czm_intersection(collection1, collection2);' +
            '  gl_FragColor = vec4(' +
            '    (intersection.count == 2)' +
            '    && (intersection.intervals[0].start == 5.0) && (intersection.intervals[0].stop == 8.0)' +
            '    && (intersection.intervals[1].start == 10.0) && (intersection.intervals[1].stop == 20.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_intersect: {[5,8],[10,20]} with {[7,11]}', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection collection1 = czm_raySegmentCollectionNew();' +
            '  czm_insertAt(collection1, czm_raySegment(5.0, 8.0), 0);' +
            '  czm_insertAt(collection1, czm_raySegment(10.0, 20.0), collection1.count);' +
            '  czm_raySegmentCollection collection2 = czm_raySegmentCollectionNew();' +
            '  czm_insertAt(collection2, czm_raySegment(7.0, 11.0), 0);' +
            '  czm_raySegmentCollection intersection = czm_intersection(collection1, collection2);' +
            '  gl_FragColor = vec4(' +
            '    (intersection.count == 2)' +
            '    && (intersection.intervals[0].start == 7.0) && (intersection.intervals[0].stop == 8.0)' +
            '    && (intersection.intervals[1].start == 10.0) && (intersection.intervals[1].stop == 11.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_intersect: {[2,4],[5,7]} with {[1,6],[6.1,8]}', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection collection1 = czm_raySegmentCollectionNew();' +
            '  czm_insertAt(collection1, czm_raySegment(2.0, 4.0), 0);' +
            '  czm_insertAt(collection1, czm_raySegment(5.0, 7.0), collection1.count);' +
            '  czm_raySegmentCollection collection2 = czm_raySegmentCollectionNew();' +
            '  czm_insertAt(collection2, czm_raySegment(1.0, 6.0), 0);' +
            '  czm_insertAt(collection2, czm_raySegment(6.1, 8.0), collection2.count);' +
            '  czm_raySegmentCollection intersection = czm_intersection(collection1, collection2);' +
            '  gl_FragColor = vec4(' +
            '    (intersection.count == 3)' +
            '    && (intersection.intervals[0].start == 2.0) && (intersection.intervals[0].stop == 4.0)' +
            '    && (intersection.intervals[1].start == 5.0) && (intersection.intervals[1].stop == 6.0)' +
            '    && (intersection.intervals[2].start == 6.1) && (intersection.intervals[2].stop == 7.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_intersect: {[3.5,4]} with {[1,2],[3,4]}', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection collection1 = czm_raySegmentCollectionNew();' +
            '  czm_insertAt(collection1, czm_raySegment(3.5, 4.0), 0);' +
            '  czm_raySegmentCollection collection2 = czm_raySegmentCollectionNew();' +
            '  czm_insertAt(collection2, czm_raySegment(1.0, 2.0), 0);' +
            '  czm_insertAt(collection2, czm_raySegment(3.0, 4.0), collection1.count);' +
            '  czm_raySegmentCollection intersection = czm_intersection(collection1, collection2);' +
            '  gl_FragColor = vec4(' +
            '    (intersection.count == 1)' +
            '    && (intersection.intervals[0].start == 3.5) && (intersection.intervals[0].stop == 4.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_intersect: {[2,4],[5,7]} with {}', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection collection1 = czm_raySegmentCollectionNew();' +
            '  czm_insertAt(collection1, czm_raySegment(2.0, 4.0), 0);' +
            '  czm_insertAt(collection1, czm_raySegment(5.0, 7.0), collection1.count);' +
            '  czm_raySegmentCollection collection2 = czm_raySegmentCollectionNew();' +
            '  czm_raySegmentCollection intersection = czm_intersection(collection1, collection2);' +
            '  gl_FragColor = vec4(' +
            '    (intersection.count == 0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });

    it('czm_intersect: {[2,4]} with {[2,4]}', function() {
        var fs =
            'void main() {' +
            '  czm_raySegmentCollection collection1 = czm_raySegmentCollectionNew();' +
            '  czm_insertAt(collection1, czm_raySegment(2.0, 4.0), 0);' +
            '  czm_raySegmentCollection collection2 = czm_raySegmentCollectionNew();' +
            '  czm_insertAt(collection2, czm_raySegment(2.0, 4.0), 0);' +
            '  czm_raySegmentCollection intersection = czm_intersection(collection1, collection2);' +
            '  gl_FragColor = vec4(' +
            '    (intersection.count == 1)' +
            '    && (intersection.intervals[0].start == 2.0) && (intersection.intervals[0].stop == 4.0)); ' +
            '}';
        expect(renderFragment(context, fs)).toEqual([255, 255, 255, 255]);
    });
});