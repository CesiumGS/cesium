// These octree flags must be in sync with GpuOctreeFlag in VoxelTraversal.js
#define OCTREE_FLAG_INTERNAL 0
#define OCTREE_FLAG_LEAF 1
#define OCTREE_FLAG_PACKED_LEAF_FROM_PARENT 2

#define OCTREE_MAX_LEVELS 32 // Harcoded value because GLSL doesn't like variable length loops

uniform sampler2D u_octreeInternalNodeTexture;
uniform vec2 u_octreeInternalNodeTexelSizeUv;
uniform int u_octreeInternalNodeTilesPerRow;
#if (SAMPLE_COUNT > 1)
uniform sampler2D u_octreeLeafNodeTexture;
uniform vec2 u_octreeLeafNodeTexelSizeUv;
uniform int u_octreeLeafNodeTilesPerRow;
#endif
uniform ivec3 u_dimensions; // does not include padding, and is in the z-up orientation
uniform ivec3 u_inputDimensions; // includes padding, and is in the orientation of the input data
#if defined(PADDING)
    uniform ivec3 u_paddingBefore;
#endif

struct OctreeNodeData {
    int data;
    int flag;
};

struct TraversalData {
    ivec4 octreeCoords;
    int parentOctreeIndex;
};

struct TileAndUvCoordinate {
    ivec4 tileCoords;
    vec3 tileUv;
};

struct SampleData {
    int megatextureIndex;
    ivec4 tileCoords;
    vec3 tileUv;
    vec3 inputCoordinate;
    #if (SAMPLE_COUNT > 1)
        float weight;
    #endif
};

// Integer mod: For WebGL1 only
int intMod(in int a, in int b) {
    return a - (b * (a / b));
}
int normU8_toInt(in float value) {
    return int(value * 255.0);
}
int normU8x2_toInt(in vec2 value) {
    return int(value.x * 255.0) + 256 * int(value.y * 255.0);
}
float normU8x2_toFloat(in vec2 value) {
    return float(normU8x2_toInt(value)) / 65535.0;
}

OctreeNodeData getOctreeNodeData(in vec2 octreeUv) {
    vec4 texData = texture(u_octreeInternalNodeTexture, octreeUv);

    OctreeNodeData data;
    data.data = normU8x2_toInt(texData.xy);
    data.flag = normU8x2_toInt(texData.zw);
    return data;
}

OctreeNodeData getOctreeChildData(in int parentOctreeIndex, in ivec3 childCoord) {
    int childIndex = childCoord.z * 4 + childCoord.y * 2 + childCoord.x;
    int octreeCoordX = intMod(parentOctreeIndex, u_octreeInternalNodeTilesPerRow) * 9 + 1 + childIndex;
    int octreeCoordY = parentOctreeIndex / u_octreeInternalNodeTilesPerRow;
    vec2 octreeUv = u_octreeInternalNodeTexelSizeUv * vec2(float(octreeCoordX) + 0.5, float(octreeCoordY) + 0.5);
    return getOctreeNodeData(octreeUv);
}

int getOctreeParentIndex(in int octreeIndex) {
    int octreeCoordX = intMod(octreeIndex, u_octreeInternalNodeTilesPerRow) * 9;
    int octreeCoordY = octreeIndex / u_octreeInternalNodeTilesPerRow;
    vec2 octreeUv = u_octreeInternalNodeTexelSizeUv * vec2(float(octreeCoordX) + 0.5, float(octreeCoordY) + 0.5);
    vec4 parentData = texture(u_octreeInternalNodeTexture, octreeUv);
    int parentOctreeIndex = normU8x2_toInt(parentData.xy);
    return parentOctreeIndex;
}

vec3 getTileUv(in TileAndUvCoordinate tileAndUv, in ivec4 octreeCoords) {
    int levelDifference = tileAndUv.tileCoords.w - octreeCoords.w;
    float scalar = exp2(-1.0 * float(levelDifference));
    vec3 originShift = vec3(tileAndUv.tileCoords.xyz - (octreeCoords.xyz << levelDifference)) * scalar;
    return tileAndUv.tileUv * scalar + originShift;
}

