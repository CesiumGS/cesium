### WEB3D Quantized Attributes Test Models ###

The models included in this directory contain quantized attributes as specified in the proposed [gltf extension](https://github.com/KhronosGroup/glTF/blob/master/extensions/Vendor/WEB3D_quantized_attributes/README.md).

Below is a list of models with links to the originals and a statement of which attributes in the model have been quantized.

## Models ##

* Box-Quantized ([Box](https://github.com/KhronosGroup/glTF/tree/master/sampleModels/Box)): `NORMAL`, `POSITION`
* Box-Color-Quantized ([Box](https://github.com/KhronosGroup/glTF/tree/master/sampleModels/Box)): `COLOR`
* CesiumMilkTruck-Quantized ([Cesium Milk Truck](https://github.com/KhronosGroup/glTF/tree/master/sampleModels/CesiumMilkTruck)): `NORMAL`, `POSITION`
* CesiumMilkTruck-Mismatch-Quantized ([Cesium Milk Truck](https://github.com/KhronosGroup/glTF/tree/master/sampleModels/CesiumMilkTruck)) (Primitives with different materials, but the same program are mismatched, one is quantized, the other is not): `NORMAL`, `POSITION`, `TEXCOORD`
* Duck-Quantized ([Duck](https://github.com/KhronosGroup/glTF/tree/master/sampleModels/Duck)): `TEXCOORD`
* RiggedSimple-Quantized ([Rigged Simple](https://github.com/KhronosGroup/glTF/tree/master/sampleModels/RiggedSimple)): `WEIGHT`, `JOINT`