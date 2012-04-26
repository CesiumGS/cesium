/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.async.event"]){
dojo._hasResource["dojox.lang.async.event"]=true;
dojo.provide("dojox.lang.async.event");
(function(){
var d=dojo,_1=dojox.lang.async.event;
_1.from=function(_2,_3){
return function(){
var h,_4=function(){
if(h){
d.disconnect(h);
h=null;
}
},x=new d.Deferred(_4);
h=d.connect(_2,_3,function(_5){
_4();
x.callback(_5);
});
return x;
};
};
_1.failOn=function(_6,_7){
return function(){
var h,_8=function(){
if(h){
d.disconnect(h);
h=null;
}
},x=new d.Deferred(_8);
h=d.connect(_6,_7,function(_9){
_8();
x.errback(new Error(_9));
});
return x;
};
};
})();
}
