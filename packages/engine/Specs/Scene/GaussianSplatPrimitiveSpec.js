// import {
//   PrimitiveType,
//   DrawCommand,
//   GaussianSplatPrimitive,
//   GaussianSplatRenderResources,
//   ShaderDestination,
//   GeometryAttribute,
//   VertexArray,
//   BoundingSphere,
//   Cartesian3,
//   BlendingState,
//   ResourceCache,
//   Matrix4,
// } from "../../index.js";

// import Cesium3DTilesTester from "../../../../Specs/Cesium3DTilesTester.js";
// import ShaderBuilderTester from "../../../../Specs/ShaderBuilderTester.js";
// import waitForLoaderProcess from "../../../../Specs/waitForLoaderProcess.js";
// import createContext from "../../../../Specs/createContext.js";
// import createScene from "../../../../Specs/createScene.js";
// import Cesium3DTile from "../../Source/Scene/Cesium3DTile.js";

// describe("Scene/GaussianSplatPrimitive", function () {
//   describe("buildGSplatDrawCommand", function () {
//     let primitive;
//     let scene;
//     let context;

//     beforeAll(function () {
//       scene = createScene();
//       context = createContext();
//     });

//     afterAll(function () {
//       scene.destroyForSpecs();
//       context.destroyForSpecs();
//     });

//     async function loadTileset() {
//       const tileset = await GaussianSplatPrimitive.fromUrl(
//         "./Data/Cesium3DTiles/GaussianSplats/talon/tileset.json",
//       );
//       scene.primitives.add(tileset);
//       await Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
//       return tileset;
//     }

//     // beforeEach(function () {
//     //   primitive = loadTileset();
//     // });

//     afterEach(function () {

//       primitive.destroy();
//       primitive = undefined;
//       ResourceCache.clearForSpecs();
//     });

//     it("creates a DrawCommand with correct properties", function () {
//       return loadTileset().then(function(primitive) {
//       Cesium3DTilesTester.waitForTilesLoaded(scene, primitive).then(() => {
//       GaussianSplatPrimitive.buildGSplatDrawCommand(primitive, scene.frameState);

//       expect(primitive._drawCommand).toBeInstanceOf(DrawCommand);
//       expect(primitive._drawCommand.boundingVolume).toBe(
//         primitive._tileset.boundingSphere,
//       );
//       expect(primitive._drawCommand.modelMatrix).toBe(primitive._modelMatrix);
//       expect(primitive._drawCommand.uniformMap.u_splatScale()).toBe(
//         primitive.splatScale,
//       );
//       expect(primitive._drawCommand.uniformMap.u_splatAttributeTexture()).toBe(
//         primitive.gaussianSplatTexture,
//       );
//       expect(primitive._drawCommand.primitiveType).toBe(
//         PrimitiveType.TRIANGLE_STRIP,
//       );
//     });});});

//     it("configures shaderBuilder with correct defines and attributes", function () {
//       return loadTileset().then(function(primitive) {
//       const shaderBuilder = new GaussianSplatRenderResources(primitive)
//         .shaderBuilder;

//         GaussianSplatPrimitive.buildGSplatDrawCommand(primitive, scene.frameState);

//       expect(shaderBuilder.addDefine).toHaveBeenCalledWith(
//         "HAS_GAUSSIAN_SPLATS",
//         undefined,
//         ShaderDestination.BOTH,
//       );
//       expect(shaderBuilder.addDefine).toHaveBeenCalledWith(
//         "HAS_SPLAT_TEXTURE",
//         undefined,
//         ShaderDestination.BOTH,
//       );
//       expect(shaderBuilder.addAttribute).toHaveBeenCalledWith(
//         "float",
//         "a_splatIndex",
//       );
//     });});

//     it("configures renderStateOptions correctly", function () {
//       return loadTileset().then(function(primitive) {
//       const renderResources = new GaussianSplatRenderResources(primitive);

//       GaussianSplatPrimitive.buildGSplatDrawCommand(primitive, scene.frameState);

//       expect(renderResources.renderStateOptions.cull.enabled).toBe(false);
//       expect(renderResources.renderStateOptions.depthMask).toBe(true);
//       expect(renderResources.renderStateOptions.depthTest.enabled).toBe(true);
//       expect(renderResources.renderStateOptions.blending).toBe(
//         BlendingState.PRE_MULTIPLIED_ALPHA_BLEND,
//       );
//     });});

//     it("handles debugShowBoundingVolume correctly", function () {
//       return loadTileset().then(function(primitive) {
//       primitive.debugShowBoundingVolume = true;

//       GaussianSplatPrimitive.buildGSplatDrawCommand(primitive, scene.frameState);

//       const shaderBuilder = new GaussianSplatRenderResources(primitive)
//         .shaderBuilder;
//       expect(shaderBuilder.addDefine).toHaveBeenCalledWith(
//         "DEBUG_BOUNDING_VOLUMES",
//         undefined,
//         ShaderDestination.BOTH,
//       );
//     });});

//     it("creates geometry with correct attributes", function () {
//       return loadTileset().then(function(primitive) {
//       GaussianSplatPrimitive.buildGSplatDrawCommand(primitive, scene.frameState);

//       const geometry =
//         VertexArray.fromGeometry.calls.mostRecent().args[0].geometry;
//       expect(geometry.attributes.screenQuadPosition).toBeInstanceOf(
//         GeometryAttribute,
//       );
//       expect(geometry.attributes.splatIndex).toBeInstanceOf(GeometryAttribute);
//       expect(geometry.primitiveType).toBe(PrimitiveType.TRIANGLE_STRIP);
//     });});
//   });
// });
