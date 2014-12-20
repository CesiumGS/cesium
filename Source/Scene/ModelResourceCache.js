/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/defaultValue',
        '../Core/LinearSpline',
        '../Core/Quaternion',
        '../Core/QuaternionSpline',
        './getModelAccessor'
    ], function(
        Cartesian3,
        defined,
        defaultValue,
        LinearSpline,
        Quaternion,
        QuaternionSpline,
        getModelAccessor) {
    "use strict";
    /*global WebGLRenderingContext*/


    var ModelResourceCache = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._modelList = [];
    };

    ModelResourceCache.prototype.putModel = function(modelResources, url) {
		this._modelList.push({
			url:url,
			modelResources:modelResources
		});
	};
	
    ModelResourceCache.prototype.getModel = function(url) {
        
		var arrayLength = this._modelList.length;
		for (var i = 0; i < arrayLength; i++) {
			if (this._modelList[i].url === url)
			{
				return this._modelList[i].modelResources;
			}
		}

		return undefined;
    };

    ModelResourceCache.prototype.getNumberOfCachedModels = function() {
		return this._modelList.length;
	};
	
    
    return ModelResourceCache;

});
