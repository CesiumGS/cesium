define([
    './createTileMapServiceImageryProvider',
    './ComposerAssetType',
    './ComposerExternalImageryType',
    './Cesium3DTileset',
    '../Core/loadJson',
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
    CesiumTerrainProvider,
    CzmlDataSource,
    Entity,
    KmlDataSource) {
    'use strict';

    /**
     *
     * @param assetId
     * @param token
     * @param {Object} options
     * @return {*}
     */
    function createComposerAsset(assetId, token, options) {
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
                    return ComposerExternalImageryType.getProvider(metadata.externalType, metadata.externalConfiguration);
                } else if (type === ComposerAssetType.TERRAIN) {
                    return new CesiumTerrainProvider({
                        url : metadata.url,
                        requestWaterMask : true,
                        requestVertexNormals : true
                    });
                }
            });
    }

    return createComposerAsset;
});
