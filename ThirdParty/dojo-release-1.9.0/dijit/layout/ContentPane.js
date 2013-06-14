//>>built
define("dijit/layout/ContentPane",["dojo/_base/kernel","dojo/_base/lang","../_Widget","../_Container","./_ContentPaneResizeMixin","dojo/string","dojo/html","dojo/i18n!../nls/loading","dojo/_base/array","dojo/_base/declare","dojo/_base/Deferred","dojo/dom","dojo/dom-attr","dojo/dom-construct","dojo/_base/xhr","dojo/i18n","dojo/when"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b,_c,_d,_e,_f,_10,_11){
return _a("dijit.layout.ContentPane",[_3,_4,_5],{href:"",content:"",extractContent:false,parseOnLoad:true,parserScope:_1._scopeName,preventCache:false,preload:false,refreshOnShow:false,loadingMessage:"<span class='dijitContentPaneLoading'><span class='dijitInline dijitIconLoading'></span>${loadingState}</span>",errorMessage:"<span class='dijitContentPaneError'><span class='dijitInline dijitIconError'></span>${errorState}</span>",isLoaded:false,baseClass:"dijitContentPane",ioArgs:{},onLoadDeferred:null,_setTitleAttr:null,stopParser:true,template:false,markupFactory:function(_12,_13,_14){
var _15=new _14(_12,_13);
return !_15.href&&_15._contentSetter&&_15._contentSetter.parseDeferred&&!_15._contentSetter.parseDeferred.isFulfilled()?_15._contentSetter.parseDeferred.then(function(){
return _15;
}):_15;
},create:function(_16,_17){
if((!_16||!_16.template)&&_17&&!("href" in _16)&&!("content" in _16)){
_17=_c.byId(_17);
var df=_17.ownerDocument.createDocumentFragment();
while(_17.firstChild){
df.appendChild(_17.firstChild);
}
_16=_2.delegate(_16,{content:df});
}
this.inherited(arguments,[_16,_17]);
},postMixInProperties:function(){
this.inherited(arguments);
var _18=_10.getLocalization("dijit","loading",this.lang);
this.loadingMessage=_6.substitute(this.loadingMessage,_18);
this.errorMessage=_6.substitute(this.errorMessage,_18);
},buildRendering:function(){
this.inherited(arguments);
if(!this.containerNode){
this.containerNode=this.domNode;
}
this.domNode.removeAttribute("title");
},startup:function(){
this.inherited(arguments);
if(this._contentSetter){
_9.forEach(this._contentSetter.parseResults,function(obj){
if(!obj._started&&!obj._destroyed&&_2.isFunction(obj.startup)){
obj.startup();
obj._started=true;
}
},this);
}
},_startChildren:function(){
_9.forEach(this.getChildren(),function(obj){
if(!obj._started&&!obj._destroyed&&_2.isFunction(obj.startup)){
obj.startup();
obj._started=true;
}
});
if(this._contentSetter){
_9.forEach(this._contentSetter.parseResults,function(obj){
if(!obj._started&&!obj._destroyed&&_2.isFunction(obj.startup)){
obj.startup();
obj._started=true;
}
},this);
}
},setHref:function(_19){
_1.deprecated("dijit.layout.ContentPane.setHref() is deprecated. Use set('href', ...) instead.","","2.0");
return this.set("href",_19);
},_setHrefAttr:function(_1a){
this.cancel();
this.onLoadDeferred=new _b(_2.hitch(this,"cancel"));
this.onLoadDeferred.then(_2.hitch(this,"onLoad"));
this._set("href",_1a);
if(this.preload||(this._created&&this._isShown())){
this._load();
}else{
this._hrefChanged=true;
}
return this.onLoadDeferred;
},setContent:function(_1b){
_1.deprecated("dijit.layout.ContentPane.setContent() is deprecated.  Use set('content', ...) instead.","","2.0");
this.set("content",_1b);
},_setContentAttr:function(_1c){
this._set("href","");
this.cancel();
this.onLoadDeferred=new _b(_2.hitch(this,"cancel"));
if(this._created){
this.onLoadDeferred.then(_2.hitch(this,"onLoad"));
}
this._setContent(_1c||"");
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
},destroy:function(){
this.cancel();
this.inherited(arguments);
},destroyRecursive:function(_1d){
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
this.onLoadDeferred=new _b(_2.hitch(this,"cancel"));
this.onLoadDeferred.then(_2.hitch(this,"onLoad"));
this._load();
return this.onLoadDeferred;
},_load:function(){
this._setContent(this.onDownloadStart(),true);
var _1e=this;
var _1f={preventCache:(this.preventCache||this.refreshOnShow),url:this.href,handleAs:"text"};
if(_2.isObject(this.ioArgs)){
_2.mixin(_1f,this.ioArgs);
}
var _20=(this._xhrDfd=(this.ioMethod||_f.get)(_1f)),_21;
_20.then(function(_22){
_21=_22;
try{
_1e._isDownloaded=true;
return _1e._setContent(_22,false);
}
catch(err){
_1e._onError("Content",err);
}
},function(err){
if(!_20.canceled){
_1e._onError("Download",err);
}
delete _1e._xhrDfd;
return err;
}).then(function(){
_1e.onDownloadEnd();
delete _1e._xhrDfd;
return _21;
});
delete this._hrefChanged;
},_onLoadHandler:function(_23){
this._set("isLoaded",true);
try{
this.onLoadDeferred.resolve(_23);
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
},destroyDescendants:function(_24){
if(this.isLoaded){
this._onUnloadHandler();
}
var _25=this._contentSetter;
_9.forEach(this.getChildren(),function(_26){
if(_26.destroyRecursive){
_26.destroyRecursive(_24);
}else{
if(_26.destroy){
_26.destroy(_24);
}
}
_26._destroyed=true;
});
if(_25){
_9.forEach(_25.parseResults,function(_27){
if(!_27._destroyed){
if(_27.destroyRecursive){
_27.destroyRecursive(_24);
}else{
if(_27.destroy){
_27.destroy(_24);
}
}
_27._destroyed=true;
}
});
delete _25.parseResults;
}
if(!_24){
_e.empty(this.containerNode);
}
delete this._singleChild;
},_setContent:function(_28,_29){
this.destroyDescendants();
var _2a=this._contentSetter;
if(!(_2a&&_2a instanceof _7._ContentSetter)){
_2a=this._contentSetter=new _7._ContentSetter({node:this.containerNode,_onError:_2.hitch(this,this._onError),onContentError:_2.hitch(this,function(e){
var _2b=this.onContentError(e);
try{
this.containerNode.innerHTML=_2b;
}
catch(e){
console.error("Fatal "+this.id+" could not change content due to "+e.message,e);
}
})});
}
var _2c=_2.mixin({cleanContent:this.cleanContent,extractContent:this.extractContent,parseContent:!_28.domNode&&this.parseOnLoad,parserScope:this.parserScope,startup:false,dir:this.dir,lang:this.lang,textDir:this.textDir},this._contentSetterParams||{});
var p=_2a.set((_2.isObject(_28)&&_28.domNode)?_28.domNode:_28,_2c);
var _2d=this;
return _11(p&&p.then?p:_2a.parseDeferred,function(){
delete _2d._contentSetterParams;
if(!_29){
if(_2d._started){
_2d._startChildren();
_2d._scheduleLayout();
}
_2d._onLoadHandler(_28);
}
});
},_onError:function(_2e,err,_2f){
this.onLoadDeferred.reject(err);
var _30=this["on"+_2e+"Error"].call(this,err);
if(_2f){
console.error(_2f,err);
}else{
if(_30){
this._setContent(_30,true);
}
}
},onLoad:function(){
},onUnload:function(){
},onDownloadStart:function(){
return this.loadingMessage;
},onContentError:function(){
},onDownloadError:function(){
return this.errorMessage;
},onDownloadEnd:function(){
}});
});
