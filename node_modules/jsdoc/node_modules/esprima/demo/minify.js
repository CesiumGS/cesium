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

/*jslint sloppy: true browser:true */
/*global require:true */

function id(i) {
    return document.getElementById(i);
}

function createPipeline() {
    var passes, pipeline, inputs, i, el, optimizer;

    passes = {
        'eliminate-dead-code': 'pass/dead-code-elimination',
        'fold-constant': 'pass/tree-based-constant-folding',
        'remove-unreachable-branch': 'pass/remove-unreachable-branch',
        'remove-unused-vars': 'pass/drop-variable-definition'
    };

    pipeline = [
        'pass/hoist-variable-to-arguments',
        'pass/transform-dynamic-to-static-property-access',
        'pass/transform-dynamic-to-static-property-definition',
        'pass/transform-immediate-function-call',
        'pass/transform-logical-association',
        'pass/reordering-function-declarations',
        'pass/remove-unused-label',
        'pass/remove-empty-statement',
        'pass/remove-wasted-blocks',
        'pass/transform-to-compound-assignment',
        'pass/transform-to-sequence-expression',
        'pass/transform-branch-to-expression',
        'pass/transform-typeof-undefined',
        'pass/reduce-sequence-expression',
        'pass/reduce-branch-jump',
        'pass/reduce-multiple-if-statements',
        'pass/dead-code-elimination',
        'pass/remove-side-effect-free-expressions',
        'pass/remove-context-sensitive-expressions',
        'pass/tree-based-constant-folding',
        'pass/drop-variable-definition',
        'pass/remove-unreachable-branch'
    ];

    inputs = document.getElementsByTagName('input');
    for (i = 0; i < inputs.length; i += 1) {
        el = inputs[i];
        optimizer = passes[el.id];
        if (optimizer && el.checked === false) {
            pipeline.splice(pipeline.indexOf(optimizer), 1);
        }
    }

    pipeline = pipeline.map(window.esmangle.require);
    pipeline = [pipeline];
    pipeline.push({
        once: true,
        pass: [
            'post/transform-static-to-dynamic-property-access',
            'post/transform-infinity',
            'post/rewrite-boolean',
            'post/rewrite-conditional-expression'
        ].map(window.esmangle.require)
    });

    return pipeline;
}

function obfuscate(syntax) {
    var result = window.esmangle.optimize(syntax, createPipeline());

    if (id('mangle').checked) {
        result = window.esmangle.mangle(result);
    }

    return result;
}

function minify() {
    var code, syntax, option, str, before, after;

    if (typeof window.editor === 'undefined') {
        code = document.getElementById('editor').value;
    } else {
        code = window.editor.getText();
        window.editor.removeAllErrorMarkers();
    }

    option = {
        format: {
            indent: {
                style: ''
            },
            quotes: 'auto',
            compact: true
        }
    };

    str = '';

    try {
        before = code.length;
        syntax = window.esprima.parse(code, { raw: true, loc: true });
        syntax = obfuscate(syntax);
        code = window.escodegen.generate(syntax, option);
        after = code.length;
        if (before > after) {
            str = 'No error. Minifying ' + before + ' bytes to ' + after + ' bytes.';
            window.editor.setText(code);
        } else {
            str = 'Can not minify further, code is already optimized.';
        }
    } catch (e) {
        window.editor.addErrorMarker(e.index, e.description);
        str = e.toString();
    } finally {
        document.getElementById('info').innerHTML = str;
    }
}

window.onload = function () {
    document.getElementById('minify').onclick = minify;
    try {
        require(['custom/editor'], function (editor) {
            window.editor = editor({ parent: 'editor', lang: 'js', wrapMode: true });
            window.editor.getTextView().getModel().addEventListener("Changed", function () {
                document.getElementById('info').innerHTML = 'Ready.';
            });
        });
    } catch (e) {
    }
};
