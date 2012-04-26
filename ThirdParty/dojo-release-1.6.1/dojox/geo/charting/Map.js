/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.geo.charting.Map"]){
dojo._hasResource["dojox.geo.charting.Map"]=true;
dojo.provide("dojox.geo.charting.Map");
dojo.require("dojox.gfx");
dojo.require("dojox.geo.charting._base");
dojo.require("dojox.geo.charting._Feature");
dojo.require("dojox.geo.charting._Marker");
dojo.declare("dojox.geo.charting.Map",null,{defaultColor:"#B7B7B7",highlightColor:"#D5D5D5",series:[],constructor:function(_1,_2){
dojo.style(_1,"display","block");
this.containerSize={x:dojo.coords(_1).x,y:dojo.coords(_1).y,w:dojo.coords(_1).w||100,h:dojo.coords(_1).h||100};
this.surface=dojox.gfx.createSurface(_1,this.containerSize.w,this.containerSize.h);
this.container=_1;
this._createZoomingCursor();
this.mapObj=this.surface.createGroup();
this.mapObj.features={};
dojo.xhrGet({url:_2,handleAs:"json",sync:true,load:dojo.hitch(this,"_init")});
},setMarkerData:function(_3){
dojo.xhrGet({url:_3,handleAs:"json",handle:dojo.hitch(this,"_appendMarker")});
},setDataStore:function(_4,_5){
this.dataStore=_4;
var _6=this;
this.dataStore.fetch({query:_5,onComplete:function(_7){
var _8=_7[0];
var _9=_6.dataStore.getAttributes(_8);
dojo.forEach(_9,function(_a){
if(_6.mapObj.features[_a]){
_6.mapObj.features[_a].setValue(_6.dataStore.getValue(_8,_a));
}
});
}});
},addSeries:function(_b){
this.series=_b;
},_init:function(_c){
var _d=_c.layerExtent[2]-_c.layerExtent[0];
var _e=_c.layerExtent[3]-_c.layerExtent[1];
this.mapObj.scale=Math.min(this.containerSize.w/_d,this.containerSize.h/_e);
this.mapObj.currentScale=this.mapObj.scale;
this.mapObj.boundBox=_c.layerExtent;
this.mapObj.currentBBox={x:_c.layerExtent[0],y:_c.layerExtent[1]};
this.mapObj.setTransform([dojox.gfx.matrix.scale(this.mapObj.scale),dojox.gfx.matrix.translate(-_c.layerExtent[0],-_c.layerExtent[1])]);
dojo.forEach(_c.featureNames,function(_f){
var _10=_c.features[_f];
_10.bbox.x=_10.bbox[0];
_10.bbox.y=_10.bbox[1];
_10.bbox.w=_10.bbox[2];
_10.bbox.h=_10.bbox[3];
var _11=new dojox.geo.charting._Feature(this,_f,_10);
_11.init();
this.mapObj.features[_f]=_11;
},this);
this.mapObj.marker=new dojox.geo.charting._Marker({},this);
},_appendMarker:function(_12){
this.mapObj.marker=new dojox.geo.charting._Marker(_12,this);
},_createZoomingCursor:function(){
if(!dojo.byId("mapZoomCursor")){
var _13=dojo.doc.createElement("div");
dojo.attr(_13,"id","mapZoomCursor");
dojo.addClass(_13,"mapZoomIn");
dojo.style(_13,"display","none");
dojo.body().appendChild(_13);
}
},onFeatureClick:function(_14){
},onFeatureOver:function(_15){
},onZoomEnd:function(_16){
}});
}
