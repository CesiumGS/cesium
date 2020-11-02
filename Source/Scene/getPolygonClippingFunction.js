/**
 * Obtain the GLSL fragment shader functions for performing the
 * clipping polygon operations.
 *
 * @returns {String} A string containing GLSL functions for
 * retrieving the clipping polygon data textures.
 * @private
 */

function getClippingPolygonFunction(union) {
  return (
    "  uniform vec3 u_clippingPolygonBoundingBox[4];\n" +
    "  uniform vec2 u_clippingPolygonCellDimensions;\n" +
    "  uniform sampler2D u_clippingPolygonAccelerationGrid;\n" +
    "  uniform sampler2D u_clippingPolygonMeshPositions;\n" +
    "  uniform sampler2D u_clippingPolygonOverlappingTriangleIndices;\n" +
    "  uniform vec2 u_clippingPolygonAccelerationGridPixelDimensions;\n" +
    "  uniform vec2 u_clippingPolygonOverlappingTrianglePixelIndicesDimensions;\n" +
    "  uniform vec2 u_clippingPolygonMeshPositionPixelDimensions;\n" +
    "  uniform mat4 u_clippingPolygonEyeToWorldToENU;\n" +
    "  uniform float u_clippingPolygonMinimumZ;\n" +
    "\n" +
    "  #define CLIPPING_POLYGON_BBOX_TOP_LEFT u_clippingPolygonBoundingBox[0]\n" +
    "  #define CLIPPING_POLYGON_BBOX_TOP_RIGHT u_clippingPolygonBoundingBox[1]\n" +
    "  #define CLIPPING_POLYGON_BBOX_BTM_RIGHT u_clippingPolygonBoundingBox[2]\n" +
    "  #define CLIPPING_POLYGON_BBOX_BTM_LEFT u_clippingPolygonBoundingBox[3]\n" +
    "  #define CLIPPING_POLYGON_BBOX_WIDTH (CLIPPING_POLYGON_BBOX_TOP_RIGHT.x - CLIPPING_POLYGON_BBOX_TOP_LEFT.x)\n" +
    "  #define CLIPPING_POLYGON_BBOX_HEIGHT (CLIPPING_POLYGON_BBOX_TOP_RIGHT.y - CLIPPING_POLYGON_BBOX_BTM_RIGHT.y)\n" +
    "  #define CLIPPING_POLYGON_NO_OCCLUSION 1.0\n" +
    "  #define CLIPPING_POLYGON_PARTIAL_OCCLUSION 2.0\n" +
    "  #define CLIPPING_POLYGON_TOTAL_OCCLUSION 3.0\n" +
    "  // if the iteration gets anywhere near this number expect 0fps\n" +
    "  #define CLIPPING_MAX_ITERATION 8388608\n" +
    ((union ? "#define CLIPPING_POLYGON_UNION" : "") + "\n") +
    "  float scale(float number, float oldMin, float oldMax, float newMin, float newMax)\n" +
    "  {\n" +
    "    return (((newMax - newMin) * (number - oldMin)) / (oldMax - oldMin)) + newMin;\n" +
    "  }\n" +
    "\n" +
    "  float sign (vec2 p1, vec2 p2, vec2 p3)\n" +
    "  {\n" +
    "    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);\n" +
    "  }\n" +
    "\n" +
    "  // https://stackoverflow.com/a/2049593\n" +
    "  bool pointInTriangle(vec2 p, vec2 v1, vec2 v2, vec2 v3)\n" +
    "  {\n" +
    "      float d1, d2, d3;\n" +
    "      bool has_neg, has_pos;\n" +
    "\n" +
    "      d1 = sign(p, v1, v2);\n" +
    "      d2 = sign(p, v2, v3);\n" +
    "      d3 = sign(p, v3, v1);\n" +
    "\n" +
    "      has_neg = (d1 < 0.0) || (d2 < 0.0) || (d3 < 0.0);\n" +
    "      has_pos = (d1 > 0.0) || (d2 > 0.0) || (d3 > 0.0);\n" +
    "\n" +
    "      return !(has_neg && has_pos);\n" +
    "  }\n" +
    "\n" +
    "  float modI(float a,float b) {\n" +
    "      float m = a - floor((a+0.5) / b) * b;\n" +
    "      return floor(m + 0.5);\n" +
    "  }\n" +
    "\n" +
    "  bool isWorldPositionInsideAnyTriangle(vec2 worldPos, float startIndex, float endIndex)\n" +
    "  {\n" +
    "      float overlappingTriangleIndex = startIndex;\n" +
    "      int numTrianglesToCheck = int((endIndex - startIndex) / 3.0);\n" +
    "      float overlapPixelWidth = u_clippingPolygonOverlappingTrianglePixelIndicesDimensions.x;\n" +
    "      float overlapPixelHeight = u_clippingPolygonOverlappingTrianglePixelIndicesDimensions.y;\n" +
    "      float meshPositionsPixelWidth = u_clippingPolygonMeshPositionPixelDimensions.x;\n" +
    "      float meshPositionsPixelHeight = u_clippingPolygonMeshPositionPixelDimensions.y;\n" +
    "\n" +
    "      for (int k = 0; k < CLIPPING_MAX_ITERATION; k++)\n" +
    "      {\n" +
    "          if  (k >= numTrianglesToCheck)\n" +
    "          {\n" +
    "              break;\n" +
    "          }\n" +
    "\n" +
    "          // look up the relevant indices for the current triangle\n" +
    "          float overlapPixelIndex1D = overlappingTriangleIndex / 3.0;\n" +
    "          float overlapPixelIndexColumn = modI(overlapPixelIndex1D, overlapPixelWidth);\n" +
    "          float overlapPixelIndexRow = floor(overlapPixelIndex1D / overlapPixelWidth);\n" +
    "          float overlapPixelIndexColumnPixel = (overlapPixelIndexColumn + 0.5) / overlapPixelWidth;\n" +
    "          float overlapPixelIndexRowPixel = (((overlapPixelHeight - 1.0) - overlapPixelIndexRow) + 0.5) / overlapPixelHeight;\n" +
    "          vec4 overlapIndices = texture2D(\n" +
    "            u_clippingPolygonOverlappingTriangleIndices, vec2(overlapPixelIndexColumnPixel, overlapPixelIndexRowPixel)\n" +
    "          );\n" +
    "\n" +
    "          // use the relevant 1D indices to look up the actual triangle mesh data in the 2D mesh positions texture\n" +
    "          float v0PixelIndex1D = overlapIndices.x;\n" +
    "          float v1PixelIndex1D = overlapIndices.y;\n" +
    "          float v2PixelIndex1D = overlapIndices.z;\n" +
    "\n" +
    "          float v0PixelIndexColumn = modI(v0PixelIndex1D, meshPositionsPixelWidth);\n" +
    "          float v0PixelIndexRow = floor(v0PixelIndex1D / meshPositionsPixelWidth);\n" +
    "          float v0PixelIndexColumnPixel = (v0PixelIndexColumn + 0.5) / meshPositionsPixelWidth;\n" +
    "          float v0PixelIndexRowPixel = (((meshPositionsPixelHeight - 1.0) - v0PixelIndexRow) + 0.5) / meshPositionsPixelHeight;\n" +
    "          vec2 v0PixelIndex = vec2(v0PixelIndexColumnPixel, v0PixelIndexRowPixel);\n" +
    "\n" +
    "          float v1PixelIndexColumn = modI(v1PixelIndex1D, meshPositionsPixelWidth);\n" +
    "          float v1PixelIndexRow = floor(v1PixelIndex1D / meshPositionsPixelWidth);\n" +
    "          float v1PixelIndexColumnPixel = (v1PixelIndexColumn + 0.5) / meshPositionsPixelWidth;\n" +
    "          float v1PixelIndexRowPixel = (((meshPositionsPixelHeight - 1.0) - v1PixelIndexRow) + 0.5) / meshPositionsPixelHeight;\n" +
    "          vec2 v1PixelIndex = vec2(v1PixelIndexColumnPixel, v1PixelIndexRowPixel);\n" +
    "\n" +
    "          float v2PixelIndexColumn = modI(v2PixelIndex1D, meshPositionsPixelWidth);\n" +
    "          float v2PixelIndexRow = floor(v2PixelIndex1D / meshPositionsPixelWidth);\n" +
    "          float v2PixelIndexColumnPixel = (v2PixelIndexColumn + 0.5) / meshPositionsPixelWidth;\n" +
    "          float v2PixelIndexRowPixel = (((meshPositionsPixelHeight - 1.0) - v2PixelIndexRow) + 0.5) / meshPositionsPixelHeight;\n" +
    "          vec2 v2PixelIndex = vec2(v2PixelIndexColumnPixel, v2PixelIndexRowPixel);\n" +
    "\n" +
    "          vec2 v0 = texture2D(u_clippingPolygonMeshPositions, v0PixelIndex).xy;\n" +
    "          vec2 v1 = texture2D(u_clippingPolygonMeshPositions, v1PixelIndex).xy;\n" +
    "          vec2 v2 = texture2D(u_clippingPolygonMeshPositions, v2PixelIndex).xy;\n" +
    "\n" +
    "          if (pointInTriangle(worldPos, v0, v1, v2))\n" +
    "          {\n" +
    "              return true;\n" +
    "          }\n" +
    "\n" +
    "          overlappingTriangleIndex += 3.0;\n" +
    "      }\n" +
    "\n" +
    "      return false;\n" +
    "  }\n" +
    "\n" +
    "  bool pointInsideBoundingBox(vec2 p)\n" +
    "  {\n" +
    "      vec3 topLeft = CLIPPING_POLYGON_BBOX_TOP_LEFT;\n" +
    "      vec3 topRight = CLIPPING_POLYGON_BBOX_TOP_RIGHT;\n" +
    "      vec3 btmRight = CLIPPING_POLYGON_BBOX_BTM_RIGHT;\n" +
    "      vec3 btmLeft = CLIPPING_POLYGON_BBOX_BTM_LEFT;\n" +
    "      bool rightWall = p.x <= topRight.x;\n" +
    "      bool leftWall = p.x >= topLeft.x;\n" +
    "      bool topWall = p.y <= topLeft.y;\n" +
    "      bool btmWall = p.y >= btmLeft.y;\n" +
    "      return leftWall && rightWall && topWall && btmWall;\n" +
    "  }\n" +
    "\n" +
    "  void clippingPolygon(vec3 worldPos)\n" +
    "  {\n" +
    "      if (worldPos.z < u_clippingPolygonMinimumZ || !pointInsideBoundingBox(worldPos.xy))\n" +
    "      {\n" +
    "          #ifndef CLIPPING_POLYGON_UNION\n" +
    "          return;\n" +
    "          #else\n" +
    "          discard;\n" +
    "          #endif\n" +
    "      }\n" +
    "\n" +
    "      float screenX = scale(worldPos.x, CLIPPING_POLYGON_BBOX_TOP_LEFT.x, CLIPPING_POLYGON_BBOX_TOP_RIGHT.x, 0.0, CLIPPING_POLYGON_BBOX_WIDTH);\n" +
    "      float screenY = scale(worldPos.y, CLIPPING_POLYGON_BBOX_BTM_RIGHT.y, CLIPPING_POLYGON_BBOX_TOP_RIGHT.y, 0.0, CLIPPING_POLYGON_BBOX_HEIGHT);\n" +
    "      float row = floor(screenY / u_clippingPolygonCellDimensions.y);\n" +
    "      float col = floor(screenX / u_clippingPolygonCellDimensions.x);\n" +
    "\n" +
    "      float gridPixelXIndex = (col + 0.5) / u_clippingPolygonAccelerationGridPixelDimensions.x;\n" +
    "      float gridPixelYIndex = (row + 0.5) / u_clippingPolygonAccelerationGridPixelDimensions.y;\n" +
    "\n" +
    "      vec3 gridCell = texture2D(u_clippingPolygonAccelerationGrid, vec2(gridPixelXIndex, gridPixelYIndex)).xyz;\n" +
    "\n" +
    "      if (gridCell.r == CLIPPING_POLYGON_NO_OCCLUSION)\n" +
    "      {\n" +
    "          #ifdef CLIPPING_POLYGON_UNION\n" +
    "          discard;\n" +
    "          #else\n" +
    "          return;\n" +
    "          #endif\n" +
    "      }\n" +
    "\n" +
    "      if (gridCell.r == CLIPPING_POLYGON_TOTAL_OCCLUSION)\n" +
    "      {\n" +
    "          #ifdef CLIPPING_POLYGON_UNION\n" +
    "          return;\n" +
    "          #else\n" +
    "          discard;\n" +
    "          #endif\n" +
    "      }\n" +
    "\n" +
    "      if (isWorldPositionInsideAnyTriangle(worldPos.xy, gridCell.g, gridCell.b))\n" +
    "      {\n" +
    "          #ifdef CLIPPING_POLYGON_UNION\n" +
    "          return;\n" +
    "          #else\n" +
    "          discard;\n" +
    "          #endif\n" +
    "      }\n" +
    "\n" +
    "      #ifdef CLIPPING_POLYGON_UNION\n" +
    "      discard;\n" +
    "      #endif\n" +
    "  }\n"
  );
}

export default getClippingPolygonFunction;
