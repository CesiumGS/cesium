//>>built
define("dijit/_editor/plugins/ViewSource",["dojo/_base/array","dojo/aspect","dojo/_base/declare","dojo/dom-attr","dojo/dom-construct","dojo/dom-geometry","dojo/dom-style","dojo/i18n","dojo/keys","dojo/_base/lang","dojo/on","dojo/sniff","dojo/window","../../focus","../_Plugin","../../form/ToggleButton","../..","../../registry","dojo/i18n!../nls/commands"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,on,_b,_c,_d,_e,_f,_10,_11){
var _12=_3("dijit._editor.plugins.ViewSource",_e,{stripScripts:true,stripComments:true,stripIFrames:true,readOnly:false,_fsPlugin:null,toggle:function(){
if(_b("webkit")){
this._vsFocused=true;
}
this.button.set("checked",!this.button.get("checked"));
},_initButton:function(){
var _13=_8.getLocalization("dijit._editor","commands"),_14=this.editor;
this.button=new _f({label:_13["viewSource"],ownerDocument:_14.ownerDocument,dir:_14.dir,lang:_14.lang,showLabel:false,iconClass:this.iconClassPrefix+" "+this.iconClassPrefix+"ViewSource",tabIndex:"-1",onChange:_a.hitch(this,"_showSource")});
if(_b("ie")==7){
this._ieFixNode=_5.create("div",{style:{opacity:"0",zIndex:"-1000",position:"absolute",top:"-1000px"}},_14.ownerDocumentBody);
}
this.button.set("readOnly",false);
},setEditor:function(_15){
this.editor=_15;
this._initButton();
this.editor.addKeyHandler(_9.F12,true,true,_a.hitch(this,function(e){
this.button.focus();
this.toggle();
e.stopPropagation();
e.preventDefault();
setTimeout(_a.hitch(this,function(){
if(this.editor.focused){
this.editor.focus();
}
}),100);
}));
},_showSource:function(_16){
var ed=this.editor;
var _17=ed._plugins;
var _18;
this._sourceShown=_16;
var _19=this;
try{
if(!this.sourceArea){
this._createSourceView();
}
if(_16){
ed._sourceQueryCommandEnabled=ed.queryCommandEnabled;
ed.queryCommandEnabled=function(cmd){
return cmd.toLowerCase()==="viewsource";
};
this.editor.onDisplayChanged();
_18=ed.get("value");
_18=this._filter(_18);
ed.set("value",_18);
_1.forEach(_17,function(p){
if(p&&!(p instanceof _12)&&p.isInstanceOf(_e)){
p.set("disabled",true);
}
});
if(this._fsPlugin){
this._fsPlugin._getAltViewNode=function(){
return _19.sourceArea;
};
}
this.sourceArea.value=_18;
this.sourceArea.style.height=ed.iframe.style.height;
this.sourceArea.style.width=ed.iframe.style.width;
_7.set(ed.iframe,"display","none");
_7.set(this.sourceArea,{display:"block"});
var _1a=function(){
var vp=_c.getBox(ed.ownerDocument);
if("_prevW" in this&&"_prevH" in this){
if(vp.w===this._prevW&&vp.h===this._prevH){
return;
}else{
this._prevW=vp.w;
this._prevH=vp.h;
}
}else{
this._prevW=vp.w;
this._prevH=vp.h;
}
if(this._resizer){
clearTimeout(this._resizer);
delete this._resizer;
}
this._resizer=setTimeout(_a.hitch(this,function(){
delete this._resizer;
this._resize();
}),10);
};
this._resizeHandle=on(window,"resize",_a.hitch(this,_1a));
setTimeout(_a.hitch(this,this._resize),100);
this.editor.onNormalizedDisplayChanged();
this.editor.__oldGetValue=this.editor.getValue;
this.editor.getValue=_a.hitch(this,function(){
var txt=this.sourceArea.value;
txt=this._filter(txt);
return txt;
});
this._setListener=_2.after(this.editor,"setValue",_a.hitch(this,function(_1b){
_1b=_1b||"";
_1b=this._filter(_1b);
this.sourceArea.value=_1b;
}),true);
}else{
if(!ed._sourceQueryCommandEnabled){
return;
}
this._setListener.remove();
delete this._setListener;
this._resizeHandle.remove();
delete this._resizeHandle;
if(this.editor.__oldGetValue){
this.editor.getValue=this.editor.__oldGetValue;
delete this.editor.__oldGetValue;
}
ed.queryCommandEnabled=ed._sourceQueryCommandEnabled;
if(!this._readOnly){
_18=this.sourceArea.value;
_18=this._filter(_18);
ed.beginEditing();
ed.set("value",_18);
ed.endEditing();
}
_1.forEach(_17,function(p){
if(p&&p.isInstanceOf(_e)){
p.set("disabled",false);
}
});
_7.set(this.sourceArea,"display","none");
_7.set(ed.iframe,"display","block");
delete ed._sourceQueryCommandEnabled;
this.editor.onDisplayChanged();
}
setTimeout(_a.hitch(this,function(){
var _1c=ed.domNode.parentNode;
if(_1c){
var _1d=_11.getEnclosingWidget(_1c);
if(_1d&&_1d.resize){
_1d.resize();
}
}
ed.resize();
}),300);
}
catch(e){
}
},updateState:function(){
this.button.set("disabled",this.get("disabled"));
},_resize:function(){
var ed=this.editor;
var tbH=ed.getHeaderHeight();
var fH=ed.getFooterHeight();
var eb=_6.position(ed.domNode);
var _1e=_6.getPadBorderExtents(ed.iframe.parentNode);
var _1f=_6.getMarginExtents(ed.iframe.parentNode);
var _20=_6.getPadBorderExtents(ed.domNode);
var edb={w:eb.w-_20.w,h:eb.h-(tbH+_20.h+fH)};
if(this._fsPlugin&&this._fsPlugin.isFullscreen){
var vp=_c.getBox(ed.ownerDocument);
edb.w=(vp.w-_20.w);
edb.h=(vp.h-(tbH+_20.h+fH));
}
if(_b("ie")){
edb.h-=2;
}
if(this._ieFixNode){
var _21=-this._ieFixNode.offsetTop/1000;
edb.w=Math.floor((edb.w+0.9)/_21);
edb.h=Math.floor((edb.h+0.9)/_21);
}
_6.setMarginBox(this.sourceArea,{w:edb.w-(_1e.w+_1f.w),h:edb.h-(_1e.h+_1f.h)});
_6.setMarginBox(ed.iframe.parentNode,{h:edb.h});
},_createSourceView:function(){
var ed=this.editor;
var _22=ed._plugins;
this.sourceArea=_5.create("textarea");
if(this.readOnly){
_4.set(this.sourceArea,"readOnly",true);
this._readOnly=true;
}
_7.set(this.sourceArea,{padding:"0px",margin:"0px",borderWidth:"0px",borderStyle:"none"});
_4.set(this.sourceArea,"aria-label",this.editor.id);
_5.place(this.sourceArea,ed.iframe,"before");
if(_b("ie")&&ed.iframe.parentNode.lastChild!==ed.iframe){
_7.set(ed.iframe.parentNode.lastChild,{width:"0px",height:"0px",padding:"0px",margin:"0px",borderWidth:"0px",borderStyle:"none"});
}
ed._viewsource_oldFocus=ed.focus;
var _23=this;
ed.focus=function(){
if(_23._sourceShown){
_23.setSourceAreaCaret();
}else{
try{
if(this._vsFocused){
delete this._vsFocused;
_d.focus(ed.editNode);
}else{
ed._viewsource_oldFocus();
}
}
catch(e){
}
}
};
var i,p;
for(i=0;i<_22.length;i++){
p=_22[i];
if(p&&(p.declaredClass==="dijit._editor.plugins.FullScreen"||p.declaredClass===(_10._scopeName+"._editor.plugins.FullScreen"))){
this._fsPlugin=p;
break;
}
}
if(this._fsPlugin){
this._fsPlugin._viewsource_getAltViewNode=this._fsPlugin._getAltViewNode;
this._fsPlugin._getAltViewNode=function(){
return _23._sourceShown?_23.sourceArea:this._viewsource_getAltViewNode();
};
}
this.own(on(this.sourceArea,"keydown",_a.hitch(this,function(e){
if(this._sourceShown&&e.keyCode==_9.F12&&e.ctrlKey&&e.shiftKey){
this.button.focus();
this.button.set("checked",false);
setTimeout(_a.hitch(this,function(){
ed.focus();
}),100);
e.stopPropagation();
e.preventDefault();
}
})));
},_stripScripts:function(_24){
if(_24){
_24=_24.replace(/<\s*script[^>]*>((.|\s)*?)<\\?\/\s*script\s*>/ig,"");
_24=_24.replace(/<\s*script\b([^<>]|\s)*>?/ig,"");
_24=_24.replace(/<[^>]*=(\s|)*[("|')]javascript:[^$1][(\s|.)]*[$1][^>]*>/ig,"");
}
return _24;
},_stripComments:function(_25){
if(_25){
_25=_25.replace(/<!--(.|\s){1,}?-->/g,"");
}
return _25;
},_stripIFrames:function(_26){
if(_26){
_26=_26.replace(/<\s*iframe[^>]*>((.|\s)*?)<\\?\/\s*iframe\s*>/ig,"");
}
return _26;
},_filter:function(_27){
if(_27){
if(this.stripScripts){
_27=this._stripScripts(_27);
}
if(this.stripComments){
_27=this._stripComments(_27);
}
if(this.stripIFrames){
_27=this._stripIFrames(_27);
}
}
return _27;
},setSourceAreaCaret:function(){
var _28=this.sourceArea;
_d.focus(_28);
if(this._sourceShown&&!this.readOnly){
if(_28.setSelectionRange){
_28.setSelectionRange(0,0);
}else{
if(this.sourceArea.createTextRange){
var _29=_28.createTextRange();
_29.collapse(true);
_29.moveStart("character",-99999);
_29.moveStart("character",0);
_29.moveEnd("character",0);
_29.select();
}
}
}
},destroy:function(){
if(this._ieFixNode){
_5.destroy(this._ieFixNode);
}
if(this._resizer){
clearTimeout(this._resizer);
delete this._resizer;
}
if(this._resizeHandle){
this._resizeHandle.remove();
delete this._resizeHandle;
}
if(this._setListener){
this._setListener.remove();
delete this._setListener;
}
this.inherited(arguments);
}});
_e.registry["viewSource"]=_e.registry["viewsource"]=function(_2a){
return new _12({readOnly:("readOnly" in _2a)?_2a.readOnly:false,stripComments:("stripComments" in _2a)?_2a.stripComments:true,stripScripts:("stripScripts" in _2a)?_2a.stripScripts:true,stripIFrames:("stripIFrames" in _2a)?_2a.stripIFrames:true});
};
return _12;
});
