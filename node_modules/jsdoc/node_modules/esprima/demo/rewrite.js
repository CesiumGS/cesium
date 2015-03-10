/*
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
/*global esprima:true, escodegen:true, require:true */

function id(i) {
    'use strict';
    return document.getElementById(i);
}

function setText(id, str) {
    'use strict';
    var el = document.getElementById(id);
    if (typeof el.innerText === 'string') {
        el.innerText = str;
    } else {
        el.textContent = str;
    }
}

function sourceRewrite() {
    'use strict';

    var code, syntax, indent, quotes, option;

    if (typeof window.editor !== 'undefined') {
        code = window.editor.getText();
    } else {
        code = id('code').value;
    }

    indent = '';
    if (id('onetab').checked) {
        indent = '\t';
    } else if (id('twospaces').checked) {
        indent = '  ';
    } else if (id('fourspaces').checked) {
        indent = '    ';
    }

    quotes = 'auto';
    if (id('singlequotes').checked) {
        quotes = 'single';
    } else if (id('doublequotes').checked) {
        quotes = 'double';
    }

    option = {
        comment: true,
        format: {
            indent: {
                style: indent
            },
            quotes: quotes
        }
    };

    try {
        syntax = window.esprima.parse(code, { raw: true, tokens: true, range: true, comment: true });
        syntax = window.escodegen.attachComments(syntax, syntax.comments, syntax.tokens);
        code = window.escodegen.generate(syntax, option);
        window.editor.setText(code);
        setText('info', 'Rewriting was successful.');
    } catch (e) {
        id('info').innerHTML = e.toString();
        setText('info', e.toString());
    }
}

/*jslint sloppy:true browser:true */
/*global sourceRewrite:true */
window.onload = function () {

    id('rewrite').onclick = sourceRewrite;

    try {
        require(['custom/editor'], function (editor) {
            window.editor = editor({ parent: 'editor', lang: 'js' });
            window.editor.getTextView().getModel().addEventListener("Changed", function () {
                document.getElementById('info').innerHTML = 'Ready.';
            });
        });
    } catch (e) {
    }
};
