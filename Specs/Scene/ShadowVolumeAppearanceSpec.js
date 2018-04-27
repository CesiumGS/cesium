defineSuite([
    'Scene/ShadowVolumeAppearance',
    'Core/Cartesian3',
    'Core/Cartographic',
    'Core/Math',
    'Core/ComponentDatatype',
    'Core/Ellipsoid',
    'Core/Matrix4',
    'Core/WebMercatorProjection',
    'Core/Rectangle',
    'Core/Transforms',
    'Scene/Material',
    'Scene/MaterialAppearance',
    'Scene/PerInstanceColorAppearance'
], function(
    ShadowVolumeAppearance,
    Cartesian3,
    Cartographic,
    CesiumMath,
    ComponentDatatype,
    Ellipsoid,
    Matrix4,
    WebMercatorProjection,
    Rectangle,
    Transforms,
    Material,
    MaterialAppearance,
    PerInstanceColorAppearance) {
'use strict';

    // using ShadowVolumeVS directly fails on Travis with the --release test
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

    var largeRectangleAttributes = ShadowVolumeAppearance.getSphericalExtentGeometryInstanceAttributes(largeTestRectangle, unitSphereEllipsoid, projection);
    var smallRectangleAttributes = ShadowVolumeAppearance.getPlanarTextureCoordinateAttributes(smallTestRectangle, unitSphereEllipsoid, projection);

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
    });

    function checkGeometryInstanceAttributeVec3(attribute) {
        expect(attribute.componentDatatype).toEqual(ComponentDatatype.FLOAT);
        expect(attribute.componentsPerAttribute).toEqual(3);
        expect(attribute.normalize).toEqual(false);
    }

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

    it('provides attributes for rotating texture coordinates', function() {
        var attributes = ShadowVolumeAppearance.getPlanarTextureCoordinateAttributes(smallTestRectangle, unitSphereEllipsoid, projection, CesiumMath.PI_OVER_TWO);

        var stRotationAttribute = attributes.stSineCosineUVScale;
        expect(stRotationAttribute.componentDatatype).toEqual(ComponentDatatype.FLOAT);
        expect(stRotationAttribute.componentsPerAttribute).toEqual(4);
        expect(stRotationAttribute.normalize).toEqual(false);

        var value = stRotationAttribute.value;
        expect(value[0]).toEqualEpsilon(Math.sin(CesiumMath.PI_OVER_TWO), CesiumMath.EPSILON7);
        expect(value[1]).toEqualEpsilon(Math.cos(CesiumMath.PI_OVER_TWO), CesiumMath.EPSILON7);
        expect(value[2]).toEqualEpsilon(1.0, CesiumMath.EPSILON7); // 90 degree rotation of a square, so no scale
        expect(value[3]).toEqualEpsilon(1.0, CesiumMath.EPSILON7);

        attributes = ShadowVolumeAppearance.getPlanarTextureCoordinateAttributes(smallTestRectangle, unitSphereEllipsoid, projection, CesiumMath.PI_OVER_FOUR);
        value = attributes.stSineCosineUVScale.value;
        expect(value[0]).toEqualEpsilon(Math.sin(CesiumMath.PI_OVER_FOUR), CesiumMath.EPSILON7);
        expect(value[1]).toEqualEpsilon(Math.cos(CesiumMath.PI_OVER_FOUR), CesiumMath.EPSILON7);

        var expectedScale = Math.sqrt(2.0) * 0.5; // 45 degree rotation of a square, so scale to square diagonal
        expect(value[2]).toEqualEpsilon(expectedScale, CesiumMath.EPSILON7);
        expect(value[3]).toEqualEpsilon(expectedScale, CesiumMath.EPSILON7);
    });

    it('checks for spherical extent attributes', function() {
        expect(ShadowVolumeAppearance.hasAttributesForSphericalExtents(smallRectangleAttributes)).toBe(false);
        expect(ShadowVolumeAppearance.hasAttributesForSphericalExtents(largeRectangleAttributes)).toBe(true);
    });

    it('checks for planar texture coordinate attributes', function() {
        expect(ShadowVolumeAppearance.hasAttributesForTextureCoordinatePlanes(smallRectangleAttributes)).toBe(true);
        expect(ShadowVolumeAppearance.hasAttributesForTextureCoordinatePlanes(largeRectangleAttributes)).toBe(false);
    });

    it('checks if a rectangle should use spherical texture coordinates', function() {
        expect(ShadowVolumeAppearance.shouldUseSphericalCoordinates(smallTestRectangle)).toBe(false);
        expect(ShadowVolumeAppearance.shouldUseSphericalCoordinates(largeTestRectangle)).toBe(true);
    });

    it('creates vertex shaders', function() {
        // Check for varying declarations and that they get set
        var sphericalTexturedAppearance = new ShadowVolumeAppearance(true, false, textureMaterialAppearance);
        var sphericalTexturedVS3D = sphericalTexturedAppearance.createVertexShader(testVs, false);
        expect(sphericalTexturedVS3D.includes('varying vec4 v_sphericalExtents;')).toBe(true);
        expect(sphericalTexturedVS3D.includes('varying vec4 v_stSineCosineUVScale;')).toBe(true);

        expect(sphericalTexturedVS3D.includes('v_sphericalExtents =')).toBe(true);
        expect(sphericalTexturedVS3D.includes('v_stSineCosineUVScale =')).toBe(true);

        var sphericalTexturedVS2D = sphericalTexturedAppearance.createVertexShader(testVs, true);
        expect(sphericalTexturedVS2D.includes('varying vec2 v_inversePlaneExtents;')).toBe(true);
        expect(sphericalTexturedVS2D.includes('varying vec4 v_westPlane;')).toBe(true);
        expect(sphericalTexturedVS2D.includes('varying vec4 v_southPlane;')).toBe(true);
        expect(sphericalTexturedVS2D.includes('varying vec4 v_stSineCosineUVScale;')).toBe(true);

        expect(sphericalTexturedVS2D.includes('v_inversePlaneExtents =')).toBe(true);
        expect(sphericalTexturedVS2D.includes('v_westPlane =')).toBe(true);
        expect(sphericalTexturedVS2D.includes('v_southPlane =')).toBe(true);
        expect(sphericalTexturedVS2D.includes('v_stSineCosineUVScale =')).toBe(true);

        var sphericalUnculledColorAppearance = new ShadowVolumeAppearance(false, false, perInstanceColorMaterialAppearance);
        var sphericalUnculledColorVS3D = sphericalUnculledColorAppearance.createVertexShader(testVs, false);
        expect(sphericalUnculledColorVS3D.includes('varying vec4 v_color;')).toBe(true);
        expect(sphericalUnculledColorVS3D.includes('v_color =')).toBe(true);

        var sphericalUnculledColorVS2D = sphericalUnculledColorAppearance.createVertexShader(testVs, true);
        expect(sphericalUnculledColorVS2D.includes('varying vec4 v_color;')).toBe(true);
        expect(sphericalUnculledColorVS2D.includes('v_color =')).toBe(true);

        var planarTexturedAppearance = new ShadowVolumeAppearance(false, true, textureMaterialAppearance);
        var planarTexturedAppearanceVS3D = planarTexturedAppearance.createVertexShader(testVs, false);

        expect(planarTexturedAppearanceVS3D.includes('varying vec2 v_inversePlaneExtents;')).toBe(true);
        expect(planarTexturedAppearanceVS3D.includes('varying vec4 v_westPlane;')).toBe(true);
        expect(planarTexturedAppearanceVS3D.includes('varying vec4 v_southPlane;')).toBe(true);
        expect(planarTexturedAppearanceVS3D.includes('varying vec4 v_stSineCosineUVScale;')).toBe(true);

        expect(planarTexturedAppearanceVS3D.includes('v_inversePlaneExtents =')).toBe(true);
        expect(planarTexturedAppearanceVS3D.includes('v_westPlane =')).toBe(true);
        expect(planarTexturedAppearanceVS3D.includes('v_southPlane =')).toBe(true);
        expect(planarTexturedAppearanceVS3D.includes('v_stSineCosineUVScale =')).toBe(true);
    });

    it('creates fragment shaders', function() {
        var sphericalTexturedAppearance = new ShadowVolumeAppearance(true, false, textureMaterialAppearance);
        var sphericalTexturedFS3D = sphericalTexturedAppearance.createAppearanceFragmentShader(false);

        // Check material hookups, discard for culling, and phong shading
        expect(sphericalTexturedFS3D.includes('.normalEC =')).toBe(true);
        expect(sphericalTexturedFS3D.includes('.positionToEyeEC =')).toBe(true);
        expect(sphericalTexturedFS3D.includes('.tangentToEyeMatrix =')).toBe(true);
        expect(sphericalTexturedFS3D.includes('.st.x =')).toBe(true);
        expect(sphericalTexturedFS3D.includes('.st.y =')).toBe(true);
        expect(sphericalTexturedFS3D.includes('discard;')).toBe(true);
        expect(sphericalTexturedFS3D.includes('czm_phong')).toBe(true);

        var sphericalTexturedFS2D = sphericalTexturedAppearance.createAppearanceFragmentShader(true);

        expect(sphericalTexturedFS2D.includes('.normalEC =')).toBe(true);
        expect(sphericalTexturedFS2D.includes('.positionToEyeEC =')).toBe(true);
        expect(sphericalTexturedFS2D.includes('.tangentToEyeMatrix =')).toBe(true);
        expect(sphericalTexturedFS2D.includes('.st.x =')).toBe(true);
        expect(sphericalTexturedFS2D.includes('.st.y =')).toBe(true);
        expect(sphericalTexturedFS2D.includes('discard;')).toBe(true);
        expect(sphericalTexturedFS2D.includes('czm_phong')).toBe(true);

        var planarColorAppearance = new ShadowVolumeAppearance(true, false, perInstanceColorMaterialAppearance);
        var planarColorFS3D = planarColorAppearance.createAppearanceFragmentShader(false);
        expect(planarColorFS3D.includes('= v_color')).toBe(true);
        expect(planarColorFS3D.includes('varying vec4 v_color;')).toBe(true);
        expect(planarColorFS3D.includes('discard;')).toBe(true);
        expect(planarColorFS3D.includes('czm_phong')).toBe(true);

        // Pick
        var pickColorFS2D = planarColorAppearance.createPickingFragmentShader(true);
        expect(pickColorFS2D.includes('gl_FragColor.a = 1.0')).toBe(true);

        // Flat
        var flatSphericalTexturedAppearance = new ShadowVolumeAppearance(true, false, flatTextureMaterialAppearance);
        var flatSphericalTexturedFS3D = flatSphericalTexturedAppearance.createAppearanceFragmentShader(false);
        expect(flatSphericalTexturedFS3D.includes('gl_FragColor = vec4')).toBe(true);

        var flatSphericalColorAppearance = new ShadowVolumeAppearance(false, false, flatPerInstanceColorMaterialAppearance);
        var flatSphericalColorFS3D = flatSphericalColorAppearance.createAppearanceFragmentShader(false);
        expect(flatSphericalColorFS3D.includes('gl_FragColor = v_color;')).toBe(true);
    });
});
