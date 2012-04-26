/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.aspect.profiler"]){
dojo._hasResource["dojox.lang.aspect.profiler"]=true;
dojo.provide("dojox.lang.aspect.profiler");
(function(){
var _1=dojox.lang.aspect,_2=0;
var _3=function(_4){
this.args=_4?[_4]:[];
this.inCall=0;
};
dojo.extend(_3,{before:function(){
if(!(this.inCall++)){
console.profile.apply(console,this.args);
}
},after:function(){
if(!--this.inCall){
}
}});
_1.profiler=function(_5){
return new _3(_5);
};
})();
}
