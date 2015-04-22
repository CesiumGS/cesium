/*global define*/
define([
        '../Core/Cartesian4',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        './Cesium3DTileContentState',
        './Model',
        '../ThirdParty/when'
    ], function(
        Cartesian4,
        Color,
        defined,
        destroyObject,
        Cesium3DTileContentState,
        Model,
        when) {
    "use strict";

    /**
     * @private
     */
    var Gltf3DTileContentProvider = function(url) {
        this._model = undefined;
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

    Gltf3DTileContentProvider.prototype.request = function() {
        var model = Model.fromGltf({
            url : this._url,
            cull : false
//TODO: disable glTF caching
        });

        var that = this;
        when(model.readyPromise).then(function(model) {
            that.state = Cesium3DTileContentState.READY;
            that.readyPromise.resolve(that);
        }).otherwise(function(error) {
            that.state = Cesium3DTileContentState.FAILED;
            that.readyPromise.reject(error);
        });

        this._model = model;
// TODO: allow this to not change the state depending on if the request is actually made, e.g., with RequestsByServer.
        this.state = Cesium3DTileContentState.PROCESSING;
        this.processingPromise.resolve(that);
    };

    function setMaterialDiffuse(content, color) {
        var material = content._model.getMaterial('material_RoofColor');
        if (!defined(material)) {
//TODO: consistent material name
/*jshint debug: true*/
            debugger;
/*jshint debug: false*/
        }
        material.setValue('diffuse', color);
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

    Gltf3DTileContentProvider.prototype.update = function(owner, context, frameState, commandList) {
        // In the LOADED state we may be calling update() to move forward
        // the content's resource loading.  In the READY state, it will
        // actually generate commands.

        applyDebugSettings(owner, this);
        this._model.update(context, frameState, commandList);
    };

    Gltf3DTileContentProvider.prototype.isDestroyed = function() {
        return false;
    };

    Gltf3DTileContentProvider.prototype.destroy = function() {
        this._model = this._model && this._model.destroy();
        return destroyObject(this);
    };

    return Gltf3DTileContentProvider;
});