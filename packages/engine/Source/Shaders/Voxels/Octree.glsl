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

/**
* Convert a position in the uv-space of the tileset bounding shape
* into the uv-space of a tile within the tileset
*/
vec3 getTileUv(in vec3 shapePosition, in ivec4 octreeCoords) {
	// PERFORMANCE_IDEA: use bit-shifting (only in WebGL2)
    float dimAtLevel = exp2(float(octreeCoords.w));
    return shapePosition * dimAtLevel - vec3(octreeCoords.xyz);
}

vec3 getClampedTileUv(in vec3 shapePosition, in ivec4 octreeCoords) {
    vec3 tileUv = getTileUv(shapePosition, octreeCoords);
    return clamp(tileUv, vec3(0.0), vec3(1.0));
}

void addSampleCoordinates(in vec3 shapePosition, inout SampleData sampleData) {
    vec3 tileUv = getClampedTileUv(shapePosition, sampleData.tileCoords);

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

OctreeNodeData traverseOctreeDownwards(in vec3 shapePosition, inout TraversalData traversalData) {
    float sizeAtLevel = exp2(-1.0 * float(traversalData.octreeCoords.w));
    vec3 start = vec3(traversalData.octreeCoords.xyz) * sizeAtLevel;
    vec3 end = start + vec3(sizeAtLevel);
    OctreeNodeData childData;

    for (int i = 0; i < OCTREE_MAX_LEVELS; ++i) {
        // Find out which octree child contains the position
        // 0 if before center, 1 if after
        vec3 center = 0.5 * (start + end);
        vec3 childCoord = step(center, shapePosition);

        // Get octree coords for the next level down
        ivec4 octreeCoords = traversalData.octreeCoords;
        traversalData.octreeCoords = ivec4(octreeCoords.xyz * 2 + ivec3(childCoord), octreeCoords.w + 1);

        childData = getOctreeChildData(traversalData.parentOctreeIndex, ivec3(childCoord));

        if (childData.flag != OCTREE_FLAG_INTERNAL) {
            // leaf tile - stop traversing
            break;
        }

        // interior tile - keep going deeper
        start = mix(start, center, childCoord);
        end = mix(center, end, childCoord);
        traversalData.parentOctreeIndex = childData.data;
    }

    return childData;
}

/**
* Transform a given position to an octree tile coordinate and a position within that tile,
* and find the corresponding megatexture index and texture coordinates
*/
void traverseOctreeFromBeginning(in vec3 shapePosition, out TraversalData traversalData, out SampleData sampleDatas[SAMPLE_COUNT]) {
    traversalData.octreeCoords = ivec4(0);
    traversalData.parentOctreeIndex = 0;

    OctreeNodeData nodeData = getOctreeNodeData(vec2(0.0));
    if (nodeData.flag != OCTREE_FLAG_LEAF) {
        nodeData = traverseOctreeDownwards(shapePosition, traversalData);
    }

    #if (SAMPLE_COUNT == 1)
        getOctreeLeafSampleData(nodeData, traversalData.octreeCoords, sampleDatas[0]);
        addSampleCoordinates(shapePosition, sampleDatas[0]);
    #else
        getOctreeLeafSampleDatas(nodeData, traversalData.octreeCoords, sampleDatas);
        addSampleCoordinates(shapePosition, sampleDatas[0]);
        addSampleCoordinates(shapePosition, sampleDatas[1]);
    #endif
}

bool inRange(in vec3 v, in vec3 minVal, in vec3 maxVal) {
    return clamp(v, minVal, maxVal) == v;
}

bool insideTile(in vec3 shapePosition, in ivec4 octreeCoords) {
    vec3 tileUv = getTileUv(shapePosition, octreeCoords);
	bool inside = inRange(tileUv, vec3(0.0), vec3(1.0));
	// Assume (!) the position is always inside the root tile.
	return inside || octreeCoords.w == 0;
}

void traverseOctreeFromExisting(in vec3 shapePosition, inout TraversalData traversalData, inout SampleData sampleDatas[SAMPLE_COUNT]) {
    if (insideTile(shapePosition, traversalData.octreeCoords)) {
        for (int i = 0; i < SAMPLE_COUNT; i++) {
            addSampleCoordinates(shapePosition, sampleDatas[i]);
        }
        return;
    }

    // Go up tree until we find a parent tile containing shapePosition
    for (int i = 0; i < OCTREE_MAX_LEVELS; ++i) {
        traversalData.octreeCoords.xyz /= 2;
        traversalData.octreeCoords.w -= 1;

        if (insideTile(shapePosition, traversalData.octreeCoords)) {
            break;
        }

        traversalData.parentOctreeIndex = getOctreeParentIndex(traversalData.parentOctreeIndex);
    }

    // Go down tree
    OctreeNodeData nodeData = traverseOctreeDownwards(shapePosition, traversalData);

    #if (SAMPLE_COUNT == 1)
        getOctreeLeafSampleData(nodeData, traversalData.octreeCoords, sampleDatas[0]);
        addSampleCoordinates(shapePosition, sampleDatas[0]);
    #else
        getOctreeLeafSampleDatas(nodeData, traversalData.octreeCoords, sampleDatas);
        addSampleCoordinates(shapePosition, sampleDatas[0]);
        addSampleCoordinates(shapePosition, sampleDatas[1]);
    #endif
}
