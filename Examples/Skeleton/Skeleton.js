/*global require*/
require({
    baseUrl : '../../Source'
}, ['Cesium'], function(Cesium) {
    "use strict";
    //A real application should require only the subset of modules that
    //are actually used, instead of requiring the Cesium module, which
    //includes everything.

    var canvas = document.getElementById('glCanvas');
    var ellipsoid = Cesium.Ellipsoid.WGS84; // Used in many Sandbox examples
    var scene = new Cesium.Scene(canvas);
    var primitives = scene.getPrimitives();

    // Bing Maps
    var bing = new Cesium.BingMapsTileProvider({
        server : 'dev.virtualearth.net',
        mapStyle : Cesium.BingMapsStyle.AERIAL,
        // Some versions of Safari support WebGL, but don't correctly implement
        // cross-origin image loading, so we need to load Bing imagery using a proxy.
        proxy : Cesium.FeatureDetection.supportsCrossOriginImagery() ? undefined : new Cesium.DefaultProxy('/proxy/')
    });

    var cb = new Cesium.CentralBody(ellipsoid);
    cb.dayTileProvider = bing;
    cb.nightImageSource = '../../Images/land_ocean_ice_lights_2048.jpg';
    cb.specularMapSource = '../../Images/earthspec1k.jpg';
    if (scene.getContext().getMaximumTextureSize() > 2048) {
        cb.cloudsMapSource = '../../Images/earthcloudmaptrans.jpg';
        cb.bumpMapSource = '../../Images/earthbump1k.jpg';
    }
    cb.showSkyAtmosphere = true;
    cb.showGroundAtmosphere = true;
    primitives.setCentralBody(cb);

    //scene.getCamera().frustum.near = 1.0;
    scene.getCamera().frustum.near = 100.0;
    scene.getCamera().getControllers().addCentralBody();

    var transitioner = new Cesium.SceneTransitioner(scene, ellipsoid);

    ///////////////////////////////////////////////////////////////////////////
    // Add examples from the Sandbox here:

    var Sphere = function(center, radius) {
        this._ellipsoid = new Cesium.Ellipsoid(new Cesium.Cartesian3(radius, radius, radius));
        this._va = undefined;
        this._sp = undefined;
        this._rs = undefined;

        this.modelMatrix = Cesium.Matrix4.fromRotationTranslation(Cesium.Matrix3.IDENTITY, center);
        this.color = { red : 0.0, green : 1.0, blue : 0.0, alpha : 1.0 };

        var that = this;
        this._drawUniforms = {
            u_model : function() { return that.modelMatrix; },
            u_color : function() { return that.color; }
        };
    };

    Sphere.prototype.update = function(context, sceneState) {
        var vs = '';
        vs += 'attribute vec4 position;';
        vs += 'void main()';
        vs += '{';
        vs += '    gl_Position = agi_modelViewProjection * position;';
        vs += '}';
        var fs = '';
        fs += 'uniform vec4 u_color;';
        fs += 'void main()';
        fs += '{';
        fs += '    gl_FragColor = u_color;';
        fs += '}';

        var mesh = Cesium.MeshFilters.toWireframeInPlace(
                Cesium.CubeMapEllipsoidTessellator.compute(
                    this._ellipsoid,
                    5,
                    "position"
                ));
        var attributeIndices = Cesium.MeshFilters.createAttributeIndices(mesh);

        this._va = context.createVertexArrayFromMesh({
            mesh             : mesh,
            attributeIndices : attributeIndices,
            bufferUsage      : Cesium.BufferUsage.STATIC_DRAW
        });

        this._sp = context.getShaderCache().getShaderProgram(vs, fs, attributeIndices);

        this._rs = context.createRenderState({
            depthTest : {
                enabled : true
            }
        });

        this.update = function() {};
    };

    Sphere.prototype.render = function(context) {
        context.draw({
            primitiveType : Cesium.PrimitiveType.LINES,
            shaderProgram : this._sp,
            uniformMap    : this._drawUniforms,
            vertexArray   : this._va,
            renderState   : this._rs
        });
    };

    Sphere.prototype.isDestroyed = function() {
        return false;
    };

    Sphere.prototype.destroy = function () {
        this._va = this._va && this._va.destroy();
        this._sp = this._sp && this._sp.release();
        return Cesium.destroyObject(this);
    };


    /*
    // polygon from positions
    var polygon = new Cesium.Polygon();
    polygon.setPositions(ellipsoid.cartographicArrayToCartesianArray([
        Cesium.Cartographic.fromDegrees(-72.0, 40.0),
        Cesium.Cartographic.fromDegrees(-70.0, 35.0),
        Cesium.Cartographic.fromDegrees(-75.0, 30.0),
        Cesium.Cartographic.fromDegrees(-70.0, 30.0),
        Cesium.Cartographic.fromDegrees(-68.0, 40.0)]));

    primitives.add(polygon);
    */

    /*
    // polygon from extent
    var polygon = new Cesium.Polygon();
    polygon.configureExtent(new Cesium.Extent(
        Cesium.Math.toRadians(-110.0),
        Cesium.Math.toRadians(20.0),
        Cesium.Math.toRadians(-90.0),
        Cesium.Math.toRadians(30.0)));
    primitives.add(polygon);
    */


    /*
    // Add sensors
    var modelMatrix = Cesium.Transforms.northEastDownToFixedFrame(ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-90.0, 0.0)));
    modelMatrix = modelMatrix.multiply(Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(3000000.0, 0.0, -3000000.0)));

    var directions = [];
    for (var i = 0; i < 20; ++i) {
        directions.push({
            clock: Cesium.Math.toRadians(18.0 * i),
            cone: Cesium.Math.toRadians(25.0)
        });
    }

    var sensors = new Cesium.SensorVolumeCollection();
    //sensors.addRectangularPyramid({
    //    modelMatrix: modelMatrix,
    //    radius: 2000000.0,
    //    xHalfAngle: Cesium.Math.toRadians(40.0),
    //    yHalfAngle: Cesium.Math.toRadians(20.0)
    //});
    //sensors.addCustom({
    //    modelMatrix: modelMatrix,
    //    radius: 2000000.0,
    //    directions: directions
    //});
    //sensors.addComplexConic({
    //    modelMatrix: modelMatrix,
    //    outerHalfAngle: Cesium.Math.toRadians(30.0),
    //    innerHalfAngle: Cesium.Math.toRadians(20.0),
    //    radius: 2000000.0
    //});
    primitives.add(sensors);
    */

    // billboards
    /*var primitive;
    var image = new Image();
    image.onload = function() {

        primitive = new Cesium.BillboardCollection(undefined);
        var textureAtlas = scene.getContext().createTextureAtlas({image : image});
        primitive.setTextureAtlas(textureAtlas);

        var center = ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-75.59777, 40.03883));
        //primitive.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(center);
        var transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);
        primitive.add({ position : Cesium.Cartesian3.fromCartesian4(transform.multiplyByVector(new Cesium.Cartesian4(0.0, 0.0, 0.0, 1.0))) }); // center
        primitive.add({ position : Cesium.Cartesian3.fromCartesian4(transform.multiplyByVector(new Cesium.Cartesian4(1000000.0, 0.0, 0.0, 1.0))) }); // east
        primitive.add({ position : Cesium.Cartesian3.fromCartesian4(transform.multiplyByVector(new Cesium.Cartesian4(0.0, 1000000.0, 0.0, 1.0))) }); // north
        primitive.add({ position : Cesium.Cartesian3.fromCartesian4(transform.multiplyByVector(new Cesium.Cartesian4(0.0, 0.0, 1000000.0, 1.0))) }); // up
        primitives.add(primitive);
    };
    image.src = '../../Images/facility.gif';*/

    // labels
    var labels = new Cesium.LabelCollection(undefined);
    labels.add({
        position : ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-75.10, 39.57)),
        text     : 'Philadelphia',
        horizontalOrigin : Cesium.HorizontalOrigin.RIGHT
    });
    labels.add({
        position : ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-80.50, 35.14)),
        text     : 'Charlotte'
    });
    labels.add({
        position : ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-80.12, 25.46)),
        text     : 'Miami'
    });
    primitives.add(labels);

    /*var polylines = new Cesium.PolylineCollection();
    polylines.add({positions:ellipsoid.cartographicArrayToCartesianArray([
        new Cesium.Cartographic.fromDegrees(-75.0, 40.0),
        new Cesium.Cartographic.fromDegrees(-75.0, 40.0),
        new Cesium.Cartographic.fromDegrees(-80.0, 35.0),
        new Cesium.Cartographic.fromDegrees(-80.0, 25.0)
    ]),
    width:2});
    polylines.add({positions:ellipsoid.cartographicArrayToCartesianArray([
        new Cesium.Cartographic.fromDegrees(-70.0, 35.0),
        new Cesium.Cartographic.fromDegrees(-65.0, 35.0),
        new Cesium.Cartographic.fromDegrees(-75.0, 30.0),
        new Cesium.Cartographic.fromDegrees(-75.0, 20.0)
    ]),
    width : 2
    //width:4,
    //color:{
    //    red:1.0,
    //    green:0.0,
    //    blue:0.0,
    //   alpha:1.0
    //}
    });
    primitives.add(polylines);*/

    ///////////////////////////////////////////////////////////////////////////

    scene.setAnimation(function() {
        //scene.setSunPosition(scene.getCamera().position);
        scene.setSunPosition(Cesium.SunPosition.compute().position);

        // Add code here to update primitives based on changes to animation time, camera parameters, etc.
    });

    var spheres = [];
    var lines = [];
    var primitive = labels;
    (function tick() {
        for (var i = 0; i < spheres.length; ++i) {
            scene.getPrimitives().remove(spheres[i]);
        }
        spheres.length = 0;
        for (var i = 0; i < lines.length; ++i) {
            scene.getPrimitives().remove(lines[i]);
        }
        lines.length = 0;

        if (scene.mode === Cesium.SceneMode.SCENE3D && typeof primitive !== 'undefined') {
            if (typeof primitive.getLength !== 'undefined') {
                for (var j = 0; j < primitive.getLength(); ++j) {
                    var p = primitive.get(j);
                    if (typeof p.boundingVolume !== 'undefined') {
                        spheres.push(new Sphere(p.boundingVolume.center, p.boundingVolume.radius));
                        scene.getPrimitives().add(spheres[spheres.length - 1]);
                    }
                }
            }

            if (typeof primitive.boundingVolume !== 'undefined'){
                var sphere = new Sphere(primitive.boundingVolume.center, primitive.boundingVolume.radius);
                sphere.color = { red : 1.0, green : 1.0, blue : 0.0, alpha : 1.0 };
                spheres.push(sphere);
                scene.getPrimitives().add(sphere);
            }
        } else if (scene.mode === Cesium.SceneMode.SCENE2D && typeof primitive !== 'undefined') {
            if (typeof primitive.getLength !== 'undefined') {
                var projection = scene.scene2D.projection;
                for (var j = 0; j < primitive.getLength(); ++j) {
                    var p = primitive.get(j);
                    if (typeof p.boundingRectangle !== 'undefined') {
                        var rect = p.boundingRectangle;
                        var polylines = new Cesium.PolylineCollection();
                        polylines.add({
                            positions : ellipsoid.cartographicArrayToCartesianArray([
                                projection.unproject(new Cesium.Cartesian3(rect.x, rect.y, 0.0)),
                                projection.unproject(new Cesium.Cartesian3(rect.x + rect.width, rect.y, 0.0)),
                                projection.unproject(new Cesium.Cartesian3(rect.x + rect.width, rect.y + rect.height, 0.0)),
                                projection.unproject(new Cesium.Cartesian3(rect.x, rect.y + rect.height, 0.0)),
                                projection.unproject(new Cesium.Cartesian3(rect.x, rect.y, 0.0))
                            ])
                        });
                        lines.push(polylines);
                        scene.getPrimitives().add(polylines);
                    }
                }
            }

            if (typeof primitive.boundingRectangle !== 'undefined'){
                var projection = scene.scene2D.projection;
                var rect = primitive.boundingRectangle;
                var polylines = new Cesium.PolylineCollection();
                polylines.add({
                    positions : ellipsoid.cartographicArrayToCartesianArray([
                        projection.unproject(new Cesium.Cartesian3(rect.x, rect.y, 0.0)),
                        projection.unproject(new Cesium.Cartesian3(rect.x + rect.width, rect.y, 0.0)),
                        projection.unproject(new Cesium.Cartesian3(rect.x + rect.width, rect.y + rect.height, 0.0)),
                        projection.unproject(new Cesium.Cartesian3(rect.x, rect.y + rect.height, 0.0)),
                        projection.unproject(new Cesium.Cartesian3(rect.x, rect.y, 0.0))
                    ])
                });
                lines.push(polylines);
                scene.getPrimitives().add(polylines);
            }
        }

        /*if (typeof primitive !== 'undefined') {
            for (var i = 0; i < primitive.getLength(); ++i) {
                var direction = new Cesium.Cartesian3(Math.random(), Math.random(), Math.random()).normalize().multiplyByScalar(1000.0);
                var p = primitive.get(i);
                p.setPosition(p.getPosition().add(direction));
            }
        }*/

        scene.render();
        Cesium.requestAnimationFrame(tick);
    }());

    ///////////////////////////////////////////////////////////////////////////
    // Example mouse & keyboard handlers

    var handler = new Cesium.EventHandler(canvas);

    handler.setMouseAction(function(movement) {
        /* ... */
        // Use movement.startPosition, movement.endPosition
    }, Cesium.MouseEventType.MOVE);

    var label;
    function keydownHandler(e) {
        switch (e.keyCode) {
        case "6".charCodeAt(0):
            label.setPosition(label.getPosition().add(scene.getCamera().up.multiplyByScalar(-100000.0)));
            break;
        case "5".charCodeAt(0):
            label.setPosition(label.getPosition().add(scene.getCamera().up.multiplyByScalar(100000.0)));
            break;
        case "4".charCodeAt(0):
            label = labels.add({
                position : ellipsoid.cartographicToCartesian(Cesium.Cartographic.fromDegrees(-118.24, 34.05)),
                text     : 'Los Angeles',
                horizontalOrigin : Cesium.HorizontalOrigin.LEFT
            });
            break;
        case "3".charCodeAt(0): // "3" -> 3D globe
            cb.showSkyAtmosphere = true;
            cb.showGroundAtmosphere = true;
            transitioner.morphTo3D();
            break;
        case "2".charCodeAt(0): // "2" -> Columbus View
            cb.showSkyAtmosphere = false;
            cb.showGroundAtmosphere = false;
            transitioner.morphToColumbusView();
            break;
        case "1".charCodeAt(0): // "1" -> 2D map
            cb.showSkyAtmosphere = false;
            cb.showGroundAtmosphere = false;
            transitioner.morphTo2D();
            break;
        default:
            break;
        }
    }
    document.addEventListener('keydown', keydownHandler, false);

    canvas.oncontextmenu = function() {
        return false;
    };

    ///////////////////////////////////////////////////////////////////////////
    // Example resize handler

    var onResize = function() {
        var width = canvas.clientWidth;
        var height = canvas.clientHeight;

        if (canvas.width === width && canvas.height === height) {
            return;
        }

        canvas.width = width;
        canvas.height = height;

        scene.getContext().setViewport({
            x : 0,
            y : 0,
            width : width,
            height : height
        });

        scene.getCamera().frustum.aspectRatio = width / height;
    };
    window.addEventListener('resize', onResize, false);
    onResize();
});