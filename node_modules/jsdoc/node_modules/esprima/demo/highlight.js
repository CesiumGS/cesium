/*
  Copyright (C) 2013 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>

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

var parseTimer, syntax = null;

function id(i) {
    'use strict';
    return document.getElementById(i);
}

function parse() {
    'use strict';
    var code = window.editor.getText();
    syntax = null;
    try {
        syntax = esprima.parse(code, {
            loc: true,
            range: true,
            tolerant: true
        });
        id('info').innerHTML = 'Ready';
        id('info').setAttribute('class', 'alert-box secondary');
    } catch (e) {
        id('info').innerHTML = e.toString();
        id('info').setAttribute('class', 'alert-box alert');
        window.editor.showOccurrences([]);
    }
}

function triggerParse(delay) {
    'use strict';

    if (parseTimer) {
        window.clearTimeout(parseTimer);
    }

    parseTimer = window.setTimeout(parse, delay || 811);
}

function trackCursor() {
    'use strict';

    var occurrences, model, pos, code, node, identifier;

    if (syntax === null) {
        parse();
        if (syntax === null) {
            window.editor.showOccurrences([]);
            return;
        }
    }

    occurrences = [];
    model = window.editor.getModel();
    pos = window.editor.getCaretOffset();
    code = window.editor.getText();

    // Executes visitor on the object and its children (recursively).
    function traverse(object, visitor, master) {
        var key, child, parent, path;

        parent = (typeof master === 'undefined') ? [] : master;

        if (visitor.call(null, object, parent) === false) {
            return;
        }
        for (key in object) {
            if (object.hasOwnProperty(key)) {
                child = object[key];
                path = [ object ];
                path.push(parent);
                if (typeof child === 'object' && child !== null) {
                    traverse(child, visitor, path);
                }
            }
        }
    }

    traverse(syntax, function (node, path) {
        var start, end;
        if (node.type !== esprima.Syntax.Identifier) {
            return;
        }
        if (pos >= node.range[0] && pos <= node.range[1]) {
            identifier = node;
            occurrences.push({
                line: node.loc.start.line,
                start: 1 + node.range[0] - model.getLineStart(node.loc.start.line - 1),
                end: node.range[1] - model.getLineStart(node.loc.start.line - 1),
                readAccess: false,
                description: node.name
            });
        }
    });

    window.editor.showOccurrences(occurrences);
    if (typeof identifier === 'undefined') {
        id('info').innerHTML = 'Ready';
        return;
    }

    id('info').innerHTML = 'Tracking identifier: ' + identifier.name;

    traverse(syntax, function (node, path) {
        var start, end;
        if (node.type !== esprima.Syntax.Identifier) {
            return;
        }
        if (node !== identifier && node.name === identifier.name) {
            occurrences.push({
                line: node.loc.start.line,
                start: 1 + node.range[0] - model.getLineStart(node.loc.start.line - 1),
                end: node.range[1] - model.getLineStart(node.loc.start.line - 1),
                readAccess: true,
                description: node.name
            });
        }
    });
    window.editor.showOccurrences(occurrences);
}

window.onload = function () {
    'use strict';

    try {
        require(['custom/editor'], function (editor) {
            window.editor = editor({ parent: 'editor', lang: 'js' });
            window.editor.getTextView().getModel().addEventListener("Changed", triggerParse);
            window.editor.getTextView().addEventListener("Selection", trackCursor);
            window.editor.onGotoLine(9, 12, 12);
            triggerParse(50);
        });
    } catch (e) {
    }
};
