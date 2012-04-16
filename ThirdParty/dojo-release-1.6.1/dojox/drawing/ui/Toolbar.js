/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.ui.Toolbar"]){
dojo._hasResource["dojox.drawing.ui.Toolbar"]=true;
dojo.provide("dojox.drawing.ui.Toolbar");
dojo.require("dojox.drawing.library.icons");
dojo.declare("dojox.drawing.ui.Toolbar",[],{constructor:function(_1,_2){
this.util=dojox.drawing.util.common;
if(_1.drawing){
this.toolDrawing=_1.drawing;
this.drawing=this.toolDrawing;
this.width=this.toolDrawing.width;
this.height=this.toolDrawing.height;
this.strSelected=_1.selected;
this.strTools=_1.tools;
this.strPlugs=_1.plugs;
this._mixprops(["padding","margin","size","radius"],_1);
this.addBack();
this.orient=_1.orient?_1.orient:false;
}else{
var _3=dojo.marginBox(_2);
this.width=_3.w;
this.height=_3.h;
this.strSelected=dojo.attr(_2,"selected");
this.strTools=dojo.attr(_2,"tools");
this.strPlugs=dojo.attr(_2,"plugs");
this._mixprops(["padding","margin","size","radius"],_2);
this.toolDrawing=new dojox.drawing.Drawing({mode:"ui"},_2);
this.orient=dojo.attr(_2,"orient");
}
this.horizontal=this.orient?this.orient=="H":this.width>this.height;
if(this.toolDrawing.ready){
this.makeButtons();
if(!this.strSelected&&this.drawing.defaults.clickMode){
this.drawing.mouse.setCursor("default");
}
}else{
var c=dojo.connect(this.toolDrawing,"onSurfaceReady",this,function(){
dojo.disconnect(c);
this.drawing=dojox.drawing.getRegistered("drawing",dojo.attr(_2,"drawingId"));
this.makeButtons();
if(!this.strSelected&&this.drawing.defaults.clickMode){
var c=dojo.connect(this.drawing,"onSurfaceReady",this,function(){
dojo.disconnect(c);
this.drawing.mouse.setCursor("default");
});
}
});
}
},padding:10,margin:5,size:30,radius:3,toolPlugGap:20,strSelected:"",strTools:"",strPlugs:"",makeButtons:function(){
this.buttons=[];
this.plugins=[];
var x=this.padding,y=this.padding,w=this.size,h=this.size,r=this.radius,g=this.margin,_4=dojox.drawing.library.icons,s={place:"BR",size:2,mult:4};
if(this.strTools){
var _5=[];
var _6=dojox.drawing.getRegistered("tool");
var _7={};
for(var nm in _6){
var _8=this.util.abbr(nm);
_7[_8]=_6[nm];
if(this.strTools=="all"){
_5.push(_8);
var _9=dojox.drawing.getRegistered("tool",nm);
if(_9.secondary){
_5.push(_9.secondary.name);
}
}
}
if(this.strTools!="all"){
var _a=this.strTools.split(",");
dojo.forEach(_a,function(_b){
_b=dojo.trim(_b);
_5.push(_b);
var _c=dojox.drawing.getRegistered("tool",_7[_b].name);
if(_c.secondary){
_5.push(_c.secondary.name);
}
},this);
}
dojo.forEach(_5,function(t){
t=dojo.trim(t);
var _d=false;
if(t.indexOf("Secondary")>-1){
var _e=t.substring(0,t.indexOf("Secondary"));
var _f=dojox.drawing.getRegistered("tool",_7[_e].name).secondary;
var _10=_f.label;
this[t]=_f.funct;
if(_f.setup){
dojo.hitch(this,_f.setup)();
}
var btn=this.toolDrawing.addUI("button",{data:{x:x,y:y,width:w,height:h/2,r:r},toolType:t,secondary:true,text:_10,shadow:s,scope:this,callback:this[t]});
if(_f.postSetup){
dojo.hitch(this,_f.postSetup,btn)();
}
_d=true;
}else{
var btn=this.toolDrawing.addUI("button",{data:{x:x,y:y,width:w,height:h,r:r},toolType:t,icon:_4[t],shadow:s,scope:this,callback:"onToolClick"});
}
dojox.drawing.register(btn,"button");
this.buttons.push(btn);
if(this.strSelected==t){
btn.select();
this.selected=btn;
this.drawing.setTool(btn.toolType);
}
if(this.horizontal){
x+=h+g;
}else{
var _11=_d?h/2+g:h+g;
y+=_11;
}
},this);
}
if(this.horizontal){
x+=this.toolPlugGap;
}else{
y+=this.toolPlugGap;
}
if(this.strPlugs){
var _12=[];
var _13=dojox.drawing.getRegistered("plugin");
var _14={};
for(var nm in _13){
var _15=this.util.abbr(nm);
_14[_15]=_13[nm];
if(this.strPlugs=="all"){
_12.push(_15);
}
}
if(this.strPlugs!="all"){
_12=this.strPlugs.split(",");
dojo.map(_12,function(p){
return dojo.trim(p);
});
}
dojo.forEach(_12,function(p){
var t=dojo.trim(p);
if(_14[p].button!=false){
var btn=this.toolDrawing.addUI("button",{data:{x:x,y:y,width:w,height:h,r:r},toolType:t,icon:_4[t],shadow:s,scope:this,callback:"onPlugClick"});
dojox.drawing.register(btn,"button");
this.plugins.push(btn);
if(this.horizontal){
x+=h+g;
}else{
y+=h+g;
}
}
var _16={};
_14[p].button==false?_16={name:this.drawing.stencilTypeMap[p]}:_16={name:this.drawing.stencilTypeMap[p],options:{button:btn}};
this.drawing.addPlugin(_16);
},this);
}
dojo.connect(this.drawing,"onRenderStencil",this,"onRenderStencil");
},onRenderStencil:function(_17){
if(this.drawing.defaults.clickMode){
this.drawing.mouse.setCursor("default");
this.selected&&this.selected.deselect();
this.selected=null;
}
},addTool:function(){
},addPlugin:function(){
},addBack:function(){
this.toolDrawing.addUI("rect",{data:{x:0,y:0,width:this.width,height:this.size+(this.padding*2),fill:"#ffffff",borderWidth:0}});
},onToolClick:function(_18){
if(this.drawing.defaults.clickMode){
this.drawing.mouse.setCursor("crosshair");
}
dojo.forEach(this.buttons,function(b){
if(b.id==_18.id){
b.select();
this.selected=b;
this.drawing.setTool(_18.toolType);
}else{
if(!b.secondary){
b.deselect();
}
}
},this);
},onPlugClick:function(_19){
},_mixprops:function(_1a,_1b){
dojo.forEach(_1a,function(p){
this[p]=_1b.tagName?dojo.attr(_1b,p)===null?this[p]:dojo.attr(_1b,p):_1b[p]===undefined?this[p]:_1b[p];
},this);
}});
}
