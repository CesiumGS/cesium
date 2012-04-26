/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo._base.connect"]){
dojo._hasResource["dojo._base.connect"]=true;
dojo.provide("dojo._base.connect");
dojo.require("dojo._base.lang");
dojo._listener={getDispatcher:function(){
return function(){
var ap=Array.prototype,c=arguments.callee,ls=c._listeners,t=c.target,r=t&&t.apply(this,arguments),i,_1=[].concat(ls);
for(i in _1){
if(!(i in ap)){
_1[i].apply(this,arguments);
}
}
return r;
};
},add:function(_2,_3,_4){
_2=_2||dojo.global;
var f=_2[_3];
if(!f||!f._listeners){
var d=dojo._listener.getDispatcher();
d.target=f;
d._listeners=[];
f=_2[_3]=d;
}
return f._listeners.push(_4);
},remove:function(_5,_6,_7){
var f=(_5||dojo.global)[_6];
if(f&&f._listeners&&_7--){
delete f._listeners[_7];
}
}};
dojo.connect=function(_8,_9,_a,_b,_c){
var a=arguments,_d=[],i=0;
_d.push(dojo.isString(a[0])?null:a[i++],a[i++]);
var a1=a[i+1];
_d.push(dojo.isString(a1)||dojo.isFunction(a1)?a[i++]:null,a[i++]);
for(var l=a.length;i<l;i++){
_d.push(a[i]);
}
return dojo._connect.apply(this,_d);
};
dojo._connect=function(_e,_f,_10,_11){
var l=dojo._listener,h=l.add(_e,_f,dojo.hitch(_10,_11));
return [_e,_f,h,l];
};
dojo.disconnect=function(_12){
if(_12&&_12[0]!==undefined){
dojo._disconnect.apply(this,_12);
delete _12[0];
}
};
dojo._disconnect=function(obj,_13,_14,_15){
_15.remove(obj,_13,_14);
};
dojo._topics={};
dojo.subscribe=function(_16,_17,_18){
return [_16,dojo._listener.add(dojo._topics,_16,dojo.hitch(_17,_18))];
};
dojo.unsubscribe=function(_19){
if(_19){
dojo._listener.remove(dojo._topics,_19[0],_19[1]);
}
};
dojo.publish=function(_1a,_1b){
var f=dojo._topics[_1a];
if(f){
f.apply(this,_1b||[]);
}
};
dojo.connectPublisher=function(_1c,obj,_1d){
var pf=function(){
dojo.publish(_1c,arguments);
};
return _1d?dojo.connect(obj,_1d,pf):dojo.connect(obj,pf);
};
}
