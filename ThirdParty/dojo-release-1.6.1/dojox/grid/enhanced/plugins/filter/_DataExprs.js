/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.filter._DataExprs"]){
dojo._hasResource["dojox.grid.enhanced.plugins.filter._DataExprs"]=true;
dojo.provide("dojox.grid.enhanced.plugins.filter._DataExprs");
dojo.require("dojox.grid.enhanced.plugins.filter._ConditionExpr");
dojo.require("dojo.date.locale");
(function(){
var _1=dojox.grid.enhanced.plugins.filter;
dojo.declare("dojox.grid.enhanced.plugins.filter.BooleanExpr",_1._DataExpr,{_name:"bool",_convertData:function(_2){
return !!_2;
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.StringExpr",_1._DataExpr,{_name:"string",_convertData:function(_3){
return String(_3);
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.NumberExpr",_1._DataExpr,{_name:"number",_convertDataToExpr:function(_4){
return parseFloat(_4);
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.DateExpr",_1._DataExpr,{_name:"date",_convertData:function(_5){
if(_5 instanceof Date){
return _5;
}else{
if(typeof _5=="number"){
return new Date(_5);
}else{
var _6=dojo.date.locale.parse(String(_5),dojo.mixin({selector:this._name},this._convertArgs));
if(!_6){
throw new Error("Datetime parse failed: "+_5);
}
return _6;
}
}
},toObject:function(){
if(this._value instanceof Date){
var _7=this._value;
this._value=this._value.valueOf();
var _8=this.inherited(arguments);
this._value=_7;
return _8;
}else{
return this.inherited(arguments);
}
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.TimeExpr",_1.DateExpr,{_name:"time"});
})();
}
