// These octree flags must be in sync with GpuOctreeFlag in VoxelTraversal.js
#define OCTREE_FLAG_INTERNAL 0
#define OCTREE_FLAG_LEAF 1
#define OCTREE_FLAG_PACKED_LEAF_FROM_PARENT 2

#define OCTREE_MAX_LEVELS 32 // Harcoded value because GLSL doesn't like variable length loops

uniform sampler2D u_octreeInternalNodeTexture;
uniform vec2 u_octreeInternalNodeTexelSizeUv;
uniform int u_octreeInternalNodeTilesPerRow;
uniform sampler2D u_octreeLeafNodeTexture;
uniform vec2 u_octreeLeafNodeTexelSizeUv;
uniform int u_octreeLeafNodeTilesPerRow;

uniform float u_stepSize;

struct OctreeNodeData {
    int data;
    int flag;
};

struct TraversalData {
    float stepT;
    ivec4 octreeCoords;
    int parentOctreeIndex;
};

struct SampleData {
    int megatextureIndex;
    bool usingParentMegatextureIndex;
    vec3 tileUv;
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
	// TODO: use bit-shifting (only in WebGL2)
    float dimAtLevel = pow(2.0, float(octreeCoords.w));
    return shapePosition * dimAtLevel - vec3(octreeCoords.xyz);
}

void setSampleUv(in vec3 shapePosition, in ivec4 octreeCoords, inout SampleData sampleData) {
    ivec4 sampleCoords = sampleData.usingParentMegatextureIndex
        ? ivec4(octreeCoords.xyz / 2, octreeCoords.w - 1)
        : octreeCoords;
    sampleData.tileUv = getTileUv(shapePosition, sampleCoords);
}

void getOctreeLeafSampleData(in OctreeNodeData data, out SampleData sampleData) {
    sampleData.megatextureIndex = data.data;
    sampleData.usingParentMegatextureIndex = data.flag == OCTREE_FLAG_PACKED_LEAF_FROM_PARENT;
}

#if (SAMPLE_COUNT > 1)
void getOctreeLeafSampleDatas(in OctreeNodeData data, out SampleData sampleData0, out SampleData sampleData1) {
    int leafIndex = data.data;
    int leafNodeTexelCount = 2;
    // Adding 0.5 moves to the center of the texel
    float leafCoordXStart = float(intMod(leafIndex, u_octreeLeafNodeTilesPerRow) * leafNodeTexelCount) + 0.5;
    float leafCoordY = float(leafIndex / u_octreeLeafNodeTilesPerRow) + 0.5;

    vec2 leafUv0 = u_octreeLeafNodeTexelSizeUv * vec2(leafCoordXStart + 0.0, leafCoordY);
    vec2 leafUv1 = u_octreeLeafNodeTexelSizeUv * vec2(leafCoordXStart + 1.0, leafCoordY);
    vec4 leafData0 = texture(u_octreeLeafNodeTexture, leafUv0);
    vec4 leafData1 = texture(u_octreeLeafNodeTexture, leafUv1);

    float lerp = normU8x2_toFloat(leafData0.xy);

    sampleData0.megatextureIndex = normU8x2_toInt(leafData1.xy);
    sampleData1.megatextureIndex = normU8x2_toInt(leafData1.zw);
    // TODO: this looks wrong? Should be comparing to OCTREE_FLAG_PACKED_LEAF_FROM_PARENT
    sampleData0.usingParentMegatextureIndex = normU8_toInt(leafData0.z) == 1;
    sampleData1.usingParentMegatextureIndex = normU8_toInt(leafData0.w) == 1;
    sampleData0.weight = 1.0 - lerp;
    sampleData1.weight = lerp;
}
#endif

void traverseOctreeDownwards(in vec3 shapePosition, inout TraversalData traversalData, out SampleData sampleDatas[SAMPLE_COUNT]) {
    float sizeAtLevel = 1.0 / pow(2.0, float(traversalData.octreeCoords.w));
    vec3 start = vec3(traversalData.octreeCoords.xyz) * sizeAtLevel;
    vec3 end = start + vec3(sizeAtLevel);

    for (int i = 0; i < OCTREE_MAX_LEVELS; ++i) {
        // Find out which octree child contains the position
        // 0 if before center, 1 if after
        vec3 center = 0.5 * (start + end);
        vec3 childCoord = step(center, shapePosition);

        OctreeNodeData childData = getOctreeChildData(traversalData.parentOctreeIndex, ivec3(childCoord));

        // Get octree coords for the next level down
        ivec4 octreeCoords = traversalData.octreeCoords;
        traversalData.octreeCoords = ivec4(octreeCoords.xyz * 2 + ivec3(childCoord), octreeCoords.w + 1);

        if (childData.flag == OCTREE_FLAG_INTERNAL) {
            // interior tile - keep going deeper
            start = mix(start, center, childCoord);
            end = mix(center, end, childCoord);
            traversalData.parentOctreeIndex = childData.data;
        } else {
            // leaf tile - stop traversing
            float dimAtLevel = pow(2.0, float(traversalData.octreeCoords.w));
            traversalData.stepT = u_stepSize / dimAtLevel;
            #if (SAMPLE_COUNT == 1)
                getOctreeLeafSampleData(childData, sampleDatas[0]);
                setSampleUv(shapePosition, traversalData.octreeCoords, sampleDatas[0]);
            #else
                getOctreeLeafSampleDatas(childData, sampleDatas[0], sampleDatas[1]);
                setSampleUv(shapePosition, traversalData.octreeCoords, sampleDatas[0]);
                setSampleUv(shapePosition, traversalData.octreeCoords, sampleDatas[1]);
            #endif
            return;
        }
    }
}

/**
* Transform a given position to an octree tile coordinate and a position within that tile,
* and find the corresponding megatexture index and texture coordinates
*/
void traverseOctreeFromBeginning(in vec3 shapePosition, out TraversalData traversalData, out SampleData sampleDatas[SAMPLE_COUNT]) {
    traversalData.octreeCoords = ivec4(0);
    traversalData.parentOctreeIndex = 0;

    OctreeNodeData rootData = getOctreeNodeData(vec2(0.0));
    if (rootData.flag == OCTREE_FLAG_LEAF) {
        // No child data, only the root tile has data
        traversalData.stepT = u_stepSize;
        #if (SAMPLE_COUNT == 1)
            getOctreeLeafSampleData(rootData, sampleDatas[0]);
            setSampleUv(shapePosition, traversalData.octreeCoords, sampleDatas[0]);
        #else
            getOctreeLeafSampleDatas(rootData, sampleDatas[0], sampleDatas[1]);
            setSampleUv(shapePosition, traversalData.octreeCoords, sampleDatas[0]);
            setSampleUv(shapePosition, traversalData.octreeCoords, sampleDatas[1]);
        #endif
    } else {
        traverseOctreeDownwards(shapePosition, traversalData, sampleDatas);
    }
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
            setSampleUv(shapePosition, traversalData.octreeCoords, sampleDatas[i]);
        }
    } else {
        // Go up tree
        for (int i = 0; i < OCTREE_MAX_LEVELS; ++i)
        {
            traversalData.octreeCoords.xyz /= 2;
            traversalData.octreeCoords.w -= 1;

            if (!insideTile(shapePosition, traversalData.octreeCoords)) {
                traversalData.parentOctreeIndex = getOctreeParentIndex(traversalData.parentOctreeIndex);
            } else {
                break;
            }
        }

        // Go down tree
        traverseOctreeDownwards(shapePosition, traversalData, sampleDatas);
    }
}
