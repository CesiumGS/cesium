dependencies = {
	action:"clean,release",
	optimize:"shrinksafe",
	stripConsole: "normal",
	layers: [{
		name: "dojo.js",
		dependencies: [
		"dojo.colors",
		"dojox.gfx",
		"dojox.gfx.util",
		"dojox.fx",
		"dojox.gfx.renderer",
		"dojox.gfx.svg_attach",
		"dojox.gfx.vml_attach",
		"dojox.gfx.silverlight_attach",
		"dojox.gfx.canvas_attach",
		"dojox.gfx.canvasWithEvents",
		"dojox.gfx.gradutils",
		"dojox.gfx.VectorText",
		"dojox.gfx.move"]}
	],
	prefixes: [
		[ "dijit", "../dijit" ],
		[ "dojox", "../dojox" ]
	]
}
