/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Renderer/Context',
        './CreditDisplay',
        './PerformanceDisplay',
        './Scene'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Context,
        CreditDisplay,
        PerformanceDisplay,
        Scene) {
    'use strict';

    // This name is a joke ...sort of.
    function SceneManager(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var canvas = options.canvas;
        var contextOptions = options.contextOptions;
        var creditContainer = options.creditContainer;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(canvas)) {
            throw new DeveloperError('options and options.canvas are required.');
        }
        //>>includeEnd('debug');

        var context = new Context(canvas, contextOptions);
        if (!defined(creditContainer)) {
            creditContainer = document.createElement('div');
            creditContainer.style.position = 'absolute';
            creditContainer.style.bottom = '0';
            creditContainer.style['text-shadow'] = '0 0 2px #000000';
            creditContainer.style.color = '#ffffff';
            creditContainer.style['font-size'] = '10px';
            creditContainer.style['padding-right'] = '5px';
            canvas.parentNode.appendChild(creditContainer);
        }

        this._canvas = canvas;
        this._context = context;
        this._creditDisplay = new CreditDisplay(creditContainer);

        this._performanceContainer = undefined;
        this._performanceDisplay = undefined;

        this._shaderFrameCount = 0;

        this._scenes = [];

        /**
         * This property is for debugging only; it is not for production use.
         * <p>
         * Displays frames per second and time between frames.
         * </p>
         *
         * @type Boolean
         *
         * @default false
         */
        this.debugShowFramesPerSecond = false;
    }

    defineProperties(SceneManager.prototype, {
        /**
         * Gets the canvas element to which this scene is bound.
         * @memberof SceneManager.prototype
         *
         * @type {Canvas}
         * @readonly
         */
        canvas : {
            get : function() {
                return this._canvas;
            }
        },

        /**
         * @memberof SceneManager.prototype
         * @private
         * @readonly
         */
        context : {
            get : function() {
                return this._context;
            }
        }
    });

    SceneManager.prototype.add = function(options) {
        // TODO Dan remove canvas
        var scene = new Scene(this._canvas, this._context, this._creditDisplay, options);
        this._scenes.push(scene);
        return scene;
    };

    SceneManager.prototype.remove = function(index) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(index) || index < 0 || index > this._scenes.length - 1) {
            throw new DeveloperError('index must be defined and in range.');
        }
        //>>includeEnd('debug');
        this._scenes[index].destroy();
        this._scenes.splice(index, 1);
    };

    SceneManager.prototype.get = function(index) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(index) || index < 0 || index > this._scenes.length - 1) {
            throw new DeveloperError('index must be defined and in range.');
        }
        //>>includeEnd('debug');
        return this._scenes[index];
    };

    SceneManager.prototype.initializeFrame = function() {
        // Destroy released shaders once every 120 frames to avoid thrashing the cache
        if (this._shaderFrameCount++ === 120) {
            this._shaderFrameCount = 0;
            this._context.shaderCache.destroyReleasedShaderPrograms();
        }

        var scenes = this._scenes;
        var length = scenes.length;
        for (var i = 0; i < length; ++i) {
            scenes[i].initializeFrame();
        }
    };

    SceneManager.prototype.render = function(time) {
        var context = this._context;

        this._creditDisplay.beginFrame();

        var scenes = this._scenes;
        var length = scenes.length;
        for (var i = 0; i < length; ++i) {
            scenes[i].render(time);
        }

        this._creditDisplay.endFrame();

        if (this.debugShowFramesPerSecond) {
            if (!defined(this._performanceDisplay)) {
                var performanceContainer = document.createElement('div');
                performanceContainer.className = 'cesium-performanceDisplay-defaultContainer';
                var container = this._canvas.parentNode;
                container.appendChild(performanceContainer);
                this._performanceDisplay = new PerformanceDisplay({container: performanceContainer});
                this._performanceContainer = performanceContainer;
            }

            this._performanceDisplay.update();
        } else if (defined(this._performanceDisplay)) {
            this._performanceDisplay = this._performanceDisplay && this._performanceDisplay.destroy();
            this._performanceContainer.parentNode.removeChild(this._performanceContainer);
        }

        context.endFrame();
    };

    SceneManager.prototype.isDestroyed = function() {
        return false;
    };

    SceneManager.prototype.destroy = function() {
        this._context = this._context && this._context.destroy();
        this._creditDisplay.destroy();

        if (defined(this._performanceDisplay)) {
            this._performanceDisplay = this._performanceDisplay && this._performanceDisplay.destroy();
            this._performanceContainer.parentNode.removeChild(this._performanceContainer);
        }

        return destroyObject(this);
    };

    return SceneManager;
});
