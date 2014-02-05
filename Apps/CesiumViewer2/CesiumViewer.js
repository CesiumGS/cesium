/*global define*/
define([
        'Core/defaultValue',
        'Core/Event',
        'Core/Math',
        'Core/Cartesian3',
        'Core/Matrix3',
        'Core/Matrix4',
        'Core/Quaternion',
        'Core/Cartographic',
        'Core/Transforms',
        'Core/Ellipsoid',
        'Scene/Model',
        'Scene/ModelAnimationWrap',
        'Core/ScreenSpaceEventHandler',
        'Core/ScreenSpaceEventType',
        'Scene/DebugModelMatrixPrimitive',
        'Core/JulianDate',
        'Scene/gltfStatistics',
        ///////////////////////////////////////////////////////////////////////
        'Core/defined',
        'DynamicScene/CzmlDataSource',
        'DynamicScene/GeoJsonDataSource',
        'Scene/PerformanceDisplay',
        'Widgets/checkForChromeFrame',
        'Widgets/Viewer/Viewer',
        'Widgets/Viewer/viewerDragDropMixin',
        'Widgets/Viewer/viewerDynamicObjectMixin',
        'domReady!'
    ], function(
        defaultValue,
        Event,
        CesiumMath,
        Cartesian3,
        Matrix3,
        Matrix4,
        Quaternion,
        Cartographic,
        Transforms,
        Ellipsoid,
        Model,
        ModelAnimationWrap,
        ScreenSpaceEventHandler,
        ScreenSpaceEventType,
        DebugModelMatrixPrimitive,
        JulianDate,
        gltfStatistics,
        ///////////////////////////////////////////////////////////////////////
        defined,
        CzmlDataSource,
        GeoJsonDataSource,
        PerformanceDisplay,
        checkForChromeFrame,
        Viewer,
        viewerDragDropMixin,
        viewerDynamicObjectMixin) {
    "use strict";
    /*global console*/

    /*
     * 'debug'  : true/false,   // Full WebGL error reporting at substantial performance cost.
     * 'lookAt' : CZML id,      // The CZML ID of the object to track at startup.
     * 'source' : 'file.czml',  // The relative URL of the CZML file to load at startup.
     * 'stats'  : true,         // Enable the FPS performance display.
     * 'theme'  : 'lighter',    // Use the dark-text-on-light-background theme.
     */
    var endUserOptions = {};
    var queryString = window.location.search.substring(1);
    if (queryString !== '') {
        var params = queryString.split('&');
        for ( var i = 0, len = params.length; i < len; ++i) {
            var param = params[i];
            var keyValuePair = param.split('=');
            if (keyValuePair.length > 1) {
                endUserOptions[keyValuePair[0]] = decodeURIComponent(keyValuePair[1].replace(/\+/g, ' '));
            }
        }
    }

    var loadingIndicator = document.getElementById('loadingIndicator');

    checkForChromeFrame('cesiumContainer').then(function(prompting) {
        if (!prompting) {
            startup();
        } else {
            loadingIndicator.style.display = 'none';
        }
    }).otherwise(function(e) {
        loadingIndicator.style.display = 'none';
        console.error(e);
        if (document.getElementsByClassName('cesium-widget-errorPanel').length < 1) {
            window.alert(e);
        }
    });

    function endsWith(str, suffix) {
        var strLength = str.length;
        var suffixLength = suffix.length;
        return (suffixLength < strLength) && (str.indexOf(suffix, strLength - suffixLength) !== -1);
    }

    function startup() {
        var viewer = new Viewer('cesiumContainer', {
            showRenderLoopErrors : false
        });
        viewer.extend(viewerDragDropMixin);
        viewer.extend(viewerDynamicObjectMixin);

        var showLoadError = function(name, error) {
            var title = 'An error occurred while loading the file: ' + name;
            viewer.cesiumWidget.showErrorPanel(title, error);
            console.error(error);
        };

        viewer.dropError.addEventListener(function(viewerArg, name, error) {
            showLoadError(name, error);
        });

        var scene = viewer.scene;
        var context = scene.getContext();
        if (endUserOptions.debug) {
            context.setValidateShaderProgram(true);
            context.setValidateFramebuffer(true);
            context.setLogShaderCompilation(true);
            context.setThrowOnWebGLError(true);
        }

        if (defined(endUserOptions.source)) {
            var source;
            var sourceUrl = endUserOptions.source.toUpperCase();
            if (endsWith(sourceUrl, '.GEOJSON') || //
                endsWith(sourceUrl, '.JSON') || //
                endsWith(sourceUrl, '.TOPOJSON')) {
                source = new GeoJsonDataSource();
            } else if (endsWith(sourceUrl, '.CZML')) {
                source = new CzmlDataSource();
            } else {
                loadingIndicator.style.display = 'none';

                showLoadError(endUserOptions.source, 'Unknown format.');
            }

            if (defined(source)) {
                source.loadUrl(endUserOptions.source).then(function() {
                    viewer.dataSources.add(source);

                    if (defined(endUserOptions.lookAt)) {
                        var dynamicObject = source.getDynamicObjectCollection().getById(endUserOptions.lookAt);
                        if (defined(dynamicObject)) {
                            viewer.trackedObject = dynamicObject;
                        } else {
                            var error = 'No object with id "' + endUserOptions.lookAt + '" exists in the provided source.';
                            showLoadError(endUserOptions.source, error);
                        }
                    }
                }, function(error) {
                    showLoadError(endUserOptions.source, error);
                }).always(function() {
                    loadingIndicator.style.display = 'none';
                });
            }
        } else {
            loadingIndicator.style.display = 'none';
        }

        if (endUserOptions.stats) {
            scene.getPrimitives().add(new PerformanceDisplay());
        }

        var theme = endUserOptions.theme;
        if (defined(theme)) {
            if (endUserOptions.theme === 'lighter') {
                document.body.classList.add('cesium-lighter');
                viewer.animation.applyThemeChanges();
            } else {
                var error = 'Unknown theme: ' + theme;
                viewer.cesiumWidget.showErrorPanel(error);
                console.error(error);
            }
        }

        ///////////////////////////////////////////////////////////////////////

        // Query parameters
        //  model={string}
        //  animate={true|false}
        //
        // Examples
        //  http://localhost:8080/Apps/CesiumViewer2/index.html?model=Gallery/model/SuperMurdoch/SuperMurdoch.json
        //  http://localhost:8080/Apps/CesiumViewer2/index.html?model=Gallery/model/rambler/Rambler.json
        //  http://localhost:8080/Apps/CesiumViewer2/index.html?model=Gallery/model/wine/wine.json
        //  http://localhost:8080/Apps/CesiumViewer2/index.html?model=Gallery/model/duck/duck.json

        scene.getScreenSpaceCameraController().minimumZoomDistance = 1.0;
        var ellipsoid = viewer.centralBody.getEllipsoid();

        //scene.getPrimitives().setCentralBody(undefined);
        scene.debugShowCommands = endUserOptions.showCommands;
        scene.skyBox = undefined;
        scene.skyAtmosphere = undefined;
        viewer.timeline.zoomTo(new JulianDate(), (new JulianDate()).addSeconds(30.0));

        var rotateX = Matrix4.fromRotationTranslation(Matrix3.fromRotationX(CesiumMath.toRadians(90.0)), Cartesian3.ZERO);
        var modelMatrix = Matrix4.multiply(Transforms.eastNorthUpToFixedFrame(ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-123.0744619, 44.0503706, 100.0))), rotateX);

        var model = scene.getPrimitives().add(Model.fromGltf({
            url : defaultValue(endUserOptions.model, './Gallery/model/duck/duck.json'),
            modelMatrix : modelMatrix,
            scale : 1.0,
            debugWireframe : endUserOptions.wireframe,
            allowPicking : endUserOptions.allowPicking,
            debugShowBoundingVolume : endUserOptions.showBoundingVolume
        }));

        var animationStart = new Event();
        animationStart.addEventListener(function(model, animation) {
            console.log('start animation ' + animation.name);
        });

        var animationStop = new Event();
        animationStop.addEventListener(function(model, animation) {
            console.log('stop animation ' + animation.name);
        });

        var animationUpdate = new Event();
        animationUpdate.addEventListener(function(model, animation, time) {
            console.log('update animation ' + animation.name + ' at time ' + time);
        });

        model.activeAnimations.animationAdded.addEventListener(function(model, animation) {
            console.log('Added ' + animation.name);
        });
        model.activeAnimations.animationRemoved.addEventListener(function(model, animation) {
            console.log('Removed ' + animation.name);
        });

        var statistics;

        model.readyToRender.addEventListener(function(model) {
            statistics = gltfStatistics(model.gltf);
            console.log(statistics);

            if (endUserOptions.animate) {
                model.activeAnimations.addAll({
                    // startTime : (new JulianDate()).addSeconds(3),
                    // startOffset : 3.0,
                    // stopTime : (new JulianDate()).addSeconds(4),
                    // removeOnStop : true,
                    speedup : 0.5, //1.0,
                    wrap : ModelAnimationWrap.REPEAT, // ModelAnimationWrap.MIRRORED_REPEAT,
                    // reverse : true,
                    start : animationStart,
                    stop : animationStop
                    // , update : animationUpdate
                });
            }

            var worldBoundingSphere = model.computeWorldBoundingSphere();
            var center = worldBoundingSphere.center;
            var transform = Transforms.eastNorthUpToFixedFrame(center);

            // View in east-north-up frame
            var camera = scene.getCamera();
            camera.transform = transform;
            camera.controller.constrainedAxis = Cartesian3.UNIT_Z;

            var controller = scene.getScreenSpaceCameraController();
            controller.setEllipsoid(Ellipsoid.UNIT_SPHERE);
            controller.enableTilt = false;

            // Zoom in
            var r = Math.max(worldBoundingSphere.radius, camera.frustum.near);
            camera.controller.lookAt(
                new Cartesian3(0.0, -r * 0.25, r * 2.0),
                Cartesian3.ZERO,
                Cartesian3.UNIT_Z);
        });

        var prevPickedNode;
        var prevPickedMesh;
        var prevPickedPrimitiveIndex;
        var handler = new ScreenSpaceEventHandler(scene.getCanvas());
        handler.setInputAction(
            function (movement) {
                var pick = scene.pick(movement.endPosition);
                if (defined(pick) && (pick.primitive === model)) {
                    var gltf = pick.gltf;
                    if ((prevPickedNode !== gltf.node) || (prevPickedMesh !== gltf.mesh) || (prevPickedPrimitiveIndex !== gltf.primitiveIndex)) {

                        prevPickedNode = gltf.node;
                        prevPickedMesh = gltf.mesh;
                        prevPickedPrimitiveIndex = gltf.primitiveIndex;

                        var stats = statistics.meshStatistics[gltf.mesh.name];
                        console.log('node: ' + gltf.node.name + '. mesh: ' + gltf.mesh.name + '. primitiveIndex: ' + prevPickedPrimitiveIndex);
                        console.log('   mesh triangles: ' + stats.numberOfTriangles.toLocaleString());
                        if (gltf.mesh.primitives.length > 1) {
                            console.log('   primitive triangles: ' + stats.primitives[gltf.primitiveIndex].numberOfTriangles.toLocaleString());
                        }
                    }
                }
            },
            ScreenSpaceEventType.MOUSE_MOVE
        );

        handler.setInputAction(
            function () {
                var n = prevPickedNode;
                n.matrix = Matrix4.multiplyByUniformScale(defaultValue(n.matrix, Matrix4.IDENTITY.clone()), 2.0, n.matrix);
            },
            ScreenSpaceEventType.LEFT_CLICK
        );

//      scene.debugCommandFilter = function(command) { return command.owner.instance === model; };

// /*
        scene.getPrimitives().add(new DebugModelMatrixPrimitive({
            modelMatrix : modelMatrix,
            scale : 100000.0,
            width : 10.0
        }));
// */
    }
});
