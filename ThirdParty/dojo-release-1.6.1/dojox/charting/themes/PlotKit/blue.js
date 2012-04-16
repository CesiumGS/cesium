/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.themes.PlotKit.blue"]){
dojo._hasResource["dojox.charting.themes.PlotKit.blue"]=true;
dojo.provide("dojox.charting.themes.PlotKit.blue");
dojo.require("dojox.charting.themes.PlotKit.base");
(function(){
var dc=dojox.charting,pk=dc.themes.PlotKit;
pk.blue=pk.base.clone();
pk.blue.chart.fill=pk.blue.plotarea.fill="#e7eef6";
pk.blue.colors=dc.Theme.defineColors({hue:217,saturation:60,low:40,high:88});
})();
}
