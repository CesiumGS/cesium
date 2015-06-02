(function (){
    "use strict";
    /*global console,Sandcastle,window*/
    var PubSub = window.parent.PubSub;
    function defined(value) {
        return value !== undefined;
    }

    console.originalLog = console.log;
    console.log = function(d1) {
        // console.originalLog.apply(console, arguments);
        PubSub.publish('CONSOLE LOG', defined(d1)?d1.toString():'undefined');
    };

    console.originalWarn = console.warn;
    console.warn = function(d1) {
        // console.originalWarn.apply(console, arguments);
        PubSub.publish('CONSOLE WARN', defined(d1)?d1.toString():'undefined');
    };

    console.originalError = console.error;
    console.error = function(d1) {
        console.log("send an error msg frm here");
        // console.originalError.apply(console, arguments);
        var msg = {};
        if (!defined(d1)) {
            msg.data = 'undefined';
            PubSub.publish('CONSOLE ERROR', msg);
            return;
        }

        // Look for d1.stack, "bucket.html:line:char"
        var lineNumber = -1;
        var errorMsg = d1.toString();
        if (typeof d1.stack === 'string') {
            var stack = d1.stack;
            var pos = stack.indexOf(Sandcastle.bucket);
            if (pos < 0) {
                pos = stack.indexOf('<anonymous>');
            }
            if (pos >= 0) {
                var lineStart = stack.indexOf(':', pos);
                if (lineStart > pos) {
                    var lineEnd1 = stack.indexOf(':', lineStart + 1);
                    var lineEnd2 = stack.indexOf('\n', lineStart + 1);
                    if (lineEnd2 > lineStart && (lineEnd2 < lineEnd1 || lineEnd1 < lineStart)) {
                        lineEnd1 = lineEnd2;
                    }
                    if (lineEnd1 > lineStart) {
                        try {
                            lineNumber = parseInt(stack.substring(lineStart + 1, lineEnd1), 10);
                        } catch (ex) {
                        }
                    }
                }
            }
        }

        if (lineNumber >= 0) {
            msg.data = errorMsg;
            msg.lineNum = lineNumber;
           PubSub.publish('CONSOLE ERROR', msg);
        } else {
            msg.data = errorMsg;
            PubSub.publish('CONSOLE ERROR', msg);
        }
    };

    window.onerror = function(errorMsg, url, lineNumber) {
        if (defined(lineNumber)) {
            if (defined(url) && url.indexOf(Sandcastle.bucket) > -1) {
                // if the URL is the bucket itself, ignore it
                url = '';
            }
            if (lineNumber < 1) {
                // Change lineNumber to the local one for highlighting.
                try {
                    var pos = errorMsg.indexOf(Sandcastle.bucket + ':');
                    if (pos < 0) {
                        pos = errorMsg.indexOf('<anonymous>');
                    }
                    if (pos >= 0) {
                        pos += 12;
                        lineNumber = parseInt(errorMsg.substring(pos), 10);
                    }
                } catch (ex) {
                }
            }
            var msg = {};
            msg.data = errorMsg;
            msg.url = url;
            msg.lineNum = lineNumber;
            PubSub.publish('CONSOLE ERROR', msg);
        } else {
            var msg = {};
            msg.data = errorMsg;
            msg.url = url;
            PubSub.publish('CONSOLE ERROR', msg);
        }
        // console.originalError.apply(console, [errorMsg]);
        return false;
    };
}());