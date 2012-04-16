/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.plot2d.MarkersOnly"]){
dojo._hasResource["dojox.charting.plot2d.MarkersOnly"]=true;
dojo.provide("dojox.charting.plot2d.MarkersOnly");
dojo.require("dojox.charting.plot2d.Default");
dojo.declare("dojox.charting.plot2d.MarkersOnly",dojox.charting.plot2d.Default,{constructor:function(){
this.opt.lines=false;
this.opt.markers=true;
}});
}
