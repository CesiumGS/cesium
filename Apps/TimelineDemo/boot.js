require({
  baseUrl: "../..",
  packages: [
    {
      name: "dojo",
      location: "ThirdParty/dojo-release-1.10.4/dojo",
    },
    {
      name: "dijit",
      location: "ThirdParty/dojo-release-1.10.4/dijit",
    },
    {
      name: "TimelineDemo",
      location: "Apps/TimelineDemo",
    },
  ],
}, [
  "dojo/_base/window",
  "dojo/dom-class",
  "dojo/parser",
  "dojo/date/stamp",
  "dijit/form/Button",
  "dijit/Calendar",
  "dijit/form/TimeTextBox",
  "dijit/form/ComboButton",
  "dijit/Menu",
  "dijit/MenuItem",
  "TimelineDemo/TimelineDemo",
  "dojo/domReady!",
], function (win, domClass, parser) {
  "use strict";

  parser.parse();
  domClass.remove(win.body(), "loading");
});
