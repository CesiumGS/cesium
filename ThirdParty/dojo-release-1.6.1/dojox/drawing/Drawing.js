/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.Drawing"]){
dojo._hasResource["dojox.drawing.Drawing"]=true;
dojo.provide("dojox.drawing.Drawing");
(function(){
var _1=false;
dojo.declare("dojox.drawing.Drawing",[],{ready:false,mode:"",width:0,height:0,constructor:function(_2,_3){
var _4=dojo.attr(_3,"defaults");
if(_4){
dojox.drawing.defaults=dojo.getObject(_4);
}
this.defaults=dojox.drawing.defaults;
this.id=_3.id;
dojox.drawing.register(this,"drawing");
this.mode=(_2.mode||dojo.attr(_3,"mode")||"").toLowerCase();
var _5=dojo.contentBox(_3);
this.width=_5.w;
this.height=_5.h;
this.util=dojox.drawing.util.common;
this.util.register(this);
this.keys=dojox.drawing.manager.keys;
this.mouse=new dojox.drawing.manager.Mouse({util:this.util,keys:this.keys,id:this.mode=="ui"?"MUI":"mse"});
this.mouse.setEventMode(this.mode);
this.tools={};
this.stencilTypes={};
this.stencilTypeMap={};
this.srcRefNode=_3;
this.domNode=_3;
var _6=dojo.attr(_3,"plugins");
if(_6){
this.plugins=eval(_6);
}else{
this.plugins=[];
}
this.widgetId=this.id;
dojo.attr(this.domNode,"widgetId",this.widgetId);
if(dijit&&dijit.registry){
dijit.registry.add(this);
}else{
dijit.registry={objs:{},add:function(_7){
this.objs[_7.id]=_7;
}};
dijit.byId=function(id){
return dijit.registry.objs[id];
};
dijit.registry.add(this);
}
var _8=dojox.drawing.getRegistered("stencil");
for(var nm in _8){
this.registerTool(_8[nm].name);
}
var _9=dojox.drawing.getRegistered("tool");
for(nm in _9){
this.registerTool(_9[nm].name);
}
var _a=dojox.drawing.getRegistered("plugin");
for(nm in _a){
this.registerTool(_a[nm].name);
}
this._createCanvas();
},_createCanvas:function(){
this.canvas=new dojox.drawing.manager.Canvas({srcRefNode:this.domNode,util:this.util,mouse:this.mouse,callback:dojo.hitch(this,"onSurfaceReady")});
this.initPlugins();
},resize:function(_b){
_b&&dojo.style(this.domNode,{width:_b.w+"px",height:_b.h+"px"});
if(!this.canvas){
this._createCanvas();
}else{
if(_b){
this.canvas.resize(_b.w,_b.h);
}
}
},startup:function(){
},getShapeProps:function(_c,_d){
var _e=_c.stencilType;
var ui=this.mode=="ui"||_d=="ui";
return dojo.mixin({container:ui&&!_e?this.canvas.overlay.createGroup():this.canvas.surface.createGroup(),util:this.util,keys:this.keys,mouse:this.mouse,drawing:this,drawingType:ui&&!_e?"ui":"stencil",style:this.defaults.copy()},_c||{});
},addPlugin:function(_f){
this.plugins.push(_f);
if(this.canvas.surfaceReady){
this.initPlugins();
}
},initPlugins:function(){
if(!this.canvas||!this.canvas.surfaceReady){
var c=dojo.connect(this,"onSurfaceReady",this,function(){
dojo.disconnect(c);
this.initPlugins();
});
return;
}
dojo.forEach(this.plugins,function(p,i){
var _10=dojo.mixin({util:this.util,keys:this.keys,mouse:this.mouse,drawing:this,stencils:this.stencils,anchors:this.anchors,canvas:this.canvas},p.options||{});
this.registerTool(p.name,dojo.getObject(p.name));
try{
this.plugins[i]=new this.tools[p.name](_10);
}
catch(e){
console.error("Failed to initilaize plugin:\t"+p.name+". Did you require it?");
}
},this);
this.plugins=[];
_1=true;
this.mouse.setCanvas();
},onSurfaceReady:function(){
this.ready=true;
this.mouse.init(this.canvas.domNode);
this.undo=new dojox.drawing.manager.Undo({keys:this.keys});
this.anchors=new dojox.drawing.manager.Anchors({drawing:this,mouse:this.mouse,undo:this.undo,util:this.util});
if(this.mode=="ui"){
this.uiStencils=new dojox.drawing.manager.StencilUI({canvas:this.canvas,surface:this.canvas.surface,mouse:this.mouse,keys:this.keys});
}else{
this.stencils=new dojox.drawing.manager.Stencil({canvas:this.canvas,surface:this.canvas.surface,mouse:this.mouse,undo:this.undo,keys:this.keys,anchors:this.anchors});
this.uiStencils=new dojox.drawing.manager.StencilUI({canvas:this.canvas,surface:this.canvas.surface,mouse:this.mouse,keys:this.keys});
}
if(dojox.gfx.renderer=="silverlight"){
try{
new dojox.drawing.plugins.drawing.Silverlight({util:this.util,mouse:this.mouse,stencils:this.stencils,anchors:this.anchors,canvas:this.canvas});
}
catch(e){
throw new Error("Attempted to install the Silverlight plugin, but it was not found.");
}
}
dojo.forEach(this.plugins,function(p){
p.onSurfaceReady&&p.onSurfaceReady();
});
},addUI:function(_11,_12){
if(!this.ready){
var c=dojo.connect(this,"onSurfaceReady",this,function(){
dojo.disconnect(c);
this.addUI(_11,_12);
});
return false;
}
if(_12&&!_12.data&&!_12.points){
_12={data:_12};
}
if(!this.stencilTypes[_11]){
if(_11!="tooltip"){
console.warn("Not registered:",_11);
}
return null;
}
var s=this.uiStencils.register(new this.stencilTypes[_11](this.getShapeProps(_12,"ui")));
return s;
},addStencil:function(_13,_14){
if(!this.ready){
var c=dojo.connect(this,"onSurfaceReady",this,function(){
dojo.disconnect(c);
this.addStencil(_13,_14);
});
return false;
}
if(_14&&!_14.data&&!_14.points){
_14={data:_14};
}
var s=this.stencils.register(new this.stencilTypes[_13](this.getShapeProps(_14)));
this.currentStencil&&this.currentStencil.moveToFront();
return s;
},removeStencil:function(_15){
this.stencils.unregister(_15);
_15.destroy();
},removeAll:function(){
this.stencils.removeAll();
},selectAll:function(){
this.stencils.selectAll();
},toSelected:function(_16){
this.stencils.toSelected.apply(this.stencils,arguments);
},exporter:function(){
return this.stencils.exporter();
},importer:function(_17){
dojo.forEach(_17,function(m){
this.addStencil(m.type,m);
},this);
},changeDefaults:function(_18,_19){
if(_19!=undefined&&_19){
for(var nm in _18){
this.defaults[nm]=_18[nm];
}
}else{
for(var nm in _18){
for(var n in _18[nm]){
this.defaults[nm][n]=_18[nm][n];
}
}
}
if(this.currentStencil!=undefined&&(!this.currentStencil.created||this.defaults.clickMode)){
this.unSetTool();
this.setTool(this.currentType);
}
},onRenderStencil:function(_1a){
this.stencils.register(_1a);
this.unSetTool();
if(!this.defaults.clickMode){
this.setTool(this.currentType);
}else{
this.defaults.clickable=true;
}
},onDeleteStencil:function(_1b){
this.stencils.unregister(_1b);
},registerTool:function(_1c){
if(this.tools[_1c]){
return;
}
var _1d=dojo.getObject(_1c);
this.tools[_1c]=_1d;
var _1e=this.util.abbr(_1c);
this.stencilTypes[_1e]=_1d;
this.stencilTypeMap[_1e]=_1c;
},getConstructor:function(_1f){
return this.stencilTypes[_1f];
},setTool:function(_20){
if(this.mode=="ui"){
return;
}
if(!this.canvas||!this.canvas.surface){
var c=dojo.connect(this,"onSurfaceReady",this,function(){
dojo.disconnect(c);
this.setTool(_20);
});
return;
}
if(this.currentStencil){
this.unSetTool();
}
this.currentType=this.tools[_20]?_20:this.stencilTypeMap[_20];
try{
this.currentStencil=new this.tools[this.currentType]({container:this.canvas.surface.createGroup(),util:this.util,mouse:this.mouse,keys:this.keys});
if(this.defaults.clickMode){
this.defaults.clickable=false;
}
this.currentStencil.connect(this.currentStencil,"onRender",this,"onRenderStencil");
this.currentStencil.connect(this.currentStencil,"destroy",this,"onDeleteStencil");
}
catch(e){
console.error("dojox.drawing.setTool Error:",e);
console.error(this.currentType+" is not a constructor: ",this.tools[this.currentType]);
}
},unSetTool:function(){
if(!this.currentStencil.created){
this.currentStencil.destroy();
}
}});
})();
}
