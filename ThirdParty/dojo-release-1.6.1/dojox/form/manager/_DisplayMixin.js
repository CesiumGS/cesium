/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.manager._DisplayMixin"]){
dojo._hasResource["dojox.form.manager._DisplayMixin"]=true;
dojo.provide("dojox.form.manager._DisplayMixin");
dojo.declare("dojox.form.manager._DisplayMixin",null,{gatherDisplayState:function(_1){
var _2=this.inspectAttachedPoints(function(_3,_4){
return dojo.style(_4,"display")!="none";
},_1);
return _2;
},show:function(_5,_6){
if(arguments.length<2){
_6=true;
}
this.inspectAttachedPoints(function(_7,_8,_9){
dojo.style(_8,"display",_9?"":"none");
},_5,_6);
return this;
},hide:function(_a){
return this.show(_a,false);
}});
}
