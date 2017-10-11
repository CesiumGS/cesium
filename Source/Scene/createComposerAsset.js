define([
    './createTileMapServiceImageryProvider',
    './ComposerAssetType',
    './ComposerExternalImageryType',
    './Cesium3DTileset',
    '../Core/loadJson',
    '../Core/Check',
    '../Core/ComposerApi',
    '../Core/CesiumTerrainProvider',
    '../DataSources/CzmlDataSource',
    '../DataSources/Entity',
    '../DataSources/KmlDataSource'
], function(
    createTileMapServiceImageryProvider,
    ComposerAssetType,
    ComposerExternalImageryType,
    Cesium3DTileset,
    loadJson,
    Check,
    ComposerApi,
    CesiumTerrainProvider,
    CzmlDataSource,
    Entity,
    KmlDataSource) {
    'use strict';

    /**
     * Returns a promise to an cesium.com asset from the asset id
     * @param {Number} assetId The cesium.com asset id
     * @param {String} token The access token for the asset
     * @param {Object} [options] Additional options for the asset
     * @return {Promise<*>} A promise to the asset
     */
    function createComposerAsset(assetId, token, options) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('assetId', assetId);
        //>>includeEnd('debug');

        token = ComposerApi.getToken(token);
        return loadJson('beta.cesium.com/api/assets/' + assetId + '?access_token=' + token)
            .then(function(metadata) {
                var type = metadata.type;
                if (type === ComposerAssetType.MODEL) {
                    return new Entity({
                        name : metadata.name,
                        description : metadata.description,
                        position : options.position,
                        orientation : options.orientation,
                        model : {
                            uri : metadata.url,
                            show : options.show,
                            scale : options.scale,
                            minimumPixelSize : options.minimumPixelSize,
                            maximumScale : options.maximumScale,
                            incrementallyLoadTextures : options.incrementallyLoadTextures,
                            shadows : options.shadows,
                            runAnimations : options.runAnimations,
                            heightReference : options.heightReference,
                            distanceDisplayCondition : options.distanceDisplayCondition,
                            silhouetteColor : options.silhouetteColor,
                            silhouetteSize : options.silhouetteSize,
                            color : options.color,
                            colorBlendMode : options.colorBlendMode,
                            colorBlendAmount : options.colorBlendAmount
                        }
                    });
                } else if (type === ComposerAssetType['3DTILES']) {
                    if (metadata.isExternal) {
                        metadata = metadata.externalConfiguration;
                    }
                    return new Cesium3DTileset(metadata);
                } else if (type === ComposerAssetType.CZML) {
                    return CzmlDataSource.load(metadata.url);
                } else if (type === ComposerAssetType.KML) {
                    return KmlDataSource.load(metadata.url, {
                        camera : options.scene.camera,
                        canvas : options.scene.canvas,
                        clampToGround : true
                    });
                } else if (type === ComposerAssetType.IMAGERY) {
                    if (!metadata.isExternal) {
                        return createTileMapServiceImageryProvider(metadata);
                    }
                    return ComposerExternalImageryType.getProvider(metadata.externalConfiguration);
                } else if (type === ComposerAssetType.TERRAIN) {
                    return new CesiumTerrainProvider({
                        url : metadata.isExternal ? metadata.externalConfiguration.url : metadata.url,
                        requestWaterMask : true,
                        requestVertexNormals : true
                    });
                }
            });
    }

    return createComposerAsset;
});
