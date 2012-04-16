/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.GoogleFeedStore"]){
dojo._hasResource["dojox.data.GoogleFeedStore"]=true;
dojo.provide("dojox.data.GoogleFeedStore");
dojo.require("dojox.data.GoogleSearchStore");
dojo.experimental("dojox.data.GoogleFeedStore");
dojo.declare("dojox.data.GoogleFeedStore",dojox.data.GoogleSearchStore,{_type:"",_googleUrl:"http://ajax.googleapis.com/ajax/services/feed/load",_attributes:["title","link","author","published","content","summary","categories"],_queryAttrs:{"url":"q"},getFeedValue:function(_1,_2){
var _3=this.getFeedValues(_1,_2);
if(dojo.isArray(_3)){
return _3[0];
}
return _3;
},getFeedValues:function(_4,_5){
if(!this._feedMetaData){
return _5;
}
return this._feedMetaData[_4]||_5;
},_processItem:function(_6,_7){
this.inherited(arguments);
_6["summary"]=_6["contentSnippet"];
_6["published"]=_6["publishedDate"];
},_getItems:function(_8){
if(_8["feed"]){
this._feedMetaData={title:_8.feed.title,desc:_8.feed.description,url:_8.feed.link,author:_8.feed.author};
return _8.feed.entries;
}
return null;
},_createContent:function(_9,_a,_b){
var cb=this.inherited(arguments);
cb.num=(_b.count||10)+(_b.start||0);
return cb;
}});
}
