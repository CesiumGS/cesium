dependencies = {
	stripConsole: "normal",
	layers: [
		{
			name: "dojo.js",
			dependencies: [
				"dijit._WidgetBase",
				"dijit._Container",
				"dijit._Contained",
				"dijit.registry"
			]
		},
		{
			name: "../dojox/mobile.js",
			layerDependencies: [
				"dojo.js"
			],
			dependencies: [
				"dojox.mobile",
				"dojox.mobile.compat"
			]
		},
		{
			name: "../dojox/mobile/app.js",
			layerDependencies: [
				"dojo.js",
				"../dojox/mobile.js"
			],
			dependencies: [
				"dojox.mobile.app"
			]
		},
		{
			name: "../dojox/mobile/_compat.js",
			layerDependencies: [
				"dojo.js",
				"../dojox/mobile.js"
			],
			dependencies: [
				"dojox.mobile._compat"
			]
		},
		{
			name: "../dojox/mobile/app/compat.js",
			layerDependencies: [
				"dojo.js",
				"../dojox/mobile/_compat.js",
				"../dojox/mobile/app.js"
			],
			dependencies: [
				"dojox.mobile.app.compat"
			]
		}
	],

	plugins: { // workaround to exclude acme.js from the build (until #13198 is fixed)
		"dojo/text":"build/plugins/text",
		"dojo/i18n":"build/plugins/i18n",
		"dojo/has":"build/plugins/has"
	},

	prefixes: [
		[ "dijit", "../dijit" ],
		[ "dojox", "../dojox" ]
	]
}
