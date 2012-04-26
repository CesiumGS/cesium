/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.filter._FilterExpr"]){
dojo._hasResource["dojox.grid.enhanced.plugins.filter._FilterExpr"]=true;
dojo.provide("dojox.grid.enhanced.plugins.filter._FilterExpr");
dojo.require("dojox.grid.enhanced.plugins.filter._DataExprs");
dojo.require("dojo.date");
(function(){
var _1=dojox.grid.enhanced.plugins.filter;
dojo.declare("dojox.grid.enhanced.plugins.filter.LogicAND",_1._BiOpExpr,{_name:"and",_calculate:function(_2,_3,_4,_5){
var _6=_2.applyRow(_4,_5).getValue()&&_3.applyRow(_4,_5).getValue();
return new _1.BooleanExpr(_6);
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.LogicOR",_1._BiOpExpr,{_name:"or",_calculate:function(_7,_8,_9,_a){
var _b=_7.applyRow(_9,_a).getValue()||_8.applyRow(_9,_a).getValue();
return new _1.BooleanExpr(_b);
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.LogicXOR",_1._BiOpExpr,{_name:"xor",_calculate:function(_c,_d,_e,_f){
var _10=_c.applyRow(_e,_f).getValue();
var _11=_d.applyRow(_e,_f).getValue();
return new _1.BooleanExpr((!!_10)!=(!!_11));
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.LogicNOT",_1._UniOpExpr,{_name:"not",_calculate:function(_12,_13,_14){
return new _1.BooleanExpr(!_12.applyRow(_13,_14).getValue());
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.LogicALL",_1._OperatorExpr,{_name:"all",applyRow:function(_15,_16){
for(var i=0,res=true;res&&(this._operands[i] instanceof _1._ConditionExpr);++i){
res=this._operands[i].applyRow(_15,_16).getValue();
}
return new _1.BooleanExpr(res);
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.LogicANY",_1._OperatorExpr,{_name:"any",applyRow:function(_17,_18){
for(var i=0,res=false;!res&&(this._operands[i] instanceof _1._ConditionExpr);++i){
res=this._operands[i].applyRow(_17,_18).getValue();
}
return new _1.BooleanExpr(res);
}});
function _19(_1a,_1b,row,_1c){
_1a=_1a.applyRow(row,_1c);
_1b=_1b.applyRow(row,_1c);
var _1d=_1a.getValue();
var _1e=_1b.getValue();
if(_1a instanceof _1.TimeExpr){
return dojo.date.compare(_1d,_1e,"time");
}else{
if(_1a instanceof _1.DateExpr){
return dojo.date.compare(_1d,_1e,"date");
}else{
if(_1a instanceof _1.StringExpr){
_1d=_1d.toLowerCase();
_1e=String(_1e).toLowerCase();
}
return _1d==_1e?0:(_1d<_1e?-1:1);
}
}
};
dojo.declare("dojox.grid.enhanced.plugins.filter.EqualTo",_1._BiOpExpr,{_name:"equal",_calculate:function(_1f,_20,_21,_22){
var res=_19(_1f,_20,_21,_22);
return new _1.BooleanExpr(res===0);
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.LessThan",_1._BiOpExpr,{_name:"less",_calculate:function(_23,_24,_25,_26){
var res=_19(_23,_24,_25,_26);
return new _1.BooleanExpr(res<0);
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.LessThanOrEqualTo",_1._BiOpExpr,{_name:"lessEqual",_calculate:function(_27,_28,_29,_2a){
var res=_19(_27,_28,_29,_2a);
return new _1.BooleanExpr(res<=0);
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.LargerThan",_1._BiOpExpr,{_name:"larger",_calculate:function(_2b,_2c,_2d,_2e){
var res=_19(_2b,_2c,_2d,_2e);
return new _1.BooleanExpr(res>0);
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.LargerThanOrEqualTo",_1._BiOpExpr,{_name:"largerEqual",_calculate:function(_2f,_30,_31,_32){
var res=_19(_2f,_30,_31,_32);
return new _1.BooleanExpr(res>=0);
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.Contains",_1._BiOpExpr,{_name:"contains",_calculate:function(_33,_34,_35,_36){
var _37=String(_33.applyRow(_35,_36).getValue()).toLowerCase();
var _38=String(_34.applyRow(_35,_36).getValue()).toLowerCase();
return new _1.BooleanExpr(_37.indexOf(_38)>=0);
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.StartsWith",_1._BiOpExpr,{_name:"startsWith",_calculate:function(_39,_3a,_3b,_3c){
var _3d=String(_39.applyRow(_3b,_3c).getValue()).toLowerCase();
var _3e=String(_3a.applyRow(_3b,_3c).getValue()).toLowerCase();
return new _1.BooleanExpr(_3d.substring(0,_3e.length)==_3e);
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.EndsWith",_1._BiOpExpr,{_name:"endsWith",_calculate:function(_3f,_40,_41,_42){
var _43=String(_3f.applyRow(_41,_42).getValue()).toLowerCase();
var _44=String(_40.applyRow(_41,_42).getValue()).toLowerCase();
return new _1.BooleanExpr(_43.substring(_43.length-_44.length)==_44);
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.Matches",_1._BiOpExpr,{_name:"matches",_calculate:function(_45,_46,_47,_48){
var _49=String(_45.applyRow(_47,_48).getValue());
var _4a=new RegExp(_46.applyRow(_47,_48).getValue());
return new _1.BooleanExpr(_49.search(_4a)>=0);
}});
dojo.declare("dojox.grid.enhanced.plugins.filter.IsEmpty",_1._UniOpExpr,{_name:"isEmpty",_calculate:function(_4b,_4c,_4d){
var res=_4b.applyRow(_4c,_4d).getValue();
return new _1.BooleanExpr(res===""||res==null);
}});
})();
}
