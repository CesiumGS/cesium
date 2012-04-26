/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.geo.charting._Marker"]){
dojo._hasResource["dojox.geo.charting._Marker"]=true;
dojo.provide("dojox.geo.charting._Marker");
dojo.declare("dojox.geo.charting._Marker",null,{constructor:function(_1,_2){
var _3=_2.mapObj;
this.features=_3.features;
this.markerData=_1;
},show:function(_4){
this.markerText=this.features[_4].markerText||this.markerData[_4]||_4;
this.currentFeature=this.features[_4];
dojox.geo.charting.showTooltip(this.markerText,this.currentFeature.shape,"before");
},hide:function(){
dojox.geo.charting.hideTooltip(this.currentFeature.shape);
},_getGroupBoundingBox:function(_5){
var _6=_5.children;
var _7=_6[0];
var _8=_7.getBoundingBox();
this._arround=dojo.clone(_8);
dojo.forEach(_6,function(_9){
var _a=_9.getBoundingBox();
this._arround.x=Math.min(this._arround.x,_a.x);
this._arround.y=Math.min(this._arround.y,_a.y);
},this);
},_toWindowCoords:function(_b,_c,_d){
var _e=(_b.x-this.topLeft[0])*this.scale;
var _f=(_b.y-this.topLeft[1])*this.scale;
if(dojo.isFF==3.5){
_b.x=_c.x;
_b.y=_c.y;
}else{
if(dojo.isChrome){
_b.x=_d.x+_e;
_b.y=_d.y+_f;
}else{
_b.x=_c.x+_e;
_b.y=_c.y+_f;
}
}
_b.width=(this.currentFeature._bbox[2])*this.scale;
_b.height=(this.currentFeature._bbox[3])*this.scale;
_b.x+=_b.width/6;
_b.y+=_b.height/4;
}});
}
