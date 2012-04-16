/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.form._FormMixin"]){
dojo._hasResource["dijit.form._FormMixin"]=true;
dojo.provide("dijit.form._FormMixin");
dojo.require("dojo.window");
dojo.declare("dijit.form._FormMixin",null,{state:"",reset:function(){
dojo.forEach(this.getDescendants(),function(_1){
if(_1.reset){
_1.reset();
}
});
},validate:function(){
var _2=false;
return dojo.every(dojo.map(this.getDescendants(),function(_3){
_3._hasBeenBlurred=true;
var _4=_3.disabled||!_3.validate||_3.validate();
if(!_4&&!_2){
dojo.window.scrollIntoView(_3.containerNode||_3.domNode);
_3.focus();
_2=true;
}
return _4;
}),function(_5){
return _5;
});
},setValues:function(_6){
dojo.deprecated(this.declaredClass+"::setValues() is deprecated. Use set('value', val) instead.","","2.0");
return this.set("value",_6);
},_setValueAttr:function(_7){
var _8={};
dojo.forEach(this.getDescendants(),function(_9){
if(!_9.name){
return;
}
var _a=_8[_9.name]||(_8[_9.name]=[]);
_a.push(_9);
});
for(var _b in _8){
if(!_8.hasOwnProperty(_b)){
continue;
}
var _c=_8[_b],_d=dojo.getObject(_b,false,_7);
if(_d===undefined){
continue;
}
if(!dojo.isArray(_d)){
_d=[_d];
}
if(typeof _c[0].checked=="boolean"){
dojo.forEach(_c,function(w,i){
w.set("value",dojo.indexOf(_d,w.value)!=-1);
});
}else{
if(_c[0].multiple){
_c[0].set("value",_d);
}else{
dojo.forEach(_c,function(w,i){
w.set("value",_d[i]);
});
}
}
}
},getValues:function(){
dojo.deprecated(this.declaredClass+"::getValues() is deprecated. Use get('value') instead.","","2.0");
return this.get("value");
},_getValueAttr:function(){
var _e={};
dojo.forEach(this.getDescendants(),function(_f){
var _10=_f.name;
if(!_10||_f.disabled){
return;
}
var _11=_f.get("value");
if(typeof _f.checked=="boolean"){
if(/Radio/.test(_f.declaredClass)){
if(_11!==false){
dojo.setObject(_10,_11,_e);
}else{
_11=dojo.getObject(_10,false,_e);
if(_11===undefined){
dojo.setObject(_10,null,_e);
}
}
}else{
var ary=dojo.getObject(_10,false,_e);
if(!ary){
ary=[];
dojo.setObject(_10,ary,_e);
}
if(_11!==false){
ary.push(_11);
}
}
}else{
var _12=dojo.getObject(_10,false,_e);
if(typeof _12!="undefined"){
if(dojo.isArray(_12)){
_12.push(_11);
}else{
dojo.setObject(_10,[_12,_11],_e);
}
}else{
dojo.setObject(_10,_11,_e);
}
}
});
return _e;
},isValid:function(){
return this.state=="";
},onValidStateChange:function(_13){
},_getState:function(){
var _14=dojo.map(this._descendants,function(w){
return w.get("state")||"";
});
return dojo.indexOf(_14,"Error")>=0?"Error":dojo.indexOf(_14,"Incomplete")>=0?"Incomplete":"";
},disconnectChildren:function(){
dojo.forEach(this._childConnections||[],dojo.hitch(this,"disconnect"));
dojo.forEach(this._childWatches||[],function(w){
w.unwatch();
});
},connectChildren:function(_15){
var _16=this;
this.disconnectChildren();
this._descendants=this.getDescendants();
var set=_15?function(_17,val){
_16[_17]=val;
}:dojo.hitch(this,"_set");
set("value",this.get("value"));
set("state",this._getState());
var _18=(this._childConnections=[]),_19=(this._childWatches=[]);
dojo.forEach(dojo.filter(this._descendants,function(_1a){
return _1a.validate;
}),function(_1b){
dojo.forEach(["state","disabled"],function(_1c){
_19.push(_1b.watch(_1c,function(_1d,_1e,_1f){
_16.set("state",_16._getState());
}));
});
});
var _20=function(){
if(_16._onChangeDelayTimer){
clearTimeout(_16._onChangeDelayTimer);
}
_16._onChangeDelayTimer=setTimeout(function(){
delete _16._onChangeDelayTimer;
_16._set("value",_16.get("value"));
},10);
};
dojo.forEach(dojo.filter(this._descendants,function(_21){
return _21.onChange;
}),function(_22){
_18.push(_16.connect(_22,"onChange",_20));
_19.push(_22.watch("disabled",_20));
});
},startup:function(){
this.inherited(arguments);
this.connectChildren(true);
this.watch("state",function(_23,_24,_25){
this.onValidStateChange(_25=="");
});
},destroy:function(){
this.disconnectChildren();
this.inherited(arguments);
}});
}
