import {
  AttributeType,
  Cartesian3,
  ComponentDatatype,
  defined,
  Matrix3,
  Matrix4,
  Pass,
  VoxelBoxShape,
  VoxelPrimitive,
} from "../../Source/Cesium.js";
import createScene from "../createScene.js";

const metadataName = "dummyMetadataName";
function DummyVoxelProvider() {
  this.shape = new VoxelBoxShape();
  this.voxelDimensions = new Cartesian3(2, 2, 2);
  this.voxelsPerTile = 2 * 2 * 2;
  this.ready = true;
  this.readyPromise = Promise.resolve(this);
  this._tileCount = 4096;
  this.neighborEdgeCount = 0;
  this.metadataNames = [metadataName];
  this.numberOfLevels = 16;

  this.properties = {};

  this.properties[metadataName] = {
    type: AttributeType.VEC4,
    componentType: ComponentDatatype.FLOAT,
    componentCount: 4,
    min: 0,
    max: 1,
    count: this.voxelsPerTile * this._tileCount,
  };
}
DummyVoxelProvider.prototype.requestData = function (options) {
  const maxIndex = Math.pow(2, options.level) - 1;
  const requestOutsideOfShape =
    options.x < 0 ||
    options.x > maxIndex ||
    options.y < 0 ||
    options.y > maxIndex ||
    options.z < 0 ||
    options.z > maxIndex;
  if (options.level >= this.numberOfLevels || requestOutsideOfShape) {
    return Promise.resolve(undefined);
  }
  const returnArray = new Uint32Array(this.voxelsPerTile);
  return Promise.resolve(returnArray);
};

describe(
  "Scene/VoxelPrimitive",
  function () {
    const scene = createScene();
    const provider = new DummyVoxelProvider();
    let primitive;
    beforeEach(function () {
      scene.primitives.removeAll();
      primitive = new VoxelPrimitive({
        provider: provider,
      });
      scene._primitives.add(primitive);
      scene.renderForSpecs();
    });

    it("constructs a primitive", function () {
      const command = scene.frameState.commandList[0];
      expect(command).toBeDefined();
      expect(command.pass).toBe(Pass.VOXELS);
    });

    it("constructs with options", function () {
      expect(primitive.provider).toBe(provider);
      return primitive.readyPromise.then(function () {
        const property = provider.properties[metadataName];
        expect(primitive.shape._type).toBe(provider.shape._type);
        expect(
          primitive._voxelDimensions.equals(provider.voxelDimensions)
        ).toBe(true);
        expect(primitive._voxelNeighborEdgeCount).toBe(
          provider.neighborEdgeCount
        );
        // Object.values workaround is Object.keys.map
        const minimumValues = primitive.minimumValues[0];
        expect(
          Object.keys(minimumValues)
            .map(function (key) {
              return minimumValues[key];
            })
            .every(function (value) {
              return value === property.min;
            })
        ).toBe(true);
        const maximumValues = primitive.maximumValues[0];
        expect(
          Object.keys(maximumValues)
            .map(function (key) {
              return maximumValues[key];
            })
            .every(function (value) {
              return value === property.max;
            })
        ).toBe(true);
        expect(primitive._tileCount).toBe(provider._tileCount);
        expect(defined(primitive._traversal)).toBe(true);
        // TODO should we test writing glsl functions? i.e. sample functions, setting style input values for each metadata
      });
    });

    it("sets clipping range extrema when given valid range between 0 and 1", function () {
      const setValue = Cartesian3.fromElements(0.1, 0.5, 0.3);
      expect(primitive.minClippingBounds.equals(setValue)).toBe(false);
      primitive.minClippingBounds = setValue;
      expect(primitive.minClippingBounds.equals(setValue)).toBe(true);
      expect(primitive.maxClippingBounds.equals(setValue)).toBe(false);
      primitive.maxClippingBounds = setValue;
      expect(primitive.maxClippingBounds.equals(setValue)).toBe(true);
    });

    it("clamps clipping range extrema when given values outside [0, 1]", function () {
      const setValue = Cartesian3.fromElements(-1.0, 0.5, 2.0);
      const clampedValue = Cartesian3.fromElements(0.0, 0.5, 1.0);
      primitive.minClippingBounds = setValue;
      expect(primitive.minClippingBounds.equals(clampedValue)).toBe(true);
      primitive.maxClippingBounds = setValue;
      expect(primitive.maxClippingBounds.equals(clampedValue)).toBe(true);
    });

    it("uses default style", function () {
      primitive.style = undefined;
      expect(primitive.style).toBe(VoxelPrimitive.DefaultStyle);
    });

    it("creates style", function () {
      const options = {
        type: "VoxelPrimitiveStyle",
        source:
          "vec4 style(StyleInput styleInput) {\n" +
          "     return vec4(1.0);\n" +
          "}",
        uniforms: { dummyUniform: 0 },
      };
      const material = VoxelPrimitive.CreateStyle(options);
      expect(material._template.type).toBe(options.type);
      expect(material._template.source).toBe(options.source);
      expect(material._template.uniforms.dummyUniform).toBe(
        options.uniforms.dummyUniform
      );
    });

    it("updates transform matrices", function () {
      const shape = primitive._shape;
      shape.translation = new Cartesian3(2.382, -3.643, 1.084);
      return primitive.readyPromise.then(function () {
        primitive.update(scene.frameState);
        const worldToBoundTransform = Matrix4.inverse(
          shape._boundTransform,
          new Matrix4()
        );
        expect(
          primitive._worldToBoundTransform.equals(worldToBoundTransform)
        ).toBe(true);

        const shapeTransform = shape._shapeTransform;
        const worldToShapeTransform = Matrix4.inverse(
          shape._shapeTransform,
          new Matrix4()
        );
        expect(
          primitive._worldToShapeTransform.equals(worldToShapeTransform)
        ).toBe(true);

        const shapeScale = Matrix4.getScale(shapeTransform, new Matrix4());
        const shapeRotation = Matrix4.getRotation(
          shapeTransform,
          new Matrix4()
        );
        const shapeScaleMaximum = Cartesian3.maximumComponent(shapeScale);
        const shapeNormalizedScale = Cartesian3.divideByScalar(
          shapeScale,
          shapeScaleMaximum,
          new Matrix4()
        );
        const scaleAndRotation = Matrix3.multiplyByScale(
          shapeRotation,
          shapeNormalizedScale,
          new Matrix4()
        );
        const worldToUvTransformDirection = Matrix3.inverse(
          scaleAndRotation,
          new Matrix3()
        );
        expect(
          primitive._worldToUvTransformDirection.equals(
            worldToUvTransformDirection
          )
        ).toBe(true);

        const shapeToWorldNormal = Matrix4.getRotation(
          shapeTransform,
          new Matrix4()
        );
        Matrix3.multiplyByScale(
          shapeToWorldNormal,
          shapeNormalizedScale,
          shapeToWorldNormal
        );
        Matrix3.transpose(shapeToWorldNormal, shapeToWorldNormal);
        Matrix3.inverse(shapeToWorldNormal, shapeToWorldNormal);
        expect(primitive._shapeToWorldNormal.equals(shapeToWorldNormal)).toBe(
          true
        );

        const stepSizeUv = shape.computeApproximateStepSize(
          primitive._voxelDimensions
        );
        expect(primitive._stepSizeUv).toBe(stepSizeUv);
      });
    });
  },
  "WebGL"
);
