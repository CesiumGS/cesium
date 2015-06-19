/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/destroyObject',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/loadArrayBuffer',
        './Cesium3DTileContentState',
        './getMagic',
        './PointPrimitiveCollection',
        '../ThirdParty/when'
    ], function(
        Cartesian3,
        Color,
        destroyObject,
        defined,
        DeveloperError,
        loadArrayBuffer,
        Cesium3DTileContentState,
        getMagic,
        PointPrimitiveCollection,
        when) {
    "use strict";

    /**
     * @private
     */
    var Pnts3DTileContentProvider = function(url, contentHeader) {
        this._pointCollection = undefined;
        this._url = url;
        this._parsedData = undefined;

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

        this._debugColor = Color.fromRandom({ alpha : 1.0 });
        this._debugColorizeTiles = false;
    };

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    Pnts3DTileContentProvider.prototype.request = function() {
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

            // Skip padding so positions offset is 8-byte aligned for 64-bit doubles
            byteOffset += sizeOfUint32;

            var positionsOffsetInBytes = byteOffset;
            var positions = new Float64Array(arrayBuffer, positionsOffsetInBytes, numberOfPoints * 3);

            var colorsOffsetInBytes = positionsOffsetInBytes + (numberOfPoints * (3 * Float64Array.BYTES_PER_ELEMENT));
            var colors = new Uint8Array(arrayBuffer, colorsOffsetInBytes, numberOfPoints * 3);

            that._parsedData = {
                positions : positions,
                colors : colors
            };
            that.state = Cesium3DTileContentState.PROCESSING;
            that.processingPromise.resolve(that);
        }).otherwise(failRequest);
    };

    function applyDebugSettings(owner, content) {
        var points = content._pointCollection;
        var length = points.length;
        var i;

        if (owner.debugColorizeTiles && !content._debugColorizeTiles) {
            content._debugColorizeTiles = true;
            for (i = 0; i < length; ++i) {
                points.get(i).color = content._debugColor;
            }
        } else if (!owner.debugColorizeTiles && content._debugColorizeTiles) {
            content._debugColorizeTiles = false;
            for (i = 0; i < length; ++i) {
                points.get(i).color = Color.WHITE;
            }
        }
    }

    Pnts3DTileContentProvider.prototype.update = function(owner, context, frameState, commandList) {
        // In the PROCESSING state we may be calling update() to move forward
        // the content's resource loading.  In the READY state, it will
        // actually generate commands.

        var points = this._pointCollection;
        if (this.state === Cesium3DTileContentState.PROCESSING) {
            points = new PointPrimitiveCollection();

// TODO: fast path with custom primitive
            var positions = this._parsedData.positions;
            var colors = this._parsedData.colors;
            var length = positions.length;
            for (var i = 0; i < length; i += 3) {
                points.add({
                    color : Color.fromBytes(colors[i], colors[i + 1], colors[i + 2]),
                    position : new Cartesian3(positions[i], positions[i + 1], positions[i + 2])
                });
            }

            this._parsedData = undefined; // Release typed arrays
            this._pointCollection = points;
            this.state = Cesium3DTileContentState.READY;
            this.readyPromise.resolve(this);
            return;
        }

        applyDebugSettings(owner, this);

        points.update(context, frameState, commandList);
    };

    Pnts3DTileContentProvider.prototype.isDestroyed = function() {
        return false;
    };

    Pnts3DTileContentProvider.prototype.destroy = function() {
        this._pointCollection = this._pointCollection && this._pointCollection.destroy();

        return destroyObject(this);
    };

    return Pnts3DTileContentProvider;
});