/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.ResizeTableColumn"]){
dojo._hasResource["dojox.editor.plugins.ResizeTableColumn"]=true;
dojo.provide("dojox.editor.plugins.ResizeTableColumn");
dojo.require("dojox.editor.plugins.TablePlugins");
dojo.declare("dojox.editor.plugins.ResizeTableColumn",dojox.editor.plugins.TablePlugins,{constructor:function(){
this.isLtr=this.dir?(this.dir=="ltr"):dojo._isBodyLtr();
this.ruleDiv=dojo.create("div",{style:"top: -10000px; z-index: 10001"},dojo.body(),"last");
},setEditor:function(_1){
var _2=this.ruleDiv;
this.editor=_1;
this.editor.customUndo=true;
this.onEditorLoaded();
_1.onLoadDeferred.addCallback(dojo.hitch(this,function(){
this.connect(this.editor.editNode,"onmousemove",function(_3){
var _4=dojo.coords(_1.iframe,true),ex=_4.x,cx=_3.clientX;
if(!this.isDragging){
var _5=_3.target;
if(_5.tagName&&_5.tagName.toLowerCase()=="td"){
var _6=dojo.coords(_5),ox=_6.x,ow=_6.w,_7=ex+_6.x-2;
if(this.isLtr){
_2.headerColumn=true;
if(!_21(_5,"first")||cx>ox+ow/2){
_7+=ow;
_2.headerColumn=false;
}
}else{
_2.headerColumn=false;
if(_21(_5,"first")&&cx>ox+ow/2){
_7+=ow;
_2.headerColumn=true;
}
}
dojo.style(_2,{position:"absolute",cursor:"col-resize",display:"block",width:"4px",backgroundColor:"transparent",top:_4.y+_6.y+"px",left:_7+"px",height:_6.h+"px"});
this.activeCell=_5;
}else{
dojo.style(_2,{display:"none",top:"-10000px"});
}
}else{
var _8=this.activeCell,_9=dojo.coords(_8),ax=_9.x,aw=_9.w,_a=_15(_8),_b,sx,sw,_c=dojo.coords(_19(_8).parentNode),_d=_c.x,_e=_c.w;
if(_a){
_b=dojo.coords(_a);
sx=_b.x;
sw=_b.w;
}
if(this.isLtr&&((_2.headerColumn&&_a&&_d<cx&&cx<ax+aw)||((!_a&&ax<cx&&cx<_d+_e)||(_a&&ax<cx&&cx<sx+sw)))||!this.isLtr&&((_2.headerColumn&&_a&&_d>cx&&cx>ax)||((!_a&&ax+aw>cx&&cx>_d)||(_a&&ax+aw>cx&&cx>sx)))){
dojo.style(_2,{left:ex+cx+"px"});
}
}
});
this.connect(_2,"onmousedown",function(_f){
var _10=dojo.coords(_1.iframe,true),_11=dojo.coords(_19(this.activeCell));
this.isDragging=true;
dojo.style(_1.editNode,{cursor:"col-resize"});
dojo.style(_2,{width:"1px",left:_f.clientX+"px",top:_10.y+_11.y+"px",height:_11.h+"px",backgroundColor:"#777"});
});
this.connect(_2,"onmouseup",function(evt){
var _12=this.activeCell,_13=dojo.coords(_12),aw=_13.w,ax=_13.x,_14=_15(_12),_16,sx,sw,_17=dojo.coords(_1.iframe),ex=_17.x,_18=_19(_12),_1a=dojo.coords(_18),cs=_18.getAttribute("cellspacing"),cx=evt.clientX,_1b=_1c(_12),_1d,_1e,_1f;
if(!cs||(cs=parseInt(cs,10))<0){
cs=2;
}
if(_14){
_16=dojo.coords(_14);
sx=_16.x;
sw=_16.w;
_1d=_1c(_14);
}
if(this.isLtr){
if(_2.headerColumn){
_1e=ex+ax+aw-cx;
}else{
_1e=cx-ex-ax;
if(_14){
_1f=ex+sx+sw-cx-cs;
}
}
}else{
if(_2.headerColumn){
_1e=cx-ex-ax;
}else{
_1e=ex+ax+aw-cx;
if(_14){
_1f=cx-ex-sx-cs;
}
}
}
this.isDragging=false;
_20(_1b,_1e);
if(_14){
if(!_2.headerColumn){
_20(_1d,_1f);
}
}
if(_2.headerColumn&&_21(_12,"first")||_21(_12,"last")){
dojo.marginBox(_18,{w:_1a.w+_1e-aw});
}
_20(_1b,dojo.coords(_12).w);
if(_14){
_20(_1d,dojo.coords(_14).w);
}
dojo.style(_1.editNode,{cursor:"auto"});
dojo.style(_2,{display:"none",top:"-10000px"});
this.activeCell=null;
});
}));
function _21(n,b){
var _22=dojo.withGlobal(_1.window,"query",dojo,["> td",n.parentNode]);
switch(b){
case "first":
return _22[0]==n;
case "last":
return _22[_22.length-1]==n;
default:
return false;
}
};
function _15(_23){
_23=_23.nextSibling;
while(_23){
if(_23.tagName&&_23.tagName.toLowerCase()=="td"){
break;
}
_23=_23.nextSibling;
}
return _23;
};
function _19(t){
while((t=t.parentNode)&&t.tagName.toLowerCase()!="table"){
}
return t;
};
function _1c(t){
var tds=dojo.withGlobal(_1.window,"query",dojo,["td",_19(t)]),len=tds.length;
for(var i=0;i<len;i++){
if(dojo.coords(tds[i]).x==dojo.coords(t).x){
return tds[i];
}
}
return null;
};
function _20(_24,_25){
if(dojo.isIE){
var s=_24.currentStyle,bl=px(_24,s.borderLeftWidth),br=px(_24,s.borderRightWidth),pl=px(_24,s.paddingLeft),pr=px(_24,s.paddingRight);
_24.style.width=_25-bl-br-pl-pr;
}else{
dojo.marginBox(_24,{w:_25});
}
function px(_26,_27){
if(!_27){
return 0;
}
if(_27=="medium"){
return 1;
}
if(_27.slice&&_27.slice(-2)=="px"){
return parseFloat(_27);
}
with(_26){
var _28=style.left;
var _29=runtimeStyle.left;
runtimeStyle.left=currentStyle.left;
try{
style.left=_27;
_27=style.pixelLeft;
}
catch(e){
_27=0;
}
style.left=_28;
runtimeStyle.left=_29;
}
return _27;
};
};
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
if(o.args&&o.args.command){
var cmd=o.args.command.charAt(0).toLowerCase()+o.args.command.substring(1,o.args.command.length);
if(cmd=="resizeTableColumn"){
o.plugin=new dojox.editor.plugins.ResizeTableColumn({commandName:cmd});
}
}
});
}
