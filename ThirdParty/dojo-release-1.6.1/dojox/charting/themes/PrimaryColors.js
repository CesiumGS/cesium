/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.themes.PrimaryColors"]){
dojo._hasResource["dojox.charting.themes.PrimaryColors"]=true;
dojo.provide("dojox.charting.themes.PrimaryColors");
dojo.require("dojox.charting.Theme");
dojo.require("dojox.charting.themes.gradientGenerator");
(function(){
var dc=dojox.charting,_1=dc.themes,_2=["#f00","#0f0","#00f","#ff0","#0ff","#f0f"],_3={type:"linear",space:"plot",x1:0,y1:0,x2:0,y2:100};
_1.PrimaryColors=new dc.Theme({seriesThemes:_1.gradientGenerator.generateMiniTheme(_2,_3,90,40,25)});
})();
}
