define([
        '../Core/Check',
        '../Core/defaultValue',
        '../Core/defineProperties',
        '../Core/destroyObject'
    ], function(
        Check,
        defaultValue,
        defineProperties,
        destroyObject) {
    'use strict';

    function PostProcessComposite(options) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('options', options);
        Check.defined('options.processes', options.processes);
        Check.typeOf.number.greaterThan('options.processes.length', options.processes.length, 0);
        //>>includeEnd('debug');
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._processes = options.processes;
        this._destroyProcesses = defaultValue(options.destroyProcesses, true);
    }

    defineProperties(PostProcessComposite.prototype, {
        processes : {
            get : function() {
                return this._processes;
            }
        },
        outputTexture : {
            get : function() {
                return this._processes[this._processes.length - 1].outputTexture;
            }
        }
    });


    PostProcessComposite.prototype.update = function(context) {
        var processes = this._processes;
        var length = processes.length;

        processes[0].update(context);

        for (var i = 1; i < length; ++i) {
            var process = processes[i];
            process._setColorTexture(processes[i - 1].outputTexture);
            process.update(context);
        }
    };

    PostProcessComposite.prototype.clear = function(context) {
        var processes = this._processes;
        var length = processes.length;
        for (var i = 0; i < length; ++i) {
            processes[i].clear(context);
        }
    };

    PostProcessComposite.prototype._setColorTexture = function(texture) {
        this._processes[0]._setColorTexture(texture);
    };

    PostProcessComposite.prototype._setDepthTexture = function(texture) {
        var processes = this._processes;
        var length = processes.length;
        for (var i = 0; i < length; ++i) {
            var process = processes[i];
            process._setDepthTexture(texture);
        }
    };

    PostProcessComposite.prototype.execute = function(context) {
        var processes = this._processes;
        var length = processes.length;
        for (var i = 0; i < length; ++i) {
            processes[i].execute(context);
        }
    };

    PostProcessComposite.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessComposite.prototype.destroy = function() {
        if (this._destroyProcesses) {
            var processes = this._processes;
            var length = processes.length;
            for (var i = 0; i < length; ++i) {
                processes[i].destroy();
            }
        }
        return destroyObject(this);
    };

    return PostProcessComposite;
});
