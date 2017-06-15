/*global define*/
define([
        '../Core/Check',
        '../Core/loadImage',
        '../Renderer/Texture'
    ], function(
        Check,
        loadImage,
        Texture) {
    'use strict';

    /**
     * @private
     */
    function PostProcessorStage(options) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('options', options);
        Check.typeOf.string('options.fragmentShader', options.fragmentShader);
        //>>includeEnd('debug');

        this._fragmentShader = options.fragmentShader;
        this._uniformValues = options.uniformValues;
        this._drawCommand = undefined;

        this.show = true;
        this.ready = true;
    }

    function loadTexture(stage, uniformName, imagePath, frameState) {
        return loadImage(imagePath).then(function(image) {
            frameState.afterRender.push(function() {
                stage._uniformValues[uniformName] = new Texture({
                    context : frameState.context,
                    source : image
                });
                stage.ready = true;
            });
        });

    }

    PostProcessorStage.prototype.update = function(frameState) {
        var uniformValues = this._uniformValues;
        for (var name in uniformValues) {
            if (uniformValues.hasOwnProperty(name)) {
                var value = uniformValues[name];
                if (typeof value === 'string') {
                    this.ready = false;
                    uniformValues[name] = loadTexture(this, name, value, frameState);
                }
            }
        }

    };

    return PostProcessorStage;
});
