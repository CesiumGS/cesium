/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!window["OpenAjax"]){
OpenAjax=new function(){
var t=true;
var f=false;
var g=window;
var _1;
var _2="org.openajax.hub.";
var h={};
this.hub=h;
h.implementer="http://openajax.org";
h.implVersion="0.6";
h.specVersion="0.6";
h.implExtraData={};
var _1={};
h.libraries=_1;
h.registerLibrary=function(_3,_4,_5,_6){
_1[_3]={prefix:_3,namespaceURI:_4,version:_5,extraData:_6};
this.publish(_2+"registerLibrary",_1[_3]);
};
h.unregisterLibrary=function(_7){
this.publish(_2+"unregisterLibrary",_1[_7]);
delete _1[_7];
};
h._subscriptions={c:{},s:[]};
h._cleanup=[];
h._subIndex=0;
h._pubDepth=0;
h.subscribe=function(_8,_9,_a,_b,_c){
if(!_a){
_a=window;
}
var _d=_8+"."+this._subIndex;
var _e={scope:_a,cb:_9,fcb:_c,data:_b,sid:this._subIndex++,hdl:_d};
var _f=_8.split(".");
this._subscribe(this._subscriptions,_f,0,_e);
return _d;
};
h.publish=function(_10,_11){
var _12=_10.split(".");
this._pubDepth++;
this._publish(this._subscriptions,_12,0,_10,_11);
this._pubDepth--;
if((this._cleanup.length>0)&&(this._pubDepth==0)){
for(var i=0;i<this._cleanup.length;i++){
this.unsubscribe(this._cleanup[i].hdl);
}
delete (this._cleanup);
this._cleanup=[];
}
};
h.unsubscribe=function(sub){
var _13=sub.split(".");
var sid=_13.pop();
this._unsubscribe(this._subscriptions,_13,0,sid);
};
h._subscribe=function(_14,_15,_16,sub){
var _17=_15[_16];
if(_16==_15.length){
_14.s.push(sub);
}else{
if(typeof _14.c=="undefined"){
_14.c={};
}
if(typeof _14.c[_17]=="undefined"){
_14.c[_17]={c:{},s:[]};
this._subscribe(_14.c[_17],_15,_16+1,sub);
}else{
this._subscribe(_14.c[_17],_15,_16+1,sub);
}
}
};
h._publish=function(_18,_19,_1a,_1b,msg){
if(typeof _18!="undefined"){
var _1c;
if(_1a==_19.length){
_1c=_18;
}else{
this._publish(_18.c[_19[_1a]],_19,_1a+1,_1b,msg);
this._publish(_18.c["*"],_19,_1a+1,_1b,msg);
_1c=_18.c["**"];
}
if(typeof _1c!="undefined"){
var _1d=_1c.s;
var max=_1d.length;
for(var i=0;i<max;i++){
if(_1d[i].cb){
var sc=_1d[i].scope;
var cb=_1d[i].cb;
var fcb=_1d[i].fcb;
var d=_1d[i].data;
if(typeof cb=="string"){
cb=sc[cb];
}
if(typeof fcb=="string"){
fcb=sc[fcb];
}
if((!fcb)||(fcb.call(sc,_1b,msg,d))){
cb.call(sc,_1b,msg,d);
}
}
}
}
}
};
h._unsubscribe=function(_1e,_1f,_20,sid){
if(typeof _1e!="undefined"){
if(_20<_1f.length){
var _21=_1e.c[_1f[_20]];
this._unsubscribe(_21,_1f,_20+1,sid);
if(_21.s.length==0){
for(var x in _21.c){
return;
}
delete _1e.c[_1f[_20]];
}
return;
}else{
var _22=_1e.s;
var max=_22.length;
for(var i=0;i<max;i++){
if(sid==_22[i].sid){
if(this._pubDepth>0){
_22[i].cb=null;
this._cleanup.push(_22[i]);
}else{
_22.splice(i,1);
}
return;
}
}
}
}
};
h.reinit=function(){
for(var lib in OpenAjax.hub.libraries){
delete OpenAjax.hub.libraries[lib];
}
OpenAjax.hub.registerLibrary("OpenAjax","http://openajax.org/hub","0.6",{});
delete OpenAjax._subscriptions;
OpenAjax._subscriptions={c:{},s:[]};
delete OpenAjax._cleanup;
OpenAjax._cleanup=[];
OpenAjax._subIndex=0;
OpenAjax._pubDepth=0;
};
};
OpenAjax.hub.registerLibrary("OpenAjax","http://openajax.org/hub","0.6",{});
}
