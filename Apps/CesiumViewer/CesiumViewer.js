/*global define*/
define([
        'Cesium/Core/Cartesian3',
        'Cesium/Core/defined',
        'Cesium/Core/formatError',
        'Cesium/Core/getFilenameFromUri',
        'Cesium/Core/Math',
        'Cesium/Core/objectToQuery',
        'Cesium/Core/queryToObject',
        'Cesium/DataSources/CzmlDataSource',
        'Cesium/DataSources/GeoJsonDataSource',
        'Cesium/DataSources/KmlDataSource',
        'Cesium/Scene/TileMapServiceImageryProvider',
        'Cesium/Widgets/Viewer/Viewer',
        'Cesium/Widgets/Viewer/viewerCesiumInspectorMixin',
        'Cesium/Widgets/Viewer/viewerDragDropMixin',
        'domReady!'
    ], function(
        Cartesian3,
        defined,
        formatError,
        getFilenameFromUri,
        CesiumMath,
        objectToQuery,
        queryToObject,
        CzmlDataSource,
        GeoJsonDataSource,
        KmlDataSource,
        TileMapServiceImageryProvider,
        Viewer,
        viewerCesiumInspectorMixin,
        viewerDragDropMixin) {
    "use strict";
    /*global console*/

    /*
     * 'debug'  : true/false,   // Full WebGL error reporting at substantial performance cost.
     * 'lookAt' : CZML id,      // The CZML ID of the object to track at startup.
     * 'source' : 'file.czml',  // The relative URL of the CZML file to load at startup.
     * 'stats'  : true,         // Enable the FPS performance display.
     * 'theme'  : 'lighter',    // Use the dark-text-on-light-background theme.
     * 'scene3DOnly' : false    // Enable 3D only mode
     * 'view' : longitude,latitude,[height,heading,pitch,roll]
     *    // Using degrees and meters
     *    // [height,heading,pitch,roll] default is looking straight down, [300,0,-90,0]
     */
    var endUserOptions = queryToObject(window.location.search.substring(1));

    var imageryProvider;
    if (endUserOptions.tmsImageryUrl) {
        imageryProvider = new TileMapServiceImageryProvider({
            url : endUserOptions.tmsImageryUrl
        });
    }

    var loadingIndicator = document.getElementById('loadingIndicator');
    var viewer;
    try {
        viewer = new Viewer('cesiumContainer', {
            imageryProvider : imageryProvider,
            baseLayerPicker : !defined(imageryProvider),
            scene3DOnly : endUserOptions.scene3DOnly
        });
    } catch (exception) {
        loadingIndicator.style.display = 'none';
        var message = formatError(exception);
        console.error(message);
        if (!document.querySelector('.cesium-widget-errorPanel')) {
            window.alert(message);
        }
        return;
    }

    viewer.extend(viewerDragDropMixin);
    if (endUserOptions.inspector) {
        viewer.extend(viewerCesiumInspectorMixin);
    }

    var showLoadError = function(name, error) {
        var title = 'An error occurred while loading the file: ' + name;
        var message = 'An error occurred while loading the file, which may indicate that it is invalid.  A detailed error report is below:';
        viewer.cesiumWidget.showErrorPanel(title, message, error);
    };

    viewer.dropError.addEventListener(function(viewerArg, name, error) {
        showLoadError(name, error);
    });

    var scene = viewer.scene;
    var context = scene.context;
    if (endUserOptions.debug) {
        context.validateShaderProgram = true;
        context.validateFramebuffer = true;
        context.logShaderCompilation = true;
        context.throwOnWebGLError = true;
    }

    var view = endUserOptions.view;
    var source = endUserOptions.source;
    if (defined(source)) {
        var loadPromise;

        if (/\.czml$/i.test(source)) {
            loadPromise = CzmlDataSource.load(source);
        } else if (/\.geojson$/i.test(source) || /\.json$/i.test(source) || /\.topojson$/i.test(source)) {
            loadPromise = GeoJsonDataSource.load(source);
        } else if (/\.kml$/i.test(source) || /\.kmz$/i.test(source)) {
            loadPromise = KmlDataSource.load(source);
        } else {
            showLoadError(source, 'Unknown format.');
        }

        if (defined(loadPromise)) {
            viewer.dataSources.add(loadPromise).then(function(dataSource) {
                var lookAt = endUserOptions.lookAt;
                if (defined(lookAt)) {
                    var entity = dataSource.entities.getById(lookAt);
                    if (defined(entity)) {
                        viewer.trackedEntity = entity;
                    } else {
                        var error = 'No entity with id "' + lookAt + '" exists in the provided data source.';
                        showLoadError(source, error);
                    }
                } else if (!defined(view)) {
                    viewer.flyTo(dataSource);
                }
            }).otherwise(function(error) {
                showLoadError(source, error);
            });
        }
    }

    if (endUserOptions.stats) {
        scene.debugShowFramesPerSecond = true;
    }

    var theme = endUserOptions.theme;
    if (defined(theme)) {
        if (endUserOptions.theme === 'lighter') {
            document.body.classList.add('cesium-lighter');
            viewer.animation.applyThemeChanges();
        } else {
            var error = 'Unknown theme: ' + theme;
            viewer.cesiumWidget.showErrorPanel(error, '');
        }
    }

    if (defined(view)) {
        var splitQuery = view.split(/[ ,]+/);
        if (splitQuery.length > 1) {
            var longitude = !isNaN(+splitQuery[0]) ? +splitQuery[0] : 0.0;
            var latitude = !isNaN(+splitQuery[1]) ? +splitQuery[1] : 0.0;
            var height = ((splitQuery.length > 2) && (!isNaN(+splitQuery[2]))) ? +splitQuery[2] : 300.0;
            var heading = ((splitQuery.length > 3) && (!isNaN(+splitQuery[3]))) ? CesiumMath.toRadians(+splitQuery[3]) : undefined;
            var pitch = ((splitQuery.length > 4) && (!isNaN(+splitQuery[4]))) ? CesiumMath.toRadians(+splitQuery[4]) : undefined;
            var roll = ((splitQuery.length > 5) && (!isNaN(+splitQuery[5]))) ? CesiumMath.toRadians(+splitQuery[5]) : undefined;

            viewer.camera.setView({
                destination: Cartesian3.fromDegrees(longitude, latitude, height),
                orientation: {
                    heading: heading,
                    pitch: pitch,
                    roll: roll
                }
            });
        }
    }

    function saveCamera() {
        var position = camera.positionCartographic;
        var hpr = '';
        if (defined(camera.heading)) {
            hpr = ',' + CesiumMath.toDegrees(camera.heading) + ',' + CesiumMath.toDegrees(camera.pitch) + ',' + CesiumMath.toDegrees(camera.roll);
        }
        endUserOptions.view = CesiumMath.toDegrees(position.longitude) + ',' + CesiumMath.toDegrees(position.latitude) + ',' + position.height + hpr;
        history.replaceState(undefined, '', '?' + objectToQuery(endUserOptions));
    }

    var updateTimer;
    if (endUserOptions.saveCamera !== 'false') {
        var camera = viewer.camera;
        camera.moveStart.addEventListener(function() {
            if (!defined(updateTimer)) {
                updateTimer = window.setInterval(saveCamera, 1000);
            }
        });
        camera.moveEnd.addEventListener(function() {
            if (defined(updateTimer)) {
                window.clearInterval(updateTimer);
                updateTimer = undefined;
            }
            saveCamera();
        });
    }

    loadingIndicator.style.display = 'none';
});
