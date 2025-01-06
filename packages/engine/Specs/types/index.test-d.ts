import { expectAssignable } from "tsd";

import {
  Cartesian3,
  Property,
  CallbackProperty,
  ConstantProperty,
  TimeIntervalCollectionProperty,
  CompositeProperty,
  SampledProperty,
  PropertyBag,
  PropertyArray,
  PositionProperty,
  CallbackPositionProperty,
  SampledPositionProperty,
  MaterialProperty,
  VelocityVectorProperty,
  VelocityOrientationProperty,
  PositionPropertyArray,
  NodeTransformationProperty,
  ReferenceProperty,
  EntityCollection,
  CompositePositionProperty,
  ConstantPositionProperty,
  TimeIntervalCollectionPositionProperty,
  ColorMaterialProperty,
  CompositeMaterialProperty,
  GridMaterialProperty,
  ImageMaterialProperty,
  PolylineGlowMaterialProperty,
  PolylineOutlineMaterialProperty,
  StripeMaterialProperty,
  CheckerboardMaterialProperty,
  PolylineDashMaterialProperty,
  PolylineArrowMaterialProperty,
} from "@cesium/engine";

// Verify Property instances conform to the expected interface
expectAssignable<Property>(new CallbackProperty(() => 0, false));
expectAssignable<Property>(new ConstantProperty(1));
expectAssignable<Property>(new TimeIntervalCollectionProperty());
expectAssignable<Property>(new CompositeProperty());
expectAssignable<Property>(new SampledProperty(Cartesian3));
expectAssignable<Property>(new PropertyBag());
expectAssignable<Property>(new PropertyArray());
expectAssignable<Property>(new PositionProperty());
expectAssignable<Property>(new MaterialProperty());
expectAssignable<Property>(new VelocityVectorProperty());
expectAssignable<Property>(new VelocityOrientationProperty());
expectAssignable<Property>(new PositionPropertyArray());
expectAssignable<Property>(new NodeTransformationProperty());
expectAssignable<Property>(
  new ReferenceProperty(new EntityCollection(), "object1", [
    "billboard",
    "scale",
  ]),
);

// Verify PositionProperty instances conform to the expected PositionProperty and Property interfaces
expectAssignable<PositionProperty>(new SampledPositionProperty());
expectAssignable<PositionProperty>(new CompositePositionProperty());
expectAssignable<PositionProperty>(new ConstantPositionProperty());
expectAssignable<PositionProperty>(
  new TimeIntervalCollectionPositionProperty(),
);
expectAssignable<PositionProperty>(
  new CallbackPositionProperty(() => new Cartesian3(), false),
);

// Verify MaterialProperty instances conform to the expected MaterialProperty and Property interfaces
expectAssignable<MaterialProperty>(new ColorMaterialProperty());
expectAssignable<MaterialProperty>(new CompositeMaterialProperty());
expectAssignable<MaterialProperty>(new GridMaterialProperty());
expectAssignable<MaterialProperty>(new ImageMaterialProperty());
expectAssignable<MaterialProperty>(new PolylineGlowMaterialProperty());
expectAssignable<MaterialProperty>(new PolylineOutlineMaterialProperty());
expectAssignable<MaterialProperty>(new StripeMaterialProperty());
expectAssignable<MaterialProperty>(new CheckerboardMaterialProperty());
expectAssignable<MaterialProperty>(new PolylineDashMaterialProperty());
expectAssignable<MaterialProperty>(new PolylineArrowMaterialProperty());
