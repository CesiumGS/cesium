/*global define*/
define([
        'Cesium/Core/Cartesian3',
        'Cesium/Core/Cartesian2',
        'Cesium/Core/Color',
        'Cesium/Core/defined',
        'Cesium/Core/formatError',
        'Cesium/Core/getFilenameFromUri',
        'Cesium/Core/Math',
        'Cesium/Core/Rectangle',
        'Cesium/Core/objectToQuery',
        'Cesium/Core/queryToObject',
        'Cesium/Core/CesiumTerrainProvider',
        'Cesium/Core/GeographicTilingScheme',
        'Cesium/DataSources/CzmlDataSource',
        'Cesium/DataSources/GeoJsonDataSource',
        'Cesium/DataSources/KmlDataSource',
        'Cesium/Scene/TileMapServiceImageryProvider',
        'Cesium/Scene/BingMapsImageryProvider',
        'Cesium/Scene/UrlTemplateImageryProvider',
        'Cesium/Scene/createTileMapServiceImageryProvider',
        'Cesium/Widgets/Viewer/Viewer',
        'Cesium/Widgets/Viewer/viewerCesiumInspectorMixin',
        'Cesium/Widgets/Viewer/viewerDragDropMixin',
        'domReady!'
    ], function(
        Cartesian3,
        Cartesian2,
        Color,
        defined,
        formatError,
        getFilenameFromUri,
        CesiumMath,
        Rectangle,
        objectToQuery,
        queryToObject,
        CesiumTerrainProvider,
        GeographicTilingScheme,
        CzmlDataSource,
        GeoJsonDataSource,
        KmlDataSource,
        TileMapServiceImageryProvider,
        BingMapsImageryProvider,
        UrlTemplateImageryProvider,
        createTileMapServiceImageryProvider,
        Viewer,
        viewerCesiumInspectorMixin,
        viewerDragDropMixin) {
    "use strict";

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
    var availableLevelsTerrain = [8, 11, 13, 15, 17];
    var availableLevelsImagery = [8, 11, 13, 15, 17, 18];

    var imageryProvider;
    if (endUserOptions.tmsImageryUrl) {
        imageryProvider = createTileMapServiceImageryProvider({
            url : endUserOptions.tmsImageryUrl
        });
    }
              //availableLevels: availableLevels
    imageryProvider = new BingMapsImageryProvider({
      url : '//dev.virtualearth.net',
      availableLevels: endUserOptions.limitImagery ? availableLevelsImagery : undefined
    });


    var SSECorrector = function() {
      var params = {};
      location.search.substr(1).split("&").reduce(function(previous, current) {
        var splitted = current.split("=");
        if (splitted.length === 2) {
          params[splitted[0]] = splitted[1];
        } else {
          params[splitted[0]] = true;
        }
      });

      this.mindist = parseInt(params['mindist'] || '5000', 10);
      this.maxdist = parseInt(params['maxdist'] || '10000', 10);
      this.mincamfactor = parseFloat(params['mincamfactor'] ||'0.9');
      this.maxcamfactor = parseFloat(params['maxcamfactor'] || '1.2');
      // Max height to apply optmization
      this.maxheight = parseInt(params['maxheight'] || '0', 10);
      this.allowtilelevels = parseInt(params['allowtilelevels'] || '0', 10);
      this.pickglobe = !params['nopickglobe'];
      this.pickposition = parseFloat(params['pickposition'] || '0.6666');
      this.shouldCut = !params['nocut'];
      this.noheight = !!params['noheight'];
      this.maxerrorfactor = parseFloat(params['maxerrorfactor'] || '0.25');
      this.cameraHeight;
    };

    SSECorrector.prototype.newFrameState = function(frameState) {
        this.cameraHeight = frameState.camera.positionCartographic.height;

        if (this.pickglobe) {
          var scene = frameState.camera._scene;
          var canvas = scene.canvas;
          var pixelHeight = this.pickposition * canvas.clientHeight;
          var pixel = new Cartesian2(canvas.clientWidth / 2, pixelHeight);
          var ray = scene.camera.getPickRay(pixel);
          var target = scene.globe.pick(ray, scene);
          // Could also take bottom in the absence of result
          // then take cameraHeight
          this.cameraHeight = undefined;
          if (target) {
            var distance = Cartesian3.distance(frameState.camera.position, target);
            this.cameraHeight = Math.max(this.cameraHeight, distance);
          }
        }

        this.min = this.mindist;
        this.max = this.maxdist;
        if (!this.noheight && this.cameraHeight) {
          this.min = Math.min(this.mindist, this.mincamfactor * this.cameraHeight);
          this.max = Math.max(this.maxdist, this.maxcamfactor * this.cameraHeight);
        }

        // 1 = a * min + b
        // maxerrorfactor = a * max + b
        this.a = (1 - this.maxerrorfactor) / (this.min - this.max);
        this.b = 1 - this.a * this.min;
    };

    SSECorrector.prototype.correct = function(frameState, tile, distance, original) {
        if (!this.shouldCut ||
            (this.maxheight && this.cameraHeight && (this.cameraHeight > this.maxheight)) ||
            (this.allowtilelevels && (tile._level <= this.allowtilelevels))) {
          return original;
        }

        if (distance < this.max) {
          if (distance < this.min || this.min === this.max) {
            return original;
          } else {
            var linearFactor = this.a * distance + this.b;
            return linearFactor * original;
          }
        } else {
          return this.maxerrorfactor * original;
        }
    };


    var loadingIndicator = document.getElementById('loadingIndicator');
    var viewer;
    try {
        viewer = new Viewer('cesiumContainer', {
            baseLayerPicker : false,
            terrainProvider: new CesiumTerrainProvider({
              url : '//3d.geo.admin.ch/1.0.0/ch.swisstopo.terrain.3d/default/20151231/4326/',
              availableLevels: endUserOptions.limitTerrain ? availableLevelsTerrain : undefined,
              rectangle: Rectangle.fromDegrees(5.013926957923385, 45.35600133779394, 11.477436312994008, 48.27502358353741)
            }),
            imageryProvider: new UrlTemplateImageryProvider({
                url: "//wmts{s}.geo.admin.ch/1.0.0/ch.swisstopo.swissimage-product/default/20151231_50/4326/{z}/{y}/{x}.jpeg",
                subdomains: '56789',
                //url: "//wmts{s}.geo.admin.ch/1.0.0/ch.swisstopo.swisstlm3d-wanderwege/default/20150101/4326/{z}/{x}/{y}.png",
                //subdomains: ['10', '11', '12', '13', '14'],
                //metadataUrl: '//terrain3.geo.admin.ch/1.0.0/ch.swisstopo.swisstlm3d-wanderwege/default/20150101/4326/'
                availableLevels: endUserOptions.limitImagery ? availableLevelsImagery : undefined,
                tilingScheme: new GeographicTilingScheme()
            }),
            scene3DOnly : endUserOptions.scene3DOnly,
            timeline: false,
            skyBox: false
        });
        viewer.scene.globe._surface.sseCorrector = new SSECorrector();
        viewer.scene.fog.enabled = !!endUserOptions.nofog;
    } catch (exception) {
        loadingIndicator.style.display = 'none';
        var message = formatError(exception);
        console.error(message);
        if (!document.querySelector('.cesium-widget-errorPanel')) {
            window.alert(message);
        }
        return;
    }

    window.viewer = viewer;
    viewer.scene.backgroundColor = Color.WHITE;
    viewer.scene.globe.baseColor = Color.WHITE;
    viewer.scene.globe._surface.debug = true;
    viewer.scene.globe._surface._debug.enableDebugOutput = true;
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
//    scene.camera.flyTo({
//              'destination': Cartesian3.fromDegrees(7.140908, 46.203627, 3000),
//              'duration': 0
//              });
    scene.camera.lookAt(
        Cartesian3.fromDegrees(7.140908, 46.203627, 3000),
        Cartesian3.ZERO,
        Cartesian3.UNIT_Z);

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
