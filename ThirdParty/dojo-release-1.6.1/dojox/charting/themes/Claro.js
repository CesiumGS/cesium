/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.themes.Claro"]){
dojo._hasResource["dojox.charting.themes.Claro"]=true;
dojo.provide("dojox.charting.themes.Claro");
dojo.require("dojox.gfx.gradutils");
dojo.require("dojox.charting.Theme");
(function(){
var dc=dojox.charting,_1=dc.themes,_2=dc.Theme,g=_2.generateGradient,_3={type:"linear",space:"shape",x1:0,y1:0,x2:0,y2:100};
_1.Claro=new dc.Theme({chart:{fill:{type:"linear",x1:0,x2:0,y1:0,y2:100,colors:[{offset:0,color:"#dbdbdb"},{offset:1,color:"#efefef"}]},stroke:{color:"#b5bcc7"}},plotarea:{fill:{type:"linear",x1:0,x2:0,y1:0,y2:100,colors:[{offset:0,color:"#dbdbdb"},{offset:1,color:"#efefef"}]}},axis:{stroke:{color:"#888c76",width:1},tick:{color:"#888c76",position:"center",font:"normal normal normal 7pt Verdana, Arial, sans-serif",fontColor:"#888c76"}},series:{stroke:{width:2.5,color:"#fff"},outline:null,font:"normal normal normal 7pt Verdana, Arial, sans-serif",fontColor:"#131313"},marker:{stroke:{width:1.25,color:"#131313"},outline:{width:1.25,color:"#131313"},font:"normal normal normal 8pt Verdana, Arial, sans-serif",fontColor:"#131313"},seriesThemes:[{fill:g(_3,"#2a6ead","#3a99f2")},{fill:g(_3,"#613e04","#996106")},{fill:g(_3,"#0e3961","#155896")},{fill:g(_3,"#55aafa","#3f7fba")},{fill:g(_3,"#ad7b2a","#db9b35")}],markerThemes:[{fill:"#2a6ead",stroke:{color:"#fff"}},{fill:"#613e04",stroke:{color:"#fff"}},{fill:"#0e3961",stroke:{color:"#fff"}},{fill:"#55aafa",stroke:{color:"#fff"}},{fill:"#ad7b2a",stroke:{color:"#fff"}}]});
_1.Claro.next=function(_4,_5,_6){
var _7=_4=="line";
if(_7||_4=="area"){
var s=this.seriesThemes[this._current%this.seriesThemes.length],m=this.markerThemes[this._current%this.markerThemes.length];
s.fill.space="plot";
if(_7){
s.stroke={width:4,color:s.fill.colors[0].color};
}
m.outline={width:1.25,color:m.fill};
var _8=_2.prototype.next.apply(this,arguments);
delete s.outline;
delete s.stroke;
s.fill.space="shape";
return _8;
}else{
if(_4=="candlestick"){
var s=this.seriesThemes[this._current%this.seriesThemes.length];
s.fill.space="plot";
s.stroke={width:1,color:s.fill.colors[0].color};
var _8=_2.prototype.next.apply(this,arguments);
return _8;
}
}
return _2.prototype.next.apply(this,arguments);
};
_1.Claro.post=function(_9,_a){
_9=_2.prototype.post.apply(this,arguments);
if((_a=="slice"||_a=="circle")&&_9.series.fill&&_9.series.fill.type=="radial"){
_9.series.fill=dojox.gfx.gradutils.reverse(_9.series.fill);
}
return _9;
};
})();
}
