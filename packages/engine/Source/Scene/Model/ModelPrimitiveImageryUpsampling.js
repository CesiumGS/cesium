import Model from "./Model.js";
import CartesianRectangle from "./CartesianRectangle.js";
import ModelImageryMapping from "./ModelImageryMapping.js";
import ModelPrimitives from "./ModelPrimitives.js";

import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";

import ModelAttributeReader from "./ModelAttributeReader.js";

import ModelComponents from "../ModelComponents.js";
const Primitive = ModelComponents.Primitive;

import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
const TEXCOORD = VertexAttributeSemantic.TEXCOORD;
const POSITION = VertexAttributeSemantic.POSITION;

// XXX_DRAPING Upsampling experiments
class Vertex {
  constructor() {
    this._floatAttributes = {};
  }

  reset() {
    this._floatAttributes = {};
  }

  setFloatAttributeValues(name, values) {
    let floatAttributeValues = this._floatAttributes[name];
    if (!floatAttributeValues) {
      floatAttributeValues = [];
      this._floatAttributes[name] = floatAttributeValues;
    }
    floatAttributeValues.push(...values);
  }

  getFloatAttributeValues(name) {
    return this._floatAttributes[name];
  }
}

// XXX_DRAPING Upsampling experiments
class GeometryProvider {
  constructor(indices, positions, texCoords) {
    this._indices = indices;
    this._floatAttributes = {};
    this._floatAttributes[POSITION] = positions;
    this._floatAttributes[TEXCOORD] = texCoords;
  }

  getNumTriangles() {
    return this._indices.length / 3;
  }

  getFloatAttributeValues(name) {
    return this._floatAttributes[name];
  }

  getVertexIndex(triangleIndex, vertexIndex) {
    return this._indices[triangleIndex * 3 + vertexIndex];
  }

  getVertex(index, vertex) {
    vertex.reset();

    const positions = this.getFloatAttributeValues(POSITION);
    const px = positions[index * 3 + 0];
    const py = positions[index * 3 + 1];
    const pz = positions[index * 3 + 2];
    vertex.setFloatAttributeValues(POSITION, [px, py, pz]);

    const texCoords = this.getFloatAttributeValues(TEXCOORD);
    const tx = texCoords[index * 2 + 0];
    const ty = texCoords[index * 2 + 1];
    vertex.setFloatAttributeValues(TEXCOORD, [tx, ty]);
  }
}

// XXX_DRAPING Upsampling experiments
class GeometryConsumer {
  constructor(floatAttributeNames) {
    this._indices = [];
    this._floatAttributeNames = floatAttributeNames;
    this._floatAttributes = {};
  }

  getFloatAttributeValues(name) {
    let attributeValues = this._floatAttributes[name];
    if (!attributeValues) {
      attributeValues = [];
      this._floatAttributes[name] = attributeValues;
    }
    return attributeValues;
  }

  getIndices() {
    return this._indices;
  }

  acceptVertex(v) {
    const floatAttributeNames = this._floatAttributeNames;
    const length = floatAttributeNames.length;
    for (let a = 0; a < length; a++) {
      const name = floatAttributeNames[a];
      const thisFloatAttributeValues = this.getFloatAttributeValues(name);
      const vertexFloatAttributeValues = v.getFloatAttributeValues(name);
      thisFloatAttributeValues.push(...vertexFloatAttributeValues);
    }
  }

  acceptTriangle(v0, v1, v2) {
    const n = this.getNumTriangles();
    this.acceptVertex(v0);
    this.acceptVertex(v1);
    this.acceptVertex(v2);
    this._indices.push(n * 3 + 0, n * 3 + 1, n * 3 + 2);
  }

  getNumTriangles() {
    return this._indices.length / 3;
  }
}

const XXX_DRAPING_LOG_ALL = false;

