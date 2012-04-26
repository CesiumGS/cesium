/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.filter.FilterBuilder"]){
dojo._hasResource["dojox.grid.enhanced.plugins.filter.FilterBuilder"]=true;
dojo.provide("dojox.grid.enhanced.plugins.filter.FilterBuilder");
dojo.require("dojox.grid.enhanced.plugins.filter._FilterExpr");
(function(){
var _1=dojox.grid.enhanced.plugins.filter,_2=function(_3){
return dojo.partial(function(_4,_5){
return new _1[_4](_5);
},_3);
},_6=function(_7){
return dojo.partial(function(_8,_9){
return new _1.LogicNOT(new _1[_8](_9));
},_7);
};
dojo.declare("dojox.grid.enhanced.plugins.filter.FilterBuilder",null,{buildExpression:function(_a){
if("op" in _a){
return this.supportedOps[_a.op.toLowerCase()](dojo.map(_a.data,this.buildExpression,this));
}else{
var _b=dojo.mixin(this.defaultArgs[_a.datatype],_a.args||{});
return new this.supportedTypes[_a.datatype](_a.data,_a.isColumn,_b);
}
},supportedOps:{"equalto":_2("EqualTo"),"lessthan":_2("LessThan"),"lessthanorequalto":_2("LessThanOrEqualTo"),"largerthan":_2("LargerThan"),"largerthanorequalto":_2("LargerThanOrEqualTo"),"contains":_2("Contains"),"startswith":_2("StartsWith"),"endswith":_2("EndsWith"),"notequalto":_6("EqualTo"),"notcontains":_6("Contains"),"notstartswith":_6("StartsWith"),"notendswith":_6("EndsWith"),"isempty":_2("IsEmpty"),"range":function(_c){
return new _1.LogicALL(new _1.LargerThanOrEqualTo(_c.slice(0,2)),new _1.LessThanOrEqualTo(_c[0],_c[2]));
},"logicany":_2("LogicANY"),"logicall":_2("LogicALL")},supportedTypes:{"number":_1.NumberExpr,"string":_1.StringExpr,"boolean":_1.BooleanExpr,"date":_1.DateExpr,"time":_1.TimeExpr},defaultArgs:{"boolean":{"falseValue":"false","convert":function(_d,_e){
var _f=_e.falseValue;
var _10=_e.trueValue;
if(dojo.isString(_d)){
if(_10&&_d.toLowerCase()==_10){
return true;
}
if(_f&&_d.toLowerCase()==_f){
return false;
}
}
return !!_d;
}}}});
})();
}
