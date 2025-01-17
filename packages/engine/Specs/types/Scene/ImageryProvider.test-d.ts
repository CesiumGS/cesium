import { expectAssignable } from "tsd";
import {
  ArcGisMapServerImageryProvider,
  BingMapsImageryProvider,
  Color,
  GoogleEarthEnterpriseImageryProvider,
  GoogleEarthEnterpriseMapsProvider,
  GridImageryProvider,
  ImageryProvider,
  IonImageryProvider,
  MapboxImageryProvider,
  MapboxStyleImageryProvider,
  OpenStreetMapImageryProvider,
  SingleTileImageryProvider,
  TileCoordinatesImageryProvider,
  TileMapServiceImageryProvider,
  UrlTemplateImageryProvider,
  WebMapServiceImageryProvider,
  WebMapTileServiceImageryProvider,
} from "@cesium/engine";

// Verify ImageryProvider instances conform to the expected interface
expectAssignable<ImageryProvider>(
  new WebMapServiceImageryProvider({ url: "", layers: "0" }),
);
expectAssignable<ImageryProvider>(new ArcGisMapServerImageryProvider());
expectAssignable<ImageryProvider>(new BingMapsImageryProvider({ key: "" }));
expectAssignable<ImageryProvider>(
  new OpenStreetMapImageryProvider({ url: "" }),
);
expectAssignable<ImageryProvider>(new TileMapServiceImageryProvider());
expectAssignable<ImageryProvider>(
  new GridImageryProvider({
    tileWidth: 256,
    tileHeight: 256,
    color: new Color(1.0, 1.0, 1.0, 0.4),
  }),
);
expectAssignable<ImageryProvider>(new IonImageryProvider());
expectAssignable<ImageryProvider>(
  new MapboxImageryProvider({ mapId: "", accessToken: "" }),
);
expectAssignable<ImageryProvider>(
  new MapboxStyleImageryProvider({
    styleId: "",
    accessToken: "",
  }),
);
expectAssignable<ImageryProvider>(new SingleTileImageryProvider({ url: "" }));
expectAssignable<ImageryProvider>(new TileCoordinatesImageryProvider());
expectAssignable<ImageryProvider>(new UrlTemplateImageryProvider({ url: "" }));
expectAssignable<ImageryProvider>(
  new WebMapServiceImageryProvider({ url: "", layers: "" }),
);
expectAssignable<ImageryProvider>(new GoogleEarthEnterpriseImageryProvider());
expectAssignable<ImageryProvider>(
  new GoogleEarthEnterpriseMapsProvider({
    channel: 1,
  }),
);
expectAssignable<ImageryProvider>(
  new WebMapTileServiceImageryProvider({
    url: "",
    layer: "",
    style: "",
    tileMatrixSetID: "",
  }),
);
