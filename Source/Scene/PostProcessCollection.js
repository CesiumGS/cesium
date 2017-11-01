define([
        '../Core/Check',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Shaders/PostProcessFilters/PassThrough'
    ], function(
        Check,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        PassThrough) {
    'use strict';

    function PostProcessCollection() {
        this._processes = [];
    }

    defineProperties(PostProcessCollection.prototype, {
        processes : {
            get : function() {
                return this._processes;
            }
        },
        outputTexture : {
            get : function() {
                var processes = this._processes;
                if (processes.length > 0) {
                    return processes[processes.length - 1].outputTexture;
                }
                return undefined;
            }
        }
    });

    PostProcessCollection.prototype.add = function(postProcess) {
        this._processes.push(postProcess);
        return postProcess;
    };

    PostProcessCollection.prototype.removeAll = function() {
        var processes = this._processes;
        var length = processes.length;
        for (var i = 0; i < length; ++i) {
            processes[i].destroy();
        }
        processes.length = 0;
    };

    PostProcessCollection.prototype.update = function(context) {
        var processes = this._processes;
        var length = processes.length;
        for (var i = 0; i < length; ++i) {
            var process = processes[i];
            process.update(context);
        }
    };

    PostProcessCollection.prototype.clear = function(context) {
        var processes = this._processes;
        var length = processes.length;
        for (var i = 0; i < length; ++i) {
            processes[i].clear(context);
        }
    };

    PostProcessCollection.prototype.execute = function(context, colorTexture, depthTexture) {
        var processes = this._processes;
        var length = processes.length;
        processes[0].execute(context, colorTexture, depthTexture);
        for (var i = 1; i < length; ++i) {
            processes[i].execute(context, processes[i - 1].outputTexture, depthTexture);
        }
    };

    PostProcessCollection.prototype.copy = function(context, framebuffer) {
        if (!defined(this._copyColorCommand)) {
            var that = this;
            this._copyColorCommand = context.createViewportQuadCommand(PassThrough, {
                uniformMap : {
                    colorTexture : function() {
                        return that.outputTexture;
                    }
                },
                owner : this
            });
        }

        this._copyColorCommand.framebuffer = framebuffer;
        this._copyColorCommand.execute(context);
    };

    PostProcessCollection.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessCollection.prototype.destroy = function() {
        var processes = this._processes;
        var length = processes.length;
        for (var i = 0; i < length; ++i) {
            processes[i].destroy();
        }
        return destroyObject(this);
    };

    return PostProcessCollection;
});
