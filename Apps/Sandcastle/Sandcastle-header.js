(function() {
    "use strict";

    var bucket = window.location.href;
    var pos = bucket.lastIndexOf('/');
    if (pos > 0 && pos < (bucket.length - 1)) {
        bucket = bucket.substring(pos + 1);
    }

    window.Sandcastle = {
        bucket : bucket,
        declare : function() {
        },
        highlight : function() {
        },
        registered : [],
        finishedLoading : function() {
            document.body.className = document.body.className.replace(/(?:\s|^)sandcastle-loading(?:\s|$)/, ' ');
        }
    };

    if (window.location.protocol === 'file:') {
        if (window.confirm("You must host this app on a web server.\nSee contributor's guide for more info?")) {
            window.location = 'https://github.com/AnalyticalGraphicsInc/cesium/wiki/Contributor%27s-Guide';
        }
    }
}());
