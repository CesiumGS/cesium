/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.oo.Decorator"]){
dojo._hasResource["dojox.lang.oo.Decorator"]=true;
dojo.provide("dojox.lang.oo.Decorator");
(function(){
var oo=dojox.lang.oo,D=oo.Decorator=function(_1,_2){
this.value=_1;
this.decorator=typeof _2=="object"?function(){
return _2.exec.apply(_2,arguments);
}:_2;
};
oo.makeDecorator=function(_3){
return function(_4){
return new D(_4,_3);
};
};
})();
}
