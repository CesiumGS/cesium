import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartographic } from "../../Source/Cesium.js";
import { ComponentDatatype } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { EncodedCartesian3 } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Matrix4 } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { Transforms } from "../../Source/Cesium.js";
import { WebMercatorProjection } from "../../Source/Cesium.js";
import { Material } from "../../Source/Cesium.js";
import { MaterialAppearance } from "../../Source/Cesium.js";
import { PerInstanceColorAppearance } from "../../Source/Cesium.js";
import { ShadowVolumeAppearance } from "../../Source/Cesium.js";

describe("Scene/ShadowVolumeAppearance", function () {
  // using ShadowVolumeAppearanceVS directly fails on Travis with the --release test
  const testVs =
    "attribute vec3 position3DHigh;\n" +
    "attribute vec3 position3DLow;\n" +
    "attribute float batchId;\n" +
    "void main() {\n" +
    "    vec4 position = czm_computePosition();\n" +
    "    gl_Position = czm_depthClamp(czm_modelViewProjectionRelativeToEye * position);\n" +
    "}\n";

  const unitSphereEllipsoid = Ellipsoid.UNIT_SPHERE;
  const projection = new WebMercatorProjection(unitSphereEllipsoid);
  const largeTestRectangle = Rectangle.fromDegrees(-45.0, -45.0, 45.0, 45.0);
  const smallTestRectangle = Rectangle.fromDegrees(-0.1, -0.1, 0.1, 0.1);

  const largeRectangleAttributes = ShadowVolumeAppearance.getSphericalExtentGeometryInstanceAttributes(
    largeTestRectangle,
    [0, 0, 0, 1, 1, 0],
    unitSphereEllipsoid,
    projection
  );
  const smallRectangleAttributes = ShadowVolumeAppearance.getPlanarTextureCoordinateAttributes(
    smallTestRectangle,
    [0, 0, 0, 1, 1, 0],
    unitSphereEllipsoid,
    projection
  );

  const perInstanceColorMaterialAppearance = new PerInstanceColorAppearance();
  const flatPerInstanceColorMaterialAppearance = new PerInstanceColorAppearance(
    {
      flat: true,
    }
  );

  const textureMaterialAppearance = new MaterialAppearance({
    material: new Material({
      fabric: {
        type: "BumpMap",
        uniforms: {
          image: "../images/Cesium_Logo_Color.jpg",
          channel: "r",
        },
      },
    }),
  });
  const flatTextureMaterialAppearance = new MaterialAppearance({
    material: Material.fromType(Material.ImageType, {
      image: "../Data/images/Red16x16.png",
    }),
    flat: true,
  });

  // Defines for projection extents
  const eastMostCartographic = new Cartographic();
  const longitudeExtentsEncodeScratch = {
    high: 0.0,
    low: 0.0,
  };
  eastMostCartographic.longitude = CesiumMath.PI;
  eastMostCartographic.latitude = 0.0;
  eastMostCartographic.height = 0.0;
  const eastMostCartesian = projection.project(eastMostCartographic);
  let encoded = EncodedCartesian3.encode(
    eastMostCartesian.x,
    longitudeExtentsEncodeScratch
  );
  const eastMostYhighDefine =
    "EAST_MOST_X_HIGH " + encoded.high.toFixed((encoded.high + "").length + 1);
  const eastMostYlowDefine =
    "EAST_MOST_X_LOW " + encoded.low.toFixed((encoded.low + "").length + 1);

  const westMostCartographic = new Cartographic();
  westMostCartographic.longitude = -CesiumMath.PI;
  westMostCartographic.latitude = 0.0;
  westMostCartographic.height = 0.0;
  const westMostCartesian = projection.project(westMostCartographic);
  encoded = EncodedCartesian3.encode(
    westMostCartesian.x,
    longitudeExtentsEncodeScratch
  );
  const westMostYhighDefine =
    "WEST_MOST_X_HIGH " + encoded.high.toFixed((encoded.high + "").length + 1);
  const westMostYlowDefine =
    "WEST_MOST_X_LOW " + encoded.low.toFixed((encoded.low + "").length + 1);

  it("provides attributes for computing texture coordinates from Spherical extents", function () {
    const attributes = largeRectangleAttributes;

    const sphericalExtents = attributes.sphericalExtents;
    expect(sphericalExtents.componentDatatype).toEqual(ComponentDatatype.FLOAT);
    expect(sphericalExtents.componentsPerAttribute).toEqual(4);
    expect(sphericalExtents.normalize).toEqual(false);
    let value = sphericalExtents.value;
    expect(value[0]).toEqualEpsilon(
      -CesiumMath.PI_OVER_FOUR,
      CesiumMath.EPSILON4
    );
    expect(value[1]).toEqualEpsilon(
      -CesiumMath.PI_OVER_FOUR,
      CesiumMath.EPSILON4
    );
    expect(value[2]).toEqualEpsilon(
      1.0 / CesiumMath.PI_OVER_TWO,
      CesiumMath.EPSILON4
    );
    expect(value[3]).toEqualEpsilon(
      1.0 / CesiumMath.PI_OVER_TWO,
      CesiumMath.EPSILON4
    );

    const longitudeRotation = attributes.longitudeRotation;
    expect(longitudeRotation.componentDatatype).toEqual(
      ComponentDatatype.FLOAT
    );
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

  it("provides attributes for computing texture coordinates using planes in 3D", function () {
    const attributes = smallRectangleAttributes;

    const southWest_LOW = attributes.southWest_LOW;
    const southWest_HIGH = attributes.southWest_HIGH;
    const eastward = attributes.eastward;
    const northward = attributes.northward;

    checkGeometryInstanceAttributeVec3(southWest_LOW);
    checkGeometryInstanceAttributeVec3(southWest_HIGH);
    checkGeometryInstanceAttributeVec3(eastward);
    checkGeometryInstanceAttributeVec3(northward);

    // We're using a unit sphere, so expect all HIGH values to be basically 0
    // and LOW value to be within a small cone around UNIT_X
    expect(southWest_HIGH.value[0]).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
    expect(southWest_HIGH.value[1]).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
    expect(southWest_HIGH.value[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON7);

    expect(southWest_LOW.value[0]).toBeGreaterThan(
      Math.cos(CesiumMath.toRadians(0.2))
    );

    // Expect eastward and northward to be unit-direction vectors in the ENU coordinate system at the rectangle center
    const smallRectangleCenter = Cartographic.toCartesian(
      Rectangle.center(smallTestRectangle),
      unitSphereEllipsoid
    );
    const enuMatrix = Transforms.eastNorthUpToFixedFrame(
      smallRectangleCenter,
      unitSphereEllipsoid
    );
    const inverseEnu = Matrix4.inverse(enuMatrix, new Matrix4());

    let eastwardENU = Matrix4.multiplyByPointAsVector(
      inverseEnu,
      Cartesian3.fromArray(eastward.value),
      new Cartesian3()
    );
    eastwardENU = Cartesian3.normalize(eastwardENU, eastwardENU);
    expect(
      Cartesian3.equalsEpsilon(
        eastwardENU,
        Cartesian3.UNIT_X,
        CesiumMath.EPSILON7
      )
    ).toBe(true);

    let northwardENU = Matrix4.multiplyByPointAsVector(
      inverseEnu,
      Cartesian3.fromArray(northward.value),
      new Cartesian3()
    );
    northwardENU = Cartesian3.normalize(northwardENU, northwardENU);
    expect(
      Cartesian3.equalsEpsilon(
        northwardENU,
        Cartesian3.UNIT_Y,
        CesiumMath.EPSILON7
      )
    ).toBe(true);
  });

  it("provides attributes for computing planes in 2D and Columbus View", function () {
    const planes2D_HIGH = largeRectangleAttributes.planes2D_HIGH;
    const planes2D_LOW = largeRectangleAttributes.planes2D_LOW;

    expect(planes2D_HIGH.componentDatatype).toEqual(ComponentDatatype.FLOAT);
    expect(planes2D_HIGH.componentsPerAttribute).toEqual(4);
    expect(planes2D_HIGH.normalize).toEqual(false);

    // Because using a unit sphere expect all HIGH values to be basically 0
    let highValue = planes2D_HIGH.value;
    expect(highValue[0]).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
    expect(highValue[1]).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
    expect(highValue[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON7);
    expect(highValue[3]).toEqualEpsilon(0.0, CesiumMath.EPSILON7);

    expect(planes2D_LOW.componentDatatype).toEqual(ComponentDatatype.FLOAT);
    expect(planes2D_LOW.componentsPerAttribute).toEqual(4);
    expect(planes2D_LOW.normalize).toEqual(false);

    let cartographic = Cartographic.fromDegrees(-45, -45, 0.0); // southwest corner
    let southwestCartesian = projection.project(cartographic);
    let lowValue = planes2D_LOW.value;
    expect(lowValue[0]).toEqualEpsilon(
      southwestCartesian.x,
      CesiumMath.EPSILON7
    );
    expect(lowValue[1]).toEqualEpsilon(
      southwestCartesian.y,
      CesiumMath.EPSILON7
    );
    expect(lowValue[2]).toEqualEpsilon(
      -southwestCartesian.y,
      CesiumMath.EPSILON7
    );
    expect(lowValue[3]).toEqualEpsilon(
      -southwestCartesian.x,
      CesiumMath.EPSILON7
    );

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
    expect(lowValue[0]).toEqualEpsilon(
      southwestCartesian.x,
      CesiumMath.EPSILON7
    );
    expect(lowValue[1]).toEqualEpsilon(
      southwestCartesian.y,
      CesiumMath.EPSILON7
    );
    expect(lowValue[2]).toEqualEpsilon(
      -southwestCartesian.y,
      CesiumMath.EPSILON7
    );
    expect(lowValue[3]).toEqualEpsilon(
      -southwestCartesian.x,
      CesiumMath.EPSILON7
    );
  });

  it("provides attributes for rotating texture coordinates", function () {
    // 90 degree rotation of a square, so "max" in Y direction is (0,0), "max" in X direction is (1,1)
    const attributes = ShadowVolumeAppearance.getPlanarTextureCoordinateAttributes(
      smallTestRectangle,
      [1, 0, 0, 0, 1, 1],
      unitSphereEllipsoid,
      projection,
      0.0
    );

    const uMaxVmax = attributes.uMaxVmax;
    const uvMinAndExtents = attributes.uvMinAndExtents;
    expect(uMaxVmax.componentDatatype).toEqual(ComponentDatatype.FLOAT);
    expect(uMaxVmax.componentsPerAttribute).toEqual(4);
    expect(uMaxVmax.normalize).toEqual(false);

    expect(uvMinAndExtents.componentDatatype).toEqual(ComponentDatatype.FLOAT);
    expect(uvMinAndExtents.componentsPerAttribute).toEqual(4);
    expect(uvMinAndExtents.normalize).toEqual(false);

    let value = uMaxVmax.value;
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

  it("checks for spherical extent attributes", function () {
    expect(
      ShadowVolumeAppearance.hasAttributesForSphericalExtents(
        smallRectangleAttributes
      )
    ).toBe(false);
    expect(
      ShadowVolumeAppearance.hasAttributesForSphericalExtents(
        largeRectangleAttributes
      )
    ).toBe(true);
  });

  it("checks for planar texture coordinate attributes", function () {
    expect(
      ShadowVolumeAppearance.hasAttributesForTextureCoordinatePlanes(
        smallRectangleAttributes
      )
    ).toBe(true);
    expect(
      ShadowVolumeAppearance.hasAttributesForTextureCoordinatePlanes(
        largeRectangleAttributes
      )
    ).toBe(false);
  });

  it("checks if a rectangle should use spherical texture coordinates", function () {
    expect(
      ShadowVolumeAppearance.shouldUseSphericalCoordinates(smallTestRectangle)
    ).toBe(false);
    expect(
      ShadowVolumeAppearance.shouldUseSphericalCoordinates(largeTestRectangle)
    ).toBe(true);
  });

  it("creates vertex shaders for color", function () {
    // Check defines
    const sphericalTexturedAppearance = new ShadowVolumeAppearance(
      true,
      false,
      textureMaterialAppearance
    );
    let shaderSource = sphericalTexturedAppearance.createVertexShader(
      [],
      testVs,
      false,
      projection
    );
    let defines = shaderSource.defines;
    expect(defines.length).toEqual(2);
    expect(defines.indexOf("TEXTURE_COORDINATES")).not.toEqual(-1);
    expect(defines.indexOf("SPHERICAL")).not.toEqual(-1);

    // 2D variant
    shaderSource = sphericalTexturedAppearance.createVertexShader(
      [],
      testVs,
      true,
      projection
    );
    defines = shaderSource.defines;
    expect(defines.length).toEqual(6);
    expect(defines.indexOf("TEXTURE_COORDINATES")).not.toEqual(-1);
    expect(defines.indexOf("COLUMBUS_VIEW_2D")).not.toEqual(-1);

    expect(defines.indexOf(eastMostYhighDefine)).not.toEqual(-1);
    expect(defines.indexOf(eastMostYlowDefine)).not.toEqual(-1);
    expect(defines.indexOf(westMostYhighDefine)).not.toEqual(-1);
    expect(defines.indexOf(westMostYlowDefine)).not.toEqual(-1);

    // Unculled color appearance - no texcoords at all
    const sphericalUnculledColorAppearance = new ShadowVolumeAppearance(
      false,
      false,
      perInstanceColorMaterialAppearance
    );
    shaderSource = sphericalUnculledColorAppearance.createVertexShader(
      [],
      testVs,
      false,
      projection
    );
    defines = shaderSource.defines;
    expect(defines.length).toEqual(1);
    expect(defines.indexOf("PER_INSTANCE_COLOR")).not.toEqual(-1);

    // 2D variant
    shaderSource = sphericalUnculledColorAppearance.createVertexShader(
      [],
      testVs,
      true,
      projection
    );
    defines = shaderSource.defines;
    expect(defines.length).toEqual(5);

    expect(defines.indexOf(eastMostYhighDefine)).not.toEqual(-1);
    expect(defines.indexOf(eastMostYlowDefine)).not.toEqual(-1);
    expect(defines.indexOf(westMostYhighDefine)).not.toEqual(-1);
    expect(defines.indexOf(westMostYlowDefine)).not.toEqual(-1);

    expect(defines.indexOf("PER_INSTANCE_COLOR")).not.toEqual(-1);

    // Planar textured, without culling
    const planarTexturedAppearance = new ShadowVolumeAppearance(
      false,
      true,
      textureMaterialAppearance
    );
    shaderSource = planarTexturedAppearance.createVertexShader(
      [],
      testVs,
      false,
      projection
    );
    defines = shaderSource.defines;
    expect(defines.indexOf("TEXTURE_COORDINATES")).not.toEqual(-1);
    expect(defines.length).toEqual(1);

    shaderSource = planarTexturedAppearance.createVertexShader(
      [],
      testVs,
      true,
      projection
    );
    defines = shaderSource.defines;
    expect(defines.indexOf("TEXTURE_COORDINATES")).not.toEqual(-1);
    expect(defines.indexOf("COLUMBUS_VIEW_2D")).not.toEqual(-1);

    expect(defines.indexOf(eastMostYhighDefine)).not.toEqual(-1);
    expect(defines.indexOf(eastMostYlowDefine)).not.toEqual(-1);
    expect(defines.indexOf(westMostYhighDefine)).not.toEqual(-1);
    expect(defines.indexOf(westMostYlowDefine)).not.toEqual(-1);

    expect(defines.length).toEqual(6);
  });

  it("creates vertex shaders for pick", function () {
    // Check defines
    const sphericalTexturedAppearance = new ShadowVolumeAppearance(
      true,
      false,
      textureMaterialAppearance
    );
    let shaderSource = sphericalTexturedAppearance.createPickVertexShader(
      [],
      testVs,
      false,
      projection
    );
    let defines = shaderSource.defines;
    expect(defines.length).toEqual(2);
    expect(defines.indexOf("TEXTURE_COORDINATES")).not.toEqual(-1);
    expect(defines.indexOf("SPHERICAL")).not.toEqual(-1);

    // 2D variant
    shaderSource = sphericalTexturedAppearance.createPickVertexShader(
      [],
      testVs,
      true,
      projection
    );
    defines = shaderSource.defines;
    expect(defines.length).toEqual(6);
    expect(defines.indexOf("TEXTURE_COORDINATES")).not.toEqual(-1);
    expect(defines.indexOf("COLUMBUS_VIEW_2D")).not.toEqual(-1);

    expect(defines.indexOf(eastMostYhighDefine)).not.toEqual(-1);
    expect(defines.indexOf(eastMostYlowDefine)).not.toEqual(-1);
    expect(defines.indexOf(westMostYhighDefine)).not.toEqual(-1);
    expect(defines.indexOf(westMostYlowDefine)).not.toEqual(-1);

    // Unculled color appearance - no texcoords at all
    const sphericalUnculledColorAppearance = new ShadowVolumeAppearance(
      false,
      false,
      perInstanceColorMaterialAppearance
    );
    shaderSource = sphericalUnculledColorAppearance.createPickVertexShader(
      [],
      testVs,
      false,
      projection
    );
    defines = shaderSource.defines;
    expect(defines.length).toEqual(0);

    // 2D variant
    shaderSource = sphericalUnculledColorAppearance.createPickVertexShader(
      [],
      testVs,
      true,
      projection
    );
    defines = shaderSource.defines;

    expect(defines.indexOf(eastMostYhighDefine)).not.toEqual(-1);
    expect(defines.indexOf(eastMostYlowDefine)).not.toEqual(-1);
    expect(defines.indexOf(westMostYhighDefine)).not.toEqual(-1);
    expect(defines.indexOf(westMostYlowDefine)).not.toEqual(-1);

    expect(defines.length).toEqual(4);

    // Planar textured, without culling
    const planarTexturedAppearance = new ShadowVolumeAppearance(
      false,
      true,
      textureMaterialAppearance
    );
    shaderSource = planarTexturedAppearance.createPickVertexShader(
      [],
      testVs,
      false,
      projection
    );
    defines = shaderSource.defines;
    expect(defines.length).toEqual(0);

    shaderSource = planarTexturedAppearance.createPickVertexShader(
      [],
      testVs,
      true,
      projection
    );
    defines = shaderSource.defines;

    expect(defines.indexOf(eastMostYhighDefine)).not.toEqual(-1);
    expect(defines.indexOf(eastMostYlowDefine)).not.toEqual(-1);
    expect(defines.indexOf(westMostYhighDefine)).not.toEqual(-1);
    expect(defines.indexOf(westMostYlowDefine)).not.toEqual(-1);

    expect(defines.length).toEqual(4);
  });

  it("creates fragment shaders for color and pick", function () {
    // Check defines
    const sphericalTexturedAppearance = new ShadowVolumeAppearance(
      true,
      false,
      textureMaterialAppearance
    );
    let shaderSource = sphericalTexturedAppearance.createFragmentShader(false);
    let defines = shaderSource.defines;

    // Check material hookups, discard for culling, and phong shading
    expect(defines.indexOf("SPHERICAL")).not.toEqual(-1);
    expect(defines.indexOf("REQUIRES_EC")).not.toEqual(-1);
    expect(defines.indexOf("REQUIRES_WC")).not.toEqual(-1);
    expect(defines.indexOf("TEXTURE_COORDINATES")).not.toEqual(-1);
    expect(defines.indexOf("CULL_FRAGMENTS")).not.toEqual(-1);
    expect(defines.indexOf("NORMAL_EC")).not.toEqual(-1);
    expect(defines.indexOf("USES_NORMAL_EC")).not.toEqual(-1);
    expect(defines.indexOf("USES_POSITION_TO_EYE_EC")).not.toEqual(-1);
    expect(defines.indexOf("USES_TANGENT_TO_EYE")).not.toEqual(-1);
    expect(defines.indexOf("USES_ST")).not.toEqual(-1);
    expect(defines.length).toEqual(10);

    // 2D case
    shaderSource = sphericalTexturedAppearance.createFragmentShader(true);
    defines = shaderSource.defines;

    expect(defines.indexOf("REQUIRES_EC")).not.toEqual(-1);
    expect(defines.indexOf("REQUIRES_WC")).not.toEqual(-1);
    expect(defines.indexOf("TEXTURE_COORDINATES")).not.toEqual(-1);
    expect(defines.indexOf("CULL_FRAGMENTS")).not.toEqual(-1);
    expect(defines.indexOf("NORMAL_EC")).not.toEqual(-1);
    expect(defines.indexOf("USES_NORMAL_EC")).not.toEqual(-1);
    expect(defines.indexOf("USES_POSITION_TO_EYE_EC")).not.toEqual(-1);
    expect(defines.indexOf("USES_TANGENT_TO_EYE")).not.toEqual(-1);
    expect(defines.indexOf("USES_ST")).not.toEqual(-1);
    expect(defines.length).toEqual(9);

    // Culling with planar texture coordinates on a per-color material
    const planarColorAppearance = new ShadowVolumeAppearance(
      true,
      true,
      perInstanceColorMaterialAppearance
    );
    shaderSource = planarColorAppearance.createFragmentShader(false);
    defines = shaderSource.defines;

    expect(defines.indexOf("PER_INSTANCE_COLOR")).not.toEqual(-1);
    expect(defines.indexOf("REQUIRES_EC")).not.toEqual(-1);
    expect(defines.indexOf("REQUIRES_WC")).not.toEqual(-1);
    expect(defines.indexOf("TEXTURE_COORDINATES")).not.toEqual(-1);
    expect(defines.indexOf("CULL_FRAGMENTS")).not.toEqual(-1);
    expect(defines.indexOf("NORMAL_EC")).not.toEqual(-1);
    expect(defines.length).toEqual(6);

    // Pick
    shaderSource = planarColorAppearance.createPickFragmentShader(true);
    defines = shaderSource.defines;

    expect(defines.indexOf("REQUIRES_EC")).not.toEqual(-1);
    expect(defines.indexOf("REQUIRES_WC")).not.toEqual(-1);
    expect(defines.indexOf("TEXTURE_COORDINATES")).not.toEqual(-1);
    expect(defines.indexOf("CULL_FRAGMENTS")).not.toEqual(-1);
    expect(defines.indexOf("PICK")).not.toEqual(-1);
    expect(defines.length).toEqual(5);

    // Flat
    const flatSphericalTexturedAppearance = new ShadowVolumeAppearance(
      true,
      false,
      flatTextureMaterialAppearance
    );
    shaderSource = flatSphericalTexturedAppearance.createFragmentShader(false);
    defines = shaderSource.defines;
    expect(defines.indexOf("SPHERICAL")).not.toEqual(-1);
    expect(defines.indexOf("REQUIRES_EC")).not.toEqual(-1);
    expect(defines.indexOf("REQUIRES_WC")).not.toEqual(-1);
    expect(defines.indexOf("TEXTURE_COORDINATES")).not.toEqual(-1);
    expect(defines.indexOf("CULL_FRAGMENTS")).not.toEqual(-1);
    expect(defines.indexOf("NORMAL_EC")).not.toEqual(-1);
    expect(defines.indexOf("USES_NORMAL_EC")).not.toEqual(-1);
    expect(defines.indexOf("USES_POSITION_TO_EYE_EC")).not.toEqual(-1);
    expect(defines.indexOf("USES_ST")).not.toEqual(-1);
    expect(defines.indexOf("FLAT")).not.toEqual(-1);
    expect(defines.length).toEqual(10);

    const flatSphericalColorAppearance = new ShadowVolumeAppearance(
      false,
      false,
      flatPerInstanceColorMaterialAppearance
    );
    shaderSource = flatSphericalColorAppearance.createFragmentShader(false);
    defines = shaderSource.defines;
    expect(defines.indexOf("SPHERICAL")).not.toEqual(-1);
    expect(defines.indexOf("PER_INSTANCE_COLOR")).not.toEqual(-1);
    expect(defines.indexOf("FLAT")).not.toEqual(-1);
    expect(defines.length).toEqual(3);
  });
});
