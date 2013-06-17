//>>built
define("dijit/typematic",["dojo/_base/array","dojo/_base/connect","dojo/_base/lang","dojo/on","dojo/sniff","./main"],function(_1,_2,_3,on,_4,_5){
var _6=(_5.typematic={_fireEventAndReload:function(){
this._timer=null;
this._callback(++this._count,this._node,this._evt);
this._currentTimeout=Math.max(this._currentTimeout<0?this._initialDelay:(this._subsequentDelay>1?this._subsequentDelay:Math.round(this._currentTimeout*this._subsequentDelay)),this._minDelay);
this._timer=setTimeout(_3.hitch(this,"_fireEventAndReload"),this._currentTimeout);
},trigger:function(_7,_8,_9,_a,_b,_c,_d,_e){
if(_b!=this._obj){
this.stop();
this._initialDelay=_d||500;
this._subsequentDelay=_c||0.9;
this._minDelay=_e||10;
this._obj=_b;
this._node=_9;
this._currentTimeout=-1;
this._count=-1;
this._callback=_3.hitch(_8,_a);
this._evt={faux:true};
for(var _f in _7){
if(_f!="layerX"&&_f!="layerY"){
var v=_7[_f];
if(typeof v!="function"&&typeof v!="undefined"){
this._evt[_f]=v;
}
}
}
this._fireEventAndReload();
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
},addKeyListener:function(_10,_11,_12,_13,_14,_15,_16){
var _17="keyCode" in _11?"keydown":"charCode" in _11?"keypress":_2._keypress,_18="keyCode" in _11?"keyCode":"charCode" in _11?"charCode":"charOrCode";
var _19=[on(_10,_17,_3.hitch(this,function(evt){
if(evt[_18]==_11[_18]&&(_11.ctrlKey===undefined||_11.ctrlKey==evt.ctrlKey)&&(_11.altKey===undefined||_11.altKey==evt.altKey)&&(_11.metaKey===undefined||_11.metaKey==(evt.metaKey||false))&&(_11.shiftKey===undefined||_11.shiftKey==evt.shiftKey)){
evt.stopPropagation();
evt.preventDefault();
_6.trigger(evt,_12,_10,_13,_11,_14,_15,_16);
}else{
if(_6._obj==_11){
_6.stop();
}
}
})),on(_10,"keyup",_3.hitch(this,function(){
if(_6._obj==_11){
_6.stop();
}
}))];
return {remove:function(){
_1.forEach(_19,function(h){
h.remove();
});
}};
},addMouseListener:function(_1a,_1b,_1c,_1d,_1e,_1f){
var _20=[on(_1a,"mousedown",_3.hitch(this,function(evt){
evt.preventDefault();
_6.trigger(evt,_1b,_1a,_1c,_1a,_1d,_1e,_1f);
})),on(_1a,"mouseup",_3.hitch(this,function(evt){
if(this._obj){
evt.preventDefault();
}
_6.stop();
})),on(_1a,"mouseout",_3.hitch(this,function(evt){
if(this._obj){
evt.preventDefault();
}
_6.stop();
})),on(_1a,"dblclick",_3.hitch(this,function(evt){
evt.preventDefault();
if(_4("ie")<9){
_6.trigger(evt,_1b,_1a,_1c,_1a,_1d,_1e,_1f);
setTimeout(_3.hitch(this,_6.stop),50);
}
}))];
return {remove:function(){
_1.forEach(_20,function(h){
h.remove();
});
}};
},addListener:function(_21,_22,_23,_24,_25,_26,_27,_28){
var _29=[this.addKeyListener(_22,_23,_24,_25,_26,_27,_28),this.addMouseListener(_21,_24,_25,_26,_27,_28)];
return {remove:function(){
_1.forEach(_29,function(h){
h.remove();
});
}};
}});
return _6;
});
