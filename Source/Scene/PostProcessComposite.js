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
        ready : {
            get : function() {
                var processes = this._processes;
                var length = processes.length;
                for (var i = 0; i < length; ++i) {
                    if (!processes[i].ready) {
                        return false;
                    }
                }
                return true;
            }
        },
        enabled : {
            get : function() {
                return this._processes[0].enabled;
            },
            set : function(value) {
                var processes = this._processes;
                var length = processes.length;
                for (var i = 0; i < length; ++i) {
                    processes[i].enabled = value;
                }
            }
        },
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
        for (var i = 0; i < length; ++i) {
            processes[i].update(context);
        }
    };

    PostProcessComposite.prototype.clear = function(context) {
        var processes = this._processes;
        var length = processes.length;
        for (var i = 0; i < length; ++i) {
            processes[i].clear(context);
        }
    };

    PostProcessComposite.prototype.execute = function(context, colorTexture, depthTexture) {
        var processes = this._processes;
        var length = processes.length;
        processes[0].execute(context, colorTexture, depthTexture);
        for (var i = 1; i < length; ++i) {
            processes[i].execute(context, processes[i - 1].outputTexture, depthTexture);
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
