/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.calc.toFrac"]){
dojo._hasResource["dojox.calc.toFrac"]=true;
dojo.provide("dojox.calc.toFrac");
(function(){
var a=[];
var _1=[2,3,5,6,7,10,11,13,14,15,17,19,21,22,23,26,29,30,31,33,34,35,37,38,39,41,42,43,46,47,51,53,55,57,58,59,61,62,65,66,67,69,70,71,73,74,77,78,79,82,83,85,86,87,89,91,93,94,95,97];
var _2=false;
var i=-3;
var d=2;
var _3=1e-15/9;
function _4(_5){
var m,mt;
while(i<_1.length){
switch(i){
case -3:
m=1;
mt="";
break;
case -2:
m=Math.PI;
mt="pi";
break;
case -1:
m=Math.sqrt(Math.PI);
mt="√(pi)";
break;
default:
m=Math.sqrt(_1[i]);
mt="√("+_1[i]+")";
}
while(d<=100){
for(n=1;n<(m==1?d:100);n++){
var r=m*n/d;
var f=dojox.calc.approx(r);
if(!(f in a)){
if(n==d){
n=1;
d=1;
}
a[f]={n:n,d:d,m:m,mt:mt};
if(f==_5){
_5=undefined;
}
}
}
d++;
if(_5==undefined){
setTimeout(function(){
_4();
},1);
return;
}
}
d=2;
i++;
}
_2=true;
};
function _6(n){
return Math.floor(n)==n;
};
_4();
function _7(_8){
function _9(){
_4(_8);
return _7(_8);
};
_8=Math.abs(_8);
var f=a[dojox.calc.approx(_8)];
if(!f&&!_2){
return _9();
}
if(!f){
var i=Math.floor(_8);
if(i==0){
return _2?null:_9();
}
var n=_8%1;
if(n==0){
return {m:1,mt:1,n:_8,d:1};
}
f=a[dojox.calc.approx(n)];
if(!f||f.m!=1){
var _a=dojox.calc.approx(1/n);
return _6(_a)?{m:1,mt:1,n:1,d:_a}:(_2?null:_9());
}else{
return {m:1,mt:1,n:(i*f.d+f.n),d:f.d};
}
}
return f;
};
dojo.mixin(dojox.calc,{toFrac:function(_b){
var f=_7(_b);
return f?((_b<0?"-":"")+(f.m==1?"":(f.n==1?"":(f.n+"*")))+(f.m==1?f.n:f.mt)+((f.d==1?"":"/"+f.d))):_b;
},pow:function(_c,_d){
if(_c>0||_6(_d)){
return Math.pow(_c,_d);
}else{
var f=_7(_d);
if(_c>=0){
return (f&&f.m==1)?Math.pow(Math.pow(_c,1/f.d),_d<0?-f.n:f.n):Math.pow(_c,_d);
}else{
return (f&&f.d&1)?Math.pow(Math.pow(-Math.pow(-_c,1/f.d),_d<0?-f.n:f.n),f.m):NaN;
}
}
}});
})();
}
