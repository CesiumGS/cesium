(function () {
  "use strict";

  var defaultActions = [];
  var bucket = window.location.href;
  var pos = bucket.lastIndexOf("/");
  if (pos > 0 && pos < bucket.length - 1) {
    bucket = bucket.substring(pos + 1);
  }

  window.Sandcastle = {
    bucket: bucket,
    declare: function () {},
    highlight: function () {},
    registered: [],
    finishedLoading: function () {
      window.Sandcastle.reset();

      if (defaultActions.length > 0) {
        if (defaultActions.length === 1) {
          window.Sandcastle.highlight(defaultActions[0]);
        }
        for (var i = 0; i < defaultActions.length; i++) {
          defaultActions[i]();
        }
        defaultActions.length = 0;
      }

      document.body.className = document.body.className.replace(
        /(?:\s|^)sandcastle-loading(?:\s|$)/,
        " "
      );
    },
    addToggleButton: function (text, checked, onchange, toolbarID) {
      window.Sandcastle.declare(onchange);
      var input = document.createElement("input");
      input.checked = checked;
      input.type = "checkbox";
      input.style.pointerEvents = "none";
      var label = document.createElement("label");
      label.appendChild(input);
      label.appendChild(document.createTextNode(text));
      label.style.pointerEvents = "none";
      var button = document.createElement("button");
      button.type = "button";
      button.className = "cesium-button";
      button.appendChild(label);

      button.onclick = function () {
        window.Sandcastle.reset();
        window.Sandcastle.highlight(onchange);
        input.checked = !input.checked;
        onchange(input.checked);
      };

      document.getElementById(toolbarID || "toolbar").appendChild(button);
    },
    addDefaultToggleButton: function (text, checked, onchange, toolbarID) {
      window.Sandcastle.addToggleButton(text, checked, onchange, toolbarID);
      defaultActions.push(function () {
        onchange(checked);
      });
    },
    addToolbarButton: function (text, onclick, toolbarID) {
      window.Sandcastle.declare(onclick);
      var button = document.createElement("button");
      button.type = "button";
      button.className = "cesium-button";
      button.onclick = function () {
        window.Sandcastle.reset();
        window.Sandcastle.highlight(onclick);
        onclick();
      };
      button.textContent = text;
      document.getElementById(toolbarID || "toolbar").appendChild(button);
    },
    addDefaultToolbarButton: function (text, onclick, toolbarID) {
      window.Sandcastle.addToolbarButton(text, onclick, toolbarID);
      defaultActions.push(onclick);
    },
    addToolbarMenu: function (options, toolbarID) {
      var menu = document.createElement("select");
      menu.className = "cesium-button";
      menu.onchange = function () {
        window.Sandcastle.reset();
        var item = options[menu.selectedIndex];
        if (item && typeof item.onselect === "function") {
          item.onselect();
        }
      };
      document.getElementById(toolbarID || "toolbar").appendChild(menu);

      for (var i = 0, len = options.length; i < len; ++i) {
        var option = document.createElement("option");
        option.textContent = options[i].text;
        option.value = options[i].value;
        menu.appendChild(option);
      }
    },
    addDefaultToolbarMenu: function (options, toolbarID) {
      window.Sandcastle.addToolbarMenu(options, toolbarID);
      if (typeof options[0].onselect === "function") {
        defaultActions.push(options[0].onselect);
      }
    },
    reset: function () {},
  };

  if (window.location.protocol === "file:") {
    if (
      window.confirm(
        "You must host this app on a web server.\nSee contributor's guide for more info?"
      )
    ) {
      window.location =
        "https://github.com/CesiumGS/cesium/wiki/Contributor%27s-Guide";
    }
  }
})();
