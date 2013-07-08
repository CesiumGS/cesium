//>>built
define("dijit/_editor/plugins/FullScreen",["dojo/aspect","dojo/_base/declare","dojo/dom-class","dojo/dom-geometry","dojo/dom-style","dojo/i18n","dojo/keys","dojo/_base/lang","dojo/on","dojo/sniff","dojo/_base/window","dojo/window","../../focus","../_Plugin","../../form/ToggleButton","../../registry","dojo/i18n!../nls/commands"],function(_1,_2,_3,_4,_5,_6,_7,_8,on,_9,_a,_b,_c,_d,_e,_f){
var _10=_2("dijit._editor.plugins.FullScreen",_d,{zIndex:500,_origState:null,_origiFrameState:null,_resizeHandle:null,isFullscreen:false,toggle:function(){
this.button.set("checked",!this.button.get("checked"));
},_initButton:function(){
var _11=_6.getLocalization("dijit._editor","commands"),_12=this.editor;
this.button=new _e({label:_11["fullScreen"],ownerDocument:_12.ownerDocument,dir:_12.dir,lang:_12.lang,showLabel:false,iconClass:this.iconClassPrefix+" "+this.iconClassPrefix+"FullScreen",tabIndex:"-1",onChange:_8.hitch(this,"_setFullScreen")});
},setEditor:function(_13){
this.editor=_13;
this._initButton();
this.editor.addKeyHandler(_7.F11,true,true,_8.hitch(this,function(e){
this.toggle();
e.stopPropagation();
e.preventDefault();
this.editor.defer("focus",250);
return true;
}));
this.own(on(this.editor.domNode,"keydown",_8.hitch(this,"_containFocus")));
},_containFocus:function(e){
if(this.isFullscreen){
var ed=this.editor;
if(!ed.isTabIndent&&ed._fullscreen_oldOnKeyDown&&e.keyCode===_7.TAB){
var f=_c.curNode;
var avn=this._getAltViewNode();
if(f==ed.iframe||(avn&&f===avn)){
setTimeout(_8.hitch(this,function(){
ed.toolbar.focus();
}),10);
}else{
if(avn&&_5.get(ed.iframe,"display")==="none"){
setTimeout(_8.hitch(this,function(){
_c.focus(avn);
}),10);
}else{
setTimeout(_8.hitch(this,function(){
ed.focus();
}),10);
}
}
event.stopPropagation();
event.preventDefault();
}else{
if(ed._fullscreen_oldOnKeyDown){
ed._fullscreen_oldOnKeyDown(e);
}
}
}
},_resizeEditor:function(){
var vp=_b.getBox(this.editor.ownerDocument);
_4.setMarginBox(this.editor.domNode,{w:vp.w,h:vp.h});
var _14=this.editor.getHeaderHeight();
var _15=this.editor.getFooterHeight();
var _16=_4.getPadBorderExtents(this.editor.domNode);
var _17=_4.getPadBorderExtents(this.editor.iframe.parentNode);
var _18=_4.getMarginExtents(this.editor.iframe.parentNode);
var _19=vp.h-(_14+_16.h+_15);
_4.setMarginBox(this.editor.iframe.parentNode,{h:_19,w:vp.w});
_4.setMarginBox(this.editor.iframe,{h:_19-(_17.h+_18.h)});
},_getAltViewNode:function(){
},_setFullScreen:function(_1a){
var ed=this.editor;
var _1b=ed.ownerDocumentBody;
var _1c=ed.domNode.parentNode;
var vp=_b.getBox(ed.ownerDocument);
this.isFullscreen=_1a;
if(_1a){
while(_1c&&_1c!==_1b){
_3.add(_1c,"dijitForceStatic");
_1c=_1c.parentNode;
}
this._editorResizeHolder=this.editor.resize;
ed.resize=function(){
};
ed._fullscreen_oldOnKeyDown=ed.onKeyDown;
ed.onKeyDown=_8.hitch(this,this._containFocus);
this._origState={};
this._origiFrameState={};
var _1d=ed.domNode,_1e=_1d&&_1d.style||{};
this._origState={width:_1e.width||"",height:_1e.height||"",top:_5.get(_1d,"top")||"",left:_5.get(_1d,"left")||"",position:_5.get(_1d,"position")||"static",marginBox:_4.getMarginBox(ed.domNode)};
var _1f=ed.iframe,_20=_1f&&_1f.style||{};
var bc=_5.get(ed.iframe,"backgroundColor");
this._origiFrameState={backgroundColor:bc||"transparent",width:_20.width||"auto",height:_20.height||"auto",zIndex:_20.zIndex||""};
_5.set(ed.domNode,{position:"absolute",top:"0px",left:"0px",zIndex:this.zIndex,width:vp.w+"px",height:vp.h+"px"});
_5.set(ed.iframe,{height:"100%",width:"100%",zIndex:this.zIndex,backgroundColor:bc!=="transparent"&&bc!=="rgba(0, 0, 0, 0)"?bc:"white"});
_5.set(ed.iframe.parentNode,{height:"95%",width:"100%"});
if(_1b.style&&_1b.style.overflow){
this._oldOverflow=_5.get(_1b,"overflow");
}else{
this._oldOverflow="";
}
if(_9("ie")&&!_9("quirks")){
if(_1b.parentNode&&_1b.parentNode.style&&_1b.parentNode.style.overflow){
this._oldBodyParentOverflow=_1b.parentNode.style.overflow;
}else{
try{
this._oldBodyParentOverflow=_5.get(_1b.parentNode,"overflow");
}
catch(e){
this._oldBodyParentOverflow="scroll";
}
}
_5.set(_1b.parentNode,"overflow","hidden");
}
_5.set(_1b,"overflow","hidden");
var _21=function(){
var vp=_b.getBox(ed.ownerDocument);
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
this._resizer=setTimeout(_8.hitch(this,function(){
delete this._resizer;
this._resizeEditor();
}),10);
};
this._resizeHandle=on(window,"resize",_8.hitch(this,_21));
this._resizeHandle2=_1.after(ed,"onResize",_8.hitch(this,function(){
if(this._resizer){
clearTimeout(this._resizer);
delete this._resizer;
}
this._resizer=setTimeout(_8.hitch(this,function(){
delete this._resizer;
this._resizeEditor();
}),10);
}));
this._resizeEditor();
var dn=this.editor.toolbar.domNode;
setTimeout(function(){
_b.scrollIntoView(dn);
},250);
}else{
if(this._resizeHandle){
this._resizeHandle.remove();
this._resizeHandle=null;
}
if(this._resizeHandle2){
this._resizeHandle2.remove();
this._resizeHandle2=null;
}
if(this._rst){
clearTimeout(this._rst);
this._rst=null;
}
while(_1c&&_1c!==_1b){
_3.remove(_1c,"dijitForceStatic");
_1c=_1c.parentNode;
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
var _22=this;
setTimeout(function(){
var mb=_22._origState.marginBox;
var oh=_22._origState.height;
if(_9("ie")&&!_9("quirks")){
_1b.parentNode.style.overflow=_22._oldBodyParentOverflow;
delete _22._oldBodyParentOverflow;
}
_5.set(_1b,"overflow",_22._oldOverflow);
delete _22._oldOverflow;
_5.set(ed.domNode,_22._origState);
_5.set(ed.iframe.parentNode,{height:"",width:""});
_5.set(ed.iframe,_22._origiFrameState);
delete _22._origState;
delete _22._origiFrameState;
var _23=_f.getEnclosingWidget(ed.domNode.parentNode);
if(_23&&_23.resize){
_23.resize();
}else{
if(!oh||oh.indexOf("%")<0){
setTimeout(_8.hitch(this,function(){
ed.resize({h:mb.h});
}),0);
}
}
_b.scrollIntoView(_22.editor.toolbar.domNode);
},100);
}
},updateState:function(){
this.button.set("disabled",this.get("disabled"));
},destroy:function(){
if(this._resizeHandle){
this._resizeHandle.remove();
this._resizeHandle=null;
}
if(this._resizeHandle2){
this._resizeHandle2.remove();
this._resizeHandle2=null;
}
if(this._resizer){
clearTimeout(this._resizer);
this._resizer=null;
}
this.inherited(arguments);
}});
_d.registry["fullScreen"]=_d.registry["fullscreen"]=function(_24){
return new _10({zIndex:("zIndex" in _24)?_24.zIndex:500});
};
return _10;
});
