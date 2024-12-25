import {
  ArcGisMapServerImageryProvider,
  ArcGISTiledElevationTerrainProvider,
  BingMapsImageryProvider,
  BoxGeometry,
  BoxOutlineGeometry,
  CallbackProperty,
  Camera,
  Cartesian3,
  CesiumTerrainProvider,
  CheckerboardMaterialProperty,
  CircleGeometry,
  CircleOutlineGeometry,
  Color,
  ColorMaterialProperty,
  CompositeMaterialProperty,
  CompositePositionProperty,
  CompositeProperty,
  ConstantPositionProperty,
  ConstantProperty,
  CoplanarPolygonGeometry,
  CoplanarPolygonOutlineGeometry,
  CorridorGeometry,
  CorridorOutlineGeometry,
  CustomDataSource,
  CylinderGeometry,
  CylinderOutlineGeometry,
  CzmlDataSource,
  DataSource,
  defined,
  EllipseGeometry,
  EllipseOutlineGeometry,
  EllipsoidGeometry,
  EllipsoidOutlineGeometry,
  EllipsoidTerrainProvider,
  EntityCollection,
  FrustumGeometry,
  FrustumOutlineGeometry,
  GeoJsonDataSource,
  GeometryInstance,
  GpxDataSource,
  GoogleEarthEnterpriseImageryProvider,
  GoogleEarthEnterpriseMapsProvider,
  GoogleEarthEnterpriseMetadata,
  GoogleEarthEnterpriseTerrainProvider,
  GridImageryProvider,
  GridMaterialProperty,
  GroundPolylineGeometry,
  ImageMaterialProperty,
  ImageryProvider,
  IonImageryProvider,
  KmlDataSource,
  MapboxImageryProvider,
  MapboxStyleImageryProvider,
  MaterialProperty,
  NodeTransformationProperty,
  OpenStreetMapImageryProvider,
  OrthographicFrustum,
  PlaneGeometry,
  PlaneOutlineGeometry,
  PolygonGeometry,
  PolygonHierarchy,
  PolygonOutlineGeometry,
  PolylineArrowMaterialProperty,
  PolylineDashMaterialProperty,
  PolylineGeometry,
  PolylineGlowMaterialProperty,
  PolylineOutlineMaterialProperty,
  PolylineVolumeGeometry,
  PolylineVolumeOutlineGeometry,
  PositionProperty,
  PositionPropertyArray,
  Property,
  PropertyArray,
  PropertyBag,
  Quaternion,
  Rectangle,
  RectangleGeometry,
  RectangleOutlineGeometry,
  ReferenceProperty,
  SampledPositionProperty,
  SampledProperty,
  Scene,
  SimplePolylineGeometry,
  SingleTileImageryProvider,
  SphereGeometry,
  SphereOutlineGeometry,
  StripeMaterialProperty,
  TerrainProvider,
  TileCoordinatesImageryProvider,
  TileMapServiceImageryProvider,
  TimeIntervalCollectionPositionProperty,
  TimeIntervalCollectionProperty,
  UrlTemplateImageryProvider,
  VelocityOrientationProperty,
  VelocityVectorProperty,
  VRTheWorldTerrainProvider,
  WallGeometry,
  WallOutlineGeometry,
  WebMapServiceImageryProvider,
  WebMapTileServiceImageryProvider,
  writeTextToCanvas,
} from "cesium";

// Verify ImageryProvider instances conform to the expected interface
let imageryProvider: ImageryProvider;
imageryProvider = new WebMapServiceImageryProvider({ url: "", layers: "0" });
imageryProvider = new ArcGisMapServerImageryProvider();
imageryProvider = new BingMapsImageryProvider({ key: "" });
imageryProvider = new OpenStreetMapImageryProvider({ url: "" });
imageryProvider = new TileMapServiceImageryProvider();
imageryProvider = new GridImageryProvider({
  tileWidth: 256,
  tileHeight: 256,
  color: new Color(1.0, 1.0, 1.0, 0.4),
});
imageryProvider = new IonImageryProvider();
imageryProvider = new MapboxImageryProvider({ mapId: "", accessToken: "" });
imageryProvider = new MapboxStyleImageryProvider({
  styleId: "",
  accessToken: "",
});
imageryProvider = new SingleTileImageryProvider({ url: "" });
imageryProvider = new TileCoordinatesImageryProvider();
imageryProvider = new UrlTemplateImageryProvider({ url: "" });
imageryProvider = new WebMapServiceImageryProvider({ url: "", layers: "" });
imageryProvider = new GoogleEarthEnterpriseImageryProvider();
imageryProvider = new GoogleEarthEnterpriseMapsProvider({
  channel: 1,
});
imageryProvider = new WebMapTileServiceImageryProvider({
  url: "",
  layer: "",
  style: "",
  tileMatrixSetID: "",
});