vec3 getClampedTileUv(in TileAndUvCoordinate tileAndUv, in ivec4 octreeCoords) {
    vec3 tileUv = getTileUv(tileAndUv, octreeCoords);
    return clamp(tileUv, vec3(0.0), vec3(1.0));
}

void addSampleCoordinates(in TileAndUvCoordinate tileAndUv, inout SampleData sampleData) {
    vec3 tileUv = getClampedTileUv(tileAndUv, sampleData.tileCoords);

    vec3 inputCoordinate = tileUv * vec3(u_dimensions);
#if defined(PADDING)
    inputCoordinate += vec3(u_paddingBefore);
#endif
#if defined(Y_UP_METADATA_ORDER)
#if defined(SHAPE_BOX)
    float inputY = inputCoordinate.y;
    inputCoordinate.y = float(u_inputDimensions.y) - inputCoordinate.z;
    inputCoordinate.z = inputY;
#elif defined(SHAPE_CYLINDER)
    float angle = inputCoordinate.y;
    float height = inputCoordinate.z;
    #if (!defined(CYLINDER_HAS_SHAPE_BOUNDS_ANGLE))
    // Account for the different 0-angle convention in glTF vs 3DTiles
    if (sampleData.tileCoords.w == 0) {
        float angleCount = float(u_inputDimensions.z);
        angle = mod(angle + angleCount / 2.0, angleCount);
    }
    #endif
    inputCoordinate.y = height;
    inputCoordinate.z = angle;
#endif
#endif

    sampleData.tileUv = tileUv;
    sampleData.inputCoordinate = inputCoordinate;
}

void getOctreeLeafSampleData(in OctreeNodeData data, in ivec4 octreeCoords, out SampleData sampleData) {
    sampleData.megatextureIndex = data.data;
    sampleData.tileCoords = (data.flag == OCTREE_FLAG_PACKED_LEAF_FROM_PARENT)
        ? ivec4(octreeCoords.xyz / 2, octreeCoords.w - 1)
        : octreeCoords;
}

#if (SAMPLE_COUNT > 1)
void getOctreeLeafSampleDatas(in OctreeNodeData data, in ivec4 octreeCoords, out SampleData sampleDatas[SAMPLE_COUNT]) {
    int leafIndex = data.data;
    int leafNodeTexelCount = 2;
    // Adding 0.5 moves to the center of the texel
    float leafCoordXStart = float(intMod(leafIndex, u_octreeLeafNodeTilesPerRow) * leafNodeTexelCount) + 0.5;
    float leafCoordY = float(leafIndex / u_octreeLeafNodeTilesPerRow) + 0.5;

    // Get an interpolation weight and a flag to determine whether to read the parent texture
    vec2 leafUv0 = u_octreeLeafNodeTexelSizeUv * vec2(leafCoordXStart + 0.0, leafCoordY);
    vec4 leafData0 = texture(u_octreeLeafNodeTexture, leafUv0);
    float lerp = normU8x2_toFloat(leafData0.xy);
    sampleDatas[0].weight = 1.0 - lerp;
    sampleDatas[1].weight = lerp;
    // TODO: this looks wrong? Should be comparing to OCTREE_FLAG_PACKED_LEAF_FROM_PARENT
    sampleDatas[0].tileCoords = (normU8_toInt(leafData0.z) == 1)
        ? ivec4(octreeCoords.xyz / 2, octreeCoords.w - 1)
        : octreeCoords;
    sampleDatas[1].tileCoords = (normU8_toInt(leafData0.w) == 1)
        ? ivec4(octreeCoords.xyz / 2, octreeCoords.w - 1)
        : octreeCoords;

    // Get megatexture indices for both samples
    vec2 leafUv1 = u_octreeLeafNodeTexelSizeUv * vec2(leafCoordXStart + 1.0, leafCoordY);
    vec4 leafData1 = texture(u_octreeLeafNodeTexture, leafUv1);
    sampleDatas[0].megatextureIndex = normU8x2_toInt(leafData1.xy);
    sampleDatas[1].megatextureIndex = normU8x2_toInt(leafData1.zw);
}
#endif

