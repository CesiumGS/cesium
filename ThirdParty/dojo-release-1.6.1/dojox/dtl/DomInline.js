/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.DomInline"]){
dojo._hasResource["dojox.dtl.DomInline"]=true;
dojo.provide("dojox.dtl.DomInline");
dojo.require("dojox.dtl.dom");
dojo.require("dijit._Widget");
dojox.dtl.DomInline=dojo.extend(function(_1,_2){
this.create(_1,_2);
},dijit._Widget.prototype,{context:null,render:function(_3){
this.context=_3||this.context;
this.postMixInProperties();
var _4=this.template.render(this.context).getRootNode();
if(_4!=this.containerNode){
this.containerNode.parentNode.replaceChild(_4,this.containerNode);
this.containerNode=_4;
}
},declaredClass:"dojox.dtl.Inline",buildRendering:function(){
var _5=this.domNode=document.createElement("div");
this.containerNode=_5.appendChild(document.createElement("div"));
var _6=this.srcNodeRef;
if(_6.parentNode){
_6.parentNode.replaceChild(_5,_6);
}
this.template=new dojox.dtl.DomTemplate(dojo.trim(_6.text),true);
this.render();
},postMixInProperties:function(){
this.context=(this.context.get===dojox.dtl._Context.prototype.get)?this.context:new dojox.dtl.Context(this.context);
}});
}
