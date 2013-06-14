//>>built
define("dijit/_KeyNavMixin",["dojo/_base/array","dojo/_base/declare","dojo/dom-attr","dojo/keys","dojo/_base/lang","dojo/on","dijit/registry","dijit/_FocusMixin"],function(_1,_2,_3,_4,_5,on,_6,_7){
return _2("dijit._KeyNavMixin",_7,{tabIndex:"0",childSelector:null,postCreate:function(){
this.inherited(arguments);
_3.set(this.domNode,"tabIndex",this.tabIndex);
if(!this._keyNavCodes){
var _8=this._keyNavCodes={};
_8[_4.HOME]=_5.hitch(this,"focusFirstChild");
_8[_4.END]=_5.hitch(this,"focusLastChild");
_8[this.isLeftToRight()?_4.LEFT_ARROW:_4.RIGHT_ARROW]=_5.hitch(this,"_onLeftArrow");
_8[this.isLeftToRight()?_4.RIGHT_ARROW:_4.LEFT_ARROW]=_5.hitch(this,"_onRightArrow");
_8[_4.UP_ARROW]=_5.hitch(this,"_onUpArrow");
_8[_4.DOWN_ARROW]=_5.hitch(this,"_onDownArrow");
}
var _9=this,_a=typeof this.childSelector=="string"?this.childSelector:_5.hitch(this,"childSelector");
this.own(on(this.domNode,"keypress",_5.hitch(this,"_onContainerKeypress")),on(this.domNode,"keydown",_5.hitch(this,"_onContainerKeydown")),on(this.domNode,"focus",_5.hitch(this,"_onContainerFocus")),on(this.containerNode,on.selector(_a,"focusin"),function(_b){
_9._onChildFocus(_6.getEnclosingWidget(this),_b);
}));
},_onLeftArrow:function(){
},_onRightArrow:function(){
},_onUpArrow:function(){
},_onDownArrow:function(){
},focus:function(){
this.focusFirstChild();
},_getFirstFocusableChild:function(){
return this._getNextFocusableChild(null,1);
},_getLastFocusableChild:function(){
return this._getNextFocusableChild(null,-1);
},focusFirstChild:function(){
this.focusChild(this._getFirstFocusableChild());
},focusLastChild:function(){
this.focusChild(this._getLastFocusableChild());
},focusChild:function(_c,_d){
if(!_c){
return;
}
if(this.focusedChild&&_c!==this.focusedChild){
this._onChildBlur(this.focusedChild);
}
_c.set("tabIndex",this.tabIndex);
_c.focus(_d?"end":"start");
},_onContainerFocus:function(_e){
if(_e.target!==this.domNode||this.focusedChild){
return;
}
this.focus();
},_onFocus:function(){
_3.set(this.domNode,"tabIndex","-1");
this.inherited(arguments);
},_onBlur:function(_f){
_3.set(this.domNode,"tabIndex",this.tabIndex);
if(this.focusedChild){
this.focusedChild.set("tabIndex","-1");
this.lastFocusedChild=this.focusedChild;
this._set("focusedChild",null);
}
this.inherited(arguments);
},_onChildFocus:function(_10){
if(_10&&_10!=this.focusedChild){
if(this.focusedChild&&!this.focusedChild._destroyed){
this.focusedChild.set("tabIndex","-1");
}
_10.set("tabIndex",this.tabIndex);
this.lastFocused=_10;
this._set("focusedChild",_10);
}
},_searchString:"",multiCharSearchDuration:1000,onKeyboardSearch:function(_11,evt,_12,_13){
if(_11){
this.focusChild(_11);
}
},_keyboardSearchCompare:function(_14,_15){
var _16=_14.domNode,_17=_14.label||(_16.focusNode?_16.focusNode.label:"")||_16.innerText||_16.textContent||"",_18=_17.replace(/^\s+/,"").substr(0,_15.length).toLowerCase();
return (!!_15.length&&_18==_15)?-1:0;
},_onContainerKeydown:function(evt){
var _19=this._keyNavCodes[evt.keyCode];
if(_19){
_19(evt,this.focusedChild);
evt.stopPropagation();
evt.preventDefault();
this._searchString="";
}else{
if(evt.keyCode==_4.SPACE&&this._searchTimer&&!(evt.ctrlKey||evt.altKey)){
evt.stopImmediatePropagation();
evt.preventDefault();
this._keyboardSearch(evt," ");
}
}
},_onContainerKeypress:function(evt){
if(evt.charCode<_4.SPACE||(evt.ctrlKey||evt.altKey)||(evt.charCode==_4.SPACE&&this._searchTimer)){
return;
}
evt.preventDefault();
evt.stopPropagation();
this._keyboardSearch(evt,String.fromCharCode(evt.charCode).toLowerCase());
},_keyboardSearch:function(evt,_1a){
var _1b=null,_1c,_1d=0,_1e=_5.hitch(this,function(){
if(this._searchTimer){
this._searchTimer.remove();
}
this._searchString+=_1a;
var _1f=/^(.)\1*$/.test(this._searchString);
var _20=_1f?1:this._searchString.length;
_1c=this._searchString.substr(0,_20);
this._searchTimer=this.defer(function(){
this._searchTimer=null;
this._searchString="";
},this.multiCharSearchDuration);
var _21=this.focusedChild||null;
if(_20==1||!_21){
_21=this._getNextFocusableChild(_21,1);
if(!_21){
return;
}
}
var _22=_21;
do{
var rc=this._keyboardSearchCompare(_21,_1c);
if(!!rc&&_1d++==0){
_1b=_21;
}
if(rc==-1){
_1d=-1;
break;
}
_21=this._getNextFocusableChild(_21,1);
}while(_21!=_22);
});
_1e();
this.onKeyboardSearch(_1b,evt,_1c,_1d);
},_onChildBlur:function(){
},_getNextFocusableChild:function(_23,dir){
var _24=_23;
do{
if(!_23){
_23=this[dir>0?"_getFirst":"_getLast"]();
if(!_23){
break;
}
}else{
_23=this._getNext(_23,dir);
}
if(_23!=null&&_23!=_24&&_23.isFocusable()){
return _23;
}
}while(_23!=_24);
return null;
},_getFirst:function(){
return null;
},_getLast:function(){
return null;
},_getNext:function(_25,dir){
if(_25){
_25=_25.domNode;
while(_25){
_25=_25[dir<0?"previousSibling":"nextSibling"];
if(_25&&"getAttribute" in _25){
var w=_6.byNode(_25);
if(w){
return w;
}
}
}
}
return null;
}});
});
