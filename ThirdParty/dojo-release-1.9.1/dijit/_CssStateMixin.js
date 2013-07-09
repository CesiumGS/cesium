//>>built
define("dijit/_CssStateMixin",["dojo/_base/array","dojo/_base/declare","dojo/dom","dojo/dom-class","dojo/has","dojo/_base/lang","dojo/on","dojo/domReady","dojo/touch","dojo/_base/window","./a11yclick","./registry"],function(_1,_2,_3,_4,_5,_6,on,_7,_8,_9,_a,_b){
var _c=_2("dijit._CssStateMixin",[],{hovering:false,active:false,_applyAttributes:function(){
this.inherited(arguments);
_1.forEach(["disabled","readOnly","checked","selected","focused","state","hovering","active","_opened"],function(_d){
this.watch(_d,_6.hitch(this,"_setStateClass"));
},this);
for(var ap in this.cssStateNodes||{}){
this._trackMouseState(this[ap],this.cssStateNodes[ap]);
}
this._trackMouseState(this.domNode,this.baseClass);
this._setStateClass();
},_cssMouseEvent:function(_e){
if(!this.disabled){
switch(_e.type){
case "mouseover":
case "MSPointerOver":
this._set("hovering",true);
this._set("active",this._mouseDown);
break;
case "mouseout":
case "MSPointerOut":
this._set("hovering",false);
this._set("active",false);
break;
case "mousedown":
case "touchstart":
case "MSPointerDown":
case "keydown":
this._set("active",true);
break;
case "mouseup":
case "dojotouchend":
case "keyup":
this._set("active",false);
break;
}
}
},_setStateClass:function(){
var _f=this.baseClass.split(" ");
function _10(_11){
_f=_f.concat(_1.map(_f,function(c){
return c+_11;
}),"dijit"+_11);
};
if(!this.isLeftToRight()){
_10("Rtl");
}
var _12=this.checked=="mixed"?"Mixed":(this.checked?"Checked":"");
if(this.checked){
_10(_12);
}
if(this.state){
_10(this.state);
}
if(this.selected){
_10("Selected");
}
if(this._opened){
_10("Opened");
}
if(this.disabled){
_10("Disabled");
}else{
if(this.readOnly){
_10("ReadOnly");
}else{
if(this.active){
_10("Active");
}else{
if(this.hovering){
_10("Hover");
}
}
}
}
if(this.focused){
_10("Focused");
}
var tn=this.stateNode||this.domNode,_13={};
_1.forEach(tn.className.split(" "),function(c){
_13[c]=true;
});
if("_stateClasses" in this){
_1.forEach(this._stateClasses,function(c){
delete _13[c];
});
}
_1.forEach(_f,function(c){
_13[c]=true;
});
var _14=[];
for(var c in _13){
_14.push(c);
}
tn.className=_14.join(" ");
this._stateClasses=_f;
},_subnodeCssMouseEvent:function(_15,_16,evt){
if(this.disabled||this.readOnly){
return;
}
function _17(_18){
_4.toggle(_15,_16+"Hover",_18);
};
function _19(_1a){
_4.toggle(_15,_16+"Active",_1a);
};
function _1b(_1c){
_4.toggle(_15,_16+"Focused",_1c);
};
switch(evt.type){
case "mouseover":
case "MSPointerOver":
_17(true);
break;
case "mouseout":
case "MSPointerOut":
_17(false);
_19(false);
break;
case "mousedown":
case "touchstart":
case "MSPointerDown":
case "keydown":
_19(true);
break;
case "mouseup":
case "MSPointerUp":
case "dojotouchend":
case "keyup":
_19(false);
break;
case "focus":
case "focusin":
_1b(true);
break;
case "blur":
case "focusout":
_1b(false);
break;
}
},_trackMouseState:function(_1d,_1e){
_1d._cssState=_1e;
}});
_7(function(){
function _1f(evt,_20,_21){
if(_21&&_3.isDescendant(_21,_20)){
return;
}
for(var _22=_20;_22&&_22!=_21;_22=_22.parentNode){
if(_22._cssState){
var _23=_b.getEnclosingWidget(_22);
if(_23){
if(_22==_23.domNode){
_23._cssMouseEvent(evt);
}else{
_23._subnodeCssMouseEvent(_22,_22._cssState,evt);
}
}
}
}
};
var _24=_9.body(),_25;
on(_24,_8.over,function(evt){
_1f(evt,evt.target,evt.relatedTarget);
});
on(_24,_8.out,function(evt){
_1f(evt,evt.target,evt.relatedTarget);
});
on(_24,_a.press,function(evt){
_25=evt.target;
_1f(evt,_25);
});
on(_24,_a.release,function(evt){
_1f(evt,_25);
_25=null;
});
on(_24,"focusin, focusout",function(evt){
var _26=evt.target;
if(_26._cssState&&!_26.getAttribute("widgetId")){
var _27=_b.getEnclosingWidget(_26);
if(_27){
_27._subnodeCssMouseEvent(_26,_26._cssState,evt);
}
}
});
});
return _c;
});
