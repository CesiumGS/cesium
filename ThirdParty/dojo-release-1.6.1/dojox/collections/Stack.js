/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.collections.Stack"]){
dojo._hasResource["dojox.collections.Stack"]=true;
dojo.provide("dojox.collections.Stack");
dojo.require("dojox.collections._base");
dojox.collections.Stack=function(_1){
var q=[];
if(_1){
q=q.concat(_1);
}
this.count=q.length;
this.clear=function(){
q=[];
this.count=q.length;
};
this.clone=function(){
return new dojox.collections.Stack(q);
};
this.contains=function(o){
for(var i=0;i<q.length;i++){
if(q[i]==o){
return true;
}
}
return false;
};
this.copyTo=function(_2,i){
_2.splice(i,0,q);
};
this.forEach=function(fn,_3){
dojo.forEach(q,fn,_3);
};
this.getIterator=function(){
return new dojox.collections.Iterator(q);
};
this.peek=function(){
return q[(q.length-1)];
};
this.pop=function(){
var r=q.pop();
this.count=q.length;
return r;
};
this.push=function(o){
this.count=q.push(o);
};
this.toArray=function(){
return [].concat(q);
};
};
}
