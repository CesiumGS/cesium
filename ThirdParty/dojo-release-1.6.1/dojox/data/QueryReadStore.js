/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.QueryReadStore"]){
dojo._hasResource["dojox.data.QueryReadStore"]=true;
dojo.provide("dojox.data.QueryReadStore");
dojo.require("dojo.data.util.sorter");
dojo.require("dojo.string");
dojo.declare("dojox.data.QueryReadStore",null,{url:"",requestMethod:"get",_className:"dojox.data.QueryReadStore",_items:[],_lastServerQuery:null,_numRows:-1,lastRequestHash:null,doClientPaging:false,doClientSorting:false,_itemsByIdentity:null,_identifier:null,_features:{"dojo.data.api.Read":true,"dojo.data.api.Identity":true},_labelAttr:"label",constructor:function(_1){
dojo.mixin(this,_1);
},getValue:function(_2,_3,_4){
this._assertIsItem(_2);
if(!dojo.isString(_3)){
throw new Error(this._className+".getValue(): Invalid attribute, string expected!");
}
if(!this.hasAttribute(_2,_3)){
if(_4){
return _4;
}
}
return _2.i[_3];
},getValues:function(_5,_6){
this._assertIsItem(_5);
var _7=[];
if(this.hasAttribute(_5,_6)){
_7.push(_5.i[_6]);
}
return _7;
},getAttributes:function(_8){
this._assertIsItem(_8);
var _9=[];
for(var i in _8.i){
_9.push(i);
}
return _9;
},hasAttribute:function(_a,_b){
return this.isItem(_a)&&typeof _a.i[_b]!="undefined";
},containsValue:function(_c,_d,_e){
var _f=this.getValues(_c,_d);
var len=_f.length;
for(var i=0;i<len;i++){
if(_f[i]==_e){
return true;
}
}
return false;
},isItem:function(_10){
if(_10){
return typeof _10.r!="undefined"&&_10.r==this;
}
return false;
},isItemLoaded:function(_11){
return this.isItem(_11);
},loadItem:function(_12){
if(this.isItemLoaded(_12.item)){
return;
}
},fetch:function(_13){
_13=_13||{};
if(!_13.store){
_13.store=this;
}
var _14=this;
var _15=function(_16,_17){
if(_17.onError){
var _18=_17.scope||dojo.global;
_17.onError.call(_18,_16,_17);
}
};
var _19=function(_1a,_1b,_1c){
var _1d=_1b.abort||null;
var _1e=false;
var _1f=_1b.start?_1b.start:0;
if(_14.doClientPaging==false){
_1f=0;
}
var _20=_1b.count?(_1f+_1b.count):_1a.length;
_1b.abort=function(){
_1e=true;
if(_1d){
_1d.call(_1b);
}
};
var _21=_1b.scope||dojo.global;
if(!_1b.store){
_1b.store=_14;
}
if(_1b.onBegin){
_1b.onBegin.call(_21,_1c,_1b);
}
if(_1b.sort&&_14.doClientSorting){
_1a.sort(dojo.data.util.sorter.createSortFunction(_1b.sort,_14));
}
if(_1b.onItem){
for(var i=_1f;(i<_1a.length)&&(i<_20);++i){
var _22=_1a[i];
if(!_1e){
_1b.onItem.call(_21,_22,_1b);
}
}
}
if(_1b.onComplete&&!_1e){
var _23=null;
if(!_1b.onItem){
_23=_1a.slice(_1f,_20);
}
_1b.onComplete.call(_21,_23,_1b);
}
};
this._fetchItems(_13,_19,_15);
return _13;
},getFeatures:function(){
return this._features;
},close:function(_24){
},getLabel:function(_25){
if(this._labelAttr&&this.isItem(_25)){
return this.getValue(_25,this._labelAttr);
}
return undefined;
},getLabelAttributes:function(_26){
if(this._labelAttr){
return [this._labelAttr];
}
return null;
},_xhrFetchHandler:function(_27,_28,_29,_2a){
_27=this._filterResponse(_27);
if(_27.label){
this._labelAttr=_27.label;
}
var _2b=_27.numRows||-1;
this._items=[];
dojo.forEach(_27.items,function(e){
this._items.push({i:e,r:this});
},this);
var _2c=_27.identifier;
this._itemsByIdentity={};
if(_2c){
this._identifier=_2c;
var i;
for(i=0;i<this._items.length;++i){
var _2d=this._items[i].i;
var _2e=_2d[_2c];
if(!this._itemsByIdentity[_2e]){
this._itemsByIdentity[_2e]=_2d;
}else{
throw new Error(this._className+":  The json data as specified by: ["+this.url+"] is malformed.  Items within the list have identifier: ["+_2c+"].  Value collided: ["+_2e+"]");
}
}
}else{
this._identifier=Number;
for(i=0;i<this._items.length;++i){
this._items[i].n=i;
}
}
_2b=this._numRows=(_2b===-1)?this._items.length:_2b;
_29(this._items,_28,_2b);
this._numRows=_2b;
},_fetchItems:function(_2f,_30,_31){
var _32=_2f.serverQuery||_2f.query||{};
if(!this.doClientPaging){
_32.start=_2f.start||0;
if(_2f.count){
_32.count=_2f.count;
}
}
if(!this.doClientSorting&&_2f.sort){
var _33=[];
dojo.forEach(_2f.sort,function(_34){
if(_34&&_34.attribute){
_33.push((_34.descending?"-":"")+_34.attribute);
}
});
_32.sort=_33.join(",");
}
if(this.doClientPaging&&this._lastServerQuery!==null&&dojo.toJson(_32)==dojo.toJson(this._lastServerQuery)){
this._numRows=(this._numRows===-1)?this._items.length:this._numRows;
_30(this._items,_2f,this._numRows);
}else{
var _35=this.requestMethod.toLowerCase()=="post"?dojo.xhrPost:dojo.xhrGet;
var _36=_35({url:this.url,handleAs:"json-comment-optional",content:_32,failOk:true});
_2f.abort=function(){
_36.cancel();
};
_36.addCallback(dojo.hitch(this,function(_37){
this._xhrFetchHandler(_37,_2f,_30,_31);
}));
_36.addErrback(function(_38){
_31(_38,_2f);
});
this.lastRequestHash=new Date().getTime()+"-"+String(Math.random()).substring(2);
this._lastServerQuery=dojo.mixin({},_32);
}
},_filterResponse:function(_39){
return _39;
},_assertIsItem:function(_3a){
if(!this.isItem(_3a)){
throw new Error(this._className+": Invalid item argument.");
}
},_assertIsAttribute:function(_3b){
if(typeof _3b!=="string"){
throw new Error(this._className+": Invalid attribute argument ('"+_3b+"').");
}
},fetchItemByIdentity:function(_3c){
if(this._itemsByIdentity){
var _3d=this._itemsByIdentity[_3c.identity];
if(!(_3d===undefined)){
if(_3c.onItem){
var _3e=_3c.scope?_3c.scope:dojo.global;
_3c.onItem.call(_3e,{i:_3d,r:this});
}
return;
}
}
var _3f=function(_40,_41){
var _42=_3c.scope?_3c.scope:dojo.global;
if(_3c.onError){
_3c.onError.call(_42,_40);
}
};
var _43=function(_44,_45){
var _46=_3c.scope?_3c.scope:dojo.global;
try{
var _47=null;
if(_44&&_44.length==1){
_47=_44[0];
}
if(_3c.onItem){
_3c.onItem.call(_46,_47);
}
}
catch(error){
if(_3c.onError){
_3c.onError.call(_46,error);
}
}
};
var _48={serverQuery:{id:_3c.identity}};
this._fetchItems(_48,_43,_3f);
},getIdentity:function(_49){
var _4a=null;
if(this._identifier===Number){
_4a=_49.n;
}else{
_4a=_49.i[this._identifier];
}
return _4a;
},getIdentityAttributes:function(_4b){
return [this._identifier];
}});
}
