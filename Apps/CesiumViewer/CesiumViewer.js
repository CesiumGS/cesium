/*global define*/
define([
        'Core/defined',
        'Core/formatError',
        'DynamicScene/CzmlDataSource',
        'DynamicScene/GeoJsonDataSource',
        'Scene/PerformanceDisplay',
        'Scene/TileMapServiceImageryProvider',
        'Widgets/Viewer/Viewer',
        'Widgets/Viewer/viewerDragDropMixin',
        'Widgets/Viewer/viewerDynamicObjectMixin',
        'Widgets/Viewer/viewerCesiumInspectorMixin',
        'domReady!'
    ], function(
        defined,
        formatError,
        CzmlDataSource,
        GeoJsonDataSource,
        PerformanceDisplay,
        TileMapServiceImageryProvider,
        Viewer,
        viewerDragDropMixin,
        viewerDynamicObjectMixin,
        viewerCesiumInspectorMixin) {
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
        for (var i = 0, len = params.length; i < len; ++i) {
            var param = params[i];
            var keyValuePair = param.split('=');
            if (keyValuePair.length > 1) {
                endUserOptions[keyValuePair[0]] = decodeURIComponent(keyValuePair[1].replace(/\+/g, ' '));
            }
        }
    }

    var loadingIndicator = document.getElementById('loadingIndicator');

    function endsWith(str, suffix) {
        var strLength = str.length;
        var suffixLength = suffix.length;
        return (suffixLength < strLength) && (str.indexOf(suffix, strLength - suffixLength) !== -1);
    }

    var imageryProvider;

    if (endUserOptions.tmsImageryUrl) {
        imageryProvider = new TileMapServiceImageryProvider({
            url : endUserOptions.tmsImageryUrl
        });
    }

    var viewer;
    try {
        viewer = new Viewer('cesiumContainer', {
            imageryProvider : imageryProvider,
            baseLayerPicker : !defined(imageryProvider)
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
    viewer.extend(viewerDynamicObjectMixin);
    if (endUserOptions.inspector) {
        viewer.extend(viewerCesiumInspectorMixin);
    }

    var showLoadError = function(name, error) {
        var title = 'An error occurred while loading the file: ' + name;
        error = formatError(error);
        viewer.cesiumWidget.showErrorPanel(title, error);
        console.error(title + ': ' + error);
    };

    viewer.dropError.addEventListener(function(viewerArg, name, error) {
        showLoadError(name, error);
    });

    var scene = viewer.scene;
    var context = scene._context;
    if (endUserOptions.debug) {
        context.validateShaderProgram = true;
        context.validateFramebuffer = true;
        context.logShaderCompilation = true;
        context.throwOnWebGLError = true;
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
        scene.debugShowFramesPerSecond = true;
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
});