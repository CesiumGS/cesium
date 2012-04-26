/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.themes.PlotKit.orange"]){
dojo._hasResource["dojox.charting.themes.PlotKit.orange"]=true;
dojo.provide("dojox.charting.themes.PlotKit.orange");
dojo.require("dojox.charting.themes.PlotKit.base");
(function(){
var dc=dojox.charting,pk=dc.themes.PlotKit;
pk.orange=pk.base.clone();
pk.orange.chart.fill=pk.orange.plotarea.fill="#f5eee6";
pk.orange.colors=dc.Theme.defineColors({hue:31,saturation:60,low:40,high:88});
})();
}
