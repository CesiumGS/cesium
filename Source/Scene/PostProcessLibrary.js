define([
        '../Core/buildModuleUrl',
        '../Core/defineProperties',
        '../Core/destroyObject',
        './PostProcess',
        './PostProcessBlurStage',
        './PostProcessDepthOfFieldStage',
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
        PostProcessBlurStage,
        PostProcessDepthOfFieldStage,
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
         * @private
         */
        blur : {
            get : function() {
                return createBlur();
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
            name : 'czm_black_and_white',
            fragmentShader : BlackAndWhite,
            uniformValues : {
                gradations : 5.0
            }
        });
    }

    function createBrightnessStage() {
        return new PostProcess({
            name : 'czm_brightness',
            fragmentShader : Brightness,
            uniformValues : {
                brightness : 0.5
            }
        });
    }

    function createEightBitStage() {
        return new PostProcess({
            name : 'czm_eight_bit',
            fragmentShader : EightBit
        });
    }

    function createNightVisionStage() {
        return new PostProcess({
            name : 'czm_night_vision',
            fragmentShader : NightVision
        });
    }

    function createTextureOverlayStage() {
        // not supplying a name means more than one effect can be added
        return new PostProcess({
            fragmentShader : TextureOverlay,
            uniformValues : {
                alpha : 0.5,
                // data uri for a 1x1 white canvas
                texture : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2P4////fwAJ+wP9BUNFygAAAABJRU5ErkJggg=='
            }
        });
    }

    function createDepthViewStage() {
        return new PostProcess({
            name : 'czm_depth_view',
            fragmentShader : DepthView
        });
    }

    function createLensFlareStage() {
        return new PostProcess({
            name : 'czm_lens_flare',
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

    function createBlur() {
        return new PostProcessBlurStage();
    }

    function createSilhouetteStage() {
        return new PostProcessSilhouetteStage();
    }

    return PostProcessLibrary;
});
