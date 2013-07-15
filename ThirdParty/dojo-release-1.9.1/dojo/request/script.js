/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/request/script",["module","./watch","./util","../_base/array","../_base/lang","../on","../dom","../dom-construct","../has","../_base/window"],function(_1,_2,_3,_4,_5,on,_6,_7,_8,_9){
_8.add("script-readystatechange",function(_a,_b){
var _c=_b.createElement("script");
return typeof _c["onreadystatechange"]!=="undefined"&&(typeof _a["opera"]==="undefined"||_a["opera"].toString()!=="[object Opera]");
});
var _d=_1.id.replace(/[\/\.\-]/g,"_"),_e=0,_f=_8("script-readystatechange")?"readystatechange":"load",_10=/complete|loaded/,_11=this[_d+"_callbacks"]={},_12=[];
function _13(id,url,_14){
var doc=(_14||_9.doc),_15=doc.createElement("script");
_15.type="text/javascript";
_15.src=url;
_15.id=id;
_15.async=true;
_15.charset="utf-8";
return doc.getElementsByTagName("head")[0].appendChild(_15);
};
function _16(id,_17,_18){
_7.destroy(_6.byId(id,_17));
if(_11[id]){
if(_18){
_11[id]=function(){
delete _11[id];
};
}else{
delete _11[id];
}
}
};
function _19(dfd){
var _1a=dfd.response.options,_1b=_1a.ioArgs?_1a.ioArgs.frameDoc:_1a.frameDoc;
_12.push({id:dfd.id,frameDoc:_1b});
if(_1a.ioArgs){
_1a.ioArgs.frameDoc=null;
}
_1a.frameDoc=null;
};
function _1c(dfd,_1d){
if(dfd.canDelete){
_1e._remove(dfd.id,_1d.options.frameDoc,true);
}
};
function _1f(_20){
if(_12&&_12.length){
_4.forEach(_12,function(_21){
_1e._remove(_21.id,_21.frameDoc);
_21.frameDoc=null;
});
_12=[];
}
return _20.options.jsonp?!_20.data:true;
};
function _22(_23){
return !!this.scriptLoaded;
};
function _24(_25){
var _26=_25.options.checkString;
return _26&&eval("typeof("+_26+") !== \"undefined\"");
};
function _27(_28,_29){
if(this.canDelete){
_19(this);
}
if(_29){
this.reject(_29);
}else{
this.resolve(_28);
}
};
function _1e(url,_2a,_2b){
var _2c=_3.parseArgs(url,_3.deepCopy({},_2a));
url=_2c.url;
_2a=_2c.options;
var dfd=_3.deferred(_2c,_1c,_1f,_2a.jsonp?null:(_2a.checkString?_24:_22),_27);
_5.mixin(dfd,{id:_d+(_e++),canDelete:false});
if(_2a.jsonp){
var _2d=new RegExp("[?&]"+_2a.jsonp+"=");
if(!_2d.test(url)){
url+=(~url.indexOf("?")?"&":"?")+_2a.jsonp+"="+(_2a.frameDoc?"parent.":"")+_d+"_callbacks."+dfd.id;
}
dfd.canDelete=true;
_11[dfd.id]=function(_2e){
_2c.data=_2e;
dfd.handleResponse(_2c);
};
}
if(_3.notify){
_3.notify.emit("send",_2c,dfd.promise.cancel);
}
if(!_2a.canAttach||_2a.canAttach(dfd)){
var _2f=_1e._attach(dfd.id,url,_2a.frameDoc);
if(!_2a.jsonp&&!_2a.checkString){
var _30=on(_2f,_f,function(evt){
if(evt.type==="load"||_10.test(_2f.readyState)){
_30.remove();
dfd.scriptLoaded=evt;
}
});
}
}
_2(dfd);
return _2b?dfd:dfd.promise;
};
_1e.get=_1e;
_1e._attach=_13;
_1e._remove=_16;
_1e._callbacksProperty=_d+"_callbacks";
return _1e;
});
