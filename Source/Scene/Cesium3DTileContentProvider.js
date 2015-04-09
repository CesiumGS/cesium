/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/loadJson',
        '../Core/Transforms',
        './Cesium3DTileContentState',
        './Model',
        './PrimitiveCollection',
        '../ThirdParty/when'
    ], function(
        Cartesian3,
        Cartesian4,
        Color,
        defined,
        destroyObject,
        loadJson,
        Transforms,
        Cesium3DTileContentState,
        Model,
        PrimitiveCollection,
        when) {
    "use strict";

// TODO: Decouple this into an interface and separate implementations.  Potential content providers include:
// * glTF
// * Instanced glTF, e.g., for trees
// * Point Clouds: pure binary or in glTF
// * CZML, preferably with a binary payload

    /**
     * @private
     */
    var Cesium3DTileContentProvider = function(url) {
        this._primitives = undefined;
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
    };

    Cesium3DTileContentProvider.prototype.request = function() {
        if (this.state !== Cesium3DTileContentState.UNLOADED) {
            return false;
        }
        this.state = Cesium3DTileContentState.LOADING;

        var that = this;
        loadJson(this._url).then(function(contents) {
            var debugColor = Cartesian4.fromColor(Color.fromRandom({ alpha : 1.0 }));
            var primitives = new PrimitiveCollection();

// TODO: this assumes A LOT about the CZML.
            var length = contents.length;
            var pendingModelLoads = length - 3;

            for (var i = 0; i < length; ++i) {
                var obj = contents[i];
                if (defined(obj.model)) {
                    var p = obj.position.cartographicRadians;
                    var origin = Cartesian3.fromRadians(p[0], p[1], p[2]);
                    var modelMatrix = Transforms.eastNorthUpToFixedFrame(origin);

                    var model = primitives.add(Model.fromGltf({
                        url : getBasePath(that._url) + obj.model.gltf,
                        modelMatrix : modelMatrix,
                        cull : false
// TODO: disable glTF caching
                    }));

// TODO: for debugging only
                    /*jshint loopfunc: true */
                    /*jshint debug: true*/
                    when(model.readyPromise).then(function(model) {
                        var material = model.getMaterial('material_RoofColor');
                        if (!defined(material)) {
                            debugger;
                        }
                        material.setValue('diffuse', debugColor);

                        if (--pendingModelLoads === 0) {
                            that.state = Cesium3DTileContentState.READY;
                            that.readyPromise.resolve(that);
                        }
                    });
                }
            }

            that._primitives = primitives;
            that.state = Cesium3DTileContentState.PROCESSING;
            that.processingPromise.resolve(that);
        }).otherwise(function(error) {
            that.state = Cesium3DTileContentState.FAILED;
            that.processingPromise.reject(error);
        });

        return true;
    };

// TODO: duplicate in Model.js.  We should not need this once we have Model batching.
    function getBasePath(url) {
        var basePath = '';
        var i = url.lastIndexOf('/');
        if (i !== -1) {
            basePath = url.substring(0, i + 1);
        }

        return basePath;
    }

    Cesium3DTileContentProvider.prototype.update = function(context, frameState, commandList) {
        // In the LOADED state we may be calling update() to move forward
        // the content's resource loading.  In the READY state, it will
        // actually generate commands.

        this._primitives.update(context, frameState, commandList);
    };

    Cesium3DTileContentProvider.prototype.isDestroyed = function() {
        return false;
    };

    Cesium3DTileContentProvider.prototype.destroy = function() {
        this._primitives = this._primitives && this._primitives.destroy();
        return destroyObject(this);
    };

    return Cesium3DTileContentProvider;
});