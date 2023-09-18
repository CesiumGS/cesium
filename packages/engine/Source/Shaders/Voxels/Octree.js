//This file is automatically rebuilt by the Cesium build process.
export default "// These octree flags must be in sync with GpuOctreeFlag in VoxelTraversal.js\n\
#define OCTREE_FLAG_INTERNAL 0\n\
#define OCTREE_FLAG_LEAF 1\n\
#define OCTREE_FLAG_PACKED_LEAF_FROM_PARENT 2\n\
\n\
#define OCTREE_MAX_LEVELS 32 // Harcoded value because GLSL doesn't like variable length loops\n\
\n\
uniform sampler2D u_octreeInternalNodeTexture;\n\
uniform vec2 u_octreeInternalNodeTexelSizeUv;\n\
uniform int u_octreeInternalNodeTilesPerRow;\n\
#if (SAMPLE_COUNT > 1)\n\
uniform sampler2D u_octreeLeafNodeTexture;\n\
uniform vec2 u_octreeLeafNodeTexelSizeUv;\n\
uniform int u_octreeLeafNodeTilesPerRow;\n\
#endif\n\
\n\
struct OctreeNodeData {\n\
    int data;\n\
    int flag;\n\
};\n\
\n\
struct TraversalData {\n\
    ivec4 octreeCoords;\n\
    int parentOctreeIndex;\n\
};\n\
\n\
struct SampleData {\n\
    int megatextureIndex;\n\
    ivec4 tileCoords;\n\
    vec3 tileUv;\n\
    #if (SAMPLE_COUNT > 1)\n\
        float weight;\n\
    #endif\n\
};\n\
\n\
// Integer mod: For WebGL1 only\n\
int intMod(in int a, in int b) {\n\
    return a - (b * (a / b));\n\
}\n\
int normU8_toInt(in float value) {\n\
    return int(value * 255.0);\n\
}\n\
int normU8x2_toInt(in vec2 value) {\n\
    return int(value.x * 255.0) + 256 * int(value.y * 255.0);\n\
}\n\
float normU8x2_toFloat(in vec2 value) {\n\
    return float(normU8x2_toInt(value)) / 65535.0;\n\
}\n\
\n\
OctreeNodeData getOctreeNodeData(in vec2 octreeUv) {\n\
    vec4 texData = texture(u_octreeInternalNodeTexture, octreeUv);\n\
\n\
    OctreeNodeData data;\n\
    data.data = normU8x2_toInt(texData.xy);\n\
    data.flag = normU8x2_toInt(texData.zw);\n\
    return data;\n\
}\n\
\n\
OctreeNodeData getOctreeChildData(in int parentOctreeIndex, in ivec3 childCoord) {\n\
    int childIndex = childCoord.z * 4 + childCoord.y * 2 + childCoord.x;\n\
    int octreeCoordX = intMod(parentOctreeIndex, u_octreeInternalNodeTilesPerRow) * 9 + 1 + childIndex;\n\
    int octreeCoordY = parentOctreeIndex / u_octreeInternalNodeTilesPerRow;\n\
    vec2 octreeUv = u_octreeInternalNodeTexelSizeUv * vec2(float(octreeCoordX) + 0.5, float(octreeCoordY) + 0.5);\n\
    return getOctreeNodeData(octreeUv);\n\
}\n\
\n\
int getOctreeParentIndex(in int octreeIndex) {\n\
    int octreeCoordX = intMod(octreeIndex, u_octreeInternalNodeTilesPerRow) * 9;\n\
    int octreeCoordY = octreeIndex / u_octreeInternalNodeTilesPerRow;\n\
    vec2 octreeUv = u_octreeInternalNodeTexelSizeUv * vec2(float(octreeCoordX) + 0.5, float(octreeCoordY) + 0.5);\n\
    vec4 parentData = texture(u_octreeInternalNodeTexture, octreeUv);\n\
    int parentOctreeIndex = normU8x2_toInt(parentData.xy);\n\
    return parentOctreeIndex;\n\
}\n\
\n\
/**\n\
* Convert a position in the uv-space of the tileset bounding shape\n\
* into the uv-space of a tile within the tileset\n\
*/\n\
vec3 getTileUv(in vec3 shapePosition, in ivec4 octreeCoords) {\n\
	// PERFORMANCE_IDEA: use bit-shifting (only in WebGL2)\n\
    float dimAtLevel = pow(2.0, float(octreeCoords.w));\n\
    return shapePosition * dimAtLevel - vec3(octreeCoords.xyz);\n\
}\n\
\n\
void getOctreeLeafSampleData(in OctreeNodeData data, in ivec4 octreeCoords, out SampleData sampleData) {\n\
    sampleData.megatextureIndex = data.data;\n\
    sampleData.tileCoords = (data.flag == OCTREE_FLAG_PACKED_LEAF_FROM_PARENT)\n\
        ? ivec4(octreeCoords.xyz / 2, octreeCoords.w - 1)\n\
        : octreeCoords;\n\
}\n\
\n\
#if (SAMPLE_COUNT > 1)\n\
void getOctreeLeafSampleDatas(in OctreeNodeData data, in ivec4 octreeCoords, out SampleData sampleDatas[SAMPLE_COUNT]) {\n\
    int leafIndex = data.data;\n\
    int leafNodeTexelCount = 2;\n\
    // Adding 0.5 moves to the center of the texel\n\
    float leafCoordXStart = float(intMod(leafIndex, u_octreeLeafNodeTilesPerRow) * leafNodeTexelCount) + 0.5;\n\
    float leafCoordY = float(leafIndex / u_octreeLeafNodeTilesPerRow) + 0.5;\n\
\n\
    // Get an interpolation weight and a flag to determine whether to read the parent texture\n\
    vec2 leafUv0 = u_octreeLeafNodeTexelSizeUv * vec2(leafCoordXStart + 0.0, leafCoordY);\n\
    vec4 leafData0 = texture(u_octreeLeafNodeTexture, leafUv0);\n\
    float lerp = normU8x2_toFloat(leafData0.xy);\n\
    sampleDatas[0].weight = 1.0 - lerp;\n\
    sampleDatas[1].weight = lerp;\n\
    // TODO: this looks wrong? Should be comparing to OCTREE_FLAG_PACKED_LEAF_FROM_PARENT\n\
    sampleDatas[0].tileCoords = (normU8_toInt(leafData0.z) == 1)\n\
        ? ivec4(octreeCoords.xyz / 2, octreeCoords.w - 1)\n\
        : octreeCoords;\n\
    sampleDatas[1].tileCoords = (normU8_toInt(leafData0.w) == 1)\n\
        ? ivec4(octreeCoords.xyz / 2, octreeCoords.w - 1)\n\
        : octreeCoords;\n\
\n\
    // Get megatexture indices for both samples\n\
    vec2 leafUv1 = u_octreeLeafNodeTexelSizeUv * vec2(leafCoordXStart + 1.0, leafCoordY);\n\
    vec4 leafData1 = texture(u_octreeLeafNodeTexture, leafUv1);\n\
    sampleDatas[0].megatextureIndex = normU8x2_toInt(leafData1.xy);\n\
    sampleDatas[1].megatextureIndex = normU8x2_toInt(leafData1.zw);\n\
}\n\
#endif\n\
\n\
OctreeNodeData traverseOctreeDownwards(in vec3 shapePosition, inout TraversalData traversalData) {\n\
    float sizeAtLevel = 1.0 / pow(2.0, float(traversalData.octreeCoords.w));\n\
    vec3 start = vec3(traversalData.octreeCoords.xyz) * sizeAtLevel;\n\
    vec3 end = start + vec3(sizeAtLevel);\n\
    OctreeNodeData childData;\n\
\n\
    for (int i = 0; i < OCTREE_MAX_LEVELS; ++i) {\n\
        // Find out which octree child contains the position\n\
        // 0 if before center, 1 if after\n\
        vec3 center = 0.5 * (start + end);\n\
        vec3 childCoord = step(center, shapePosition);\n\
\n\
        // Get octree coords for the next level down\n\
        ivec4 octreeCoords = traversalData.octreeCoords;\n\
        traversalData.octreeCoords = ivec4(octreeCoords.xyz * 2 + ivec3(childCoord), octreeCoords.w + 1);\n\
\n\
        childData = getOctreeChildData(traversalData.parentOctreeIndex, ivec3(childCoord));\n\
\n\
        if (childData.flag != OCTREE_FLAG_INTERNAL) {\n\
            // leaf tile - stop traversing\n\
            break;\n\
        }\n\
\n\
        // interior tile - keep going deeper\n\
        start = mix(start, center, childCoord);\n\
        end = mix(center, end, childCoord);\n\
        traversalData.parentOctreeIndex = childData.data;\n\
    }\n\
\n\
    return childData;\n\
}\n\
\n\
/**\n\
* Transform a given position to an octree tile coordinate and a position within that tile,\n\
* and find the corresponding megatexture index and texture coordinates\n\
*/\n\
void traverseOctreeFromBeginning(in vec3 shapePosition, out TraversalData traversalData, out SampleData sampleDatas[SAMPLE_COUNT]) {\n\
    traversalData.octreeCoords = ivec4(0);\n\
    traversalData.parentOctreeIndex = 0;\n\
\n\
    OctreeNodeData nodeData = getOctreeNodeData(vec2(0.0));\n\
    if (nodeData.flag != OCTREE_FLAG_LEAF) {\n\
        nodeData = traverseOctreeDownwards(shapePosition, traversalData);\n\
    }\n\
\n\
    #if (SAMPLE_COUNT == 1)\n\
        getOctreeLeafSampleData(nodeData, traversalData.octreeCoords, sampleDatas[0]);\n\
        sampleDatas[0].tileUv = getTileUv(shapePosition, sampleDatas[0].tileCoords);\n\
    #else\n\
        getOctreeLeafSampleDatas(nodeData, traversalData.octreeCoords, sampleDatas);\n\
        sampleDatas[0].tileUv = getTileUv(shapePosition, sampleDatas[0].tileCoords);\n\
        sampleDatas[1].tileUv = getTileUv(shapePosition, sampleDatas[1].tileCoords);\n\
    #endif\n\
}\n\
\n\
bool inRange(in vec3 v, in vec3 minVal, in vec3 maxVal) {\n\
    return clamp(v, minVal, maxVal) == v;\n\
}\n\
\n\
bool insideTile(in vec3 shapePosition, in ivec4 octreeCoords) {\n\
    vec3 tileUv = getTileUv(shapePosition, octreeCoords);\n\
	bool inside = inRange(tileUv, vec3(0.0), vec3(1.0));\n\
	// Assume (!) the position is always inside the root tile.\n\
	return inside || octreeCoords.w == 0;\n\
}\n\
\n\
void traverseOctreeFromExisting(in vec3 shapePosition, inout TraversalData traversalData, inout SampleData sampleDatas[SAMPLE_COUNT]) {\n\
    if (insideTile(shapePosition, traversalData.octreeCoords)) {\n\
        for (int i = 0; i < SAMPLE_COUNT; i++) {\n\
            sampleDatas[0].tileUv = getTileUv(shapePosition, sampleDatas[0].tileCoords);\n\
        }\n\
        return;\n\
    }\n\
\n\
    // Go up tree until we find a parent tile containing shapePosition\n\
    for (int i = 0; i < OCTREE_MAX_LEVELS; ++i) {\n\
        traversalData.octreeCoords.xyz /= 2;\n\
        traversalData.octreeCoords.w -= 1;\n\
\n\
        if (insideTile(shapePosition, traversalData.octreeCoords)) {\n\
            break;\n\
        }\n\
\n\
        traversalData.parentOctreeIndex = getOctreeParentIndex(traversalData.parentOctreeIndex);\n\
    }\n\
\n\
    // Go down tree\n\
    OctreeNodeData nodeData = traverseOctreeDownwards(shapePosition, traversalData);\n\
\n\
    #if (SAMPLE_COUNT == 1)\n\
        getOctreeLeafSampleData(nodeData, traversalData.octreeCoords, sampleDatas[0]);\n\
        sampleDatas[0].tileUv = getTileUv(shapePosition, sampleDatas[0].tileCoords);\n\
    #else\n\
        getOctreeLeafSampleDatas(nodeData, traversalData.octreeCoords, sampleDatas);\n\
        sampleDatas[0].tileUv = getTileUv(shapePosition, sampleDatas[0].tileCoords);\n\
        sampleDatas[1].tileUv = getTileUv(shapePosition, sampleDatas[1].tileCoords);\n\
    #endif\n\
}\n\
";