class ModelPrimitiveImageryUpsampling {
  /**
   * XXX_DRAPING Receive the primitive. Split it. Return results.
   *
   * @param {ModelPrimitiveImagery} modelPrimitiveImagery
   */
  static process(modelPrimitiveImagery, frameState) {
    // XXX_DRAPING Experiments!
    const model = modelPrimitiveImagery._model;
    const imageryLayer = model.imageryLayers.get(0);
    const mappedPositions =
      modelPrimitiveImagery.mappedPositionsForImageryLayer(imageryLayer);
    const coverages =
      modelPrimitiveImagery.coveragesForImageryLayer(imageryLayer);

    const projection = imageryLayer.imageryProvider.tilingScheme.projection;
    const primitiveImageryTexCoords =
      ModelImageryMapping.createTextureCoordinatesForMappedPositions(
        mappedPositions,
        projection,
      );

    const runtimePrimitive = modelPrimitiveImagery._runtimePrimitive;
    const primitive = runtimePrimitive.primitive;

    const primitiveIndices =
      ModelPrimitives.createTriangleIndicesTypedArray(primitive);

    // TODO_DRAPING This is also extracted when computing the MappedPositions, maybe avoid that...
    const primitivePositionAttribute =
      modelPrimitiveImagery._primitivePositionAttribute;
    const primitivePositions = ModelAttributeReader.readAttributeAsTypedArray(
      primitivePositionAttribute,
    );

    {
      console.log("primitiveIndices", primitiveIndices);
      console.log("primitivePositions", primitivePositions);
      console.log("primitiveImageryTexCoords", primitiveImageryTexCoords);
      if (XXX_DRAPING_LOG_ALL) {
        const numCoverages = coverages.length;
        for (let c = 0; c < numCoverages; c++) {
          const coverage = coverages[c];
          console.log(`Coverage ${c}`);
          console.log(
            `  At ${coverage.x}, ${coverage.y}, ${coverage.level}, rect: ${coverage.textureCoordinateRectangle}`,
          );
        }
      }
    }

    const geometryProvider = new GeometryProvider(
      primitiveIndices,
      primitivePositions,
      primitiveImageryTexCoords,
    );

    const textureCoordinateCartesianRectangles = coverages
      .map((c) => c.textureCoordinateRectangle)
      .map((cartesian4) => {
        const cartesianRectangle = new CartesianRectangle(
          cartesian4.x,
          cartesian4.y,
          cartesian4.z,
          cartesian4.w,
        );
        return cartesianRectangle;
      });
    const geometryConsumers = ModelPrimitiveImageryUpsampling.split(
      geometryProvider,
      textureCoordinateCartesianRectangles,
    );

    const newPrimitives = [];
    const numConsumers = geometryConsumers.length;
    for (let c = 0; c < numConsumers; c++) {
      const geometryConsumer = geometryConsumers[c];

      const indicesDataArray = geometryConsumer.getIndices();
      const indices = ModelPrimitives.createIndicesUint16(indicesDataArray);

      const positionDataArray =
        geometryConsumer.getFloatAttributeValues(POSITION);
      const positionAttribute = ModelPrimitives.createPositionAttribute(
        "Generated POSITION attribute for imagery coverage",
        positionDataArray,
      );

      const texCoordDataArray =
        geometryConsumer.getFloatAttributeValues(TEXCOORD);
      const setIndex = 0;
      const texCoordAttribute = ModelPrimitives.createTexCoordAttribute(
        "Generated TEXCOORD attribute for imagery coverage",
        setIndex,
        texCoordDataArray,
      );

      const newPrimitive = ModelPrimitiveImageryUpsampling.createNewPrimitive(
        primitive,
        indices,
        positionAttribute,
        texCoordAttribute,
      );

      // XXX_DRAPING Move this to the GPU.
      // Should this be done here?
      // How will the buffers be freed?
      const indicesBuffer = Buffer.createIndexBuffer({
        typedArray: indices.typedArray,
        context: frameState.context,
        usage: BufferUsage.STATIC_DRAW,
        indexDatatype: indices.indexDatatype,
      });
      indices.buffer = indicesBuffer;

      const positionBuffer = Buffer.createVertexBuffer({
        typedArray: positionAttribute.typedArray,
        context: frameState.context,
        usage: BufferUsage.STATIC_DRAW,
      });
      positionAttribute.buffer = positionBuffer;

      const texCoordBuffer = Buffer.createVertexBuffer({
        typedArray: texCoordAttribute.typedArray,
        context: frameState.context,
        usage: BufferUsage.STATIC_DRAW,
      });
      texCoordAttribute.buffer = texCoordBuffer;

      newPrimitives.push(newPrimitive);
    }

    console.log("Created newPrimitives ", newPrimitives);
    return newPrimitives;
  }

