/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._CssStateMixin"]){
dojo._hasResource["dijit._CssStateMixin"]=true;
dojo.provide("dijit._CssStateMixin");
dojo.declare("dijit._CssStateMixin",[],{cssStateNodes:{},hovering:false,active:false,_applyAttributes:function(){
this.inherited(arguments);
dojo.forEach(["onmouseenter","onmouseleave","onmousedown"],function(e){
this.connect(this.domNode,e,"_cssMouseEvent");
},this);
dojo.forEach(["disabled","readOnly","checked","selected","focused","state","hovering","active"],function(_1){
this.watch(_1,dojo.hitch(this,"_setStateClass"));
},this);
for(var ap in this.cssStateNodes){
this._trackMouseState(this[ap],this.cssStateNodes[ap]);
}
this._setStateClass();
},_cssMouseEvent:function(_2){
if(!this.disabled){
switch(_2.type){
case "mouseenter":
case "mouseover":
this._set("hovering",true);
this._set("active",this._mouseDown);
break;
case "mouseleave":
case "mouseout":
this._set("hovering",false);
this._set("active",false);
break;
case "mousedown":
this._set("active",true);
this._mouseDown=true;
var _3=this.connect(dojo.body(),"onmouseup",function(){
this._mouseDown=false;
this._set("active",false);
this.disconnect(_3);
});
break;
}
}
},_setStateClass:function(){
var _4=this.baseClass.split(" ");
function _5(_6){
_4=_4.concat(dojo.map(_4,function(c){
return c+_6;
}),"dijit"+_6);
};
if(!this.isLeftToRight()){
_5("Rtl");
}
if(this.checked){
_5("Checked");
}
if(this.state){
_5(this.state);
}
if(this.selected){
_5("Selected");
}
if(this.disabled){
_5("Disabled");
}else{
if(this.readOnly){
_5("ReadOnly");
}else{
if(this.active){
_5("Active");
}else{
if(this.hovering){
_5("Hover");
}
}
}
}
if(this._focused){
_5("Focused");
}
var tn=this.stateNode||this.domNode,_7={};
dojo.forEach(tn.className.split(" "),function(c){
_7[c]=true;
});
if("_stateClasses" in this){
dojo.forEach(this._stateClasses,function(c){
delete _7[c];
});
}
dojo.forEach(_4,function(c){
_7[c]=true;
});
var _8=[];
for(var c in _7){
_8.push(c);
}
tn.className=_8.join(" ");
this._stateClasses=_4;
},_trackMouseState:function(_9,_a){
var _b=false,_c=false,_d=false;
var _e=this,cn=dojo.hitch(this,"connect",_9);
function _f(){
var _10=("disabled" in _e&&_e.disabled)||("readonly" in _e&&_e.readonly);
dojo.toggleClass(_9,_a+"Hover",_b&&!_c&&!_10);
dojo.toggleClass(_9,_a+"Active",_c&&!_10);
dojo.toggleClass(_9,_a+"Focused",_d&&!_10);
};
cn("onmouseenter",function(){
_b=true;
_f();
});
cn("onmouseleave",function(){
_b=false;
_c=false;
_f();
});
cn("onmousedown",function(){
_c=true;
_f();
});
cn("onmouseup",function(){
_c=false;
_f();
});
cn("onfocus",function(){
_d=true;
_f();
});
cn("onblur",function(){
_d=false;
_f();
});
this.watch("disabled",_f);
this.watch("readOnly",_f);
}});
}
