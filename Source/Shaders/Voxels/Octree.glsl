// import { convertUvToShapeUvSpace } from ("./convertUvToBox.glsl", "./convertUvToCylinder.glsl", "convertUvToEllipsoid.glsl");

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
    vec3 positionUvShapeSpace;
    vec3 positionUvLocal;
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
int intMod(int a, int b) {
    return a - (b * (a / b));
}
bool inRange(float v, float minVal, float maxVal) {
    return clamp(v, minVal, maxVal) == v;
}
bool inRange(vec3 v, vec3 minVal, vec3 maxVal) {
    return clamp(v, minVal, maxVal) == v;
}
int normU8_toInt(float value) {
    return int(value * 255.0);
}
int normU8x2_toInt(vec2 value) {
    return int(value.x * 255.0) + 256 * int(value.y * 255.0);
}
float normU8x2_toFloat(vec2 value) {
    return float(normU8x2_toInt(value)) / 65535.0;
}

OctreeNodeData getOctreeRootData() {
    vec4 rootData = texture2D(u_octreeInternalNodeTexture, vec2(0.0));
    
    OctreeNodeData data;
    data.data = normU8x2_toInt(rootData.xy);
    data.flag = normU8x2_toInt(rootData.zw);
    return data;
}

OctreeNodeData getOctreeChildData(int parentOctreeIndex, ivec3 childCoord) {
    int childIndex = childCoord.z * 4 + childCoord.y * 2 + childCoord.x;
    int octreeCoordX = intMod(parentOctreeIndex, u_octreeInternalNodeTilesPerRow) * 9 + 1 + childIndex;
    int octreeCoordY = parentOctreeIndex / u_octreeInternalNodeTilesPerRow;
    vec2 octreeUv = u_octreeInternalNodeTexelSizeUv * vec2(float(octreeCoordX) + 0.5, float(octreeCoordY) + 0.5);
    vec4 childData = texture2D(u_octreeInternalNodeTexture, octreeUv);
    
    OctreeNodeData data;
    data.data = normU8x2_toInt(childData.xy);
    data.flag = normU8x2_toInt(childData.zw);
    return data;
}

int getOctreeParentIndex(int octreeIndex) {
    int octreeCoordX = intMod(octreeIndex, u_octreeInternalNodeTilesPerRow) * 9;
    int octreeCoordY = octreeIndex / u_octreeInternalNodeTilesPerRow;
    vec2 octreeUv = u_octreeInternalNodeTexelSizeUv * vec2(float(octreeCoordX) + 0.5, float(octreeCoordY) + 0.5);
    vec4 parentData = texture2D(u_octreeInternalNodeTexture, octreeUv);
    int parentOctreeIndex = normU8x2_toInt(parentData.xy);
    return parentOctreeIndex;
}

void getOctreeLeafSampleData(in OctreeNodeData data, inout SampleData sampleData) {
    sampleData.megatextureIndex = data.data;
    sampleData.usingParentMegatextureIndex = data.flag == OCTREE_FLAG_PACKED_LEAF_FROM_PARENT;
}

#if (SAMPLE_COUNT > 1)
void getOctreeLeafSampleDatas(in OctreeNodeData data, inout SampleData sampleData0, inout SampleData sampleData1) {
    int leafIndex = data.data;
    int leafNodeTexelCount = 2;
    // Adding 0.5 moves to the center of the texel
    float leafCoordXStart = float(intMod(leafIndex, u_octreeLeafNodeTilesPerRow) * leafNodeTexelCount) + 0.5;
    float leafCoordY = float(leafIndex / u_octreeLeafNodeTilesPerRow) + 0.5;

    vec2 leafUv0 = u_octreeLeafNodeTexelSizeUv * vec2(leafCoordXStart + 0.0, leafCoordY);
    vec2 leafUv1 = u_octreeLeafNodeTexelSizeUv * vec2(leafCoordXStart + 1.0, leafCoordY);
    vec4 leafData0 = texture2D(u_octreeLeafNodeTexture, leafUv0);
    vec4 leafData1 = texture2D(u_octreeLeafNodeTexture, leafUv1);

    float lerp = normU8x2_toFloat(leafData0.xy);

    sampleData0.megatextureIndex = normU8x2_toInt(leafData1.xy);
    sampleData1.megatextureIndex = normU8x2_toInt(leafData1.zw);
    sampleData0.usingParentMegatextureIndex = normU8_toInt(leafData0.z) == 1;
    sampleData1.usingParentMegatextureIndex = normU8_toInt(leafData0.w) == 1;
    sampleData0.weight = 1.0 - lerp;
    sampleData1.weight = lerp;
}
#endif

