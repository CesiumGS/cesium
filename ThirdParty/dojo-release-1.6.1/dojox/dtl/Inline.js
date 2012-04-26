/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.Inline"]){
dojo._hasResource["dojox.dtl.Inline"]=true;
dojo.provide("dojox.dtl.Inline");
dojo.require("dojox.dtl._base");
dojo.require("dijit._Widget");
dojox.dtl.Inline=dojo.extend(function(_1,_2){
this.create(_1,_2);
},dijit._Widget.prototype,{context:null,render:function(_3){
this.context=_3||this.context;
this.postMixInProperties();
dojo.query("*",this.domNode).orphan();
this.domNode.innerHTML=this.template.render(this.context);
},declaredClass:"dojox.dtl.Inline",buildRendering:function(){
var _4=this.domNode=document.createElement("div");
var _5=this.srcNodeRef;
if(_5.parentNode){
_5.parentNode.replaceChild(_4,_5);
}
this.template=new dojox.dtl.Template(dojo.trim(_5.text),true);
this.render();
},postMixInProperties:function(){
this.context=(this.context.get===dojox.dtl._Context.prototype.get)?this.context:new dojox.dtl._Context(this.context);
}});
}
