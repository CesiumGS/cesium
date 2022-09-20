import { PrimitiveType, DrawCommand, Pass } from "../../index.js";;

describe("Renderer/DrawCommand", function () {
  it("constructs", function () {
    const c = new DrawCommand();
    expect(c.boundingVolume).toBeUndefined();
    expect(c.orientedBoundingBox).toBeUndefined();
    expect(c.cull).toEqual(true);
    expect(c.occlude).toEqual(true);
    expect(c.modelMatrix).toBeUndefined();
    expect(c.primitiveType).toEqual(PrimitiveType.TRIANGLES);
    expect(c.vertexArray).toBeUndefined();
    expect(c.count).toBeUndefined();
    expect(c.offset).toEqual(0);
    expect(c.instanceCount).toEqual(0);
    expect(c.shaderProgram).toBeUndefined();
    expect(c.uniformMap).toBeUndefined();
    expect(c.renderState).toBeUndefined();
    expect(c.framebuffer).toBeUndefined();
    expect(c.pass).toBeUndefined();
    expect(c.executeInClosestFrustum).toEqual(false);
    expect(c.owner).toBeUndefined();
    expect(c.debugShowBoundingVolume).toEqual(false);
    expect(c.debugOverlappingFrustums).toEqual(0);
    expect(c.castShadows).toEqual(false);
    expect(c.receiveShadows).toEqual(false);
    expect(c.pickId).toBeUndefined();
    expect(c.pickOnly).toBe(false);
  });

  it("constructs with options", function () {
    const boundingVolume = {};
    const orientedBoundingBox = {};
    const modelMatrix = {};
    const primitiveType = PrimitiveType.TRIANGLE_FAN;
    const vertexArray = {};
    const shaderProgram = {};
    const uniformMap = {};
    const renderState = {};
    const framebuffer = {};
    const pass = Pass.TRANSLUCENT;
    const owner = {};
    const pickId = {};

    const c = new DrawCommand({
      boundingVolume: boundingVolume,
      orientedBoundingBox: orientedBoundingBox,
      cull: false,
      occlude: false,
      modelMatrix: modelMatrix,
      primitiveType: primitiveType,
      vertexArray: vertexArray,
      count: 3,
      offset: 3,
      instanceCount: 2,
      shaderProgram: shaderProgram,
      uniformMap: uniformMap,
      renderState: renderState,
      framebuffer: framebuffer,
      pass: pass,
      executeInClosestFrustum: true,
      owner: owner,
      debugShowBoundingVolume: true,
      castShadows: true,
      receiveShadows: true,
      pickId: pickId,
      pickOnly: true,
    });

    expect(c.boundingVolume).toBe(boundingVolume);
    expect(c.orientedBoundingBox).toBe(orientedBoundingBox);
    expect(c.cull).toEqual(false);
    expect(c.occlude).toEqual(false);
    expect(c.modelMatrix).toBe(modelMatrix);
    expect(c.primitiveType).toEqual(primitiveType);
    expect(c.vertexArray).toBe(vertexArray);
    expect(c.count).toEqual(3);
    expect(c.offset).toEqual(3);
    expect(c.instanceCount).toEqual(2);
    expect(c.shaderProgram).toBe(shaderProgram);
    expect(c.uniformMap).toBe(uniformMap);
    expect(c.renderState).toBe(renderState);
    expect(c.framebuffer).toBe(framebuffer);
    expect(c.pass).toEqual(pass);
    expect(c.executeInClosestFrustum).toEqual(true);
    expect(c.owner).toBe(owner);
    expect(c.debugShowBoundingVolume).toEqual(true);
    expect(c.debugOverlappingFrustums).toEqual(0);
    expect(c.castShadows).toEqual(true);
    expect(c.receiveShadows).toEqual(true);
    expect(c.pickId).toBe(pickId);
    expect(c.pickOnly).toEqual(true);
  });

  it("shallow clones", function () {
    const c = new DrawCommand({
      boundingVolume: {},
      orientedBoundingBox: {},
      cull: false,
      occlude: false,
      modelMatrix: {},
      primitiveType: PrimitiveType.TRIANGLE_FAN,
      vertexArray: {},
      count: 3,
      offset: 3,
      instanceCount: 2,
      shaderProgram: {},
      uniformMap: {},
      renderState: {},
      framebuffer: {},
      pass: Pass.TRANSLUCENT,
      executeInClosestFrustum: true,
      owner: {},
      debugShowBoundingVolume: true,
      castShadows: true,
      receiveShadows: true,
      pickId: {},
      pickOnly: true,
    });

    const clone = DrawCommand.shallowClone(c);

    expect(clone.boundingVolume).toBe(c.boundingVolume);
    expect(clone.orientedBoundingBox).toBe(c.orientedBoundingBox);
    expect(clone.cull).toEqual(c.cull);
    expect(clone.occlude).toEqual(c.occlude);
    expect(clone.modelMatrix).toBe(c.modelMatrix);
    expect(clone.primitiveType).toEqual(c.primitiveType);
    expect(clone.vertexArray).toBe(c.vertexArray);
    expect(clone.count).toEqual(c.count);
    expect(clone.offset).toEqual(c.offset);
    expect(clone.instanceCount).toEqual(c.instanceCount);
    expect(clone.shaderProgram).toBe(c.shaderProgram);
    expect(clone.uniformMap).toBe(c.uniformMap);
    expect(clone.renderState).toBe(c.renderState);
    expect(clone.framebuffer).toBe(c.framebuffer);
    expect(clone.pass).toEqual(c.pass);
    expect(clone.executeInClosestFrustum).toEqual(c.executeInClosestFrustum);
    expect(clone.owner).toBe(c.owner);
    expect(clone.debugShowBoundingVolume).toEqual(c.debugShowBoundingVolume);
    expect(clone.debugOverlappingFrustums).toEqual(c.debugOverlappingFrustums);
    expect(clone.castShadows).toEqual(c.castShadows);
    expect(clone.receiveShadows).toEqual(c.receiveShadows);
    expect(clone.pickId).toBe(c.pickId);
    expect(clone.pickOnly).toBe(c.pickOnly);
  });

  it("shallow clones with result", function () {
    const c = new DrawCommand({
      boundingVolume: {},
      orientedBoundingBox: {},
      cull: false,
      occlude: false,
      modelMatrix: {},
      primitiveType: PrimitiveType.TRIANGLE_FAN,
      vertexArray: {},
      count: 3,
      offset: 3,
      instanceCount: 2,
      shaderProgram: {},
      uniformMap: {},
      renderState: {},
      framebuffer: {},
      pass: Pass.TRANSLUCENT,
      executeInClosestFrustum: true,
      owner: {},
      debugShowBoundingVolume: true,
      castShadows: true,
      receiveShadows: true,
      pickId: {},
      pickOnly: true,
    });

    const result = new DrawCommand();
    const clone = DrawCommand.shallowClone(c, result);

    expect(result).toBe(clone);
    expect(clone.boundingVolume).toBe(c.boundingVolume);
    expect(clone.orientedBoundingBox).toBe(c.orientedBoundingBox);
    expect(clone.cull).toEqual(c.cull);
    expect(clone.occlude).toEqual(c.occlude);
    expect(clone.modelMatrix).toBe(c.modelMatrix);
    expect(clone.primitiveType).toEqual(c.primitiveType);
    expect(clone.vertexArray).toBe(c.vertexArray);
    expect(clone.count).toEqual(c.count);
    expect(clone.offset).toEqual(c.offset);
    expect(clone.instanceCount).toEqual(c.instanceCount);
    expect(clone.shaderProgram).toBe(c.shaderProgram);
    expect(clone.uniformMap).toBe(c.uniformMap);
    expect(clone.renderState).toBe(c.renderState);
    expect(clone.framebuffer).toBe(c.framebuffer);
    expect(clone.pass).toEqual(c.pass);
    expect(clone.executeInClosestFrustum).toEqual(c.executeInClosestFrustum);
    expect(clone.owner).toBe(c.owner);
    expect(clone.debugShowBoundingVolume).toEqual(c.debugShowBoundingVolume);
    expect(clone.debugOverlappingFrustums).toEqual(c.debugOverlappingFrustums);
    expect(clone.castShadows).toEqual(c.castShadows);
    expect(clone.receiveShadows).toEqual(c.receiveShadows);
    expect(clone.pickId).toBe(c.pickId);
    expect(clone.pickOnly).toBe(c.pickOnly);
  });

  it("shallow clone returns undefined", function () {
    expect(DrawCommand.shallowClone()).toBeUndefined();
  });
});
