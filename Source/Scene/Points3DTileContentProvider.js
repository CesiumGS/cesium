/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/destroyObject',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/GeometryInstance',
        '../Core/loadArrayBuffer',
        '../Core/PointGeometry',
        './Cesium3DTileContentState',
        './getMagic',
        './PointAppearance',
        './Primitive',
        '../ThirdParty/when'
    ], function(
        Cartesian3,
        Color,
        destroyObject,
        defined,
        DeveloperError,
        GeometryInstance,
        loadArrayBuffer,
        PointGeometry,
        Cesium3DTileContentState,
        getMagic,
        PointAppearance,
        Primitive,
        when) {
    "use strict";

    /**
     * @private
     */
    var PointsDTileContentProvider = function(tileset, url, contentHeader) {
        this._primitive = undefined;
        this._url = url;

        /**
         * @readonly
         */
        this.state = Cesium3DTileContentState.UNLOADED;

        /**
         * @type {Promise}
         */
        this.processingPromise = when.defer();

        /**
         * @type {Promise}
         */
        this.readyPromise = when.defer();

        this.boundingSphere = contentHeader.boundingSphere;

        this._debugColor = Color.fromRandom({ alpha : 1.0 });
        this._debugColorizeTiles = false;
    };

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    PointsDTileContentProvider.prototype.request = function() {
        var that = this;

        this.state = Cesium3DTileContentState.LOADING;

        function failRequest(error) {
            that.state = Cesium3DTileContentState.FAILED;
            that.readyPromise.reject(error);
        }

        loadArrayBuffer(this._url).then(function(arrayBuffer) {
            var magic = getMagic(arrayBuffer);
            if (magic !== 'pnts') {
                throw new DeveloperError('Invalid Points tile.  Expected magic=pnts.  Read magic=' + magic);
            }

            var view = new DataView(arrayBuffer);
            var byteOffset = 0;

            byteOffset += sizeOfUint32;  // Skip magic number

            //>>includeStart('debug', pragmas.debug);
            var version = view.getUint32(byteOffset, true);
            if (version !== 1) {
                throw new DeveloperError('Only Points tile version 1 is supported.  Version ' + version + ' is not.');
            }
            //>>includeEnd('debug');
            byteOffset += sizeOfUint32;

            var numberOfPoints = view.getUint32(byteOffset, true);
            byteOffset += sizeOfUint32;

            // Skip padding so positions offset is 4-byte aligned for 32-bit floats
            byteOffset += sizeOfUint32;

            var positionsOffsetInBytes = byteOffset;
            var positions = new Float32Array(arrayBuffer, positionsOffsetInBytes, numberOfPoints * 3);

            var colorsOffsetInBytes = positionsOffsetInBytes + (numberOfPoints * (3 * Float32Array.BYTES_PER_ELEMENT));
            var colors = new Uint8Array(arrayBuffer, colorsOffsetInBytes, numberOfPoints * 3);

            // TODO: use custom load pipeline, e.g., RTC, scene3DOnly?
            // TODO: performance test with 'interleave : true'
            var instance = new GeometryInstance({
                geometry : new PointGeometry({
                    positionsTypedArray : positions,
                    colorsTypedArray: colors,
                    boundingSphere: that.boundingSphere
                })
            });
            var primitive = new Primitive({
                geometryInstances : instance,
                appearance : new PointAppearance(),
                asynchronous : false,
                allowPicking : false,
                cull : false,
                relativeToCenter : that.boundingSphere.center
            });

            that._primitive = primitive;
            that.state = Cesium3DTileContentState.PROCESSING;
            that.processingPromise.resolve(that);

            when(primitive.readyPromise).then(function(primitive) {
                that.state = Cesium3DTileContentState.READY;
                that.readyPromise.resolve(that);
            }).otherwise(failRequest);
        }).otherwise(failRequest);
    };

    function applyDebugSettings(owner, content) {
        if (owner.debugColorizeTiles && !content._debugColorizeTiles) {
            content._debugColorizeTiles = true;
            content._primitive.appearance.uniforms.highlightColor = content._debugColor;
        } else if (!owner.debugColorizeTiles && content._debugColorizeTiles) {
            content._debugColorizeTiles = false;
            content._primitive.appearance.uniforms.highlightColor = Color.WHITE;
        }
    }

    PointsDTileContentProvider.prototype.update = function(owner, context, frameState, commandList) {
        // In the PROCESSING state we may be calling update() to move forward
        // the content's resource loading.  In the READY state, it will
        // actually generate commands.

        applyDebugSettings(owner, this);

        this._primitive.update(context, frameState, commandList);
    };

    PointsDTileContentProvider.prototype.isDestroyed = function() {
        return false;
    };

    PointsDTileContentProvider.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();

        return destroyObject(this);
    };

    return PointsDTileContentProvider;
});
