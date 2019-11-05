import { AxisAlignedBoundingBox } from '../../Source/Cesium.js';
import { BoundingSphere } from '../../Source/Cesium.js';
import { Cartesian3 } from '../../Source/Cesium.js';
import { CullingVolume } from '../../Source/Cesium.js';
import { Intersect } from '../../Source/Cesium.js';
import { PerspectiveFrustum } from '../../Source/Cesium.js';

describe('Core/CullingVolume', function() {

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

    it('computeVisibilityWithPlaneMask throws without a bounding volume', function() {
        expect(function() {
            return new CullingVolume().computeVisibilityWithPlaneMask(undefined, CullingVolume.MASK_INDETERMINATE);
        }).toThrowDeveloperError();
    });

    it('computeVisibilityWithPlaneMask throws without a parent plane mask', function() {
        expect(function() {
            return new CullingVolume().computeVisibilityWithPlaneMask(new BoundingSphere(), undefined);
        }).toThrowDeveloperError();
    });

    function testWithAndWithoutPlaneMask(culling, bound, intersect) {
        expect(culling.computeVisibility(bound)).toEqual(intersect);

        var mask = culling.computeVisibilityWithPlaneMask(bound, CullingVolume.MASK_INDETERMINATE);
        if (intersect === Intersect.INSIDE) {
            expect(mask).toEqual(CullingVolume.MASK_INSIDE);
        } else if (intersect === Intersect.OUTSIDE) {
            expect(mask).toEqual(CullingVolume.MASK_OUTSIDE);
        } else {
            expect(mask).not.toEqual(CullingVolume.MASK_INSIDE);
            expect(mask).not.toEqual(CullingVolume.MASK_OUTSIDE);
        }
        expect(culling.computeVisibilityWithPlaneMask(bound, mask)).toEqual(mask);
    }

    describe('box intersections', function() {

        it('can contain an axis aligned bounding box', function() {
            var box1 = AxisAlignedBoundingBox.fromPoints([
                new Cartesian3(-0.5, 0, -1.25),
                new Cartesian3(0.5, 0, -1.25),
                new Cartesian3(-0.5, 0, -1.75),
                new Cartesian3(0.5, 0, -1.75)
            ]);
            testWithAndWithoutPlaneMask(cullingVolume, box1, Intersect.INSIDE);
        });

        describe('can partially contain an axis aligned bounding box', function() {

            it('on the far plane', function() {
                var box2 = AxisAlignedBoundingBox.fromPoints([
                    new Cartesian3(-0.5, 0, -1.5),
                    new Cartesian3(0.5, 0, -1.5),
                    new Cartesian3(-0.5, 0, -2.5),
                    new Cartesian3(0.5, 0, -2.5)
                ]);
                testWithAndWithoutPlaneMask(cullingVolume, box2, Intersect.INTERSECTING);
            });

            it('on the near plane', function() {
                var box3 = AxisAlignedBoundingBox.fromPoints([
                    new Cartesian3(-0.5, 0, -0.5),
                    new Cartesian3(0.5, 0, -0.5),
                    new Cartesian3(-0.5, 0, -1.5),
                    new Cartesian3(0.5, 0, -1.5)
                ]);
                testWithAndWithoutPlaneMask(cullingVolume, box3, Intersect.INTERSECTING);
            });

            it('on the left plane', function() {
                var box4 = AxisAlignedBoundingBox.fromPoints([
                    new Cartesian3(-1.5, 0, -1.25),
                    new Cartesian3(0, 0, -1.25),
                    new Cartesian3(-1.5, 0, -1.5),
                    new Cartesian3(0, 0, -1.5)
                ]);
                testWithAndWithoutPlaneMask(cullingVolume, box4, Intersect.INTERSECTING);
            });

            it('on the right plane', function() {
                var box5 = AxisAlignedBoundingBox.fromPoints([
                    new Cartesian3(0, 0, -1.25),
                    new Cartesian3(1.5, 0, -1.25),
                    new Cartesian3(0, 0, -1.5),
                    new Cartesian3(1.5, 0, -1.5)
                ]);
                testWithAndWithoutPlaneMask(cullingVolume, box5, Intersect.INTERSECTING);
            });

            it('on the top plane', function() {
                var box6 = AxisAlignedBoundingBox.fromPoints([
                    new Cartesian3(-0.5, 0, -1.25),
                    new Cartesian3(0.5, 0, -1.25),
                    new Cartesian3(-0.5, 2.0, -1.75),
                    new Cartesian3(0.5, 2.0, -1.75)
                ]);
                testWithAndWithoutPlaneMask(cullingVolume, box6, Intersect.INTERSECTING);
            });

            it('on the bottom plane', function() {
                var box7 = AxisAlignedBoundingBox.fromPoints([
                    new Cartesian3(-0.5, -2.0, -1.25),
                    new Cartesian3(0.5, 0, -1.25),
                    new Cartesian3(-0.5, -2.0, -1.5),
                    new Cartesian3(0.5, 0, -1.5)
                ]);
                testWithAndWithoutPlaneMask(cullingVolume, box7, Intersect.INTERSECTING);
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
                testWithAndWithoutPlaneMask(cullingVolume, box8, Intersect.OUTSIDE);
            });

            it('before the near plane', function() {
                var box9 = AxisAlignedBoundingBox.fromPoints([
                    new Cartesian3(-0.5, 0, -0.25),
                    new Cartesian3(0.5, 0, -0.25),
                    new Cartesian3(-0.5, 0, -0.75),
                    new Cartesian3(0.5, 0, -0.75)
                ]);
                testWithAndWithoutPlaneMask(cullingVolume, box9, Intersect.OUTSIDE);
            });

            it('past the left plane', function() {
                var box10 = AxisAlignedBoundingBox.fromPoints([
                    new Cartesian3(-5, 0, -1.25),
                    new Cartesian3(-3, 0, -1.25),
                    new Cartesian3(-5, 0, -1.75),
                    new Cartesian3(-3, 0, -1.75)
                ]);
                testWithAndWithoutPlaneMask(cullingVolume, box10, Intersect.OUTSIDE);
            });

            it('past the right plane', function() {
                var box11 = AxisAlignedBoundingBox.fromPoints([
                    new Cartesian3(3, 0, -1.25),
                    new Cartesian3(5, 0, -1.25),
                    new Cartesian3(3, 0, -1.75),
                    new Cartesian3(5, 0, -1.75)
                ]);
                testWithAndWithoutPlaneMask(cullingVolume, box11, Intersect.OUTSIDE);
            });

            it('past the top plane', function() {
                var box12 = AxisAlignedBoundingBox.fromPoints([
                    new Cartesian3(-0.5, 3, -1.25),
                    new Cartesian3(0.5, 3, -1.25),
                    new Cartesian3(-0.5, 5, -1.75),
                    new Cartesian3(0.5, 5, -1.75)
                ]);
                testWithAndWithoutPlaneMask(cullingVolume, box12, Intersect.OUTSIDE);
            });

            it('past the bottom plane', function() {
                var box13 = AxisAlignedBoundingBox.fromPoints([
                    new Cartesian3(-0.5, -3, -1.25),
                    new Cartesian3(0.5, -3, -1.25),
                    new Cartesian3(-0.5, -5, -1.75),
                    new Cartesian3(0.5, -5, -1.75)
                ]);
                testWithAndWithoutPlaneMask(cullingVolume, box13, Intersect.OUTSIDE);
            });

        });
    });

    describe('sphere intersection', function() {

        it('can contain a sphere', function() {
            var sphere1 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -1.25), new Cartesian3(0, 0, -1.75)]);
            testWithAndWithoutPlaneMask(cullingVolume, sphere1, Intersect.INSIDE);
        });

        describe('can partially contain a sphere', function() {

            it('on the far plane', function() {
                var sphere2 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -1.5), new Cartesian3(0, 0, -2.5)]);
                testWithAndWithoutPlaneMask(cullingVolume, sphere2, Intersect.INTERSECTING);
            });

            it('on the near plane', function() {
                var sphere3 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -0.5), new Cartesian3(0, 0, -1.5)]);
                testWithAndWithoutPlaneMask(cullingVolume, sphere3, Intersect.INTERSECTING);
            });

            it('on the left plane', function() {
                var sphere4 = BoundingSphere.fromPoints([new Cartesian3(-1.0, 0, -1.5), new Cartesian3(0, 0, -1.5)]);
                testWithAndWithoutPlaneMask(cullingVolume, sphere4, Intersect.INTERSECTING);
            });

            it('on the right plane', function() {
                var sphere5 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -1.5), new Cartesian3(1.0, 0, -1.5)]);
                testWithAndWithoutPlaneMask(cullingVolume, sphere5, Intersect.INTERSECTING);
            });

            it('on the top plane', function() {
                var sphere6 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -1.5), new Cartesian3(0, 2.0, -1.5)]);
                testWithAndWithoutPlaneMask(cullingVolume, sphere6, Intersect.INTERSECTING);
            });

            it('on the bottom plane', function() {
                var sphere7 = BoundingSphere.fromPoints([new Cartesian3(0, -2.0, -1.5), new Cartesian3(0, 0, -1.5)]);
                testWithAndWithoutPlaneMask(cullingVolume, sphere7, Intersect.INTERSECTING);
            });
        });

        describe('can not contain a sphere', function() {

            it('past the far plane', function() {
                var sphere8 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -2.25), new Cartesian3(0, 0, -2.75)]);
                testWithAndWithoutPlaneMask(cullingVolume, sphere8, Intersect.OUTSIDE);
            });

            it('before the near plane', function() {
                var sphere9 = BoundingSphere.fromPoints([new Cartesian3(0, 0, -0.25), new Cartesian3(0, 0, -0.5)]);
                testWithAndWithoutPlaneMask(cullingVolume, sphere9, Intersect.OUTSIDE);
            });

            it('past the left plane', function() {
                var sphere10 = BoundingSphere.fromPoints([new Cartesian3(-5, 0, -1.25), new Cartesian3(-4.5, 0, -1.75)]);
                testWithAndWithoutPlaneMask(cullingVolume, sphere10, Intersect.OUTSIDE);
            });

            it('past the right plane', function() {
                var sphere11 = BoundingSphere.fromPoints([new Cartesian3(4.5, 0, -1.25), new Cartesian3(5, 0, -1.75)]);
                testWithAndWithoutPlaneMask(cullingVolume, sphere11, Intersect.OUTSIDE);
            });

            it('past the top plane', function() {
                var sphere12 = BoundingSphere.fromPoints([new Cartesian3(-0.5, 4.5, -1.25), new Cartesian3(-0.5, 5, -1.25)]);
                testWithAndWithoutPlaneMask(cullingVolume, sphere12, Intersect.OUTSIDE);
            });

            it('past the bottom plane', function() {
                var sphere13 = BoundingSphere.fromPoints([new Cartesian3(-0.5, -4.5, -1.25), new Cartesian3(-0.5, -5, -1.25)]);
                testWithAndWithoutPlaneMask(cullingVolume, sphere13, Intersect.OUTSIDE);
            });
        });
    });

    describe('construct from bounding sphere', function() {
        var boundingSphereCullingVolume = new BoundingSphere(new Cartesian3(1000.0, 2000.0, 3000.0), 100.0);
        var cullingVolume = CullingVolume.fromBoundingSphere(boundingSphereCullingVolume);

        it('throws without a boundingSphere', function() {
            expect(function() {
                CullingVolume.fromBoundingSphere(undefined);
            }).toThrowDeveloperError();
        });

        it('can contain a volume', function() {
            var sphere1 = BoundingSphere.clone(boundingSphereCullingVolume);
            sphere1.radius *= 0.5;
            testWithAndWithoutPlaneMask(cullingVolume, sphere1, Intersect.INSIDE);
        });

        describe('can partially contain a volume', function() {

            it('on the far plane', function() {
                var offset = new Cartesian3(0.0, 0.0, boundingSphereCullingVolume.radius * 1.5);
                var center = Cartesian3.add(boundingSphereCullingVolume.center, offset, new Cartesian3());
                var radius = boundingSphereCullingVolume.radius * 0.5;
                var sphere2 = new BoundingSphere(center, radius);

                testWithAndWithoutPlaneMask(cullingVolume, sphere2, Intersect.INTERSECTING);
            });

            it('on the near plane', function() {
                var offset = new Cartesian3(0.0, 0.0, -boundingSphereCullingVolume.radius * 1.5);
                var center = Cartesian3.add(boundingSphereCullingVolume.center, offset, new Cartesian3());
                var radius = boundingSphereCullingVolume.radius * 0.5;
                var sphere3 = new BoundingSphere(center, radius);

                testWithAndWithoutPlaneMask(cullingVolume, sphere3, Intersect.INTERSECTING);
            });

            it('on the left plane', function() {
                var offset = new Cartesian3(-boundingSphereCullingVolume.radius * 1.5, 0.0, 0.0);
                var center = Cartesian3.add(boundingSphereCullingVolume.center, offset, new Cartesian3());
                var radius = boundingSphereCullingVolume.radius * 0.5;
                var sphere4 = new BoundingSphere(center, radius);

                testWithAndWithoutPlaneMask(cullingVolume, sphere4, Intersect.INTERSECTING);
            });

            it('on the right plane', function() {
                var offset = new Cartesian3(boundingSphereCullingVolume.radius * 1.5, 0.0, 0.0);
                var center = Cartesian3.add(boundingSphereCullingVolume.center, offset, new Cartesian3());
                var radius = boundingSphereCullingVolume.radius * 0.5;
                var sphere5 = new BoundingSphere(center, radius);

                testWithAndWithoutPlaneMask(cullingVolume, sphere5, Intersect.INTERSECTING);
            });

            it('on the top plane', function() {
                var offset = new Cartesian3(0.0, boundingSphereCullingVolume.radius * 1.5, 0.0);
                var center = Cartesian3.add(boundingSphereCullingVolume.center, offset, new Cartesian3());
                var radius = boundingSphereCullingVolume.radius * 0.5;
                var sphere6 = new BoundingSphere(center, radius);

                testWithAndWithoutPlaneMask(cullingVolume, sphere6, Intersect.INTERSECTING);
            });

            it('on the bottom plane', function() {
                var offset = new Cartesian3(0.0, -boundingSphereCullingVolume.radius * 1.5, 0.0);
                var center = Cartesian3.add(boundingSphereCullingVolume.center, offset, new Cartesian3());
                var radius = boundingSphereCullingVolume.radius * 0.5;
                var sphere7 = new BoundingSphere(center, radius);

                testWithAndWithoutPlaneMask(cullingVolume, sphere7, Intersect.INTERSECTING);
            });
        });

        describe('can not contain a volume', function() {

            it('past the far plane', function() {
                var offset = new Cartesian3(0.0, 0.0, boundingSphereCullingVolume.radius * 2.0);
                var center = Cartesian3.add(boundingSphereCullingVolume.center, offset, new Cartesian3());
                var radius = boundingSphereCullingVolume.radius * 0.5;
                var sphere8 = new BoundingSphere(center, radius);

                testWithAndWithoutPlaneMask(cullingVolume, sphere8, Intersect.OUTSIDE);
            });

            it('before the near plane', function() {
                var offset = new Cartesian3(0.0, 0.0, -boundingSphereCullingVolume.radius * 2.0);
                var center = Cartesian3.add(boundingSphereCullingVolume.center, offset, new Cartesian3());
                var radius = boundingSphereCullingVolume.radius * 0.5;
                var sphere9 = new BoundingSphere(center, radius);

                testWithAndWithoutPlaneMask(cullingVolume, sphere9, Intersect.OUTSIDE);
            });

            it('past the left plane', function() {
                var offset = new Cartesian3(-boundingSphereCullingVolume.radius * 2.0, 0.0, 0.0);
                var center = Cartesian3.add(boundingSphereCullingVolume.center, offset, new Cartesian3());
                var radius = boundingSphereCullingVolume.radius * 0.5;
                var sphere10 = new BoundingSphere(center, radius);

                testWithAndWithoutPlaneMask(cullingVolume, sphere10, Intersect.OUTSIDE);
            });

            it('past the right plane', function() {
                var offset = new Cartesian3(boundingSphereCullingVolume.radius * 2.0, 0.0, 0.0);
                var center = Cartesian3.add(boundingSphereCullingVolume.center, offset, new Cartesian3());
                var radius = boundingSphereCullingVolume.radius * 0.5;
                var sphere11 = new BoundingSphere(center, radius);

                testWithAndWithoutPlaneMask(cullingVolume, sphere11, Intersect.OUTSIDE);
            });

            it('past the top plane', function() {
                var offset = new Cartesian3(0.0, boundingSphereCullingVolume.radius * 2.0, 0.0);
                var center = Cartesian3.add(boundingSphereCullingVolume.center, offset, new Cartesian3());
                var radius = boundingSphereCullingVolume.radius * 0.5;
                var sphere12 = new BoundingSphere(center, radius);

                testWithAndWithoutPlaneMask(cullingVolume, sphere12, Intersect.OUTSIDE);
            });

            it('past the bottom plane', function() {
                var offset = new Cartesian3(0.0, -boundingSphereCullingVolume.radius * 2.0, 0.0);
                var center = Cartesian3.add(boundingSphereCullingVolume.center, offset, new Cartesian3());
                var radius = boundingSphereCullingVolume.radius * 0.5;
                var sphere13 = new BoundingSphere(center, radius);

                testWithAndWithoutPlaneMask(cullingVolume, sphere13, Intersect.OUTSIDE);
            });
        });
    });
});
