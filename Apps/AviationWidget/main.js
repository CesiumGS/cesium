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

    var AlwaysTrue = {
        getValue: function(t) {return true;}
    };
    var AlwaysFalse = {
        getValue: function(t) {return false;}
    };

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

        var _toolbar;

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

            // 3D KML
            var tourKml = options.routeURL;

            if (typeof tourKml !== 'undefined') {
                that._tourDataSource = new Cesium.KmlDataSource();
                that._tourDataSource.loadUrl(tourKml).then(function() {
                    that.viewer.dataSources.add(that._tourDataSource);
                    console.log('route loaded ...');
                });
            }
            // Cockpit KML
            var cockpitKml = options.cockpitURL;
            if (typeof cockpitKml !== 'undefined') {
                that._cockpitDataSource = new Cesium.KmlDataSource();
                that._cockpitDataSource.loadUrl(cockpitKml).then(function() {
                    that.viewer.dataSources.add(that._cockpitDataSource);
                    console.log('cockpit loaded ...');

                    // stretch timeline according to flight data
                    (function(){
                        var dataSourceClock = that._cockpitDataSource.getClock();
                        var timeline = that.viewer.timeline;
                        timeline.zoomTo(dataSourceClock.startTime, dataSourceClock.stopTime);
                    })();
                });
            }


            // -- add toolbar -- //
            _toolbar = document.createElement('div');
            _toolbar.setAttribute('id', 'awToolbar');


            that.viewer._element.parentNode.insertBefore(_toolbar, that.viewer._element.nextSibling);

            /* var _sel = document.createElement('select');
            _toolbar.appendChild(_sel); */

            var _it, _obj;

            // add toggle checkbox for 3D route visualization
            if (that._tourDataSource) {
                _it = document.createElement('input');
                _it.setAttribute('type', 'checkbox');
                _it.setAttribute('name', 'gxaviation');
                _it.checked = true;
                _toolbar.appendChild(_it);

                _it.onchange = function(ev) {
                    var coll = that._tourDataSource.getDynamicObjectCollection().getObjects();
                    var i;
                    var flag = ev.target.checked;
                    for (i=0; i<coll.length; i++) {
                        // the wall
                        if (typeof coll[i].wall !== 'undefined') {
                            coll[i].wall._show = flag ? AlwaysTrue : AlwaysFalse;
                        }
                        // the polyline running on top of the wall
                        if (typeof coll[i]._polyline !== 'undefined') {
                            coll[i]._polyline._show = flag ? AlwaysTrue : AlwaysFalse;
                        }
                    }
                };

                _obj = document.createTextNode('Tour');
                _toolbar.appendChild(_obj);
            }

            // add toggle checkbox for Cockpit animation
            if (that._cockpitDataSource) {
                _it = document.createElement('input');
                _it.setAttribute('type', 'checkbox');
                _it.setAttribute('name', 'gxaviation');
                _it.checked = true;
                _toolbar.appendChild(_it);

                _it.onchange = function(ev) {
                    var coll = that._cockpitDataSource.getDynamicObjectCollection().getObjects();
                    var i;
                    var flag = ev.target.checked;
                    for (i=0; i<coll.length; i++) {
                        if (typeof coll[i].gxTour !== 'undefined') {
                            coll[i].gxTour._show = flag ? AlwaysTrue : AlwaysFalse;
                        }
                    }
                };

                _obj = document.createTextNode('Cockpit');
                _toolbar.appendChild(_obj);

                // ** FREE LOOK SECTION ** //
                var scene = that.viewer.scene;
                var _freeLook =  new Cesium.FreeLook();
                scene.freeLook = _freeLook;

                // Left button
                var button = document.createElement('button');
                button.className = 'cesium-button';
                button.onclick = function() {
                    _freeLook.lookLeft();
                };
                button.innerHTML = '&larr;';
                _toolbar.appendChild(button);

                // Up button
                button = document.createElement('button');
                button.className = 'cesium-button';
                button.onclick = function() {
                    _freeLook.lookUp();
                };
                button.innerHTML = '&uarr;';
                _toolbar.appendChild(button);

                // Center button
                button = document.createElement('button');
                button.className = 'cesium-button';
                button.onclick = function() {
                    _freeLook.reset();
                };
                button.innerHTML = '&oplus;';
                _toolbar.appendChild(button);

                // Down button
                button = document.createElement('button');
                button.className = 'cesium-button';
                button.onclick = function() {
                    _freeLook.lookDown();
                };
                button.innerHTML = '&darr;';
                _toolbar.appendChild(button);

                // Right button
                button = document.createElement('button');
                button.className = 'cesium-button';
                button.onclick = function() {
                    _freeLook.lookRight();
                };
                button.innerHTML = '&rarr;';
                _toolbar.appendChild(button);
            }
        };

    };
