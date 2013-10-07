// require(['Cesium'], function(Cesium) {
    "use strict";


    // FIXME
    /** var animate = function() {
        var camera = scene.getCamera();
        var controller = camera.controller;

        controller.lookUp(Cesium.Math.toRadians(luhead.vangle));
        controller.lookRight(Cesium.Math.toRadians(luhead.hangle));
    };

    function tick() {
        scene.initializeFrame();
        animate();
        scene.render();

        Cesium.requestAnimationFrame(tick);
    }
    tick();
    **/

    /**
     * @param {String} ID of Canvas element
     * @param {Object} TBD {routeURL: {String}, cockpitURL: {String}}
     */
    var AviationWidget = function(canvasId, options) {
        var that = this;

        options = Cesium.defaultValue(options, Cesium.defaultValue.EMPTY_OBJECT);

        var _hasTourModel = false;
        var _hasCockpitModel = false;

        var _viewerOpts = Cesium.defaultValue(options.viewer, Cesium.defaultValue.EMPTY_OBJECT);

        /**
         * Initialize widget
         */
        this.init = function() {
            // that.viewer = new Cesium.CesiumWidget(canvasId);
            that.viewer = new Cesium.Viewer(canvasId, _viewerOpts);
            var scene = that.viewer.scene;

            var centralBody = scene.getPrimitives().getCentralBody();
            centralBody.depthTestAgainstTerrain = true;

            var cesiumTerrainProvider = new Cesium.CesiumTerrainProvider({
                url : 'http://cesium.agi.com/smallterrain',
                credit : 'Terrain data courtesy Analytical Graphics, Inc.'
            });

            centralBody.terrainProvider = cesiumTerrainProvider;

            // -- Load KMLs -- //
            var i;
            /* for (i=0; i<kmlResources.length; i++) {
                ds.loadUrl(kmlResources[i]).then(function() {
                    that.viewer.dataSources.add(ds);
                });
            } */
            // 3D KML
            var tourKml = options.routeURL;

            if (tourKml !== 'undefined') {
                var ds = new Cesium.KmlDataSource();
                ds.loadUrl(tourKml).then(function() {
                    that.viewer.dataSources.add(ds);
                    _hasTourModel = true;
                    console.log('route loaded ...');
                });
            }
            // Cockpit KML
            var cockpitKml = options.cockpitURL;
            if (cockpitKml !== 'undefined') {
                var ds2 = new Cesium.KmlDataSource();
                ds2.loadUrl(cockpitKml).then(function() {
                    that.viewer.dataSources.add(ds2);
                    _hasCockpitModel = true;
                    console.log('cockpit loaded ...');
                });
            }


            // -- Create buttons -- //
            // FIXME
            /**
             * Initialize head controls
             */
            var createButtons = function() {
                var scene = that.viewer.scene;
                var primitives = scene.getPrimitives();
                var toolbar = document.getElementById('toolbar');

                // Left button
                var button = document.createElement('button');
                button.className = 'cesium-button';
                button.onclick = function() {
                    luhead.hangle -= luhead.hstep;
                };
                button.innerHTML = '&larr;';
                toolbar.appendChild(button);

                // Up button
                button = document.createElement('button');
                button.className = 'cesium-button';
                button.onclick = function() {
                    luhead.vangle += luhead.vstep;
                };
                button.innerHTML = '&uarr;';
                toolbar.appendChild(button);

                // Center button
                button = document.createElement('button');
                button.className = 'cesium-button';
                button.onclick = function() {
                    luhead.hangle = 0;
                    luhead.vangle = 0;
                };
                button.innerHTML = '&oplus;';
                toolbar.appendChild(button);

                // Down button
                button = document.createElement('button');
                button.className = 'cesium-button';
                button.onclick = function() {
                    luhead.vangle -= luhead.vstep;
                };
                button.innerHTML = '&darr;';
                toolbar.appendChild(button);

                // Right button
                button = document.createElement('button');
                button.className = 'cesium-button';
                button.onclick = function() {
                    luhead.hangle += luhead.hstep;
                };
                button.innerHTML = '&rarr;';
                toolbar.appendChild(button);
            };
        };

    };


    /** lookout angles **/
    var luhead = {
        /* maxHRange: 90,
        maxVRange: 90, */

        hstep: 5,
        vstep: 5,

		hangle: 0,
		vangle: 0
    };


    // ** init buttons **
    // createButtons(viewer);

    // ** start animation  ** //
    // tick();

    // return AviationWidget;
// });
