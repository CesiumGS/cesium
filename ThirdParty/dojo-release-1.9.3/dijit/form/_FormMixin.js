//>>built
define("dijit/form/_FormMixin",["dojo/_base/array","dojo/_base/declare","dojo/_base/kernel","dojo/_base/lang","dojo/on","dojo/window"],function(_1,_2,_3,_4,on,_5){
return _2("dijit.form._FormMixin",null,{state:"",_getDescendantFormWidgets:function(_6){
var _7=[];
_1.forEach(_6||this.getChildren(),function(_8){
if("value" in _8){
_7.push(_8);
}else{
_7=_7.concat(this._getDescendantFormWidgets(_8.getChildren()));
}
},this);
return _7;
},reset:function(){
_1.forEach(this._getDescendantFormWidgets(),function(_9){
if(_9.reset){
_9.reset();
}
});
},validate:function(){
var _a=false;
return _1.every(_1.map(this._getDescendantFormWidgets(),function(_b){
_b._hasBeenBlurred=true;
var _c=_b.disabled||!_b.validate||_b.validate();
if(!_c&&!_a){
_5.scrollIntoView(_b.containerNode||_b.domNode);
_b.focus();
_a=true;
}
return _c;
}),function(_d){
return _d;
});
},setValues:function(_e){
_3.deprecated(this.declaredClass+"::setValues() is deprecated. Use set('value', val) instead.","","2.0");
return this.set("value",_e);
},_setValueAttr:function(_f){
var map={};
_1.forEach(this._getDescendantFormWidgets(),function(_10){
if(!_10.name){
return;
}
var _11=map[_10.name]||(map[_10.name]=[]);
_11.push(_10);
});
for(var _12 in map){
if(!map.hasOwnProperty(_12)){
continue;
}
var _13=map[_12],_14=_4.getObject(_12,false,_f);
if(_14===undefined){
continue;
}
_14=[].concat(_14);
if(typeof _13[0].checked=="boolean"){
_1.forEach(_13,function(w){
w.set("value",_1.indexOf(_14,w._get("value"))!=-1);
});
}else{
if(_13[0].multiple){
_13[0].set("value",_14);
}else{
_1.forEach(_13,function(w,i){
w.set("value",_14[i]);
});
}
}
}
},getValues:function(){
_3.deprecated(this.declaredClass+"::getValues() is deprecated. Use get('value') instead.","","2.0");
return this.get("value");
},_getValueAttr:function(){
var obj={};
_1.forEach(this._getDescendantFormWidgets(),function(_15){
var _16=_15.name;
if(!_16||_15.disabled){
return;
}
var _17=_15.get("value");
if(typeof _15.checked=="boolean"){
if(/Radio/.test(_15.declaredClass)){
if(_17!==false){
_4.setObject(_16,_17,obj);
}else{
_17=_4.getObject(_16,false,obj);
if(_17===undefined){
_4.setObject(_16,null,obj);
}
}
}else{
var ary=_4.getObject(_16,false,obj);
if(!ary){
ary=[];
_4.setObject(_16,ary,obj);
}
if(_17!==false){
ary.push(_17);
}
}
}else{
var _18=_4.getObject(_16,false,obj);
if(typeof _18!="undefined"){
if(_4.isArray(_18)){
_18.push(_17);
}else{
_4.setObject(_16,[_18,_17],obj);
}
}else{
_4.setObject(_16,_17,obj);
}
}
});
return obj;
},isValid:function(){
return this.state=="";
},onValidStateChange:function(){
},_getState:function(){
var _19=_1.map(this._descendants,function(w){
return w.get("state")||"";
});
return _1.indexOf(_19,"Error")>=0?"Error":_1.indexOf(_19,"Incomplete")>=0?"Incomplete":"";
},disconnectChildren:function(){
},connectChildren:function(_1a){
this._descendants=this._getDescendantFormWidgets();
_1.forEach(this._descendants,function(_1b){
if(!_1b._started){
_1b.startup();
}
});
if(!_1a){
this._onChildChange();
}
},_onChildChange:function(_1c){
if(!_1c||_1c=="state"||_1c=="disabled"){
this._set("state",this._getState());
}
if(!_1c||_1c=="value"||_1c=="disabled"||_1c=="checked"){
if(this._onChangeDelayTimer){
this._onChangeDelayTimer.remove();
}
this._onChangeDelayTimer=this.defer(function(){
delete this._onChangeDelayTimer;
this._set("value",this.get("value"));
},10);
}
},startup:function(){
this.inherited(arguments);
this._descendants=this._getDescendantFormWidgets();
this.value=this.get("value");
this.state=this._getState();
var _1d=this;
this.own(on(this.containerNode,"attrmodified-state, attrmodified-disabled, attrmodified-value, attrmodified-checked",function(evt){
if(evt.target==_1d.domNode){
return;
}
_1d._onChildChange(evt.type.replace("attrmodified-",""));
}));
this.watch("state",function(_1e,_1f,_20){
this.onValidStateChange(_20=="");
});
},destroy:function(){
this.inherited(arguments);
}});
});
