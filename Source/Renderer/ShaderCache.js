/*global define*/
define([
        '../Core/defined',
        '../Core/destroyObject',
        './ShaderProgram',
        './ShaderSource'
    ], function(
        defined,
        destroyObject,
        ShaderProgram,
        ShaderSource) {
    "use strict";

    /**
     * @private
     */
    var ShaderCache = function(context) {
        this._context = context;
        this._shaders = {};
        this._shadersToRelease = {};
    };

    /**
     * Returns a shader program from the cache, or creates and caches a new shader program,
     * given the GLSL vertex and fragment shader source and attribute locations.
     * <p>
     * The difference between this and {@link ShaderCache#getShaderProgram}, is this is used to
     * replace an existing reference to a shader program, which is passed as the first argument.
     * </p>
     *
     * @param {ShaderProgram} shaderProgram The shader program that is being reassigned.  This can be <code>undefined</code>.
     * @param {String|ShaderSource} vertexShaderSource The GLSL source for the vertex shader.
     * @param {String|ShaderSource} fragmentShaderSource The GLSL source for the fragment shader.
     * @param {Object} attributeLocations Indices for the attribute inputs to the vertex shader.
     * @returns {ShaderProgram} The cached or newly created shader program.
     *
     * @see ShaderCache#getShaderProgram
     *
     * @example
     * this._shaderProgram = context.shaderCache.replaceShaderProgram(this._shaderProgram, vs, fs, attributeLocations);
     */
    ShaderCache.prototype.replaceShaderProgram = function(shaderProgram, vertexShaderSource, fragmentShaderSource, attributeLocations) {
        if (defined(shaderProgram)) {
            shaderProgram.destroy();
        }

        return this.getShaderProgram(vertexShaderSource, fragmentShaderSource, attributeLocations);
    };

    /**
     * Returns a shader program from the cache, or creates and caches a new shader program,
     * given the GLSL vertex and fragment shader source and attribute locations.
     *
     * @param {String|ShaderSource} vertexShaderSource The GLSL source for the vertex shader.
     * @param {String|ShaderSource} fragmentShaderSource The GLSL source for the fragment shader.
     * @param {Object} attributeLocations Indices for the attribute inputs to the vertex shader.
     *
     * @returns {ShaderProgram} The cached or newly created shader program.
     */
    ShaderCache.prototype.getShaderProgram = function(vertexShaderSource, fragmentShaderSource, attributeLocations) {
        // convert shaders which are provided as strings into ShaderSource objects
        // because ShaderSource handles all the automatic including of built-in functions, etc.

        if (typeof vertexShaderSource === 'string') {
            vertexShaderSource = new ShaderSource({
                sources : [vertexShaderSource]
            });
        }

        if (typeof fragmentShaderSource === 'string') {
            fragmentShaderSource = new ShaderSource({
                sources : [fragmentShaderSource]
            });
        }

        var vertexShaderText = vertexShaderSource.createCombinedVertexShader();
        var fragmentShaderText = fragmentShaderSource.createCombinedFragmentShader();

        var keyword = vertexShaderText + fragmentShaderText + JSON.stringify(attributeLocations);
        var cachedShader;

        if (this._shaders[keyword]) {
            cachedShader = this._shaders[keyword];

            // No longer want to release this if it was previously released.
            delete this._shadersToRelease[keyword];
        } else {
            var context = this._context;
            var shaderProgram = new ShaderProgram({
                gl : context._gl,
                logShaderCompilation : context.logShaderCompilation,
                debugShaders : context.debugShaders,
                vertexShaderSource : vertexShaderSource,
                vertexShaderText : vertexShaderText,
                fragmentShaderSource : fragmentShaderSource,
                fragmentShaderText : fragmentShaderText,
                attributeLocations : attributeLocations
            });

            cachedShader = {
                cache : this,
                shaderProgram : shaderProgram,
                keyword : keyword,
                count : 0
            };

            // A shader can't be in more than one cache.
            shaderProgram._cachedShader = cachedShader;
            this._shaders[keyword] = cachedShader;
        }

        ++cachedShader.count;
        return cachedShader.shaderProgram;
    };

    ShaderCache.prototype.destroyReleasedShaderPrograms = function() {
        var shadersToRelease = this._shadersToRelease;

        for ( var keyword in shadersToRelease) {
            if (shadersToRelease.hasOwnProperty(keyword)) {
                var cachedShader = shadersToRelease[keyword];
                delete this._shaders[cachedShader.keyword];
                cachedShader.shaderProgram.finalDestroy();
            }
        }

        this._shadersToRelease = {};
    };

    ShaderCache.prototype.releaseShaderProgram = function(shaderProgram) {
        if (shaderProgram) {
            var cachedShader = shaderProgram._cachedShader;
            if (cachedShader && (--cachedShader.count === 0)) {
                this._shadersToRelease[cachedShader.keyword] = cachedShader;
            }
        }
    };

    ShaderCache.prototype.isDestroyed = function() {
        return false;
    };

    ShaderCache.prototype.destroy = function() {
        var shaders = this._shaders;

        for ( var keyword in shaders) {
            if (shaders.hasOwnProperty(keyword)) {
                shaders[keyword].shaderProgram.finalDestroy();
            }
        }

        return destroyObject(this);
    };

    return ShaderCache;
});