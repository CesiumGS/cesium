dependencies = {
	layers: [
		{
			name: "../dojox/storage/storage-browser.js",
			layerDependencies: [
			],
			dependencies: [
				"dojox.storage",
				"dojox.storage.GearsStorageProvider",
				"dojox.storage.WhatWGStorageProvider",
				"dojox.storage.FlashStorageProvider",
				"dojox.flash"
			]
		}
	],

	prefixes: [
		[ "dijit", "../dijit" ],
		[ "dojox", "../dojox" ]
	]
}
