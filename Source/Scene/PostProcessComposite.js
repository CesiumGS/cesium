define([
        '../Core/Check',
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject'
    ], function(
        Check,
        createGuid,
        defaultValue,
        defined,
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
        this._executeInSeries = defaultValue(options.executeInSeries, true);

        this._name = options.name;
        if (!defined(this._name)) {
            this._name = createGuid();
        }

        // used by PostProcessCollection
        this._collection = undefined;
        this._index = undefined;
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
        name : {
            get : function() {
                return this._name;
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
        executeInSeries : {
            get : function() {
                return this._executeInSeries;
            }
        },
        length : {
            get : function() {
                return this._processes.length;
            }
        }
    });

    PostProcessComposite.prototype.get = function(index) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number.greaterThanOrEquals('index', index, 0);
        Check.typeOf.number.lessThan('index', index, this.length);
        //>>includeEnd('debug');
        return this._processes[index];
    };

    PostProcessComposite.prototype.update = function(context) {
        var processes = this._processes;
        var length = processes.length;
        for (var i = 0; i < length; ++i) {
            processes[i].update(context);
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
