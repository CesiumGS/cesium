/**
 * Gets the GLSL functions needed to retrieve clipping polygons
 * ClippingPolygon's textures.
 *
 * @returns {String} A string containing GLSL functions for retrieving clipping planes.
 * @private
 */

function getClippingPolygonFunction(union) {
  return `
  uniform vec3 u_clippingPolygonBoundingBox[4];
  uniform vec2 u_clippingPolygonCellDimensions;
  uniform sampler2D u_clippingPolygonAccelerationGrid;
  uniform sampler2D u_clippingPolygonMeshPositions;
  uniform sampler2D u_clippingPolygonOverlappingTriangleIndices;
  uniform vec2 u_clippingPolygonAccelerationGridPixelDimensions;
  uniform vec2 u_clippingPolygonOverlappingTrianglePixelIndicesDimensions;
  uniform vec2 u_clippingPolygonMeshPositionPixelDimensions;
  uniform mat4 u_clippingPolygonEyeToWorldToENU;
  uniform float u_clippingPolygonMinimumZ;

  #define CLIPPING_POLYGON_BBOX_TOP_LEFT u_clippingPolygonBoundingBox[0]
  #define CLIPPING_POLYGON_BBOX_TOP_RIGHT u_clippingPolygonBoundingBox[1]
  #define CLIPPING_POLYGON_BBOX_BTM_RIGHT u_clippingPolygonBoundingBox[2]
  #define CLIPPING_POLYGON_BBOX_BTM_LEFT u_clippingPolygonBoundingBox[3]
  #define CLIPPING_POLYGON_BBOX_WIDTH (CLIPPING_POLYGON_BBOX_TOP_RIGHT.x - CLIPPING_POLYGON_BBOX_TOP_LEFT.x)
  #define CLIPPING_POLYGON_BBOX_HEIGHT (CLIPPING_POLYGON_BBOX_TOP_RIGHT.y - CLIPPING_POLYGON_BBOX_BTM_RIGHT.y)
  #define CLIPPING_POLYGON_NO_OCCLUSION 1.0
  #define CLIPPING_POLYGON_PARTIAL_OCCLUSION 2.0
  #define CLIPPING_POLYGON_TOTAL_OCCLUSION 3.0
  // if the iteration gets anywhere near this number expect 0fps
  #define CLIPPING_MAX_ITERATION 8388608
  ${union ? "#define CLIPPING_POLYGON_UNION" : ""}
  float scale(float number, float oldMin, float oldMax, float newMin, float newMax)
  {
    return (((newMax - newMin) * (number - oldMin)) / (oldMax - oldMin)) + newMin;
  }

  float sign (vec2 p1, vec2 p2, vec2 p3)
  {
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  }

  // https://stackoverflow.com/a/2049593
  bool pointInTriangle(vec2 p, vec2 v1, vec2 v2, vec2 v3)
  {
      float d1, d2, d3;
      bool has_neg, has_pos;

      d1 = sign(p, v1, v2);
      d2 = sign(p, v2, v3);
      d3 = sign(p, v3, v1);

      has_neg = (d1 < 0.0) || (d2 < 0.0) || (d3 < 0.0);
      has_pos = (d1 > 0.0) || (d2 > 0.0) || (d3 > 0.0);

      return !(has_neg && has_pos);
  }

  float modI(float a,float b) {
      float m = a - floor((a+0.5) / b) * b;
      return floor(m + 0.5);
  }

  bool isWorldPositionInsideAnyTriangle(vec2 worldPos, float startIndex, float endIndex)
  {
      float overlappingTriangleIndex = startIndex;
      int numTrianglesToCheck = int((endIndex - startIndex) / 3.0);

      for (int k = 0; k < CLIPPING_MAX_ITERATION; k++)
      {
          if  (k >= numTrianglesToCheck)
          {
              break;
          }

          float oneDPixelIndex = overlappingTriangleIndex / 3.0;

          // convert 1D pixel coordinates into 2D pixel coordinates
          float overlapPixelX =
          (modI(oneDPixelIndex, u_clippingPolygonOverlappingTrianglePixelIndicesDimensions.x) + 0.5) /
              u_clippingPolygonOverlappingTrianglePixelIndicesDimensions.x;

          float overlapPixelY =
          (1.0 - (floor(oneDPixelIndex / u_clippingPolygonOverlappingTrianglePixelIndicesDimensions.y) + 0.5)) /
              u_clippingPolygonOverlappingTrianglePixelIndicesDimensions.y;

          // grab the relevant verticies for the given triangle in question.
          vec4 overlapIndices = texture2D(u_clippingPolygonOverlappingTriangleIndices, vec2(overlapPixelX, overlapPixelY));

          // convert each mesh index from a 1D index into a 2D pixel coordinate into u_clippingPolygonMeshPositions
          vec2 v0PixelIndex = vec2(
              (modI(overlapIndices.x, u_clippingPolygonMeshPositionPixelDimensions.x) + 0.5) /
              u_clippingPolygonMeshPositionPixelDimensions.x,
              (1.0 - (floor(overlapIndices.x / u_clippingPolygonMeshPositionPixelDimensions.y) + 0.5)) /
              u_clippingPolygonMeshPositionPixelDimensions.y
          );

          vec2 v1PixelIndex = vec2(
              (modI(overlapIndices.y, u_clippingPolygonMeshPositionPixelDimensions.x) + 0.5) /
              u_clippingPolygonMeshPositionPixelDimensions.x,
              (1.0 - (floor(overlapIndices.y / u_clippingPolygonMeshPositionPixelDimensions.y) + 0.5)) /
              u_clippingPolygonMeshPositionPixelDimensions.y
          );

          vec2 v2PixelIndex = vec2(
              (modI(overlapIndices.z, u_clippingPolygonMeshPositionPixelDimensions.x) + 0.5) /
              u_clippingPolygonMeshPositionPixelDimensions.x,
              (1.0 - (floor(overlapIndices.z / u_clippingPolygonMeshPositionPixelDimensions.y) + 0.5)) /
              u_clippingPolygonMeshPositionPixelDimensions.y
          );

          vec2 v0 = texture2D(u_clippingPolygonMeshPositions, v0PixelIndex).xy;
          vec2 v1 = texture2D(u_clippingPolygonMeshPositions, v1PixelIndex).xy;
          vec2 v2 = texture2D(u_clippingPolygonMeshPositions, v2PixelIndex).xy;

          if (pointInTriangle(worldPos, v0, v1, v2))
          {
              return true;
          }

          overlappingTriangleIndex += 3.0;
      }

      return false;
  }

  bool pointInsideBoundingBox(vec2 p)
  {
      vec3 topLeft = CLIPPING_POLYGON_BBOX_TOP_LEFT;
      vec3 topRight = CLIPPING_POLYGON_BBOX_TOP_RIGHT;
      vec3 btmRight = CLIPPING_POLYGON_BBOX_BTM_RIGHT;
      vec3 btmLeft = CLIPPING_POLYGON_BBOX_BTM_LEFT;
      bool rightWall = p.x <= topRight.x;
      bool leftWall = p.x >= topLeft.x;
      bool topWall = p.y <= topLeft.y;
      bool btmWall = p.y >= btmLeft.y;
      return leftWall && rightWall && topWall && btmWall;
  }

  void clippingPolygon(vec3 worldPos)
  {
      if (worldPos.z < u_clippingPolygonMinimumZ || !pointInsideBoundingBox(worldPos.xy))
      {
          #ifndef CLIPPING_POLYGON_UNION
          return;
          #else
          discard;
          #endif
      }

      float screenX = scale(worldPos.x, CLIPPING_POLYGON_BBOX_TOP_LEFT.x, CLIPPING_POLYGON_BBOX_TOP_RIGHT.x, 0.0, CLIPPING_POLYGON_BBOX_WIDTH);
      float screenY = scale(worldPos.y, CLIPPING_POLYGON_BBOX_BTM_RIGHT.y, CLIPPING_POLYGON_BBOX_TOP_RIGHT.y, 0.0, CLIPPING_POLYGON_BBOX_HEIGHT);
      float row = floor(screenY / u_clippingPolygonCellDimensions.y);
      float col = floor(screenX / u_clippingPolygonCellDimensions.x);

      float gridPixelXIndex = (col + 0.5) / u_clippingPolygonAccelerationGridPixelDimensions.x;
      float gridPixelYIndex = (row + 0.5) / u_clippingPolygonAccelerationGridPixelDimensions.y;

      vec3 gridCell = texture2D(u_clippingPolygonAccelerationGrid, vec2(gridPixelXIndex, gridPixelYIndex)).xyz;

      if (gridCell.r == CLIPPING_POLYGON_NO_OCCLUSION)
      {
          #ifdef CLIPPING_POLYGON_UNION
          discard;
          #else
          return;
          #endif
      }

      if (gridCell.r == CLIPPING_POLYGON_TOTAL_OCCLUSION)
      {
          #ifdef CLIPPING_POLYGON_UNION
          return;
          #else
          discard;
          #endif
      }

      if (isWorldPositionInsideAnyTriangle(worldPos.xy, gridCell.g, gridCell.b))
      {
          #ifdef CLIPPING_POLYGON_UNION
          return;
          #else
          discard;
          #endif
      }

      #ifdef CLIPPING_POLYGON_UNION
      discard;
      #endif
  }
  `;
}

