/*global defineSuite*/
defineSuite([
        'Scene/CullingVolume',
        'Core/AxisAlignedBoundingBox',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Intersect',
        'Scene/PerspectiveFrustum'
    ], function(
        CullingVolume,
        AxisAlignedBoundingBox,
        BoundingSphere,
        Cartesian3,
        Intersect,
        PerspectiveFrustum) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var cullingVolume;

    beforeEach(function() {
        var frustum = new PerspectiveFrustum();
        frustum.near = 1.0;
        frustum.far = 2.0;
        frustum.fov = (Math.PI) / 3;
        frustum.aspectRatio = 1.0;
        cullingVolume = frustum.computeCullingVolume(new Cartesian3(), Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()), Cartesian3.UNIT_Y);
    });

    it('computeVisibility throws without a bounding volume', function() {
        expect(function() {
            return new CullingVolume().computeVisibility();
        }).toThrowDeveloperError();
    });

    describe('box intersections', function() {

        it('can contain an axis aligned bounding box', function() {
            var box1 = AxisAlignedBoundingBox.fromPoints([
                                                   new Cartesian3(-0.5, 0, -1.25),
                                                   new Cartesian3(0.5, 0, -1.25),
                                                   new Cartesian3(-0.5, 0, -1.75),
                                                   new Cartesian3(0.5, 0, -1.75)
                                                  ]);
            expect(cullingVolume.computeVisibility(box1)).toEqual(Intersect.INSIDE);
        });

        describe('can partially contain an axis aligned bounding box', function() {

            it('on the far plane', function() {
                var box2 = AxisAlignedBoundingBox.fromPoints([
                                                       new Cartesian3(-0.5, 0, -1.5),
                                                       new Cartesian3(0.5, 0, -1.5),
                                                       new Cartesian3(-0.5, 0, -2.5),
                                                       new Cartesian3(0.5, 0, -2.5)
                                                      ]);
                expect(cullingVolume.computeVisibility(box2)).toEqual(Intersect.INTERSECTING);
            });

            it('on the near plane', function() {
                var box3 = AxisAlignedBoundingBox.fromPoints([
                                                       new Cartesian3(-0.5, 0, -0.5),
                                                       new Cartesian3(0.5, 0, -0.5),
                                                       new Cartesian3(-0.5, 0, -1.5),
                                                       new Cartesian3(0.5, 0, -1.5)
                                                      ]);
                expect(cullingVolume.computeVisibility(box3)).toEqual(Intersect.INTERSECTING);
            });

            it('on the left plane', function() {
                var box4 = AxisAlignedBoundingBox.fromPoints([
                                                       new Cartesian3(-1.5, 0, -1.25),
                                                       new Cartesian3(0, 0, -1.25),
                                                       new Cartesian3(-1.5, 0, -1.5),
                                                       new Cartesian3(0, 0, -1.5)
                                                      ]);
                expect(cullingVolume.computeVisibility(box4)).toEqual(Intersect.INTERSECTING);
            });

            it('on the right plane', function() {
                var box5 = AxisAlignedBoundingBox.fromPoints([
                                                       new Cartesian3(0, 0, -1.25),
                                                       new Cartesian3(1.5, 0, -1.25),
                                                       new Cartesian3(0, 0, -1.5),
                                                       new Cartesian3(1.5, 0, -1.5)
                                                      ]);
                expect(cullingVolume.computeVisibility(box5)).toEqual(Intersect.INTERSECTING);
            });

            it('on the top plane', function() {
                var box6 = AxisAlignedBoundingBox.fromPoints([
                                                       new Cartesian3(-0.5, 0, -1.25),
                                                       new Cartesian3(0.5, 0, -1.25),
                                                       new Cartesian3(-0.5, 2.0, -1.75),
                                                       new Cartesian3(0.5, 2.0, -1.75)
                                                      ]);
                expect(cullingVolume.computeVisibility(box6)).toEqual(Intersect.INTERSECTING);
            });

            it('on the bottom plane', function() {
                var box7 = AxisAlignedBoundingBox.fromPoints([
                                                       new Cartesian3(-0.5, -2.0, -1.25),
                                                       new Cartesian3(0.5, 0, -1.25),
                                                       new Cartesian3(-0.5, -2.0, -1.5),
                                                       new Cartesian3(0.5, 0, -1.5)
                                                      ]);
                expect(cullingVolume.computeVisibility(box7)).toEqual(Intersect.INTERSECTING);
            });
        });

        describe('can not contain an axis aligned bounding box', function() {

            it('past the far plane', function() {
                var box8 = AxisAlignedBoundingBox.fromPoints([
                                                       new Cartesian3(-0.5, 0, -2.25),
                                                       new Cartesian3(0.5, 0, -2.25),
                                                       new Cartesian3(-0.5, 0, -2.75),
                                                       new Cartesian3(0.5, 0, -2.75)
                                                      ]);
                expect(cullingVolume.computeVisibility(box8)).toEqual(Intersect.OUTSIDE);
            });

            it('before the near plane', function() {
                var box9 = AxisAlignedBoundingBox.fromPoints([
                                                       new Cartesian3(-0.5, 0, -0.25),
                                                       new Cartesian3(0.5, 0, -0.25),
                                                       new Cartesian3(-0.5, 0, -0.75),
                                                       new Cartesian3(0.5, 0, -0.75)
                                                      ]);
                expect(cullingVolume.computeVisibility(box9)).toEqual(Intersect.OUTSIDE);
            });

            it('past the left plane', function() {
                var box10 = AxisAlignedBoundingBox.fromPoints([
                                                        new Cartesian3(-5, 0, -1.25),
                                                        new Cartesian3(-3, 0, -1.25),
                                                        new Cartesian3(-5, 0, -1.75),
                                                        new Cartesian3(-3, 0, -1.75)
                                                       ]);
                expect(cullingVolume.computeVisibility(box10)).toEqual(Intersect.OUTSIDE);
            });

            it('past the right plane', function() {
                var box11 = AxisAlignedBoundingBox.fromPoints([
                                                        new Cartesian3(3, 0, -1.25),
                                                        new Cartesian3(5, 0, -1.25),
                                                        new Cartesian3(3, 0, -1.75),
                                                        new Cartesian3(5, 0, -1.75)
                                                       ]);
                expect(cullingVolume.computeVisibility(box11)).toEqual(Intersect.OUTSIDE);
            });

            it('past the top plane', function() {
                var box12 = AxisAlignedBoundingBox.fromPoints([
                                                        new Cartesian3(-0.5, 3, -1.25),
                                                        new Cartesian3(0.5, 3, -1.25),
                                                        new Cartesian3(-0.5, 5, -1.75),
                                                        new Cartesian3(0.5, 5, -1.75)
                                                       ]);
                expect(cullingVolume.computeVisibility(box12)).toEqual(Intersect.OUTSIDE);
            });

            it('past the bottom plane', function() {
                var box13 = AxisAlignedBoundingBox.fromPoints([
                                                        new Cartesian3(-0.5, -3, -1.25),
                                                        new Cartesian3(0.5, -3, -1.25),
                                                        new Cartesian3(-0.5, -5, -1.75),
                                                        new Cartesian3(0.5, -5, -1.75)
                                                       ]);
                expect(cullingVolume.computeVisibility(box13)).toEqual(Intersect.OUTSIDE);
            });

        });
    });

    describe('sphere intersection', function() {

        it('can contain a sphere', function() {
            var sphere1 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -1.25), new Cartesian3(0, 0, -1.75)]);
            expect(cullingVolume.computeVisibility(sphere1)).toEqual(Intersect.INSIDE);
        });

        describe('can partially contain a sphere', function() {

            it('on the far plane', function() {
                var sphere2 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -1.5), new Cartesian3(0, 0, -2.5)]);
                expect(cullingVolume.computeVisibility(sphere2)).toEqual(Intersect.INTERSECTING);
            });

            it('on the near plane', function() {
                var sphere3 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -0.5), new Cartesian3(0, 0, -1.5)]);
                expect(cullingVolume.computeVisibility(sphere3)).toEqual(Intersect.INTERSECTING);
            });

            it('on the left plane', function() {
                var sphere4 = BoundingSphere.fromPoints([new Cartesian3(-1.0, 0, -1.5), new Cartesian3(0, 0, -1.5)]);
                expect(cullingVolume.computeVisibility(sphere4)).toEqual(Intersect.INTERSECTING);
            });

            it('on the right plane', function() {
                var sphere5 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -1.5), new Cartesian3(1.0, 0, -1.5)]);
                expect(cullingVolume.computeVisibility(sphere5)).toEqual(Intersect.INTERSECTING);
            });

            it('on the top plane', function() {
                var sphere6 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -1.5), new Cartesian3(0, 2.0, -1.5)]);
                expect(cullingVolume.computeVisibility(sphere6)).toEqual(Intersect.INTERSECTING);
            });

            it('on the bottom plane', function() {
                var sphere7 = BoundingSphere.fromPoints([new Cartesian3(0, -2.0, -1.5), new Cartesian3(0, 0, -1.5)]);
                expect(cullingVolume.computeVisibility(sphere7)).toEqual(Intersect.INTERSECTING);
            });
        });

        describe('can not contain a sphere', function() {

            it('past the far plane', function() {
                var sphere8 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -2.25), new Cartesian3(0, 0, -2.75)]);
                expect(cullingVolume.computeVisibility(sphere8)).toEqual(Intersect.OUTSIDE);
            });

            it('before the near plane', function() {
                var sphere9 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -0.25), new Cartesian3(0, 0, -0.5)]);
                expect(cullingVolume.computeVisibility(sphere9)).toEqual(Intersect.OUTSIDE);
            });

            it('past the left plane', function() {
                var sphere10 = BoundingSphere.fromPoints([new Cartesian3(-5, 0, -1.25), new Cartesian3(-4.5, 0, -1.75)]);
                expect(cullingVolume.computeVisibility(sphere10)).toEqual(Intersect.OUTSIDE);
            });

            it('past the right plane', function() {
                var sphere11 = BoundingSphere.fromPoints([new Cartesian3(4.5, 0, -1.25), new Cartesian3(5, 0, -1.75)]);
                expect(cullingVolume.computeVisibility(sphere11)).toEqual(Intersect.OUTSIDE);
            });

            it('past the top plane', function() {
                var sphere12 = BoundingSphere.fromPoints([new Cartesian3(-0.5, 4.5, -1.25), new Cartesian3(-0.5, 5, -1.25)]);
                expect(cullingVolume.computeVisibility(sphere12)).toEqual(Intersect.OUTSIDE);
            });

            it('past the bottom plane', function() {
                var sphere13 = BoundingSphere.fromPoints([new Cartesian3(-0.5, -4.5, -1.25), new Cartesian3(-0.5, -5, -1.25)]);
                expect(cullingVolume.computeVisibility(sphere13)).toEqual(Intersect.OUTSIDE);
            });
        });
    });
});
