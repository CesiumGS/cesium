dependencies = {
	//This option configures dojox.storage to just include the Gears
	//storage provider for an offline use.
	dojoxStorageBuildOption: "offline",

	layers: [
		{
			name: "../dojox/sql.js",
			layerDependencies: [
			],
			dependencies: [
				"dojox.sql"
			]
		}
	],

	prefixes: [
		[ "dijit", "../dijit" ],
		[ "dojox", "../dojox" ]
	]
}
