/*global define*/
define(['dojo/_base/window',
        'dojo/dom-class',
        'dojo/io-query',
        'dojo/parser',
        'dojo/ready',
        'Core/ScreenSpaceEventType',
        'DynamicScene/CzmlDataSource',
        'DynamicScene/DynamicObjectView',
        'Scene/PerformanceDisplay',
        'Widgets/Dojo/checkForChromeFrame',
        'Widgets/Viewer/Viewer'
        ], function(
                win,
                domClass,
                ioQuery,
                parser,
                ready,
                ScreenSpaceEventType,
                CzmlDataSource,
                DynamicObjectView,
                PerformanceDisplay,
                checkForChromeFrame,
                Viewer) {
    "use strict";
    /*global console*/

    var viewer;
    var scene;
    var viewFromTo;

    function onError(viewer, name, error) {
        console.log(error);
        window.alert(error);
    }

    function onTick(clock) {
        if (typeof viewFromTo !== 'undefined') {
            viewFromTo.update(clock.currentTime);
        }
    }

    function onLeftClick(e) {
        var pickedPrimitive = scene.pick(e.position);
        if (typeof pickedPrimitive !== 'undefined' && typeof pickedPrimitive.dynamicObject !== 'undefined') {
            initViewFromTo(pickedPrimitive.dynamicObject);
        }
    }

    function initViewFromTo(dynamicObject) {
        viewFromTo = new DynamicObjectView(dynamicObject, scene, viewer.cesiumWidget.ellipsoid);
    }

    function cancelViewFromTo() {
        viewFromTo = undefined;
    }

    ready(function() {
        parser.parse();

        checkForChromeFrame();

        var container = document.getElementById('cesiumContainer');
        viewer = new Viewer(container);
        scene = viewer.cesiumWidget.scene;
        viewer.enableDragAndDrop(document.body, onError);
        viewer.cesiumWidget.clock.onTick.addEventListener(onTick);
        viewer.homeButton.viewModel.command.beforeExecute.addEventListener(cancelViewFromTo);
        viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(onLeftClick, ScreenSpaceEventType.LEFT_CLICK);

        /*
         * 'debug'  : true/false,   // Full WebGL error reporting at substantial performance cost.
         * 'lookAt' : CZML id,      // The CZML ID of the object to track at startup.
         * 'source' : 'file.czml',  // The relative URL of the CZML file to load at startup.
         * 'stats'  : true,         // Enable the FPS performance display.
         * 'theme'  : 'lighter',    // Use the dark-text-on-light-background theme.
         */
        var endUserOptions = {};
        if (typeof window.location.search !== 'undefined') {
            endUserOptions = ioQuery.queryToObject(window.location.search.substring(1));
        }

        var context = scene.getContext();
        if (endUserOptions.debug) {
            context.setValidateShaderProgram(true);
            context.setValidateFramebuffer(true);
            context.setLogShaderCompilation(true);
            context.setThrowOnWebGLError(true);
        }

        if (typeof endUserOptions.source !== 'undefined') {
            var source = new CzmlDataSource();
            source.loadUrl(endUserOptions.source).then(function() {
                viewer.dataSources.add(source);

                var dataClock = source.getClock();
                if (typeof dataClock !== 'undefined') {
                    dataClock.clone(viewer.cesiumWidget.clock);
                    viewer.timeline.zoomTo(dataClock.startTime, dataClock.stopTime);
                }

                if (typeof endUserOptions.lookAt !== 'undefined') {
                    var dynamicObject = source.getDynamicObjectCollection().getObject(endUserOptions.lookAt);
                    if (typeof dynamicObject !== 'undefined') {
                        initViewFromTo(dynamicObject);
                    } else {
                        window.alert('No object with id ' + endUserOptions.lookAt + ' exists in the provided source.');
                    }
                }
            });
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

        domClass.remove(win.body(), 'loading');
    });
});