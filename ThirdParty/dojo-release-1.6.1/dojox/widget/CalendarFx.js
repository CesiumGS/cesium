/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.CalendarFx"]){
dojo._hasResource["dojox.widget.CalendarFx"]=true;
dojo.provide("dojox.widget.CalendarFx");
dojo.require("dojox.widget.FisheyeLite");
dojo.declare("dojox.widget._FisheyeFX",null,{addFx:function(_1,_2){
dojo.query(_1,_2).forEach(function(_3){
new dojox.widget.FisheyeLite({properties:{fontSize:1.1}},_3);
});
}});
dojo.declare("dojox.widget.CalendarFisheye",[dojox.widget.Calendar,dojox.widget._FisheyeFX],{});
}