OctreeNodeData traverseOctreeDownwards(in ivec4 tileCoordinate, inout TraversalData traversalData) {
    OctreeNodeData childData;

    for (int i = 0; i < OCTREE_MAX_LEVELS; ++i) {
        // tileCoordinate.xyz is defined at the level of detail tileCoordinate.w.
        // Find the corresponding coordinate at the level traversalData.octreeCoords.w
        int level = traversalData.octreeCoords.w + 1;
        int levelDifference = tileCoordinate.w - level;
        ivec3 coordinateAtLevel = tileCoordinate.xyz >> levelDifference;
        traversalData.octreeCoords = ivec4(coordinateAtLevel, level);

        ivec3 childCoordinate = coordinateAtLevel & 1;
        childData = getOctreeChildData(traversalData.parentOctreeIndex, childCoordinate);

        if (childData.flag != OCTREE_FLAG_INTERNAL) {
            // leaf tile - stop traversing
            break;
        }

        traversalData.parentOctreeIndex = childData.data;
    }

    return childData;
}

/**
* Transform a given position to an octree tile coordinate and a position within that tile,
* and find the corresponding megatexture index and texture coordinates
*/
void traverseOctreeFromBeginning(in TileAndUvCoordinate tileAndUv, out TraversalData traversalData, out SampleData sampleDatas[SAMPLE_COUNT]) {
    traversalData.octreeCoords = ivec4(0);
    traversalData.parentOctreeIndex = 0;

    OctreeNodeData nodeData = getOctreeNodeData(vec2(0.0));
    if (nodeData.flag != OCTREE_FLAG_LEAF) {
        nodeData = traverseOctreeDownwards(tileAndUv.tileCoords, traversalData);
    }

    #if (SAMPLE_COUNT == 1)
        getOctreeLeafSampleData(nodeData, traversalData.octreeCoords, sampleDatas[0]);
        addSampleCoordinates(tileAndUv, sampleDatas[0]);
    #else
        getOctreeLeafSampleDatas(nodeData, traversalData.octreeCoords, sampleDatas);
        addSampleCoordinates(tileAndUv, sampleDatas[0]);
        addSampleCoordinates(tileAndUv, sampleDatas[1]);
    #endif
}

bool insideTile(in ivec4 tileCoordinate, in ivec4 octreeCoords) {
    int levelDifference = tileCoordinate.w - octreeCoords.w;
    if (levelDifference < 0) {
        return false;
    }
    ivec3 coordinateAtLevel = tileCoordinate.xyz >> levelDifference;
    return coordinateAtLevel == octreeCoords.xyz;
}

void traverseOctreeFromExisting(in TileAndUvCoordinate tileAndUv, inout TraversalData traversalData, inout SampleData sampleDatas[SAMPLE_COUNT]) {
    ivec4 tileCoords = tileAndUv.tileCoords;
    if (insideTile(tileCoords, traversalData.octreeCoords)) {
        for (int i = 0; i < SAMPLE_COUNT; i++) {
            addSampleCoordinates(tileAndUv, sampleDatas[i]);
        }
        return;
    }

    // Go up tree until we find a parent tile containing tileCoords.
    // Assumes all parents are available all they way up to the root.
    for (int i = 0; i < OCTREE_MAX_LEVELS; ++i) {
        traversalData.octreeCoords.xyz /= 2;
        traversalData.octreeCoords.w -= 1;

        if (insideTile(tileCoords, traversalData.octreeCoords)) {
            break;
        }

        traversalData.parentOctreeIndex = getOctreeParentIndex(traversalData.parentOctreeIndex);
    }

    // Go down tree
    OctreeNodeData nodeData = traverseOctreeDownwards(tileCoords, traversalData);

    #if (SAMPLE_COUNT == 1)
        getOctreeLeafSampleData(nodeData, traversalData.octreeCoords, sampleDatas[0]);
        addSampleCoordinates(tileAndUv, sampleDatas[0]);
    #else
        getOctreeLeafSampleDatas(nodeData, traversalData.octreeCoords, sampleDatas);
        addSampleCoordinates(tileAndUv, sampleDatas[0]);
        addSampleCoordinates(tileAndUv, sampleDatas[1]);
    #endif
}