  static split(geometryProvider, textureCoordinateCartesianRectangles) {
    // XXX_DRAPING Brainstorming: When there are many coverages, then
    // the containment checks are done many times. But once a triangle
    // is determined to be completely inside one coverage, then it
    // cannot be (not outside) of another one (the coverages are
    // disjoint). What's happening here is actually largely a
    // "partitioning" of the triangles into "bins" (coverages).
    // Ideally, there would be one "consumer" for each coverage
    // that offers "consumer.accept(v0, v1, v2)" to consume
    // a triangle. This function could, for example, return `true`
    // if it was completely inside. This function could also
    // perform the actual clipping (and maybe add two or more
    // triangles to the consumer internally)

    const numTriangles = geometryProvider.getNumTriangles();

    const vertex0 = new Vertex();
    const vertex1 = new Vertex();
    const vertex2 = new Vertex();

    const numRectangles = textureCoordinateCartesianRectangles.length;
    const geometryConsumers = Array(
      textureCoordinateCartesianRectangles.length,
    );

    for (let c = 0; c < numRectangles; c++) {
      const rect = textureCoordinateCartesianRectangles[c];
      const geometryConsumer = new GeometryConsumer([POSITION, TEXCOORD]);
      geometryConsumers[c] = geometryConsumer;

      for (let t = 0; t < numTriangles; t++) {
        const i0 = geometryProvider.getVertexIndex(t, 0);
        const i1 = geometryProvider.getVertexIndex(t, 1);
        const i2 = geometryProvider.getVertexIndex(t, 2);

        geometryProvider.getVertex(i0, vertex0);
        geometryProvider.getVertex(i1, vertex1);
        geometryProvider.getVertex(i2, vertex2);

        const texCoords0 = vertex0.getFloatAttributeValues(TEXCOORD);
        const texCoords1 = vertex1.getFloatAttributeValues(TEXCOORD);
        const texCoords2 = vertex2.getFloatAttributeValues(TEXCOORD);

        const tx0 = texCoords0[0];
        const ty0 = texCoords0[1];

        const tx1 = texCoords1[0];
        const ty1 = texCoords1[1];

        const tx2 = texCoords2[0];
        const ty2 = texCoords2[1];

        if (XXX_DRAPING_LOG_ALL) {
          console.log(`  Triangle ${t}`);
          console.log(`    Indices ${i0} ${i1} ${i2}`);
          console.log(`    texCoords 0: ${tx0} ${ty0}`);
          console.log(`    texCoords 1: ${tx1} ${ty1}`);
          console.log(`    texCoords 2: ${tx2} ${ty2}`);
        }

        const inside0 = rect.containsInclusive(tx0, ty0);
        const inside1 = rect.containsInclusive(tx1, ty1);
        const inside2 = rect.containsInclusive(tx2, ty2);

        const inside = inside0 && inside1 && inside2;
        const outside = !inside0 && !inside1 && !inside2;

        const needsClip = !inside && !outside;

        if (XXX_DRAPING_LOG_ALL) {
          console.log(`    inside0 ${inside0}`);
          console.log(`    inside1 ${inside1}`);
          console.log(`    inside2 ${inside2}`);
          if (inside) {
            console.log(`    inside ${inside} - keep it`);
          }
          if (outside) {
            console.log(
              `    outside ${outside} - discard it. Hopefully don't also keep it...`,
            );
          }
          if (needsClip) {
            console.log(`    needsClip ${needsClip} - so clip it...`);
          }
        }

        if (inside) {
          geometryConsumer.acceptTriangle(vertex0, vertex1, vertex2);
        }
        //if (needsClip) {
        //  console.log(`  triangle ${t} needsClip ${needsClip} - so clip it...`);
        //}
      }

      console.log(
        `geometryConsumer ${c} received ${geometryConsumer.getNumTriangles()} triangles`,
      );
    }

    return geometryConsumers;
  }

  static createNewPrimitive(
    originalPrimitive,
    indices,
    positionAttribute,
    texCoordAttribute,
  ) {
    const primitive = new Primitive();

    primitive.indices = indices;
    primitive.attributes.push(positionAttribute);
    primitive.attributes.push(texCoordAttribute);

    primitive.material = originalPrimitive.material;
    primitive.primitiveType = originalPrimitive.primitiveType;

    // Omitted:
    // morphTargets
    // featureIds
    // propertyTextureIds
    // propertyAttributeIds
    // outlineCoordinates
    // modelPrimitiveImagery (yeah...)

    return primitive;
  }

  // Let's just keep the JSON, serialize it, and read it again. Lol.
  static async nowJustCreateSomeModelWhyNot(gltf) {
    const basePath = "DUMMY_BASE_PATH";
    const model = await Model.fromGltfAsync({
      gltf: gltf,
      basePath: basePath,
      incrementallyLoadTextures: false,
    });
    console.log(model);
  }
}

export default ModelPrimitiveImageryUpsampling;
