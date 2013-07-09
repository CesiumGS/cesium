/*global define*/
define([
        'DynamicScene/CzmlDataSource',
        'DynamicScene/GeoJsonDataSource',
        'Scene/PerformanceDisplay',
        'Widgets/checkForChromeFrame',
        'Widgets/Viewer/Viewer',
        'Widgets/Viewer/viewerDragDropMixin',
        'Widgets/Viewer/viewerDynamicObjectMixin',
        'domReady!'
    ], function(
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
        console.error(e);
        window.alert(e);
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

        viewer.onRenderLoopError.addEventListener(function(viewerArg, error) {
            console.log(error);
            window.alert(error);
        });

        viewer.onDropError.addEventListener(function(viewerArg, name, error) {
            console.log(error);
            window.alert(error);
        });

        var scene = viewer.scene;
        var context = scene.getContext();
        if (endUserOptions.debug) {
            context.setValidateShaderProgram(true);
            context.setValidateFramebuffer(true);
            context.setLogShaderCompilation(true);
            context.setThrowOnWebGLError(true);
        }

        if (typeof endUserOptions.source !== 'undefined') {
            var source;
            var sourceUrl = endUserOptions.source.toUpperCase();
            if (endsWith(sourceUrl, ".GEOJSON") || //
            endsWith(sourceUrl, ".JSON") || //
            endsWith(sourceUrl, ".TOPOJSON")) {
                source = new GeoJsonDataSource();
            } else if (endsWith(sourceUrl, ".CZML")) {
                source = new CzmlDataSource();
            } else {
                loadingIndicator.style.display = 'none';
                window.alert("Unknown format: " + endUserOptions.source);
            }
            if (typeof source !== 'undefined') {
                source.loadUrl(endUserOptions.source).then(function() {
                    viewer.dataSources.add(source);

                    var dataClock = source.getClock();
                    if (typeof dataClock !== 'undefined') {
                        dataClock.clone(viewer.clock);
                        viewer.timeline.updateFromClock();
                        viewer.timeline.zoomTo(dataClock.startTime, dataClock.stopTime);
                    }

                    if (typeof endUserOptions.lookAt !== 'undefined') {
                        var dynamicObject = source.getDynamicObjectCollection().getObject(endUserOptions.lookAt);
                        if (typeof dynamicObject !== 'undefined') {
                            viewer.trackedObject = dynamicObject;
                        } else {
                            window.alert('No object with id ' + endUserOptions.lookAt + ' exists in the provided source.');
                        }
                    }
                }, function(e) {
                    window.alert(e);
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
        if (typeof theme !== 'undefined') {
            if (endUserOptions.theme === 'lighter') {
                document.body.classList.add('cesium-lighter');
                viewer.animation.applyThemeChanges();
            } else {
                window.alert('Unknown theme: ' + theme);
            }
        }
    }
});