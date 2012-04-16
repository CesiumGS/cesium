/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.themes.Tufte"]){
dojo._hasResource["dojox.charting.themes.Tufte"]=true;
dojo.provide("dojox.charting.themes.Tufte");
dojo.require("dojox.charting.Theme");
dojox.charting.themes.Tufte=new dojox.charting.Theme({chart:{stroke:null,fill:"inherit"},plotarea:{stroke:null,fill:"transparent"},axis:{stroke:{width:1,color:"#ccc"},majorTick:{color:"black",width:1,length:5},minorTick:{color:"#666",width:1,length:2},font:"normal normal normal 8pt Tahoma",fontColor:"#999"},series:{outline:null,stroke:{width:1,color:"black"},fill:new dojo.Color([59,68,75,0.85]),font:"normal normal normal 7pt Tahoma",fontColor:"#717171"},marker:{stroke:{width:1,color:"black"},fill:"#333",font:"normal normal normal 7pt Tahoma",fontColor:"black"},colors:[dojo.colorFromHex("#8a8c8f"),dojo.colorFromHex("#4b4b4b"),dojo.colorFromHex("#3b444b"),dojo.colorFromHex("#2e2d30"),dojo.colorFromHex("#000000")]});
}
