/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.io.script"]){
dojo._hasResource["dojo.io.script"]=true;
dojo.provide("dojo.io.script");
dojo.getObject("io",true,dojo);
(function(){
var _1=dojo.isIE?"onreadystatechange":"load",_2=/complete|loaded/;
dojo.io.script={get:function(_3){
var _4=this._makeScriptDeferred(_3);
var _5=_4.ioArgs;
dojo._ioAddQueryToUrl(_5);
dojo._ioNotifyStart(_4);
if(this._canAttach(_5)){
var _6=this.attach(_5.id,_5.url,_3.frameDoc);
if(!_5.jsonp&&!_5.args.checkString){
var _7=dojo.connect(_6,_1,function(_8){
if(_8.type=="load"||_2.test(_6.readyState)){
dojo.disconnect(_7);
_5.scriptLoaded=_8;
}
});
}
}
dojo._ioWatch(_4,this._validCheck,this._ioCheck,this._resHandle);
return _4;
},attach:function(id,_9,_a){
var _b=(_a||dojo.doc);
var _c=_b.createElement("script");
_c.type="text/javascript";
_c.src=_9;
_c.id=id;
_c.charset="utf-8";
return _b.getElementsByTagName("head")[0].appendChild(_c);
},remove:function(id,_d){
dojo.destroy(dojo.byId(id,_d));
if(this["jsonp_"+id]){
delete this["jsonp_"+id];
}
},_makeScriptDeferred:function(_e){
var _f=dojo._ioSetArgs(_e,this._deferredCancel,this._deferredOk,this._deferredError);
var _10=_f.ioArgs;
_10.id=dojo._scopeName+"IoScript"+(this._counter++);
_10.canDelete=false;
_10.jsonp=_e.callbackParamName||_e.jsonp;
if(_10.jsonp){
_10.query=_10.query||"";
if(_10.query.length>0){
_10.query+="&";
}
_10.query+=_10.jsonp+"="+(_e.frameDoc?"parent.":"")+dojo._scopeName+".io.script.jsonp_"+_10.id+"._jsonpCallback";
_10.frameDoc=_e.frameDoc;
_10.canDelete=true;
_f._jsonpCallback=this._jsonpCallback;
this["jsonp_"+_10.id]=_f;
}
return _f;
},_deferredCancel:function(dfd){
dfd.canceled=true;
if(dfd.ioArgs.canDelete){
dojo.io.script._addDeadScript(dfd.ioArgs);
}
},_deferredOk:function(dfd){
var _11=dfd.ioArgs;
if(_11.canDelete){
dojo.io.script._addDeadScript(_11);
}
return _11.json||_11.scriptLoaded||_11;
},_deferredError:function(_12,dfd){
if(dfd.ioArgs.canDelete){
if(_12.dojoType=="timeout"){
dojo.io.script.remove(dfd.ioArgs.id,dfd.ioArgs.frameDoc);
}else{
dojo.io.script._addDeadScript(dfd.ioArgs);
}
}
return _12;
},_deadScripts:[],_counter:1,_addDeadScript:function(_13){
dojo.io.script._deadScripts.push({id:_13.id,frameDoc:_13.frameDoc});
_13.frameDoc=null;
},_validCheck:function(dfd){
var _14=dojo.io.script;
var _15=_14._deadScripts;
if(_15&&_15.length>0){
for(var i=0;i<_15.length;i++){
_14.remove(_15[i].id,_15[i].frameDoc);
_15[i].frameDoc=null;
}
dojo.io.script._deadScripts=[];
}
return true;
},_ioCheck:function(dfd){
var _16=dfd.ioArgs;
if(_16.json||(_16.scriptLoaded&&!_16.args.checkString)){
return true;
}
var _17=_16.args.checkString;
if(_17&&eval("typeof("+_17+") != 'undefined'")){
return true;
}
return false;
},_resHandle:function(dfd){
if(dojo.io.script._ioCheck(dfd)){
dfd.callback(dfd);
}else{
dfd.errback(new Error("inconceivable dojo.io.script._resHandle error"));
}
},_canAttach:function(_18){
return true;
},_jsonpCallback:function(_19){
this.ioArgs.json=_19;
}};
})();
}