// Verify TerrainProvider instances conform to the expected interface
let terrainProvider: TerrainProvider;
terrainProvider = new ArcGISTiledElevationTerrainProvider();
terrainProvider = new CesiumTerrainProvider();
terrainProvider = new EllipsoidTerrainProvider();
terrainProvider = new VRTheWorldTerrainProvider();
terrainProvider = new GoogleEarthEnterpriseTerrainProvider();

// Verify DataSource instances conform to the expected interface
let dataSource: DataSource;
dataSource = new CzmlDataSource();
dataSource = new GeoJsonDataSource();
let canvasElement = document.createElement("canvas");
dataSource = new KmlDataSource({
  canvas: canvasElement,
  camera: new Camera(new Scene({ canvas: canvasElement })),
});
dataSource = new GpxDataSource();
dataSource = new CustomDataSource();

// Verify Property instances conform to the expected interface
let property: Property;
property = new CallbackProperty(() => 0, false);
property = new ConstantProperty(1);
property = new TimeIntervalCollectionProperty();
property = new CompositeProperty();
property = new SampledProperty(Cartesian3);
property = new PropertyBag();
property = new PropertyArray();
property = new PositionProperty();
property = new MaterialProperty();
property = new VelocityVectorProperty();
property = new VelocityOrientationProperty();
property = new PositionPropertyArray();
property = new NodeTransformationProperty();
property = new ReferenceProperty(new EntityCollection(), "object1", [
  "billboard",
  "scale",
]);

// Verify PositionProperty instances conform to the expected PositionProperty and Property interfaces
let positionProperty: PositionProperty;
property = positionProperty = new SampledPositionProperty();
property = positionProperty = new CompositePositionProperty();
property = positionProperty = new ConstantPositionProperty();
property = positionProperty = new TimeIntervalCollectionPositionProperty();
property = positionProperty = new ReferenceProperty(
  new EntityCollection(),
  "object1",
  ["billboard", "scale"],
);

// Verify MaterialProperty instances conform to the expected MaterialProperty and Property interfaces
let materialProperty: MaterialProperty;
property = materialProperty = new ColorMaterialProperty();
property = materialProperty = new CompositeMaterialProperty();
property = materialProperty = new GridMaterialProperty();
property = materialProperty = new ImageMaterialProperty();
property = materialProperty = new PolylineGlowMaterialProperty();
property = materialProperty = new PolylineOutlineMaterialProperty();
property = materialProperty = new StripeMaterialProperty();
property = materialProperty = new CheckerboardMaterialProperty();
property = materialProperty = new PolylineDashMaterialProperty();
property = materialProperty = new PolylineArrowMaterialProperty();

// Verify GeometryInstance can be take XXXGeometry objects.
let geometryInstance: GeometryInstance;

geometryInstance = new GeometryInstance({
  geometry: new BoxGeometry({
    minimum: new Cartesian3(0, 0, 0),
    maximum: new Cartesian3(1, 1, 1),
  }),
});

geometryInstance = new GeometryInstance({
  geometry: new BoxOutlineGeometry({
    minimum: new Cartesian3(0, 0, 0),
    maximum: new Cartesian3(1, 1, 1),
  }),
});

geometryInstance = new GeometryInstance({
  geometry: new CircleGeometry({
    center: new Cartesian3(0, 0, 0),
    radius: 10,
  }),
});

geometryInstance = new GeometryInstance({
  geometry: new CircleOutlineGeometry({
    center: new Cartesian3(0, 0, 0),
    radius: 10,
  }),
});

geometryInstance = new GeometryInstance({
  geometry: new CoplanarPolygonGeometry({
    polygonHierarchy: new PolygonHierarchy(),
  }),
});

