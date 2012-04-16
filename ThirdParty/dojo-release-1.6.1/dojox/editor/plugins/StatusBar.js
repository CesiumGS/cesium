/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.StatusBar"]){
dojo._hasResource["dojox.editor.plugins.StatusBar"]=true;
dojo.provide("dojox.editor.plugins.StatusBar");
dojo.require("dijit.Toolbar");
dojo.require("dijit._editor._Plugin");
dojo.require("dojox.layout.ResizeHandle");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojox.editor.plugins","StatusBar",null,"");
dojo.experimental("dojox.editor.plugins.StatusBar");
dojo.declare("dojox.editor.plugins._StatusBar",[dijit._Widget,dijit._Templated],{templateString:"<div class=\"dojoxEditorStatusBar\">"+"<table><tbody><tr>"+"<td class=\"dojoxEditorStatusBarText\" tabindex=\"-1\" aria-role=\"presentation\" aria-live=\"aggressive\"><span dojoAttachPoint=\"barContent\">&nbsp;</span></td>"+"<td><span dojoAttachPoint=\"handle\"></span></td>"+"</tr></tbody><table>"+"</div>",_getValueAttr:function(){
return this.barContent.innerHTML;
},_setValueAttr:function(_1){
if(_1){
_1=dojo.trim(_1);
if(!_1){
_1="&nbsp;";
}
}else{
_1="&nbsp;";
}
this.barContent.innerHTML=_1;
}});
dojo.declare("dojox.editor.plugins.StatusBar",dijit._editor._Plugin,{statusBar:null,resizer:true,setEditor:function(_2){
this.editor=_2;
this.statusBar=new dojox.editor.plugins._StatusBar();
if(this.resizer){
this.resizeHandle=new dojox.layout.ResizeHandle({targetId:this.editor,activeResize:true},this.statusBar.handle);
this.resizeHandle.startup();
}else{
dojo.style(this.statusBar.handle.parentNode,"display","none");
}
var _3=null;
if(_2.footer.lastChild){
_3="after";
}
dojo.place(this.statusBar.domNode,_2.footer.lastChild||_2.footer,_3);
this.statusBar.startup();
this.editor.statusBar=this;
this._msgListener=dojo.subscribe(this.editor.id+"_statusBar",dojo.hitch(this,this._setValueAttr));
},_getValueAttr:function(){
return this.statusBar.get("value");
},_setValueAttr:function(_4){
this.statusBar.set("value",_4);
},set:function(_5,_6){
if(_5){
var _7="_set"+_5.charAt(0).toUpperCase()+_5.substring(1,_5.length)+"Attr";
if(dojo.isFunction(this[_7])){
this[_7](_6);
}else{
this[_5]=_6;
}
}
},get:function(_8){
if(_8){
var _9="_get"+_8.charAt(0).toUpperCase()+_8.substring(1,_8.length)+"Attr";
var f=this[_9];
if(dojo.isFunction(f)){
return this[_9]();
}else{
return this[_8];
}
}
return null;
},destroy:function(){
if(this.statusBar){
this.statusBar.destroy();
delete this.statusBar;
}
if(this.resizeHandle){
this.resizeHandle.destroy();
delete this.resizeHandle;
}
if(this._msgListener){
dojo.unsubscribe(this._msgListener);
delete this._msgListener;
}
delete this.editor.statusBar;
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _a=o.args.name.toLowerCase();
if(_a==="statusbar"){
var _b=("resizer" in o.args)?o.args.resizer:true;
o.plugin=new dojox.editor.plugins.StatusBar({resizer:_b});
}
});
}
