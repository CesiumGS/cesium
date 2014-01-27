/*global define*/
define([
        'Core/defined',
        'DynamicScene/CzmlDataSource',
        'DynamicScene/GeoJsonDataSource',
        'Scene/PerformanceDisplay',
        'Widgets/checkForChromeFrame',
        'Widgets/Viewer/Viewer',
        'Widgets/Viewer/viewerDragDropMixin',
        'Widgets/Viewer/viewerDynamicObjectMixin',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/Extent',
        'Core/ExtentGeometry',
        'Core/GeometryInstance',
        'Core/Math',
        'Scene/Material',
        'Scene/PerInstanceColorAppearance',
        'Scene/Primitive',
        'domReady!'
    ], function(
        defined,
        CzmlDataSource,
        GeoJsonDataSource,
        PerformanceDisplay,
        checkForChromeFrame,
        Viewer,
        viewerDragDropMixin,
        viewerDynamicObjectMixin,
        Color,
        ColorGeometryInstanceAttribute,
        Extent,
        ExtentGeometry,
        GeometryInstance,
        CesiumMath,
        Material,
        PerInstanceColorAppearance,
        Primitive) {
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

        var primitives = viewer.scene.getPrimitives();

        var northernmost = CesiumMath.toRadians(50.0);
        var westernmost = CesiumMath.toRadians(-120.0);

        var width = CesiumMath.toRadians(5.0);
        var height = CesiumMath.toRadians(5.0);
        var gap = CesiumMath.toRadians(1.0);

        var numHorizontal = 5;
        var numVertical = 3;

        var alpha = 1.0;

        var minHeight = 1000.0;
        var maxHeight = 1000000.0;

        CesiumMath.setRandomNumberSeed(5);

        for (var i = 0; i < numVertical; ++i) {
            var north = northernmost - i * (height + gap);
            var south = north - height;

            for (var j = 0; j < numHorizontal; ++j) {
                var west = westernmost + j * (width + gap);
                var east = west + width;

                var color = new Color(CesiumMath.nextRandomNumber(), CesiumMath.nextRandomNumber(), CesiumMath.nextRandomNumber(), alpha);

                var primitive = primitives.add(new Primitive({
                    geometryInstances : new GeometryInstance({
                        geometry : new ExtentGeometry({
                            extent : new Extent(west, south, east, north),
                            vertexFormat : PerInstanceColorAppearance.VERTEX_FORMAT,
                            extrudedHeight : CesiumMath.nextRandomNumber() * (maxHeight - minHeight) + minHeight
                        }),
                        attributes: {
                            color: ColorGeometryInstanceAttribute.fromColor(color)
                        }
                    }),
                    appearance : new PerInstanceColorAppearance({
                        closed : true,
                        translucent : alpha < 1.0,
                        faceforward : true
                    })
                }));

                alpha -= 1.0 / (numHorizontal * numVertical);
            }
        }
    }
});