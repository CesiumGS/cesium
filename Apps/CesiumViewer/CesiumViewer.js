/*global define*/
define(['Core/CorridorGeometry',
        'Core/Cartographic',
        'Core/ColorGeometryInstanceAttribute',
        'Core/Color',
        'Core/CornerType',
        'Core/Math',
        'Core/PolylineVolumeGeometry',
        'Core/PolylineVolumeOutlineGeometry',
        'Core/Extent',
        'Core/ExtentGeometry',
        'Core/Cartesian2',
        'Core/ExtentOutlineGeometry',
        'Core/EllipseGeometry',
        'Core/GeometryInstance',
        'Core/VertexFormat',
        'Scene/createTangentSpaceDebugPrimitive',
        'Scene/DebugAppearance',
        'Scene/PerInstanceColorAppearance',
        'Scene/Primitive',
        'Core/defined',
        'DynamicScene/CzmlDataSource',
        'DynamicScene/GeoJsonDataSource',
        'Scene/PerformanceDisplay',
        'Widgets/checkForChromeFrame',
        'Widgets/Viewer/Viewer',
        'Widgets/Viewer/viewerDragDropMixin',
        'Widgets/Viewer/viewerDynamicObjectMixin',
        'domReady!'
    ], function(
            CorridorGeometry,
            Cartographic,
            ColorGeometryInstanceAttribute,
            Color,
            CornerType,
            CesiumMath,
            PolylineVolumeGeometry,
            PolylineVolumeOutlineGeometry,
            Extent,
            ExtentGeometry,
            Cartesian2,
            ExtentOutlineGeometry,
            EllipseGeometry,
            GeometryInstance,
            VertexFormat,
            createTangentSpaceDebugPrimitive,
            DebugAppearance,
            PerInstanceColorAppearance,
            Primitive,
        defined,
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

        viewer.onDropError.addEventListener(function(viewerArg, name, error) {
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
                        var dynamicObject = source.getDynamicObjectCollection().getObject(endUserOptions.lookAt);
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

        var primitives = scene.getPrimitives();
        var ellipsoid = viewer.centralBody.getEllipsoid();

       // var solidWhite = new ColorGeometryInstanceAttribute(1.0, 1.0, 1.0, 1.0);

     /*   var positions = ellipsoid.cartographicArrayToCartesianArray([
                                                                     Cartographic.fromDegrees(-89.0, -3.0),
                                                                     Cartographic.fromDegrees(-89.0, -2.0),
                                                                     Cartographic.fromDegrees(-90.0, -2.0),
                                                                     Cartographic.fromDegrees(-90.0, -1.0),
                                                                     Cartographic.fromDegrees(-90.0, 0.0)

                                                                 ]);
       */
//        var positions = ellipsoid.cartographicArrayToCartesianArray([
  //                                                                   Cartographic.fromDegrees(-120.0, 40.0),
    //                                                                 Cartographic.fromDegrees(-120.0, 50.0)
      //                                                           ]);

        var positions = ellipsoid.cartographicArrayToCartesianArray([
                     //       Cartographic.fromDegrees(-85.0, 35.0, 0),
            //           Cartographic.fromDegrees(-85.0, 36.0, 0),
                            Cartographic.fromDegrees(-87.0, 38.0),
                   //         Cartographic.fromDegrees(-86, 39.0),
                            Cartographic.fromDegrees(-90.0, 40.0)
        ]);

        function ellipsePositions(horizontalRadius, verticalRadius) {
            var pos = [];
            var theta = CesiumMath.toRadians(1);
            var posCount = Math.PI*2/theta;
            for (var i = 0; i < posCount; i++) {
                pos.push(new Cartesian2(horizontalRadius * Math.cos(theta * i), verticalRadius * Math.sin(theta * i)));
            }
            return pos;
        }


        function starPositions(arms, rOuter, rInner) {
            var angle = Math.PI / arms;

            var pos = [];

            for (var i = 0; i < 2 * arms; i++) {
                var r = (i % 2) === 0 ? rOuter : rInner;
                var p = new Cartesian2(Math.cos(i * angle) * r, Math.sin(i * angle) * r);
                pos.push(p);
            }
            return pos;
        }

        function boxPositions() {
            return [new Cartesian2(-50000, -50000), new Cartesian2(50000, -50000), new Cartesian2(50000, 50000), new Cartesian2(-50000, 50000)];
        }

        var geo = PolylineVolumeGeometry.createGeometry(new PolylineVolumeGeometry({
            polylinePositions : positions,
            vertexFormat: VertexFormat.ALL,
     //       shapePositions:  boxPositions(),
         //   shapePositions: starPositions(7, 20000, 10000),
            shapePositions:  ellipsePositions(40000, 40000),
            cornerType: CornerType.MITERED
        }));

        var volume = new GeometryInstance({
            geometry: geo,
            attributes: {
                color : ColorGeometryInstanceAttribute.fromColor(Color.fromRandom({alpha : 1.0}))
            }
        });

        var p = new Primitive({
            geometryInstances: [volume],
            appearance : new DebugAppearance({
                attributeName: 'st'
            })/*new PerInstanceColorAppearance({
                translucent : false,
                closed : true
            })*/
        });

        primitives.add(p);
/*
        var outlineGeo = new PolylineVolumeOutlineGeometry({
            polylinePositions : positions,
            shapePositions:  boxPositions(),
          //  shapePositions: starPositions(7, 20000, 10000),
        //    shapePositions:  ellipsePositions(40000, 40000),
            cornerType: CornerType.MITERED
        });

       var inst = new GeometryInstance({
            geometry: PolylineVolumeOutlineGeometry.createGeometry(outlineGeo),
            attributes : {
                color : solidWhite
            }
        });

        primitives.add(new Primitive({
            geometryInstances: inst,
            appearance : new PerInstanceColorAppearance({
                flat : true,
                renderState : {
                    depthTest : {
                        enabled : true
                    },
                    lineWidth : Math.min(4.0, scene.getContext().getMaximumAliasedLineWidth())
                }
            })
        }));
*/
        var debugp = createTangentSpaceDebugPrimitive({
            geometry : geo
        });
        primitives.add(debugp);



        /*
                primitives.add(createTangentSpaceDebugPrimitive({
                    geometry: airspaceGeo
                }));
                var drawCommand = new DrawCommand();
                drawCommand.owner = p;
                p.command = drawCommand;

                scene.debugCommandFilter = function(command) {
                    if (command.owner === p) {
                        command.boundingVolume = p._boundingSphere;
                        command.debugShowBoundingVolume = true;
                    }
                    return true;
                };*/
    }
});
