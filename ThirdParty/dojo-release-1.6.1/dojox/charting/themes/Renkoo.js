/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.themes.Renkoo"]){
dojo._hasResource["dojox.charting.themes.Renkoo"]=true;
dojo.provide("dojox.charting.themes.Renkoo");
dojo.require("dojox.gfx.gradutils");
dojo.require("dojox.charting.Theme");
(function(){
var dc=dojox.charting,_1=dc.themes,_2=dc.Theme,g=_2.generateGradient,_3={type:"linear",space:"shape",x1:0,y1:0,x2:0,y2:150};
_1.Renkoo=new dc.Theme({chart:{fill:"#123666",pageStyle:{backgroundColor:"#123666",backgroundImage:"none",color:"#95afdb"}},plotarea:{fill:"#123666"},axis:{stroke:{color:"#95afdb",width:1},tick:{color:"#95afdb",position:"center",font:"normal normal normal 7pt Lucida Grande, Helvetica, Arial, sans-serif",fontColor:"#95afdb"}},series:{stroke:{width:2.5,color:"#123666"},outline:null,font:"normal normal normal 8pt Lucida Grande, Helvetica, Arial, sans-serif",fontColor:"#95afdb"},marker:{stroke:{width:2.5,color:"#ccc"},outline:null,font:"normal normal normal 8pt Lucida Grande, Helvetica, Arial, sans-serif",fontColor:"#95afdb"},seriesThemes:[{fill:g(_3,"#e7e391","#f8f7de")},{fill:g(_3,"#ffb6b6","#ffe8e8")},{fill:g(_3,"#bcda7d","#eef7da")},{fill:g(_3,"#d5d5d5","#f4f4f4")},{fill:g(_3,"#c1e3fd","#e4f3ff")}],markerThemes:[{fill:"#fcfcf3",stroke:{color:"#e7e391"}},{fill:"#fff1f1",stroke:{color:"#ffb6b6"}},{fill:"#fafdf4",stroke:{color:"#bcda7d"}},{fill:"#fbfbfb",stroke:{color:"#d5d5d5"}},{fill:"#f3faff",stroke:{color:"#c1e3fd"}}]});
_1.Renkoo.next=function(_4,_5,_6){
if("slice,column,bar".indexOf(_4)==-1){
var s=this.seriesThemes[this._current%this.seriesThemes.length];
s.fill.space="plot";
s.stroke={width:2,color:s.fill.colors[0].color};
if(_4=="line"||_4=="area"){
s.stroke.width=4;
}
var _7=_2.prototype.next.apply(this,arguments);
delete s.stroke;
s.fill.space="shape";
return _7;
}
return _2.prototype.next.apply(this,arguments);
};
_1.Renkoo.post=function(_8,_9){
_8=_2.prototype.post.apply(this,arguments);
if((_9=="slice"||_9=="circle")&&_8.series.fill&&_8.series.fill.type=="radial"){
_8.series.fill=dojox.gfx.gradutils.reverse(_8.series.fill);
}
return _8;
};
})();
}
