/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.AppStore"]){
dojo._hasResource["dojox.data.AppStore"]=true;
dojo.provide("dojox.data.AppStore");
dojo.require("dojo.data.util.simpleFetch");
dojo.require("dojo.data.util.filter");
dojo.require("dojox.atom.io.Connection");
dojo.experimental("dojox.data.AppStore");
dojo.declare("dojox.data.AppStore",null,{url:"",urlPreventCache:false,xmethod:false,_atomIO:null,_feed:null,_requests:null,_processing:null,_updates:null,_adds:null,_deletes:null,constructor:function(_1){
if(_1&&_1.url){
this.url=_1.url;
}
if(_1&&_1.urlPreventCache){
this.urlPreventCache=_1.urlPreventCache;
}
if(!this.url){
throw new Error("A URL is required to instantiate an APP Store object");
}
},_setFeed:function(_2,_3){
this._feed=_2;
var i;
for(i=0;i<this._feed.entries.length;i++){
this._feed.entries[i].store=this;
}
if(this._requests){
for(i=0;i<this._requests.length;i++){
var _4=this._requests[i];
if(_4.request&&_4.fh&&_4.eh){
this._finishFetchItems(_4.request,_4.fh,_4.eh);
}else{
if(_4.clear){
this._feed=null;
}else{
if(_4.add){
this._feed.addEntry(_4.add);
}else{
if(_4.remove){
this._feed.removeEntry(_4.remove);
}
}
}
}
}
}
this._requests=null;
},_getAllItems:function(){
var _5=[];
for(var i=0;i<this._feed.entries.length;i++){
_5.push(this._feed.entries[i]);
}
return _5;
},_assertIsItem:function(_6){
if(!this.isItem(_6)){
throw new Error("This error message is provided when a function is called in the following form: "+"getAttribute(argument, attributeName).  The argument variable represents the member "+"or owner of the object. The error is created when an item that does not belong "+"to this store is specified as an argument.");
}
},_assertIsAttribute:function(_7){
if(typeof _7!=="string"){
throw new Error("The attribute argument must be a string. The error is created "+"when a different type of variable is specified such as an array or object.");
}
for(var _8 in dojox.atom.io.model._actions){
if(_8==_7){
return true;
}
}
return false;
},_addUpdate:function(_9){
if(!this._updates){
this._updates=[_9];
}else{
this._updates.push(_9);
}
},getValue:function(_a,_b,_c){
var _d=this.getValues(_a,_b);
return (_d.length>0)?_d[0]:_c;
},getValues:function(_e,_f){
this._assertIsItem(_e);
var _10=this._assertIsAttribute(_f);
if(_10){
if((_f==="author"||_f==="contributor"||_f==="link")&&_e[_f+"s"]){
return _e[_f+"s"];
}
if(_f==="category"&&_e.categories){
return _e.categories;
}
if(_e[_f]){
_e=_e[_f];
if(_e.declaredClass=="dojox.atom.io.model.Content"){
return [_e.value];
}
return [_e];
}
}
return [];
},getAttributes:function(_11){
this._assertIsItem(_11);
var _12=[];
for(var key in dojox.atom.io.model._actions){
if(this.hasAttribute(_11,key)){
_12.push(key);
}
}
return _12;
},hasAttribute:function(_13,_14){
return this.getValues(_13,_14).length>0;
},containsValue:function(_15,_16,_17){
var _18=undefined;
if(typeof _17==="string"){
_18=dojo.data.util.filter.patternToRegExp(_17,false);
}
return this._containsValue(_15,_16,_17,_18);
},_containsValue:function(_19,_1a,_1b,_1c,_1d){
var _1e=this.getValues(_19,_1a);
for(var i=0;i<_1e.length;++i){
var _1f=_1e[i];
if(typeof _1f==="string"&&_1c){
if(_1d){
_1f=_1f.replace(new RegExp(/^\s+/),"");
_1f=_1f.replace(new RegExp(/\s+$/),"");
}
_1f=_1f.replace(/\r|\n|\r\n/g,"");
return (_1f.match(_1c)!==null);
}else{
if(_1b===_1f){
return true;
}
}
}
return false;
},isItem:function(_20){
return _20&&_20.store&&_20.store===this;
},isItemLoaded:function(_21){
return this.isItem(_21);
},loadItem:function(_22){
this._assertIsItem(_22.item);
},_fetchItems:function(_23,_24,_25){
if(this._feed){
this._finishFetchItems(_23,_24,_25);
}else{
var _26=false;
if(!this._requests){
this._requests=[];
_26=true;
}
this._requests.push({request:_23,fh:_24,eh:_25});
if(_26){
this._atomIO=new dojox.atom.io.Connection(false,this.urlPreventCache);
this._atomIO.getFeed(this.url,this._setFeed,null,this);
}
}
},_finishFetchItems:function(_27,_28,_29){
var _2a=null;
var _2b=this._getAllItems();
if(_27.query){
var _2c=_27.queryOptions?_27.queryOptions.ignoreCase:false;
_2a=[];
var _2d={};
var key;
var _2e;
for(key in _27.query){
_2e=_27.query[key]+"";
if(typeof _2e==="string"){
_2d[key]=dojo.data.util.filter.patternToRegExp(_2e,_2c);
}
}
for(var i=0;i<_2b.length;++i){
var _2f=true;
var _30=_2b[i];
for(key in _27.query){
_2e=_27.query[key]+"";
if(!this._containsValue(_30,key,_2e,_2d[key],_27.trim)){
_2f=false;
}
}
if(_2f){
_2a.push(_30);
}
}
}else{
if(_2b.length>0){
_2a=_2b.slice(0,_2b.length);
}
}
try{
_28(_2a,_27);
}
catch(e){
_29(e,_27);
}
},getFeatures:function(){
return {"dojo.data.api.Read":true,"dojo.data.api.Write":true,"dojo.data.api.Identity":true};
},close:function(_31){
this._feed=null;
},getLabel:function(_32){
if(this.isItem(_32)){
return this.getValue(_32,"title","No Title");
}
return undefined;
},getLabelAttributes:function(_33){
return ["title"];
},getIdentity:function(_34){
this._assertIsItem(_34);
return this.getValue(_34,"id");
},getIdentityAttributes:function(_35){
return ["id"];
},fetchItemByIdentity:function(_36){
this._fetchItems({query:{id:_36.identity},onItem:_36.onItem,scope:_36.scope},function(_37,_38){
var _39=_38.scope;
if(!_39){
_39=dojo.global;
}
if(_37.length<1){
_38.onItem.call(_39,null);
}else{
_38.onItem.call(_39,_37[0]);
}
},_36.onError);
},newItem:function(_3a){
var _3b=new dojox.atom.io.model.Entry();
var _3c=null;
var _3d=null;
var i;
for(var key in _3a){
if(this._assertIsAttribute(key)){
_3c=_3a[key];
switch(key){
case "link":
for(i in _3c){
_3d=_3c[i];
_3b.addLink(_3d.href,_3d.rel,_3d.hrefLang,_3d.title,_3d.type);
}
break;
case "author":
for(i in _3c){
_3d=_3c[i];
_3b.addAuthor(_3d.name,_3d.email,_3d.uri);
}
break;
case "contributor":
for(i in _3c){
_3d=_3c[i];
_3b.addContributor(_3d.name,_3d.email,_3d.uri);
}
break;
case "category":
for(i in _3c){
_3d=_3c[i];
_3b.addCategory(_3d.scheme,_3d.term,_3d.label);
}
break;
case "icon":
case "id":
case "logo":
case "xmlBase":
case "rights":
_3b[key]=_3c;
break;
case "updated":
case "published":
case "issued":
case "modified":
_3b[key]=dojox.atom.io.model.util.createDate(_3c);
break;
case "content":
case "summary":
case "title":
case "subtitle":
_3b[key]=new dojox.atom.io.model.Content(key);
_3b[key].value=_3c;
break;
default:
_3b[key]=_3c;
break;
}
}
}
_3b.store=this;
_3b.isDirty=true;
if(!this._adds){
this._adds=[_3b];
}else{
this._adds.push(_3b);
}
if(this._feed){
this._feed.addEntry(_3b);
}else{
if(this._requests){
this._requests.push({add:_3b});
}else{
this._requests=[{add:_3b}];
this._atomIO=new dojox.atom.io.Connection(false,this.urlPreventCache);
this._atomIO.getFeed(this.url,dojo.hitch(this,this._setFeed));
}
}
return true;
},deleteItem:function(_3e){
this._assertIsItem(_3e);
if(!this._deletes){
this._deletes=[_3e];
}else{
this._deletes.push(_3e);
}
if(this._feed){
this._feed.removeEntry(_3e);
}else{
if(this._requests){
this._requests.push({remove:_3e});
}else{
this._requests=[{remove:_3e}];
this._atomIO=new dojox.atom.io.Connection(false,this.urlPreventCache);
this._atomIO.getFeed(this.url,dojo.hitch(this,this._setFeed));
}
}
_3e=null;
return true;
},setValue:function(_3f,_40,_41){
this._assertIsItem(_3f);
var _42={item:_3f};
if(this._assertIsAttribute(_40)){
switch(_40){
case "link":
_42.links=_3f.links;
this._addUpdate(_42);
_3f.links=null;
_3f.addLink(_41.href,_41.rel,_41.hrefLang,_41.title,_41.type);
_3f.isDirty=true;
return true;
case "author":
_42.authors=_3f.authors;
this._addUpdate(_42);
_3f.authors=null;
_3f.addAuthor(_41.name,_41.email,_41.uri);
_3f.isDirty=true;
return true;
case "contributor":
_42.contributors=_3f.contributors;
this._addUpdate(_42);
_3f.contributors=null;
_3f.addContributor(_41.name,_41.email,_41.uri);
_3f.isDirty=true;
return true;
case "category":
_42.categories=_3f.categories;
this._addUpdate(_42);
_3f.categories=null;
_3f.addCategory(_41.scheme,_41.term,_41.label);
_3f.isDirty=true;
return true;
case "icon":
case "id":
case "logo":
case "xmlBase":
case "rights":
_42[_40]=_3f[_40];
this._addUpdate(_42);
_3f[_40]=_41;
_3f.isDirty=true;
return true;
case "updated":
case "published":
case "issued":
case "modified":
_42[_40]=_3f[_40];
this._addUpdate(_42);
_3f[_40]=dojox.atom.io.model.util.createDate(_41);
_3f.isDirty=true;
return true;
case "content":
case "summary":
case "title":
case "subtitle":
_42[_40]=_3f[_40];
this._addUpdate(_42);
_3f[_40]=new dojox.atom.io.model.Content(_40);
_3f[_40].value=_41;
_3f.isDirty=true;
return true;
default:
_42[_40]=_3f[_40];
this._addUpdate(_42);
_3f[_40]=_41;
_3f.isDirty=true;
return true;
}
}
return false;
},setValues:function(_43,_44,_45){
if(_45.length===0){
return this.unsetAttribute(_43,_44);
}
this._assertIsItem(_43);
var _46={item:_43};
var _47;
var i;
if(this._assertIsAttribute(_44)){
switch(_44){
case "link":
_46.links=_43.links;
_43.links=null;
for(i in _45){
_47=_45[i];
_43.addLink(_47.href,_47.rel,_47.hrefLang,_47.title,_47.type);
}
_43.isDirty=true;
return true;
case "author":
_46.authors=_43.authors;
_43.authors=null;
for(i in _45){
_47=_45[i];
_43.addAuthor(_47.name,_47.email,_47.uri);
}
_43.isDirty=true;
return true;
case "contributor":
_46.contributors=_43.contributors;
_43.contributors=null;
for(i in _45){
_47=_45[i];
_43.addContributor(_47.name,_47.email,_47.uri);
}
_43.isDirty=true;
return true;
case "categories":
_46.categories=_43.categories;
_43.categories=null;
for(i in _45){
_47=_45[i];
_43.addCategory(_47.scheme,_47.term,_47.label);
}
_43.isDirty=true;
return true;
case "icon":
case "id":
case "logo":
case "xmlBase":
case "rights":
_46[_44]=_43[_44];
_43[_44]=_45[0];
_43.isDirty=true;
return true;
case "updated":
case "published":
case "issued":
case "modified":
_46[_44]=_43[_44];
_43[_44]=dojox.atom.io.model.util.createDate(_45[0]);
_43.isDirty=true;
return true;
case "content":
case "summary":
case "title":
case "subtitle":
_46[_44]=_43[_44];
_43[_44]=new dojox.atom.io.model.Content(_44);
_43[_44].values[0]=_45[0];
_43.isDirty=true;
return true;
default:
_46[_44]=_43[_44];
_43[_44]=_45[0];
_43.isDirty=true;
return true;
}
}
this._addUpdate(_46);
return false;
},unsetAttribute:function(_48,_49){
this._assertIsItem(_48);
if(this._assertIsAttribute(_49)){
if(_48[_49]!==null){
var _4a={item:_48};
switch(_49){
case "author":
case "contributor":
case "link":
_4a[_49+"s"]=_48[_49+"s"];
break;
case "category":
_4a.categories=_48.categories;
break;
default:
_4a[_49]=_48[_49];
break;
}
_48.isDirty=true;
_48[_49]=null;
this._addUpdate(_4a);
return true;
}
}
return false;
},save:function(_4b){
var i;
for(i in this._adds){
this._atomIO.addEntry(this._adds[i],null,function(){
},_4b.onError,false,_4b.scope);
}
this._adds=null;
for(i in this._updates){
this._atomIO.updateEntry(this._updates[i].item,function(){
},_4b.onError,false,this.xmethod,_4b.scope);
}
this._updates=null;
for(i in this._deletes){
this._atomIO.removeEntry(this._deletes[i],function(){
},_4b.onError,this.xmethod,_4b.scope);
}
this._deletes=null;
this._atomIO.getFeed(this.url,dojo.hitch(this,this._setFeed));
if(_4b.onComplete){
var _4c=_4b.scope||dojo.global;
_4b.onComplete.call(_4c);
}
},revert:function(){
var i;
for(i in this._adds){
this._feed.removeEntry(this._adds[i]);
}
this._adds=null;
var _4d,_4e,key;
for(i in this._updates){
_4d=this._updates[i];
_4e=_4d.item;
for(key in _4d){
if(key!=="item"){
_4e[key]=_4d[key];
}
}
}
this._updates=null;
for(i in this._deletes){
this._feed.addEntry(this._deletes[i]);
}
this._deletes=null;
return true;
},isDirty:function(_4f){
if(_4f){
this._assertIsItem(_4f);
return _4f.isDirty?true:false;
}
return (this._adds!==null||this._updates!==null);
}});
dojo.extend(dojox.data.AppStore,dojo.data.util.simpleFetch);
}
