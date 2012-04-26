/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.themes.Tom"]){
dojo._hasResource["dojox.charting.themes.Tom"]=true;
dojo.provide("dojox.charting.themes.Tom");
dojo.require("dojox.gfx.gradutils");
dojo.require("dojox.charting.Theme");
(function(){
var dc=dojox.charting,_1=dc.themes,_2=dc.Theme,g=_2.generateGradient,_3={type:"linear",space:"shape",x1:0,y1:0,x2:0,y2:100};
_1.Tom=new dc.Theme({chart:{fill:"#181818",stroke:{color:"#181818"},pageStyle:{backgroundColor:"#181818",backgroundImage:"none",color:"#eaf2cb"}},plotarea:{fill:"#181818"},axis:{stroke:{color:"#a0a68b",width:1},tick:{color:"#888c76",position:"center",font:"normal normal normal 7pt Helvetica, Arial, sans-serif",fontColor:"#888c76"}},series:{stroke:{width:2.5,color:"#eaf2cb"},outline:null,font:"normal normal normal 8pt Helvetica, Arial, sans-serif",fontColor:"#eaf2cb"},marker:{stroke:{width:1.25,color:"#eaf2cb"},outline:{width:1.25,color:"#eaf2cb"},font:"normal normal normal 8pt Helvetica, Arial, sans-serif",fontColor:"#eaf2cb"},seriesThemes:[{fill:g(_3,"#bf9e0a","#ecc20c")},{fill:g(_3,"#73b086","#95e5af")},{fill:g(_3,"#c7212d","#ed2835")},{fill:g(_3,"#87ab41","#b6e557")},{fill:g(_3,"#b86c25","#d37d2a")}],markerThemes:[{fill:"#bf9e0a",stroke:{color:"#ecc20c"}},{fill:"#73b086",stroke:{color:"#95e5af"}},{fill:"#c7212d",stroke:{color:"#ed2835"}},{fill:"#87ab41",stroke:{color:"#b6e557"}},{fill:"#b86c25",stroke:{color:"#d37d2a"}}]});
_1.Tom.next=function(_4,_5,_6){
var _7=_4=="line";
if(_7||_4=="area"){
var s=this.seriesThemes[this._current%this.seriesThemes.length];
s.fill.space="plot";
if(_7){
s.stroke={width:4,color:s.fill.colors[0].color};
}
var _8=_2.prototype.next.apply(this,arguments);
delete s.outline;
delete s.stroke;
s.fill.space="shape";
return _8;
}
return _2.prototype.next.apply(this,arguments);
};
_1.Tom.post=function(_9,_a){
_9=_2.prototype.post.apply(this,arguments);
if((_a=="slice"||_a=="circle")&&_9.series.fill&&_9.series.fill.type=="radial"){
_9.series.fill=dojox.gfx.gradutils.reverse(_9.series.fill);
}
return _9;
};
})();
}
