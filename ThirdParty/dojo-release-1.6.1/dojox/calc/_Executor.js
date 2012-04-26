/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.calc._Executor"]){
dojo._hasResource["dojox.calc._Executor"]=true;
dojo.provide("dojox.calc._Executor");
dojo.require("dijit._Templated");
dojo.require("dojox.math._base");
dojo.experimental("dojox.calc._Executor");
(function(){
var _1;
if(!("pow" in dojox.calc)){
dojox.calc.pow=function(_2,_3){
function _4(n){
return Math.floor(n)==n;
};
if(_2>=0||_4(_3)){
return Math.pow(_2,_3);
}else{
var _5=1/_3;
return (_4(_5)&&(_5&1))?-Math.pow(-_2,_3):NaN;
}
};
}
dojo.declare("dojox.calc._Executor",[dijit._Widget,dijit._Templated],{templateString:"<iframe src=\""+dojo.moduleUrl("dojox.calc","_ExecutorIframe.html")+"\" style=\"display:none;\" onload=\"if(arguments[0] && arguments[0].Function)"+dijit._scopeName+".byNode(this)._onLoad(arguments[0])\"></iframe>",_onLoad:function(_6){
_1=_6;
_6.outerPrompt=window.prompt;
_6.dojox={math:{}};
for(var f in dojox.math){
_6.dojox.math[f]=dojo.hitch(dojox.math,f);
}
if("toFrac" in dojox.calc){
_6.toFracCall=dojo.hitch(dojox.calc,"toFrac");
this.Function("toFrac","x","return toFracCall(x)");
}
_6.isJavaScriptLanguage=dojo.number.format(1.5,{pattern:"#.#"})=="1.5";
_6.Ans=0;
_6.pi=Math.PI;
_6.eps=Math.E;
_6.powCall=dojo.hitch(dojox.calc,"pow");
this.normalizedFunction("sqrt","x","return Math.sqrt(x)");
this.normalizedFunction("sin","x","return Math.sin(x)");
this.normalizedFunction("cos","x","return Math.cos(x)");
this.normalizedFunction("tan","x","return Math.tan(x)");
this.normalizedFunction("asin","x","return Math.asin(x)");
this.normalizedFunction("acos","x","return Math.acos(x)");
this.normalizedFunction("atan","x","return Math.atan(x)");
this.normalizedFunction("atan2","y, x","return Math.atan2(y, x)");
this.normalizedFunction("Round","x","return Math.round(x)");
this.normalizedFunction("Int","x","return Math.floor(x)");
this.normalizedFunction("Ceil","x","return Math.ceil(x)");
this.normalizedFunction("ln","x","return Math.log(x)");
this.normalizedFunction("log","x","return Math.log(x)/Math.log(10)");
this.normalizedFunction("pow","x, y","return powCall(x,y)");
this.normalizedFunction("permutations","n, r","return dojox.math.permutations(n, r);");
this.normalizedFunction("P","n, r","return dojox.math.permutations(n, r);");
this.normalizedFunction("combinations","n, r","return dojox.math.combinations(n, r);");
this.normalizedFunction("C","n, r","return dojox.math.combinations(n, r)");
this.normalizedFunction("toRadix","number, baseOut","if(!baseOut){ baseOut = 10; } if(typeof number == 'string'){ number = parseFloat(number); }return number.toString(baseOut);");
this.normalizedFunction("toBin","number","return toRadix(number, 2)");
this.normalizedFunction("toOct","number","return toRadix(number, 8)");
this.normalizedFunction("toHex","number","return toRadix(number, 16)");
this.onLoad();
},onLoad:function(){
},Function:function(_7,_8,_9){
return dojo.hitch(_1,_1.Function.apply(_1,arguments));
},normalizedFunction:function(_a,_b,_c){
return dojo.hitch(_1,_1.normalizedFunction.apply(_1,arguments));
},deleteFunction:function(_d){
_1[_d]=undefined;
delete _1[_d];
},eval:function(_e){
return _1.eval.apply(_1,arguments);
},destroy:function(){
this.inherited(arguments);
_1=null;
}});
})();
(function(){
var _f=(1<<30)-35;
dojo.mixin(dojox.calc,{approx:function(r){
if(typeof r=="number"){
return Math.round(r*_f)/_f;
}
return r;
}});
})();
}
