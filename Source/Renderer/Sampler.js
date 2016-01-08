/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        './TextureMagnificationFilter',
        './TextureMinificationFilter',
        './TextureWrap'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap) {
    "use strict";

    /**
     * @private
     */
    function Sampler(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var wrapS = defaultValue(options.wrapS, TextureWrap.CLAMP_TO_EDGE);
        var wrapT = defaultValue(options.wrapT, TextureWrap.CLAMP_TO_EDGE);
        var minificationFilter = defaultValue(options.minificationFilter, TextureMinificationFilter.LINEAR);
        var magnificationFilter = defaultValue(options.magnificationFilter, TextureMagnificationFilter.LINEAR);
        var maximumAnisotropy = (defined(options.maximumAnisotropy)) ? options.maximumAnisotropy : 1.0;

        //>>includeStart('debug', pragmas.debug);
        if (!TextureWrap.validate(wrapS)) {
            throw new DeveloperError('Invalid sampler.wrapS.');
        }

        if (!TextureWrap.validate(wrapT)) {
            throw new DeveloperError('Invalid sampler.wrapT.');
        }

        if (!TextureMinificationFilter.validate(minificationFilter)) {
            throw new DeveloperError('Invalid sampler.minificationFilter.');
        }

        if (!TextureMagnificationFilter.validate(magnificationFilter)) {
            throw new DeveloperError('Invalid sampler.magnificationFilter.');
        }

        if (maximumAnisotropy < 1.0) {
            throw new DeveloperError('sampler.maximumAnisotropy must be greater than or equal to one.');
        }
        //>>includeEnd('debug');

        this._wrapS = wrapS;
        this._wrapT = wrapT;
        this._minificationFilter = minificationFilter;
        this._magnificationFilter = magnificationFilter;
        this._maximumAnisotropy = maximumAnisotropy;
    }

    defineProperties(Sampler.prototype, {
        wrapS : {
            get : function() {
                return this._wrapS;
            }
        },
        wrapT : {
            get : function() {
                return this._wrapT;
            }
        },
        minificationFilter : {
            get : function() {
                return this._minificationFilter;
            }
        },
        magnificationFilter : {
            get : function() {
                return this._magnificationFilter;
            }
        },
        maximumAnisotropy : {
            get : function() {
                return this._maximumAnisotropy;
            }
        }
    });

    return Sampler;
});
