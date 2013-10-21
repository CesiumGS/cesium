/*global Cesium*/

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
        "use strict";
        var that = this;

        options = Cesium.defaultValue(options, Cesium.defaultValue.EMPTY_OBJECT);

        var _viewerOpts = Cesium.defaultValue(options.viewer, Cesium.defaultValue.EMPTY_OBJECT);

        var _toolbar;

        /**
         * Initialize widget
         */
        this.init = function() {
            Cesium.BingMapsApi.defaultKey = 'AhwnIBdTyPRiHY7c6jq1U_0IxoMUUL3iQWJOfGwfpROIoNeBEtdT71zFMg2f2J39';

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
                that._tourDataSource = new Cesium.KmlDataSource(cesiumTerrainProvider);
                that._tourDataSource.loadUrl(tourKml).then(function() {
                    that.viewer.dataSources.add(that._tourDataSource);
                });
            }
            // Cockpit KML
            var cockpitKml = options.cockpitURL;
            if (typeof cockpitKml !== 'undefined') {
                that._cockpitDataSource = new Cesium.KmlDataSource(cesiumTerrainProvider);
                that._cockpitDataSource.loadUrl(cockpitKml).then(function() {
                    that._cockpitDataSource.getChangedEvent().addEventListener(function(ev) {
                        // stretch timeline according to flight data
                        var dataSourceClock = that._cockpitDataSource.getClock();
                        var timeline = that.viewer.timeline;
                        timeline.zoomTo(dataSourceClock.startTime, dataSourceClock.stopTime);
                    });

                    that.viewer.dataSources.add(that._cockpitDataSource);
                });
            }


            // -- add toolbar -- //
            _toolbar = document.getElementById('awToolbar');


            var _it, _obj;

            // add toggle checkbox for 3D route visualization
            if (that._tourDataSource) {
                _it = document.getElementById('awToggleRouteBtn');
                _it.onclick = function(ev) {
                    var coll = that._tourDataSource.getDynamicObjectCollection().getObjects();
                    var i;

                    var flag = !( 'true' === ev.target.dataset.toggle);
                    ev.target.dataset.toggle = flag.toString();

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
            } else {
                _it = document.getElementById('awToggleRouteBtn');
                _it.style.display = 'none';
            }

            // add toggle checkbox for Cockpit animation
            if (that._cockpitDataSource) {
                // ** FREE LOOK SECTION ** //
                var _freeLook =  new Cesium.FreeLook();
                scene.freeLook = _freeLook;

                document.getElementsByClassName('awcLeft')[0].onclick = function(ev) {
                    _freeLook.lookLeft();
                };
                document.getElementsByClassName('awcRight')[0].onclick = function(ev) {
                    _freeLook.lookRight();
                };
                document.getElementsByClassName('awcUp')[0].onclick = function(ev) {
                    _freeLook.lookUp();
                };
                document.getElementsByClassName('awcDown')[0].onclick = function(ev) {
                    _freeLook.lookDown();
                };
                document.getElementsByClassName('awcCenter')[0].onclick = function(ev) {
                    _freeLook.reset();
                };

                _it = document.getElementById('awToggleCockpitBtn');
                _it.onclick = function(ev) {
                    var coll = that._cockpitDataSource.getDynamicObjectCollection().getObjects();
                    var i;

                    var flag = !( 'true' === ev.target.dataset.toggle);
                    ev.target.dataset.toggle = flag.toString();

                    if (flag) {
                        document.getElementsByClassName('awCockpitNav')[0].style.display = '';
                    } else {
                        document.getElementsByClassName('awCockpitNav')[0].style.display = 'none';
                    }

                    for (i=0; i<coll.length; i++) {
                        if (typeof coll[i].gxTour !== 'undefined') {
                            coll[i].gxTour._show = flag ? AlwaysTrue : AlwaysFalse;
                        }
                    }
                };
            } else {
                _it = document.getElementById('awToggleCockpitBtn');
                _it.style.display = 'none';
                _it = document.getElementsByClassName('awCockpitNav')[0];
                _it.style.display = 'none';
            }
        };

    };
