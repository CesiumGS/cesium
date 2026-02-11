// See Octree.glsl for the definitions of SampleData

/* Megatexture defines (set in Scene/VoxelRenderResources.js)
#define SAMPLE_COUNT ###
#define PADDING
*/

uniform ivec3 u_megatextureTileCounts; // number of tiles in the megatexture, along each axis

vec3 index1DTo3DTexCoord(int index)
{
    int tilesPerZ = u_megatextureTileCounts.x * u_megatextureTileCounts.y;
    int iz = index / tilesPerZ;
    int remainder = index - iz * tilesPerZ;
    int iy = remainder / u_megatextureTileCounts.x;
    int ix = remainder - iy * u_megatextureTileCounts.x;
    return vec3(ix, iy, iz) / vec3(u_megatextureTileCounts);
}

Properties getPropertiesFromMegatexture(in SampleData sampleData) {
    int tileIndex = sampleData.megatextureIndex;

    vec3 voxelCoord = sampleData.inputCoordinate;

    // UV coordinate of the lower corner of the tile in the megatexture
    vec3 tileUvOffset = index1DTo3DTexCoord(tileIndex);

    // Voxel location
    vec3 tileDimensions = vec3(u_inputDimensions);
    vec3 clampedVoxelCoord = clamp(voxelCoord, vec3(0.5), tileDimensions - vec3(0.5));
    vec3 voxelUv = clampedVoxelCoord / tileDimensions / vec3(u_megatextureTileCounts);

    return getPropertiesFromMegatextureAtUv(tileUvOffset + voxelUv);
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
