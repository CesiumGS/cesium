/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.aspect.timer"]){
dojo._hasResource["dojox.lang.aspect.timer"]=true;
dojo.provide("dojox.lang.aspect.timer");
(function(){
var _1=dojox.lang.aspect,_2=0;
var _3=function(_4){
this.name=_4||("DojoAopTimer #"+ ++_2);
this.inCall=0;
};
dojo.extend(_3,{before:function(){
if(!(this.inCall++)){
}
},after:function(){
if(!--this.inCall){
}
}});
_1.timer=function(_5){
return new _3(_5);
};
})();
}
