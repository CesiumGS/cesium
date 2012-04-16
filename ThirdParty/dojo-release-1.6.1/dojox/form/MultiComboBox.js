/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.MultiComboBox"]){
dojo._hasResource["dojox.form.MultiComboBox"]=true;
dojo.provide("dojox.form.MultiComboBox");
dojo.experimental("dojox.form.MultiComboBox");
dojo.require("dijit.form.ComboBox");
dojo.require("dijit.form.ValidationTextBox");
dojo.declare("dojox.form.MultiComboBox",[dijit.form.ValidationTextBox,dijit.form.ComboBoxMixin],{delimiter:",",_previousMatches:false,_setValueAttr:function(_1){
if(this.delimiter&&_1.length!=0){
_1=_1+this.delimiter+" ";
arguments[0]=this._addPreviousMatches(_1);
}
this.inherited(arguments);
},_addPreviousMatches:function(_2){
if(this._previousMatches){
if(!_2.match(new RegExp("^"+this._previousMatches))){
_2=this._previousMatches+_2;
}
_2=this._cleanupDelimiters(_2);
}
return _2;
},_cleanupDelimiters:function(_3){
if(this.delimiter){
_3=_3.replace(new RegExp("  +")," ");
_3=_3.replace(new RegExp("^ *"+this.delimiter+"* *"),"");
_3=_3.replace(new RegExp(this.delimiter+" *"+this.delimiter),this.delimiter);
}
return _3;
},_autoCompleteText:function(_4){
arguments[0]=this._addPreviousMatches(_4);
this.inherited(arguments);
},_startSearch:function(_5){
_5=this._cleanupDelimiters(_5);
var re=new RegExp("^.*"+this.delimiter+" *");
if((this._previousMatches=_5.match(re))){
arguments[0]=_5.replace(re,"");
}
this.inherited(arguments);
}});
}
