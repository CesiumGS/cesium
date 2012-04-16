/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins._RowMapLayer"]){
dojo._hasResource["dojox.grid.enhanced.plugins._RowMapLayer"]=true;
dojo.provide("dojox.grid.enhanced.plugins._RowMapLayer");
dojo.require("dojox.grid.enhanced.plugins._StoreLayer");
(function(){
var _1=function(a){
a.sort(function(v1,v2){
return v1-v2;
});
var _2=[[a[0]]];
for(var i=1,j=0;i<a.length;++i){
if(a[i]==a[i-1]+1){
_2[j].push(a[i]);
}else{
_2[++j]=[a[i]];
}
}
return _2;
},_3=function(_4,_5){
return _5?dojo.hitch(_4||dojo.global,_5):function(){
};
};
dojo.declare("dojox.grid.enhanced.plugins._RowMapLayer",dojox.grid.enhanced.plugins._StoreLayer,{tags:["reorder"],constructor:function(_6){
this._map={};
this._revMap={};
this.grid=_6;
this._oldOnDelete=_6._onDelete;
var _7=this;
_6._onDelete=function(_8){
_7._onDelete(_8);
_7._oldOnDelete.call(_6,_8);
};
this._oldSort=_6.sort;
_6.sort=function(){
_7.clearMapping();
_7._oldSort.apply(_6,arguments);
};
},uninitialize:function(){
this.grid._onDelete=this._oldOnDelete;
this.grid.sort=this._oldSort;
},setMapping:function(_9){
this._store.forEachLayer(function(_a){
if(_a.name()==="rowmap"){
return false;
}else{
if(_a.onRowMappingChange){
_a.onRowMappingChange(_9);
}
}
return true;
},false);
var _b,to,_c,_d={};
for(_b in _9){
_b=parseInt(_b,10);
to=_9[_b];
if(typeof to=="number"){
if(_b in this._revMap){
_c=this._revMap[_b];
delete this._revMap[_b];
}else{
_c=_b;
}
if(_c==to){
delete this._map[_c];
_d[to]="eq";
}else{
this._map[_c]=to;
_d[to]=_c;
}
}
}
for(to in _d){
if(_d[to]==="eq"){
delete this._revMap[parseInt(to,10)];
}else{
this._revMap[parseInt(to,10)]=_d[to];
}
}
},clearMapping:function(){
this._map={};
this._revMap={};
},_onDelete:function(_e){
var _f=this.grid._getItemIndex(_e,true);
if(_f in this._revMap){
var _10=[],r,i,_11=this._revMap[_f];
delete this._map[_11];
delete this._revMap[_f];
for(r in this._revMap){
r=parseInt(r,10);
if(this._revMap[r]>_11){
--this._revMap[r];
}
}
for(r in this._revMap){
r=parseInt(r,10);
if(r>_f){
_10.push(r);
}
}
_10.sort(function(a,b){
return b-a;
});
for(i=_10.length-1;i>=0;--i){
r=_10[i];
this._revMap[r-1]=this._revMap[r];
delete this._revMap[r];
}
this._map={};
for(r in this._revMap){
this._map[this._revMap[r]]=r;
}
}
},_fetch:function(_12){
var _13=0,r;
var _14=_12.start||0;
for(r in this._revMap){
r=parseInt(r,10);
if(r>=_14){
++_13;
}
}
if(_13>0){
var _15=[],i,map={},_16=_12.count>0?_12.count:-1;
if(_16>0){
for(i=0;i<_16;++i){
r=_14+i;
r=r in this._revMap?this._revMap[r]:r;
map[r]=i;
_15.push(r);
}
}else{
for(i=0;;++i){
r=_14+i;
if(r in this._revMap){
--_13;
r=this._revMap[r];
}
map[r]=i;
_15.push(r);
if(_13<=0){
break;
}
}
}
this._subFetch(_12,this._getRowArrays(_15),0,[],map,_12.onComplete,_14,_16);
return _12;
}else{
return dojo.hitch(this._store,this._originFetch)(_12);
}
},_getRowArrays:function(_17){
return _1(_17);
},_subFetch:function(_18,_19,_1a,_1b,map,_1c,_1d,_1e){
var arr=_19[_1a],_1f=this;
var _20=_18.start=arr[0];
_18.count=arr[arr.length-1]-arr[0]+1;
_18.onComplete=function(_21){
dojo.forEach(_21,function(_22,i){
var r=_20+i;
if(r in map){
_1b[map[r]]=_22;
}
});
if(++_1a==_19.length){
if(_1e>0){
_18.start=_1d;
_18.count=_1e;
_18.onComplete=_1c;
_3(_18.scope,_1c)(_1b,_18);
}else{
_18.start=_18.start+_21.length;
delete _18.count;
_18.onComplete=function(_23){
_1b=_1b.concat(_23);
_18.start=_1d;
_18.onComplete=_1c;
_3(_18.scope,_1c)(_1b,_18);
};
_1f.originFetch(_18);
}
}else{
_1f._subFetch(_18,_19,_1a,_1b,map,_1c,_1d,_1e);
}
};
_1f.originFetch(_18);
}});
})();
}
