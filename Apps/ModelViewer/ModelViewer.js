/*global Cesium*/
(function() {
    "use strict";

    var scene;
    var canvas;
    var render;

    function displayMessage(str) {
        var d = document.createElement('div');
        d.className = 'cesium-message-container';
        d.innerHTML = str;
        document.body.appendChild(d);
    }

    function createModel(url) {
        var modelMatrix = Cesium.Transforms.northUpEastToFixedFrame(Cesium.Cartesian3.fromDegrees(-123.0744619, 44.0503706, 0));

        scene.primitives.removeAll(); // Remove previous model
        var model = scene.primitives.add(Cesium.Model.fromGltf({
            url : url,
            modelMatrix : modelMatrix,
            minimumPixelSize : 128
        }));

        model.readyToRender.addEventListener(function(model) {
            // Play and loop all animations at half-spead
            model.activeAnimations.addAll({
                speedup : 0.5,
                loop : Cesium.ModelAnimationLoop.REPEAT
            });

            // Zoom to model
            var center = Cesium.Matrix4.multiplyByPoint(model.modelMatrix, model.boundingSphere.center, new Cesium.Cartesian3());
            var transform = Cesium.Transforms.northUpEastToFixedFrame(center);
            var camera = scene.camera;
            camera.transform = transform;
            camera.constrainedAxis = undefined;
            var controller = scene.screenSpaceCameraController;
            controller.ellipsoid = Cesium.Ellipsoid.UNIT_SPHERE;
            controller.enableTilt = false;
            var r = 1.25 * Math.max(model.boundingSphere.radius, camera.frustum.near);
            controller.minimumZoomDistance = r * 0.25;
            camera.lookAt(new Cesium.Cartesian3(r, r, r), Cesium.Cartesian3.ZERO, Cesium.Cartesian3.UNIT_Y);
        });
    }

    function configureCanvasSize() {
        var width = canvas.clientWidth;
        var height = canvas.clientHeight;
        var zoomFactor = Cesium.defaultValue(window.devicePixelRatio, 1.0);

        width *= zoomFactor;
        height *= zoomFactor;

        canvas.width = width;
        canvas.height = height;
    }

    function configureCameraFrustum() {
        var width = canvas.width;
        var height = canvas.height;
        if (width !== 0 && height !== 0) {
            var frustum = scene.camera.frustum;
            if (Cesium.defined(frustum.aspectRatio)) {
                frustum.aspectRatio = width / height;
            } else {
                frustum.top = frustum.right * (height / width);
                frustum.bottom = -frustum.top;
            }
        }
    }

    function startRenderLoop() {
        if (render) {
            scene.initializeFrame();
            scene.render();
            Cesium.requestAnimationFrame(startRenderLoop);
        }
    }

    function resize() {
        configureCanvasSize();
        configureCameraFrustum();
    }

    window.onload = function() {
        var endUserOptions = {};
        var queryString = window.location.search.substring(1);
        if (queryString !== '') {
            var params = queryString.split('&');
            for (var i = 0, len = params.length; i < len; ++i) {
                var param = params[i];
                var keyValuePair = param.split('=');
                if (keyValuePair.length > 1) {
                    endUserOptions[keyValuePair[0]] = decodeURIComponent(keyValuePair[1].replace(/\+/g, ' '));
                }
            }
        }

        var source = endUserOptions.source;
        if (Cesium.defined(source)) {
            render = true;
            var cesiumLogoData = 'data:image/png;base64,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';
            var container = document.getElementById('cesiumContainer');
            var element = document.createElement('div');
            element.id = 'cesium-drop-zone';
            element.style.height = "100%";
            element.style.width = '100%';
            container.appendChild(element);

            canvas = document.createElement('canvas');
            canvas.oncontextmenu = function() {
                return false;
            };
            canvas.onselectstart = function() {
                return false;
            };
            canvas.style.height = "100%";
            canvas.style.width = '100%';
            element.appendChild(canvas);

            scene = new Cesium.Scene({
                canvas : canvas
            });
            scene.backgroundColor = Cesium.Color.GRAY;
            scene.camera.constrainedAxis = Cesium.Cartesian3.UNIT_Z;
            scene.renderError.addEventListener(function(scene, error) {
                displayMessage('An error has occured. Rendering has stopped.<br>' + error.message);
                render = false;
            });

            var cesiumCredit = new Cesium.Credit('Cesium', cesiumLogoData, 'http://cesiumjs.org/');
            scene.frameState.creditDisplay.addDefaultCredit(cesiumCredit);

            window.onresize = resize;
            startRenderLoop();
            resize();
            createModel(source);
        } else {
            displayMessage('To view model, add \'?source=/path/to/gltf/file\' to the end of the URL');
        }
    };
})();