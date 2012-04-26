/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.async.timeout"]){
dojo._hasResource["dojox.lang.async.timeout"]=true;
dojo.provide("dojox.lang.async.timeout");
(function(){
var d=dojo,_1=dojox.lang.async.timeout;
_1.from=function(ms){
return function(){
var h,_2=function(){
if(h){
clearTimeout(h);
h=null;
}
},x=new d.Deferred(_2);
h=setTimeout(function(){
_2();
x.callback(ms);
},ms);
return x;
};
};
_1.failOn=function(ms){
return function(){
var h,_3=function(){
if(h){
clearTimeout(h);
h=null;
}
},x=new d.Deferred(_3);
h=setTimeout(function(){
_3();
x.errback(ms);
},ms);
return x;
};
};
})();
}