void traverseOctreeDownwards(inout TraversalData traversalData, out SampleData sampleDatas[SAMPLE_COUNT]) {
    float sizeAtLevel = 1.0 / pow(2.0, float(traversalData.octreeCoords.w));
    vec3 start = vec3(traversalData.octreeCoords.xyz) * sizeAtLevel;
    vec3 end = start + vec3(sizeAtLevel);

    for (int i = 0; i < OCTREE_MAX_LEVELS; ++i) {
        // Find out which octree child contains the position
        // 0 if before center, 1 if after
        vec3 center = 0.5 * (start + end);
        vec3 childCoord = step(center, traversalData.positionUvShapeSpace);

        OctreeNodeData childData = getOctreeChildData(traversalData.parentOctreeIndex, ivec3(childCoord));

        // Get octree coords for the next level down
        ivec4 parentOctreeCoords = traversalData.octreeCoords;
        traversalData.octreeCoords = ivec4(parentOctreeCoords.xyz * 2 + ivec3(childCoord), parentOctreeCoords.w + 1);

        if (childData.flag == OCTREE_FLAG_INTERNAL) {
            // interior tile - keep going deeper
            start = mix(start, center, childCoord);
            end = mix(center, end, childCoord);
            traversalData.parentOctreeIndex = childData.data;
        } else {
            // leaf tile - stop traversing
            float dimAtLevel = pow(2.0, float(traversalData.octreeCoords.w));
            traversalData.positionUvLocal = traversalData.positionUvShapeSpace * dimAtLevel - vec3(traversalData.octreeCoords.xyz);
            traversalData.stepT = u_stepSize / dimAtLevel;

            #if (SAMPLE_COUNT == 1)
                getOctreeLeafSampleData(childData, sampleDatas[0]);
            #else
                getOctreeLeafSampleDatas(childData, sampleDatas[0], sampleDatas[1]);
            #endif
            for (int i = 0; i < SAMPLE_COUNT; i++) {
                if (sampleDatas[i].usingParentMegatextureIndex) {
                    float parentDimAtLevel = pow(2.0, float(parentOctreeCoords.w));
                    sampleDatas[i].tileUv = traversalData.positionUvShapeSpace * parentDimAtLevel - vec3(parentOctreeCoords.xyz);
                } else {
                    sampleDatas[i].tileUv = traversalData.positionUvLocal;
                }
            }
            return;
        }
    }
}

void traverseOctreeFromBeginning(in vec3 positionUv, out TraversalData traversalData, out SampleData sampleDatas[SAMPLE_COUNT]) {
    traversalData.octreeCoords = ivec4(0);
    traversalData.parentOctreeIndex = 0;

    // TODO: is it possible for this to be out of bounds, and does it matter?
    traversalData.positionUvShapeSpace = convertUvToShapeUvSpace(positionUv);
    traversalData.positionUvLocal = traversalData.positionUvShapeSpace;

    OctreeNodeData rootData = getOctreeRootData();
    if (rootData.flag == OCTREE_FLAG_LEAF) {
        // No child data, only the root tile has data
        #if (SAMPLE_COUNT == 1)
            getOctreeLeafSampleData(rootData, sampleDatas[0]);
        #else
            getOctreeLeafSampleDatas(rootData, sampleDatas[0], sampleDatas[1]);
        #endif
        traversalData.stepT = u_stepSize;
        for (int i = 0; i < SAMPLE_COUNT; i++) {
            sampleDatas[i].tileUv = traversalData.positionUvLocal;
        }
    }
    else
    {
        traverseOctreeDownwards(traversalData, sampleDatas);
    }
}

void traverseOctreeFromExisting(in vec3 positionUv, inout TraversalData traversalData, inout SampleData sampleDatas[SAMPLE_COUNT]) {
    float dimAtLevel = pow(2.0, float(traversalData.octreeCoords.w));
    traversalData.positionUvShapeSpace = convertUvToShapeUvSpace(positionUv);    
    traversalData.positionUvLocal = traversalData.positionUvShapeSpace * dimAtLevel - vec3(traversalData.octreeCoords.xyz);
    
    // Note: This code assumes the position is always inside the root tile.
    bool insideTile = traversalData.octreeCoords.w == 0 || inRange(traversalData.positionUvLocal, vec3(0.0), vec3(1.0)); 

    if (insideTile) {
        for (int i = 0; i < SAMPLE_COUNT; i++) {
            if (sampleDatas[i].usingParentMegatextureIndex) {
                ivec4 parentOctreeCoords;
                parentOctreeCoords.xyz = traversalData.octreeCoords.xyz / ivec3(2);
                parentOctreeCoords.w = traversalData.octreeCoords.w - 1;
                float parentDimAtLevel = pow(2.0, float(parentOctreeCoords.w));
                sampleDatas[i].tileUv = traversalData.positionUvShapeSpace * parentDimAtLevel - vec3(parentOctreeCoords.xyz);
            } else {
                sampleDatas[i].tileUv = traversalData.positionUvLocal;
            }
        }
    } else {
        // Go up tree
        for (int i = 0; i < OCTREE_MAX_LEVELS; ++i)
        {
            traversalData.octreeCoords.xyz /= ivec3(2);
            traversalData.octreeCoords.w -= 1;
            dimAtLevel *= 0.5;

            traversalData.positionUvLocal = traversalData.positionUvShapeSpace * dimAtLevel - vec3(traversalData.octreeCoords.xyz);
            insideTile = traversalData.octreeCoords.w == 0 || inRange(traversalData.positionUvLocal, vec3(0.0), vec3(1.0));
            
            if (!insideTile) {
                traversalData.parentOctreeIndex = getOctreeParentIndex(traversalData.parentOctreeIndex);
            } else {
                break;
            }
        }

        // Go down tree
        traverseOctreeDownwards(traversalData, sampleDatas);
    }
}

// export { SampleData, traverseOctreeFromBeginning, traverseOctreeFromExisting };
