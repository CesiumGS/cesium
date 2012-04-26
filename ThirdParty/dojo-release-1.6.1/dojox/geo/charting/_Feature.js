/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.geo.charting._Feature"]){
dojo._hasResource["dojox.geo.charting._Feature"]=true;
dojo.provide("dojox.geo.charting._Feature");
dojo.require("dojox.gfx.fx");
dojo.declare("dojox.geo.charting._Feature",null,{_isZoomIn:false,_isFocused:false,markerText:null,constructor:function(_1,_2,_3){
this.id=_2;
this.shape=_1.mapObj.createGroup();
this.parent=_1;
this.mapObj=_1.mapObj;
this._bbox=_3.bbox;
this._center=_3.center;
this._defaultFill=_1.defaultColor;
this._highlightFill=_1.highlightColor;
this._defaultStroke={width:this._normalizeStrokeWeight(0.5),color:"white"};
this._scale=Math.min(this.parent.containerSize.w/this._bbox.w,this.parent.containerSize.h/this._bbox.h);
var _4=(dojo.isArray(_3.shape[0]))?_3.shape:[_3.shape];
dojo.forEach(_4,function(_5){
this.shape.createPolyline(_5).setStroke(this._defaultStroke).setFill(this._defaultFill);
},this);
},setValue:function(_6){
this.value=_6;
if(this.parent.series.length!=0){
for(var i=0;i<this.parent.series.length;i++){
var _7=this.parent.series[i];
if((_6>=_7.min)&&(_6<_7.max)){
this._setFillWith(_7.color);
this._defaultFill=_7.color;
}
}
}
},_setFillWith:function(_8){
var _9=(dojo.isArray(this.shape.children))?this.shape.children:[this.shape.children];
dojo.forEach(_9,function(_a){
_a.setFill(_8);
});
},_setStrokeWith:function(_b){
var _c=(dojo.isArray(this.shape.children))?this.shape.children:[this.shape.children];
dojo.forEach(_c,function(_d){
_d.setStroke({color:_b.color,width:_b.width,join:"round"});
});
},_normalizeStrokeWeight:function(_e){
var _f=this.shape._getRealMatrix();
return (dojox.gfx.renderer!="vml")?_e/(this.shape._getRealMatrix()||{xx:1}).xx:_e;
},_onmouseoverHandler:function(evt){
this.parent.onFeatureOver(this);
this._setFillWith(this._highlightFill);
this.mapObj.marker.show(this.id);
},_onmouseoutHandler:function(){
this._setFillWith(this._defaultFill);
this.mapObj.marker.hide();
dojo.style("mapZoomCursor","display","none");
},_onmousemoveHandler:function(evt){
if(this._isFocused){
var evt=dojo.fixEvent(evt||window.event);
dojo.style("mapZoomCursor","left",evt.pageX+12+"px");
dojo.style("mapZoomCursor","top",evt.pageY+"px");
dojo.byId("mapZoomCursor").className=(this._isZoomIn)?"mapZoomOut":"mapZoomIn";
dojo.style("mapZoomCursor","display","block");
}
},_onclickHandler:function(){
if(!this._isFocused){
for(var _10 in this.mapObj.features){
if(this.mapObj.features[_10]!=this){
this.mapObj.features[_10]._setStrokeWith(this._defaultStroke);
this.mapObj.features[_10]._setFillWith(this.mapObj.features[_10]._defaultFill);
this.mapObj.features[_10]._isFocused=false;
this.mapObj.features[_10]._isZoomIn=false;
}
}
this._focus();
}else{
if(this._isZoomIn){
this._zoomOut();
}else{
this._zoomIn();
}
}
},_focus:function(){
this.shape._moveToFront();
this._setStrokeWith({color:"black",width:this._normalizeStrokeWeight(2)});
this.parent.onFeatureClick(this);
this._isFocused=true;
},_zoomIn:function(){
var _11=dojox.gfx.fx.animateTransform({duration:1000,shape:this.mapObj,transform:[{name:"translate",start:[-this.mapObj.currentBBox.x,-this.mapObj.currentBBox.y],end:[-this._bbox.x,-this._bbox.y]},{name:"scaleAt",start:[this.mapObj.currentScale,this.mapObj.currentBBox.x,this.mapObj.currentBBox.y],end:[this._scale,this._bbox.x,this._bbox.y]}]});
dojo.connect(_11,"onEnd",this,function(){
this._setStrokeWith({color:"black",width:this._normalizeStrokeWeight(2)});
this.parent.onZoomEnd(this);
});
_11.play();
this.mapObj.currentScale=this._scale;
this.mapObj.currentBBox={x:this._bbox.x,y:this._bbox.y};
this._isZoomIn=true;
dojo.byId("mapZoomCursor").className="";
},_zoomOut:function(){
var _12=dojox.gfx.fx.animateTransform({duration:1000,shape:this.mapObj,transform:[{name:"translate",start:[-this._bbox.x,-this._bbox.y],end:[-this.mapObj.boundBox[0],-this.mapObj.boundBox[1]]},{name:"scaleAt",start:[this._scale,this._bbox.x,this._bbox.y],end:[this.mapObj.scale,this.mapObj.boundBox[0],this.mapObj.boundBox[1]]}]});
dojo.connect(_12,"onEnd",this,function(){
this._setStrokeWith({color:"black",width:this._normalizeStrokeWeight(2)});
});
_12.play();
this.mapObj.currentScale=this.mapObj.scale;
this.mapObj.currentBBox={x:this.mapObj.boundBox[0],y:this.mapObj.boundBox[1]};
this._isZoomIn=false;
dojo.byId("mapZoomCursor").className="";
},init:function(){
this.shape.rawNode.id=this.id;
this.tooltip=null;
this.shape.connect("onmouseover",this,this._onmouseoverHandler);
this.shape.connect("onmouseout",this,this._onmouseoutHandler);
this.shape.connect("onmousemove",this,this._onmousemoveHandler);
this.shape.connect("onclick",this,this._onclickHandler);
}});
}
