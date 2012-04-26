/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.async.topic"]){
dojo._hasResource["dojox.lang.async.topic"]=true;
dojo.provide("dojox.lang.async.topic");
(function(){
var d=dojo,_1=dojox.lang.async.topic;
_1.from=function(_2){
return function(){
var h,_3=function(){
if(h){
d.unsubscribe(h);
h=null;
}
},x=new d.Deferred(_3);
h=d.subscribe(_2,function(){
_3();
x.callback(arguments);
});
return x;
};
};
_1.failOn=function(_4){
return function(){
var h,_5=function(){
if(h){
d.unsubscribe(h);
h=null;
}
},x=new d.Deferred(_5);
h=d.subscribe(_4,function(_6){
_5();
x.errback(new Error(arguments));
});
return x;
};
};
})();
}
