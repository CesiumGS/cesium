dependencies = {
	//Strip all console.* calls except console.warn and console.error. This is basically a work-around
	//for trac issue: http://bugs.dojotoolkit.org/ticket/6849 where Safari 3's console.debug seems
	//to be flaky to set up (apparently fixed in a webkit nightly).
	//But in general for a build, console.warn/error should be the only things to survive anyway.
	stripConsole: "normal",

	selectorEngine:"acme",

	layers: [
		{
			name: "dojo.js",
			dependencies: [
				"dojo.loadInit",
				"dojo.text",
				"dojo.i18n"
			]
		},
		{
			name: "../dijit/dijit.js",
			dependencies: [
				"dijit.dijit"
			]
		},
		{
			name: "../dijit/dijit-all.js",
			layerDependencies: [
				"../dijit/dijit.js"
			],
			dependencies: [
				"dijit.dijit-all"
			]
		},
		{
			name: "../dojox/grid/DataGrid.js",
			dependencies: [
				"dojox.grid.DataGrid"
			]
		},
		{
			name: "../dojox/gfx.js",
			dependencies: [
				"dojox.gfx"
			]
		},
		// FIXME:
		//		we probably need a better structure for this layer and need to
		//		add some of the most common themes
		{
			name: "../dojox/charting/widget/Chart2D.js",
			dependencies: [
				"dojox.charting.widget.Chart2D",
				"dojox.charting.widget.Sparkline",
				"dojox.charting.widget.Legend"
			]
		},
		{
			name: "../dojox/dtl.js",
			dependencies: [
				"dojox.dtl",
				"dojox.dtl.Context",
				"dojox.dtl.tag.logic",
				"dojox.dtl.tag.loop",
				"dojox.dtl.tag.date",
				"dojox.dtl.tag.loader",
				"dojox.dtl.tag.misc",
				"dojox.dtl.ext-dojo.NodeList"
			]
		},
		{
			name: "../dojox/mobile.js",
			dependencies: [
				"dojox.mobile"
			]
		},
		{
			name: "../dojox/mobile/app.js",
			dependencies: [
				"dojox.mobile.app"
			]
		},
		{
			name: "../dojox/mobile/compat.js",
			dependencies: [
				"dojox.mobile.compat"
			]
		},
		{
			name: "../dojox/mobile/app/compat.js",
			dependencies: [
				"dojox.mobile.app.compat"
			]
		}
	],

	prefixes: [
		[ "dijit", "../dijit" ],
		[ "dojox", "../dojox" ]
	]
}
