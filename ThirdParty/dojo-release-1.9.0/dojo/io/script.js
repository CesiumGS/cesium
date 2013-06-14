/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/io/script",["../_base/connect","../_base/kernel","../_base/lang","../sniff","../_base/window","../_base/xhr","../dom","../dom-construct","../request/script","../aspect"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a){
_2.deprecated("dojo/io/script","Use dojo/request/script.","2.0");
var _b={get:function(_c){
var _d;
var _e=this._makeScriptDeferred(_c,function(_f){
_d&&_d.cancel();
});
var _10=_e.ioArgs;
_6._ioAddQueryToUrl(_10);
_6._ioNotifyStart(_e);
_d=_9.get(_10.url,{timeout:_c.timeout,jsonp:_10.jsonp,checkString:_c.checkString,ioArgs:_10,frameDoc:_c.frameDoc,canAttach:function(_11){
_10.requestId=_11.id;
_10.scriptId=_11.scriptId;
_10.canDelete=_11.canDelete;
return _b._canAttach(_10);
}},true);
_a.around(_d,"isValid",function(_12){
return function(_13){
_b._validCheck(_e);
return _12.call(this,_13);
};
});
_d.then(function(){
_e.resolve(_e);
}).otherwise(function(_14){
_e.ioArgs.error=_14;
_e.reject(_14);
});
return _e;
},attach:_9._attach,remove:_9._remove,_makeScriptDeferred:function(_15,_16){
var dfd=_6._ioSetArgs(_15,_16||this._deferredCancel,this._deferredOk,this._deferredError);
var _17=dfd.ioArgs;
_17.id=_2._scopeName+"IoScript"+(this._counter++);
_17.canDelete=false;
_17.jsonp=_15.callbackParamName||_15.jsonp;
if(_17.jsonp){
_17.query=_17.query||"";
if(_17.query.length>0){
_17.query+="&";
}
_17.query+=_17.jsonp+"="+(_15.frameDoc?"parent.":"")+_2._scopeName+".io.script.jsonp_"+_17.id+"._jsonpCallback";
_17.frameDoc=_15.frameDoc;
_17.canDelete=true;
dfd._jsonpCallback=this._jsonpCallback;
this["jsonp_"+_17.id]=dfd;
}
dfd.addBoth(function(_18){
if(_17.canDelete){
if(_18 instanceof Error){
_b["jsonp_"+_17.id]._jsonpCallback=function(){
delete _b["jsonp_"+_17.id];
if(_17.requestId){
_2.global[_9._callbacksProperty][_17.requestId]();
}
};
}else{
_b._addDeadScript(_17);
}
}
});
return dfd;
},_deferredCancel:function(dfd){
dfd.canceled=true;
},_deferredOk:function(dfd){
var _19=dfd.ioArgs;
return _19.json||_19.scriptLoaded||_19;
},_deferredError:function(_1a,dfd){
return _1a;
},_deadScripts:[],_counter:1,_addDeadScript:function(_1b){
_b._deadScripts.push({id:_1b.id,frameDoc:_1b.frameDoc});
_1b.frameDoc=null;
},_validCheck:function(dfd){
var _1c=_b._deadScripts;
if(_1c&&_1c.length>0){
for(var i=0;i<_1c.length;i++){
_b.remove(_1c[i].id,_1c[i].frameDoc);
delete _b["jsonp_"+_1c[i].id];
_1c[i].frameDoc=null;
}
_b._deadScripts=[];
}
return true;
},_ioCheck:function(dfd){
var _1d=dfd.ioArgs;
if(_1d.json||(_1d.scriptLoaded&&!_1d.args.checkString)){
return true;
}
var _1e=_1d.args.checkString;
return _1e&&eval("typeof("+_1e+") != 'undefined'");
},_resHandle:function(dfd){
if(_b._ioCheck(dfd)){
dfd.callback(dfd);
}else{
dfd.errback(new Error("inconceivable dojo.io.script._resHandle error"));
}
},_canAttach:function(){
return true;
},_jsonpCallback:function(_1f){
this.ioArgs.json=_1f;
if(this.ioArgs.requestId){
_2.global[_9._callbacksProperty][this.ioArgs.requestId](_1f);
}
}};
_3.setObject("dojo.io.script",_b);
return _b;
});
