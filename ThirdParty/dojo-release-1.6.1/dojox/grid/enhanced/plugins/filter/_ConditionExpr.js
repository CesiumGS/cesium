/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.filter._ConditionExpr"]){
dojo._hasResource["dojox.grid.enhanced.plugins.filter._ConditionExpr"]=true;
dojo.provide("dojox.grid.enhanced.plugins.filter._ConditionExpr");
(function(){
var _1=dojox.grid.enhanced.plugins.filter;
dojo.declare("dojox.grid.enhanced.plugins.filter._ConditionExpr",null,{_name:"expr",applyRow:function(_2,_3){
throw new Error("_ConditionExpr.applyRow: unimplemented interface");
},toObject:function(){
return {};
},getName:function(){
return this._name;
}});
dojo.declare("dojox.grid.enhanced.plugins.filter._DataExpr",_1._ConditionExpr,{_name:"data",constructor:function(_4,_5,_6){
this._convertArgs=_6||{};
if(dojo.isFunction(this._convertArgs.convert)){
this._convertData=dojo.hitch(this._convertArgs.scope,this._convertArgs.convert);
}
if(_5){
this._colArg=_4;
}else{
this._value=this._convertData(_4,this._convertArgs);
}
},getValue:function(){
return this._value;
},applyRow:function(_7,_8){
return typeof this._colArg=="undefined"?this:new (dojo.getObject(this.declaredClass))(this._convertData(_8(_7,this._colArg),this._convertArgs));
},_convertData:function(_9){
return _9;
},toObject:function(){
return {op:this.getName(),data:this._colArg===undefined?this._value:this._colArg,isCol:this._colArg!==undefined};
}});
dojo.declare("dojox.grid.enhanced.plugins.filter._OperatorExpr",_1._ConditionExpr,{_name:"operator",constructor:function(){
if(dojo.isArray(arguments[0])){
this._operands=arguments[0];
}else{
this._operands=[];
for(var i=0;i<arguments.length;++i){
this._operands.push(arguments[i]);
}
}
},toObject:function(){
return {op:this.getName(),data:dojo.map(this._operands,function(_a){
return _a.toObject();
})};
}});
dojo.declare("dojox.grid.enhanced.plugins.filter._UniOpExpr",_1._OperatorExpr,{_name:"uniOperator",applyRow:function(_b,_c){
if(!(this._operands[0] instanceof _1._ConditionExpr)){
throw new Error("_UniOpExpr: operand is not expression.");
}
return this._calculate(this._operands[0],_b,_c);
},_calculate:function(_d,_e,_f){
throw new Error("_UniOpExpr._calculate: unimplemented interface");
}});
dojo.declare("dojox.grid.enhanced.plugins.filter._BiOpExpr",_1._OperatorExpr,{_name:"biOperator",applyRow:function(_10,_11){
if(!(this._operands[0] instanceof _1._ConditionExpr)){
throw new Error("_BiOpExpr: left operand is not expression.");
}else{
if(!(this._operands[1] instanceof _1._ConditionExpr)){
throw new Error("_BiOpExpr: right operand is not expression.");
}
}
return this._calculate(this._operands[0],this._operands[1],_10,_11);
},_calculate:function(_12,_13,_14,_15){
throw new Error("_BiOpExpr._calculate: unimplemented interface");
}});
})();
}
