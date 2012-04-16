/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.CssRuleStore"]){
dojo._hasResource["dojox.data.CssRuleStore"]=true;
dojo.provide("dojox.data.CssRuleStore");
dojo.require("dojo.data.util.sorter");
dojo.require("dojo.data.util.filter");
dojo.require("dojox.data.css");
dojo.declare("dojox.data.CssRuleStore",null,{_storeRef:"_S",_labelAttribute:"selector",_cache:null,_browserMap:null,_cName:"dojox.data.CssRuleStore",constructor:function(_1){
if(_1){
dojo.mixin(this,_1);
}
this._cache={};
this._allItems=null;
this._waiting=[];
this.gatherHandle=null;
var _2=this;
function _3(){
try{
_2.context=dojox.data.css.determineContext(_2.context);
if(_2.gatherHandle){
clearInterval(_2.gatherHandle);
_2.gatherHandle=null;
}
while(_2._waiting.length){
var _4=_2._waiting.pop();
dojox.data.css.rules.forEach(_4.forFunc,null,_2.context);
_4.finishFunc();
}
}
catch(e){
}
};
this.gatherHandle=setInterval(_3,250);
},setContext:function(_5){
if(_5){
this.close();
this.context=dojox.data.css.determineContext(_5);
}
},getFeatures:function(){
return {"dojo.data.api.Read":true};
},isItem:function(_6){
if(_6&&_6[this._storeRef]==this){
return true;
}
return false;
},hasAttribute:function(_7,_8){
this._assertIsItem(_7);
this._assertIsAttribute(_8);
var _9=this.getAttributes(_7);
if(dojo.indexOf(_9,_8)!=-1){
return true;
}
return false;
},getAttributes:function(_a){
this._assertIsItem(_a);
var _b=["selector","classes","rule","style","cssText","styleSheet","parentStyleSheet","parentStyleSheetHref"];
var _c=_a.rule.style;
if(_c){
var _d;
for(_d in _c){
_b.push("style."+_d);
}
}
return _b;
},getValue:function(_e,_f,_10){
var _11=this.getValues(_e,_f);
var _12=_10;
if(_11&&_11.length>0){
return _11[0];
}
return _10;
},getValues:function(_13,_14){
this._assertIsItem(_13);
this._assertIsAttribute(_14);
var _15=null;
if(_14==="selector"){
_15=_13.rule["selectorText"];
if(_15&&dojo.isString(_15)){
_15=_15.split(",");
}
}else{
if(_14==="classes"){
_15=_13.classes;
}else{
if(_14==="rule"){
_15=_13.rule.rule;
}else{
if(_14==="style"){
_15=_13.rule.style;
}else{
if(_14==="cssText"){
if(dojo.isIE){
if(_13.rule.style){
_15=_13.rule.style.cssText;
if(_15){
_15="{ "+_15.toLowerCase()+" }";
}
}
}else{
_15=_13.rule.cssText;
if(_15){
_15=_15.substring(_15.indexOf("{"),_15.length);
}
}
}else{
if(_14==="styleSheet"){
_15=_13.rule.styleSheet;
}else{
if(_14==="parentStyleSheet"){
_15=_13.rule.parentStyleSheet;
}else{
if(_14==="parentStyleSheetHref"){
if(_13.href){
_15=_13.href;
}
}else{
if(_14.indexOf("style.")===0){
var _16=_14.substring(_14.indexOf("."),_14.length);
_15=_13.rule.style[_16];
}else{
_15=[];
}
}
}
}
}
}
}
}
}
if(_15!==undefined){
if(!dojo.isArray(_15)){
_15=[_15];
}
}
return _15;
},getLabel:function(_17){
this._assertIsItem(_17);
return this.getValue(_17,this._labelAttribute);
},getLabelAttributes:function(_18){
return [this._labelAttribute];
},containsValue:function(_19,_1a,_1b){
var _1c=undefined;
if(typeof _1b==="string"){
_1c=dojo.data.util.filter.patternToRegExp(_1b,false);
}
return this._containsValue(_19,_1a,_1b,_1c);
},isItemLoaded:function(_1d){
return this.isItem(_1d);
},loadItem:function(_1e){
this._assertIsItem(_1e.item);
},fetch:function(_1f){
_1f=_1f||{};
if(!_1f.store){
_1f.store=this;
}
var _20=_1f.scope||dojo.global;
if(this._pending&&this._pending.length>0){
this._pending.push({request:_1f,fetch:true});
}else{
this._pending=[{request:_1f,fetch:true}];
this._fetch(_1f);
}
return _1f;
},_fetch:function(_21){
var _22=_21.scope||dojo.global;
if(this._allItems===null){
this._allItems={};
try{
if(this.gatherHandle){
this._waiting.push({"forFunc":dojo.hitch(this,this._handleRule),"finishFunc":dojo.hitch(this,this._handleReturn)});
}else{
dojox.data.css.rules.forEach(dojo.hitch(this,this._handleRule),null,this.context);
this._handleReturn();
}
}
catch(e){
if(_21.onError){
_21.onError.call(_22,e,_21);
}
}
}else{
this._handleReturn();
}
},_handleRule:function(_23,_24,_25){
var _26=_23["selectorText"];
var s=_26.split(" ");
var _27=[];
for(var j=0;j<s.length;j++){
var tmp=s[j];
var _28=tmp.indexOf(".");
if(tmp&&tmp.length>0&&_28!==-1){
var _29=tmp.indexOf(",")||tmp.indexOf("[");
tmp=tmp.substring(_28,((_29!==-1&&_29>_28)?_29:tmp.length));
_27.push(tmp);
}
}
var _2a={};
_2a.rule=_23;
_2a.styleSheet=_24;
_2a.href=_25;
_2a.classes=_27;
_2a[this._storeRef]=this;
if(!this._allItems[_26]){
this._allItems[_26]=[];
}
this._allItems[_26].push(_2a);
},_handleReturn:function(){
var _2b=[];
var _2c=[];
var _2d=null;
for(var i in this._allItems){
_2d=this._allItems[i];
for(var j in _2d){
_2c.push(_2d[j]);
}
}
var _2e;
while(this._pending.length){
_2e=this._pending.pop();
_2e.request._items=_2c;
_2b.push(_2e);
}
while(_2b.length){
_2e=_2b.pop();
this._handleFetchReturn(_2e.request);
}
},_handleFetchReturn:function(_2f){
var _30=_2f.scope||dojo.global;
var _31=[];
var _32="all";
var i;
if(_2f.query){
_32=dojo.toJson(_2f.query);
}
if(this._cache[_32]){
_31=this._cache[_32];
}else{
if(_2f.query){
for(i in _2f._items){
var _33=_2f._items[i];
var _34=dojo.isWebKit?true:(_2f.queryOptions?_2f.queryOptions.ignoreCase:false);
var _35={};
var key;
var _36;
for(key in _2f.query){
_36=_2f.query[key];
if(typeof _36==="string"){
_35[key]=dojo.data.util.filter.patternToRegExp(_36,_34);
}
}
var _37=true;
for(key in _2f.query){
_36=_2f.query[key];
if(!this._containsValue(_33,key,_36,_35[key])){
_37=false;
}
}
if(_37){
_31.push(_33);
}
}
this._cache[_32]=_31;
}else{
for(i in _2f._items){
_31.push(_2f._items[i]);
}
}
}
var _38=_31.length;
if(_2f.sort){
_31.sort(dojo.data.util.sorter.createSortFunction(_2f.sort,this));
}
var _39=0;
var _3a=_31.length;
if(_2f.start>0&&_2f.start<_31.length){
_39=_2f.start;
}
if(_2f.count&&_2f.count){
_3a=_2f.count;
}
var _3b=_39+_3a;
if(_3b>_31.length){
_3b=_31.length;
}
_31=_31.slice(_39,_3b);
if(_2f.onBegin){
_2f.onBegin.call(_30,_38,_2f);
}
if(_2f.onItem){
if(dojo.isArray(_31)){
for(i=0;i<_31.length;i++){
_2f.onItem.call(_30,_31[i],_2f);
}
if(_2f.onComplete){
_2f.onComplete.call(_30,null,_2f);
}
}
}else{
if(_2f.onComplete){
_2f.onComplete.call(_30,_31,_2f);
}
}
return _2f;
},close:function(){
this._cache={};
this._allItems=null;
},_assertIsItem:function(_3c){
if(!this.isItem(_3c)){
throw new Error(this._cName+": Invalid item argument.");
}
},_assertIsAttribute:function(_3d){
if(typeof _3d!=="string"){
throw new Error(this._cName+": Invalid attribute argument.");
}
},_containsValue:function(_3e,_3f,_40,_41){
return dojo.some(this.getValues(_3e,_3f),function(_42){
if(_42!==null&&!dojo.isObject(_42)&&_41){
if(_42.toString().match(_41)){
return true;
}
}else{
if(_40===_42){
return true;
}
}
return false;
});
}});
}
