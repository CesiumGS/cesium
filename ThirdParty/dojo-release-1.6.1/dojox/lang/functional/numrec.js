/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.functional.numrec"]){
dojo._hasResource["dojox.lang.functional.numrec"]=true;
dojo.provide("dojox.lang.functional.numrec");
dojo.require("dojox.lang.functional.lambda");
dojo.require("dojox.lang.functional.util");
(function(){
var df=dojox.lang.functional,_1=df.inlineLambda,_2=["_r","_i"];
df.numrec=function(_3,_4){
var a,as,_5={},_6=function(x){
_5[x]=1;
};
if(typeof _4=="string"){
as=_1(_4,_2,_6);
}else{
a=df.lambda(_4);
as="_a.call(this, _r, _i)";
}
var _7=df.keys(_5),f=new Function(["_x"],"var _t=arguments.callee,_r=_t.t,_i".concat(_7.length?","+_7.join(","):"",a?",_a=_t.a":"",";for(_i=1;_i<=_x;++_i){_r=",as,"}return _r"));
f.t=_3;
if(a){
f.a=a;
}
return f;
};
})();
}
