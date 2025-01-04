import { cloneDeep } from 'lodash-es';
import * as Cesium from 'cesium';
import * as topoJson from 'topojson';
import * as topoJsonClient from 'topojson-client';

import type { Feature, FeatureCollection } from './types/geojson';

const deepObjectMerge = (target: any, source: any) => {
  if (!target) target = {};
  for (const key in source) {
    if ((key as any).hasOwnProperty) {
      target[key] =
        target[key] &&
        source[key] &&
        Object.prototype.toString.call(target[key]) === '[object Object]' &&
        Object.prototype.toString.call(source[key]) === '[object Object]'
          ? deepObjectMerge(target[key], source[key])
          : (target[key] = source[key]);
    }
  }
  return target;
};

function isObject(value: any) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function coordsToLatLng(coords: number[]) {
  return [coords[0], coords[1]];
}

function coordsToLatLngs(coords: any, levelsDeep: number, _coordsToLatLng: Function) {
  const latLngs: number[][][] | number[][][][] = [];
  for (let i = 0, len = coords.length, latlng; i < len; i++) {
    latlng = levelsDeep
      ? coordsToLatLngs(coords[i], levelsDeep - 1, _coordsToLatLng)
      : (_coordsToLatLng || coordsToLatLng)(coords[i]);
    latLngs.push(latlng);
  }
  return latLngs;
}

export interface ContourLine3DStyleOptions {
  type?: 'dashed' | 'solid';
  width?: number;
  color?: string;
  show?: boolean;
  dashPattern?: number;
  height?: number;
  renderCallBack?: (props: any) => ContourLine3DStyleOptions | undefined;
}
export interface ContourPolygon3DStyleOptions {
  fillColor?: string;
  height?: number;
  extrudedHeight?: number;
  stRotation?: number;
  granularity?: number;
  perPositionHeight?: boolean;
  closeTop?: boolean;
  closeBottom?: boolean;
  renderCallBack?: (props: any) => ContourPolygon3DStyleOptions | undefined;
}
export interface ContourLineLayer3DOptions {
  ground?: boolean;
  isFill?: boolean;
  merge?: boolean;
  fillStyle?: ContourPolygon3DStyleOptions;
  lineStyle?: ContourLine3DStyleOptions;
}

export class ContourGeoJsonLayer3D extends Cesium.PrimitiveCollection {
  map: any;

  isAdd = false;

  labelSource: Cesium.CustomDataSource = new Cesium.CustomDataSource();

  options: ContourLineLayer3DOptions = {
    ground: false,
    isFill: true,
    lineStyle: {
      type: 'solid',
      width: 1,
      color: '#fff'
    },
    fillStyle: {
      fillColor: '#f00'
    }
  };

  data: FeatureCollection | undefined = { type: 'FeatureCollection', features: [] };

  constructor(data?: FeatureCollection | Feature, options?: ContourLineLayer3DOptions) {
    super();
    if (data && data.type === 'Feature') {
      this.data = { type: 'FeatureCollection', features: [data] };
    }
    if (data && data.type === 'FeatureCollection') {
      this.data = data;
    }
    this.createOptions(options);
  }

  private createOptions(options?: ContourLineLayer3DOptions) {
    if (!options) return;
    this.options = deepObjectMerge(this.options, options);
  }

  private setLineStyle(style: ContourLine3DStyleOptions) {
    let oldStyle = cloneDeep(this.options.lineStyle);
    let newStyle: ContourLine3DStyleOptions | undefined;
    if (!isObject(style)) {
      newStyle = this.options.lineStyle;
    } else {
      newStyle = deepObjectMerge(this.options.lineStyle, style);
    }
    this.options.lineStyle = oldStyle;
    return newStyle;
  }

  private setPolygonStyle(style: ContourPolygon3DStyleOptions) {
    let oldStyle = cloneDeep(this.options.fillStyle);
    let newStyle: ContourPolygon3DStyleOptions | undefined;
    if (!isObject(style)) {
      newStyle = this.options.fillStyle;
    } else {
      newStyle = deepObjectMerge(this.options.fillStyle, style);
    }
    this.options.fillStyle = oldStyle;
    return newStyle;
  }

  private drawFeature(feature: Feature) {
    const coords = (feature.geometry as any).coordinates;
    const arr = coordsToLatLngs(
      coords,
      feature.geometry.type === 'Polygon' || feature.geometry.type === 'LineString' ? 1 : 2,
      coordsToLatLng
    );
    if (this.options.isFill) {
      arr.forEach((pointsArr) => {
        if (Array.isArray(pointsArr[0][0])) {
          this.drawPolygon(pointsArr as number[][][], feature);
          pointsArr.forEach((points) => {
            this.drawLine(points as number[][], feature);
          });
        } else {
          this.drawPolygon([pointsArr] as number[][][], feature);
          this.drawLine(pointsArr as number[][], feature);
        }
      });
    } else {
      arr.forEach((pointsArr) => {
        if (Array.isArray(pointsArr[0][0])) {
          pointsArr.forEach((points) => {
            this.drawLine(points as number[][], feature);
          });
        } else {
          this.drawLine(pointsArr as number[][], feature);
        }
      });
    }
  }

