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

            // hook on fullscreen change event
            var _canvas = document.getElementById(canvasId);
            document.addEventListener(Cesium.Fullscreen.getFullscreenChangeEventName(), function(ev) {
                var flag = Cesium.Fullscreen.isFullscreen();

                if (flag) {
                    _canvas.classList.remove('awCanvas-block');
                    _canvas.classList.add('awCanvas-fullscreen');
                } else {
                    _canvas.classList.remove('awCanvas-fullscreen');
                    _canvas.classList.add('awCanvas-block');
                }
            });

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
            _toolbar = document.createElement('div');
            _toolbar.setAttribute('class', 'awToolbar');
            // that.viewer._element.parentElement.insertBefore(_toolbar, that.viewer._element.nextSibling);
            that.viewer._element.appendChild(_toolbar);
            var _btnBar = document.createElement('div'),
                _ckpit = document.createElement('div');

            _btnBar.setAttribute('class', 'awButtonBar');
            _toolbar.appendChild(_btnBar);

            _ckpit.setAttribute('class', 'awCockpitNav');
            _toolbar.appendChild(_ckpit);

            var _it, _obj;

            // add toggle checkbox for 3D route visualization
            if (that._tourDataSource) {
                // _it = document.getElementById('awToggleRouteBtn');
                _obj = document.createElement('div');
                _obj.setAttribute('class', 'awBigButtonContainer');
                _btnBar.appendChild(_obj);

                _it = document.createElement('span');
                _it.setAttribute('id', 'awToggleRouteBtn');
                _it.setAttribute('class', 'awButton awRouteBtn');
                _it.setAttribute('data-toggle', 'true');
                _obj.appendChild(_it);

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
            }

            // add toggle checkbox for Cockpit animation
            var _obj2, _left, _right, _up, _down;
            if (that._cockpitDataSource) {
                // ** FREE LOOK SECTION ** //
                var _freeLook =  new Cesium.FreeLook();
                scene.freeLook = _freeLook;

                // left button
                _obj = document.createElement('div');
                _obj.setAttribute('class', 'awButtonContainer awcLeft');
                _ckpit.appendChild(_obj);

                _it = document.createElement('span');
                _it.setAttribute('class', 'awButton');
                _obj.appendChild(_it);
                _it.onclick = function(ev) { _freeLook.lookLeft(); };

                // right button
                _obj = document.createElement('div');
                _obj.setAttribute('class', 'awButtonContainer awcRight');
                _ckpit.appendChild(_obj);

                _it = document.createElement('span');
                _it.setAttribute('class', 'awButton');
                _obj.appendChild(_it);
                _it.onclick = function(ev) { _freeLook.lookRight(); };

                // up button
                _obj = document.createElement('div');
                _obj.setAttribute('class', 'awButtonContainer awcUp');
                _ckpit.appendChild(_obj);

                _it = document.createElement('span');
                _it.setAttribute('class', 'awButton');
                _obj.appendChild(_it);
                _it.onclick = function(ev) { _freeLook.lookUp(); };

                // down button
                _obj = document.createElement('div');
                _obj.setAttribute('class', 'awButtonContainer awcDown');
                _ckpit.appendChild(_obj);

                _it = document.createElement('span');
                _it.setAttribute('class', 'awButton');
                _obj.appendChild(_it);
                _it.onclick = function(ev) { _freeLook.lookDown(); };

                // center button
                _obj = document.createElement('div');
                _obj.setAttribute('class', 'awButtonContainer awcCenter');
                _ckpit.appendChild(_obj);

                _it = document.createElement('span');
                _it.setAttribute('class', 'awButton awcCenterBtn');
                _obj.appendChild(_it);
                _it.onclick = function(ev) { _freeLook.reset(); };

                // toggle cockpit button
                _obj = document.createElement('div');
                _obj.setAttribute('class', 'awBigButtonContainer');
                _btnBar.appendChild(_obj);

                _it = document.createElement('span');
                _it.setAttribute('id', 'awToggleCockpitBtn');
                _it.setAttribute('class', 'awButton awCockpitBtn');
                _it.setAttribute('data-toggle', 'true');
                _obj.appendChild(_it);

                _it = document.getElementById('awToggleCockpitBtn');
                _it.onclick = function(ev) {
                    var coll = that._cockpitDataSource.getDynamicObjectCollection().getObjects();
                    var i;

                    var flag = !( 'true' === ev.target.dataset.toggle);
                    ev.target.dataset.toggle = flag.toString();

                    if (flag) {
                        _ckpit.style.display = '';
                    } else {
                        _ckpit.style.display = 'none';
                    }

                    for (i=0; i<coll.length; i++) {
                        if (typeof coll[i].gxTour !== 'undefined') {
                            coll[i].gxTour._show = flag ? AlwaysTrue : AlwaysFalse;
                        }
                    }
                };
            }
        };

    };
