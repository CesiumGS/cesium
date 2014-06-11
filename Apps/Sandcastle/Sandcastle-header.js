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
        },
        addToolbarButton : function(text, onclick, toolbarID) {
            window.Sandcastle.declare(onclick);
            var button = document.createElement('button');
            button.className = 'sandcastle-button';
            button.onclick = function() {
                window.Sandcastle.highlight(onclick);
                onclick();
            };
            button.textContent = text;
            document.getElementById(toolbarID || 'toolbar').appendChild(button);
        },
        addToolbarMenu : function(options, onchange, toolbarID) {
            var menu = document.createElement('select');
            menu.className = 'sandcastle-button';
            menu.onchange = onchange;
            document.getElementById(toolbarID || 'toolbar').appendChild(menu);

            for (var i = 0, len = options.length; i < len; ++i) {
                var option = document.createElement('option');
                option.textContent = options[i].text;
                option.value = options[i].value;
                menu.appendChild(option);
            }
        }
    };

    if (window.location.protocol === 'file:') {
        if (window.confirm("You must host this app on a web server.\nSee contributor's guide for more info?")) {
            window.location = 'https://github.com/AnalyticalGraphicsInc/cesium/wiki/Contributor%27s-Guide';
        }
    }
}());
