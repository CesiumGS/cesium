(function() {
    'use strict';

    var defaultAction;
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
            window.Sandcastle.reset();

            if(defaultAction) {
                window.Sandcastle.highlight(defaultAction);
                defaultAction();
                defaultAction = undefined;
            }

            document.body.className = document.body.className.replace(/(?:\s|^)sandcastle-loading(?:\s|$)/, ' ');
        },
        addToggleButton : function(text, checked, onchange, toolbarID) {
            window.Sandcastle.declare(onchange);
            var input = document.createElement('input');
            input.checked = checked;
            input.type = 'checkbox';
            input.style.pointerEvents = 'none';
            var label = document.createElement('label');
            label.appendChild(input);
            label.appendChild(document.createTextNode(text));
            label.style.pointerEvents = 'none';
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'cesium-button';
            button.appendChild(label);

            button.onclick = function() {
                window.Sandcastle.reset();
                window.Sandcastle.highlight(onchange);
                input.checked = !input.checked;
                onchange(input.checked);
            };

            document.getElementById(toolbarID || 'toolbar').appendChild(button);
        },
        addToolbarButton : function(text, onclick, toolbarID) {
            window.Sandcastle.declare(onclick);
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'cesium-button';
            button.onclick = function() {
                window.Sandcastle.reset();
                window.Sandcastle.highlight(onclick);
                onclick();
            };
            button.textContent = text;
            document.getElementById(toolbarID || 'toolbar').appendChild(button);
        },
        addSlider : function(text, options, onChange, toolbarID){
            var div = document.createElement('div');
            div.stylemargin = '2px 3px';
            var label = document.createElement('div');

            label.textContent = text;
            label.style['font-size'] = '13px';
            label.style.width = '85px';
            label.style.display = 'inline-block';
            label.style.color = '#edffff';

            var min = typeof options.minimum === 'number' ? options.minimum : 0.0;
            var max = typeof options.maximum === 'number' ? options.maximum : 100.0;
            var step = typeof options.stepSize === 'number' ? options.stepSize : 1.0;
            var value = typeof options.value === 'number' ? options.value : min;

            var range = document.createElement('input');
            range.type = 'range';
            range.min = min;
            range.max = max;
            range.step = step;
            range.value = value;

            var textbox = document.createElement('input');
            textbox.type = 'number';
            textbox.min = min;
            textbox.max = max;
            textbox.step = step;
            textbox.value = value;
            textbox.style['margin-left'] = '3px';
            textbox.style['width'] = '55px';

            range.oninput = function(){
                var v = range.value;
                textbox.value = v;
                onChange(Number(v));
            };

            textbox.oninput = function() {
                var v = textbox.value;
                range.value = v;
                onChange(Number(v));
            };

            div.appendChild(label);
            div.appendChild(range);
            div.appendChild(textbox);

            document.getElementById(toolbarID || 'toolbar').appendChild(div);
        },
        addDefaultToolbarButton : function(text, onclick, toolbarID) {
            window.Sandcastle.addToolbarButton(text, onclick, toolbarID);
            defaultAction = onclick;
        },
        addDefaultToolbarMenu : function(options, toolbarID) {
            window.Sandcastle.addToolbarMenu(options, toolbarID);
            defaultAction = options[0].onselect;
        },
        addToolbarMenu : function(options, toolbarID) {
            var menu = document.createElement('select');
            menu.className = 'cesium-button';
            menu.onchange = function() {
                window.Sandcastle.reset();
                var item = options[menu.selectedIndex];
                if (item && typeof item.onselect === 'function') {
                    item.onselect();
                }
            };
            document.getElementById(toolbarID || 'toolbar').appendChild(menu);

            if (!defaultAction && typeof options[0].onselect === 'function') {
                defaultAction = options[0].onselect;
            }

            for (var i = 0, len = options.length; i < len; ++i) {
                var option = document.createElement('option');
                option.textContent = options[i].text;
                option.value = options[i].value;
                menu.appendChild(option);
            }
        },
        reset : function() {
        }
    };

    if (window.location.protocol === 'file:') {
        if (window.confirm("You must host this app on a web server.\nSee contributor's guide for more info?")) {
            window.location = 'https://github.com/AnalyticalGraphicsInc/cesium/wiki/Contributor%27s-Guide';
        }
    }
}());
