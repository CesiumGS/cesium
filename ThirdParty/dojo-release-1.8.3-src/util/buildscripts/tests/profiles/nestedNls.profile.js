var dependencies = {
  prefixes: [
    [ "foo", "../util/buildscripts/tests/foo" ],
    [ "dojox", "../dojox" ],
    [ "dijit", "../dijit" ]
  ],
  layers: [
    {
      name: "../dijit/dijit.js",
      resourceName: "dijit.dijit",
      layerDependencies: [ "dojo.js" ],
      dependencies: [ "dijit.dijit" ]
    },
    {
      name: "../foo/page/view.js",
      resourceName: "foo.page.view",
      layerDependencies: [ "dojo.js", "../dijit/dijit.js" ],
      dependencies: [ "foo.page.view" ]
    }
  ]
};