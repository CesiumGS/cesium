define(["dojo/_base/kernel", "dojo/_base/lang", "..", "./Chart",
	"./axis2d/Default", "./axis2d/Invisible", "./plot2d/Default", "./plot2d/Lines", "./plot2d/Areas",
	"./plot2d/Markers", "./plot2d/MarkersOnly", "./plot2d/Scatter", "./plot2d/Stacked", "./plot2d/StackedLines",
	"./plot2d/StackedAreas", "./plot2d/Columns", "./plot2d/StackedColumns", "./plot2d/ClusteredColumns",
	"./plot2d/Bars", "./plot2d/StackedBars", "./plot2d/ClusteredBars", "./plot2d/Grid", "./plot2d/Pie",
	"./plot2d/Bubble", "./plot2d/Candlesticks", "./plot2d/OHLC", "./plot2d/Spider"], 
	  function(kernel, lang, dojox, Chart){
	kernel.deprecated("dojox.charting.Chart2D", "Use dojox.charting.Chart instead and require all other components explicitly", "2.0");
	// module:
	//		dojox/charting/Chart2D
	// summary:
	//		This is a compatibility module which loads all charting modules that used to be automatically
	//		loaded in versions prior to 1.6.  It is highly recommended for performance reasons that
	//		this module no longer be referenced by applications.  Instead, use dojox/charting/Chart.
	return lang.setObject("dojox.charting.Chart2D", Chart);
});
