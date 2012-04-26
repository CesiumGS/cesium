/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.render.dom"]){
dojo._hasResource["dojox.dtl.render.dom"]=true;
dojo.provide("dojox.dtl.render.dom");
dojo.require("dojox.dtl.Context");
dojo.require("dojox.dtl.dom");
dojox.dtl.render.dom.Render=function(_1,_2){
this._tpl=_2;
this.domNode=dojo.byId(_1);
};
dojo.extend(dojox.dtl.render.dom.Render,{setAttachPoint:function(_3){
this.domNode=_3;
},render:function(_4,_5,_6){
if(!this.domNode){
throw new Error("You cannot use the Render object without specifying where you want to render it");
}
this._tpl=_5=_5||this._tpl;
_6=_6||_5.getBuffer();
_4=_4||new dojox.dtl.Context();
var _7=_5.render(_4,_6).getParent();
if(!_7){
throw new Error("Rendered template does not have a root node");
}
if(this.domNode!==_7){
this.domNode.parentNode.replaceChild(_7,this.domNode);
this.domNode=_7;
}
}});
}
