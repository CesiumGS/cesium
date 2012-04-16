/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.FlickrRestStore"]){
dojo._hasResource["dojox.data.FlickrRestStore"]=true;
dojo.provide("dojox.data.FlickrRestStore");
dojo.require("dojox.data.FlickrStore");
dojo.declare("dojox.data.FlickrRestStore",dojox.data.FlickrStore,{constructor:function(_1){
if(_1){
if(_1.label){
this.label=_1.label;
}
if(_1.apikey){
this._apikey=_1.apikey;
}
}
this._cache=[];
this._prevRequests={};
this._handlers={};
this._prevRequestRanges=[];
this._maxPhotosPerUser={};
this._id=dojox.data.FlickrRestStore.prototype._id++;
},_id:0,_requestCount:0,_flickrRestUrl:"http://www.flickr.com/services/rest/",_apikey:null,_storeRef:"_S",_cache:null,_prevRequests:null,_handlers:null,_sortAttributes:{"date-posted":true,"date-taken":true,"interestingness":true},_fetchItems:function(_2,_3,_4){
var _5={};
if(!_2.query){
_2.query=_5={};
}else{
dojo.mixin(_5,_2.query);
}
var _6=[];
var _7=[];
var _8={format:"json",method:"flickr.photos.search",api_key:this._apikey,extras:"owner_name,date_upload,date_taken"};
var _9=false;
if(_5.userid){
_9=true;
_8.user_id=_2.query.userid;
_6.push("userid"+_2.query.userid);
}
if(_5.groupid){
_9=true;
_8.group_id=_5.groupid;
_6.push("groupid"+_5.groupid);
}
if(_5.apikey){
_9=true;
_8.api_key=_2.query.apikey;
_7.push("api"+_2.query.apikey);
}else{
if(_8.api_key){
_9=true;
_2.query.apikey=_8.api_key;
_7.push("api"+_8.api_key);
}else{
throw Error("dojox.data.FlickrRestStore: An API key must be specified.");
}
}
_2._curCount=_2.count;
if(_5.page){
_8.page=_2.query.page;
_7.push("page"+_8.page);
}else{
if(("start" in _2)&&_2.start!==null){
if(!_2.count){
_2.count=20;
}
var _a=_2.start%_2.count;
var _b=_2.start,_c=_2.count;
if(_a!==0){
if(_b<_c/2){
_c=_b+_c;
_b=0;
}else{
var _d=20,_e=2;
for(var i=_d;i>0;i--){
if(_b%i===0&&(_b/i)>=_c){
_e=i;
break;
}
}
_c=_b/_e;
}
_2._realStart=_2.start;
_2._realCount=_2.count;
_2._curStart=_b;
_2._curCount=_c;
}else{
_2._realStart=_2._realCount=null;
_2._curStart=_2.start;
_2._curCount=_2.count;
}
_8.page=(_b/_c)+1;
_7.push("page"+_8.page);
}
}
if(_2._curCount){
_8.per_page=_2._curCount;
_7.push("count"+_2._curCount);
}
if(_5.lang){
_8.lang=_2.query.lang;
_6.push("lang"+_2.lang);
}
if(_5.setid){
_8.method="flickr.photosets.getPhotos";
_8.photoset_id=_2.query.setid;
_6.push("set"+_2.query.setid);
}
if(_5.tags){
if(_5.tags instanceof Array){
_8.tags=_5.tags.join(",");
}else{
_8.tags=_5.tags;
}
_6.push("tags"+_8.tags);
if(_5["tag_mode"]&&(_5.tag_mode.toLowerCase()==="any"||_5.tag_mode.toLowerCase()==="all")){
_8.tag_mode=_5.tag_mode;
}
}
if(_5.text){
_8.text=_5.text;
_6.push("text:"+_5.text);
}
if(_5.sort&&_5.sort.length>0){
if(!_5.sort[0].attribute){
_5.sort[0].attribute="date-posted";
}
if(this._sortAttributes[_5.sort[0].attribute]){
if(_5.sort[0].descending){
_8.sort=_5.sort[0].attribute+"-desc";
}else{
_8.sort=_5.sort[0].attribute+"-asc";
}
}
}else{
_8.sort="date-posted-asc";
}
_6.push("sort:"+_8.sort);
_6=_6.join(".");
_7=_7.length>0?"."+_7.join("."):"";
var _f=_6+_7;
_2={query:_5,count:_2._curCount,start:_2._curStart,_realCount:_2._realCount,_realStart:_2._realStart,onBegin:_2.onBegin,onComplete:_2.onComplete,onItem:_2.onItem};
var _10={request:_2,fetchHandler:_3,errorHandler:_4};
if(this._handlers[_f]){
this._handlers[_f].push(_10);
return;
}
this._handlers[_f]=[_10];
var _11=null;
var _12={url:this._flickrRestUrl,preventCache:this.urlPreventCache,content:_8,callbackParamName:"jsoncallback"};
var _13=dojo.hitch(this,function(_14,_15,_16){
var _17=_16.request.onBegin;
_16.request.onBegin=null;
var _18;
var req=_16.request;
if(("_realStart" in req)&&req._realStart!=null){
req.start=req._realStart;
req.count=req._realCount;
req._realStart=req._realCount=null;
}
if(_17){
var _19=null;
if(_15){
_19=(_15.photoset?_15.photoset:_15.photos);
}
if(_19&&("perpage" in _19)&&("pages" in _19)){
if(_19.perpage*_19.pages<=_16.request.start+_16.request.count){
_18=_16.request.start+_19.photo.length;
}else{
_18=_19.perpage*_19.pages;
}
this._maxPhotosPerUser[_6]=_18;
_17(_18,_16.request);
}else{
if(this._maxPhotosPerUser[_6]){
_17(this._maxPhotosPerUser[_6],_16.request);
}
}
}
_16.fetchHandler(_14,_16.request);
if(_17){
_16.request.onBegin=_17;
}
});
var _1a=dojo.hitch(this,function(_1b){
if(_1b.stat!="ok"){
_4(null,_2);
}else{
var _1c=this._handlers[_f];
if(!_1c){
return;
}
this._handlers[_f]=null;
this._prevRequests[_f]=_1b;
var _1d=this._processFlickrData(_1b,_2,_6);
if(!this._prevRequestRanges[_6]){
this._prevRequestRanges[_6]=[];
}
this._prevRequestRanges[_6].push({start:_2.start,end:_2.start+(_1b.photoset?_1b.photoset.photo.length:_1b.photos.photo.length)});
dojo.forEach(_1c,function(i){
_13(_1d,_1b,i);
});
}
});
var _1e=this._prevRequests[_f];
if(_1e){
this._handlers[_f]=null;
_13(this._cache[_6],_1e,_10);
return;
}else{
if(this._checkPrevRanges(_6,_2.start,_2.count)){
this._handlers[_f]=null;
_13(this._cache[_6],null,_10);
return;
}
}
var _1f=dojo.io.script.get(_12);
_1f.addCallback(_1a);
_1f.addErrback(function(_20){
dojo.disconnect(_11);
_4(_20,_2);
});
},getAttributes:function(_21){
return ["title","author","imageUrl","imageUrlSmall","imageUrlMedium","imageUrlThumb","imageUrlLarge","imageUrlOriginal","link","dateTaken","datePublished"];
},getValues:function(_22,_23){
this._assertIsItem(_22);
this._assertIsAttribute(_23);
switch(_23){
case "title":
return [this._unescapeHtml(_22.title)];
case "author":
return [_22.ownername];
case "imageUrlSmall":
return [_22.media.s];
case "imageUrl":
return [_22.media.l];
case "imageUrlOriginal":
return [_22.media.o];
case "imageUrlLarge":
return [_22.media.l];
case "imageUrlMedium":
return [_22.media.m];
case "imageUrlThumb":
return [_22.media.t];
case "link":
return ["http://www.flickr.com/photos/"+_22.owner+"/"+_22.id];
case "dateTaken":
return [_22.datetaken];
case "datePublished":
return [_22.datepublished];
default:
return undefined;
}
},_processFlickrData:function(_24,_25,_26){
if(_24.items){
return dojox.data.FlickrStore.prototype._processFlickrData.apply(this,arguments);
}
var _27=["http://farm",null,".static.flickr.com/",null,"/",null,"_",null];
var _28=[];
var _29=(_24.photoset?_24.photoset:_24.photos);
if(_24.stat=="ok"&&_29&&_29.photo){
_28=_29.photo;
for(var i=0;i<_28.length;i++){
var _2a=_28[i];
_2a[this._storeRef]=this;
_27[1]=_2a.farm;
_27[3]=_2a.server;
_27[5]=_2a.id;
_27[7]=_2a.secret;
var _2b=_27.join("");
_2a.media={s:_2b+"_s.jpg",m:_2b+"_m.jpg",l:_2b+".jpg",t:_2b+"_t.jpg",o:_2b+"_o.jpg"};
if(!_2a.owner&&_24.photoset){
_2a.owner=_24.photoset.owner;
}
}
}
var _2c=_25.start?_25.start:0;
var arr=this._cache[_26];
if(!arr){
this._cache[_26]=arr=[];
}
dojo.forEach(_28,function(i,idx){
arr[idx+_2c]=i;
});
return arr;
},_checkPrevRanges:function(_2d,_2e,_2f){
var end=_2e+_2f;
var arr=this._prevRequestRanges[_2d];
return (!!arr)&&dojo.some(arr,function(_30){
return ((_2e>=_30.start)&&(end<=_30.end));
});
}});
}
