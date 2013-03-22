dependencies = {
	stripConsole: "normal",

	layers: [
		{
			name: "dojo.js",
			customBase: true,
			dependencies: [
				"dojox.mobile.parser",
				"dojox.mobile",
				"dojox.mobile.compat"
			]
		},
		{
			name: "../dojox/mobile/_compat.js",
			layerDependencies: [
				"dojo.js"
			],
			dependencies: [
				"dojox.mobile._compat"
			]
		}
	],

	prefixes: [
		[ "dijit", "../dijit" ],
		[ "dojox", "../dojox" ]
	]
}
