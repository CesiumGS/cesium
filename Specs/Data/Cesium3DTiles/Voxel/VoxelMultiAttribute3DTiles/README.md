# VoxelMultiAttribute3DTiles

The data was generated as follows:

1. Generate 8-sample (2x2 cube) CSV file, voxel2x2.csv
2. Run tiler with the config file voxel2x2.json
3. Modify ./tiles/0/0/0/0.gltf to re-order the meshes.primitives.attributes dictionary.

Note: in step 3, the (key: index) pairs are left intact. We simply
re-ordered the entries to simulate a bug in Cesium3DTilesVoxelProvider.
The bug has since been fixed.
