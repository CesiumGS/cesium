import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { Event } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { CustomDataSource } from "../../Source/Cesium.js";
import { DataSourceDisplay } from "../../Source/Cesium.js";
import { Entity } from "../../Source/Cesium.js";
import { EntityCluster } from "../../Source/Cesium.js";
import { SceneTransforms } from "../../Source/Cesium.js";
import createCanvas from "../createCanvas.js";
import createScene from "../createScene.js";

describe(
  "DataSources/EntityCluster",
  function () {
    let scene;
    let cluster;
    let depth;
    let farDepth;

    beforeAll(function () {
      scene = createScene({
        canvas: createCanvas(10, 10),
      });
      scene.globe = {
        ellipsoid: Ellipsoid.WGS84,
        _surface: {
          tileProvider: {
            ready: true,
          },
          _tileLoadQueueHigh: [],
          _tileLoadQueueMedium: [],
          _tileLoadQueueLow: [],
          _debug: {
            tilesWaitingForChildren: 0,
          },
        },
        terrainProviderChanged: new Event(),
        imageryLayersUpdatedEvent: new Event(),
        beginFrame: function () {},
        update: function () {},
        render: function () {},
        endFrame: function () {},
      };

      scene.globe.getHeight = function () {
        return 0.0;
      };

      scene.globe.destroy = function () {};

      scene.globe._surface.updateHeight = function () {};

      scene.globe.terrainProviderChanged = new Event();
      Object.defineProperties(scene.globe, {
        terrainProvider: {
          set: function (value) {
            this.terrainProviderChanged.raiseEvent(value);
          },
        },
      });

      const camera = scene.camera;
      camera.setView({
        destination: Cartesian3.fromDegrees(0.0, 0.0, 10000.0),
      });

      scene.initializeFrame();
      scene.render();

      if (scene.logarithmicDepthBuffer) {
        depth = farDepth = 0.1;
      } else {
        depth = 0.5;
        farDepth = 0.9;
      }
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      cluster = cluster && cluster.destroy();
    });

    it("constructor sets default properties", function () {
      cluster = new EntityCluster();
      expect(cluster.enabled).toEqual(false);
      expect(cluster.show).toEqual(true);
      expect(cluster.pixelRange).toEqual(80);
      expect(cluster.minimumClusterSize).toEqual(2);
      expect(cluster.clusterBillboards).toEqual(true);
      expect(cluster.clusterLabels).toEqual(true);
      expect(cluster.clusterPoints).toEqual(true);

      cluster.enabled = true;
      expect(cluster.enabled).toEqual(true);

      cluster.pixelRange = 30;
      expect(cluster.pixelRange).toEqual(30);

      cluster.minimumClusterSize = 5;
      expect(cluster.minimumClusterSize).toEqual(5);
    });

    it("constructor sets expected properties", function () {
      const options = {
        enabled: true,
        show: false,
        pixelRange: 30,
        minimumClusterSize: 5,
        clusterBillboards: false,
        clusterLabels: false,
        clusterPoints: false,
      };
      cluster = new EntityCluster(options);
      expect(cluster.enabled).toEqual(options.enabled);
      expect(cluster.show).toEqual(false);
      expect(cluster.pixelRange).toEqual(options.pixelRange);
      expect(cluster.minimumClusterSize).toEqual(options.minimumClusterSize);
      expect(cluster.clusterBillboards).toEqual(options.clusterBillboards);
      expect(cluster.clusterLabels).toEqual(options.clusterLabels);
      expect(cluster.clusterPoints).toEqual(options.clusterPoints);
    });

    function createBillboardImage() {
      const canvas = document.createElement("canvas");
      canvas.height = canvas.width = 1;

      const context2D = canvas.getContext("2d");
      context2D.clearRect(0, 0, length, length);
      context2D.fillStyle = "#FF0000";
      context2D.fillRect(0, 0, length, length);

      return canvas;
    }

    it("clusters billboards", function () {
      cluster = new EntityCluster();
      cluster._initialize(scene);

      let entity = new Entity();
      let billboard = cluster.getBillboard(entity);
      billboard.id = entity;
      billboard.image = createBillboardImage();
      billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(0.0, 0.0),
        depth
      );

      entity = new Entity();
      billboard = cluster.getBillboard(entity);
      billboard.id = entity;
      billboard.image = createBillboardImage();
      billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(scene.canvas.clientWidth, scene.canvas.clientHeight),
        depth
      );

      const frameState = scene.frameState;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).not.toBeDefined();

      cluster.enabled = true;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).toBeDefined();
      expect(cluster._clusterLabelCollection.length).toEqual(1);

      cluster.clusterBillboards = false;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).not.toBeDefined();
    });

    it("clusters billboards on first update", function () {
      cluster = new EntityCluster();
      cluster._initialize(scene);

      let entity = new Entity();
      let billboard = cluster.getBillboard(entity);
      billboard.id = entity;
      billboard.image = createBillboardImage();
      billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(0.0, 0.0),
        depth
      );

      entity = new Entity();
      billboard = cluster.getBillboard(entity);
      billboard.id = entity;
      billboard.image = createBillboardImage();
      billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(scene.canvas.clientWidth, scene.canvas.clientHeight),
        depth
      );

      cluster.enabled = true;
      cluster.update(scene.frameState);

      expect(cluster._clusterLabelCollection).toBeDefined();
      expect(cluster._clusterLabelCollection.length).toEqual(1);
    });

    it("clusters labels", function () {
      cluster = new EntityCluster();
      cluster._initialize(scene);

      let entity = new Entity();
      let label = cluster.getLabel(entity);
      label.id = entity;
      label.text = "a";
      label.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(0.0, 0.0),
        depth
      );

      entity = new Entity();
      label = cluster.getLabel(entity);
      label.id = entity;
      label.text = "b";
      label.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(scene.canvas.clientWidth, scene.canvas.clientHeight),
        depth
      );

      const frameState = scene.frameState;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).not.toBeDefined();

      cluster.enabled = true;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).toBeDefined();
      expect(cluster._clusterLabelCollection.length).toEqual(1);

      cluster.clusterLabels = false;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).not.toBeDefined();
    });

    it("clusters labels on first update", function () {
      cluster = new EntityCluster();
      cluster._initialize(scene);

      let entity = new Entity();
      let label = cluster.getLabel(entity);
      label.id = entity;
      label.text = "a";
      label.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(0.0, 0.0),
        depth
      );

      entity = new Entity();
      label = cluster.getLabel(entity);
      label.id = entity;
      label.text = "b";
      label.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(scene.canvas.clientWidth, scene.canvas.clientHeight),
        depth
      );

      cluster.enabled = true;
      cluster.update(scene.frameState);

      expect(cluster._clusterLabelCollection).toBeDefined();
      expect(cluster._clusterLabelCollection.length).toEqual(1);
    });

    it("clusters points", function () {
      cluster = new EntityCluster();
      cluster._initialize(scene);

      let entity = new Entity();
      let point = cluster.getPoint(entity);
      point.id = entity;
      point.pixelSize = 1;
      point.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(0.0, 0.0),
        depth
      );

      entity = new Entity();
      point = cluster.getPoint(entity);
      point.id = entity;
      point.pixelSize = 1;
      point.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(scene.canvas.clientWidth, scene.canvas.clientHeight),
        depth
      );

      const frameState = scene.frameState;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).not.toBeDefined();

      cluster.enabled = true;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).toBeDefined();
      expect(cluster._clusterLabelCollection.length).toEqual(1);

      cluster.clusterPoints = false;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).not.toBeDefined();
    });

    it("clusters points on first update", function () {
      cluster = new EntityCluster();
      cluster._initialize(scene);

      let entity = new Entity();
      let point = cluster.getPoint(entity);
      point.id = entity;
      point.pixelSize = 1;
      point.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(0.0, 0.0),
        depth
      );

      entity = new Entity();
      point = cluster.getPoint(entity);
      point.id = entity;
      point.pixelSize = 1;
      point.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(scene.canvas.clientWidth, scene.canvas.clientHeight),
        depth
      );

      cluster.enabled = true;
      cluster.update(scene.frameState);

      expect(cluster._clusterLabelCollection).toBeDefined();
      expect(cluster._clusterLabelCollection.length).toEqual(1);
    });

    it("clusters points that have labels", function () {
      cluster = new EntityCluster();
      cluster._initialize(scene);

      let entity = new Entity();
      let point = cluster.getPoint(entity);
      point.id = entity;
      point.pixelSize = 1;
      point.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(0.0, 0.0),
        depth
      );

      entity = new Entity();
      point = cluster.getPoint(entity);
      point.id = entity;
      point.pixelSize = 1;
      point.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(scene.canvas.clientWidth, scene.canvas.clientHeight),
        depth
      );

      const frameState = scene.frameState;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).not.toBeDefined();

      point.id.label = cluster.getLabel(entity);

      cluster.enabled = true;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).toBeDefined();
      expect(cluster._clusterLabelCollection.length).toEqual(1);

      cluster.clusterPoints = false;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).not.toBeDefined();
    });

    it("records entity collection indices on getting billboard, label and point", function () {
      cluster = new EntityCluster();
      cluster._initialize(scene);

      const entity = new Entity();
      cluster.getBillboard(entity);
      cluster.getLabel(entity);
      cluster.getPoint(entity);

      expect(
        cluster._collectionIndicesByEntity[entity.id].billboardIndex
      ).toBeDefined();
      expect(
        cluster._collectionIndicesByEntity[entity.id].labelIndex
      ).toBeDefined();
      expect(
        cluster._collectionIndicesByEntity[entity.id].pointIndex
      ).toBeDefined();
    });

    it("removes entity collection indices when billboard, label and point have been removed", function () {
      cluster = new EntityCluster();
      cluster._initialize(scene);

      const entity = new Entity();
      cluster.getBillboard(entity);
      cluster.getLabel(entity);
      cluster.getPoint(entity);

      cluster.removeBillboard(entity);
      cluster.removeLabel(entity);
      cluster.removePoint(entity);

      expect(cluster._collectionIndicesByEntity[entity.id]).toBeUndefined();
    });

    it("can destroy cluster and re-add entities", function () {
      cluster = new EntityCluster();
      cluster._initialize(scene);

      const entity1 = new Entity();
      const billboard = cluster.getBillboard(entity1);
      billboard.id = entity1;

      const entity2 = new Entity();
      const label = cluster.getLabel(entity2);
      label.id = entity2;

      const entity3 = new Entity();
      const point = cluster.getPoint(entity3);
      point.id = entity3;

      cluster.destroy();
      expect(cluster._billboardCollection).not.toBeDefined();
      expect(cluster._labelCollection).not.toBeDefined();
      expect(cluster._pointCollection).not.toBeDefined();

      expect(cluster.getBillboard(entity1)).toBeDefined();
      expect(cluster.getLabel(entity2)).toBeDefined();
      expect(cluster.getPoint(entity3)).toBeDefined();
      expect(cluster._billboardCollection).toBeDefined();
      expect(cluster._labelCollection).toBeDefined();
      expect(cluster._pointCollection).toBeDefined();
    });

    it("does not remove entity collection indices when at least one of billboard, label and point remain", function () {
      cluster = new EntityCluster();
      cluster._initialize(scene);

      const entity = new Entity();
      cluster.getBillboard(entity);
      cluster.getLabel(entity);
      cluster.getPoint(entity);

      cluster.removeBillboard(entity);
      cluster.removeLabel(entity);

      expect(cluster._collectionIndicesByEntity[entity.id]).toBeDefined();
    });

    it("pixel range", function () {
      cluster = new EntityCluster();
      cluster._initialize(scene);

      let entity = new Entity();
      let billboard = cluster.getBillboard(entity);
      billboard.id = entity;
      billboard.image = createBillboardImage();
      billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(0.0, 0.0),
        depth
      );

      entity = new Entity();
      billboard = cluster.getBillboard(entity);
      billboard.id = entity;
      billboard.image = createBillboardImage();
      billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(scene.canvas.clientWidth, scene.canvas.clientHeight),
        depth
      );

      const frameState = scene.frameState;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).not.toBeDefined();

      cluster.enabled = true;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).toBeDefined();
      expect(cluster._clusterLabelCollection.length).toEqual(1);

      cluster.pixelRange = 1;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).not.toBeDefined();
    });

    it("minimum cluster size", function () {
      cluster = new EntityCluster();
      cluster._initialize(scene);

      let entity = new Entity();
      let billboard = cluster.getBillboard(entity);
      billboard.id = entity;
      billboard.image = createBillboardImage();
      billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(0.0, 0.0),
        depth
      );

      entity = new Entity();
      billboard = cluster.getBillboard(entity);
      billboard.id = entity;
      billboard.image = createBillboardImage();
      billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(scene.canvas.clientWidth, 0),
        depth
      );

      entity = new Entity();
      billboard = cluster.getBillboard(entity);
      billboard.id = entity;
      billboard.image = createBillboardImage();
      billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(0, scene.canvas.clientHeight),
        depth
      );

      entity = new Entity();
      billboard = cluster.getBillboard(entity);
      billboard.id = entity;
      billboard.image = createBillboardImage();
      billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(scene.canvas.clientWidth, scene.canvas.clientHeight),
        depth
      );

      const frameState = scene.frameState;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).not.toBeDefined();

      cluster.enabled = true;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).toBeDefined();
      expect(cluster._clusterLabelCollection.length).toEqual(1);

      cluster.minimumClusterSize = 5;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).not.toBeDefined();
    });

    it("clusters around the same point", function () {
      cluster = new EntityCluster();
      cluster._initialize(scene);

      let entity = new Entity();
      let billboard = cluster.getBillboard(entity);
      billboard.id = entity;
      billboard.image = createBillboardImage();
      billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(0.0, 0.0),
        farDepth
      );

      entity = new Entity();
      billboard = cluster.getBillboard(entity);
      billboard.id = entity;
      billboard.image = createBillboardImage();
      billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(scene.canvas.clientWidth, scene.canvas.clientHeight),
        farDepth
      );

      const frameState = scene.frameState;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).not.toBeDefined();

      cluster.enabled = true;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).toBeDefined();
      expect(cluster._clusterLabelCollection.length).toEqual(1);

      const position = Cartesian3.clone(
        cluster._clusterLabelCollection.get(0).position
      );

      scene.camera.moveForward(1.0e-6);
      cluster.pixelRange = cluster.pixelRange - 1;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).toBeDefined();
      expect(cluster._clusterLabelCollection.length).toEqual(1);
      expect(cluster._clusterLabelCollection.get(0).position).toEqual(position);
    });

    it("custom cluster styling", function () {
      cluster = new EntityCluster();
      cluster._initialize(scene);

      cluster.clusterEvent.addEventListener(function (
        clusteredEntities,
        cluster
      ) {
        cluster.billboard.show = true;
        cluster.billboard.image = createBillboardImage();
        cluster.label.text = "cluster";
      });

      let entity = new Entity();
      let point = cluster.getPoint(entity);
      point.id = entity;
      point.pixelSize = 1;
      point.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(0.0, 0.0),
        farDepth
      );

      entity = new Entity();
      point = cluster.getPoint(entity);
      point.id = entity;
      point.pixelSize = 1;
      point.position = SceneTransforms.drawingBufferToWgs84Coordinates(
        scene,
        new Cartesian2(scene.canvas.clientWidth, scene.canvas.clientHeight),
        farDepth
      );

      const frameState = scene.frameState;
      cluster.update(frameState);

      expect(cluster._clusterBillboardCollection).not.toBeDefined();
      expect(cluster._clusterLabelCollection).not.toBeDefined();

      cluster.enabled = true;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).toBeDefined();
      expect(cluster._clusterLabelCollection.length).toEqual(1);
      expect(cluster._clusterLabelCollection.get(0).text).toEqual("cluster");

      expect(cluster._clusterBillboardCollection).toBeDefined();
      expect(cluster._clusterBillboardCollection.length).toEqual(1);
    });

    it("renders billboards with invisible labels that are not clustered", function () {
      cluster = new EntityCluster();
      cluster._initialize(scene);
      cluster.minimumClusterSize = 3;

      const dataSource = new CustomDataSource("test");
      dataSource.clustering = cluster;
      dataSource._visualizers = DataSourceDisplay.defaultVisualizersCallback(
        scene,
        cluster,
        dataSource
      );

      const entityCollection = dataSource.entities;

      entityCollection.add({
        position: SceneTransforms.drawingBufferToWgs84Coordinates(
          scene,
          new Cartesian2(0.0, 0.0),
          depth
        ),
        billboard: {
          image: createBillboardImage(),
        },
        label: {
          show: true,
        },
      });

      entityCollection.add({
        position: SceneTransforms.drawingBufferToWgs84Coordinates(
          scene,
          new Cartesian2(scene.canvas.clientWidth, scene.canvas.clientHeight),
          depth
        ),
        billboard: {
          image: createBillboardImage(),
        },
        label: {
          show: true,
        },
      });

      const visualizers = dataSource._visualizers;
      const length = visualizers.length;
      for (let i = 0; i < length; i++) {
        visualizers[i].update(JulianDate.now());
      }

      const frameState = scene.frameState;
      cluster.update(frameState);

      expect(cluster._clusterBillboardCollection).not.toBeDefined();
      expect(cluster._clusterLabelCollection).not.toBeDefined();

      cluster.enabled = true;
      cluster.update(frameState);

      expect(cluster._clusterLabelCollection).not.toBeDefined();
      expect(cluster._clusterBillboardCollection).not.toBeDefined();

      expect(cluster._labelCollection).not.toBeDefined();
      expect(cluster._billboardCollection).toBeDefined();
      expect(cluster._billboardCollection.length).toEqual(2);
    });
  },
  "WebGL"
);
