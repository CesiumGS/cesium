/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.Breadcrumb"]){
dojo._hasResource["dojox.editor.plugins.Breadcrumb"]=true;
dojo.provide("dojox.editor.plugins.Breadcrumb");
dojo.require("dojo.string");
dojo.require("dijit.Toolbar");
dojo.require("dijit.Menu");
dojo.require("dijit.MenuItem");
dojo.require("dijit.MenuSeparator");
dojo.require("dijit._editor.range");
dojo.require("dijit._editor.selection");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit.form.Button");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojox.editor.plugins","Breadcrumb",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.experimental("dojox.editor.plugins.Breadcrumb");
dojo.declare("dojox.editor.plugins._BreadcrumbMenuTitle",[dijit._Widget,dijit._Templated,dijit._Contained],{templateString:"<tr><td dojoAttachPoint=\"title\" colspan=\"4\" class=\"dijitToolbar\" style=\"font-weight: bold; padding: 3px;\"></td></tr>",menuTitle:"",postCreate:function(){
dojo.setSelectable(this.domNode,false);
var _1=this.id+"_text";
dijit.setWaiState(this.domNode,"labelledby",_1);
},_setMenuTitleAttr:function(_2){
this.title.innerHTML=_2;
},_getMenuTitleAttr:function(_3){
return this.title.innerHTML;
}});
dojo.declare("dojox.editor.plugins.Breadcrumb",dijit._editor._Plugin,{_menu:null,breadcrumbBar:null,setEditor:function(_4){
this.editor=_4;
this._buttons=[];
this.breadcrumbBar=new dijit.Toolbar();
var _5=dojo.i18n.getLocalization("dojox.editor.plugins","Breadcrumb");
this._titleTemplate=_5.nodeActions;
dojo.place(this.breadcrumbBar.domNode,_4.footer);
this.editor.onLoadDeferred.addCallback(dojo.hitch(this,function(){
this._menu=new dijit.Menu({});
dojo.addClass(this.breadcrumbBar.domNode,"dojoxEditorBreadcrumbArrow");
var _6=this;
var _7=new dijit.form.ComboButton({showLabel:true,label:"body",_selNode:_4.editNode,dropDown:this._menu,onClick:dojo.hitch(this,function(){
this._menuTarget=_4.editNode;
this._selectContents();
})});
this._menuTitle=new dojox.editor.plugins._BreadcrumbMenuTitle({menuTitle:_5.nodeActions});
this._selCMenu=new dijit.MenuItem({label:_5.selectContents,onClick:dojo.hitch(this,this._selectContents)});
this._delCMenu=new dijit.MenuItem({label:_5.deleteContents,onClick:dojo.hitch(this,this._deleteContents)});
this._selEMenu=new dijit.MenuItem({label:_5.selectElement,onClick:dojo.hitch(this,this._selectElement)});
this._delEMenu=new dijit.MenuItem({label:_5.deleteElement,onClick:dojo.hitch(this,this._deleteElement)});
this._moveSMenu=new dijit.MenuItem({label:_5.moveStart,onClick:dojo.hitch(this,this._moveCToStart)});
this._moveEMenu=new dijit.MenuItem({label:_5.moveEnd,onClick:dojo.hitch(this,this._moveCToEnd)});
this._menu.addChild(this._menuTitle);
this._menu.addChild(this._selCMenu);
this._menu.addChild(this._delCMenu);
this._menu.addChild(new dijit.MenuSeparator({}));
this._menu.addChild(this._selEMenu);
this._menu.addChild(this._delEMenu);
this._menu.addChild(new dijit.MenuSeparator({}));
this._menu.addChild(this._moveSMenu);
this._menu.addChild(this._moveEMenu);
_7._ddConnect=dojo.connect(_7,"openDropDown",dojo.hitch(this,function(){
this._menuTarget=_7._selNode;
this._menuTitle.set("menuTitle",dojo.string.substitute(this._titleTemplate,{"nodeName":"&lt;body&gt;"}));
this._selEMenu.set("disabled",true);
this._delEMenu.set("disabled",true);
this._selCMenu.set("disabled",false);
this._delCMenu.set("disabled",false);
this._moveSMenu.set("disabled",false);
this._moveEMenu.set("disabled",false);
}));
this.breadcrumbBar.addChild(_7);
this.connect(this.editor,"onNormalizedDisplayChanged","updateState");
}));
this.breadcrumbBar.startup();
if(dojo.isIE){
setTimeout(dojo.hitch(this,function(){
this.breadcrumbBar.domNode.className=this.breadcrumbBar.domNode.className;
}),100);
}
},_selectContents:function(){
this.editor.focus();
if(this._menuTarget){
var _8=this._menuTarget.tagName.toLowerCase();
switch(_8){
case "br":
case "hr":
case "img":
case "input":
case "base":
case "meta":
case "area":
case "basefont":
break;
default:
try{
dojo.withGlobal(this.editor.window,"collapse",dijit._editor.selection,[null]);
dojo.withGlobal(this.editor.window,"selectElementChildren",dijit._editor.selection,[this._menuTarget]);
this.editor.onDisplayChanged();
}
catch(e){
}
}
}
},_deleteContents:function(){
if(this._menuTarget){
this.editor.beginEditing();
this._selectContents();
dojo.withGlobal(this.editor.window,"remove",dijit._editor.selection,[this._menuTarget]);
this.editor.endEditing();
this._updateBreadcrumb();
this.editor.onDisplayChanged();
}
},_selectElement:function(){
this.editor.focus();
if(this._menuTarget){
dojo.withGlobal(this.editor.window,"collapse",dijit._editor.selection,[null]);
dojo.withGlobal(this.editor.window,"selectElement",dijit._editor.selection,[this._menuTarget]);
this.editor.onDisplayChanged();
}
},_deleteElement:function(){
if(this._menuTarget){
this.editor.beginEditing();
this._selectElement();
dojo.withGlobal(this.editor.window,"remove",dijit._editor.selection,[this._menuTarget]);
this.editor.endEditing();
this._updateBreadcrumb();
this.editor.onDisplayChanged();
}
},_moveCToStart:function(){
this.editor.focus();
if(this._menuTarget){
this._selectContents();
dojo.withGlobal(this.editor.window,"collapse",dijit._editor.selection,[true]);
}
},_moveCToEnd:function(){
this.editor.focus();
if(this._menuTarget){
this._selectContents();
dojo.withGlobal(this.editor.window,"collapse",dijit._editor.selection,[false]);
}
},_updateBreadcrumb:function(){
var ed=this.editor;
if(ed.window){
var _9=dijit.range.getSelection(ed.window);
if(_9&&_9.rangeCount>0){
var _a=_9.getRangeAt(0);
var _b=dojo.withGlobal(ed.window,"getSelectedElement",dijit._editor.selection)||_a.startContainer;
var _c=[];
if(_b&&_b.ownerDocument===ed.document){
while(_b&&_b!==ed.editNode&&_b!=ed.document.body&&_b!=ed.document){
if(_b.nodeType===1){
_c.push({type:_b.tagName.toLowerCase(),node:_b});
}
_b=_b.parentNode;
}
_c=_c.reverse();
while(this._buttons.length){
var db=this._buttons.pop();
dojo.disconnect(db._ddConnect);
this.breadcrumbBar.removeChild(db);
}
this._buttons=[];
var i;
var _d=this;
for(i=0;i<_c.length;i++){
var bc=_c[i];
var b=new dijit.form.ComboButton({showLabel:true,label:bc.type,_selNode:bc.node,dropDown:this._menu,onClick:function(){
_d._menuTarget=this._selNode;
_d._selectContents();
}});
b._ddConnect=dojo.connect(b,"openDropDown",dojo.hitch(b,function(){
_d._menuTarget=this._selNode;
var _e=_d._menuTarget.tagName.toLowerCase();
var _f=dojo.string.substitute(_d._titleTemplate,{"nodeName":"&lt;"+_e+"&gt;"});
_d._menuTitle.set("menuTitle",_f);
switch(_e){
case "br":
case "hr":
case "img":
case "input":
case "base":
case "meta":
case "area":
case "basefont":
_d._selCMenu.set("disabled",true);
_d._delCMenu.set("disabled",true);
_d._moveSMenu.set("disabled",true);
_d._moveEMenu.set("disabled",true);
_d._selEMenu.set("disabled",false);
_d._delEMenu.set("disabled",false);
break;
default:
_d._selCMenu.set("disabled",false);
_d._delCMenu.set("disabled",false);
_d._selEMenu.set("disabled",false);
_d._delEMenu.set("disabled",false);
_d._moveSMenu.set("disabled",false);
_d._moveEMenu.set("disabled",false);
}
}));
this._buttons.push(b);
this.breadcrumbBar.addChild(b);
}
if(dojo.isIE){
this.breadcrumbBar.domNode.className=this.breadcrumbBar.domNode.className;
}
}
}
}
},updateState:function(){
if(dojo.style(this.editor.iframe,"display")==="none"||this.get("disabled")){
dojo.style(this.breadcrumbBar.domNode,"display","none");
}else{
if(dojo.style(this.breadcrumbBar.domNode,"display")==="none"){
dojo.style(this.breadcrumbBar.domNode,"display","block");
}
this._updateBreadcrumb();
var _10=dojo.marginBox(this.editor.domNode);
this.editor.resize({h:_10.h});
}
},destroy:function(){
if(this.breadcrumbBar){
this.breadcrumbBar.destroyRecursive();
this.breadcrumbBar=null;
}
if(this._menu){
this._menu.destroyRecursive();
delete this._menu;
}
this._buttons=null;
delete this.editor.breadcrumbBar;
this.inherited(arguments);
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _11=o.args.name.toLowerCase();
if(_11==="breadcrumb"){
o.plugin=new dojox.editor.plugins.Breadcrumb({});
}
});
}
