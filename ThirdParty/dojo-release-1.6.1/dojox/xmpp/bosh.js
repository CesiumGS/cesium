/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.xmpp.bosh"]){
dojo._hasResource["dojox.xmpp.bosh"]=true;
dojo.provide("dojox.xmpp.bosh");
dojo.require("dojo.io.script");
dojo.require("dojo.io.iframe");
dojo.require("dojox.xml.parser");
dojox.xmpp.bosh={transportIframes:[],initialize:function(_1){
this.transportIframes=[];
var _2=dojox._scopeName+".xmpp.bosh";
var c=dojo.connect(dojo.getObject(_2),"_iframeOnload",this,function(_3){
if(_3==0){
_1.load();
dojo.disconnect(c);
}
});
for(var i=0;i<_1.iframes;i++){
var _4="xmpp-transport-"+i;
var _5=dojo.byId("xmpp-transport-"+i);
if(_5){
if(window[_4]){
window[_4]=null;
}
if(window.frames[_4]){
window.frames[_4]=null;
}
dojo.destroy(_5);
}
_5=dojo.io.iframe.create("xmpp-transport-"+i,_2+"._iframeOnload("+i+");");
this.transportIframes.push(_5);
}
},_iframeOnload:function(_6){
var _7=dojo.io.iframe.doc(dojo.byId("xmpp-transport-"+_6));
_7.write("<script>var isLoaded=true; var rid=0; var transmiting=false; function _BOSH_(msg) { transmiting=false; parent.dojox.xmpp.bosh.handle(msg, rid); } </script>");
},findOpenIframe:function(){
for(var i=0;i<this.transportIframes.length;i++){
var _8=this.transportIframes[i];
var _9=_8.contentWindow;
if(_9.isLoaded&&!_9.transmiting){
return _8;
}
}
return false;
},handle:function(_a,_b){
var _c=this["rid"+_b];
var _d=dojox.xml.parser.parse(_a,"text/xml");
if(_d){
_c.ioArgs.xmppMessage=_d;
}else{
_c.errback(new Error("Recieved bad document from server: "+_a));
}
},get:function(_e){
var _f=this.findOpenIframe();
var _10=dojo.io.iframe.doc(_f);
_e.frameDoc=_10;
var dfd=this._makeScriptDeferred(_e);
var _11=dfd.ioArgs;
_f.contentWindow.rid=_11.rid;
_f.contentWindow.transmiting=true;
dojo._ioAddQueryToUrl(_11);
dojo._ioNotifyStart(dfd);
dojo.io.script.attach(_11.id,_11.url,_10);
dojo._ioWatch(dfd,this._validCheck,this._ioCheck,this._resHandle);
return dfd;
},remove:function(id,_12){
dojo.destroy(dojo.byId(id,_12));
if(this[id]){
delete this[id];
}
},_makeScriptDeferred:function(_13){
var dfd=dojo._ioSetArgs(_13,this._deferredCancel,this._deferredOk,this._deferredError);
var _14=dfd.ioArgs;
_14.id="rid"+_13.rid;
_14.rid=_13.rid;
_14.canDelete=true;
_14.frameDoc=_13.frameDoc;
this[_14.id]=dfd;
return dfd;
},_deferredCancel:function(dfd){
dfd.canceled=true;
if(dfd.ioArgs.canDelete){
dojox.xmpp.bosh._addDeadScript(dfd.ioArgs);
}
},_deferredOk:function(dfd){
var _15=dfd.ioArgs;
if(_15.canDelete){
dojox.xmpp.bosh._addDeadScript(_15);
}
return _15.xmppMessage||_15;
},_deferredError:function(_16,dfd){
if(dfd.ioArgs.canDelete){
if(_16.dojoType=="timeout"){
dojox.xmpp.bosh.remove(dfd.ioArgs.id,dfd.ioArgs.frameDoc);
}else{
dojox.xmpp.bosh._addDeadScript(dfd.ioArgs);
}
}
return _16;
},_deadScripts:[],_addDeadScript:function(_17){
dojox.xmpp.bosh._deadScripts.push({id:_17.id,frameDoc:_17.frameDoc});
_17.frameDoc=null;
},_validCheck:function(dfd){
var _18=dojox.xmpp.bosh;
var _19=_18._deadScripts;
if(_19&&_19.length>0){
for(var i=0;i<_19.length;i++){
_18.remove(_19[i].id,_19[i].frameDoc);
_19[i].frameDoc=null;
}
dojox.xmpp.bosh._deadScripts=[];
}
return true;
},_ioCheck:function(dfd){
var _1a=dfd.ioArgs;
if(_1a.xmppMessage){
return true;
}
return false;
},_resHandle:function(dfd){
if(dojox.xmpp.bosh._ioCheck(dfd)){
dfd.callback(dfd);
}else{
dfd.errback(new Error("inconceivable dojox.xmpp.bosh._resHandle error"));
}
}};
}
