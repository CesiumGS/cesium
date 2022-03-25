# A Box Without Normals

This model is a variation on Box-Gltf-2 except the `NORMAL` attribute has been
removed. `KHR_materials_unlit` has not been added. This is to intentionally test
the fallback behavior when a model without normals is loaded in -- it should
instead use unlit shading.
