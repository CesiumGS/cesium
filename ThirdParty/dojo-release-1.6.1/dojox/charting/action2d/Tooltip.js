/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.action2d.Tooltip"]){
dojo._hasResource["dojox.charting.action2d.Tooltip"]=true;
dojo.provide("dojox.charting.action2d.Tooltip");
dojo.require("dijit.Tooltip");
dojo.require("dojox.charting.action2d.Base");
dojo.require("dojox.gfx.matrix");
dojo.require("dojox.lang.functional");
dojo.require("dojox.lang.functional.scan");
dojo.require("dojox.lang.functional.fold");
(function(){
var _1=function(o){
var t=o.run&&o.run.data&&o.run.data[o.index];
if(t&&typeof t!="number"&&(t.tooltip||t.text)){
return t.tooltip||t.text;
}
if(o.element=="candlestick"){
return "<table cellpadding=\"1\" cellspacing=\"0\" border=\"0\" style=\"font-size:0.9em;\">"+"<tr><td>Open:</td><td align=\"right\"><strong>"+o.data.open+"</strong></td></tr>"+"<tr><td>High:</td><td align=\"right\"><strong>"+o.data.high+"</strong></td></tr>"+"<tr><td>Low:</td><td align=\"right\"><strong>"+o.data.low+"</strong></td></tr>"+"<tr><td>Close:</td><td align=\"right\"><strong>"+o.data.close+"</strong></td></tr>"+(o.data.mid!==undefined?"<tr><td>Mid:</td><td align=\"right\"><strong>"+o.data.mid+"</strong></td></tr>":"")+"</table>";
}
return o.element=="bar"?o.x:o.y;
};
var df=dojox.lang.functional,m=dojox.gfx.matrix,_2=Math.PI/4,_3=Math.PI/2;
dojo.declare("dojox.charting.action2d.Tooltip",dojox.charting.action2d.Base,{defaultParams:{text:_1},optionalParams:{},constructor:function(_4,_5,_6){
this.text=_6&&_6.text?_6.text:_1;
this.connect();
},process:function(o){
if(o.type==="onplotreset"||o.type==="onmouseout"){
dijit.hideTooltip(this.aroundRect);
this.aroundRect=null;
if(o.type==="onplotreset"){
delete this.angles;
}
return;
}
if(!o.shape||o.type!=="onmouseover"){
return;
}
var _7={type:"rect"},_8=["after","before"];
switch(o.element){
case "marker":
_7.x=o.cx;
_7.y=o.cy;
_7.width=_7.height=1;
break;
case "circle":
_7.x=o.cx-o.cr;
_7.y=o.cy-o.cr;
_7.width=_7.height=2*o.cr;
break;
case "column":
_8=["above","below"];
case "bar":
_7=dojo.clone(o.shape.getShape());
break;
case "candlestick":
_7.x=o.x;
_7.y=o.y;
_7.width=o.width;
_7.height=o.height;
break;
default:
if(!this.angles){
if(typeof o.run.data[0]=="number"){
this.angles=df.map(df.scanl(o.run.data,"+",0),"* 2 * Math.PI / this",df.foldl(o.run.data,"+",0));
}else{
this.angles=df.map(df.scanl(o.run.data,"a + b.y",0),"* 2 * Math.PI / this",df.foldl(o.run.data,"a + b.y",0));
}
}
var _9=m._degToRad(o.plot.opt.startAngle),_a=(this.angles[o.index]+this.angles[o.index+1])/2+_9;
_7.x=o.cx+o.cr*Math.cos(_a);
_7.y=o.cy+o.cr*Math.sin(_a);
_7.width=_7.height=1;
if(_a<_2){
}else{
if(_a<_3+_2){
_8=["below","above"];
}else{
if(_a<Math.PI+_2){
_8=["before","after"];
}else{
if(_a<2*Math.PI-_2){
_8=["above","below"];
}
}
}
}
break;
}
var lt=dojo.coords(this.chart.node,true);
_7.x+=lt.x;
_7.y+=lt.y;
_7.x=Math.round(_7.x);
_7.y=Math.round(_7.y);
_7.width=Math.ceil(_7.width);
_7.height=Math.ceil(_7.height);
this.aroundRect=_7;
var _b=this.text(o);
if(_b){
dijit.showTooltip(_b,this.aroundRect,_8);
}
}});
})();
}
