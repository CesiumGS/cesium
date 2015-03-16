/*
  Copyright (C) 2013 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint browser:true */
/*global esprima:true, require:true */

var timerId;

function collectRegex() {
    'use strict';

    function id(i) {
        return document.getElementById(i);
    }

    function escaped(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function setText(id, str) {
        var el = document.getElementById(id);
        if (typeof el.innerText === 'string') {
            el.innerText = str;
        } else {
            el.textContent = str;
        }
    }

    function isLineTerminator(ch) {
        return (ch === '\n' || ch === '\r' || ch === '\u2028' || ch === '\u2029');
    }

    function process(delay) {
        if (timerId) {
            window.clearTimeout(timerId);
        }

        timerId = window.setTimeout(function () {
            var code, result, occurrences, model, i, str;

            if (typeof window.editor === 'undefined') {
                code = document.getElementById('code').value;
            } else {
                code = window.editor.getText();
            }

            // Executes f on the object and its children (recursively).
            function visit(object, f) {
                var key, child;

                if (f.call(null, object) === false) {
                    return;
                }
                for (key in object) {
                    if (object.hasOwnProperty(key)) {
                        child = object[key];
                        if (typeof child === 'object' && child !== null) {
                            visit(child, f);
                        }
                    }
                }
            }

            function createRegex(pattern, mode) {
                var literal;
                try {
                    literal = new RegExp(pattern, mode);
                } catch (e) {
                    // Invalid regular expression.
                    return;
                }
                return literal;
            }

            function collect(node) {
                var str, arg, value;
                if (node.type === 'Literal') {
                    if (node.value instanceof RegExp) {
                        str = node.value.toString();
                        if (str[0] === '/') {
                            result.push({
                                type: 'Literal',
                                value: node.value,
                                line: node.loc.start.line,
                                column: node.loc.start.column,
                                range: node.range
                            });
                        }
                    }
                }
                if (node.type === 'NewExpression' || node.type === 'CallExpression') {
                    if (node.callee.type === 'Identifier' && node.callee.name === 'RegExp') {
                        arg = node['arguments'];
                        if (arg.length === 1 && arg[0].type === 'Literal') {
                            if (typeof arg[0].value === 'string') {
                                value = createRegex(arg[0].value);
                                if (value) {
                                    result.push({
                                        type: 'Literal',
                                        value: value,
                                        line: node.loc.start.line,
                                        column: node.loc.start.column,
                                        range: node.range
                                    });
                                }
                            }
                        }
                        if (arg.length === 2 && arg[0].type === 'Literal' && arg[1].type === 'Literal') {
                            if (typeof arg[0].value === 'string' && typeof arg[1].value === 'string') {
                                value = createRegex(arg[0].value, arg[1].value);
                                if (value) {
                                    result.push({
                                        type: 'Literal',
                                        value: value,
                                        line: node.loc.start.line,
                                        column: node.loc.start.column,
                                        range: node.range
                                    });
                                }
                            }
                        }
                    }
                }
            }

            occurrences = [];
            try {
                result = [];
                visit(window.esprima.parse(code, { loc: true, range: true }), collect);

                if (result.length > 0) {
                    id('info').innerHTML = 'Total regular expressions: ' + result.length;
                    id('info').setAttribute('class', 'alert-box success');
                    model = window.editor.getModel();
                    for (i = 0; i < result.length; i += 1) {
                        occurrences.push({
                            line: result[i].line,
                            start: 1 + result[i].range[0] - model.getLineStart(result[i].line - 1),
                            end: result[i].range[1] - model.getLineStart(result[i].line - 1),
                            readAccess: true,
                            description: result[i].value.toString()
                        });
                    }
                } else {
                    setText('info', 'No regex found.');
                    id('info').setAttribute('class', 'alert-box secondary');
                }
            } catch (e) {
                setText('info', e.toString());
                id('info').setAttribute('class', 'alert-box alert');
            } finally {
                window.editor.showOccurrences(occurrences);
            }

            timerId = undefined;
        }, delay || 811);
    }

    process(1);
}

window.onload = function () {
    'use strict';

    try {
        require(['custom/editor'], function (editor) {
            window.editor = editor({ parent: 'editor', lang: 'js' });
            window.editor.onGotoLine(3, 0);
            window.editor.getTextView().getModel().addEventListener("Changed", collectRegex);
            collectRegex();
        });
    } catch (e) {
    }
};
