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

/*jslint browser:true evil:true */
/*global require:true */

(function (global) {
    'use strict';

    var lookup;

    function id(i) {
        return document.getElementById(i);
    }

    function traceInstrument() {
        var tracer, code, i, functionList, signature, pos;

        if (typeof window.editor === 'undefined') {
            code = document.getElementById('code').value;
        } else {
            code = window.editor.getText();
        }

        tracer = window.esmorph.Tracer.FunctionEntrance(function (fn) {
            signature = 'window.TRACE.enterFunction({ ';
            signature += 'name: "' + fn.name + '", ';
            signature += 'lineNumber: ' + fn.loc.start.line + ', ';
            signature += 'range: [' + fn.range[0] + ',' + fn.range[1] + ']';
            signature += ' });';
            return signature;
        });

        code = window.esmorph.modify(code, tracer);

        // Enclose in IIFE.
        code = '(function() {\n' + code + '\n}())';

        return code;
    }

    function count(x, s, p) {
        return (x === 1) ? (x + ' ' + s) : (x + ' ' + p);
    }

    function showResult() {
        var i, histogram, entry, name, pos;

        histogram = window.TRACE.getHistogram();
        for (i = 0; i < histogram.length; i += 1) {
            entry = histogram[i];
            name = entry.name.split(':')[0];
            pos = parseInt(entry.name.split(':')[1], 10);
            window.editor.addErrorMarker(pos, name + ' is called ' + count(entry.count, 'time', 'times'));
        }
    }

    function createTraceCollector() {
        global.TRACE = {
            hits: {},
            enterFunction: function (info) {
                var key = info.name + ':' + info.range[0];
                if (this.hits.hasOwnProperty(key)) {
                    this.hits[key] = this.hits[key] + 1;
                } else {
                    this.hits[key] = 1;
                }
            },
            getHistogram: function () {
                var entry,
                    sorted = [];
                for (entry in this.hits) {
                    if (this.hits.hasOwnProperty(entry)) {
                        sorted.push({ name: entry, count: this.hits[entry]});
                    }
                }
                sorted.sort(function (a, b) {
                    return b.count - a.count;
                });
                return sorted;
            }
        };
    }

    global.traceRun = function () {
        var code, timestamp;
        try {
            id('info').setAttribute('class', 'alert-box secondary');
            id('info').innerHTML = 'Executing...';
            window.editor.removeAllErrorMarkers();

            createTraceCollector();
            code = traceInstrument();

            timestamp = +new Date();
            eval(code);
            timestamp = (+new Date()) - timestamp;
            id('info').innerHTML = 'Tracing completed in ' + (1 + timestamp) + ' ms.';

            showResult();
        } catch (e) {
            id('info').innerHTML = e.toString();
            id('info').setAttribute('class', 'alert-box alert');
        }
    };
}(window));

window.onload = function () {
    'use strict';

    document.getElementById('run').onclick = window.traceRun;

    try {
        require(['custom/editor'], function (editor) {
            window.editor = editor({ parent: 'editor', lang: 'js' });
            window.editor.getModel().addEventListener("Changed", function () {
                window.editor.removeAllErrorMarkers();
                document.getElementById('info').setAttribute('class', 'alert-box secondary');
                document.getElementById('info').innerHTML = 'Ready.';
            });
        });
    } catch (e) {
    }
};
