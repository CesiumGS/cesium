//This file is automatically rebuilt by the Cesium build process.
export default "// See Octree.glsl for the definitions of SampleData and intMod\n\
\n\
/* Megatexture defines (set in Scene/VoxelRenderResources.js)\n\
#define SAMPLE_COUNT ###\n\
#define NEAREST_SAMPLING\n\
#define PADDING\n\
*/\n\
\n\
uniform ivec2 u_megatextureSliceDimensions; // number of slices per tile, in two dimensions\n\
uniform ivec2 u_megatextureTileDimensions; // number of tiles per megatexture, in two dimensions\n\
uniform vec2 u_megatextureVoxelSizeUv;\n\
uniform vec2 u_megatextureSliceSizeUv;\n\
uniform vec2 u_megatextureTileSizeUv;\n\
\n\
uniform ivec3 u_dimensions; // does not include padding\n\
#if defined(PADDING)\n\
    uniform ivec3 u_paddingBefore;\n\
    uniform ivec3 u_paddingAfter;\n\
#endif\n\
\n\
// Integer min, max, clamp: For WebGL1 only\n\
int intMin(int a, int b) {\n\
    return a <= b ? a : b;\n\
}\n\
int intMax(int a, int b) {\n\
    return a >= b ? a : b;\n\
}\n\
int intClamp(int v, int minVal, int maxVal) {\n\
    return intMin(intMax(v, minVal), maxVal);\n\
}\n\
\n\
vec2 index1DTo2DTexcoord(int index, ivec2 dimensions, vec2 uvScale)\n\
{\n\
    int indexX = intMod(index, dimensions.x);\n\
    int indexY = index / dimensions.x;\n\
    return vec2(indexX, indexY) * uvScale;\n\
}\n\
\n\
/*\n\
    How is 3D data stored in a 2D megatexture?\n\
\n\
    In this example there is only one loaded tile and it has 2x2x2 voxels (8 voxels total).\n\
    The data is sliced by Z. The data at Z = 0 is placed in texels (0,0), (0,1), (1,0), (1,1) and\n\
    the data at Z = 1 is placed in texels (2,0), (2,1), (3,0), (3,1).\n\
    Note that there could be empty space in the megatexture because it's a power of two.\n\
\n\
      0   1   2   3\n\
    +---+---+---+---+\n\
    |   |   |   |   | 3\n\
    +---+---+---+---+\n\
    |   |   |   |   | 2\n\
    +-------+-------+\n\
    |010|110|011|111| 1\n\
    |--- ---|--- ---|\n\
    |000|100|001|101| 0\n\
    +-------+-------+\n\
\n\
    When doing linear interpolation the megatexture needs to be sampled twice: once for\n\
    the Z slice above the voxel coordinate and once for the slice below. The two slices\n\
    are interpolated with fract(coord.z - 0.5). For example, a Z coordinate of 1.0 is\n\
    halfway between two Z slices so the interpolation factor is 0.5. Below is a side view\n\
    of the 3D voxel grid with voxel coordinates on the left side.\n\
\n\
    2 +---+\n\
      |001|\n\
    1 +-z-+\n\
      |000|\n\
    0 +---+\n\
\n\
    When doing nearest neighbor the megatexture only needs to be sampled once at the closest Z slice.\n\
*/\n\
\n\
Properties getPropertiesFromMegatexture(in SampleData sampleData) {\n\
    vec3 tileUv = clamp(sampleData.tileUv, vec3(0.0), vec3(1.0)); // TODO is the clamp necessary?\n\
    int tileIndex = sampleData.megatextureIndex;\n\
    vec3 voxelCoord = tileUv * vec3(u_dimensions);\n\
    ivec3 voxelDimensions = u_dimensions;\n\
\n\
    #if defined(PADDING)\n\
        voxelDimensions += u_paddingBefore + u_paddingAfter;\n\
        voxelCoord += vec3(u_paddingBefore);\n\
    #endif\n\
\n\
    #if defined(NEAREST_SAMPLING)\n\
        // Round to the center of the nearest voxel\n\
        voxelCoord = floor(voxelCoord) + vec3(0.5);\n\
    #endif\n\
\n\
    // Tile location\n\
    vec2 tileUvOffset = index1DTo2DTexcoord(tileIndex, u_megatextureTileDimensions, u_megatextureTileSizeUv);\n\
\n\
    // Slice location\n\
    float slice = voxelCoord.z - 0.5;\n\
    int sliceIndex = int(floor(slice));\n\
    int sliceIndex0 = intClamp(sliceIndex, 0, voxelDimensions.z - 1);\n\
    vec2 sliceUvOffset0 = index1DTo2DTexcoord(sliceIndex0, u_megatextureSliceDimensions, u_megatextureSliceSizeUv);\n\
\n\
    // Voxel location\n\
    vec2 voxelUvOffset = clamp(voxelCoord.xy, vec2(0.5), vec2(voxelDimensions.xy) - vec2(0.5)) * u_megatextureVoxelSizeUv;\n\
\n\
    // Final location in the megatexture\n\
    vec2 uv0 = tileUvOffset + sliceUvOffset0 + voxelUvOffset;\n\
\n\
    #if defined(NEAREST_SAMPLING)\n\
        return getPropertiesFromMegatextureAtUv(uv0);\n\
    #else\n\
        float sliceLerp = fract(slice);\n\
        int sliceIndex1 = intMin(sliceIndex + 1, voxelDimensions.z - 1);\n\
        vec2 sliceUvOffset1 = index1DTo2DTexcoord(sliceIndex1, u_megatextureSliceDimensions, u_megatextureSliceSizeUv);\n\
        vec2 uv1 = tileUvOffset + sliceUvOffset1 + voxelUvOffset;\n\
        Properties properties0 = getPropertiesFromMegatextureAtUv(uv0);\n\
        Properties properties1 = getPropertiesFromMegatextureAtUv(uv1);\n\
        return mixProperties(properties0, properties1, sliceLerp);\n\
    #endif\n\
}\n\
\n\
// Convert an array of sample datas to a final weighted properties.\n\
Properties accumulatePropertiesFromMegatexture(in SampleData sampleDatas[SAMPLE_COUNT]) {\n\
    #if (SAMPLE_COUNT == 1)\n\
        return getPropertiesFromMegatexture(sampleDatas[0]);\n\
    #else\n\
        // When more than one sample is taken the accumulator needs to start at 0\n\
        Properties properties = clearProperties();\n\
        for (int i = 0; i < SAMPLE_COUNT; ++i) {\n\
            float weight = sampleDatas[i].weight;\n\
\n\
            // Avoid reading the megatexture when the weight is 0 as it can be costly.\n\
            if (weight > 0.0) {\n\
                Properties tempProperties = getPropertiesFromMegatexture(sampleDatas[i]);\n\
                tempProperties = scaleProperties(tempProperties, weight);\n\
                properties = sumProperties(properties, tempProperties);\n\
            }\n\
        }\n\
        return properties;\n\
    #endif\n\
}\n\
";
