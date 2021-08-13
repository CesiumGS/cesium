import {
  Cartesian3,
  Math as CesiumMath,
  InstanceAttributeSemantic,
  Matrix4,
  ModelExperimentalUtility,
  Quaternion,
  TranslationRotationScale,
  VertexAttributeSemantic,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/ModelExperimentalUtility", function () {
  it("getNodeTransform works when node has a matrix", function () {
    var nodeWithMatrix = {
      matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    };

    var computedTransform = ModelExperimentalUtility.getNodeTransform(
      nodeWithMatrix
    );
    expect(Matrix4.equals(computedTransform, Matrix4.IDENTITY)).toEqual(true);
  });

  it("getNodeTransform works when node has translation, rotation, scale", function () {
    var nodeWithTRS = {
      translation: new Cartesian3(0, 0, 0),
      rotation: new Quaternion(0, 0, 0, 1),
      scale: new Cartesian3(1, 1, 1),
    };

    var computedTransform = ModelExperimentalUtility.getNodeTransform(
      nodeWithTRS
    );
    expect(Matrix4.equals(computedTransform, Matrix4.IDENTITY)).toEqual(true);
  });

  it("createBoundingSphere works", function () {
    var mockPrimitive = {
      attributes: [
        {
          semantic: "POSITION",
          max: new Cartesian3(0.5, 0.5, 0.5),
          min: new Cartesian3(-0.5, -0.5, -0.5),
        },
      ],
    };
    var translation = new Cartesian3(50, 50, 50);

    var modelMatrix = Matrix4.fromTranslationRotationScale(
      new TranslationRotationScale(
        translation,
        Quaternion.IDENTITY,
        new Cartesian3(1, 1, 1)
      )
    );
    var boundingSphere = ModelExperimentalUtility.createBoundingSphere(
      mockPrimitive,
      modelMatrix
    );

    expect(boundingSphere.center).toEqual(translation);
    expect(boundingSphere.radius).toEqualEpsilon(
      0.8660254037844386,
      CesiumMath.EPSILON8
    );
  });

  it("createBoundingSphere works with instancing", function () {
    var mockPrimitive = {
      attributes: [
        {
          semantic: "POSITION",
          max: new Cartesian3(0.5, 0.5, 0.5),
          min: new Cartesian3(-0.5, -0.5, -0.5),
        },
      ],
    };
    var translation = new Cartesian3(50, 50, 50);

    var modelMatrix = Matrix4.fromTranslationRotationScale(
      new TranslationRotationScale(
        translation,
        Quaternion.IDENTITY,
        new Cartesian3(1, 1, 1)
      )
    );
    var boundingSphere = ModelExperimentalUtility.createBoundingSphere(
      mockPrimitive,
      modelMatrix,
      new Cartesian3(5, 5, 5),
      new Cartesian3(-5, -5, -5)
    );

    expect(boundingSphere.center).toEqual(translation);
    expect(boundingSphere.radius).toEqualEpsilon(
      9.526279441628825,
      CesiumMath.EPSILON8
    );
  });

  it("getAttributeBySemantic works", function () {
    var nodeIntanceAttributes = {
      attributes: [
        { semantic: InstanceAttributeSemantic.TRANSLATION },
        { semantic: InstanceAttributeSemantic.ROTATION },
        { semantic: InstanceAttributeSemantic.SCALE },
        { semantic: InstanceAttributeSemantic.FEATURE_ID },
      ],
    };

    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        nodeIntanceAttributes,
        InstanceAttributeSemantic.TRANSLATION
      )
    ).toBeDefined();
    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        nodeIntanceAttributes,
        InstanceAttributeSemantic.ROTATION
      )
    ).toBeDefined();
    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        nodeIntanceAttributes,
        InstanceAttributeSemantic.SCALE
      )
    ).toBeDefined();
    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        nodeIntanceAttributes,
        InstanceAttributeSemantic.FEATURE_ID
      )
    ).toBeDefined();
    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        nodeIntanceAttributes,
        "UNKNOWN"
      )
    ).toBeUndefined();

    var primitiveAttributes = {
      attributes: [
        { semantic: VertexAttributeSemantic.POSITION },
        { semantic: VertexAttributeSemantic.NORMAL },
        { semantic: VertexAttributeSemantic.TANGENT },
        { semantic: VertexAttributeSemantic.TEXCOORD, setIndex: 0 },
        { semantic: VertexAttributeSemantic.TEXCOORD, setIndex: 1 },
      ],
    };

    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        primitiveAttributes,
        VertexAttributeSemantic.POSITION
      )
    ).toBeDefined();
    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        primitiveAttributes,
        VertexAttributeSemantic.NORMAL
      )
    ).toBeDefined();
    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        primitiveAttributes,
        VertexAttributeSemantic.TANGENT
      )
    ).toBeDefined();
    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        primitiveAttributes,
        VertexAttributeSemantic.TEXCOORD,
        0
      )
    ).toBeDefined();
    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        primitiveAttributes,
        VertexAttributeSemantic.TEXCOORD,
        1
      )
    ).toBeDefined();
    expect(
      ModelExperimentalUtility.getAttributeBySemantic(
        primitiveAttributes,
        "UNKNOWN"
      )
    ).toBeUndefined();
  });
});
