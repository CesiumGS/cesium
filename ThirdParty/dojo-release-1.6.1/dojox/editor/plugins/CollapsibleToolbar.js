/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.CollapsibleToolbar"]){
dojo._hasResource["dojox.editor.plugins.CollapsibleToolbar"]=true;
dojo.provide("dojox.editor.plugins.CollapsibleToolbar");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit._editor._Plugin");
dojo.require("dijit.form.Button");
dojo.require("dojo.i18n");
dojo.requireLocalization("dojox.editor.plugins","CollapsibleToolbar",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dojox.editor.plugins._CollapsibleToolbarButton",[dijit._Widget,dijit._Templated],{templateString:"<div tabindex='0' role='button' title='${title}' class='${buttonClass}' "+"dojoAttachEvent='ondijitclick: onClick'><span class='${textClass}'>${text}</span></div>",title:"",buttonClass:"",text:"",textClass:"",onClick:function(e){
}});
dojo.declare("dojox.editor.plugins.CollapsibleToolbar",dijit._editor._Plugin,{_myWidgets:null,setEditor:function(_1){
this.editor=_1;
this._constructContainer();
},_constructContainer:function(){
var _2=dojo.i18n.getLocalization("dojox.editor.plugins","CollapsibleToolbar");
this._myWidgets=[];
var _3=dojo.create("table",{style:{width:"100%"},tabindex:-1,"class":"dojoxCollapsibleToolbarContainer"});
var _4=dojo.create("tbody",{tabindex:-1},_3);
var _5=dojo.create("tr",{tabindex:-1},_4);
var _6=dojo.create("td",{"class":"dojoxCollapsibleToolbarControl",tabindex:-1},_5);
var _7=dojo.create("td",{"class":"dojoxCollapsibleToolbarControl",tabindex:-1},_5);
var _8=dojo.create("td",{style:{width:"100%"},tabindex:-1},_5);
var m=dojo.create("span",{style:{width:"100%"},tabindex:-1},_8);
var _9=new dojox.editor.plugins._CollapsibleToolbarButton({buttonClass:"dojoxCollapsibleToolbarCollapse",title:_2.collapse,text:"-",textClass:"dojoxCollapsibleToolbarCollapseText"});
dojo.place(_9.domNode,_6);
var _a=new dojox.editor.plugins._CollapsibleToolbarButton({buttonClass:"dojoxCollapsibleToolbarExpand",title:_2.expand,text:"+",textClass:"dojoxCollapsibleToolbarExpandText"});
dojo.place(_a.domNode,_7);
this._myWidgets.push(_9);
this._myWidgets.push(_a);
dojo.style(_7,"display","none");
dojo.place(_3,this.editor.toolbar.domNode,"after");
dojo.place(this.editor.toolbar.domNode,m);
this.openTd=_6;
this.closeTd=_7;
this.menu=m;
this.connect(_9,"onClick","_onClose");
this.connect(_a,"onClick","_onOpen");
},_onClose:function(e){
if(e){
dojo.stopEvent(e);
}
var _b=dojo.marginBox(this.editor.domNode);
dojo.style(this.openTd,"display","none");
dojo.style(this.closeTd,"display","");
dojo.style(this.menu,"display","none");
this.editor.resize({h:_b.h});
if(dojo.isIE){
this.editor.header.className=this.editor.header.className;
this.editor.footer.className=this.editor.footer.className;
}
dijit.focus(this.closeTd.firstChild);
},_onOpen:function(e){
if(e){
dojo.stopEvent(e);
}
var _c=dojo.marginBox(this.editor.domNode);
dojo.style(this.closeTd,"display","none");
dojo.style(this.openTd,"display","");
dojo.style(this.menu,"display","");
this.editor.resize({h:_c.h});
if(dojo.isIE){
this.editor.header.className=this.editor.header.className;
this.editor.footer.className=this.editor.footer.className;
}
dijit.focus(this.openTd.firstChild);
},destroy:function(){
this.inherited(arguments);
if(this._myWidgets){
while(this._myWidgets.length){
this._myWidgets.pop().destroy();
}
delete this._myWidgets;
}
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _d=o.args.name.toLowerCase();
if(_d==="collapsibletoolbar"){
o.plugin=new dojox.editor.plugins.CollapsibleToolbar({});
}
});
}
