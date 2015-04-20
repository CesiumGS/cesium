/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/getBasePath',
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
        getBasePath,
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

// TODO: replace this implementation with CzmlDataSource.

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

        this._debugColor = Cartesian4.fromColor(Color.fromRandom({ alpha : 1.0 }));
        this._debugColorizeTiles = false;
    };

    Cesium3DTileContentProvider.prototype.request = function() {
// TODO: allow this to not change the state depending on if the request is actually made, e.g., with RequestsByServer.
        this.state = Cesium3DTileContentState.LOADING;

        var that = this;
        loadJson(this._url).then(function(contents) {
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
                    when(model.readyPromise).then(function(model) {
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
    };

    function setMaterialDiffuse(content, color) {
        var primitives = content._primitives;
        var length = primitives.length;
        for (var i = 0; i < length; ++i) {
            var material = primitives.get(i).getMaterial('material_RoofColor');
            if (!defined(material)) {
//TODO: consistent material name
/*jshint debug: true*/
                debugger;
/*jshint debug: false*/
            }
            material.setValue('diffuse', color);
        }
    }

    function applyDebugSettings(owner, content) {
        if (content.state === Cesium3DTileContentState.READY) {
            if (owner.debugColorizeTiles && !content._debugColorizeTiles) {
                content._debugColorizeTiles = true;
                setMaterialDiffuse(content, content._debugColor);
            } else if (!owner.debugColorizeTiles && content._debugColorizeTiles) {
                content._debugColorizeTiles = false;
                setMaterialDiffuse(content, Cartesian4.fromColor(Color.WHITE));
            }
        }
    }

    Cesium3DTileContentProvider.prototype.update = function(owner, context, frameState, commandList) {
        // In the LOADED state we may be calling update() to move forward
        // the content's resource loading.  In the READY state, it will
        // actually generate commands.

        applyDebugSettings(owner, this);
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