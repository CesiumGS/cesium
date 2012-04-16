/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.fx._core"]){
dojo._hasResource["dojox.fx._core"]=true;
dojo.provide("dojox.fx._core");
dojox.fx._Line=function(_1,_2){
this.start=_1;
this.end=_2;
var _3=dojo.isArray(_1),d=(_3?[]:_2-_1);
if(_3){
dojo.forEach(this.start,function(s,i){
d[i]=this.end[i]-s;
},this);
this.getValue=function(n){
var _4=[];
dojo.forEach(this.start,function(s,i){
_4[i]=(d[i]*n)+s;
},this);
return _4;
};
}else{
this.getValue=function(n){
return (d*n)+this.start;
};
}
};
}
