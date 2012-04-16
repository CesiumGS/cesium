/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.HtmlTableStore"]){
dojo._hasResource["dojox.data.HtmlTableStore"]=true;
dojo.provide("dojox.data.HtmlTableStore");
dojo.require("dojo.data.util.simpleFetch");
dojo.require("dojo.data.util.filter");
dojo.require("dojox.xml.parser");
dojo.declare("dojox.data.HtmlTableStore",null,{constructor:function(_1){
dojo.deprecated("dojox.data.HtmlTableStore","Please use dojox.data.HtmlStore");
if(_1.url){
if(!_1.tableId){
throw new Error("dojo.data.HtmlTableStore: Cannot instantiate using url without an id!");
}
this.url=_1.url;
this.tableId=_1.tableId;
}else{
if(_1.tableId){
this._rootNode=dojo.byId(_1.tableId);
this.tableId=this._rootNode.id;
}else{
this._rootNode=dojo.byId(this.tableId);
}
this._getHeadings();
for(var i=0;i<this._rootNode.rows.length;i++){
this._rootNode.rows[i].store=this;
}
}
},url:"",tableId:"",_getHeadings:function(){
this._headings=[];
dojo.forEach(this._rootNode.tHead.rows[0].cells,dojo.hitch(this,function(th){
this._headings.push(dojox.xml.parser.textContent(th));
}));
},_getAllItems:function(){
var _2=[];
for(var i=1;i<this._rootNode.rows.length;i++){
_2.push(this._rootNode.rows[i]);
}
return _2;
},_assertIsItem:function(_3){
if(!this.isItem(_3)){
throw new Error("dojo.data.HtmlTableStore: a function was passed an item argument that was not an item");
}
},_assertIsAttribute:function(_4){
if(typeof _4!=="string"){
throw new Error("dojo.data.HtmlTableStore: a function was passed an attribute argument that was not an attribute name string");
return -1;
}
return dojo.indexOf(this._headings,_4);
},getValue:function(_5,_6,_7){
var _8=this.getValues(_5,_6);
return (_8.length>0)?_8[0]:_7;
},getValues:function(_9,_a){
this._assertIsItem(_9);
var _b=this._assertIsAttribute(_a);
if(_b>-1){
return [dojox.xml.parser.textContent(_9.cells[_b])];
}
return [];
},getAttributes:function(_c){
this._assertIsItem(_c);
var _d=[];
for(var i=0;i<this._headings.length;i++){
if(this.hasAttribute(_c,this._headings[i])){
_d.push(this._headings[i]);
}
}
return _d;
},hasAttribute:function(_e,_f){
return this.getValues(_e,_f).length>0;
},containsValue:function(_10,_11,_12){
var _13=undefined;
if(typeof _12==="string"){
_13=dojo.data.util.filter.patternToRegExp(_12,false);
}
return this._containsValue(_10,_11,_12,_13);
},_containsValue:function(_14,_15,_16,_17){
var _18=this.getValues(_14,_15);
for(var i=0;i<_18.length;++i){
var _19=_18[i];
if(typeof _19==="string"&&_17){
return (_19.match(_17)!==null);
}else{
if(_16===_19){
return true;
}
}
}
return false;
},isItem:function(_1a){
if(_1a&&_1a.store&&_1a.store===this){
return true;
}
return false;
},isItemLoaded:function(_1b){
return this.isItem(_1b);
},loadItem:function(_1c){
this._assertIsItem(_1c.item);
},_fetchItems:function(_1d,_1e,_1f){
if(this._rootNode){
this._finishFetchItems(_1d,_1e,_1f);
}else{
if(!this.url){
this._rootNode=dojo.byId(this.tableId);
this._getHeadings();
for(var i=0;i<this._rootNode.rows.length;i++){
this._rootNode.rows[i].store=this;
}
}else{
var _20={url:this.url,handleAs:"text"};
var _21=this;
var _22=dojo.xhrGet(_20);
_22.addCallback(function(_23){
var _24=function(_25,id){
if(_25.id==id){
return _25;
}
if(_25.childNodes){
for(var i=0;i<_25.childNodes.length;i++){
var _26=_24(_25.childNodes[i],id);
if(_26){
return _26;
}
}
}
return null;
};
var d=document.createElement("div");
d.innerHTML=_23;
_21._rootNode=_24(d,_21.tableId);
_21._getHeadings.call(_21);
for(var i=0;i<_21._rootNode.rows.length;i++){
_21._rootNode.rows[i].store=_21;
}
_21._finishFetchItems(_1d,_1e,_1f);
});
_22.addErrback(function(_27){
_1f(_27,_1d);
});
}
}
},_finishFetchItems:function(_28,_29,_2a){
var _2b=null;
var _2c=this._getAllItems();
if(_28.query){
var _2d=_28.queryOptions?_28.queryOptions.ignoreCase:false;
_2b=[];
var _2e={};
var _2f;
var key;
for(key in _28.query){
_2f=_28.query[key]+"";
if(typeof _2f==="string"){
_2e[key]=dojo.data.util.filter.patternToRegExp(_2f,_2d);
}
}
for(var i=0;i<_2c.length;++i){
var _30=true;
var _31=_2c[i];
for(key in _28.query){
_2f=_28.query[key]+"";
if(!this._containsValue(_31,key,_2f,_2e[key])){
_30=false;
}
}
if(_30){
_2b.push(_31);
}
}
_29(_2b,_28);
}else{
if(_2c.length>0){
_2b=_2c.slice(0,_2c.length);
}
_29(_2b,_28);
}
},getFeatures:function(){
return {"dojo.data.api.Read":true,"dojo.data.api.Identity":true};
},close:function(_32){
},getLabel:function(_33){
if(this.isItem(_33)){
return "Table Row #"+this.getIdentity(_33);
}
return undefined;
},getLabelAttributes:function(_34){
return null;
},getIdentity:function(_35){
this._assertIsItem(_35);
if(!dojo.isOpera){
return _35.sectionRowIndex;
}else{
return (dojo.indexOf(this._rootNode.rows,_35)-1);
}
},getIdentityAttributes:function(_36){
return null;
},fetchItemByIdentity:function(_37){
var _38=_37.identity;
var _39=this;
var _3a=null;
var _3b=null;
if(!this._rootNode){
if(!this.url){
this._rootNode=dojo.byId(this.tableId);
this._getHeadings();
for(var i=0;i<this._rootNode.rows.length;i++){
this._rootNode.rows[i].store=this;
}
_3a=this._rootNode.rows[_38+1];
if(_37.onItem){
_3b=_37.scope?_37.scope:dojo.global;
_37.onItem.call(_3b,_3a);
}
}else{
var _3c={url:this.url,handleAs:"text"};
var _3d=dojo.xhrGet(_3c);
_3d.addCallback(function(_3e){
var _3f=function(_40,id){
if(_40.id==id){
return _40;
}
if(_40.childNodes){
for(var i=0;i<_40.childNodes.length;i++){
var _41=_3f(_40.childNodes[i],id);
if(_41){
return _41;
}
}
}
return null;
};
var d=document.createElement("div");
d.innerHTML=_3e;
_39._rootNode=_3f(d,_39.tableId);
_39._getHeadings.call(_39);
for(var i=0;i<_39._rootNode.rows.length;i++){
_39._rootNode.rows[i].store=_39;
}
_3a=_39._rootNode.rows[_38+1];
if(_37.onItem){
_3b=_37.scope?_37.scope:dojo.global;
_37.onItem.call(_3b,_3a);
}
});
_3d.addErrback(function(_42){
if(_37.onError){
_3b=_37.scope?_37.scope:dojo.global;
_37.onError.call(_3b,_42);
}
});
}
}else{
if(this._rootNode.rows[_38+1]){
_3a=this._rootNode.rows[_38+1];
if(_37.onItem){
_3b=_37.scope?_37.scope:dojo.global;
_37.onItem.call(_3b,_3a);
}
}
}
}});
dojo.extend(dojox.data.HtmlTableStore,dojo.data.util.simpleFetch);
}
