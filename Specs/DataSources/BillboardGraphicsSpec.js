import { Cartesian2 } from '../../Source/Cesium.js';
import { Cartesian3 } from '../../Source/Cesium.js';
import { Color } from '../../Source/Cesium.js';
import { DistanceDisplayCondition } from '../../Source/Cesium.js';
import { NearFarScalar } from '../../Source/Cesium.js';
import { BillboardGraphics } from '../../Source/Cesium.js';
import { ConstantProperty } from '../../Source/Cesium.js';
import { HeightReference } from '../../Source/Cesium.js';
import { HorizontalOrigin } from '../../Source/Cesium.js';
import { VerticalOrigin } from '../../Source/Cesium.js';

describe('DataSources/BillboardGraphics', function() {

    it('creates expected instance from raw assignment and construction', function() {
        var options = {
            image : '0',
            rotation : 1,
            alignedAxis : Cartesian3.UNIT_Z,
            color : Color.RED,
            heightReference: HeightReference.CLAMP_TO_GROUND,
            horizontalOrigin : HorizontalOrigin.LEFT,
            verticalOrigin : VerticalOrigin.BOTTOM,
            eyeOffset : new Cartesian3(5, 6, 7),
            pixelOffset : new Cartesian2(8, 9),
            scale : 10,
            show : true,
            width : 11,
            height : 12,
            scaleByDistance : new NearFarScalar(13, 14, 15, 16),
            translucencyByDistance : new NearFarScalar(17, 18, 19, 20),
            pixelOffsetScaleByDistance : new NearFarScalar(21, 22, 23, 24),
            sizeInMeters : true,
            distanceDisplayCondition : new DistanceDisplayCondition(10.0, 100.0),
            disableDepthTestDistance : 10.0
        };

        var billboard = new BillboardGraphics(options);
        expect(billboard.image).toBeInstanceOf(ConstantProperty);
        expect(billboard.rotation).toBeInstanceOf(ConstantProperty);
        expect(billboard.alignedAxis).toBeInstanceOf(ConstantProperty);
        expect(billboard.color).toBeInstanceOf(ConstantProperty);
        expect(billboard.heightReference).toBeInstanceOf(ConstantProperty);
        expect(billboard.horizontalOrigin).toBeInstanceOf(ConstantProperty);
        expect(billboard.verticalOrigin).toBeInstanceOf(ConstantProperty);
        expect(billboard.eyeOffset).toBeInstanceOf(ConstantProperty);
        expect(billboard.scale).toBeInstanceOf(ConstantProperty);
        expect(billboard.show).toBeInstanceOf(ConstantProperty);
        expect(billboard.width).toBeInstanceOf(ConstantProperty);
        expect(billboard.height).toBeInstanceOf(ConstantProperty);
        expect(billboard.scaleByDistance).toBeInstanceOf(ConstantProperty);
        expect(billboard.translucencyByDistance).toBeInstanceOf(ConstantProperty);
        expect(billboard.pixelOffsetScaleByDistance).toBeInstanceOf(ConstantProperty);
        expect(billboard.sizeInMeters).toBeInstanceOf(ConstantProperty);
        expect(billboard.distanceDisplayCondition).toBeInstanceOf(ConstantProperty);
        expect(billboard.disableDepthTestDistance).toBeInstanceOf(ConstantProperty);

        expect(billboard.image.getValue()).toEqual(options.image);
        expect(billboard.rotation.getValue()).toEqual(options.rotation);
        expect(billboard.alignedAxis.getValue()).toEqual(options.alignedAxis);
        expect(billboard.color.getValue()).toEqual(options.color);
        expect(billboard.heightReference.getValue()).toEqual(options.heightReference);
        expect(billboard.horizontalOrigin.getValue()).toEqual(options.horizontalOrigin);
        expect(billboard.verticalOrigin.getValue()).toEqual(options.verticalOrigin);
        expect(billboard.eyeOffset.getValue()).toEqual(options.eyeOffset);
        expect(billboard.scale.getValue()).toEqual(options.scale);
        expect(billboard.show.getValue()).toEqual(options.show);
        expect(billboard.width.getValue()).toEqual(options.width);
        expect(billboard.height.getValue()).toEqual(options.height);
        expect(billboard.scaleByDistance.getValue()).toEqual(options.scaleByDistance);
        expect(billboard.translucencyByDistance.getValue()).toEqual(options.translucencyByDistance);
        expect(billboard.pixelOffsetScaleByDistance.getValue()).toEqual(options.pixelOffsetScaleByDistance);
        expect(billboard.sizeInMeters.getValue()).toEqual(options.sizeInMeters);
        expect(billboard.distanceDisplayCondition.getValue()).toEqual(options.distanceDisplayCondition);
        expect(billboard.disableDepthTestDistance.getValue()).toEqual(options.disableDepthTestDistance);
    });

    it('merge assigns unassigned properties', function() {
        var source = new BillboardGraphics();
        source.image = new ConstantProperty('');
        source.imageSubRegion = new ConstantProperty();
        source.rotation = new ConstantProperty(5);
        source.alignedAxis = new ConstantProperty(new Cartesian3());
        source.color = new ConstantProperty(Color.BLACK);
        source.heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
        source.horizontalOrigin = new ConstantProperty(HorizontalOrigin.LEFT);
        source.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);
        source.eyeOffset = new ConstantProperty(Cartesian3.UNIT_Y);
        source.pixelOffset = new ConstantProperty(Cartesian2.UNIT_X);
        source.scale = new ConstantProperty(1);
        source.show = new ConstantProperty(false);
        source.width = new ConstantProperty(24);
        source.height = new ConstantProperty(36);
        source.scaleByDistance = new ConstantProperty(new NearFarScalar());
        source.translucencyByDistance = new ConstantProperty(new NearFarScalar());
        source.pixelOffsetScaleByDistance = new ConstantProperty(new NearFarScalar(1.0, 0.0, 3.0e9, 0.0));
        source.sizeInMeters = new ConstantProperty(true);
        source.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition(10.0, 100.0));
        source.disableDepthTestDistance = 10.0;

        var target = new BillboardGraphics();
        target.merge(source);

        expect(target.image).toBe(source.image);
        expect(target.imageSubRegion).toBe(source.imageSubRegion);
        expect(target.rotation).toBe(source.rotation);
        expect(target.alignedAxis).toBe(source.alignedAxis);
        expect(target.color).toBe(source.color);
        expect(target.heightReference).toBe(source.heightReference);
        expect(target.horizontalOrigin).toBe(source.horizontalOrigin);
        expect(target.verticalOrigin).toBe(source.verticalOrigin);
        expect(target.eyeOffset).toBe(source.eyeOffset);
        expect(target.pixelOffset).toBe(source.pixelOffset);
        expect(target.scale).toBe(source.scale);
        expect(target.show).toBe(source.show);
        expect(target.width).toBe(source.width);
        expect(target.height).toBe(source.height);
        expect(target.scaleByDistance).toBe(source.scaleByDistance);
        expect(target.translucencyByDistance).toBe(source.translucencyByDistance);
        expect(target.pixelOffsetScaleByDistance).toBe(source.pixelOffsetScaleByDistance);
        expect(target.sizeInMeters).toBe(source.sizeInMeters);
        expect(target.distanceDisplayCondition).toBe(source.distanceDisplayCondition);
        expect(target.disableDepthTestDistance).toBe(source.disableDepthTestDistance);
    });

    it('merge does not assign assigned properties', function() {
        var source = new BillboardGraphics();
        source.image = new ConstantProperty('');
        source.imageSubRegion = new ConstantProperty();
        source.rotation = new ConstantProperty(5);
        source.alignedAxis = new ConstantProperty(new Cartesian3());
        source.color = new ConstantProperty(Color.BLACK);
        source.heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
        source.horizontalOrigin = new ConstantProperty(HorizontalOrigin.LEFT);
        source.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);
        source.eyeOffset = new ConstantProperty(Cartesian3.UNIT_Y);
        source.pixelOffset = new ConstantProperty(Cartesian2.UNIT_X);
        source.scale = new ConstantProperty(1);
        source.show = new ConstantProperty(false);
        source.width = new ConstantProperty(24);
        source.height = new ConstantProperty(36);
        source.scaleByDistance = new ConstantProperty(new NearFarScalar());
        source.translucencyByDistance = new ConstantProperty(new NearFarScalar());
        source.pixelOffsetScaleByDistance = new ConstantProperty(new NearFarScalar(1.0, 0.0, 3.0e9, 0.0));
        source.sizeInMeters = new ConstantProperty(true);
        source.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition(10.0, 100.0));
        source.disableDepthTestDistance = new ConstantProperty(10.0);

        var image = new ConstantProperty('');
        var imageSubRegion = new ConstantProperty();
        var rotation = new ConstantProperty(5);
        var alignedAxis = new ConstantProperty(new Cartesian3());
        var color = new ConstantProperty(Color.BLACK);
        var heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
        var horizontalOrigin = new ConstantProperty(HorizontalOrigin.LEFT);
        var verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);
        var eyeOffset = new ConstantProperty(Cartesian3.UNIT_Y);
        var pixelOffset = new ConstantProperty(Cartesian2.UNIT_X);
        var scale = new ConstantProperty(1);
        var show = new ConstantProperty(false);
        var width = new ConstantProperty(2);
        var height = new ConstantProperty(3);
        var scaleByDistance = new ConstantProperty(new NearFarScalar());
        var translucencyByDistance = new ConstantProperty(new NearFarScalar());
        var pixelOffsetScaleByDistance = new ConstantProperty(new NearFarScalar());
        var sizeInMeters = new ConstantProperty(true);
        var distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition());
        var disableDepthTestDistance = new ConstantProperty(10.0);

        var target = new BillboardGraphics();
        target.image = image;
        target.imageSubRegion = imageSubRegion;
        target.rotation = rotation;
        target.alignedAxis = alignedAxis;
        target.color = color;
        target.heightReference = heightReference;
        target.horizontalOrigin = horizontalOrigin;
        target.verticalOrigin = verticalOrigin;
        target.eyeOffset = eyeOffset;
        target.pixelOffset = pixelOffset;
        target.scale = scale;
        target.show = show;
        target.width = width;
        target.height = height;
        target.scaleByDistance = scaleByDistance;
        target.translucencyByDistance = translucencyByDistance;
        target.pixelOffsetScaleByDistance = pixelOffsetScaleByDistance;
        target.sizeInMeters = sizeInMeters;
        target.distanceDisplayCondition = distanceDisplayCondition;
        target.disableDepthTestDistance = disableDepthTestDistance;

        target.merge(source);

        expect(target.image).toBe(image);
        expect(target.imageSubRegion).toBe(imageSubRegion);
        expect(target.rotation).toBe(rotation);
        expect(target.alignedAxis).toBe(alignedAxis);
        expect(target.color).toBe(color);
        expect(target.heightReference).toBe(heightReference);
        expect(target.horizontalOrigin).toBe(horizontalOrigin);
        expect(target.verticalOrigin).toBe(verticalOrigin);
        expect(target.eyeOffset).toBe(eyeOffset);
        expect(target.pixelOffset).toBe(pixelOffset);
        expect(target.scale).toBe(scale);
        expect(target.show).toBe(show);
        expect(target.width).toBe(width);
        expect(target.height).toBe(height);
        expect(target.scaleByDistance).toBe(scaleByDistance);
        expect(target.translucencyByDistance).toBe(translucencyByDistance);
        expect(target.pixelOffsetScaleByDistance).toBe(pixelOffsetScaleByDistance);
        expect(target.sizeInMeters).toBe(sizeInMeters);
        expect(target.distanceDisplayCondition).toBe(distanceDisplayCondition);
        expect(target.disableDepthTestDistance).toBe(disableDepthTestDistance);
    });

    it('clone works', function() {
        var source = new BillboardGraphics();
        source.image = new ConstantProperty('');
        source.imageSubRegion = new ConstantProperty();
        source.rotation = new ConstantProperty(5);
        source.alignedAxis = new ConstantProperty(new Cartesian3());
        source.color = new ConstantProperty(Color.BLACK);
        source.heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
        source.horizontalOrigin = new ConstantProperty(HorizontalOrigin.LEFT);
        source.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);
        source.eyeOffset = new ConstantProperty(Cartesian3.UNIT_Y);
        source.pixelOffset = new ConstantProperty(Cartesian2.UNIT_X);
        source.scale = new ConstantProperty(1);
        source.show = new ConstantProperty(false);
        source.width = new ConstantProperty(24);
        source.height = new ConstantProperty(36);
        source.scaleByDistance = new ConstantProperty(new NearFarScalar());
        source.translucencyByDistance = new ConstantProperty(new NearFarScalar());
        source.pixelOffsetScaleByDistance = new ConstantProperty(new NearFarScalar(1.0, 0.0, 3.0e9, 0.0));
        source.sizeInMeters = new ConstantProperty(true);
        source.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition(10.0, 100.0));
        source.disableDepthTestDistance = new ConstantProperty(10.0);

        var result = source.clone();
        expect(result.image).toBe(source.image);
        expect(result.imageSubRegion).toBe(source.imageSubRegion);
        expect(result.rotation).toBe(source.rotation);
        expect(result.alignedAxis).toBe(source.alignedAxis);
        expect(result.color).toBe(source.color);
        expect(result.heightReference).toBe(source.heightReference);
        expect(result.horizontalOrigin).toBe(source.horizontalOrigin);
        expect(result.verticalOrigin).toBe(source.verticalOrigin);
        expect(result.eyeOffset).toBe(source.eyeOffset);
        expect(result.pixelOffset).toBe(source.pixelOffset);
        expect(result.scale).toBe(source.scale);
        expect(result.show).toBe(source.show);
        expect(result.width).toBe(source.width);
        expect(result.height).toBe(source.height);
        expect(result.scaleByDistance).toBe(source.scaleByDistance);
        expect(result.translucencyByDistance).toBe(source.translucencyByDistance);
        expect(result.pixelOffsetScaleByDistance).toBe(source.pixelOffsetScaleByDistance);
        expect(result.sizeInMeters).toBe(source.sizeInMeters);
        expect(result.distanceDisplayCondition).toBe(source.distanceDisplayCondition);
        expect(result.disableDepthTestDistance).toBe(source.disableDepthTestDistance);
    });

    it('merge throws if source undefined', function() {
        var target = new BillboardGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});
