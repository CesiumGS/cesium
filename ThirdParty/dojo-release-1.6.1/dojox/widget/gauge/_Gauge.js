/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.gauge._Gauge"]){
dojo._hasResource["dojox.widget.gauge._Gauge"]=true;
dojo.provide("dojox.widget.gauge._Gauge");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit._Container");
dojo.require("dijit._Contained");
dojo.require("dijit.Tooltip");
dojo.require("dojo.fx.easing");
dojo.require("dojox.gfx");
dojo.experimental("dojox.widget.gauge._Gauge");
dojo.declare("dojox.widget.gauge._Gauge",[dijit._Widget,dijit._Templated,dijit._Container],{width:0,height:0,background:null,min:0,max:0,image:null,useRangeStyles:0,useTooltip:true,majorTicks:null,minorTicks:null,_defaultIndicator:null,defaultColors:[[0,84,170,1],[68,119,187,1],[102,153,204,1],[153,187,238,1],[153,204,255,1],[204,238,255,1],[221,238,255,1]],min:null,max:null,surface:null,hideValues:false,gaugeContent:undefined,templateString:dojo.cache("dojox.widget.gauge","_Gauge.html","<div>\n\t<div class=\"dojoxGaugeContent\" dojoAttachPoint=\"gaugeContent\"></div>\n\t<div dojoAttachPoint=\"containerNode\"></div>\n\t<div dojoAttachPoint=\"mouseNode\"></div>\n</div>\n"),_backgroundDefault:{color:"#E0E0E0"},_rangeData:null,_indicatorData:null,_drag:null,_img:null,_overOverlay:false,_lastHover:"",startup:function(){
if(this.image===null){
this.image={};
}
this.connect(this.gaugeContent,"onmousemove",this.handleMouseMove);
this.connect(this.gaugeContent,"onmouseover",this.handleMouseOver);
this.connect(this.gaugeContent,"onmouseout",this.handleMouseOut);
this.connect(this.gaugeContent,"onmouseup",this.handleMouseUp);
if(!dojo.isArray(this.ranges)){
this.ranges=[];
}
if(!dojo.isArray(this.indicators)){
this.indicators=[];
}
var _1=[],_2=[];
var i;
if(this.hasChildren()){
var _3=this.getChildren();
for(i=0;i<_3.length;i++){
if(/dojox\.widget\..*Indicator/.test(_3[i].declaredClass)){
_2.push(_3[i]);
continue;
}
switch(_3[i].declaredClass){
case "dojox.widget.gauge.Range":
_1.push(_3[i]);
break;
}
}
this.ranges=this.ranges.concat(_1);
this.indicators=this.indicators.concat(_2);
}
if(!this.background){
this.background=this._backgroundDefault;
}
this.background=this.background.color||this.background;
if(!this.surface){
this.createSurface();
}
this.addRanges(this.ranges);
if(this.minorTicks&&this.minorTicks.interval){
this.setMinorTicks(this.minorTicks);
}
if(this.majorTicks&&this.majorTicks.interval){
this.setMajorTicks(this.majorTicks);
}
for(i=0;i<this.indicators.length;i++){
this.addIndicator(this.indicators[i]);
}
},_setTicks:function(_4,_5,_6){
var i;
if(_4&&dojo.isArray(_4._ticks)){
for(i=0;i<_4._ticks.length;i++){
this.removeIndicator(_4._ticks[i]);
}
}
var t={length:_5.length,offset:_5.offset,noChange:true};
if(_5.color){
t.color=_5.color;
}
if(_5.font){
t.font=_5.font;
}
_5._ticks=[];
for(i=this.min;i<=this.max;i+=_5.interval){
t.value=i;
if(_6){
t.label=""+i;
}
_5._ticks.push(this.addIndicator(t));
}
return _5;
},setMinorTicks:function(_7){
this.minorTicks=this._setTicks(this.minorTicks,_7,false);
},setMajorTicks:function(_8){
this.majorTicks=this._setTicks(this.majorTicks,_8,true);
},postCreate:function(){
if(this.hideValues){
dojo.style(this.containerNode,"display","none");
}
dojo.style(this.mouseNode,"width","0");
dojo.style(this.mouseNode,"height","0");
dojo.style(this.mouseNode,"position","absolute");
dojo.style(this.mouseNode,"z-index","100");
if(this.useTooltip){
dijit.showTooltip("test",this.mouseNode,!this.isLeftToRight());
dijit.hideTooltip(this.mouseNode);
}
},createSurface:function(){
this.gaugeContent.style.width=this.width+"px";
this.gaugeContent.style.height=this.height+"px";
this.surface=dojox.gfx.createSurface(this.gaugeContent,this.width,this.height);
this._background=this.surface.createRect({x:0,y:0,width:this.width,height:this.height});
this._background.setFill(this.background);
if(this.image.url){
this._img=this.surface.createImage({width:this.image.width||this.width,height:this.image.height||this.height,src:this.image.url});
if(this.image.overlay){
this._img.getEventSource().setAttribute("overlay",true);
}
if(this.image.x||this.image.y){
this._img.setTransform({dx:this.image.x||0,dy:this.image.y||0});
}
}
},setBackground:function(_9){
if(!_9){
_9=this._backgroundDefault;
}
this.background=_9.color||_9;
this._background.setFill(this.background);
},addRange:function(_a){
this.addRanges([_a]);
},addRanges:function(_b){
if(!this._rangeData){
this._rangeData=[];
}
var _c;
for(var i=0;i<_b.length;i++){
_c=_b[i];
if((this.min===null)||(_c.low<this.min)){
this.min=_c.low;
}
if((this.max===null)||(_c.high>this.max)){
this.max=_c.high;
}
if(!_c.color){
var _d=this._rangeData.length%this.defaultColors.length;
if(dojox.gfx.svg&&this.useRangeStyles>0){
_d=(this._rangeData.length%this.useRangeStyles)+1;
_c.color={style:"dojoxGaugeRange"+_d};
}else{
_d=this._rangeData.length%this.defaultColors.length;
_c.color=this.defaultColors[_d];
}
}
this._rangeData[this._rangeData.length]=_c;
}
this.draw();
},addIndicator:function(_e){
_e._gauge=this;
if(!_e.declaredClass){
_e=new this._defaultIndicator(_e);
}
if(!_e.hideValue){
this.containerNode.appendChild(_e.domNode);
}
if(!this._indicatorData){
this._indicatorData=[];
}
this._indicatorData[this._indicatorData.length]=_e;
_e.draw();
return _e;
},removeIndicator:function(_f){
for(var i=0;i<this._indicatorData.length;i++){
if(this._indicatorData[i]===_f){
this._indicatorData.splice(i,1);
_f.remove();
break;
}
}
},moveIndicatorToFront:function(_10){
if(_10.shapes){
for(var i=0;i<_10.shapes.length;i++){
_10.shapes[i].moveToFront();
}
}
},drawText:function(txt,x,y,_11,_12,_13,_14){
var t=this.surface.createText({x:x,y:y,text:txt,align:_11});
t.setFill(_13);
t.setFont(_14);
return t;
},removeText:function(t){
this.surface.rawNode.removeChild(t);
},updateTooltip:function(txt,e){
if(this._lastHover!=txt){
if(txt!==""){
dijit.hideTooltip(this.mouseNode);
dijit.showTooltip(txt,this.mouseNode,!this.isLeftToRight());
}else{
dijit.hideTooltip(this.mouseNode);
}
this._lastHover=txt;
}
},handleMouseOver:function(_15){
var _16=_15.target.getAttribute("hover");
if(_15.target.getAttribute("overlay")){
this._overOverlay=true;
var r=this.getRangeUnderMouse(_15);
if(r&&r.hover){
_16=r.hover;
}
}
if(this.useTooltip&&!this._drag){
if(_16){
this.updateTooltip(_16,_15);
}else{
this.updateTooltip("",_15);
}
}
},handleMouseOut:function(_17){
if(_17.target.getAttribute("overlay")){
this._overOverlay=false;
}
if(this.useTooltip&&this.mouseNode){
dijit.hideTooltip(this.mouseNode);
}
},handleMouseDown:function(_18){
for(var i=0;i<this._indicatorData.length;i++){
var _19=this._indicatorData[i].shapes;
for(var s=0;s<_19.length;s++){
if(_19[s].getEventSource()==_18.target){
this._drag=this._indicatorData[i];
s=_19.length;
i=this._indicatorData.length;
}
}
}
dojo.stopEvent(_18);
},handleMouseUp:function(_1a){
this._drag=null;
dojo.stopEvent(_1a);
},handleMouseMove:function(_1b){
if(_1b){
dojo.style(this.mouseNode,"left",_1b.pageX+1+"px");
dojo.style(this.mouseNode,"top",_1b.pageY+1+"px");
}
if(this._drag){
this._dragIndicator(this,_1b);
}else{
if(this.useTooltip&&this._overOverlay){
var r=this.getRangeUnderMouse(_1b);
if(r&&r.hover){
this.updateTooltip(r.hover,_1b);
}else{
this.updateTooltip("",_1b);
}
}
}
}});
dojo.declare("dojox.widget.gauge.Range",[dijit._Widget,dijit._Contained],{low:0,high:0,hover:"",color:null,size:0,startup:function(){
this.color=this.color.color||this.color;
}});
dojo.declare("dojox.widget.gauge._Indicator",[dijit._Widget,dijit._Contained,dijit._Templated],{value:0,type:"",color:"black",label:"",font:{family:"sans-serif",size:"12px"},length:0,width:0,offset:0,hover:"",front:false,easing:dojo._defaultEasing,duration:1000,hideValue:false,noChange:false,_gauge:null,title:"",templateString:dojo.cache("dojox.widget.gauge","_Indicator.html","<div class=\"dojoxGaugeIndicatorDiv\">\n\t<label class=\"dojoxGaugeIndicatorLabel\" for=\"${title}\">${title}:</label>\n\t<input class=\"dojoxGaugeIndicatorInput\" name=\"${title}\" size=\"5\" value=\"${value}\" dojoAttachPoint=\"valueNode\" dojoAttachEvent=\"onchange:_update\"></input>\n</div>\n"),startup:function(){
if(this.onDragMove){
this.onDragMove=dojo.hitch(this.onDragMove);
}
},postCreate:function(){
if(this.title===""){
dojo.style(this.domNode,"display","none");
}
if(dojo.isString(this.easing)){
this.easing=dojo.getObject(this.easing);
}
},_update:function(_1c){
var _1d=this.valueNode.value;
if(_1d===""){
this.value=null;
}else{
this.value=Number(_1d);
this.hover=this.title+": "+_1d;
}
if(this._gauge){
this.draw();
this.valueNode.value=this.value;
if((this.title=="Target"||this.front)&&this._gauge.moveIndicator){
this._gauge.moveIndicatorToFront(this);
}
}
},update:function(_1e){
if(!this.noChange){
this.valueNode.value=_1e;
this._update();
}
},onDragMove:function(){
this.value=Math.floor(this.value);
this.valueNode.value=this.value;
this.hover=this.title+": "+this.value;
},draw:function(_1f){
},remove:function(){
for(var i=0;i<this.shapes.length;i++){
this._gauge.surface.remove(this.shapes[i]);
}
if(this.text){
this._gauge.surface.remove(this.text);
}
}});
}
