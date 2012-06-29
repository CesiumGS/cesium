(function() {
    "use strict";
    /*global Sandbox,ace,require,define*/

    /**
     * Constructs an instance of a Javascript Ace editor.
     *
     * @param {String} id The id of the DOM element to be converted to an editor
     *
     * @constructor
     */
    Sandbox.Editor = function(id) {
        define('ace/mode/cesium', function(require, exports, module) {
            var oop = require('pilot/oop');
            var TextMode = require('ace/mode/text').Mode;
            var Tokenizer = require('ace/tokenizer').Tokenizer;
            var WorkerClient = require('ace/worker/worker_client').WorkerClient;
            var CesiumHighlightRules = require('ace/mode/cesium_highlight_rules').CesiumHighlightRules;

            var Mode = function() {
                this.$tokenizer = new Tokenizer(new CesiumHighlightRules().getRules());
            };
            oop.inherits(Mode, TextMode);
            (function() {
                // Create a worker to enable jslint
                this.createWorker = function(session) {
                    var doc = session.getDocument();
                    var worker = new WorkerClient(['ace', 'pilot'], 'worker-javascript.js', 'ace/mode/javascript_worker', 'JavaScriptWorker');
                    worker.call('setValue', [doc.getValue()]);

                    doc.on('change', function(e) {
                        e.range = {
                            start : e.data.range.start,
                            end : e.data.range.end
                        };
                        worker.emit('change', e);
                    });

                    worker.on('jslint', function(results) {
                        var errors = [];
                        for ( var i = 0; i < results.data.length; i++) {
                            var error = results.data[i];
                            if (error) {
                                errors.push({
                                    row : error.line - 1,
                                    column : error.character - 1,
                                    text : error.reason,
                                    type : 'warning',
                                    lint : error
                                });
                            }
                        }
                        session.setAnnotations(errors);
                    });

                    worker.on('narcissus', function(e) {
                        session.setAnnotations([e.data]);
                    });

                    worker.on('terminate', function() {
                        session.clearAnnotations();
                    });

                    return worker;
                };

            }).call(Mode.prototype);

            exports.Mode = Mode;
        });

        define('ace/mode/cesium_highlight_rules', function(require, exports, module) {
            var oop = require('pilot/oop');
            var JavaScriptHighlightRules = require('ace/mode/javascript_highlight_rules').JavaScriptHighlightRules;
            var CesiumHighlightRules = function() {
                this.$rules = new JavaScriptHighlightRules().getRules();
                this.$rules.start.unshift({
                    token : 'variable.language',
                    regex : 'Cesium.?[A-Za-z0-9]*'
                });
            };
            oop.inherits(CesiumHighlightRules, JavaScriptHighlightRules);
            exports.CesiumHighlightRules = CesiumHighlightRules;
        });

        var editor = ace.edit(id);
        var CesiumMode = require('ace/mode/cesium').Mode;
        editor.getSession().setMode(new CesiumMode());
        editor.renderer.setShowPrintMargin(false);
        editor.getSession().setUseSoftTabs(true);
        editor.renderer.setHScrollBarAlwaysVisible(false);
        editor.getSession().setUseSoftTabs(true);

        this._id = id;
        this._wrap = false;
        this._editor = editor;
    };

    Sandbox.Editor.prototype.on = function(eventName, eventHandler) {
        this._editor.getSession().on(eventName, eventHandler);
    };

    /**
     * Displays new content in the editor.
     *
     * @param {String} code The content to be displayed.
     */
    Sandbox.Editor.prototype.display = function(code) {
        this._editor.getSession().setValue(code);
    };

    /**
     * Retrieves the code that is currently displayed in the editor.
     *
     * @return {String} The code displayed in the editor
     */
    Sandbox.Editor.prototype.getValue = function() {
        return this._editor.getSession().getValue();
    };

    /**
     * Toggles whether or not the editor's contents will wrap onto a new line.
     */
    Sandbox.Editor.prototype.toggleWordWrap = function() {
        this._wrap = !this._wrap;
        this._editor.getSession().setUseWrapMode(this._wrap);
    };

    /**
     * Resizes the editor to fill new page dimensions.
     */
    Sandbox.Editor.prototype.resize = function() {
        this._editor.resize();
    };

    Sandbox.Editor.prototype.getSelectedText = function() {
        return this._editor.getSession().doc.getTextRange(this._editor.getSelectionRange());
    };

    Sandbox.Editor.prototype.linkToDoc = function() {
        var editor = this._editor;
        // Update the documentation link to filter with the current selection
        editor.getSession().selection.on('changeSelection', function() {
            var docLink = document.getElementById('docLink');
            var selection = editor.getSession().doc.getTextRange(editor.getSelectionRange());
            if (selection.match(/Cesium\.?[A-za-z0-9]*/)) {
                docLink.href = '../../Documentation/symbols/' + selection + '.html';
            } else {
                docLink.href = '../../Documentation/index.html?classFilter=' + selection;
            }
        });
    };
}());
