/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.collections.SortedList"]){
dojo._hasResource["dojox.collections.SortedList"]=true;
dojo.provide("dojox.collections.SortedList");
dojo.require("dojox.collections._base");
dojox.collections.SortedList=function(_1){
var _2=this;
var _3={};
var q=[];
var _4=function(a,b){
if(a.key>b.key){
return 1;
}
if(a.key<b.key){
return -1;
}
return 0;
};
var _5=function(){
q=[];
var e=_2.getIterator();
while(!e.atEnd()){
q.push(e.get());
}
q.sort(_4);
};
var _6={};
this.count=q.length;
this.add=function(k,v){
if(!_3[k]){
_3[k]=new dojox.collections.DictionaryEntry(k,v);
this.count=q.push(_3[k]);
q.sort(_4);
}
};
this.clear=function(){
_3={};
q=[];
this.count=q.length;
};
this.clone=function(){
return new dojox.collections.SortedList(this);
};
this.contains=this.containsKey=function(k){
if(_6[k]){
return false;
}
return (_3[k]!=null);
};
this.containsValue=function(o){
var e=this.getIterator();
while(!e.atEnd()){
var _7=e.get();
if(_7.value==o){
return true;
}
}
return false;
};
this.copyTo=function(_8,i){
var e=this.getIterator();
var _9=i;
while(!e.atEnd()){
_8.splice(_9,0,e.get());
_9++;
}
};
this.entry=function(k){
return _3[k];
};
this.forEach=function(fn,_a){
dojo.forEach(q,fn,_a);
};
this.getByIndex=function(i){
return q[i].valueOf();
};
this.getIterator=function(){
return new dojox.collections.DictionaryIterator(_3);
};
this.getKey=function(i){
return q[i].key;
};
this.getKeyList=function(){
var _b=[];
var e=this.getIterator();
while(!e.atEnd()){
_b.push(e.get().key);
}
return _b;
};
this.getValueList=function(){
var _c=[];
var e=this.getIterator();
while(!e.atEnd()){
_c.push(e.get().value);
}
return _c;
};
this.indexOfKey=function(k){
for(var i=0;i<q.length;i++){
if(q[i].key==k){
return i;
}
}
return -1;
};
this.indexOfValue=function(o){
for(var i=0;i<q.length;i++){
if(q[i].value==o){
return i;
}
}
return -1;
};
this.item=function(k){
if(k in _3&&!_6[k]){
return _3[k].valueOf();
}
return undefined;
};
this.remove=function(k){
delete _3[k];
_5();
this.count=q.length;
};
this.removeAt=function(i){
delete _3[q[i].key];
_5();
this.count=q.length;
};
this.replace=function(k,v){
if(!_3[k]){
this.add(k,v);
return false;
}else{
_3[k]=new dojox.collections.DictionaryEntry(k,v);
_5();
return true;
}
};
this.setByIndex=function(i,o){
_3[q[i].key].value=o;
_5();
this.count=q.length;
};
if(_1){
var e=_1.getIterator();
while(!e.atEnd()){
var _d=e.get();
q[q.length]=_3[_d.key]=new dojox.collections.DictionaryEntry(_d.key,_d.value);
}
q.sort(_4);
}
};
}