/*
function getClippingPolygonFunction(union) {
  return "" +
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
     (union ? "#define CLIPPING_POLYGON_UNION\n" : "\n")  +
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
  "\n" +
  "      for (int k = 0; k < CLIPPING_MAX_ITERATION; k++)\n" +
  "      {\n" +
  "          if  (k >= numTrianglesToCheck)\n" +
  "          {\n" +
  "              break;\n" +
  "          }\n" +
  "\n" +
  "          float oneDPixelIndex = overlappingTriangleIndex / 3.0;\n" +
  "\n" +
  "          // convert 1D pixel coordinates into 2D pixel coordinates\n" +
  "          float overlapPixelX =\n" +
  "          (modI(oneDPixelIndex, u_clippingPolygonOverlappingTrianglePixelIndicesDimensions.x) + 0.5) /\n" +
  "              u_clippingPolygonOverlappingTrianglePixelIndicesDimensions.x;\n" +
  "\n" +
  "          float overlapPixelY =\n" +
  "          (1.0 - (floor(oneDPixelIndex / u_clippingPolygonOverlappingTrianglePixelIndicesDimensions.y) + 0.5)) /\n" +
  "              u_clippingPolygonOverlappingTrianglePixelIndicesDimensions.y;\n" +
  "\n" +
  "          // grab the relevant verticies for the given triangle in question.\n" +
  "          vec4 overlapIndices = texture2D(u_clippingPolygonOverlappingTriangleIndices, vec2(overlapPixelX, overlapPixelY));\n" +
  "\n" +
  "          // convert each mesh index from a 1D index into a 2D pixel coordinate into u_clippingPolygonMeshPositions\n" +
  "          vec2 v0PixelIndex = vec2(\n" +
  "              (modI(overlapIndices.x, u_clippingPolygonMeshPositionPixelDimensions.x) + 0.5) /\n" +
  "              u_clippingPolygonMeshPositionPixelDimensions.x,\n" +
  "              (1.0 - (floor(overlapIndices.x / u_clippingPolygonMeshPositionPixelDimensions.y) + 0.5)) /\n" +
  "              u_clippingPolygonMeshPositionPixelDimensions.y\n" +
  "          );\n" +
  "\n" +
  "          vec2 v1PixelIndex = vec2(\n" +
  "              (modI(overlapIndices.y, u_clippingPolygonMeshPositionPixelDimensions.x) + 0.5) /\n" +
  "              u_clippingPolygonMeshPositionPixelDimensions.x,\n" +
  "              (1.0 - (floor(overlapIndices.y / u_clippingPolygonMeshPositionPixelDimensions.y) + 0.5)) /\n" +
  "              u_clippingPolygonMeshPositionPixelDimensions.y\n" +
  "          );\n" +
  "\n" +
  "          vec2 v2PixelIndex = vec2(\n" +
  "              (modI(overlapIndices.z, u_clippingPolygonMeshPositionPixelDimensions.x) + 0.5) /\n" +
  "              u_clippingPolygonMeshPositionPixelDimensions.x,\n" +
  "              (1.0 - (floor(overlapIndices.z / u_clippingPolygonMeshPositionPixelDimensions.y) + 0.5)) /\n" +
  "              u_clippingPolygonMeshPositionPixelDimensions.y\n" +
  "          );\n" +
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
}
 */

export default getClippingPolygonFunction;
