/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.layout.ContentPane"]){
dojo._hasResource["dijit.layout.ContentPane"]=true;
dojo.provide("dijit.layout.ContentPane");
dojo.require("dijit._Widget");
dojo.require("dijit.layout._ContentPaneResizeMixin");
dojo.require("dojo.string");
dojo.require("dojo.html");
dojo.requireLocalization("dijit","loading",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dijit.layout.ContentPane",[dijit._Widget,dijit.layout._ContentPaneResizeMixin],{href:"",extractContent:false,parseOnLoad:true,parserScope:dojo._scopeName,preventCache:false,preload:false,refreshOnShow:false,loadingMessage:"<span class='dijitContentPaneLoading'>${loadingState}</span>",errorMessage:"<span class='dijitContentPaneError'>${errorState}</span>",isLoaded:false,baseClass:"dijitContentPane",ioArgs:{},onLoadDeferred:null,attributeMap:dojo.delegate(dijit._Widget.prototype.attributeMap,{title:[]}),stopParser:true,template:false,create:function(_1,_2){
if((!_1||!_1.template)&&_2&&!("href" in _1)&&!("content" in _1)){
var df=dojo.doc.createDocumentFragment();
_2=dojo.byId(_2);
while(_2.firstChild){
df.appendChild(_2.firstChild);
}
_1=dojo.delegate(_1,{content:df});
}
this.inherited(arguments,[_1,_2]);
},postMixInProperties:function(){
this.inherited(arguments);
var _3=dojo.i18n.getLocalization("dijit","loading",this.lang);
this.loadingMessage=dojo.string.substitute(this.loadingMessage,_3);
this.errorMessage=dojo.string.substitute(this.errorMessage,_3);
},buildRendering:function(){
this.inherited(arguments);
if(!this.containerNode){
this.containerNode=this.domNode;
}
this.domNode.title="";
if(!dojo.attr(this.domNode,"role")){
dijit.setWaiRole(this.domNode,"group");
}
},_startChildren:function(){
this.inherited(arguments);
if(this._contentSetter){
dojo.forEach(this._contentSetter.parseResults,function(_4){
if(!_4._started&&!_4._destroyed&&dojo.isFunction(_4.startup)){
_4.startup();
_4._started=true;
}
},this);
}
},setHref:function(_5){
dojo.deprecated("dijit.layout.ContentPane.setHref() is deprecated. Use set('href', ...) instead.","","2.0");
return this.set("href",_5);
},_setHrefAttr:function(_6){
this.cancel();
this.onLoadDeferred=new dojo.Deferred(dojo.hitch(this,"cancel"));
this.onLoadDeferred.addCallback(dojo.hitch(this,"onLoad"));
this._set("href",_6);
if(this.preload||(this._created&&this._isShown())){
this._load();
}else{
this._hrefChanged=true;
}
return this.onLoadDeferred;
},setContent:function(_7){
dojo.deprecated("dijit.layout.ContentPane.setContent() is deprecated.  Use set('content', ...) instead.","","2.0");
this.set("content",_7);
},_setContentAttr:function(_8){
this._set("href","");
this.cancel();
this.onLoadDeferred=new dojo.Deferred(dojo.hitch(this,"cancel"));
if(this._created){
this.onLoadDeferred.addCallback(dojo.hitch(this,"onLoad"));
}
this._setContent(_8||"");
this._isDownloaded=false;
return this.onLoadDeferred;
},_getContentAttr:function(){
return this.containerNode.innerHTML;
},cancel:function(){
if(this._xhrDfd&&(this._xhrDfd.fired==-1)){
this._xhrDfd.cancel();
}
delete this._xhrDfd;
this.onLoadDeferred=null;
},uninitialize:function(){
if(this._beingDestroyed){
this.cancel();
}
this.inherited(arguments);
},destroyRecursive:function(_9){
if(this._beingDestroyed){
return;
}
this.inherited(arguments);
},_onShow:function(){
this.inherited(arguments);
if(this.href){
if(!this._xhrDfd&&(!this.isLoaded||this._hrefChanged||this.refreshOnShow)){
return this.refresh();
}
}
},refresh:function(){
this.cancel();
this.onLoadDeferred=new dojo.Deferred(dojo.hitch(this,"cancel"));
this.onLoadDeferred.addCallback(dojo.hitch(this,"onLoad"));
this._load();
return this.onLoadDeferred;
},_load:function(){
this._setContent(this.onDownloadStart(),true);
var _a=this;
var _b={preventCache:(this.preventCache||this.refreshOnShow),url:this.href,handleAs:"text"};
if(dojo.isObject(this.ioArgs)){
dojo.mixin(_b,this.ioArgs);
}
var _c=(this._xhrDfd=(this.ioMethod||dojo.xhrGet)(_b));
_c.addCallback(function(_d){
try{
_a._isDownloaded=true;
_a._setContent(_d,false);
_a.onDownloadEnd();
}
catch(err){
_a._onError("Content",err);
}
delete _a._xhrDfd;
return _d;
});
_c.addErrback(function(_e){
if(!_c.canceled){
_a._onError("Download",_e);
}
delete _a._xhrDfd;
return _e;
});
delete this._hrefChanged;
},_onLoadHandler:function(_f){
this._set("isLoaded",true);
try{
this.onLoadDeferred.callback(_f);
}
catch(e){
console.error("Error "+this.widgetId+" running custom onLoad code: "+e.message);
}
},_onUnloadHandler:function(){
this._set("isLoaded",false);
try{
this.onUnload();
}
catch(e){
console.error("Error "+this.widgetId+" running custom onUnload code: "+e.message);
}
},destroyDescendants:function(){
if(this.isLoaded){
this._onUnloadHandler();
}
var _10=this._contentSetter;
dojo.forEach(this.getChildren(),function(_11){
if(_11.destroyRecursive){
_11.destroyRecursive();
}
});
if(_10){
dojo.forEach(_10.parseResults,function(_12){
if(_12.destroyRecursive&&_12.domNode&&_12.domNode.parentNode==dojo.body()){
_12.destroyRecursive();
}
});
delete _10.parseResults;
}
dojo.html._emptyNode(this.containerNode);
delete this._singleChild;
},_setContent:function(_13,_14){
this.destroyDescendants();
var _15=this._contentSetter;
if(!(_15&&_15 instanceof dojo.html._ContentSetter)){
_15=this._contentSetter=new dojo.html._ContentSetter({node:this.containerNode,_onError:dojo.hitch(this,this._onError),onContentError:dojo.hitch(this,function(e){
var _16=this.onContentError(e);
try{
this.containerNode.innerHTML=_16;
}
catch(e){
console.error("Fatal "+this.id+" could not change content due to "+e.message,e);
}
})});
}
var _17=dojo.mixin({cleanContent:this.cleanContent,extractContent:this.extractContent,parseContent:this.parseOnLoad,parserScope:this.parserScope,startup:false,dir:this.dir,lang:this.lang},this._contentSetterParams||{});
_15.set((dojo.isObject(_13)&&_13.domNode)?_13.domNode:_13,_17);
delete this._contentSetterParams;
if(this.doLayout){
this._checkIfSingleChild();
}
if(!_14){
if(this._started){
this._startChildren();
this._scheduleLayout();
}
this._onLoadHandler(_13);
}
},_onError:function(_18,err,_19){
this.onLoadDeferred.errback(err);
var _1a=this["on"+_18+"Error"].call(this,err);
if(_19){
console.error(_19,err);
}else{
if(_1a){
this._setContent(_1a,true);
}
}
},onLoad:function(_1b){
},onUnload:function(){
},onDownloadStart:function(){
return this.loadingMessage;
},onContentError:function(_1c){
},onDownloadError:function(_1d){
return this.errorMessage;
},onDownloadEnd:function(){
}});
}
