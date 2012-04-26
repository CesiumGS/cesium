/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.manager._ValueMixin"]){
dojo._hasResource["dojox.form.manager._ValueMixin"]=true;
dojo.provide("dojox.form.manager._ValueMixin");
dojo.declare("dojox.form.manager._ValueMixin",null,{elementValue:function(_1,_2){
if(_1 in this.formWidgets){
return this.formWidgetValue(_1,_2);
}
if(this.formNodes&&_1 in this.formNodes){
return this.formNodeValue(_1,_2);
}
return this.formPointValue(_1,_2);
},gatherFormValues:function(_3){
var _4=this.inspectFormWidgets(function(_5){
return this.formWidgetValue(_5);
},_3);
if(this.inspectFormNodes){
dojo.mixin(_4,this.inspectFormNodes(function(_6){
return this.formNodeValue(_6);
},_3));
}
dojo.mixin(_4,this.inspectAttachedPoints(function(_7){
return this.formPointValue(_7);
},_3));
return _4;
},setFormValues:function(_8){
if(_8){
this.inspectFormWidgets(function(_9,_a,_b){
this.formWidgetValue(_9,_b);
},_8);
if(this.inspectFormNodes){
this.inspectFormNodes(function(_c,_d,_e){
this.formNodeValue(_c,_e);
},_8);
}
this.inspectAttachedPoints(function(_f,_10,_11){
this.formPointValue(_f,_11);
},_8);
}
return this;
}});
}
