dependencies = {
	quiet:1,
	action:"release",
	optimize:0,
	layerOptimize:0,
	insertAbsMids:0,
	copyTests:"build",
	mini:0,
	releaseDir:"../../dojo/tests/_base/loader",
	releaseName:"coolioBuilt",
	scopeMap:[["dojo", "cdojo"], ["dijit", "cdijit"], , ["dojox", "dojox"]],
	layers: [
		{
			name: "dojo.js",
			dependencies: [
				"dojo.main",
				"dojo.parser"
			]
		},{
			customBase:1,
			name: "main.js"
		},{
			name: "../dijit/Calendar.js",
			dependencies: [
				"dijit.Calendar"
			]
		}
	],
	prefixes: [
		["dijit", "../dijit"],
		["dojox", "../dojox"],
		["coolio", "./tests/_base/loader/coolio"]
	]
}