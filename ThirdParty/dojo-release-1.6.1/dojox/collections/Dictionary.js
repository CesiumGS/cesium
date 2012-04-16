/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.collections.Dictionary"]){
dojo._hasResource["dojox.collections.Dictionary"]=true;
dojo.provide("dojox.collections.Dictionary");
dojo.require("dojox.collections._base");
dojox.collections.Dictionary=function(_1){
var _2={};
this.count=0;
var _3={};
this.add=function(k,v){
var b=(k in _2);
_2[k]=new dojox.collections.DictionaryEntry(k,v);
if(!b){
this.count++;
}
};
this.clear=function(){
_2={};
this.count=0;
};
this.clone=function(){
return new dojox.collections.Dictionary(this);
};
this.contains=this.containsKey=function(k){
if(_3[k]){
return false;
}
return (_2[k]!=null);
};
this.containsValue=function(v){
var e=this.getIterator();
while(e.get()){
if(e.element.value==v){
return true;
}
}
return false;
};
this.entry=function(k){
return _2[k];
};
this.forEach=function(fn,_4){
var a=[];
for(var p in _2){
if(!_3[p]){
a.push(_2[p]);
}
}
dojo.forEach(a,fn,_4);
};
this.getKeyList=function(){
return (this.getIterator()).map(function(_5){
return _5.key;
});
};
this.getValueList=function(){
return (this.getIterator()).map(function(_6){
return _6.value;
});
};
this.item=function(k){
if(k in _2){
return _2[k].valueOf();
}
return undefined;
};
this.getIterator=function(){
return new dojox.collections.DictionaryIterator(_2);
};
this.remove=function(k){
if(k in _2&&!_3[k]){
delete _2[k];
this.count--;
return true;
}
return false;
};
if(_1){
var e=_1.getIterator();
while(e.get()){
this.add(e.element.key,e.element.value);
}
}
};
}
