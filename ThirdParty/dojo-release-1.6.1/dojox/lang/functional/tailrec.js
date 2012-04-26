/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.functional.tailrec"]){
dojo._hasResource["dojox.lang.functional.tailrec"]=true;
dojo.provide("dojox.lang.functional.tailrec");
dojo.require("dojox.lang.functional.lambda");
dojo.require("dojox.lang.functional.util");
(function(){
var df=dojox.lang.functional,_1=df.inlineLambda,_2="_x";
df.tailrec=function(_3,_4,_5){
var c,t,b,cs,ts,bs,_6={},_7={},_8=function(x){
_6[x]=1;
};
if(typeof _3=="string"){
cs=_1(_3,_2,_8);
}else{
c=df.lambda(_3);
cs="_c.apply(this, _x)";
_7["_c=_t.c"]=1;
}
if(typeof _4=="string"){
ts=_1(_4,_2,_8);
}else{
t=df.lambda(_4);
ts="_t.t.apply(this, _x)";
}
if(typeof _5=="string"){
bs=_1(_5,_2,_8);
}else{
b=df.lambda(_5);
bs="_b.apply(this, _x)";
_7["_b=_t.b"]=1;
}
var _9=df.keys(_6),_a=df.keys(_7),f=new Function([],"var _x=arguments,_t=_x.callee,_c=_t.c,_b=_t.b".concat(_9.length?","+_9.join(","):"",_a.length?",_t=_x.callee,"+_a.join(","):t?",_t=_x.callee":"",";for(;!",cs,";_x=",bs,");return ",ts));
if(c){
f.c=c;
}
if(t){
f.t=t;
}
if(b){
f.b=b;
}
return f;
};
})();
}
