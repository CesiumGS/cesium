/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.charting.widget.Legend"]){
dojo._hasResource["dojox.charting.widget.Legend"]=true;
dojo.provide("dojox.charting.widget.Legend");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojox.lang.functional.array");
dojo.require("dojox.lang.functional.fold");
dojo.declare("dojox.charting.widget.Legend",[dijit._Widget,dijit._Templated],{chartRef:"",horizontal:true,swatchSize:18,templateString:"<table dojoAttachPoint='legendNode' class='dojoxLegendNode' role='group' aria-label='chart legend'><tbody dojoAttachPoint='legendBody'></tbody></table>",legendNode:null,legendBody:null,postCreate:function(){
if(!this.chart){
if(!this.chartRef){
return;
}
this.chart=dijit.byId(this.chartRef);
if(!this.chart){
var _1=dojo.byId(this.chartRef);
if(_1){
this.chart=dijit.byNode(_1);
}else{
return;
}
}
this.series=this.chart.chart.series;
}else{
this.series=this.chart.series;
}
this.refresh();
},refresh:function(){
var df=dojox.lang.functional;
if(this._surfaces){
dojo.forEach(this._surfaces,function(_2){
_2.destroy();
});
}
this._surfaces=[];
while(this.legendBody.lastChild){
dojo.destroy(this.legendBody.lastChild);
}
if(this.horizontal){
dojo.addClass(this.legendNode,"dojoxLegendHorizontal");
this._tr=dojo.create("tr",null,this.legendBody);
this._inrow=0;
}
var s=this.series;
if(s.length==0){
return;
}
if(s[0].chart.stack[0].declaredClass=="dojox.charting.plot2d.Pie"){
var t=s[0].chart.stack[0];
if(typeof t.run.data[0]=="number"){
var _3=df.map(t.run.data,"Math.max(x, 0)");
if(df.every(_3,"<= 0")){
return;
}
var _4=df.map(_3,"/this",df.foldl(_3,"+",0));
dojo.forEach(_4,function(x,i){
this._addLabel(t.dyn[i],t._getLabel(x*100)+"%");
},this);
}else{
dojo.forEach(t.run.data,function(x,i){
this._addLabel(t.dyn[i],x.legend||x.text||x.y);
},this);
}
}else{
dojo.forEach(s,function(x){
this._addLabel(x.dyn,x.legend||x.name);
},this);
}
},_addLabel:function(_5,_6){
var _7=dojo.create("td"),_8=dojo.create("div",null,_7),_9=dojo.create("label",null,_7),_a=dojo.create("div",{style:{"width":this.swatchSize+"px","height":this.swatchSize+"px","float":"left"}},_8);
dojo.addClass(_8,"dojoxLegendIcon dijitInline");
dojo.addClass(_9,"dojoxLegendText");
if(this._tr){
this._tr.appendChild(_7);
if(++this._inrow===this.horizontal){
this._tr=dojo.create("tr",null,this.legendBody);
this._inrow=0;
}
}else{
var tr=dojo.create("tr",null,this.legendBody);
tr.appendChild(_7);
}
this._makeIcon(_a,_5);
_9.innerHTML=String(_6);
},_makeIcon:function(_b,_c){
var mb={h:this.swatchSize,w:this.swatchSize};
var _d=dojox.gfx.createSurface(_b,mb.w,mb.h);
this._surfaces.push(_d);
if(_c.fill){
_d.createRect({x:2,y:2,width:mb.w-4,height:mb.h-4}).setFill(_c.fill).setStroke(_c.stroke);
}else{
if(_c.stroke||_c.marker){
var _e={x1:0,y1:mb.h/2,x2:mb.w,y2:mb.h/2};
if(_c.stroke){
_d.createLine(_e).setStroke(_c.stroke);
}
if(_c.marker){
var c={x:mb.w/2,y:mb.h/2};
if(_c.stroke){
_d.createPath({path:"M"+c.x+" "+c.y+" "+_c.marker}).setFill(_c.stroke.color).setStroke(_c.stroke);
}else{
_d.createPath({path:"M"+c.x+" "+c.y+" "+_c.marker}).setFill(_c.color).setStroke(_c.color);
}
}
}else{
_d.createRect({x:2,y:2,width:mb.w-4,height:mb.h-4}).setStroke("black");
_d.createLine({x1:2,y1:2,x2:mb.w-2,y2:mb.h-2}).setStroke("black");
_d.createLine({x1:2,y1:mb.h-2,x2:mb.w-2,y2:2}).setStroke("black");
}
}
}});
}
