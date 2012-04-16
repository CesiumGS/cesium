/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced._Plugin"]){
dojo._hasResource["dojox.grid.enhanced._Plugin"]=true;
dojo.provide("dojox.grid.enhanced._Plugin");
dojo.require("dojox.grid.EnhancedGrid");
dojo.declare("dojox.grid.enhanced._Plugin",null,{name:"plugin",grid:null,option:{},_connects:[],_subscribes:[],privates:{},constructor:function(_1,_2){
this.grid=_1;
this.option=_2;
this._connects=[];
this._subscribes=[];
this.privates=dojo.mixin({},dojox.grid.enhanced._Plugin.prototype);
this.init();
},init:function(){
},onPreInit:function(){
},onPostInit:function(){
},onStartUp:function(){
},connect:function(_3,_4,_5){
var _6=dojo.connect(_3,_4,this,_5);
this._connects.push(_6);
return _6;
},disconnect:function(_7){
dojo.some(this._connects,function(_8,i,_9){
if(_8==_7){
dojo.disconnect(_7);
_9.splice(i,1);
return true;
}
return false;
});
},subscribe:function(_a,_b){
var _c=dojo.subscribe(_a,this,_b);
this._subscribes.push(_c);
return _c;
},unsubscribe:function(_d){
dojo.some(this._subscribes,function(_e,i,_f){
if(_e==_d){
dojo.unsubscribe(_d);
_f.splice(i,1);
return true;
}
return false;
});
},onSetStore:function(_10){
},destroy:function(){
dojo.forEach(this._connects,dojo.disconnect);
dojo.forEach(this._subscribes,dojo.unsubscribe);
delete this._connects;
delete this._subscribes;
delete this.option;
delete this.privates;
}});
}
