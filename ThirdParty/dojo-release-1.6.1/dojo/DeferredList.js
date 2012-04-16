/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.DeferredList"]){
dojo._hasResource["dojo.DeferredList"]=true;
dojo.provide("dojo.DeferredList");
dojo.DeferredList=function(_1,_2,_3,_4,_5){
var _6=[];
dojo.Deferred.call(this);
var _7=this;
if(_1.length===0&&!_2){
this.resolve([0,[]]);
}
var _8=0;
dojo.forEach(_1,function(_9,i){
_9.then(function(_a){
if(_2){
_7.resolve([i,_a]);
}else{
_b(true,_a);
}
},function(_c){
if(_3){
_7.reject(_c);
}else{
_b(false,_c);
}
if(_4){
return null;
}
throw _c;
});
function _b(_d,_e){
_6[i]=[_d,_e];
_8++;
if(_8===_1.length){
_7.resolve(_6);
}
};
});
};
dojo.DeferredList.prototype=new dojo.Deferred();
dojo.DeferredList.prototype.gatherResults=function(_f){
var d=new dojo.DeferredList(_f,false,true,false);
d.addCallback(function(_10){
var ret=[];
dojo.forEach(_10,function(_11){
ret.push(_11[1]);
});
return ret;
});
return d;
};
}
