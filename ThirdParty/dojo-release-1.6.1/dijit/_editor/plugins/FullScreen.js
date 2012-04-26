/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._editor.plugins.FullScreen"]){
dojo._hasResource["dijit._editor.plugins.FullScreen"]=true;
dojo.provide("dijit._editor.plugins.FullScreen");
dojo.require("dojo.window");
dojo.require("dojo.i18n");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit.form.Button");
dojo.requireLocalization("dijit._editor","commands",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dijit._editor.plugins.FullScreen",dijit._editor._Plugin,{zIndex:500,_origState:null,_origiFrameState:null,_resizeHandle:null,isFullscreen:false,toggle:function(){
this.button.set("checked",!this.button.get("checked"));
},_initButton:function(){
var _1=dojo.i18n.getLocalization("dijit._editor","commands"),_2=this.editor;
this.button=new dijit.form.ToggleButton({label:_1["fullScreen"],dir:_2.dir,lang:_2.lang,showLabel:false,iconClass:this.iconClassPrefix+" "+this.iconClassPrefix+"FullScreen",tabIndex:"-1",onChange:dojo.hitch(this,"_setFullScreen")});
},setEditor:function(_3){
this.editor=_3;
this._initButton();
this.editor.addKeyHandler(dojo.keys.F11,true,true,dojo.hitch(this,function(e){
this.toggle();
dojo.stopEvent(e);
setTimeout(dojo.hitch(this,function(){
this.editor.focus();
}),250);
return true;
}));
this.connect(this.editor.domNode,"onkeydown","_containFocus");
},_containFocus:function(e){
if(this.isFullscreen){
var ed=this.editor;
if(!ed.isTabIndent&&ed._fullscreen_oldOnKeyDown&&e.keyCode===dojo.keys.TAB){
var f=dijit.getFocus();
var _4=this._getAltViewNode();
if(f.node==ed.iframe||(_4&&f.node===_4)){
setTimeout(dojo.hitch(this,function(){
ed.toolbar.focus();
}),10);
}else{
if(_4&&dojo.style(ed.iframe,"display")==="none"){
setTimeout(dojo.hitch(this,function(){
dijit.focus(_4);
}),10);
}else{
setTimeout(dojo.hitch(this,function(){
ed.focus();
}),10);
}
}
dojo.stopEvent(e);
}else{
if(ed._fullscreen_oldOnKeyDown){
ed._fullscreen_oldOnKeyDown(e);
}
}
}
},_resizeEditor:function(){
var vp=dojo.window.getBox();
dojo.marginBox(this.editor.domNode,{w:vp.w,h:vp.h});
var _5=this.editor.getHeaderHeight();
var _6=this.editor.getFooterHeight();
var _7=dojo._getPadBorderExtents(this.editor.domNode);
var _8=dojo._getPadBorderExtents(this.editor.iframe.parentNode);
var _9=dojo._getMarginExtents(this.editor.iframe.parentNode);
var _a=vp.h-(_5+_7.h+_6);
dojo.marginBox(this.editor.iframe.parentNode,{h:_a,w:vp.w});
dojo.marginBox(this.editor.iframe,{h:_a-(_8.h+_9.h)});
},_getAltViewNode:function(){
},_setFullScreen:function(_b){
var vp=dojo.window.getBox();
var ed=this.editor;
var _c=dojo.body();
var _d=ed.domNode.parentNode;
this.isFullscreen=_b;
if(_b){
while(_d&&_d!==dojo.body()){
dojo.addClass(_d,"dijitForceStatic");
_d=_d.parentNode;
}
this._editorResizeHolder=this.editor.resize;
ed.resize=function(){
};
ed._fullscreen_oldOnKeyDown=ed.onKeyDown;
ed.onKeyDown=dojo.hitch(this,this._containFocus);
this._origState={};
this._origiFrameState={};
var _e=ed.domNode,_f=_e&&_e.style||{};
this._origState={width:_f.width||"",height:_f.height||"",top:dojo.style(_e,"top")||"",left:dojo.style(_e,"left")||"",position:dojo.style(_e,"position")||"static",marginBox:dojo.marginBox(ed.domNode)};
var _10=ed.iframe,_11=_10&&_10.style||{};
var bc=dojo.style(ed.iframe,"backgroundColor");
this._origiFrameState={backgroundColor:bc||"transparent",width:_11.width||"auto",height:_11.height||"auto",zIndex:_11.zIndex||""};
dojo.style(ed.domNode,{position:"absolute",top:"0px",left:"0px",zIndex:this.zIndex,width:vp.w+"px",height:vp.h+"px"});
dojo.style(ed.iframe,{height:"100%",width:"100%",zIndex:this.zIndex,backgroundColor:bc!=="transparent"&&bc!=="rgba(0, 0, 0, 0)"?bc:"white"});
dojo.style(ed.iframe.parentNode,{height:"95%",width:"100%"});
if(_c.style&&_c.style.overflow){
this._oldOverflow=dojo.style(_c,"overflow");
}else{
this._oldOverflow="";
}
if(dojo.isIE&&!dojo.isQuirks){
if(_c.parentNode&&_c.parentNode.style&&_c.parentNode.style.overflow){
this._oldBodyParentOverflow=_c.parentNode.style.overflow;
}else{
try{
this._oldBodyParentOverflow=dojo.style(_c.parentNode,"overflow");
}
catch(e){
this._oldBodyParentOverflow="scroll";
}
}
dojo.style(_c.parentNode,"overflow","hidden");
}
dojo.style(_c,"overflow","hidden");
var _12=function(){
var vp=dojo.window.getBox();
if("_prevW" in this&&"_prevH" in this){
if(vp.w===this._prevW&&vp.h===this._prevH){
return;
}
}else{
this._prevW=vp.w;
this._prevH=vp.h;
}
if(this._resizer){
clearTimeout(this._resizer);
delete this._resizer;
}
this._resizer=setTimeout(dojo.hitch(this,function(){
delete this._resizer;
this._resizeEditor();
}),10);
};
this._resizeHandle=dojo.connect(window,"onresize",this,_12);
this._resizeHandle2=dojo.connect(ed,"resize",dojo.hitch(this,function(){
if(this._resizer){
clearTimeout(this._resizer);
delete this._resizer;
}
this._resizer=setTimeout(dojo.hitch(this,function(){
delete this._resizer;
this._resizeEditor();
}),10);
}));
this._resizeEditor();
var dn=this.editor.toolbar.domNode;
setTimeout(function(){
dojo.window.scrollIntoView(dn);
},250);
}else{
if(this._resizeHandle){
dojo.disconnect(this._resizeHandle);
this._resizeHandle=null;
}
if(this._resizeHandle2){
dojo.disconnect(this._resizeHandle2);
this._resizeHandle2=null;
}
if(this._rst){
clearTimeout(this._rst);
this._rst=null;
}
while(_d&&_d!==dojo.body()){
dojo.removeClass(_d,"dijitForceStatic");
_d=_d.parentNode;
}
if(this._editorResizeHolder){
this.editor.resize=this._editorResizeHolder;
}
if(!this._origState&&!this._origiFrameState){
return;
}
if(ed._fullscreen_oldOnKeyDown){
ed.onKeyDown=ed._fullscreen_oldOnKeyDown;
delete ed._fullscreen_oldOnKeyDown;
}
var _13=this;
setTimeout(function(){
var mb=_13._origState.marginBox;
var oh=_13._origState.height;
if(dojo.isIE&&!dojo.isQuirks){
_c.parentNode.style.overflow=_13._oldBodyParentOverflow;
delete _13._oldBodyParentOverflow;
}
dojo.style(_c,"overflow",_13._oldOverflow);
delete _13._oldOverflow;
dojo.style(ed.domNode,_13._origState);
dojo.style(ed.iframe.parentNode,{height:"",width:""});
dojo.style(ed.iframe,_13._origiFrameState);
delete _13._origState;
delete _13._origiFrameState;
var _14=dijit.getEnclosingWidget(ed.domNode.parentNode);
if(_14&&_14.resize){
_14.resize();
}else{
if(!oh||oh.indexOf("%")<0){
setTimeout(dojo.hitch(this,function(){
ed.resize({h:mb.h});
}),0);
}
}
dojo.window.scrollIntoView(_13.editor.toolbar.domNode);
},100);
}
},updateState:function(){
this.button.set("disabled",this.get("disabled"));
},destroy:function(){
if(this._resizeHandle){
dojo.disconnect(this._resizeHandle);
this._resizeHandle=null;
}
if(this._resizeHandle2){
dojo.disconnect(this._resizeHandle2);
this._resizeHandle2=null;
}
if(this._resizer){
clearTimeout(this._resizer);
this._resizer=null;
}
this.inherited(arguments);
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _15=o.args.name.toLowerCase();
if(_15==="fullscreen"){
o.plugin=new dijit._editor.plugins.FullScreen({zIndex:("zIndex" in o.args)?o.args.zIndex:500});
}
});
}
