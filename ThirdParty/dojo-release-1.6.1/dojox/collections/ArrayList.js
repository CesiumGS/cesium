/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.collections.ArrayList"]){
dojo._hasResource["dojox.collections.ArrayList"]=true;
dojo.provide("dojox.collections.ArrayList");
dojo.require("dojox.collections._base");
dojox.collections.ArrayList=function(_1){
var _2=[];
if(_1){
_2=_2.concat(_1);
}
this.count=_2.length;
this.add=function(_3){
_2.push(_3);
this.count=_2.length;
};
this.addRange=function(a){
if(a.getIterator){
var e=a.getIterator();
while(!e.atEnd()){
this.add(e.get());
}
this.count=_2.length;
}else{
for(var i=0;i<a.length;i++){
_2.push(a[i]);
}
this.count=_2.length;
}
};
this.clear=function(){
_2.splice(0,_2.length);
this.count=0;
};
this.clone=function(){
return new dojox.collections.ArrayList(_2);
};
this.contains=function(_4){
for(var i=0;i<_2.length;i++){
if(_2[i]==_4){
return true;
}
}
return false;
};
this.forEach=function(fn,_5){
dojo.forEach(_2,fn,_5);
};
this.getIterator=function(){
return new dojox.collections.Iterator(_2);
};
this.indexOf=function(_6){
for(var i=0;i<_2.length;i++){
if(_2[i]==_6){
return i;
}
}
return -1;
};
this.insert=function(i,_7){
_2.splice(i,0,_7);
this.count=_2.length;
};
this.item=function(i){
return _2[i];
};
this.remove=function(_8){
var i=this.indexOf(_8);
if(i>=0){
_2.splice(i,1);
}
this.count=_2.length;
};
this.removeAt=function(i){
_2.splice(i,1);
this.count=_2.length;
};
this.reverse=function(){
_2.reverse();
};
this.sort=function(fn){
if(fn){
_2.sort(fn);
}else{
_2.sort();
}
};
this.setByIndex=function(i,_9){
_2[i]=_9;
this.count=_2.length;
};
this.toArray=function(){
return [].concat(_2);
};
this.toString=function(_a){
return _2.join((_a||","));
};
};
}
