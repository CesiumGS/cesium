/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.GoogleSearchStore"]){
dojo._hasResource["dojox.data.GoogleSearchStore"]=true;
dojo.provide("dojox.data.GoogleSearchStore");
dojo.require("dojo.io.script");
dojo.provide("dojox.data.GoogleWebSearchStore");
dojo.provide("dojox.data.GoogleBlogSearchStore");
dojo.provide("dojox.data.GoogleLocalSearchStore");
dojo.provide("dojox.data.GoogleVideoSearchStore");
dojo.provide("dojox.data.GoogleNewsSearchStore");
dojo.provide("dojox.data.GoogleBookSearchStore");
dojo.provide("dojox.data.GoogleImageSearchStore");
dojo.experimental("dojox.data.GoogleSearchStore");
dojo.declare("dojox.data.GoogleSearchStore",null,{constructor:function(_1){
if(_1){
if(_1.label){
this.label=_1.label;
}
if(_1.key){
this._key=_1.key;
}
if(_1.lang){
this._lang=_1.lang;
}
if("urlPreventCache" in _1){
this.urlPreventCache=_1.urlPreventCache?true:false;
}
}
this._id=dojox.data.GoogleSearchStore.prototype._id++;
},_id:0,_requestCount:0,_googleUrl:"http://ajax.googleapis.com/ajax/services/search/",_storeRef:"_S",_attributes:["unescapedUrl","url","visibleUrl","cacheUrl","title","titleNoFormatting","content","estimatedResultCount"],_aggregatedAttributes:{estimatedResultCount:"cursor.estimatedResultCount"},label:"titleNoFormatting",_type:"web",urlPreventCache:true,_queryAttrs:{text:"q"},_assertIsItem:function(_2){
if(!this.isItem(_2)){
throw new Error("dojox.data.GoogleSearchStore: a function was passed an item argument that was not an item");
}
},_assertIsAttribute:function(_3){
if(typeof _3!=="string"){
throw new Error("dojox.data.GoogleSearchStore: a function was passed an attribute argument that was not an attribute name string");
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
return this._attributes;
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
var val=_13[_14];
if(dojo.isArray(val)){
return val;
}else{
if(val!==undefined){
return [val];
}else{
return [];
}
}
},isItem:function(_15){
if(_15&&_15[this._storeRef]===this){
return true;
}
return false;
},close:function(_16){
},_format:function(_17,_18){
return _17;
},fetch:function(_19){
_19=_19||{};
var _1a=_19.scope||dojo.global;
if(!_19.query){
if(_19.onError){
_19.onError.call(_1a,new Error(this.declaredClass+": A query must be specified."));
return;
}
}
var _1b={};
for(var _1c in this._queryAttrs){
_1b[_1c]=_19.query[_1c];
}
_19={query:_1b,onComplete:_19.onComplete,onError:_19.onError,onItem:_19.onItem,onBegin:_19.onBegin,start:_19.start,count:_19.count};
var _1d=8;
var _1e="GoogleSearchStoreCallback_"+this._id+"_"+(++this._requestCount);
var _1f=this._createContent(_1b,_1e,_19);
var _20;
if(typeof (_19.start)==="undefined"||_19.start===null){
_19.start=0;
}
if(!_19.count){
_19.count=_1d;
}
_20={start:_19.start-_19.start%_1d};
var _21=this;
var _22=this._googleUrl+this._type;
var _23={url:_22,preventCache:this.urlPreventCache,content:_1f};
var _24=[];
var _25=0;
var _26=false;
var _27=_19.start-1;
var _28=0;
var _29=[];
function _2a(req){
_28++;
_23.content.context=_23.content.start=req.start;
var _2b=dojo.io.script.get(_23);
_29.push(_2b.ioArgs.id);
_2b.addErrback(function(_2c){
if(_19.onError){
_19.onError.call(_1a,_2c,_19);
}
});
};
var _2d=function(_2e,_2f){
if(_29.length>0){
dojo.query("#"+_29.splice(0,1)).forEach(dojo.destroy);
}
if(_26){
return;
}
var _30=_21._getItems(_2f);
var _31=_2f?_2f["cursor"]:null;
if(_30){
for(var i=0;i<_30.length&&i+_2e<_19.count+_19.start;i++){
_21._processItem(_30[i],_2f);
_24[i+_2e]=_30[i];
}
_25++;
if(_25==1){
var _32=_31?_31.pages:null;
var _33=_32?Number(_32[_32.length-1].start):0;
if(_19.onBegin){
var est=_31?_31.estimatedResultCount:_30.length;
var _34=est?Math.min(est,_33+_30.length):_33+_30.length;
_19.onBegin.call(_1a,_34,_19);
}
var _35=(_19.start-_19.start%_1d)+_1d;
var _36=1;
while(_32){
if(!_32[_36]||Number(_32[_36].start)>=_19.start+_19.count){
break;
}
if(Number(_32[_36].start)>=_35){
_2a({start:_32[_36].start});
}
_36++;
}
}
if(_19.onItem&&_24[_27+1]){
do{
_27++;
_19.onItem.call(_1a,_24[_27],_19);
}while(_24[_27+1]&&_27<_19.start+_19.count);
}
if(_25==_28){
_26=true;
dojo.global[_1e]=null;
if(_19.onItem){
_19.onComplete.call(_1a,null,_19);
}else{
_24=_24.slice(_19.start,_19.start+_19.count);
_19.onComplete.call(_1a,_24,_19);
}
}
}
};
var _37=[];
var _38=_20.start-1;
dojo.global[_1e]=function(_39,_3a,_3b,_3c){
try{
if(_3b!=200){
if(_19.onError){
_19.onError.call(_1a,new Error("Response from Google was: "+_3b),_19);
}
dojo.global[_1e]=function(){
};
return;
}
if(_39==_38+1){
_2d(Number(_39),_3a);
_38+=_1d;
if(_37.length>0){
_37.sort(_21._getSort());
while(_37.length>0&&_37[0].start==_38+1){
_2d(Number(_37[0].start),_37[0].data);
_37.splice(0,1);
_38+=_1d;
}
}
}else{
_37.push({start:_39,data:_3a});
}
}
catch(e){
_19.onError.call(_1a,e,_19);
}
};
_2a(_20);
},_getSort:function(){
return function(a,b){
if(a.start<b.start){
return -1;
}
if(b.start<a.start){
return 1;
}
return 0;
};
},_processItem:function(_3d,_3e){
_3d[this._storeRef]=this;
for(var _3f in this._aggregatedAttributes){
_3d[_3f]=dojo.getObject(this._aggregatedAttributes[_3f],false,_3e);
}
},_getItems:function(_40){
return _40["results"]||_40;
},_createContent:function(_41,_42,_43){
var _44={v:"1.0",rsz:"large",callback:_42,key:this._key,hl:this._lang};
for(var _45 in this._queryAttrs){
_44[this._queryAttrs[_45]]=_41[_45];
}
return _44;
}});
dojo.declare("dojox.data.GoogleWebSearchStore",dojox.data.GoogleSearchStore,{});
dojo.declare("dojox.data.GoogleBlogSearchStore",dojox.data.GoogleSearchStore,{_type:"blogs",_attributes:["blogUrl","postUrl","title","titleNoFormatting","content","author","publishedDate"],_aggregatedAttributes:{}});
dojo.declare("dojox.data.GoogleLocalSearchStore",dojox.data.GoogleSearchStore,{_type:"local",_attributes:["title","titleNoFormatting","url","lat","lng","streetAddress","city","region","country","phoneNumbers","ddUrl","ddUrlToHere","ddUrlFromHere","staticMapUrl","viewport"],_aggregatedAttributes:{viewport:"viewport"},_queryAttrs:{text:"q",centerLatLong:"sll",searchSpan:"sspn"}});
dojo.declare("dojox.data.GoogleVideoSearchStore",dojox.data.GoogleSearchStore,{_type:"video",_attributes:["title","titleNoFormatting","content","url","published","publisher","duration","tbWidth","tbHeight","tbUrl","playUrl"],_aggregatedAttributes:{}});
dojo.declare("dojox.data.GoogleNewsSearchStore",dojox.data.GoogleSearchStore,{_type:"news",_attributes:["title","titleNoFormatting","content","url","unescapedUrl","publisher","clusterUrl","location","publishedDate","relatedStories"],_aggregatedAttributes:{}});
dojo.declare("dojox.data.GoogleBookSearchStore",dojox.data.GoogleSearchStore,{_type:"books",_attributes:["title","titleNoFormatting","authors","url","unescapedUrl","bookId","pageCount","publishedYear"],_aggregatedAttributes:{}});
dojo.declare("dojox.data.GoogleImageSearchStore",dojox.data.GoogleSearchStore,{_type:"images",_attributes:["title","titleNoFormatting","visibleUrl","url","unescapedUrl","originalContextUrl","width","height","tbWidth","tbHeight","tbUrl","content","contentNoFormatting"],_aggregatedAttributes:{}});
}
