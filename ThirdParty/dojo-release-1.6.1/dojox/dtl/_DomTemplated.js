/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl._DomTemplated"]){
dojo._hasResource["dojox.dtl._DomTemplated"]=true;
dojo.provide("dojox.dtl._DomTemplated");
dojo.require("dijit._Templated");
dojo.require("dojox.dtl.dom");
dojo.require("dojox.dtl.render.dom");
dojo.require("dojox.dtl.contrib.dijit");
dojox.dtl._DomTemplated=function(){
};
dojox.dtl._DomTemplated.prototype={_dijitTemplateCompat:false,buildRendering:function(){
this.domNode=this.srcNodeRef;
if(!this._render){
var _1=dojox.dtl.contrib.dijit;
var _2=_1.widgetsInTemplate;
_1.widgetsInTemplate=this.widgetsInTemplate;
this.template=this.template||this._getCachedTemplate(this.templatePath,this.templateString);
this._render=new dojox.dtl.render.dom.Render(this.domNode,this.template);
_1.widgetsInTemplate=_2;
}
var _3=this._getContext();
if(!this._created){
delete _3._getter;
}
this.render(_3);
this.domNode=this.template.getRootNode();
if(this.srcNodeRef&&this.srcNodeRef.parentNode){
dojo.destroy(this.srcNodeRef);
delete this.srcNodeRef;
}
},setTemplate:function(_4,_5){
if(dojox.dtl.text._isTemplate(_4)){
this.template=this._getCachedTemplate(null,_4);
}else{
this.template=this._getCachedTemplate(_4);
}
this.render(_5);
},render:function(_6,_7){
if(_7){
this.template=_7;
}
this._render.render(this._getContext(_6),this.template);
},_getContext:function(_8){
if(!(_8 instanceof dojox.dtl.Context)){
_8=false;
}
_8=_8||new dojox.dtl.Context(this);
_8.setThis(this);
return _8;
},_getCachedTemplate:function(_9,_a){
if(!this._templates){
this._templates={};
}
var _b=_a||_9.toString();
var _c=this._templates;
if(_c[_b]){
return _c[_b];
}
return (_c[_b]=new dojox.dtl.DomTemplate(dijit._Templated.getCachedTemplate(_9,_a,true)));
}};
}
