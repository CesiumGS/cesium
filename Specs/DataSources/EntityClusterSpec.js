/*global defineSuite*/
defineSuite([
        'DataSources/EntityCluster',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/defineProperties',
        'Core/Ellipsoid',
        'Core/Event',
        'DataSources/Entity',
        'Scene/SceneTransforms',
        'Specs/createCanvas',
        'Specs/createGlobe',
        'Specs/createScene',
    ], function(
        EntityCluster,
        Cartesian2,
        Cartesian3,
        defineProperties,
        Ellipsoid,
        Event,
        Entity,
        SceneTransforms,
        createCanvas,
        createGlobe,
        createScene) {
    'use strict';

    var scene;
    var cluster;

    beforeAll(function() {
        scene = createScene({
            canvas : createCanvas(10, 10)
        });
        scene.globe = {
            ellipsoid : Ellipsoid.WGS84,
            _surface : {
                tileProvider : {
                    ready : true
                },
                _tileLoadQueue : {},
                _debug : {
                    tilesWaitingForChildren : 0
                }
            },
            beginFrame : function() {},
            update : function() {},
            endFrame : function() {}

        };

        scene.globe.getHeight = function() {
            return 0.0;
        };

        scene.globe.destroy = function() {
        };

        scene.globe._surface.updateHeight = function() {
        };

        scene.globe.terrainProviderChanged = new Event();
        defineProperties(scene.globe, {
            terrainProvider : {
                set : function(value) {
                    this.terrainProviderChanged.raiseEvent(value);
                }
            }
        });

        var camera = scene.camera;
        camera.setView({
            destination : Cartesian3.fromDegrees(0.0, 0.0, 10000.0)
        });

        scene.initializeFrame();
        scene.render();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        cluster = cluster && cluster.destroy();
    });

    it('constructor sets default properties', function() {
        cluster = new EntityCluster();
        expect(cluster.enabled).toEqual(false);
        expect(cluster.pixelRange).toEqual(80);
        expect(cluster.minimumClusterSize).toEqual(2);

        cluster.enabled = true;
        expect(cluster.enabled).toEqual(true);

        cluster.pixelRange = 30;
        expect(cluster.pixelRange).toEqual(30);

        cluster.minimumClusterSize = 5;
        expect(cluster.minimumClusterSize).toEqual(5);
    });

    it('constructor sets expected properties', function() {
        var options = {
            enabled : true,
            pixelRange : 30,
            minimumClusterSize : 5
        };
        cluster = new EntityCluster(options);
        expect(cluster.enabled).toEqual(options.enabled);
        expect(cluster.pixelRange).toEqual(options.pixelRange);
        expect(cluster.minimumClusterSize).toEqual(options.minimumClusterSize);
    });

    function createBillboardImage() {
        var canvas = document.createElement('canvas');
        canvas.height = canvas.width = 1;

        var context2D = canvas.getContext('2d');
        context2D.clearRect(0, 0, length, length);
        context2D.fillStyle="#FF0000";
        context2D.fillRect(0, 0, length, length);

        return canvas;
    }

    it('clusters billboards', function() {
        cluster = new EntityCluster();
        cluster._initialize(scene);

        var entity = new Entity();
        var billboard = cluster.getBillboard(entity);
        billboard.id = entity;
        billboard.image = createBillboardImage();
        billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(scene, new Cartesian2(0.0, 0.0), 0.5);

        entity = new Entity();
        billboard = cluster.getBillboard(entity);
        billboard.id = entity;
        billboard.image = createBillboardImage();
        billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(scene, new Cartesian2(scene.canvas.clientWidth, scene.canvas.clientHeight), 0.5);

        var frameState = scene.frameState;
        cluster.update(frameState);

        expect(cluster._clusterLabelCollection).not.toBeDefined();

        cluster.enabled = true;
        cluster.update(frameState);

        expect(cluster._clusterLabelCollection).toBeDefined();
        expect(cluster._clusterLabelCollection.length).toEqual(1);

        cluster.enabled = false;
        cluster.update(frameState);

        expect(cluster._clusterLabelCollection).not.toBeDefined();
    });

    it('clusters labels', function() {
        cluster = new EntityCluster();
        cluster._initialize(scene);

        var entity = new Entity();
        var label = cluster.getLabel(entity);
        label.id = entity;
        label.text = 'a';
        label.position = SceneTransforms.drawingBufferToWgs84Coordinates(scene, new Cartesian2(0.0, 0.0), 0.5);

        entity = new Entity();
        label = cluster.getLabel(entity);
        label.id = entity;
        label.text = 'b';
        label.position = SceneTransforms.drawingBufferToWgs84Coordinates(scene, new Cartesian2(scene.canvas.clientWidth, scene.canvas.clientHeight), 0.5);

        var frameState = scene.frameState;
        cluster.update(frameState);

        expect(cluster._clusterLabelCollection).not.toBeDefined();

        cluster.enabled = true;
        cluster.update(frameState);

        expect(cluster._clusterLabelCollection).toBeDefined();
        expect(cluster._clusterLabelCollection.length).toEqual(1);

        cluster.enabled = false;
        cluster.update(frameState);

        expect(cluster._clusterLabelCollection).not.toBeDefined();
    });

    it('clusters points', function() {
        cluster = new EntityCluster();
        cluster._initialize(scene);

        var entity = new Entity();
        var point = cluster.getPoint(entity);
        point.id = entity;
        point.pixelSize = 1;
        point.position = SceneTransforms.drawingBufferToWgs84Coordinates(scene, new Cartesian2(0.0, 0.0), 0.5);

        entity = new Entity();
        point = cluster.getPoint(entity);
        point.id = entity;
        point.pixelSize = 1;
        point.position = SceneTransforms.drawingBufferToWgs84Coordinates(scene, new Cartesian2(scene.canvas.clientWidth, scene.canvas.clientHeight), 0.5);

        var frameState = scene.frameState;
        cluster.update(frameState);

        expect(cluster._clusterLabelCollection).not.toBeDefined();

        cluster.enabled = true;
        cluster.update(frameState);

        expect(cluster._clusterLabelCollection).toBeDefined();
        expect(cluster._clusterLabelCollection.length).toEqual(1);

        cluster.enabled = false;
        cluster.update(frameState);

        expect(cluster._clusterLabelCollection).not.toBeDefined();
    });

    it('pixel range', function() {
        cluster = new EntityCluster();
        cluster._initialize(scene);

        var entity = new Entity();
        var billboard = cluster.getBillboard(entity);
        billboard.id = entity;
        billboard.image = createBillboardImage();
        billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(scene, new Cartesian2(0.0, 0.0), 0.5);

        entity = new Entity();
        billboard = cluster.getBillboard(entity);
        billboard.id = entity;
        billboard.image = createBillboardImage();
        billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(scene, new Cartesian2(scene.canvas.clientWidth, scene.canvas.clientHeight), 0.5);

        var frameState = scene.frameState;
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

    it('minimum cluster size', function() {
        cluster = new EntityCluster();
        cluster._initialize(scene);

        var entity = new Entity();
        var billboard = cluster.getBillboard(entity);
        billboard.id = entity;
        billboard.image = createBillboardImage();
        billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(scene, new Cartesian2(0.0, 0.0), 0.5);

        entity = new Entity();
        billboard = cluster.getBillboard(entity);
        billboard.id = entity;
        billboard.image = createBillboardImage();
        billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(scene, new Cartesian2(scene.canvas.clientWidth, 0), 0.5);

        entity = new Entity();
        billboard = cluster.getBillboard(entity);
        billboard.id = entity;
        billboard.image = createBillboardImage();
        billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(scene, new Cartesian2(0, scene.canvas.clientHeight), 0.5);

        entity = new Entity();
        billboard = cluster.getBillboard(entity);
        billboard.id = entity;
        billboard.image = createBillboardImage();
        billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(scene, new Cartesian2(scene.canvas.clientWidth, scene.canvas.clientHeight), 0.5);

        var frameState = scene.frameState;
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

    it('clusters around the same point', function() {
        cluster = new EntityCluster();
        cluster._initialize(scene);

        var entity = new Entity();
        var billboard = cluster.getBillboard(entity);
        billboard.id = entity;
        billboard.image = createBillboardImage();
        billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(scene, new Cartesian2(0.0, 0.0), 0.9);

        entity = new Entity();
        billboard = cluster.getBillboard(entity);
        billboard.id = entity;
        billboard.image = createBillboardImage();
        billboard.position = SceneTransforms.drawingBufferToWgs84Coordinates(scene, new Cartesian2(scene.canvas.clientWidth, scene.canvas.clientHeight), 0.9);

        var frameState = scene.frameState;
        cluster.update(frameState);

        expect(cluster._clusterLabelCollection).not.toBeDefined();

        cluster.enabled = true;
        cluster.update(frameState);

        expect(cluster._clusterLabelCollection).toBeDefined();
        expect(cluster._clusterLabelCollection.length).toEqual(1);

        var position = Cartesian3.clone(cluster._clusterLabelCollection.get(0).position);

        scene.camera.moveForward(1.0e-6);
        cluster.pixelRange = cluster.pixelRange - 1;
        cluster.update(frameState);

        expect(cluster._clusterLabelCollection).toBeDefined();
        expect(cluster._clusterLabelCollection.length).toEqual(1);
        expect(cluster._clusterLabelCollection.get(0).position).toEqual(position);
    });

    it('custom cluster styling', function() {
        cluster = new EntityCluster();
        cluster._initialize(scene);

        cluster.clusterEvent.addEventListener(function(cluster, entity) {
            entity.billboard = {
                image : createBillboardImage()
            };
            entity.label = {
                text : 'cluster'
            };
        });

        var entity = new Entity();
        var point = cluster.getPoint(entity);
        point.id = entity;
        point.pixelSize = 1;
        point.position = SceneTransforms.drawingBufferToWgs84Coordinates(scene, new Cartesian2(0.0, 0.0), 0.9);

        entity = new Entity();
        point = cluster.getPoint(entity);
        point.id = entity;
        point.pixelSize = 1;
        point.position = SceneTransforms.drawingBufferToWgs84Coordinates(scene, new Cartesian2(scene.canvas.clientWidth, scene.canvas.clientHeight), 0.9);

        var frameState = scene.frameState;
        cluster.update(frameState);

        expect(cluster._clusterBillboardCollection).not.toBeDefined();
        expect(cluster._clusterLabelCollection).not.toBeDefined();

        cluster.enabled = true;
        cluster.update(frameState);

        expect(cluster._clusterLabelCollection).toBeDefined();
        expect(cluster._clusterLabelCollection.length).toEqual(1);
        expect(cluster._clusterLabelCollection.get(0).text).toEqual('cluster');

        expect(cluster._clusterBillboardCollection).toBeDefined();
        expect(cluster._clusterBillboardCollection.length).toEqual(1);
    });
}, 'WebGL');
