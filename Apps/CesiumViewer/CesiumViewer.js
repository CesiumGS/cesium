/*global define*/
define([
        'Core/defined',
        'DynamicScene/CzmlDataSource',
        'DynamicScene/GeoJsonDataSource',
        'Scene/PerformanceDisplay',
        'Scene/CustomPostProcess',
        'Shaders/PostProcessFilters/BlackAndWhite',
        'Shaders/PostProcessFilters/NightVision',
        'Shaders/PostProcessFilters/Toon',
        'Shaders/PostProcessFilters/Lomo',
        'Shaders/PostProcessFilters/Retro',
        'Widgets/checkForChromeFrame',
        'Widgets/Viewer/Viewer',
        'Widgets/Viewer/viewerDragDropMixin',
        'Widgets/Viewer/viewerDynamicObjectMixin',
        'domReady!'
    ], function(
        defined,
        CzmlDataSource,
        GeoJsonDataSource,
        PerformanceDisplay,
        CustomPostProcess,
        BlackAndWhite,
        NightVision,
        Toon,
        Lomo,
        Retro,
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

        // 4 Example post process filters with custom uniforms. Use one at a time.
        scene.customPostProcess = new CustomPostProcess(Lomo, { temperatureGamma : function() { return 0.6; },
                                                                colorTemperatureBottom : function() { return 3000.0; },
                                                                colorTemperatureTop : function() { return 15000.0; },
                                                                vignetteAmount : function() { return 1.0; },
                                                                vignetteGamma : function() { return 4.0; },
                                                                saturation : function() { return 0.7; },
                                                                finalMultiplier : function() { return 1.2; } });

//        scene.customPostProcess = new CustomPostProcess(Retro, {vignetteAmount : function() { return 0.65; },
//                                                                vignetteGamma : function() { return 4.0; },
//                                                                colorTemperatureInner : function() { return 3500.0; },
//                                                                colorTemperatureOuter : function() { return 12000.0; },
//                                                                saturation : function() { return 0.5; },
//                                                                postSaturation : function() { return 0.5; },
//                                                                finalMultiplier : function() { return 1.2; },
//                                                                tintColorBottom : function() { return { x : 1.1, y : 0.85, z : 0.95 }; },
//                                                                tintColorTop : function() { return { x : 1.1, y : 0.77, z : 0.55 }; } });

//      scene.customPostProcess = new CustomPostProcess(NightVision, { frequency : function() { return 0.001; } });

//      scene.customPostProcess = new CustomPostProcess(BlackAndWhite);


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
    }
});