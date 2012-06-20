(function() {
    "use strict";
    /*global Cesium,Sandbox*/

    Sandbox.Billboard = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var image = new Image();
            image.onload = function() {
                var billboards = new Cesium.BillboardCollection(undefined);
                billboards.setTextureAtlas(scene.getContext().createTextureAtlas([image]));
                billboards.add({
                    position : ellipsoid.cartographicDegreesToCartesian(new Cesium.Cartographic2(-75.59777, 40.03883)),
                    imageIndex : 0
                });
                primitives.add(billboards);
            };
            image.src = 'Images/logoColor.png';
        };
    };

    Sandbox.SeveralBillboards = function (scene, ellipsoid, primitives) {
        this.code = function () {
            Cesium.Chain.run(
                Cesium.Jobs.downloadImage('Images/logoColor.png'),
                Cesium.Jobs.downloadImage('Images/facility.gif')).thenRun(
            function () {
                // Once both images are downloaded, they are combined into one image,
                // called a texture atlas, which is assigned to a billboard-collection.
                // Several billboards can be added to the same collection; each billboard
                // references an image in the texture atlas.

                var billboards = new Cesium.BillboardCollection(undefined);
                billboards.setTextureAtlas(scene.getContext().createTextureAtlas([
                    this.images['Images/logoColor.png'],
                    this.images['Images/facility.gif']
                ]));

                billboards.add({
                    position : ellipsoid.cartographicDegreesToCartesian(new Cesium.Cartographic2(-75.59777, 40.03883)),
                    imageIndex : 0  // Logo
                });

                billboards.add({
                    position : ellipsoid.cartographicDegreesToCartesian(new Cesium.Cartographic2(-80.50, 35.14)),
                    imageIndex : 1  // Facility
                });

                billboards.add({
                    position : ellipsoid.cartographicDegreesToCartesian(new Cesium.Cartographic2(-80.12, 25.46)),
                    imageIndex : 1  // Facility
                });

                primitives.add(billboards);
            });
        };
    };

    Sandbox.PointBillboards = function (scene, ellipsoid, primitives) {
        this.code = function () {
            // A white circle is drawn into a 2D canvas.  The canvas is used as
            // a texture for billboards, each of which applies a different color
            // and scale to change the point's appearance.
            //
            // The 2D canvas can draw much more than circles.  See:
            // https://developer.mozilla.org/en/Canvas_tutorial
            var canvas = document.createElement('canvas');
            canvas.width = 16;
            canvas.height = 16;
            var context2D = canvas.getContext('2d');
            context2D.beginPath();
            context2D.arc(8, 8, 8, 0, Cesium.Math.TWO_PI, true);
            context2D.closePath();
            context2D.fillStyle='rgb(255, 255, 255)';
            context2D.fill();

            var billboards = new Cesium.BillboardCollection(undefined);
            billboards.setTextureAtlas(scene.getContext().createTextureAtlas([canvas]));

            billboards.add({
                position : ellipsoid.cartographicDegreesToCartesian(new Cesium.Cartographic2(-75.59777, 40.03883)),
                color : { red : 1.0, blue : 0.0, green : 0.0, alpha : 1.0 },
                scale : 0.5
            });

            billboards.add({
                position : ellipsoid.cartographicDegreesToCartesian(new Cesium.Cartographic2(-80.50, 35.14)),
                color : { red : 0.0, blue : 1.0, green : 0.0, alpha : 1.0 }
            });

            billboards.add({
                position : ellipsoid.cartographicDegreesToCartesian(new Cesium.Cartographic2(-80.12, 25.46)),
                color : { red : 0.0, blue : 0.0, green : 1.0, alpha : 1.0 },
                scale : 2
            });

            primitives.add(billboards);
        };
    };

    Sandbox.MarkerBillboards = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var image = new Image();
            image.onload = function() {
                var billboards = new Cesium.BillboardCollection(undefined);
                var atlas = scene.getContext().createTextureAtlas([image], Cesium.PixelFormat.RGBA, 0);
                // Break one image full of markers into many subregions.
                atlas.addSubRegions(0, [
                    // Dots, small to large, imageIndex 1 to 6
                    { x:91, y:111, width:6, height:6 },
                    { x:81, y:109, width:10, height:10 },
                    { x:67, y:107, width:14, height:14 },
                    { x:49, y:105, width:18, height:18 },
                    { x:27, y:103, width:22, height:22 },
                    { x:1, y:101, width:26, height:26 },
                    // Up-Triangles, small to large, imageIndex 7 to 12
                    { x:91, y:73, width:6, height:6 },
                    { x:81, y:71, width:10, height:10 },
                    { x:67, y:69, width:14, height:14 },
                    { x:49, y:67, width:18, height:18 },
                    { x:27, y:65, width:22, height:22 },
                    { x:1, y:63, width:26, height:26 },
                    // Down-Triangles, small to large, imageIndex 13 to 18
                    { x:31, y:93, width:6, height:6 },
                    { x:37, y:91, width:10, height:10 },
                    { x:47, y:89, width:14, height:14 },
                    { x:61, y:87, width:18, height:18 },
                    { x:79, y:85, width:22, height:22 },
                    { x:101, y:83, width:26, height:26 },
                    // Up-Arrows, small to large, imageIndex 19 to 24
                    { x:91, y:38, width:6, height:6 },
                    { x:81, y:36, width:10, height:10 },
                    { x:67, y:34, width:14, height:14 },
                    { x:49, y:32, width:18, height:18 },
                    { x:27, y:30, width:22, height:22 },
                    { x:1, y:28, width:26, height:26 },
                    // Down-Arrows, small to large, imageIndex 25 to 30
                    { x:31, y:56, width:6, height:6 },
                    { x:37, y:54, width:10, height:10 },
                    { x:47, y:52, width:14, height:14 },
                    { x:61, y:50, width:18, height:18 },
                    { x:79, y:48, width:22, height:22 },
                    { x:101, y:46, width:26, height:26 },
                    // X's, small to large, imageIndex 31 to 36
                    { x:91, y:11, width:6, height:6 },
                    { x:81, y:9, width:10, height:10 },
                    { x:67, y:7, width:14, height:14 },
                    { x:49, y:5, width:18, height:18 },
                    { x:27, y:3, width:22, height:22 },
                    { x:1, y:1, width:26, height:26 },
                    // Plus's, small to large, imageIndex 37 to 42
                    { x:92, y:3, width:5, height:5 },
                    { x:109, y:9, width:10, height:10 },
                    { x:107, y:7, width:14, height:14 },
                    { x:105, y:5, width:18, height:18 },
                    { x:103, y:3, width:22, height:22 },
                    { x:101, y:1, width:26, height:26 }
                ]);
                billboards.setTextureAtlas(atlas);
                // Add several billboards based on the above marker definitions.
                billboards.add({
                    position: ellipsoid.cartographicDegreesToCartesian(new Cesium.Cartographic2(-75.59777, 40.03883)),
                    imageIndex: 10,
                    scale: 1,
                    color: { red: 0, green: 1, blue: 0, alpha: 1 }
                });
                billboards.add({
                    position: ellipsoid.cartographicDegreesToCartesian(new Cesium.Cartographic2(-84.0, 39.0)),
                    imageIndex: 16,
                    scale: 1,
                    color: { red: 0, green: 0.5, blue: 1, alpha: 1 }
                });
                billboards.add({
                    position: ellipsoid.cartographicDegreesToCartesian(new Cesium.Cartographic2(-70.0, 41.0)),
                    imageIndex: 21,
                    scale: 1,
                    color: { red: 0.5, green: 0.9, blue: 1, alpha: 1 }
                });
                billboards.add({
                    position: ellipsoid.cartographicDegreesToCartesian(new Cesium.Cartographic2(-73.0, 37.0)),
                    imageIndex: 35,
                    scale: 1,
                    color: { red: 1, green: 0, blue: 0, alpha: 1 }
                });
                billboards.add({
                    position: ellipsoid.cartographicDegreesToCartesian(new Cesium.Cartographic2(-79.0, 35.0)),
                    imageIndex: 40,
                    scale: 1,
                    color: { red: 1, green: 1, blue: 0, alpha: 1 }
                });
                primitives.add(billboards);
            };
            image.src = 'Images/whiteShapes.png';
        };
    };

    Sandbox.BillboardPropertiesCreation = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var image = new Image();
            image.onload = function() {
                var billboards = new Cesium.BillboardCollection(undefined);
                billboards.setTextureAtlas(scene.getContext().createTextureAtlas([image]));
                billboards.add({
                    show : true, // default
                    position : ellipsoid.cartographicDegreesToCartesian(new Cesium.Cartographic2(-75.59777, 40.03883)),
                    pixelOffset : new Cesium.Cartesian2(0, 50), // default: (0, 0)
                    eyeOffset : new Cesium.Cartesian3(0.0, 0.0, 0.0), // default
                    horizontalOrigin : Cesium.HorizontalOrigin.CENTER, // default
                    verticalOrigin : Cesium.VerticalOrigin.BOTTOM, // default: CENTER
                    scale : 2.0, // default : 1.0
                    imageIndex : 0, // default
                    color : { red : 0.0, green : 1.0, blue : 0.0, alpha : 1.0 } // default: all 255
                });
                primitives.add(billboards);
            };
            image.src = 'Images/logoColor.png';
        };
    };

    Sandbox.BillboardProperties = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var image = new Image();
            image.onload = function() {
                var billboards = new Cesium.BillboardCollection(undefined);
                billboards.setTextureAtlas(scene.getContext().createTextureAtlas([image]));

                // add() returns a Billboard object containing functions to change
                // the billboard's position and appearance.
                var b = billboards.add({
                    position : ellipsoid.cartographicDegreesToCartesian(new Cesium.Cartographic2(-75.59777, 40.03883)),
                    imageIndex : 0
                });

                b.setPosition(ellipsoid.cartographicDegreesToCartesian(new Cesium.Cartographic3(-75.59777, 40.03883, 300000.0)));
                b.setScale(3.0);
                b.setColor({ red : 1.0, green : 1.0, blue : 1.0, alpha : 0.25 });

                primitives.add(billboards);
            };
            image.src = 'Images/logoColor.png';
        };
    };

    Sandbox.BillboardReferenceFrame = function (scene, ellipsoid, primitives) {
        this.code = function () {
            var image = new Image();
            image.onload = function() {
                var center = ellipsoid.cartographicDegreesToCartesian(new Cesium.Cartographic2(-75.59777, 40.03883));

                var billboards = new Cesium.BillboardCollection(undefined);
                billboards.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(center);
                billboards.setTextureAtlas(scene.getContext().createTextureAtlas([image]));
                billboards.add({ position : new Cesium.Cartesian3(0.0, 0.0, 0.0) }); // center
                billboards.add({ position : new Cesium.Cartesian3(1000000.0, 0.0, 0.0) }); // east
                billboards.add({ position : new Cesium.Cartesian3(0.0, 1000000.0, 0.0) }); // north
                billboards.add({ position : new Cesium.Cartesian3(0.0, 0.0, 1000000.0) }); // up
                primitives.add(billboards);
            };
            image.src = 'Images/facility.gif';
        };
    };

}());
