/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/GeometryInstance',
        '../Core/getMagic',
        '../Core/getStringFromTypedArray',
        '../Core/loadArrayBuffer',
        '../Core/PointGeometry',
        '../Core/Request',
        '../Core/RequestScheduler',
        '../Core/RequestType',
        '../ThirdParty/when',
        './Cesium3DTileContentState',
        './PointAppearance',
        './Primitive'
    ], function(
        BoundingSphere,
        Cartesian3,
        Color,
        defaultValue,
        defined,
        destroyObject,
        defineProperties,
        DeveloperError,
        GeometryInstance,
        getMagic,
        getStringFromTypedArray,
        loadArrayBuffer,
        PointGeometry,
        Request,
        RequestScheduler,
        RequestType,
        when,
        Cesium3DTileContentState,
        PointAppearance,
        Primitive) {
    'use strict';

    /**
     * Represents the contents of a
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/TileFormats/Points/README.md|Points}
     * tile in a {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/blob/master/README.md|3D Tiles} tileset.
     *
     * @alias Points3DTileContent
     * @constructor
     *
     * @private
     */
    function Points3DTileContent(tileset, tile, url) {
        this._primitive = undefined;
        this._url = url;
        this._tileset = tileset;
        this._tile = tile;
        this._constantColor = Color.clone(Color.WHITE);

        /**
         * The following properties are part of the {@link Cesium3DTileContent} interface.
         */
        this.state = Cesium3DTileContentState.UNLOADED;
        this.batchTableResources = undefined;
        this.featurePropertiesDirty = false;
        this.boundingSphere = tile.contentBoundingVolume.boundingSphere;

        this._contentReadyToProcessPromise = when.defer();
        this._readyPromise = when.defer();
    }

    defineProperties(Points3DTileContent.prototype, {
        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        featuresLength : {
            get : function() {
                // TODO: implement batchTable for pnts tile format
                return 0;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        innerContents : {
            get : function() {
                return undefined;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        contentReadyToProcessPromise : {
            get : function() {
                return this._contentReadyToProcessPromise.promise;
            }
        },

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        }
    });

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.hasProperty = function(name) {
        // TODO: implement batchTable for pnts tile format
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.getFeature = function(batchId) {
        // TODO: implement batchTable for pnts tile format
        return undefined;
    };

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
    var sizeOfFloat32 = Float32Array.BYTES_PER_ELEMENT;

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.request = function() {
        var that = this;

        var distance = this._tile.distanceToCamera;
        var promise = RequestScheduler.schedule(new Request({
            url : this._url,
            server : this._tile.requestServer,
            requestFunction : loadArrayBuffer,
            type : RequestType.TILES3D,
            distance : distance
        }));
        if (defined(promise)) {
            this.state = Cesium3DTileContentState.LOADING;
            promise.then(function(arrayBuffer) {
                if (that.isDestroyed()) {
                    return when.reject('tileset is destroyed');
                }
                that.initialize(arrayBuffer);
            }).otherwise(function(error) {
                that.state = Cesium3DTileContentState.FAILED;
                that._readyPromise.reject(error);
            });
            return true;
        }
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.initialize = function(arrayBuffer, byteOffset) {
        byteOffset = defaultValue(byteOffset, 0);

        var uint8Array = new Uint8Array(arrayBuffer);
        var magic = getMagic(uint8Array, byteOffset);
        if (magic !== 'pnts') {
            throw new DeveloperError('Invalid Points tile.  Expected magic=pnts.  Read magic=' + magic);
        }

        var view = new DataView(arrayBuffer);
        byteOffset += sizeOfUint32;  // Skip magic number

        //>>includeStart('debug', pragmas.debug);
        var version = view.getUint32(byteOffset, true);
        if (version !== 1) {
            throw new DeveloperError('Only Points tile version 1 is supported.  Version ' + version + ' is not.');
        }
        //>>includeEnd('debug');
        byteOffset += sizeOfUint32;

        // Skip byteLength
        byteOffset += sizeOfUint32;

        var pointsLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var batchTableJSONByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var batchTableBinaryByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var positions = new Float32Array(arrayBuffer, byteOffset, pointsLength * 3);
        byteOffset += pointsLength * 3 * sizeOfFloat32;

        var colors;
        var translucent = false;
        var hasConstantColor = false;

        if (batchTableJSONByteLength > 0) {
            // Get the batch table JSON
            var batchTableString = getStringFromTypedArray(uint8Array, byteOffset, batchTableJSONByteLength);
            var batchTableJSON = JSON.parse(batchTableString);
            byteOffset += batchTableJSONByteLength;

            // Get the batch table binary
            var batchTableBinary;
            if (batchTableBinaryByteLength > 0) {
                batchTableBinary = new Uint8Array(arrayBuffer, byteOffset, batchTableBinaryByteLength);
            }
            byteOffset += batchTableBinaryByteLength;

            // Get the point colors
            var tiles3DRGB = batchTableJSON.TILES3D_RGB;
            var tiles3DRGBA = batchTableJSON.TILES3D_RGBA;
            var tiles3DColor = batchTableJSON.TILES3D_COLOR;

            if (defined(tiles3DRGBA)) {
                colors = new Uint8Array(batchTableBinary, tiles3DRGBA.byteOffset, pointsLength * 4);
                translucent = true;
            } else if (defined(tiles3DRGB)) {
                colors = new Uint8Array(batchTableBinary, tiles3DRGB.byteOffset, pointsLength * 3);
            } else if (defined(tiles3DColor)) {
                this._constantColor = Color.fromBytes(tiles3DColor[0], tiles3DColor[1], tiles3DColor[2], tiles3DColor[3], this._constantColor);
                hasConstantColor = true;
            }
        }

        var hasColors = defined(colors);

        if (!hasColors && !hasConstantColor) {
            this._constantColor = Color.DARKGRAY;
        }

        var vs = 'attribute vec3 position3DHigh; \n' +
                 'attribute vec3 position3DLow; \n' +
                 'uniform float pointSize; \n';
        if (hasColors) {
            if (translucent) {
                vs += 'attribute vec4 color; \n' +
                      'varying vec4 v_color; \n';
            } else {
                vs += 'attribute vec3 color; \n' +
                      'varying vec3 v_color; \n';
            }
        }
        vs += 'void main() \n' +
              '{ \n' +
              '    gl_Position = czm_modelViewProjectionRelativeToEye * czm_computePosition(); \n' +
              '    gl_PointSize = pointSize; \n';
        if (hasColors) {
            vs += '    v_color = color; \n';
        }
        vs += '}';

        var fs = 'uniform vec4 highlightColor; \n';
        if (hasColors) {
            if (translucent) {
                fs += 'varying vec4 v_color; \n';
            } else {
                fs += 'varying vec3 v_color; \n';
            }
        }
        fs += 'void main() \n' +
              '{ \n';

        if (hasColors) {
            if (translucent) {
                fs += '    gl_FragColor = v_color * highlightColor; \n';
            } else {
                fs += '    gl_FragColor = vec4(v_color * highlightColor.rgb, highlightColor.a); \n';
            }
        } else {
            fs += '    gl_FragColor = highlightColor; \n';
        }

        fs += '} \n';

        // TODO: performance test with 'interleave : true'
        var instance = new GeometryInstance({
            geometry : new PointGeometry({
                positionsTypedArray : positions,
                colorsTypedArray : colors,
                boundingSphere : this.boundingSphere
            })
        });

        var appearance = new PointAppearance({
            highlightColor : this._constantColor,
            translucent : translucent,
            vertexShaderSource : vs,
            fragmentShaderSource : fs
        });

        var primitive = new Primitive({
            geometryInstances : instance,
            appearance : appearance,
            asynchronous : false,
            allowPicking : false,
            cull : false,
            rtcCenter : this.boundingSphere.center
        });

        this._primitive = primitive;
        this.state = Cesium3DTileContentState.PROCESSING;
        this._contentReadyToProcessPromise.resolve(this);

        var that = this;

        primitive.readyPromise.then(function(primitive) {
            that.state = Cesium3DTileContentState.READY;
            that._readyPromise.resolve(that);
        }).otherwise(function(error) {
            that.state = Cesium3DTileContentState.FAILED;
            that._readyPromise.reject(error);
        });
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
        color = enabled ? color : this._constantColor;
        this._primitive.appearance.uniforms.highlightColor = color;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.update = function(tileset, frameState) {
        // In the PROCESSING state we may be calling update() to move forward
        // the content's resource loading.  In the READY state, it will
        // actually generate commands.
        this._primitive.update(frameState);
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    Points3DTileContent.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        return destroyObject(this);
    };

    return Points3DTileContent;
});
