/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.plot2d.StackedLines"]){
dojo._hasResource["dojox.charting.plot2d.StackedLines"]=true;
dojo.provide("dojox.charting.plot2d.StackedLines");
dojo.require("dojox.charting.plot2d.Stacked");
dojo.declare("dojox.charting.plot2d.StackedLines",dojox.charting.plot2d.Stacked,{constructor:function(){
this.opt.lines=true;
}});
}
