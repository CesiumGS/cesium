/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.CssClassStore"]){
dojo._hasResource["dojox.data.CssClassStore"]=true;
dojo.provide("dojox.data.CssClassStore");
dojo.require("dojox.data.CssRuleStore");
dojo.declare("dojox.data.CssClassStore",dojox.data.CssRuleStore,{_labelAttribute:"class",_idAttribute:"class",_cName:"dojox.data.CssClassStore",getFeatures:function(){
return {"dojo.data.api.Read":true,"dojo.data.api.Identity":true};
},getAttributes:function(_1){
this._assertIsItem(_1);
return ["class","classSans"];
},getValue:function(_2,_3,_4){
var _5=this.getValues(_2,_3);
if(_5&&_5.length>0){
return _5[0];
}
return _4;
},getValues:function(_6,_7){
this._assertIsItem(_6);
this._assertIsAttribute(_7);
var _8=[];
if(_7==="class"){
_8=[_6.className];
}else{
if(_7==="classSans"){
_8=[_6.className.replace(/\./g,"")];
}
}
return _8;
},_handleRule:function(_9,_a,_b){
var _c={};
var s=_9["selectorText"].split(" ");
for(var j=0;j<s.length;j++){
var _d=s[j];
var _e=_d.indexOf(".");
if(_d&&_d.length>0&&_e!==-1){
var _f=_d.indexOf(",")||_d.indexOf("[");
_d=_d.substring(_e,((_f!==-1&&_f>_e)?_f:_d.length));
_c[_d]=true;
}
}
for(var key in _c){
if(!this._allItems[key]){
var _10={};
_10.className=key;
_10[this._storeRef]=this;
this._allItems[key]=_10;
}
}
},_handleReturn:function(){
var _11=[];
var _12={};
for(var i in this._allItems){
_12[i]=this._allItems[i];
}
var _13;
while(this._pending.length){
_13=this._pending.pop();
_13.request._items=_12;
_11.push(_13);
}
while(_11.length){
_13=_11.pop();
if(_13.fetch){
this._handleFetchReturn(_13.request);
}else{
this._handleFetchByIdentityReturn(_13.request);
}
}
},_handleFetchByIdentityReturn:function(_14){
var _15=_14._items;
var _16=_15[(dojo.isWebKit?_14.identity.toLowerCase():_14.identity)];
if(!this.isItem(_16)){
_16=null;
}
if(_14.onItem){
var _17=_14.scope||dojo.global;
_14.onItem.call(_17,_16);
}
},getIdentity:function(_18){
this._assertIsItem(_18);
return this.getValue(_18,this._idAttribute);
},getIdentityAttributes:function(_19){
this._assertIsItem(_19);
return [this._idAttribute];
},fetchItemByIdentity:function(_1a){
_1a=_1a||{};
if(!_1a.store){
_1a.store=this;
}
if(this._pending&&this._pending.length>0){
this._pending.push({request:_1a});
}else{
this._pending=[{request:_1a}];
this._fetch(_1a);
}
return _1a;
}});
}
