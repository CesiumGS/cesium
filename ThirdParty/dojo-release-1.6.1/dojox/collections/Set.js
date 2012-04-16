/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.collections.Set"]){
dojo._hasResource["dojox.collections.Set"]=true;
dojo.provide("dojox.collections.Set");
dojo.require("dojox.collections.ArrayList");
(function(){
var _1=dojox.collections;
_1.Set=new (function(){
function _2(_3){
if(_3.constructor==Array){
return new dojox.collections.ArrayList(_3);
}
return _3;
};
this.union=function(_4,_5){
_4=_2(_4);
_5=_2(_5);
var _6=new dojox.collections.ArrayList(_4.toArray());
var e=_5.getIterator();
while(!e.atEnd()){
var _7=e.get();
if(!_6.contains(_7)){
_6.add(_7);
}
}
return _6;
};
this.intersection=function(_8,_9){
_8=_2(_8);
_9=_2(_9);
var _a=new dojox.collections.ArrayList();
var e=_9.getIterator();
while(!e.atEnd()){
var _b=e.get();
if(_8.contains(_b)){
_a.add(_b);
}
}
return _a;
};
this.difference=function(_c,_d){
_c=_2(_c);
_d=_2(_d);
var _e=new dojox.collections.ArrayList();
var e=_c.getIterator();
while(!e.atEnd()){
var _f=e.get();
if(!_d.contains(_f)){
_e.add(_f);
}
}
return _e;
};
this.isSubSet=function(_10,_11){
_10=_2(_10);
_11=_2(_11);
var e=_10.getIterator();
while(!e.atEnd()){
if(!_11.contains(e.get())){
return false;
}
}
return true;
};
this.isSuperSet=function(_12,_13){
_12=_2(_12);
_13=_2(_13);
var e=_13.getIterator();
while(!e.atEnd()){
if(!_12.contains(e.get())){
return false;
}
}
return true;
};
})();
})();
}
