/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._base.typematic"]){
dojo._hasResource["dijit._base.typematic"]=true;
dojo.provide("dijit._base.typematic");
dijit.typematic={_fireEventAndReload:function(){
this._timer=null;
this._callback(++this._count,this._node,this._evt);
this._currentTimeout=Math.max(this._currentTimeout<0?this._initialDelay:(this._subsequentDelay>1?this._subsequentDelay:Math.round(this._currentTimeout*this._subsequentDelay)),this._minDelay);
this._timer=setTimeout(dojo.hitch(this,"_fireEventAndReload"),this._currentTimeout);
},trigger:function(_1,_2,_3,_4,_5,_6,_7,_8){
if(_5!=this._obj){
this.stop();
this._initialDelay=_7||500;
this._subsequentDelay=_6||0.9;
this._minDelay=_8||10;
this._obj=_5;
this._evt=_1;
this._node=_3;
this._currentTimeout=-1;
this._count=-1;
this._callback=dojo.hitch(_2,_4);
this._fireEventAndReload();
this._evt=dojo.mixin({faux:true},_1);
}
},stop:function(){
if(this._timer){
clearTimeout(this._timer);
this._timer=null;
}
if(this._obj){
this._callback(-1,this._node,this._evt);
this._obj=null;
}
},addKeyListener:function(_9,_a,_b,_c,_d,_e,_f){
if(_a.keyCode){
_a.charOrCode=_a.keyCode;
dojo.deprecated("keyCode attribute parameter for dijit.typematic.addKeyListener is deprecated. Use charOrCode instead.","","2.0");
}else{
if(_a.charCode){
_a.charOrCode=String.fromCharCode(_a.charCode);
dojo.deprecated("charCode attribute parameter for dijit.typematic.addKeyListener is deprecated. Use charOrCode instead.","","2.0");
}
}
return [dojo.connect(_9,"onkeypress",this,function(evt){
if(evt.charOrCode==_a.charOrCode&&(_a.ctrlKey===undefined||_a.ctrlKey==evt.ctrlKey)&&(_a.altKey===undefined||_a.altKey==evt.altKey)&&(_a.metaKey===undefined||_a.metaKey==(evt.metaKey||false))&&(_a.shiftKey===undefined||_a.shiftKey==evt.shiftKey)){
dojo.stopEvent(evt);
dijit.typematic.trigger(evt,_b,_9,_c,_a,_d,_e,_f);
}else{
if(dijit.typematic._obj==_a){
dijit.typematic.stop();
}
}
}),dojo.connect(_9,"onkeyup",this,function(evt){
if(dijit.typematic._obj==_a){
dijit.typematic.stop();
}
})];
},addMouseListener:function(_10,_11,_12,_13,_14,_15){
var dc=dojo.connect;
return [dc(_10,"mousedown",this,function(evt){
dojo.stopEvent(evt);
dijit.typematic.trigger(evt,_11,_10,_12,_10,_13,_14,_15);
}),dc(_10,"mouseup",this,function(evt){
dojo.stopEvent(evt);
dijit.typematic.stop();
}),dc(_10,"mouseout",this,function(evt){
dojo.stopEvent(evt);
dijit.typematic.stop();
}),dc(_10,"mousemove",this,function(evt){
evt.preventDefault();
}),dc(_10,"dblclick",this,function(evt){
dojo.stopEvent(evt);
if(dojo.isIE){
dijit.typematic.trigger(evt,_11,_10,_12,_10,_13,_14,_15);
setTimeout(dojo.hitch(this,dijit.typematic.stop),50);
}
})];
},addListener:function(_16,_17,_18,_19,_1a,_1b,_1c,_1d){
return this.addKeyListener(_17,_18,_19,_1a,_1b,_1c,_1d).concat(this.addMouseListener(_16,_19,_1a,_1b,_1c,_1d));
}};
}
