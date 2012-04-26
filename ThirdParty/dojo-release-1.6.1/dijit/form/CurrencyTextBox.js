/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.form.CurrencyTextBox"]){
dojo._hasResource["dijit.form.CurrencyTextBox"]=true;
dojo.provide("dijit.form.CurrencyTextBox");
dojo.require("dojo.currency");
dojo.require("dijit.form.NumberTextBox");
dojo.declare("dijit.form.CurrencyTextBox",dijit.form.NumberTextBox,{currency:"",baseClass:"dijitTextBox dijitCurrencyTextBox",regExpGen:function(_1){
return "("+(this._focused?this.inherited(arguments,[dojo.mixin({},_1,this.editOptions)])+"|":"")+dojo.currency.regexp(_1)+")";
},_formatter:dojo.currency.format,_parser:dojo.currency.parse,parse:function(_2,_3){
var v=this.inherited(arguments);
if(isNaN(v)&&/\d+/.test(_2)){
v=dojo.hitch(dojo.mixin({},this,{_parser:dijit.form.NumberTextBox.prototype._parser}),"inherited")(arguments);
}
return v;
},_setConstraintsAttr:function(_4){
if(!_4.currency&&this.currency){
_4.currency=this.currency;
}
this.inherited(arguments,[dojo.currency._mixInDefaults(dojo.mixin(_4,{exponent:false}))]);
}});
}
