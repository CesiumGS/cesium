/*global define*/
define([
        'Core/Cartesian3',
        'Core/Matrix4',
        'Core/Transforms',
        'Core/Ellipsoid',
        'Scene/Model',
        'Core/ScreenSpaceEventHandler',
        'Core/ScreenSpaceEventType',
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
        Cartesian3,
        Matrix4,
        Transforms,
        Ellipsoid,
        Model,
        ScreenSpaceEventHandler,
        ScreenSpaceEventType,
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
        var viewer = new Viewer('cesiumContainer');
        viewer.extend(viewerDragDropMixin);
        viewer.extend(viewerDynamicObjectMixin);

        var showLoadError = function(name, error) {
            var title = 'An error occurred while loading the file: ' + name;
            viewer.cesiumWidget.showErrorPanel(title, error);
            console.error(error);
        };

        viewer.onDropError.addEventListener(function(viewerArg, name, error) {
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
        //scene.getPrimitives().setCentralBody(undefined);
        //scene.skyBox = undefined;
        //scene.skyAtmosphere = undefined;

//      var url = './Gallery/model/SuperMurdoch/SuperMurdoch.json';
//      var url = './Gallery/model/rambler/Rambler.json';
//      var url = './Gallery/model/wine/wine.json';
      var url = './Gallery/model/duck/duck.json';

        var model = scene.getPrimitives().add(Model.fromText({
            url : url,
            modelMatrix : Matrix4.fromTranslation(new Cartesian3(0.0, 0.0, 7000000.0)),
            scale : 100.0
//            debugShowBoundingVolume : true
        }));
        model.onComplete.addEventListener(function() {
            var center = model.worldBoundingSphere.center;
            var transform = Transforms.eastNorthUpToFixedFrame(center);

            // View in east-north-up frame
            var camera = scene.getCamera();
            camera.transform = transform;
            camera.controller.constrainedAxis = Cartesian3.UNIT_Z;

            var controller = scene.getScreenSpaceCameraController();
            controller.setEllipsoid(Ellipsoid.UNIT_SPHERE);
            controller.enableTilt = false;

            // Zoom in
            camera.controller.lookAt(
                    new Cartesian3(model.worldBoundingSphere.radius, 0.0, 0.0),
                    Cartesian3.ZERO,
                    Cartesian3.UNIT_Z);
        });

//        scene.debugCommandFilter = function(command) { return command.owner.instance === model; };

        var handler = new ScreenSpaceEventHandler(scene.getCanvas());
        handler.setInputAction(
            function (movement) {
                var pickedObject = scene.pick(movement.endPosition);
                if (defined(pickedObject)) {
                    console.log("Node " + pickedObject.node.name + ", Mesh " + pickedObject.mesh.name);
                }
            },
            ScreenSpaceEventType.MOUSE_MOVE
        );
    }
});
