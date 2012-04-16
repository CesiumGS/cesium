/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.HtmlStore"]){
dojo._hasResource["dojox.data.HtmlStore"]=true;
dojo.provide("dojox.data.HtmlStore");
dojo.require("dojo.data.util.simpleFetch");
dojo.require("dojo.data.util.filter");
dojo.require("dojox.xml.parser");
dojo.declare("dojox.data.HtmlStore",null,{constructor:function(_1){
if(_1&&"urlPreventCache" in _1){
this.urlPreventCache=_1.urlPreventCache?true:false;
}
if(_1&&"trimWhitespace" in _1){
this.trimWhitespace=_1.trimWhitespace?true:false;
}
if(_1.url){
if(!_1.dataId){
throw new Error("dojo.data.HtmlStore: Cannot instantiate using url without an id!");
}
this.url=_1.url;
this.dataId=_1.dataId;
}else{
if(_1.dataId){
this.dataId=_1.dataId;
}
}
if(_1&&"fetchOnCreate" in _1){
this.fetchOnCreate=_1.fetchOnCreate?true:false;
}
if(this.fetchOnCreate&&this.dataId){
this.fetch();
}
},url:"",dataId:"",trimWhitespace:false,urlPreventCache:false,fetchOnCreate:false,_indexItems:function(){
this._getHeadings();
if(this._rootNode.rows){
if(this._rootNode.tBodies&&this._rootNode.tBodies.length>0){
this._rootNode=this._rootNode.tBodies[0];
}
var i;
for(i=0;i<this._rootNode.rows.length;i++){
this._rootNode.rows[i]._ident=i+1;
}
}else{
var c=1;
for(i=0;i<this._rootNode.childNodes.length;i++){
if(this._rootNode.childNodes[i].nodeType===1){
this._rootNode.childNodes[i]._ident=c;
c++;
}
}
}
},_getHeadings:function(){
this._headings=[];
if(this._rootNode.tHead){
dojo.forEach(this._rootNode.tHead.rows[0].cells,dojo.hitch(this,function(th){
var _2=dojox.xml.parser.textContent(th);
this._headings.push(this.trimWhitespace?dojo.trim(_2):_2);
}));
}else{
this._headings=["name"];
}
},_getAllItems:function(){
var _3=[];
var i;
if(this._rootNode.rows){
for(i=0;i<this._rootNode.rows.length;i++){
_3.push(this._rootNode.rows[i]);
}
}else{
for(i=0;i<this._rootNode.childNodes.length;i++){
if(this._rootNode.childNodes[i].nodeType===1){
_3.push(this._rootNode.childNodes[i]);
}
}
}
return _3;
},_assertIsItem:function(_4){
if(!this.isItem(_4)){
throw new Error("dojo.data.HtmlStore: a function was passed an item argument that was not an item");
}
},_assertIsAttribute:function(_5){
if(typeof _5!=="string"){
throw new Error("dojo.data.HtmlStore: a function was passed an attribute argument that was not an attribute name string");
return -1;
}
return dojo.indexOf(this._headings,_5);
},getValue:function(_6,_7,_8){
var _9=this.getValues(_6,_7);
return (_9.length>0)?_9[0]:_8;
},getValues:function(_a,_b){
this._assertIsItem(_a);
var _c=this._assertIsAttribute(_b);
if(_c>-1){
var _d;
if(_a.cells){
_d=dojox.xml.parser.textContent(_a.cells[_c]);
}else{
_d=dojox.xml.parser.textContent(_a);
}
return [this.trimWhitespace?dojo.trim(_d):_d];
}
return [];
},getAttributes:function(_e){
this._assertIsItem(_e);
var _f=[];
for(var i=0;i<this._headings.length;i++){
if(this.hasAttribute(_e,this._headings[i])){
_f.push(this._headings[i]);
}
}
return _f;
},hasAttribute:function(_10,_11){
return this.getValues(_10,_11).length>0;
},containsValue:function(_12,_13,_14){
var _15=undefined;
if(typeof _14==="string"){
_15=dojo.data.util.filter.patternToRegExp(_14,false);
}
return this._containsValue(_12,_13,_14,_15);
},_containsValue:function(_16,_17,_18,_19){
var _1a=this.getValues(_16,_17);
for(var i=0;i<_1a.length;++i){
var _1b=_1a[i];
if(typeof _1b==="string"&&_19){
return (_1b.match(_19)!==null);
}else{
if(_18===_1b){
return true;
}
}
}
return false;
},isItem:function(_1c){
return _1c&&dojo.isDescendant(_1c,this._rootNode);
},isItemLoaded:function(_1d){
return this.isItem(_1d);
},loadItem:function(_1e){
this._assertIsItem(_1e.item);
},_fetchItems:function(_1f,_20,_21){
if(this._rootNode){
this._finishFetchItems(_1f,_20,_21);
}else{
if(!this.url){
this._rootNode=dojo.byId(this.dataId);
this._indexItems();
this._finishFetchItems(_1f,_20,_21);
}else{
var _22={url:this.url,handleAs:"text",preventCache:this.urlPreventCache};
var _23=this;
var _24=dojo.xhrGet(_22);
_24.addCallback(function(_25){
var _26=function(_27,id){
if(_27.id==id){
return _27;
}
if(_27.childNodes){
for(var i=0;i<_27.childNodes.length;i++){
var _28=_26(_27.childNodes[i],id);
if(_28){
return _28;
}
}
}
return null;
};
var d=document.createElement("div");
d.innerHTML=_25;
_23._rootNode=_26(d,_23.dataId);
_23._indexItems();
_23._finishFetchItems(_1f,_20,_21);
});
_24.addErrback(function(_29){
_21(_29,_1f);
});
}
}
},_finishFetchItems:function(_2a,_2b,_2c){
var _2d=[];
var _2e=this._getAllItems();
if(_2a.query){
var _2f=_2a.queryOptions?_2a.queryOptions.ignoreCase:false;
_2d=[];
var _30={};
var key;
var _31;
for(key in _2a.query){
_31=_2a.query[key]+"";
if(typeof _31==="string"){
_30[key]=dojo.data.util.filter.patternToRegExp(_31,_2f);
}
}
for(var i=0;i<_2e.length;++i){
var _32=true;
var _33=_2e[i];
for(key in _2a.query){
_31=_2a.query[key]+"";
if(!this._containsValue(_33,key,_31,_30[key])){
_32=false;
}
}
if(_32){
_2d.push(_33);
}
}
_2b(_2d,_2a);
}else{
if(_2e.length>0){
_2d=_2e.slice(0,_2e.length);
}
_2b(_2d,_2a);
}
},getFeatures:function(){
return {"dojo.data.api.Read":true,"dojo.data.api.Identity":true};
},close:function(_34){
},getLabel:function(_35){
if(this.isItem(_35)){
if(_35.cells){
return "Item #"+this.getIdentity(_35);
}else{
return this.getValue(_35,"name");
}
}
return undefined;
},getLabelAttributes:function(_36){
if(_36.cells){
return null;
}else{
return ["name"];
}
},getIdentity:function(_37){
this._assertIsItem(_37);
if(this.hasAttribute(_37,"name")){
return this.getValue(_37,"name");
}else{
return _37._ident;
}
},getIdentityAttributes:function(_38){
return null;
},fetchItemByIdentity:function(_39){
var _3a=_39.identity;
var _3b=this;
var _3c=null;
var _3d=null;
if(!this._rootNode){
if(!this.url){
this._rootNode=dojo.byId(this.dataId);
this._indexItems();
if(_3b._rootNode.rows){
_3c=this._rootNode.rows[_3a+1];
}else{
for(var i=0;i<_3b._rootNode.childNodes.length;i++){
if(_3b._rootNode.childNodes[i].nodeType===1&&_3a===dojox.xml.parser.textContent(_3b._rootNode.childNodes[i])){
_3c=_3b._rootNode.childNodes[i];
}
}
}
if(_39.onItem){
_3d=_39.scope?_39.scope:dojo.global;
_39.onItem.call(_3d,_3c);
}
}else{
var _3e={url:this.url,handleAs:"text"};
var _3f=dojo.xhrGet(_3e);
_3f.addCallback(function(_40){
var _41=function(_42,id){
if(_42.id==id){
return _42;
}
if(_42.childNodes){
for(var i=0;i<_42.childNodes.length;i++){
var _43=_41(_42.childNodes[i],id);
if(_43){
return _43;
}
}
}
return null;
};
var d=document.createElement("div");
d.innerHTML=_40;
_3b._rootNode=_41(d,_3b.dataId);
_3b._indexItems();
if(_3b._rootNode.rows&&_3a<=_3b._rootNode.rows.length){
_3c=_3b._rootNode.rows[_3a-1];
}else{
for(var i=0;i<_3b._rootNode.childNodes.length;i++){
if(_3b._rootNode.childNodes[i].nodeType===1&&_3a===dojox.xml.parser.textContent(_3b._rootNode.childNodes[i])){
_3c=_3b._rootNode.childNodes[i];
break;
}
}
}
if(_39.onItem){
_3d=_39.scope?_39.scope:dojo.global;
_39.onItem.call(_3d,_3c);
}
});
_3f.addErrback(function(_44){
if(_39.onError){
_3d=_39.scope?_39.scope:dojo.global;
_39.onError.call(_3d,_44);
}
});
}
}else{
if(this._rootNode.rows[_3a+1]){
_3c=this._rootNode.rows[_3a+1];
if(_39.onItem){
_3d=_39.scope?_39.scope:dojo.global;
_39.onItem.call(_3d,_3c);
}
}
}
}});
dojo.extend(dojox.data.HtmlStore,dojo.data.util.simpleFetch);
}