geometryInstance = new GeometryInstance({
  geometry: new CoplanarPolygonOutlineGeometry({
    polygonHierarchy: new PolygonHierarchy(),
  }),
});

geometryInstance = new GeometryInstance({
  geometry: new CorridorGeometry({ positions: [], width: 1 }),
});

geometryInstance = new GeometryInstance({
  geometry: new CorridorOutlineGeometry({ positions: [], width: 1 }),
});

geometryInstance = new GeometryInstance({
  geometry: new CylinderGeometry({
    bottomRadius: 10,
    length: 10,
    topRadius: 10,
  }),
});

geometryInstance = new GeometryInstance({
  geometry: new CylinderOutlineGeometry({
    bottomRadius: 10,
    length: 10,
    topRadius: 10,
  }),
});

geometryInstance = new GeometryInstance({
  geometry: new EllipseGeometry({
    center: Cartesian3.ZERO,
    semiMajorAxis: 1,
    semiMinorAxis: 10,
  }),
});

geometryInstance = new GeometryInstance({
  geometry: new EllipseOutlineGeometry({
    center: Cartesian3.ZERO,
    semiMajorAxis: 1,
    semiMinorAxis: 10,
  }),
});

geometryInstance = new GeometryInstance({
  geometry: new EllipsoidGeometry(),
});

geometryInstance = new GeometryInstance({
  geometry: new EllipsoidOutlineGeometry(),
});

geometryInstance = new GeometryInstance({
  geometry: new FrustumGeometry({
    frustum: new OrthographicFrustum(),
    orientation: new Quaternion(),
    origin: Cartesian3.ZERO,
  }),
});

geometryInstance = new GeometryInstance({
  geometry: new FrustumOutlineGeometry({
    frustum: new OrthographicFrustum(),
    orientation: new Quaternion(),
    origin: Cartesian3.ZERO,
  }),
});

geometryInstance = new GeometryInstance({
  geometry: new GroundPolylineGeometry({ positions: [] }),
});

geometryInstance = new GeometryInstance({
  geometry: new PlaneGeometry(),
});

geometryInstance = new GeometryInstance({
  geometry: new PlaneOutlineGeometry(),
});

geometryInstance = new GeometryInstance({
  geometry: new PolygonGeometry({ polygonHierarchy: new PolygonHierarchy() }),
});

geometryInstance = new GeometryInstance({
  geometry: new PolygonOutlineGeometry({
    polygonHierarchy: new PolygonHierarchy(),
  }),
});

geometryInstance = new GeometryInstance({
  geometry: new PolylineGeometry({
    positions: [],
  }),
});

geometryInstance = new GeometryInstance({
  geometry: new PolylineVolumeGeometry({
    polylinePositions: [],
    shapePositions: [],
  }),
});

geometryInstance = new GeometryInstance({
  geometry: new PolylineVolumeOutlineGeometry({
    polylinePositions: [],
    shapePositions: [],
  }),
});

geometryInstance = new GeometryInstance({
  geometry: new RectangleGeometry({ rectangle: Rectangle.MAX_VALUE }),
});

geometryInstance = new GeometryInstance({
  geometry: new RectangleOutlineGeometry({ rectangle: Rectangle.MAX_VALUE }),
});

geometryInstance = new GeometryInstance({
  geometry: new SimplePolylineGeometry({
    positions: [],
  }),
});

geometryInstance = new GeometryInstance({
  geometry: new SphereGeometry(),
});

geometryInstance = new GeometryInstance({
  geometry: new SphereOutlineGeometry(),
});

geometryInstance = new GeometryInstance({
  geometry: new WallGeometry({
    positions: [],
  }),
});

geometryInstance = new GeometryInstance({
  geometry: new WallOutlineGeometry({
    positions: [],
  }),
});

const canvas: HTMLCanvasElement | undefined = writeTextToCanvas("test");

let pb = new PropertyBag();
let hasProp: boolean = pb.hasProperty("xyz");
property = pb.xyz;

// Validate overridden defined with type predicate
let pos: Cartesian3 | undefined | null;
if (defined(pos)) {
  pos.clone();
}
function consumeDefined(pos: Cartesian3) {
  pos.clone();
}
pos = undefined;
if (defined(pos)) {
  consumeDefined(pos);
}
