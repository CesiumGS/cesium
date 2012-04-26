/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.themes.PlotKit.red"]){
dojo._hasResource["dojox.charting.themes.PlotKit.red"]=true;
dojo.provide("dojox.charting.themes.PlotKit.red");
dojo.require("dojox.charting.themes.PlotKit.base");
(function(){
var dc=dojox.charting,pk=dc.themes.PlotKit;
pk.red=pk.base.clone();
pk.red.chart.fill=pk.red.plotarea.fill="#f5e6e6";
pk.red.colors=dc.Theme.defineColors({hue:1,saturation:60,low:40,high:88});
})();
}
