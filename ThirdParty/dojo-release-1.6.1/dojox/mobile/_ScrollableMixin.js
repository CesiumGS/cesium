/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile._ScrollableMixin"]){
dojo._hasResource["dojox.mobile._ScrollableMixin"]=true;
dojo.provide("dojox.mobile._ScrollableMixin");
dojo.require("dijit._WidgetBase");
dojo.require("dojox.mobile.scrollable");
dojo.declare("dojox.mobile._ScrollableMixin",null,{fixedHeader:"",fixedFooter:"",destroy:function(){
this.cleanup();
this.inherited(arguments);
},startup:function(){
var _1={};
if(this.fixedHeader){
_1.fixedHeaderHeight=dojo.byId(this.fixedHeader).offsetHeight;
}
if(this.fixedFooter){
var _2=dojo.byId(this.fixedFooter);
if(_2.parentNode==this.domNode){
this.isLocalFooter=true;
_2.style.bottom="0px";
}
_1.fixedFooterHeight=_2.offsetHeight;
}
this.init(_1);
this.inherited(arguments);
}});
(function(){
var _3=new dojox.mobile.scrollable();
dojo.extend(dojox.mobile._ScrollableMixin,_3);
if(dojo.version.major==1&&dojo.version.minor==4){
dojo.mixin(dojox.mobile._ScrollableMixin._meta.hidden,_3);
}
})();
}
