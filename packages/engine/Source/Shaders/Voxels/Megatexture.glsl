// See Octree.glsl for the definitions of SampleData and intMod

/* Megatexture defines (set in Scene/VoxelRenderResources.js)
#define SAMPLE_COUNT ###
#define NEAREST_SAMPLING
#define PADDING
*/

uniform ivec2 u_megatextureSliceDimensions; // number of slices per tile, in two dimensions
uniform ivec2 u_megatextureTileDimensions; // number of tiles per megatexture, in two dimensions
uniform vec2 u_megatextureVoxelSizeUv;
uniform vec2 u_megatextureSliceSizeUv;
uniform vec2 u_megatextureTileSizeUv;

uniform ivec3 u_dimensions; // does not include padding
#if defined(PADDING)
    uniform ivec3 u_paddingBefore;
    uniform ivec3 u_paddingAfter;
#endif

// Integer min, max, clamp: For WebGL1 only
int intMin(int a, int b) {
    return a <= b ? a : b;
}
int intMax(int a, int b) {
    return a >= b ? a : b;
}
int intClamp(int v, int minVal, int maxVal) {
    return intMin(intMax(v, minVal), maxVal);
}

vec2 index1DTo2DTexcoord(int index, ivec2 dimensions, vec2 uvScale)
{
    int indexX = intMod(index, dimensions.x);
    int indexY = index / dimensions.x;
    return vec2(indexX, indexY) * uvScale;
}

/*
    How is 3D data stored in a 2D megatexture?

    In this example there is only one loaded tile and it has 2x2x2 voxels (8 voxels total).
    The data is sliced by Z. The data at Z = 0 is placed in texels (0,0), (0,1), (1,0), (1,1) and
    the data at Z = 1 is placed in texels (2,0), (2,1), (3,0), (3,1).
    Note that there could be empty space in the megatexture because it's a power of two.

      0   1   2   3
    +---+---+---+---+
    |   |   |   |   | 3
    +---+---+---+---+
    |   |   |   |   | 2
    +-------+-------+
    |010|110|011|111| 1
    |--- ---|--- ---|
    |000|100|001|101| 0
    +-------+-------+

    When doing linear interpolation the megatexture needs to be sampled twice: once for
    the Z slice above the voxel coordinate and once for the slice below. The two slices
    are interpolated with fract(coord.z - 0.5). For example, a Z coordinate of 1.0 is
    halfway between two Z slices so the interpolation factor is 0.5. Below is a side view
    of the 3D voxel grid with voxel coordinates on the left side.

    2 +---+
      |001|
    1 +-z-+
      |000|
    0 +---+

    When doing nearest neighbor the megatexture only needs to be sampled once at the closest Z slice.
*/

Properties getPropertiesFromMegatexture(in SampleData sampleData) {
    vec3 tileUv = clamp(sampleData.tileUv, vec3(0.0), vec3(1.0)); // TODO is the clamp necessary?
    int tileIndex = sampleData.megatextureIndex;
    vec3 voxelCoord = tileUv * vec3(u_dimensions);
    ivec3 voxelDimensions = u_dimensions;

    #if defined(PADDING)
        voxelDimensions += u_paddingBefore + u_paddingAfter;
        voxelCoord += vec3(u_paddingBefore);
    #endif

    #if defined(NEAREST_SAMPLING)
        // Round to the center of the nearest voxel
        voxelCoord = floor(voxelCoord) + vec3(0.5);
    #endif

    // Tile location
    vec2 tileUvOffset = index1DTo2DTexcoord(tileIndex, u_megatextureTileDimensions, u_megatextureTileSizeUv);

    // Slice location
    float slice = voxelCoord.z - 0.5;
    int sliceIndex = int(floor(slice));
    int sliceIndex0 = intClamp(sliceIndex, 0, voxelDimensions.z - 1);
    vec2 sliceUvOffset0 = index1DTo2DTexcoord(sliceIndex0, u_megatextureSliceDimensions, u_megatextureSliceSizeUv);

    // Voxel location
    vec2 voxelUvOffset = clamp(voxelCoord.xy, vec2(0.5), vec2(voxelDimensions.xy) - vec2(0.5)) * u_megatextureVoxelSizeUv;

    // Final location in the megatexture
    vec2 uv0 = tileUvOffset + sliceUvOffset0 + voxelUvOffset;

    #if defined(NEAREST_SAMPLING)
        return getPropertiesFromMegatextureAtUv(uv0);
    #else
        float sliceLerp = fract(slice);
        int sliceIndex1 = intMin(sliceIndex + 1, voxelDimensions.z - 1);
        vec2 sliceUvOffset1 = index1DTo2DTexcoord(sliceIndex1, u_megatextureSliceDimensions, u_megatextureSliceSizeUv);
        vec2 uv1 = tileUvOffset + sliceUvOffset1 + voxelUvOffset;
        Properties properties0 = getPropertiesFromMegatextureAtUv(uv0);
        Properties properties1 = getPropertiesFromMegatextureAtUv(uv1);
        return mixProperties(properties0, properties1, sliceLerp);
    #endif
}

// Convert an array of sample datas to a final weighted properties.
Properties accumulatePropertiesFromMegatexture(in SampleData sampleDatas[SAMPLE_COUNT]) {
    #if (SAMPLE_COUNT == 1)
        return getPropertiesFromMegatexture(sampleDatas[0]);
    #else
        // When more than one sample is taken the accumulator needs to start at 0
        Properties properties = clearProperties();
        for (int i = 0; i < SAMPLE_COUNT; ++i) {
            float weight = sampleDatas[i].weight;

            // Avoid reading the megatexture when the weight is 0 as it can be costly.
            if (weight > 0.0) {
                Properties tempProperties = getPropertiesFromMegatexture(sampleDatas[i]);
                tempProperties = scaleProperties(tempProperties, weight);
                properties = sumProperties(properties, tempProperties);
            }
        }
        return properties;
    #endif
}
