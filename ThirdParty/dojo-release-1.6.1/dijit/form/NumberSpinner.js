/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.form.NumberSpinner"]){
dojo._hasResource["dijit.form.NumberSpinner"]=true;
dojo.provide("dijit.form.NumberSpinner");
dojo.require("dijit.form._Spinner");
dojo.require("dijit.form.NumberTextBox");
dojo.declare("dijit.form.NumberSpinner",[dijit.form._Spinner,dijit.form.NumberTextBoxMixin],{adjust:function(_1,_2){
var tc=this.constraints,v=isNaN(_1),_3=!isNaN(tc.max),_4=!isNaN(tc.min);
if(v&&_2!=0){
_1=(_2>0)?_4?tc.min:_3?tc.max:0:_3?this.constraints.max:_4?tc.min:0;
}
var _5=_1+_2;
if(v||isNaN(_5)){
return _1;
}
if(_3&&(_5>tc.max)){
_5=tc.max;
}
if(_4&&(_5<tc.min)){
_5=tc.min;
}
return _5;
},_onKeyPress:function(e){
if((e.charOrCode==dojo.keys.HOME||e.charOrCode==dojo.keys.END)&&!(e.ctrlKey||e.altKey||e.metaKey)&&typeof this.get("value")!="undefined"){
var _6=this.constraints[(e.charOrCode==dojo.keys.HOME?"min":"max")];
if(typeof _6=="number"){
this._setValueAttr(_6,false);
}
dojo.stopEvent(e);
}
}});
}
