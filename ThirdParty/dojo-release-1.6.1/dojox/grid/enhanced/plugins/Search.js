/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.Search"]){
dojo._hasResource["dojox.grid.enhanced.plugins.Search"]=true;
dojo.provide("dojox.grid.enhanced.plugins.Search");
dojo.require("dojox.grid.enhanced._Plugin");
dojo.require("dojo.data.util.filter");
dojo.declare("dojox.grid.enhanced.plugins.Search",dojox.grid.enhanced._Plugin,{name:"search",constructor:function(_1,_2){
this.grid=_1;
_2=(_2&&dojo.isObject(_2))?_2:{};
this._cacheSize=_2.cacheSize||-1;
_1.searchRow=dojo.hitch(this,"searchRow");
},searchRow:function(_3,_4){
if(!dojo.isFunction(_4)){
return;
}
if(dojo.isString(_3)){
_3=dojo.data.util.filter.patternToRegExp(_3);
}
var _5=false;
if(_3 instanceof RegExp){
_5=true;
}else{
if(dojo.isObject(_3)){
var _6=true;
for(var _7 in _3){
if(dojo.isString(_3[_7])){
_3[_7]=dojo.data.util.filter.patternToRegExp(_3[_7]);
}
_6=false;
}
if(_6){
return;
}
}else{
return;
}
}
this._search(_3,0,_4,_5);
},_search:function(_8,_9,_a,_b){
var _c=this,_d=this._cacheSize,_e={"start":_9,"onBegin":function(_f){
_c._storeSize=_f;
},"onComplete":function(_10){
if(!dojo.some(_10,function(_11,i){
if(_c._checkRow(_11,_8,_b)){
_a(_9+i,_11);
return true;
}
return false;
})){
if(_d>0&&_9+_d<_c._storeSize){
_c._search(_8,_9+_d,_a,_b);
}else{
_a(-1,null);
}
}
}};
if(_d>0){
_e.count=_d;
}
this.grid._storeLayerFetch(_e);
},_checkRow:function(_12,_13,_14){
var g=this.grid,s=g.store,i,_15,_16=dojo.filter(g.layout.cells,function(_17){
return !_17.hidden;
});
if(_14){
return dojo.some(_16,function(_18){
try{
if(_18.field){
return String(s.getValue(_12,_18.field)).search(_13)>=0;
}
}
catch(e){
}
return false;
});
}else{
for(_15 in _13){
if(_13[_15] instanceof RegExp){
for(i=_16.length-1;i>=0;--i){
if(_16[i].field==_15){
try{
if(String(s.getValue(_12,_15)).search(_13[_15])<0){
return false;
}
break;
}
catch(e){
return false;
}
}
}
if(i<0){
return false;
}
}
}
return true;
}
}});
dojox.grid.EnhancedGrid.registerPlugin(dojox.grid.enhanced.plugins.Search);
}
