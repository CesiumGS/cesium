/*global define*/
define([
        'Core/CorridorGeometry',
        'Core/CorridorOutlineGeometry',
        'Core/Cartographic',
        'Core/ColorGeometryInstanceAttribute',
        'Core/Color',
        'Core/CornerType',
        'Core/Extent',
        'Core/ExtentGeometry',
        'Core/EllipseGeometry',
        'Core/GeometryInstance',
        'Core/VertexFormat',
        'Scene/createTangentSpaceDebugPrimitive',
        'Scene/DebugAppearance',
        'Scene/PerInstanceColorAppearance',
        'Scene/Primitive',
        'Core/defined',
        'Core/Math',
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
        CorridorOutlineGeometry,
        Cartographic,
        ColorGeometryInstanceAttribute,
        Color,
        CornerType,
        Extent,
        ExtentGeometry,
        EllipseGeometry,
        GeometryInstance,
        VertexFormat,
        createTangentSpaceDebugPrimitive,
        DebugAppearance,
        PerInstanceColorAppearance,
        Primitive,
        defined,
        CesiumMath,
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

        if (defined(endUserOptions.source)) {
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
            if (defined(source)) {
                source.loadUrl(endUserOptions.source).then(function() {
                    viewer.dataSources.add(source);

                    if (defined(endUserOptions.lookAt)) {
                        var dynamicObject = source.getDynamicObjectCollection().getObject(endUserOptions.lookAt);
                        if (defined(dynamicObject)) {
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
        if (defined(theme)) {
            if (endUserOptions.theme === 'lighter') {
                document.body.classList.add('cesium-lighter');
                viewer.animation.applyThemeChanges();
            } else {
                window.alert('Unknown theme: ' + theme);
            }
        }

        var primitives = scene.getPrimitives();
        var ellipsoid = viewer.centralBody.getEllipsoid();

        var solidWhite = new ColorGeometryInstanceAttribute(1.0, 1.0, 1.0, 1.0);

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
                                   //                                  Cartographic.fromDegrees(-120.0, -50.0),
                                     //                                Cartographic.fromDegrees(-120.0, -40.0),
                                                                     Cartographic.fromDegrees(-120.0, -30.0),
                                                                     Cartographic.fromDegrees(-120.0, -20.0),
//                                                                     Cartographic.fromDegrees(-120.0, -10.0),
                                                                     Cartographic.fromDegrees(-120.0, 70.0),
                                                                     Cartographic.fromDegrees(-120.0, 80.0),
                                                                     Cartographic.fromDegrees(-120.0, 90.0)//,
                                                  //                   Cartographic.fromDegrees(-110.0, 60.0)
                                                                ]);

        var airspaceGeo = new CorridorGeometry({
            positions : positions,
//              extrudedHeight: 500000,
//               cornerType: CornerType.MITERED,
                width : 500000,
                height: 50000
        });

   /*     var airspaceOutlineGeo = new CorridorOutlineGeometry({
            positions : positions,
//              extrudedHeight: 500000,
                width : 300000,
                height: 100000
            });*/

 /*       var airspaceOutline = new GeometryInstance({
            geometry: CorridorOutlineGeometry.createGeometry(airspaceOutlineGeo),
            attributes : {
                color : solidWhite
            }
        });*/
        var airspace = new GeometryInstance({
            geometry: airspaceGeo,
            attributes: {
                color : ColorGeometryInstanceAttribute.fromColor(Color.fromRandom({alpha : 1.0}))
            }
        });

        primitives.add(new Primitive({
            geometryInstances: [airspace],
            appearance : new PerInstanceColorAppearance({
                translucent : false,
                closed : true
            })
        }));

    /*    primitives.add(new Primitive({
            geometryInstances: [airspaceOutline],
            appearance : new PerInstanceColorAppearance({
                flat : true,
                renderState : {
                    depthTest : {
                        enabled : true
                    },
                    lineWidth : Math.min(4.0, scene.getContext().getMaximumAliasedLineWidth())
                }
            })
        }));*/

        primitives.add(createTangentSpaceDebugPrimitive({
            geometry: airspaceGeo
        }));
    }
});
