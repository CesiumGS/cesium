import Check from '../Core/Check.js';
import defaultValue from '../Core/defaultValue.js';
import defined from '../Core/defined.js';
import defineProperties from '../Core/defineProperties.js';
import destroyObject from '../Core/destroyObject.js';
import DeveloperError from '../Core/DeveloperError.js';
import RuntimeError from '../Core/RuntimeError.js';
import AutomaticUniforms from './AutomaticUniforms.js';
import ContextLimits from './ContextLimits.js';
import createUniform from './createUniform.js';
import createUniformArray from './createUniformArray.js';

    var nextShaderProgramId = 0;

    /**
     * @private
     */
    function ShaderProgram(options) {
        var modifiedFS = handleUniformPrecisionMismatches(options.vertexShaderText, options.fragmentShaderText);

        this._gl = options.gl;
        this._logShaderCompilation = options.logShaderCompilation;
        this._debugShaders = options.debugShaders;
        this._attributeLocations = options.attributeLocations;

        this._program = undefined;
        this._numberOfVertexAttributes = undefined;
        this._vertexAttributes = undefined;
        this._uniformsByName = undefined;
        this._uniforms = undefined;
        this._automaticUniforms = undefined;
        this._manualUniforms = undefined;
        this._duplicateUniformNames = modifiedFS.duplicateUniformNames;
        this._cachedShader = undefined; // Used by ShaderCache

        /**
         * @private
         */
        this.maximumTextureUnitIndex = undefined;

        this._vertexShaderSource = options.vertexShaderSource;
        this._vertexShaderText = options.vertexShaderText;
        this._fragmentShaderSource = options.fragmentShaderSource;
        this._fragmentShaderText = modifiedFS.fragmentShaderText;

        /**
         * @private
         */
        this.id = nextShaderProgramId++;
    }

    ShaderProgram.fromCache = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        Check.defined('options.context', options.context);
        //>>includeEnd('debug');

        return options.context.shaderCache.getShaderProgram(options);
    };

    ShaderProgram.replaceCache = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        Check.defined('options.context', options.context);
        //>>includeEnd('debug');

        return options.context.shaderCache.replaceShaderProgram(options);
    };

    defineProperties(ShaderProgram.prototype, {
        /**
         * GLSL source for the shader program's vertex shader.
         * @memberof ShaderProgram.prototype
         *
         * @type {ShaderSource}
         * @readonly
         */
        vertexShaderSource : {
            get : function() {
                return this._vertexShaderSource;
            }
        },
        /**
         * GLSL source for the shader program's fragment shader.
         * @memberof ShaderProgram.prototype
         *
         * @type {ShaderSource}
         * @readonly
         */
        fragmentShaderSource : {
            get : function() {
                return this._fragmentShaderSource;
            }
        },
        vertexAttributes : {
            get : function() {
                initialize(this);
                return this._vertexAttributes;
            }
        },
        numberOfVertexAttributes : {
            get : function() {
                initialize(this);
                return this._numberOfVertexAttributes;
            }
        },
        allUniforms : {
            get : function() {
                initialize(this);
                return this._uniformsByName;
            }
        }
    });

    function extractUniforms(shaderText) {
        var uniformNames = [];
        var uniformLines = shaderText.match(/uniform.*?(?![^{]*})(?=[=\[;])/g);
        if (defined(uniformLines)) {
            var len = uniformLines.length;
            for (var i = 0; i < len; i++) {
                var line = uniformLines[i].trim();
                var name = line.slice(line.lastIndexOf(' ') + 1);
                uniformNames.push(name);
            }
        }
        return uniformNames;
    }

    function handleUniformPrecisionMismatches(vertexShaderText, fragmentShaderText) {
        // If a uniform exists in both the vertex and fragment shader but with different precision qualifiers,
        // give the fragment shader uniform a different name. This fixes shader compilation errors on devices
        // that only support mediump in the fragment shader.
        var duplicateUniformNames = {};

        if (!ContextLimits.highpFloatSupported || !ContextLimits.highpIntSupported) {
            var i, j;
            var uniformName;
            var duplicateName;
            var vertexShaderUniforms = extractUniforms(vertexShaderText);
            var fragmentShaderUniforms = extractUniforms(fragmentShaderText);
            var vertexUniformsCount = vertexShaderUniforms.length;
            var fragmentUniformsCount = fragmentShaderUniforms.length;

            for (i = 0; i < vertexUniformsCount; i++) {
                for (j = 0; j < fragmentUniformsCount; j++) {
                    if (vertexShaderUniforms[i] === fragmentShaderUniforms[j]) {
                        uniformName = vertexShaderUniforms[i];
                        duplicateName = 'czm_mediump_' + uniformName;
                        // Update fragmentShaderText with renamed uniforms
                        var re = new RegExp(uniformName + '\\b', 'g');
                        fragmentShaderText = fragmentShaderText.replace(re, duplicateName);
                        duplicateUniformNames[duplicateName] = uniformName;
                    }
                }
            }
        }

        return {
            fragmentShaderText : fragmentShaderText,
            duplicateUniformNames : duplicateUniformNames
        };
    }

    var consolePrefix = '[Cesium WebGL] ';

    function createAndLinkProgram(gl, shader) {
        var vsSource = shader._vertexShaderText;
        var fsSource = shader._fragmentShaderText;

        var vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vsSource);
        gl.compileShader(vertexShader);

        var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fsSource);
        gl.compileShader(fragmentShader);

        var program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);

        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        var attributeLocations = shader._attributeLocations;
        if (defined(attributeLocations)) {
            for ( var attribute in attributeLocations) {
                if (attributeLocations.hasOwnProperty(attribute)) {
                    gl.bindAttribLocation(program, attributeLocations[attribute], attribute);
                }
            }
        }

        gl.linkProgram(program);

        var log;
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            var debugShaders = shader._debugShaders;

            // For performance, only check compile errors if there is a linker error.
            if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
                log = gl.getShaderInfoLog(fragmentShader);
                console.error(consolePrefix + 'Fragment shader compile log: ' + log);
                if (defined(debugShaders)) {
                    var fragmentSourceTranslation = debugShaders.getTranslatedShaderSource(fragmentShader);
                    if (fragmentSourceTranslation !== '') {
                        console.error(consolePrefix + 'Translated fragment shader source:\n' + fragmentSourceTranslation);
                    } else {
                        console.error(consolePrefix + 'Fragment shader translation failed.');
                    }
                }

                gl.deleteProgram(program);
                throw new RuntimeError('Fragment shader failed to compile.  Compile log: ' + log);
            }

            if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
                log = gl.getShaderInfoLog(vertexShader);
                console.error(consolePrefix + 'Vertex shader compile log: ' + log);
                if (defined(debugShaders)) {
                    var vertexSourceTranslation = debugShaders.getTranslatedShaderSource(vertexShader);
                    if (vertexSourceTranslation !== '') {
                        console.error(consolePrefix + 'Translated vertex shader source:\n' + vertexSourceTranslation);
                    } else {
                        console.error(consolePrefix + 'Vertex shader translation failed.');
                    }
                }

                gl.deleteProgram(program);
                throw new RuntimeError('Vertex shader failed to compile.  Compile log: ' + log);
            }

            log = gl.getProgramInfoLog(program);
            console.error(consolePrefix + 'Shader program link log: ' + log);
            if (defined(debugShaders)) {
                console.error(consolePrefix + 'Translated vertex shader source:\n' + debugShaders.getTranslatedShaderSource(vertexShader));
                console.error(consolePrefix + 'Translated fragment shader source:\n' + debugShaders.getTranslatedShaderSource(fragmentShader));
            }

            gl.deleteProgram(program);
            throw new RuntimeError('Program failed to link.  Link log: ' + log);
        }

        var logShaderCompilation = shader._logShaderCompilation;

        if (logShaderCompilation) {
            log = gl.getShaderInfoLog(vertexShader);
            if (defined(log) && (log.length > 0)) {
                console.log(consolePrefix + 'Vertex shader compile log: ' + log);
            }
        }

        if (logShaderCompilation) {
            log = gl.getShaderInfoLog(fragmentShader);
            if (defined(log) && (log.length > 0)) {
                console.log(consolePrefix + 'Fragment shader compile log: ' + log);
            }
        }

        if (logShaderCompilation) {
            log = gl.getProgramInfoLog(program);
            if (defined(log) && (log.length > 0)) {
                console.log(consolePrefix + 'Shader program link log: ' + log);
            }
        }

        return program;
    }

    function findVertexAttributes(gl, program, numberOfAttributes) {
        var attributes = {};
        for (var i = 0; i < numberOfAttributes; ++i) {
            var attr = gl.getActiveAttrib(program, i);
            var location = gl.getAttribLocation(program, attr.name);

            attributes[attr.name] = {
                name : attr.name,
                type : attr.type,
                index : location
            };
        }

        return attributes;
    }

    function findUniforms(gl, program) {
        var uniformsByName = {};
        var uniforms = [];
        var samplerUniforms = [];

        var numberOfUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

        for (var i = 0; i < numberOfUniforms; ++i) {
            var activeUniform = gl.getActiveUniform(program, i);
            var suffix = '[0]';
            var uniformName = activeUniform.name.indexOf(suffix, activeUniform.name.length - suffix.length) !== -1 ? activeUniform.name.slice(0, activeUniform.name.length - 3) : activeUniform.name;

            // Ignore GLSL built-in uniforms returned in Firefox.
            if (uniformName.indexOf('gl_') !== 0) {
                if (activeUniform.name.indexOf('[') < 0) {
                    // Single uniform
                    var location = gl.getUniformLocation(program, uniformName);

                    // IE 11.0.9 needs this check since getUniformLocation can return null
                    // if the uniform is not active (e.g., it is optimized out).  Looks like
                    // getActiveUniform() above returns uniforms that are not actually active.
                    if (location !== null) {
                        var uniform = createUniform(gl, activeUniform, uniformName, location);

                        uniformsByName[uniformName] = uniform;
                        uniforms.push(uniform);

                        if (uniform._setSampler) {
                            samplerUniforms.push(uniform);
                        }
                    }
                } else {
                    // Uniform array

                    var uniformArray;
                    var locations;
                    var value;
                    var loc;

                    // On some platforms - Nexus 4 in Firefox for one - an array of sampler2D ends up being represented
                    // as separate uniforms, one for each array element.  Check for and handle that case.
                    var indexOfBracket = uniformName.indexOf('[');
                    if (indexOfBracket >= 0) {
                        // We're assuming the array elements show up in numerical order - it seems to be true.
                        uniformArray = uniformsByName[uniformName.slice(0, indexOfBracket)];

                        // Nexus 4 with Android 4.3 needs this check, because it reports a uniform
                        // with the strange name webgl_3467e0265d05c3c1[1] in our globe surface shader.
                        if (!defined(uniformArray)) {
                            continue;
                        }

                        locations = uniformArray._locations;

                        // On the Nexus 4 in Chrome, we get one uniform per sampler, just like in Firefox,
                        // but the size is not 1 like it is in Firefox.  So if we push locations here,
                        // we'll end up adding too many locations.
                        if (locations.length <= 1) {
                            value = uniformArray.value;
                            loc = gl.getUniformLocation(program, uniformName);

                            // Workaround for IE 11.0.9.  See above.
                            if (loc !== null) {
                                locations.push(loc);
                                value.push(gl.getUniform(program, loc));
                            }
                        }
                    } else {
                        locations = [];
                        for (var j = 0; j < activeUniform.size; ++j) {
                            loc = gl.getUniformLocation(program, uniformName + '[' + j + ']');

                            // Workaround for IE 11.0.9.  See above.
                            if (loc !== null) {
                                locations.push(loc);
                            }
                        }
                        uniformArray = createUniformArray(gl, activeUniform, uniformName, locations);

                        uniformsByName[uniformName] = uniformArray;
                        uniforms.push(uniformArray);

                        if (uniformArray._setSampler) {
                            samplerUniforms.push(uniformArray);
                        }
                    }
                }
            }
        }

        return {
            uniformsByName : uniformsByName,
            uniforms : uniforms,
            samplerUniforms : samplerUniforms
        };
    }

    function partitionUniforms(shader, uniforms) {
        var automaticUniforms = [];
        var manualUniforms = [];

        for (var uniform in uniforms) {
            if (uniforms.hasOwnProperty(uniform)) {
                var uniformObject = uniforms[uniform];
                var uniformName = uniform;
                // if it's a duplicate uniform, use its original name so it is updated correctly
                var duplicateUniform = shader._duplicateUniformNames[uniformName];
                if (defined(duplicateUniform)) {
                    uniformObject.name = duplicateUniform;
                    uniformName = duplicateUniform;
                }
                var automaticUniform = AutomaticUniforms[uniformName];
                if (defined(automaticUniform)) {
                    automaticUniforms.push({
                        uniform : uniformObject,
                        automaticUniform : automaticUniform
                    });
                } else {
                    manualUniforms.push(uniformObject);
                }
            }
        }

        return {
            automaticUniforms : automaticUniforms,
            manualUniforms : manualUniforms
        };
    }

    function setSamplerUniforms(gl, program, samplerUniforms) {
        gl.useProgram(program);

        var textureUnitIndex = 0;
        var length = samplerUniforms.length;
        for (var i = 0; i < length; ++i) {
            textureUnitIndex = samplerUniforms[i]._setSampler(textureUnitIndex);
        }

        gl.useProgram(null);

        return textureUnitIndex;
    }

    function initialize(shader) {
        if (defined(shader._program)) {
            return;
        }

        var gl = shader._gl;
        var program = createAndLinkProgram(gl, shader, shader._debugShaders);
        var numberOfVertexAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        var uniforms = findUniforms(gl, program);
        var partitionedUniforms = partitionUniforms(shader, uniforms.uniformsByName);

        shader._program = program;
        shader._numberOfVertexAttributes = numberOfVertexAttributes;
        shader._vertexAttributes = findVertexAttributes(gl, program, numberOfVertexAttributes);
        shader._uniformsByName = uniforms.uniformsByName;
        shader._uniforms = uniforms.uniforms;
        shader._automaticUniforms = partitionedUniforms.automaticUniforms;
        shader._manualUniforms = partitionedUniforms.manualUniforms;

        shader.maximumTextureUnitIndex = setSamplerUniforms(gl, program, uniforms.samplerUniforms);
    }

    ShaderProgram.prototype._bind = function() {
        initialize(this);
        this._gl.useProgram(this._program);
    };

    ShaderProgram.prototype._setUniforms = function(uniformMap, uniformState, validate) {
        var len;
        var i;

        if (defined(uniformMap)) {
            var manualUniforms = this._manualUniforms;
            len = manualUniforms.length;
            for (i = 0; i < len; ++i) {
                var mu = manualUniforms[i];
                mu.value = uniformMap[mu.name]();
            }
        }

        var automaticUniforms = this._automaticUniforms;
        len = automaticUniforms.length;
        for (i = 0; i < len; ++i) {
            var au = automaticUniforms[i];
            au.uniform.value = au.automaticUniform.getValue(uniformState);
        }

        ///////////////////////////////////////////////////////////////////

        // It appears that assigning the uniform values above and then setting them here
        // (which makes the GL calls) is faster than removing this loop and making
        // the GL calls above.  I suspect this is because each GL call pollutes the
        // L2 cache making our JavaScript and the browser/driver ping-pong cache lines.
        var uniforms = this._uniforms;
        len = uniforms.length;
        for (i = 0; i < len; ++i) {
            uniforms[i].set();
        }

        if (validate) {
            var gl = this._gl;
            var program = this._program;

            gl.validateProgram(program);
            //>>includeStart('debug', pragmas.debug);
            if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
                throw new DeveloperError('Program validation failed.  Program info log: ' + gl.getProgramInfoLog(program));
            }
            //>>includeEnd('debug');
        }
    };

    ShaderProgram.prototype.isDestroyed = function() {
        return false;
    };

    ShaderProgram.prototype.destroy = function() {
        this._cachedShader.cache.releaseShaderProgram(this);
        return undefined;
    };

    ShaderProgram.prototype.finalDestroy = function() {
        this._gl.deleteProgram(this._program);
        return destroyObject(this);
    };
export default ShaderProgram;
