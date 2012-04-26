/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.themes.PlotKit.purple"]){
dojo._hasResource["dojox.charting.themes.PlotKit.purple"]=true;
dojo.provide("dojox.charting.themes.PlotKit.purple");
dojo.require("dojox.charting.themes.PlotKit.base");
(function(){
var dc=dojox.charting,pk=dc.themes.PlotKit;
pk.purple=pk.base.clone();
pk.purple.chart.fill=pk.purple.plotarea.fill="#eee6f5";
pk.purple.colors=dc.Theme.defineColors({hue:271,saturation:60,low:40,high:88});
})();
}
