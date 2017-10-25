define([
        '../Core/buildModuleUrl',
        '../Core/defineProperties',
        '../Core/destroyObject',
        './PostProcess',
        './PostProcessAmbientOcclusionStage',
        './PostProcessDepthOfFieldStage',
        './PostProcessBloomStage',
        './PostProcessSilhouetteStage',
        './PostProcessStage',
        '../Shaders/PostProcessFilters/BlackAndWhite',
        '../Shaders/PostProcessFilters/Brightness',
        '../Shaders/PostProcessFilters/DepthView',
        '../Shaders/PostProcessFilters/EightBit',
        '../Shaders/PostProcessFilters/FXAA',
        '../Shaders/PostProcessFilters/LensFlare',
        '../Shaders/PostProcessFilters/NightVision',
        '../Shaders/PostProcessFilters/TextureOverlay',
        '../ThirdParty/Shaders/FXAA3_11'
    ], function(
        buildModuleUrl,
        defineProperties,
        destroyObject,
        PostProcess,
        PostProcessAmbientOcclusionStage,
        PostProcessDepthOfFieldStage,
        PostProcessBloomStage,
        PostProcessSilhouetteStage,
        PostProcessStage,
        BlackAndWhite,
        Brightness,
        DepthView,
        EightBit,
        FXAAFS,
        LensFlare,
        NightVision,
        TextureOverlay,
        FXAA3_11) {
    'use strict';

    function PostProcessLibrary() {
    }

    defineProperties(PostProcessLibrary, {
        /**
         * Renders in black and white gradations.
         *
         * @memberof PostProcessLibrary
         *
         * @type {PostProcessStage}
         * @readonly
         */
        blackAndWhite : {
            get : function() {
                return createBlackAndWhiteStage();
            }
        },
        /**
         * Control the brightness of the render.
         *
         * @memberof PostProcessLibrary
         *
         * @type {PostProcessStage}
         * @readonly
         */
        brightness : {
            get : function() {
                return createBrightnessStage();
            }
        },
        /**
         * Render in a pixelated eight-bit style.
         *
         * @memberof PostProcessLibrary
         *
         * @type {PostProcessStage}
         * @readonly
         */
        eightBit : {
            get : function() {
                return createEightBitStage();
            }
        },
        /**
         * Render with a night vision effect.
         *
         * @memberof PostProcessLibrary
         *
         * @type {PostProcessStage}
         * @readonly
         */
        nightVision : {
            get : function() {
                return createNightVisionStage();
            }
        },
        /**
         * Overlay a texture above the render.
         *
         * @memberof PostProcessLibrary
         *
         * @type {PostProcessStage}
         * @readonly
         */
        textureOverlay : {
            get : function() {
                return createTextureOverlayStage();
            }
        },
        /**
         * @private
         */
        fxaa : {
            get : function() {
                return createFxaaStage();
            }
        },

        /**
         * @private
         */
        depthView : {
            get : function() {
                return createDepthViewStage();
            }
        },

        /**
         * private
         */
        ambientOcclusion : {
            get : function() {
                return createAmbientOcclusionStage();
            }
        },

        /**
         * private
         */
        depthOfField : {
            get : function() {
                return createDepthOfFieldStage();
            }
        },

        /**
         * private
         */
        bloom : {
            get : function() {
                return createBloomStage();
            }
        },
        /**
         * lensFlare.
         *
         * @memberof PostProcessLibrary
         *
         * @type {PostProcessStage}
         * @readonly
         */
        lensFlare : {
            get : function() {
                return createLensFlareStage();
            }
        },
        /**
         * private
         */
        silhouette : {
            get : function() {
                return createSilhouetteStage();
            }
        }
    });

    function createBlackAndWhiteStage() {
        return new PostProcessStage({
            fragmentShader : BlackAndWhite,
            uniformValues : {
                gradations : 5.0
            }
        });
    }

    function createBrightnessStage() {
        return new PostProcessStage({
            fragmentShader : Brightness,
            uniformValues : {
                brightness : 0.5
            }
        });
    }

    function createEightBitStage() {
        return new PostProcessStage({
            fragmentShader : EightBit
        });
    }

    function createNightVisionStage() {
        return new PostProcessStage({
            fragmentShader : NightVision
        });
    }

    function createTextureOverlayStage() {
        return new PostProcessStage({
            fragmentShader : TextureOverlay,
            uniformValues : {
                alpha : 0.5,
                texture : buildModuleUrl('Assets/Textures/moonSmall.jpg')
            }
        });
    }

    function createFxaaStage() {
        var fragmentShader =
            '#define FXAA_QUALITY_PRESET 39 \n' +
            FXAA3_11 + '\n' +
            FXAAFS;
        return new PostProcessStage({
            fragmentShader : fragmentShader
        });
    }

    function createDepthViewStage() {
        return new PostProcessStage({
            fragmentShader : DepthView
        });
    }

    function createLensFlareStage() {
        return new PostProcessStage({
            fragmentShader: LensFlare,
            uniformValues: {
                dirtTexture: buildModuleUrl('Assets/Textures/LensFlare/DirtMask.jpg'),
                starTexture: buildModuleUrl('Assets/Textures/LensFlare/StarBurst.jpg'),
                intensity: 2.0,
                distortion: 5.0,
                ghostDispersal: 0.4,
                haloWidth: 0.4,
                earthRadius: 0.0
            }
        });
    }

    function createAmbientOcclusionStage() {
        return new PostProcessAmbientOcclusionStage();
    }

    function createDepthOfFieldStage() {
        return new PostProcessDepthOfFieldStage();
    }

    function createBloomStage() {
        return new PostProcessBloomStage();
    }

    function createSilhouetteStage() {
        return new PostProcessSilhouetteStage();
    }

    return PostProcessLibrary;
});
