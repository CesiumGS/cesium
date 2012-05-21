dependencies = {
	layers: [
		{
			// This is a specially named layer, literally 'dojo.js'
			// adding dependencies to this layer will include the modules
			// in addition to the standard dojo.js base APIs.
			name: "dojo.js",
			dependencies: [
				"dijit._Widget",
				"dijit._Templated",
				"dojo.fx",
				"dojo.NodeList-fx"
			]
		}
	],

	prefixes: [
		[ "dijit", "../dijit" ],
		[ "dojox", "../dojox" ]
	]
}
