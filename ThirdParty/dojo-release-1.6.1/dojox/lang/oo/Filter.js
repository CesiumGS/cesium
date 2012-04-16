/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.oo.Filter"]){
dojo._hasResource["dojox.lang.oo.Filter"]=true;
dojo.provide("dojox.lang.oo.Filter");
(function(){
var oo=dojox.lang.oo,F=oo.Filter=function(_1,_2){
this.bag=_1;
this.filter=typeof _2=="object"?function(){
return _2.exec.apply(_2,arguments);
}:_2;
},_3=function(_4){
this.map=_4;
};
_3.prototype.exec=function(_5){
return this.map.hasOwnProperty(_5)?this.map[_5]:_5;
};
oo.filter=function(_6,_7){
return new F(_6,new _3(_7));
};
})();
}
