# Property Attributes Point Cloud

An example that shows how to combine different features of the `EXT_structural_metadata` and 3D Tiles.

## Sharing a metadata schema between glTF assets and a 3D Tiles tileset

The example uses a single metadata schema, as defined in the [3D Metadata Specification](https://github.com/CesiumGS/3d-tiles/tree/draft-1.1/specification/Metadata). The schema is stored in a `MetadataSchema.json` file, and defines a metadata class with two properties:

- an `intensity` property, which is a single floating point value
- a `classification` property, which is an enum with `MediumVegetation` and `Buildings` as its values

This schema file is referred to by glTF assets that use the `EXT_structural_metadata` extension, and by the 3D Tiles tileset that contains these glTF assets.

## Storing metadata in glTF property attributes

The glTF assets are simple point clouds, with [property attributes](https://github.com/CesiumGS/glTF/tree/proposal-EXT_structural_metadata/extensions/2.0/Vendor/EXT_structural_metadata#property-attributes) that contain the metadata values for the schema: Each point is assigned an `intensity` and a `classification` value.

## Defining statistics for the metadata values

The 3D Tiles tileset contains [metadata statistics](https://github.com/CesiumGS/3d-tiles/tree/draft-1.1/specification#metadata-statistics) for the metadata from the glTF assets. These statistics contain, for example, the minimum and maximum `intensity` value, and the number of occurences for each `classification` value.

## More information

See the [3d-tiles-samples repo](https://github.com/CesiumGS/3d-tiles-samples/tree/main/glTF/EXT_structural_metadata/PropertyAttributesPointCloud) for a Sandcastle and screenshot using this dataset.

## License

[CC0](https://creativecommons.org/share-your-work/public-domain/cc0/)
