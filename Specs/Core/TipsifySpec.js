import { Tipsify } from '../../Source/Cesium.js';

describe('Core/Tipsify', function() {

    it('can calculate the ACMR', function() {
        //Hexagon formed from 6 triangles, 7 vertices
        expect(Tipsify.calculateACMR({indices : [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 1, 6],
                                      maximumIndex : 6,
                                      cacheSize : 3})).toEqual(2);
    });

    it('can calculate the ACMR without a specified maximum index', function() {
        expect(Tipsify.calculateACMR({indices : [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 1, 6],
                                      cacheSize : 3})).toEqual(2);
    });

    it('throws when calculating ACMR (1 of 4)', function() {
        expect(function() {
            Tipsify.calculateACMR({indices : undefined,
                                   maximumIndex : 1,
                                   cacheSize : 3});
        }).toThrowDeveloperError();
    });

    it('throws when calculating ACMR (2 of 4)', function() {
        expect(function() {
            Tipsify.calculateACMR({indices : [1, 2, 3, 4],
                                   maximumIndex : 1,
                                   cacheSize : 3});
        }).toThrowDeveloperError();
    });

    it('throws when calculating ACMR (3 of 4)', function() {
        expect(function() {
            Tipsify.calculateACMR({indices : [0, 1, 2],
                                   maximumIndex : -1,
                                   cacheSize : 2});
        }).toThrowDeveloperError();
    });

    it('throws when calculating ACMR (4 of 4)', function() {
        expect(function() {
            Tipsify.calculateACMR({indices : [0, 1, 2],
                                   maximumIndex : 2,
                                   cacheSize : 2});
        }).toThrowDeveloperError();
    });

    it('throws when executing Tipsify (1 of 5)', function() {
        expect(function() {
            Tipsify.tipsify({indices : undefined,
                             maximumIndex : 1,
                             cacheSize : 3});
        }).toThrowDeveloperError();
    });

    it('throws when executing Tipsify (2 of 5)', function() {
        expect(function() {
            Tipsify.tipsify({indices : [1, 2, 3, 4],
                             maximumIndex : 1,
                             cacheSize : 3});
        }).toThrowDeveloperError();
    });

    it('throws when executing Tipsify (3 of 5)', function () {
        expect(function() {
            Tipsify.tipsify({indices : [1, 2, 3],
                             maximumIndex : -1,
                             cacheSize : 3});
        }).toThrowDeveloperError();
    });

    it('throws when executing Tipsify (4 of 5)', function() {
        expect(function() {
            Tipsify.tipsify({indices : [0, 1, 2],
                             maximumIndex : 2,
                             cacheSize : 2});
        }).toThrowDeveloperError();
    });

    it('throws when executing Tipsify (5 of 5)', function() {
        expect(function() {
            Tipsify.tipsify();
        }).toThrowDeveloperError();
    });

    it('can lower ACMR using the Tipsify algorithm', function() {
        var indices = [0, 1, 7, 1, 7, 8, 1, 2, 8, 2, 8, 9, 2, 3, 9, 3, 9, 10, 3, 4, 10, 4, 10, 11, 4, 5, 11, 5, 11, 12, 6, 13, 14, 6, 7, 14, 7, 14, 15, 7, 8, 15, 8, 15, 16, 8, 9, 16, 9, 16, 17, 9,
                10, 17, 10, 17, 18, 10, 11, 18, 11, 18, 19, 11, 12, 19, 12, 19, 20, 13, 21, 22, 13, 14, 22, 14, 22, 23, 14, 15, 23, 15, 23, 24, 15, 16, 24, 16, 24, 25, 16, 17, 25, 17, 25, 26, 17, 18,
                26, 18, 26, 27, 18, 19, 27, 19, 27, 28, 19, 20, 28];
        var acmrBefore = Tipsify.calculateACMR({indices : indices,
                                                maximumIndex : 28,
                                                cacheSize : 6});
        var result = Tipsify.tipsify({indices : indices,
                                      maximumIndex : 28,
                                      cacheSize : 6});
        var acmrAfter = Tipsify.calculateACMR({indices : result,
                                               maximumIndex : 28,
                                               cacheSize : 6});
        expect(acmrAfter).toBeLessThan(acmrBefore);
    });

    it('can Tipsify without knowing the maximum index', function() {
        var indices = [0, 1, 7, 1, 7, 8, 1, 2, 8, 2, 8, 9, 2, 3, 9, 3, 9, 10, 3, 4, 10, 4, 10, 11, 4, 5, 11, 5, 11, 12, 6, 13, 14, 6, 7, 14, 7, 14, 15, 7, 8, 15, 8, 15, 16, 8, 9, 16, 9, 16, 17, 9,
                       10, 17, 10, 17, 18, 10, 11, 18, 11, 18, 19, 11, 12, 19, 12, 19, 20, 13, 21, 22, 13, 14, 22, 14, 22, 23, 14, 15, 23, 15, 23, 24, 15, 16, 24, 16, 24, 25, 16, 17, 25, 17, 25, 26, 17, 18,
                       26, 18, 26, 27, 18, 19, 27, 19, 27, 28, 19, 20, 28];
        expect(Tipsify.tipsify({indices : indices,
                                cacheSize : 6})).toEqual(Tipsify.tipsify({indices : indices,
                                                                          maximumIndex : 28,
                                                                          cacheSize: 6}));
    });
});
