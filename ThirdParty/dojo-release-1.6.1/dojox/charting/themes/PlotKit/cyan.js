/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.themes.PlotKit.cyan"]){
dojo._hasResource["dojox.charting.themes.PlotKit.cyan"]=true;
dojo.provide("dojox.charting.themes.PlotKit.cyan");
dojo.require("dojox.charting.themes.PlotKit.base");
(function(){
var dc=dojox.charting,pk=dc.themes.PlotKit;
pk.cyan=pk.base.clone();
pk.cyan.chart.fill=pk.cyan.plotarea.fill="#e6f1f5";
pk.cyan.colors=dc.Theme.defineColors({hue:194,saturation:60,low:40,high:88});
})();
}
