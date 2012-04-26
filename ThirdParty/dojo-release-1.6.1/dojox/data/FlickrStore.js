/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.FlickrStore"]){
dojo._hasResource["dojox.data.FlickrStore"]=true;
dojo.provide("dojox.data.FlickrStore");
dojo.require("dojo.data.util.simpleFetch");
dojo.require("dojo.io.script");
dojo.require("dojo.date.stamp");
dojo.require("dojo.AdapterRegistry");
dojo.declare("dojox.data.FlickrStore",null,{constructor:function(_1){
if(_1&&_1.label){
this.label=_1.label;
}
if(_1&&"urlPreventCache" in _1){
this.urlPreventCache=_1.urlPreventCache?true:false;
}
},_storeRef:"_S",label:"title",urlPreventCache:true,_assertIsItem:function(_2){
if(!this.isItem(_2)){
throw new Error("dojox.data.FlickrStore: a function was passed an item argument that was not an item");
}
},_assertIsAttribute:function(_3){
if(typeof _3!=="string"){
throw new Error("dojox.data.FlickrStore: a function was passed an attribute argument that was not an attribute name string");
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
return ["title","description","author","datePublished","dateTaken","imageUrl","imageUrlSmall","imageUrlMedium","tags","link"];
},hasAttribute:function(_9,_a){
var v=this.getValue(_9,_a);
if(v||v===""||v===false){
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
var u=dojo.hitch(this,"_unescapeHtml");
var s=dojo.hitch(dojo.date.stamp,"fromISOString");
switch(_14){
case "title":
return [u(_13.title)];
case "author":
return [u(_13.author)];
case "datePublished":
return [s(_13.published)];
case "dateTaken":
return [s(_13.date_taken)];
case "imageUrlSmall":
return [_13.media.m.replace(/_m\./,"_s.")];
case "imageUrl":
return [_13.media.m.replace(/_m\./,".")];
case "imageUrlMedium":
return [_13.media.m];
case "link":
return [_13.link];
case "tags":
return _13.tags.split(" ");
case "description":
return [u(_13.description)];
default:
return [];
}
},isItem:function(_15){
if(_15&&_15[this._storeRef]===this){
return true;
}
return false;
},close:function(_16){
},_fetchItems:function(_17,_18,_19){
var rq=_17.query=_17.query||{};
var _1a={format:"json",tagmode:"any"};
dojo.forEach(["tags","tagmode","lang","id","ids"],function(i){
if(rq[i]){
_1a[i]=rq[i];
}
});
_1a.id=rq.id||rq.userid||rq.groupid;
if(rq.userids){
_1a.ids=rq.userids;
}
var _1b=null;
var _1c={url:dojox.data.FlickrStore.urlRegistry.match(_17),preventCache:this.urlPreventCache,content:_1a};
var _1d=dojo.hitch(this,function(_1e){
if(!!_1b){
dojo.disconnect(_1b);
}
_18(this._processFlickrData(_1e),_17);
});
_1b=dojo.connect("jsonFlickrFeed",_1d);
var _1f=dojo.io.script.get(_1c);
_1f.addErrback(function(_20){
dojo.disconnect(_1b);
_19(_20,_17);
});
},_processFlickrData:function(_21){
var _22=[];
if(_21.items){
_22=_21.items;
for(var i=0;i<_21.items.length;i++){
var _23=_21.items[i];
_23[this._storeRef]=this;
}
}
return _22;
},_unescapeHtml:function(str){
return str.replace(/&amp;/gm,"&").replace(/&lt;/gm,"<").replace(/&gt;/gm,">").replace(/&quot;/gm,"\"").replace(/&#39;/gm,"'");
}});
dojo.extend(dojox.data.FlickrStore,dojo.data.util.simpleFetch);
var feedsUrl="http://api.flickr.com/services/feeds/";
var reg=dojox.data.FlickrStore.urlRegistry=new dojo.AdapterRegistry(true);
reg.register("group pool",function(_24){
return !!_24.query["groupid"];
},feedsUrl+"groups_pool.gne");
reg.register("default",function(_25){
return true;
},feedsUrl+"photos_public.gne");
if(!jsonFlickrFeed){
var jsonFlickrFeed=function(_26){
};
}
}