  private drawPolygon(points: number[][][], feature: Feature) {
    let fillStyle = this.setPolygonStyle(this.options.fillStyle!);
    const properties = feature.properties as any;
    if (this.options.fillStyle?.renderCallBack) {
      const style = this.options.fillStyle.renderCallBack(properties);
      fillStyle = this.setLineStyle(style || {});
    }
    const holes = points
      .slice(1)
      .map(
        (coords) => new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(coords.flat()))
      );
    const polygonGeometry = new Cesium.PolygonGeometry({
      polygonHierarchy: new Cesium.PolygonHierarchy(
        Cesium.Cartesian3.fromDegreesArray(points[0].flat()),
        holes
      ),
      vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
      ...fillStyle
    });
    const instance = new Cesium.GeometryInstance({
      geometry: polygonGeometry,
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          Cesium.Color.fromCssColorString(fillStyle?.fillColor || '#0000')
        )
      }
    });
    const Primitive = this.options.ground ? Cesium.GroundPrimitive : Cesium.Primitive;
    this.add(
      new Primitive({
        geometryInstances: instance,
        appearance: new Cesium.PerInstanceColorAppearance({ translucent: false, flat: false }),
        asynchronous: false,
      })
    );
  }

  private drawLine(points: number[][], feature: Feature) {
    let lineStyle = this.setLineStyle(this.options.lineStyle!);
    const properties = feature.properties as any;
    if (this.options.lineStyle?.renderCallBack) {
      const style = this.options.lineStyle.renderCallBack(properties);
      lineStyle = this.setLineStyle(style || {});
    }
    if (lineStyle?.show === false) return;
    const Geometry = this.options.ground ? Cesium.GroundPolylineGeometry : Cesium.PolylineGeometry;
    const pts = points.flat();
    const positions: Cesium.Cartesian3[] = [];
    for (let i = 0; i < pts.length; i += 2) {
      positions.push(Cesium.Cartesian3.fromDegrees(pts[i], pts[i + 1], lineStyle?.height || 0));
    }
    const polyline = new Geometry({
      positions,
      width: lineStyle?.width || 2,
      vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT
    });
    const instance = new Cesium.GeometryInstance({
      geometry: polyline as Cesium.PolylineGeometry,
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          Cesium.Color.fromCssColorString(lineStyle?.color || '#000')
        )
      }
    });
    const Primitive = this.options.ground ? Cesium.GroundPolylinePrimitive : Cesium.Primitive;
    this.add(
      new Primitive({
        geometryInstances: instance,
        appearance: new Cesium.PolylineColorAppearance({ translucent: true }),
        asynchronous: false
      })
    );
  }

  private render() {
    if (!this.data) return;
    const data = this.data.features;
    if (this.options.merge) {
      const topoJsonData: any = topoJson.topology({ geoJson: this.data! });
      const outMultiPolygon = topoJsonClient.merge(
        topoJsonData,
        topoJsonData.objects.geoJson.geometries
      );
      const coordsArr = outMultiPolygon.coordinates;
      coordsArr.forEach((coords) => {
        coords.forEach((points) => {
          if (this.options.isFill) {
            this.drawPolygon([points] as number[][][], {} as any);
            this.drawLine(points as number[][], {} as any);
          } else {
            this.drawLine(points as number[][], {} as any);
          }
        });
      });
      return;
    }
    for (let i = 0; i < data.length; i++) {
      this.drawFeature(data[i]);
    }
    console.timeEnd('render polylines');
  }

  addTo(map: any) {
    this.map = map;
    if (!this.map) return;
    this.remove();
    this.render();
    this.setVisible(true);
    if (!this.isAdd) {
      this.map.dataSources.add(this.labelSource).then();
      this.map.scene.primitives.add(this);
      this.isAdd = true;
    }
  }

  // @ts-ignore
  remove() {
    this.labelSource.entities.removeAll();
    this.removeAll();
  }

  setVisible(visible: boolean) {
    this.show = visible;
    this.labelSource.show = visible;
  }

  changeData(data?: FeatureCollection, options?: ContourLineLayer3DOptions) {
    this.remove();
    this.data = data;
    this.createOptions(options);
    this.render();
  }
}

export function contourGeoJsonLayer3D(
  data?: FeatureCollection,
  options?: ContourLineLayer3DOptions
) {
  return new ContourGeoJsonLayer3D(data, options);
}

