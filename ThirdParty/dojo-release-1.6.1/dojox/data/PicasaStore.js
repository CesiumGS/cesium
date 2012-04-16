/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.PicasaStore"]){
dojo._hasResource["dojox.data.PicasaStore"]=true;
dojo.provide("dojox.data.PicasaStore");
dojo.require("dojo.io.script");
dojo.require("dojo.data.util.simpleFetch");
dojo.require("dojo.date.stamp");
dojo.declare("dojox.data.PicasaStore",null,{constructor:function(_1){
if(_1&&_1.label){
this.label=_1.label;
}
if(_1&&"urlPreventCache" in _1){
this.urlPreventCache=_1.urlPreventCache?true:false;
}
if(_1&&"maxResults" in _1){
this.maxResults=parseInt(_1.maxResults);
if(!this.maxResults){
this.maxResults=20;
}
}
},_picasaUrl:"http://picasaweb.google.com/data/feed/api/all",_storeRef:"_S",label:"title",urlPreventCache:false,maxResults:20,_assertIsItem:function(_2){
if(!this.isItem(_2)){
throw new Error("dojox.data.PicasaStore: a function was passed an item argument that was not an item");
}
},_assertIsAttribute:function(_3){
if(typeof _3!=="string"){
throw new Error("dojox.data.PicasaStore: a function was passed an attribute argument that was not an attribute name string");
}
},getFeatures:function(){
return {"dojo.data.api.Read":true};
},getValue:function(_4,_5,_6){
var _7=this.getValues(_4,_5);
if(_7&&_7.length>0){
return _7[0];
}
return _6;
},getAttributes:function(_8){
return ["id","published","updated","category","title$type","title","summary$type","summary","rights$type","rights","link","author","gphoto$id","gphoto$name","location","imageUrlSmall","imageUrlMedium","imageUrl","datePublished","dateTaken","description"];
},hasAttribute:function(_9,_a){
if(this.getValue(_9,_a)){
return true;
}
return false;
},isItemLoaded:function(_b){
return this.isItem(_b);
},loadItem:function(_c){
},getLabel:function(_d){
return this.getValue(_d,this.label);
},getLabelAttributes:function(_e){
return [this.label];
},containsValue:function(_f,_10,_11){
var _12=this.getValues(_f,_10);
for(var i=0;i<_12.length;i++){
if(_12[i]===_11){
return true;
}
}
return false;
},getValues:function(_13,_14){
this._assertIsItem(_13);
this._assertIsAttribute(_14);
if(_14==="title"){
return [this._unescapeHtml(_13.title)];
}else{
if(_14==="author"){
return [this._unescapeHtml(_13.author[0].name)];
}else{
if(_14==="datePublished"){
return [dojo.date.stamp.fromISOString(_13.published)];
}else{
if(_14==="dateTaken"){
return [dojo.date.stamp.fromISOString(_13.published)];
}else{
if(_14==="updated"){
return [dojo.date.stamp.fromISOString(_13.updated)];
}else{
if(_14==="imageUrlSmall"){
return [_13.media.thumbnail[1].url];
}else{
if(_14==="imageUrl"){
return [_13.content$src];
}else{
if(_14==="imageUrlMedium"){
return [_13.media.thumbnail[2].url];
}else{
if(_14==="link"){
return [_13.link[1]];
}else{
if(_14==="tags"){
return _13.tags.split(" ");
}else{
if(_14==="description"){
return [this._unescapeHtml(_13.summary)];
}
}
}
}
}
}
}
}
}
}
}
return [];
},isItem:function(_15){
if(_15&&_15[this._storeRef]===this){
return true;
}
return false;
},close:function(_16){
},_fetchItems:function(_17,_18,_19){
if(!_17.query){
_17.query={};
}
var _1a={alt:"jsonm",pp:"1",psc:"G"};
_1a["start-index"]="1";
if(_17.query.start){
_1a["start-index"]=_17.query.start;
}
if(_17.query.tags){
_1a.q=_17.query.tags;
}
if(_17.query.userid){
_1a.uname=_17.query.userid;
}
if(_17.query.userids){
_1a.ids=_17.query.userids;
}
if(_17.query.lang){
_1a.hl=_17.query.lang;
}
_1a["max-results"]=this.maxResults;
var _1b=this;
var _1c=null;
var _1d=function(_1e){
if(_1c!==null){
dojo.disconnect(_1c);
}
_18(_1b._processPicasaData(_1e),_17);
};
var _1f={url:this._picasaUrl,preventCache:this.urlPreventCache,content:_1a,callbackParamName:"callback",handle:_1d};
var _20=dojo.io.script.get(_1f);
_20.addErrback(function(_21){
dojo.disconnect(_1c);
_19(_21,_17);
});
},_processPicasaData:function(_22){
var _23=[];
if(_22.feed){
_23=_22.feed.entry;
for(var i=0;i<_23.length;i++){
var _24=_23[i];
_24[this._storeRef]=this;
}
}
return _23;
},_unescapeHtml:function(str){
if(str){
str=str.replace(/&amp;/gm,"&").replace(/&lt;/gm,"<").replace(/&gt;/gm,">").replace(/&quot;/gm,"\"");
str=str.replace(/&#39;/gm,"'");
}
return str;
}});
dojo.extend(dojox.data.PicasaStore,dojo.data.util.simpleFetch);
}
