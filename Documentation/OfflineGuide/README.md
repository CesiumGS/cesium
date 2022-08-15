# Offline Guide

By default, Cesium uses several external data sources which require internet access at runtime, though none of these dependencies are required. This guide lists these external sources and how to configure Cesium to work in a fully offline (no internet access) environment.

## Imagery

The default imagery provider in Cesium is Cesium ion global imagery through Bing Maps. This provider loads data from `api.cesium.com` and `dev.virtualearth.net` as well as several other tile servers that are subdomains of `virtualearth.net`. To use another provider, pass it into the constructor for the `Viewer` widget.

If you have an imagery server on your local network (e.g. WMS, ArcGIS, Google Earth Enterprise), you can configure Cesium to use that. Otherwise, Cesium ships with a low-resolution set of images from Natural Earth II in `Assets/Textures/NaturalEarthII`.

By default, the `BaseLayerPicker` includes options for several sample online imagery and terrain sources. In an offline application, you should either disable that widget completely, by passing `baseLayerPicker : false` to the `Viewer` widget, or use the `imageryProviderViewModels` and `terrainProviderViewModels` options to configure the sources that will be available in your offline application.

## Geocoder

The `Geocoder` widget, which allows flying to addresses and landmarks, uses the Cesium ion API at `api.cesium.com`. In your offline application, you should disable this functionality by passing `geocoder : false` to the `Viewer` constructor.

## Example

This example shows how to configure Cesium to avoid use of online data sources.

```javascript
var viewer = new Cesium.Viewer("cesiumContainer", {
  imageryProvider: new Cesium.TileMapServiceImageryProvider({
    url: Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
  }),
  baseLayerPicker: false,
  geocoder: false,
});
```
