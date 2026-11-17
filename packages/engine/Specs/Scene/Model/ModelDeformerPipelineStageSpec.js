import { AttributeType, ComponentDatatype } from "@cesium/core";
import {
  GeometryAttributeDescriptor,
  ModelDeformerPipelineStage,
  ShaderBuilder,
  UniformType,
  _shadersDeformerStageVS,
} from "../../../index.js";
import ShaderBuilderTester from "../../../../../Specs/ShaderBuilderTester.js";

describe("Scene/Model/ModelDeformerPipelineStage", function () {
  const vertexBuffer = {};

  function createBinding(offset) {
    return {
      vertexAttributes: [
        new GeometryAttributeDescriptor({
          semantic: "weight",
          type: AttributeType.SCALAR,
          componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
        }),
        new GeometryAttributeDescriptor({
          semantic: "direction",
          type: AttributeType.VEC3,
          componentDatatype: ComponentDatatype.FLOAT,
        }),
      ],
      vertexBuffer,
      uniforms: {
        offset: { type: UniformType.VEC3, value: () => offset },
      },
      getShaderLines: (names) => [
        `return positionMC + ${names.weight} * ${names.direction} + ${names.offset};`,
      ],
    };
  }

  function createRenderResources(bindings) {
    return {
      shaderBuilder: new ShaderBuilder(),
      attributes: [],
      attributeIndex: 1,
      uniformMap: {},
      runtimePrimitive: { deformerBindings: new Set(bindings) },
    };
  }

  it("adds each binding's attributes, interleaved in its vertex buffer", function () {
    const renderResources = createRenderResources([
      createBinding(),
      createBinding(),
    ]);
    ModelDeformerPipelineStage.process(renderResources);

    ShaderBuilderTester.expectHasAttributes(
      renderResources.shaderBuilder,
      undefined,
      [
        "in float a_deformer0_weight;",
        "in vec3 a_deformer0_direction;",
        "in float a_deformer1_weight;",
        "in vec3 a_deformer1_direction;",
      ],
    );

    const [weight, direction] = renderResources.attributes;
    expect(weight).toEqual({
      index: 1,
      vertexBuffer,
      componentsPerAttribute: 1,
      componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
      normalize: false,
      offsetInBytes: 0,
      strideInBytes: 14,
    });
    expect(direction).toEqual({
      index: 2,
      vertexBuffer,
      componentsPerAttribute: 3,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
      offsetInBytes: 2,
      strideInBytes: 14,
    });
    expect(renderResources.attributes.length).toBe(4);
    expect(renderResources.attributeIndex).toBe(5);
  });

  it("adds each binding's uniforms", function () {
    const first = {};
    const second = {};
    const renderResources = createRenderResources([
      createBinding(first),
      createBinding(second),
    ]);
    ModelDeformerPipelineStage.process(renderResources);

    ShaderBuilderTester.expectHasVertexUniforms(renderResources.shaderBuilder, [
      "uniform vec3 u_deformer0_offset;",
      "uniform vec3 u_deformer1_offset;",
    ]);
    expect(renderResources.uniformMap.u_deformer0_offset()).toBe(first);
    expect(renderResources.uniformMap.u_deformer1_offset()).toBe(second);
  });

  it("adds each binding's offset from the rest position", function () {
    const renderResources = createRenderResources([
      createBinding(),
      createBinding(),
    ]);
    ModelDeformerPipelineStage.process(renderResources);

    const shaderBuilder = renderResources.shaderBuilder;
    ShaderBuilderTester.expectHasVertexDefines(shaderBuilder, [
      "HAS_DEFORMERS",
    ]);
    ShaderBuilderTester.expectHasVertexFunction(
      shaderBuilder,
      "deformer1",
      "vec3 deformer1(in vec3 positionMC)",
      [
        "    return positionMC + a_deformer1_weight * a_deformer1_direction + u_deformer1_offset;",
      ],
    );
    ShaderBuilderTester.expectHasVertexFunction(
      shaderBuilder,
      ModelDeformerPipelineStage.FUNCTION_ID_GET_DEFORMED_POSITION,
      ModelDeformerPipelineStage.FUNCTION_SIGNATURE_GET_DEFORMED_POSITION,
      [
        "    vec3 deformedPosition = positionMC;",
        "    deformedPosition += deformer0(positionMC) - positionMC;",
        "    deformedPosition += deformer1(positionMC) - positionMC;",
        "    return deformedPosition;",
      ],
    );
    ShaderBuilderTester.expectVertexLinesEqual(shaderBuilder, [
      _shadersDeformerStageVS,
    ]);
  });
});
