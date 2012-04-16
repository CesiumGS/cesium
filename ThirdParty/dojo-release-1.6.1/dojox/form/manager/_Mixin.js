/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form.manager._Mixin"]){
dojo._hasResource["dojox.form.manager._Mixin"]=true;
dojo.provide("dojox.form.manager._Mixin");
dojo.require("dijit._Widget");
(function(){
var fm=dojox.form.manager,aa=fm.actionAdapter=function(_1){
return function(_2,_3,_4){
if(dojo.isArray(_3)){
dojo.forEach(_3,function(_5){
_1.call(this,_2,_5,_4);
},this);
}else{
_1.apply(this,arguments);
}
};
},ia=fm.inspectorAdapter=function(_6){
return function(_7,_8,_9){
return _6.call(this,_7,dojo.isArray(_8)?_8[0]:_8,_9);
};
},_a={domNode:1,containerNode:1,srcNodeRef:1,bgIframe:1},_b=fm._keys=function(o){
var _c=[],_d;
for(_d in o){
if(o.hasOwnProperty(_d)){
_c.push(_d);
}
}
return _c;
},_e=function(_f){
var _10=_f.get("name");
if(_10&&_f instanceof dijit.form._FormWidget){
if(_10 in this.formWidgets){
var a=this.formWidgets[_10].widget;
if(dojo.isArray(a)){
a.push(_f);
}else{
this.formWidgets[_10].widget=[a,_f];
}
}else{
this.formWidgets[_10]={widget:_f,connections:[]};
}
}else{
_10=null;
}
return _10;
},_11=function(_12){
var _13={};
aa(function(_14,w){
var o=w.get("observer");
if(o&&typeof o=="string"){
dojo.forEach(o.split(","),function(o){
o=dojo.trim(o);
if(o&&dojo.isFunction(this[o])){
_13[o]=1;
}
},this);
}
}).call(this,null,this.formWidgets[_12].widget);
return _b(_13);
},_15=function(_16,_17){
var t=this.formWidgets[_16],w=t.widget,c=t.connections;
if(c.length){
dojo.forEach(c,dojo.disconnect);
c=t.connections=[];
}
if(dojo.isArray(w)){
dojo.forEach(w,function(w){
dojo.forEach(_17,function(o){
c.push(dojo.connect(w,"onChange",this,function(evt){
if(this.watching&&dojo.attr(w.focusNode,"checked")){
this[o](w.get("value"),_16,w,evt);
}
}));
},this);
},this);
}else{
var _18=w.declaredClass=="dijit.form.Button"?"onClick":"onChange";
dojo.forEach(_17,function(o){
c.push(dojo.connect(w,_18,this,function(evt){
if(this.watching){
this[o](w.get("value"),_16,w,evt);
}
}));
},this);
}
};
dojo.declare("dojox.form.manager._Mixin",null,{watching:true,startup:function(){
if(this._started){
return;
}
this.formWidgets={};
this.formNodes={};
this.registerWidgetDescendants(this);
this.inherited(arguments);
},destroy:function(){
for(var _19 in this.formWidgets){
dojo.forEach(this.formWidgets[_19].connections,dojo.disconnect);
}
this.formWidgets={};
this.inherited(arguments);
},registerWidget:function(_1a){
if(typeof _1a=="string"){
_1a=dijit.byId(_1a);
}else{
if(_1a.tagName&&_1a.cloneNode){
_1a=dijit.byNode(_1a);
}
}
var _1b=_e.call(this,_1a);
if(_1b){
_15.call(this,_1b,_11.call(this,_1b));
}
return this;
},unregisterWidget:function(_1c){
if(_1c in this.formWidgets){
dojo.forEach(this.formWidgets[_1c].connections,this.disconnect,this);
delete this.formWidgets[_1c];
}
return this;
},registerWidgetDescendants:function(_1d){
if(typeof _1d=="string"){
_1d=dijit.byId(_1d);
}else{
if(_1d.tagName&&_1d.cloneNode){
_1d=dijit.byNode(_1d);
}
}
var _1e=dojo.map(_1d.getDescendants(),_e,this);
dojo.forEach(_1e,function(_1f){
if(_1f){
_15.call(this,_1f,_11.call(this,_1f));
}
},this);
return this.registerNodeDescendants?this.registerNodeDescendants(_1d.domNode):this;
},unregisterWidgetDescendants:function(_20){
if(typeof _20=="string"){
_20=dijit.byId(_20);
}else{
if(_20.tagName&&_20.cloneNode){
_20=dijit.byNode(_20);
}
}
dojo.forEach(dojo.map(_20.getDescendants(),function(w){
return w instanceof dijit.form._FormWidget&&w.get("name")||null;
}),function(_21){
if(_21){
this.unregisterNode(_21);
}
},this);
return this.unregisterNodeDescendants?this.unregisterNodeDescendants(_20.domNode):this;
},formWidgetValue:function(_22,_23){
var _24=arguments.length==2&&_23!==undefined,_25;
if(typeof _22=="string"){
_22=this.formWidgets[_22];
if(_22){
_22=_22.widget;
}
}
if(!_22){
return null;
}
if(dojo.isArray(_22)){
if(_24){
dojo.forEach(_22,function(_26){
_26.set("checked",false,!this.watching);
});
dojo.forEach(_22,function(_27){
_27.set("checked",_27.value===_23,!this.watching);
});
return this;
}
dojo.some(_22,function(_28){
if(dojo.attr(_28.focusNode,"checked")){
_25=_28;
return true;
}
return false;
});
return _25?_25.get("value"):"";
}
if(_22.declaredClass=="dijit.form.CheckBox"){
if(_24){
_22.set("value",Boolean(_23),!this.watching);
return this;
}
return Boolean(_22.get("value"));
}
if(_24){
_22.set("value",_23,!this.watching);
return this;
}
return _22.get("value");
},formPointValue:function(_29,_2a){
if(_29&&typeof _29=="string"){
_29=this[_29];
}
if(!_29||!_29.tagName||!_29.cloneNode){
return null;
}
if(!dojo.hasClass(_29,"dojoFormValue")){
return null;
}
if(arguments.length==2&&_2a!==undefined){
_29.innerHTML=_2a;
return this;
}
return _29.innerHTML;
},inspectFormWidgets:function(_2b,_2c,_2d){
var _2e,_2f={};
if(_2c){
if(dojo.isArray(_2c)){
dojo.forEach(_2c,function(_30){
if(_30 in this.formWidgets){
_2f[_30]=_2b.call(this,_30,this.formWidgets[_30].widget,_2d);
}
},this);
}else{
for(_2e in _2c){
if(_2e in this.formWidgets){
_2f[_2e]=_2b.call(this,_2e,this.formWidgets[_2e].widget,_2c[_2e]);
}
}
}
}else{
for(_2e in this.formWidgets){
_2f[_2e]=_2b.call(this,_2e,this.formWidgets[_2e].widget,_2d);
}
}
return _2f;
},inspectAttachedPoints:function(_31,_32,_33){
var _34,_35={};
if(_32){
if(dojo.isArray(_32)){
dojo.forEach(_32,function(_36){
var _37=this[_36];
if(_37&&_37.tagName&&_37.cloneNode){
_35[_36]=_31.call(this,_36,_37,_33);
}
},this);
}else{
for(_34 in _32){
var _38=this[_34];
if(_38&&_38.tagName&&_38.cloneNode){
_35[_34]=_31.call(this,_34,_38,_32[_34]);
}
}
}
}else{
for(_34 in this){
if(!(_34 in _a)){
var _38=this[_34];
if(_38&&_38.tagName&&_38.cloneNode){
_35[_34]=_31.call(this,_34,_38,_33);
}
}
}
}
return _35;
},inspect:function(_39,_3a,_3b){
var _3c=this.inspectFormWidgets(function(_3d,_3e,_3f){
if(dojo.isArray(_3e)){
return _39.call(this,_3d,dojo.map(_3e,function(w){
return w.domNode;
}),_3f);
}
return _39.call(this,_3d,_3e.domNode,_3f);
},_3a,_3b);
if(this.inspectFormNodes){
dojo.mixin(_3c,this.inspectFormNodes(_39,_3a,_3b));
}
return dojo.mixin(_3c,this.inspectAttachedPoints(_39,_3a,_3b));
}});
})();
dojo.extend(dijit._Widget,{observer:""});
}
