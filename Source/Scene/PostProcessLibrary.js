define([
        '../Core/buildModuleUrl',
        '../Core/defineProperties',
        '../Core/destroyObject',
        './PostProcess',
        './PostProcessDepthOfFieldStage',
        './PostProcessBloomStage',
        './PostProcessSilhouetteStage',
        '../Shaders/PostProcessFilters/BlackAndWhite',
        '../Shaders/PostProcessFilters/Brightness',
        '../Shaders/PostProcessFilters/DepthView',
        '../Shaders/PostProcessFilters/EightBit',
        '../Shaders/PostProcessFilters/LensFlare',
        '../Shaders/PostProcessFilters/NightVision',
        '../Shaders/PostProcessFilters/TextureOverlay'
    ], function(
        buildModuleUrl,
        defineProperties,
        destroyObject,
        PostProcess,
        PostProcessDepthOfFieldStage,
        PostProcessBloomStage,
        PostProcessSilhouetteStage,
        BlackAndWhite,
        Brightness,
        DepthView,
        EightBit,
        LensFlare,
        NightVision,
        TextureOverlay) {
    'use strict';

    function PostProcessLibrary() {
    }

    defineProperties(PostProcessLibrary, {
        /**
         * Renders in black and white gradations.
         *
         * @memberof PostProcessLibrary
         *
         * @type {PostProcess}
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
         * @type {PostProcess}
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
         * @type {PostProcess}
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
         * @type {PostProcess}
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
         * @type {PostProcess}
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
        depthView : {
            get : function() {
                return createDepthViewStage();
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
         * @private
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
         * @type {PostProcess}
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
        return new PostProcess({
            fragmentShader : BlackAndWhite,
            uniformValues : {
                gradations : 5.0
            }
        });
    }

    function createBrightnessStage() {
        return new PostProcess({
            fragmentShader : Brightness,
            uniformValues : {
                brightness : 0.5
            }
        });
    }

    function createEightBitStage() {
        return new PostProcess({
            fragmentShader : EightBit
        });
    }

    function createNightVisionStage() {
        return new PostProcess({
            fragmentShader : NightVision
        });
    }

    function createTextureOverlayStage() {
        return new PostProcess({
            fragmentShader : TextureOverlay,
            uniformValues : {
                alpha : 0.5,
                texture : buildModuleUrl('Assets/Textures/moonSmall.jpg')
            }
        });
    }

    function createDepthViewStage() {
        return new PostProcess({
            fragmentShader : DepthView
        });
    }

    function createLensFlareStage() {
        return new PostProcess({
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
