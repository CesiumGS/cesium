import { Cartesian3 } from '../../Source/Cesium.js';
import { Cartographic } from '../../Source/Cesium.js';
import { ComponentDatatype } from '../../Source/Cesium.js';
import { Ellipsoid } from '../../Source/Cesium.js';
import { EncodedCartesian3 } from '../../Source/Cesium.js';
import { Math as CesiumMath } from '../../Source/Cesium.js';
import { Matrix4 } from '../../Source/Cesium.js';
import { Rectangle } from '../../Source/Cesium.js';
import { Transforms } from '../../Source/Cesium.js';
import { WebMercatorProjection } from '../../Source/Cesium.js';
import { Material } from '../../Source/Cesium.js';
import { MaterialAppearance } from '../../Source/Cesium.js';
import { PerInstanceColorAppearance } from '../../Source/Cesium.js';
import { ShadowVolumeAppearance } from '../../Source/Cesium.js';

describe('Scene/ShadowVolumeAppearance', function() {

    // using ShadowVolumeAppearanceVS directly fails on Travis with the --release test
    var testVs =
        'attribute vec3 position3DHigh;\n' +
        'attribute vec3 position3DLow;\n' +
        'attribute float batchId;\n' +
        'void main() {\n' +
        '    vec4 position = czm_computePosition();\n' +
        '    gl_Position = czm_depthClampFarPlane(czm_modelViewProjectionRelativeToEye * position);\n' +
        '}\n';

    var unitSphereEllipsoid = Ellipsoid.UNIT_SPHERE;
    var projection = new WebMercatorProjection(unitSphereEllipsoid);
    var largeTestRectangle = Rectangle.fromDegrees(-45.0, -45.0, 45.0, 45.0);
    var smallTestRectangle = Rectangle.fromDegrees(-0.1, -0.1, 0.1, 0.1);

    var largeRectangleAttributes = ShadowVolumeAppearance.getSphericalExtentGeometryInstanceAttributes(largeTestRectangle, [0, 0, 0, 1, 1, 0], unitSphereEllipsoid, projection, true);
    var smallRectangleAttributes = ShadowVolumeAppearance.getPlanarTextureCoordinateAttributes(smallTestRectangle, [0, 0, 0, 1, 1, 0], unitSphereEllipsoid, projection, true);
    var largeRectangleAttributesBadFloats = ShadowVolumeAppearance.getSphericalExtentGeometryInstanceAttributes(largeTestRectangle, [0, 0, 0, 1, 1, 0], unitSphereEllipsoid, projection, false);
    var smallRectangleAttributesBadFloats = ShadowVolumeAppearance.getPlanarTextureCoordinateAttributes(smallTestRectangle, [0, 0, 0, 1, 1, 0], unitSphereEllipsoid, projection, false);

    var perInstanceColorMaterialAppearance = new PerInstanceColorAppearance();
    var flatPerInstanceColorMaterialAppearance = new PerInstanceColorAppearance({
        flat : true
    });

    var textureMaterialAppearance = new MaterialAppearance({
        material : new Material({
            fabric : {
                type : 'BumpMap',
                uniforms : {
                    image : '../images/Cesium_Logo_Color.jpg',
                    channel : 'r'
                }
            }
        })
    });
    var flatTextureMaterialAppearance = new MaterialAppearance({
        material : Material.fromType(Material.ImageType, {
            image : '../Data/images/Red16x16.png'
        }),
        flat :true
    });

    // Defines for projection extents
    var eastMostCartographic = new Cartographic();
    var longitudeExtentsEncodeScratch = {
        high : 0.0,
        low : 0.0
    };
    eastMostCartographic.longitude = CesiumMath.PI;
    eastMostCartographic.latitude = 0.0;
    eastMostCartographic.height = 0.0;
    var eastMostCartesian = projection.project(eastMostCartographic);
    var encoded = EncodedCartesian3.encode(eastMostCartesian.x, longitudeExtentsEncodeScratch);
    var eastMostYhighDefine = 'EAST_MOST_X_HIGH ' + encoded.high.toFixed((encoded.high + '').length + 1);
    var eastMostYlowDefine = 'EAST_MOST_X_LOW ' + encoded.low.toFixed((encoded.low + '').length + 1);

    var westMostCartographic = new Cartographic();
    westMostCartographic.longitude = -CesiumMath.PI;
    westMostCartographic.latitude = 0.0;
    westMostCartographic.height = 0.0;
    var westMostCartesian = projection.project(westMostCartographic);
    encoded = EncodedCartesian3.encode(westMostCartesian.x, longitudeExtentsEncodeScratch);
    var westMostYhighDefine = 'WEST_MOST_X_HIGH ' + encoded.high.toFixed((encoded.high + '').length + 1);
    var westMostYlowDefine = 'WEST_MOST_X_LOW ' + encoded.low.toFixed((encoded.low + '').length + 1);

    it('provides attributes for computing texture coordinates from Spherical extents', function() {
        var attributes = largeRectangleAttributes;

        var sphericalExtents = attributes.sphericalExtents;
        expect(sphericalExtents.componentDatatype).toEqual(ComponentDatatype.FLOAT);
        expect(sphericalExtents.componentsPerAttribute).toEqual(4);
        expect(sphericalExtents.normalize).toEqual(false);
        var value = sphericalExtents.value;
        expect(value[0]).toEqualEpsilon(-CesiumMath.PI_OVER_FOUR, CesiumMath.EPSILON4);
        expect(value[1]).toEqualEpsilon(-CesiumMath.PI_OVER_FOUR, CesiumMath.EPSILON4);
        expect(value[2]).toEqualEpsilon(1.0 / CesiumMath.PI_OVER_TWO, CesiumMath.EPSILON4);
        expect(value[3]).toEqualEpsilon(1.0 / CesiumMath.PI_OVER_TWO, CesiumMath.EPSILON4);

        var longitudeRotation = attributes.longitudeRotation;
        expect(longitudeRotation.componentDatatype).toEqual(ComponentDatatype.FLOAT);
        expect(longitudeRotation.componentsPerAttribute).toEqual(1);
        expect(longitudeRotation.normalize).toEqual(false);
        value = longitudeRotation.value;
        expect(value[0]).toEqualEpsilon(0.0, CesiumMath.EPSILON4);
    });

    function checkGeometryInstanceAttributeVec3(attribute) {
        expect(attribute.componentDatatype).toEqual(ComponentDatatype.FLOAT);
        expect(attribute.componentsPerAttribute).toEqual(3);
        expect(attribute.normalize).toEqual(false);
    }

    function clampAndMagnitude(signedVec4Attribute) {
        var signedVec4 = signedVec4Attribute.value;
        var unsigned = signedVec4.slice();
        unsigned[0] = signedVec4[0] < 128.0 ? signedVec4[0] : (255.0 - signedVec4[0]);
        unsigned[0] = Math.floor(0.5 + unsigned[0]);
        unsigned[1] = Math.floor(0.5 + unsigned[1]);
        unsigned[2] = Math.floor(0.5 + unsigned[2]);
        unsigned[3] = Math.floor(0.5 + unsigned[3]);
        return unsigned;
    }

    function unpackLowLessThan100k(signedVec4Attribute) {
        var signed = signedVec4Attribute.value;
        var unsigned = clampAndMagnitude(signedVec4Attribute);
        return (1000.0 * unsigned[0] + 10.0 * unsigned[1] + 0.1 * unsigned[2] + 0.001 * unsigned[3]) * (signed[0] < 128.0 ? 1.0 : -1.0);
    }

    function unpackHighMagLessThan100Million(signedVec4Attribute) {
        var signed = signedVec4Attribute.value;
        var unsigned = clampAndMagnitude(signedVec4Attribute);
        return (1000000.0 * unsigned[0] + 10000.0 * unsigned[1] + 100.0 * unsigned[2] + unsigned[3]) * (signed[0] < 128.0 ? 1.0 : -1.0);
    }

    function unpackLowLessThan1000k(signedVec4Attribute) {
        var signed = signedVec4Attribute.value;
        var unsigned = clampAndMagnitude(signedVec4Attribute);
        return (10000.0 * unsigned[0] + 100.0 * unsigned[1] + unsigned[2] + 0.01 * unsigned[3]) * (signed[0] < 128.0 ? 1.0 : -1.0);
    }

    describe('floating point textures reliable', function () {
        it('provides attributes for computing texture coordinates using planes in 3D', function() {
            var attributes = smallRectangleAttributes;

            var southWest_LOW = attributes.southWest_LOW;
            var southWest_HIGH = attributes.southWest_HIGH;
            var eastward = attributes.eastward;
            var northward = attributes.northward;

            checkGeometryInstanceAttributeVec3(southWest_LOW);
            checkGeometryInstanceAttributeVec3(southWest_HIGH);
            checkGeometryInstanceAttributeVec3(eastward);
            checkGeometryInstanceAttributeVec3(northward);

            // We're using a unit sphere, so expect all HIGH values to be basically 0
            // and LOW value to be within a small cone around UNIT_X
            expect(southWest_HIGH.value[0]).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
            expect(southWest_HIGH.value[1]).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
            expect(southWest_HIGH.value[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON7);

            expect(southWest_LOW.value[0]).toBeGreaterThan(Math.cos(CesiumMath.toRadians(0.2)));

            // Expect eastward and northward to be unit-direction vectors in the ENU coordinate system at the rectangle center
            var smallRectangleCenter = Cartographic.toCartesian(Rectangle.center(smallTestRectangle), unitSphereEllipsoid);
            var enuMatrix = Transforms.eastNorthUpToFixedFrame(smallRectangleCenter, unitSphereEllipsoid);
            var inverseEnu = Matrix4.inverse(enuMatrix, new Matrix4());

            var eastwardENU = Matrix4.multiplyByPointAsVector(inverseEnu, Cartesian3.fromArray(eastward.value), new Cartesian3());
            eastwardENU = Cartesian3.normalize(eastwardENU, eastwardENU);
            expect(Cartesian3.equalsEpsilon(eastwardENU, Cartesian3.UNIT_X, CesiumMath.EPSILON7)).toBe(true);

            var northwardENU = Matrix4.multiplyByPointAsVector(inverseEnu, Cartesian3.fromArray(northward.value), new Cartesian3());
            northwardENU = Cartesian3.normalize(northwardENU, northwardENU);
            expect(Cartesian3.equalsEpsilon(northwardENU, Cartesian3.UNIT_Y, CesiumMath.EPSILON7)).toBe(true);
        });

        it('provides attributes for computing planes in 2D and Columbus View', function() {
            var planes2D_HIGH = largeRectangleAttributes.planes2D_HIGH;
            var planes2D_LOW = largeRectangleAttributes.planes2D_LOW;

            expect(planes2D_HIGH.componentDatatype).toEqual(ComponentDatatype.FLOAT);
            expect(planes2D_HIGH.componentsPerAttribute).toEqual(4);
            expect(planes2D_HIGH.normalize).toEqual(false);

            // Because using a unit sphere expect all HIGH values to be basically 0
            var highValue = planes2D_HIGH.value;
            expect(highValue[0]).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
            expect(highValue[1]).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
            expect(highValue[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
            expect(highValue[3]).toEqualEpsilon(0.0, CesiumMath.EPSILON7);

            expect(planes2D_LOW.componentDatatype).toEqual(ComponentDatatype.FLOAT);
            expect(planes2D_LOW.componentsPerAttribute).toEqual(4);
            expect(planes2D_LOW.normalize).toEqual(false);

            var cartographic = Cartographic.fromDegrees(-45, -45, 0.0); // southwest corner
            var southwestCartesian = projection.project(cartographic);
            var lowValue = planes2D_LOW.value;
            expect(lowValue[0]).toEqualEpsilon(southwestCartesian.x, CesiumMath.EPSILON7);
            expect(lowValue[1]).toEqualEpsilon(southwestCartesian.y, CesiumMath.EPSILON7);
            expect(lowValue[2]).toEqualEpsilon(-southwestCartesian.y, CesiumMath.EPSILON7);
            expect(lowValue[3]).toEqualEpsilon(-southwestCartesian.x, CesiumMath.EPSILON7);

            // Small case
            // Because using a unit sphere expect all HIGH values to be basically 0
            highValue = smallRectangleAttributes.planes2D_HIGH.value;
            expect(highValue[0]).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
            expect(highValue[1]).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
            expect(highValue[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
            expect(highValue[3]).toEqualEpsilon(0.0, CesiumMath.EPSILON7);

            cartographic = Cartographic.fromDegrees(-0.1, -0.1, 0.0); // southwest corner
            southwestCartesian = projection.project(cartographic);
            lowValue = smallRectangleAttributes.planes2D_LOW.value;
            expect(lowValue[0]).toEqualEpsilon(southwestCartesian.x, CesiumMath.EPSILON7);
            expect(lowValue[1]).toEqualEpsilon(southwestCartesian.y, CesiumMath.EPSILON7);
            expect(lowValue[2]).toEqualEpsilon(-southwestCartesian.y, CesiumMath.EPSILON7);
            expect(lowValue[3]).toEqualEpsilon(-southwestCartesian.x, CesiumMath.EPSILON7);
        });
    });

    describe('floating point textures unreliable', function () {
        it('provides attributes for computing texture coordinates using planes in 3D', function() {
            var attributes = smallRectangleAttributesBadFloats;

            var southWest_LOW = [0, 0, 0];
            southWest_LOW[0] = unpackLowLessThan100k(attributes.southWest_LOW_x);
            southWest_LOW[1] = unpackLowLessThan100k(attributes.southWest_LOW_y);
            southWest_LOW[2] = unpackLowLessThan100k(attributes.southWest_LOW_z);

            var southWest_HIGH = [0, 0, 0];
            southWest_HIGH[0] = unpackHighMagLessThan100Million(attributes.southWest_HIGH_x);
            southWest_HIGH[1] = unpackHighMagLessThan100Million(attributes.southWest_HIGH_y);
            southWest_HIGH[2] = unpackHighMagLessThan100Million(attributes.southWest_HIGH_z);

            var eastward = [0, 0, 0];
            eastward[0] = unpackLowLessThan1000k(attributes.eastward_x);
            eastward[1] = unpackLowLessThan1000k(attributes.eastward_y);
            eastward[2] = unpackLowLessThan1000k(attributes.eastward_z);

            var northward = [0, 0, 0];
            northward[0] = unpackLowLessThan1000k(attributes.northward_x);
            northward[1] = unpackLowLessThan1000k(attributes.northward_y);
            northward[2] = unpackLowLessThan1000k(attributes.northward_z);

            // We're using a unit sphere, so expect all HIGH values to be basically 0
            // and LOW value to be within a small cone around UNIT_X
            expect(southWest_HIGH[0]).toEqualEpsilon(0.0, CesiumMath.EPSILON2);
            expect(southWest_HIGH[1]).toEqualEpsilon(0.0, CesiumMath.EPSILON2);
            expect(southWest_HIGH[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON2);

            expect(southWest_LOW[0]).toBeGreaterThan(Math.cos(CesiumMath.toRadians(0.2)));

            // Expect eastward and northward to be unit-direction vectors in the ENU coordinate system at the rectangle center
            var smallRectangleCenter = Cartographic.toCartesian(Rectangle.center(smallTestRectangle), unitSphereEllipsoid);
            var enuMatrix = Transforms.eastNorthUpToFixedFrame(smallRectangleCenter, unitSphereEllipsoid);
            var inverseEnu = Matrix4.inverse(enuMatrix, new Matrix4());

            var eastwardENU = Matrix4.multiplyByPointAsVector(inverseEnu, Cartesian3.fromArray(eastward), new Cartesian3());
            eastwardENU = Cartesian3.normalize(eastwardENU, eastwardENU);
            expect(Cartesian3.equalsEpsilon(eastwardENU, Cartesian3.UNIT_X, CesiumMath.EPSILON2)).toBe(true);

            var northwardENU = Matrix4.multiplyByPointAsVector(inverseEnu, Cartesian3.fromArray(northward), new Cartesian3());
            northwardENU = Cartesian3.normalize(northwardENU, northwardENU);
            expect(Cartesian3.equalsEpsilon(northwardENU, Cartesian3.UNIT_Y, CesiumMath.EPSILON2)).toBe(true);
        });

        it('provides attributes for computing planes in 2D and Columbus View', function() {
            var attributes = largeRectangleAttributesBadFloats;
            var highValue = [0, 0, 0, 0];
            highValue[0] = unpackHighMagLessThan100Million(attributes.planes2D_HIGH_x);
            highValue[1] = unpackHighMagLessThan100Million(attributes.planes2D_HIGH_y);
            highValue[2] = unpackHighMagLessThan100Million(attributes.planes2D_HIGH_z);
            highValue[3] = unpackHighMagLessThan100Million(attributes.planes2D_HIGH_w);

            var lowValue = [0, 0, 0, 0];
            lowValue[0] = unpackLowLessThan100k(attributes.planes2D_LOW_x);
            lowValue[1] = unpackLowLessThan100k(attributes.planes2D_LOW_y);
            lowValue[2] = unpackLowLessThan100k(attributes.planes2D_LOW_z);
            lowValue[3] = unpackLowLessThan100k(attributes.planes2D_LOW_w);

            // Because using a unit sphere expect all HIGH values to be basically 0
            expect(highValue[0]).toEqualEpsilon(0.0, CesiumMath.EPSILON2);
            expect(highValue[1]).toEqualEpsilon(0.0, CesiumMath.EPSILON2);
            expect(highValue[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON2);
            expect(highValue[3]).toEqualEpsilon(0.0, CesiumMath.EPSILON2);

            var cartographic = Cartographic.fromDegrees(-45, -45, 0.0); // southwest corner
            var southwestCartesian = projection.project(cartographic);
            expect(lowValue[0]).toEqualEpsilon(southwestCartesian.x, CesiumMath.EPSILON2);
            expect(lowValue[1]).toEqualEpsilon(southwestCartesian.y, CesiumMath.EPSILON2);
            expect(lowValue[2]).toEqualEpsilon(-southwestCartesian.y, CesiumMath.EPSILON2);
            expect(lowValue[3]).toEqualEpsilon(-southwestCartesian.x, CesiumMath.EPSILON2);

            // Small case
            attributes = smallRectangleAttributesBadFloats;
            // Because using a unit sphere expect all HIGH values to be basically 0
            highValue[0] = unpackHighMagLessThan100Million(attributes.planes2D_HIGH_x);
            highValue[1] = unpackHighMagLessThan100Million(attributes.planes2D_HIGH_y);
            highValue[2] = unpackHighMagLessThan100Million(attributes.planes2D_HIGH_z);
            highValue[3] = unpackHighMagLessThan100Million(attributes.planes2D_HIGH_w);

            expect(highValue[0]).toEqualEpsilon(0.0, CesiumMath.EPSILON2);
            expect(highValue[1]).toEqualEpsilon(0.0, CesiumMath.EPSILON2);
            expect(highValue[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON2);
            expect(highValue[3]).toEqualEpsilon(0.0, CesiumMath.EPSILON2);

            cartographic = Cartographic.fromDegrees(-0.1, -0.1, 0.0); // southwest corner
            southwestCartesian = projection.project(cartographic);
            lowValue[0] = unpackLowLessThan100k(attributes.planes2D_LOW_x);
            lowValue[1] = unpackLowLessThan100k(attributes.planes2D_LOW_y);
            lowValue[2] = unpackLowLessThan100k(attributes.planes2D_LOW_z);
            lowValue[3] = unpackLowLessThan100k(attributes.planes2D_LOW_w);

            expect(lowValue[0]).toEqualEpsilon(southwestCartesian.x, CesiumMath.EPSILON2);
            expect(lowValue[1]).toEqualEpsilon(southwestCartesian.y, CesiumMath.EPSILON2);
            expect(lowValue[2]).toEqualEpsilon(-southwestCartesian.y, CesiumMath.EPSILON2);
            expect(lowValue[3]).toEqualEpsilon(-southwestCartesian.x, CesiumMath.EPSILON2);
        });
    });

    it('provides attributes for rotating texture coordinates', function() {
        // 90 degree rotation of a square, so "max" in Y direction is (0,0), "max" in X direction is (1,1)
        var attributes = ShadowVolumeAppearance.getPlanarTextureCoordinateAttributes(smallTestRectangle, [1, 0, 0, 0, 1, 1], unitSphereEllipsoid, projection, false, 0.0);

        var uMaxVmax = attributes.uMaxVmax;
        var uvMinAndExtents = attributes.uvMinAndExtents;
        expect(uMaxVmax.componentDatatype).toEqual(ComponentDatatype.FLOAT);
        expect(uMaxVmax.componentsPerAttribute).toEqual(4);
        expect(uMaxVmax.normalize).toEqual(false);

        expect(uvMinAndExtents.componentDatatype).toEqual(ComponentDatatype.FLOAT);
        expect(uvMinAndExtents.componentsPerAttribute).toEqual(4);
        expect(uvMinAndExtents.normalize).toEqual(false);

        var value = uMaxVmax.value;
        expect(value[0]).toEqual(0.0);
        expect(value[1]).toEqual(0.0);
        expect(value[2]).toEqual(1.0);
        expect(value[3]).toEqual(1.0);

        // "min" of texture coordinates is at (1,0) and extents are just 1s
        value = uvMinAndExtents.value;
        expect(value[0]).toEqual(1.0);
        expect(value[1]).toEqual(0.0);
        expect(value[2]).toEqual(1.0);
        expect(value[3]).toEqual(1.0);
    });

    it('checks for spherical extent attributes', function() {
        expect(ShadowVolumeAppearance.hasAttributesForSphericalExtents(smallRectangleAttributes)).toBe(false);
        expect(ShadowVolumeAppearance.hasAttributesForSphericalExtents(largeRectangleAttributes)).toBe(true);
        expect(ShadowVolumeAppearance.hasAttributesForSphericalExtents(smallRectangleAttributesBadFloats)).toBe(false);
        expect(ShadowVolumeAppearance.hasAttributesForSphericalExtents(largeRectangleAttributesBadFloats)).toBe(true);
    });

    it('checks for planar texture coordinate attributes', function() {
        expect(ShadowVolumeAppearance.hasAttributesForTextureCoordinatePlanes(smallRectangleAttributes)).toBe(true);
        expect(ShadowVolumeAppearance.hasAttributesForTextureCoordinatePlanes(largeRectangleAttributes)).toBe(false);
        expect(ShadowVolumeAppearance.hasAttributesForTextureCoordinatePlanes(smallRectangleAttributesBadFloats)).toBe(true);
        expect(ShadowVolumeAppearance.hasAttributesForTextureCoordinatePlanes(largeRectangleAttributesBadFloats)).toBe(false);
    });

    it('checks if a rectangle should use spherical texture coordinates', function() {
        expect(ShadowVolumeAppearance.shouldUseSphericalCoordinates(smallTestRectangle)).toBe(false);
        expect(ShadowVolumeAppearance.shouldUseSphericalCoordinates(largeTestRectangle)).toBe(true);
    });

    it('creates vertex shaders based on whether or not float textures are used for high/low positions', function() {
        // Check defines
        var sphericalTexturedAppearanceUnsafe = new ShadowVolumeAppearance(true, false, textureMaterialAppearance, false);
        var shaderSource = sphericalTexturedAppearanceUnsafe.createVertexShader([], testVs, false, projection);
        var defines = shaderSource.defines;
        expect(defines.length).toEqual(3);
        expect(defines.indexOf('UINT8_PACKING')).not.toEqual(-1);

        // 2D variant
        shaderSource = sphericalTexturedAppearanceUnsafe.createVertexShader([], testVs, true, projection);
        defines = shaderSource.defines;
        expect(defines.length).toEqual(7);
        expect(defines.indexOf('UINT8_PACKING')).not.toEqual(-1);

        var sphericalTexturedAppearanceSafe = new ShadowVolumeAppearance(true, false, textureMaterialAppearance, true);
        shaderSource = sphericalTexturedAppearanceSafe.createVertexShader([], testVs, false, projection);
        defines = shaderSource.defines;
        expect(defines.length).toEqual(2);
        expect(defines.indexOf('UINT8_PACKING')).toEqual(-1);

        // 2D variant
        shaderSource = sphericalTexturedAppearanceSafe.createVertexShader([], testVs, true, projection);
        defines = shaderSource.defines;
        expect(defines.length).toEqual(6);
        expect(defines.indexOf('UINT8_PACKING')).toEqual(-1);
    });

    it('creates vertex shaders for color', function() {
        // Check defines
        var sphericalTexturedAppearance = new ShadowVolumeAppearance(true, false, textureMaterialAppearance, true);
        var shaderSource = sphericalTexturedAppearance.createVertexShader([], testVs, false, projection);
        var defines = shaderSource.defines;
        expect(defines.length).toEqual(2);
        expect(defines.indexOf('TEXTURE_COORDINATES')).not.toEqual(-1);
        expect(defines.indexOf('SPHERICAL')).not.toEqual(-1);

        // 2D variant
        shaderSource = sphericalTexturedAppearance.createVertexShader([], testVs, true, projection);
        defines = shaderSource.defines;
        expect(defines.length).toEqual(6);
        expect(defines.indexOf('TEXTURE_COORDINATES')).not.toEqual(-1);
        expect(defines.indexOf('COLUMBUS_VIEW_2D')).not.toEqual(-1);

        expect(defines.indexOf(eastMostYhighDefine)).not.toEqual(-1);
        expect(defines.indexOf(eastMostYlowDefine)).not.toEqual(-1);
        expect(defines.indexOf(westMostYhighDefine)).not.toEqual(-1);
        expect(defines.indexOf(westMostYlowDefine)).not.toEqual(-1);

        // Unculled color appearance - no texcoords at all
        var sphericalUnculledColorAppearance = new ShadowVolumeAppearance(false, false, perInstanceColorMaterialAppearance, true);
        shaderSource = sphericalUnculledColorAppearance.createVertexShader([], testVs, false, projection);
        defines = shaderSource.defines;
        expect(defines.length).toEqual(1);
        expect(defines.indexOf('PER_INSTANCE_COLOR')).not.toEqual(-1);

        // 2D variant
        shaderSource = sphericalUnculledColorAppearance.createVertexShader([], testVs, true, projection);
        defines = shaderSource.defines;
        expect(defines.length).toEqual(5);

        expect(defines.indexOf(eastMostYhighDefine)).not.toEqual(-1);
        expect(defines.indexOf(eastMostYlowDefine)).not.toEqual(-1);
        expect(defines.indexOf(westMostYhighDefine)).not.toEqual(-1);
        expect(defines.indexOf(westMostYlowDefine)).not.toEqual(-1);

        expect(defines.indexOf('PER_INSTANCE_COLOR')).not.toEqual(-1);

        // Planar textured, without culling
        var planarTexturedAppearance = new ShadowVolumeAppearance(false, true, textureMaterialAppearance, true);
        shaderSource = planarTexturedAppearance.createVertexShader([], testVs, false, projection);
        defines = shaderSource.defines;
        expect(defines.indexOf('TEXTURE_COORDINATES')).not.toEqual(-1);
        expect(defines.length).toEqual(1);

        shaderSource = planarTexturedAppearance.createVertexShader([], testVs, true, projection);
        defines = shaderSource.defines;
        expect(defines.indexOf('TEXTURE_COORDINATES')).not.toEqual(-1);
        expect(defines.indexOf('COLUMBUS_VIEW_2D')).not.toEqual(-1);

        expect(defines.indexOf(eastMostYhighDefine)).not.toEqual(-1);
        expect(defines.indexOf(eastMostYlowDefine)).not.toEqual(-1);
        expect(defines.indexOf(westMostYhighDefine)).not.toEqual(-1);
        expect(defines.indexOf(westMostYlowDefine)).not.toEqual(-1);

        expect(defines.length).toEqual(6);
    });

    it('creates vertex shaders for pick', function() {
        // Check defines
        var sphericalTexturedAppearance = new ShadowVolumeAppearance(true, false, textureMaterialAppearance, true);
        var shaderSource = sphericalTexturedAppearance.createPickVertexShader([], testVs, false, projection);
        var defines = shaderSource.defines;
        expect(defines.length).toEqual(2);
        expect(defines.indexOf('TEXTURE_COORDINATES')).not.toEqual(-1);
        expect(defines.indexOf('SPHERICAL')).not.toEqual(-1);

        // 2D variant
        shaderSource = sphericalTexturedAppearance.createPickVertexShader([], testVs, true, projection);
        defines = shaderSource.defines;
        expect(defines.length).toEqual(6);
        expect(defines.indexOf('TEXTURE_COORDINATES')).not.toEqual(-1);
        expect(defines.indexOf('COLUMBUS_VIEW_2D')).not.toEqual(-1);

        expect(defines.indexOf(eastMostYhighDefine)).not.toEqual(-1);
        expect(defines.indexOf(eastMostYlowDefine)).not.toEqual(-1);
        expect(defines.indexOf(westMostYhighDefine)).not.toEqual(-1);
        expect(defines.indexOf(westMostYlowDefine)).not.toEqual(-1);

        // Unculled color appearance - no texcoords at all
        var sphericalUnculledColorAppearance = new ShadowVolumeAppearance(false, false, perInstanceColorMaterialAppearance, true);
        shaderSource = sphericalUnculledColorAppearance.createPickVertexShader([], testVs, false, projection);
        defines = shaderSource.defines;
        expect(defines.length).toEqual(0);

        // 2D variant
        shaderSource = sphericalUnculledColorAppearance.createPickVertexShader([], testVs, true, projection);
        defines = shaderSource.defines;

        expect(defines.indexOf(eastMostYhighDefine)).not.toEqual(-1);
        expect(defines.indexOf(eastMostYlowDefine)).not.toEqual(-1);
        expect(defines.indexOf(westMostYhighDefine)).not.toEqual(-1);
        expect(defines.indexOf(westMostYlowDefine)).not.toEqual(-1);

        expect(defines.length).toEqual(4);

        // Planar textured, without culling
        var planarTexturedAppearance = new ShadowVolumeAppearance(false, true, textureMaterialAppearance, true);
        shaderSource = planarTexturedAppearance.createPickVertexShader([], testVs, false, projection);
        defines = shaderSource.defines;
        expect(defines.length).toEqual(0);

        shaderSource = planarTexturedAppearance.createPickVertexShader([], testVs, true, projection);
        defines = shaderSource.defines;

        expect(defines.indexOf(eastMostYhighDefine)).not.toEqual(-1);
        expect(defines.indexOf(eastMostYlowDefine)).not.toEqual(-1);
        expect(defines.indexOf(westMostYhighDefine)).not.toEqual(-1);
        expect(defines.indexOf(westMostYlowDefine)).not.toEqual(-1);

        expect(defines.length).toEqual(4);
    });

    it('creates fragment shaders for color and pick', function() {
        // Check defines
        var sphericalTexturedAppearance = new ShadowVolumeAppearance(true, false, textureMaterialAppearance, true);
        var shaderSource = sphericalTexturedAppearance.createFragmentShader(false);
        var defines = shaderSource.defines;

        // Check material hookups, discard for culling, and phong shading
        expect(defines.indexOf('SPHERICAL')).not.toEqual(-1);
        expect(defines.indexOf('REQUIRES_EC')).not.toEqual(-1);
        expect(defines.indexOf('REQUIRES_WC')).not.toEqual(-1);
        expect(defines.indexOf('TEXTURE_COORDINATES')).not.toEqual(-1);
        expect(defines.indexOf('CULL_FRAGMENTS')).not.toEqual(-1);
        expect(defines.indexOf('NORMAL_EC')).not.toEqual(-1);
        expect(defines.indexOf('USES_NORMAL_EC')).not.toEqual(-1);
        expect(defines.indexOf('USES_POSITION_TO_EYE_EC')).not.toEqual(-1);
        expect(defines.indexOf('USES_TANGENT_TO_EYE')).not.toEqual(-1);
        expect(defines.indexOf('USES_ST')).not.toEqual(-1);
        expect(defines.length).toEqual(10);

        // 2D case
        shaderSource = sphericalTexturedAppearance.createFragmentShader(true);
        defines = shaderSource.defines;

        expect(defines.indexOf('REQUIRES_EC')).not.toEqual(-1);
        expect(defines.indexOf('REQUIRES_WC')).not.toEqual(-1);
        expect(defines.indexOf('TEXTURE_COORDINATES')).not.toEqual(-1);
        expect(defines.indexOf('CULL_FRAGMENTS')).not.toEqual(-1);
        expect(defines.indexOf('NORMAL_EC')).not.toEqual(-1);
        expect(defines.indexOf('USES_NORMAL_EC')).not.toEqual(-1);
        expect(defines.indexOf('USES_POSITION_TO_EYE_EC')).not.toEqual(-1);
        expect(defines.indexOf('USES_TANGENT_TO_EYE')).not.toEqual(-1);
        expect(defines.indexOf('USES_ST')).not.toEqual(-1);
        expect(defines.length).toEqual(9);

        // Culling with planar texture coordinates on a per-color material
        var planarColorAppearance = new ShadowVolumeAppearance(true, true, perInstanceColorMaterialAppearance, true);
        shaderSource = planarColorAppearance.createFragmentShader(false);
        defines = shaderSource.defines;

        expect(defines.indexOf('PER_INSTANCE_COLOR')).not.toEqual(-1);
        expect(defines.indexOf('REQUIRES_EC')).not.toEqual(-1);
        expect(defines.indexOf('REQUIRES_WC')).not.toEqual(-1);
        expect(defines.indexOf('TEXTURE_COORDINATES')).not.toEqual(-1);
        expect(defines.indexOf('CULL_FRAGMENTS')).not.toEqual(-1);
        expect(defines.indexOf('NORMAL_EC')).not.toEqual(-1);
        expect(defines.length).toEqual(6);

        // Pick
        shaderSource = planarColorAppearance.createPickFragmentShader(true);
        defines = shaderSource.defines;

        expect(defines.indexOf('REQUIRES_EC')).not.toEqual(-1);
        expect(defines.indexOf('REQUIRES_WC')).not.toEqual(-1);
        expect(defines.indexOf('TEXTURE_COORDINATES')).not.toEqual(-1);
        expect(defines.indexOf('CULL_FRAGMENTS')).not.toEqual(-1);
        expect(defines.indexOf('PICK')).not.toEqual(-1);
        expect(defines.length).toEqual(5);

        // Flat
        var flatSphericalTexturedAppearance = new ShadowVolumeAppearance(true, false, flatTextureMaterialAppearance, true);
        shaderSource = flatSphericalTexturedAppearance.createFragmentShader(false);
        defines = shaderSource.defines;
        expect(defines.indexOf('SPHERICAL')).not.toEqual(-1);
        expect(defines.indexOf('REQUIRES_EC')).not.toEqual(-1);
        expect(defines.indexOf('REQUIRES_WC')).not.toEqual(-1);
        expect(defines.indexOf('TEXTURE_COORDINATES')).not.toEqual(-1);
        expect(defines.indexOf('CULL_FRAGMENTS')).not.toEqual(-1);
        expect(defines.indexOf('NORMAL_EC')).not.toEqual(-1);
        expect(defines.indexOf('USES_NORMAL_EC')).not.toEqual(-1);
        expect(defines.indexOf('USES_POSITION_TO_EYE_EC')).not.toEqual(-1);
        expect(defines.indexOf('USES_ST')).not.toEqual(-1);
        expect(defines.indexOf('FLAT')).not.toEqual(-1);
        expect(defines.length).toEqual(10);

        var flatSphericalColorAppearance = new ShadowVolumeAppearance(false, false, flatPerInstanceColorMaterialAppearance, true);
        shaderSource = flatSphericalColorAppearance.createFragmentShader(false);
        defines = shaderSource.defines;
        expect(defines.indexOf('SPHERICAL')).not.toEqual(-1);
        expect(defines.indexOf('PER_INSTANCE_COLOR')).not.toEqual(-1);
        expect(defines.indexOf('FLAT')).not.toEqual(-1);
        expect(defines.length).toEqual(3);
    });
});
