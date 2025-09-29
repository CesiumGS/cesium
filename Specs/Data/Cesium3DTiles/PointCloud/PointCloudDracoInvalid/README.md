# PointCloudDracoInvalid

A test related to https://github.com/CesiumGS/cesium/issues/12872 :

For a certain period of time (2 years), and under certain conditions, the
point cloud tiler generated invalid PNTS files when draco compression
was enabled. The batch table could define certain properties as binary
body references, without a batch table binary being present, and without
the `3DTILES_draco_point_compression` extension object being present
in the batch table JSON.

The PNTS file here is one PNTS file from the data set that was linked
in the issue (with details in the issue description). This is to
ensure that CesiumJS gracefully handles this case, without crashing.
