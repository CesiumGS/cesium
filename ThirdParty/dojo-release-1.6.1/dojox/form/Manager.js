/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.Manager"]){
dojo._hasResource["dojox.form.Manager"]=true;
dojo.provide("dojox.form.Manager");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojox.form.manager._Mixin");
dojo.require("dojox.form.manager._NodeMixin");
dojo.require("dojox.form.manager._FormMixin");
dojo.require("dojox.form.manager._ValueMixin");
dojo.require("dojox.form.manager._EnableMixin");
dojo.require("dojox.form.manager._DisplayMixin");
dojo.require("dojox.form.manager._ClassMixin");
dojo.declare("dojox.form.Manager",[dijit._Widget,dojox.form.manager._Mixin,dojox.form.manager._NodeMixin,dojox.form.manager._FormMixin,dojox.form.manager._ValueMixin,dojox.form.manager._EnableMixin,dojox.form.manager._DisplayMixin,dojox.form.manager._ClassMixin],{buildRendering:function(){
var _1=this.domNode=this.srcNodeRef;
if(!this.containerNode){
this.containerNode=_1;
}
this._attachPoints=[];
dijit._Templated.prototype._attachTemplateNodes.call(this,_1);
},destroyRendering:function(){
dijit._Templated.prototype.destroyRendering.call(this);
}});
}
