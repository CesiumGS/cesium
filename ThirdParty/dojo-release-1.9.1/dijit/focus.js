//>>built
define("dijit/focus",["dojo/aspect","dojo/_base/declare","dojo/dom","dojo/dom-attr","dojo/dom-construct","dojo/Evented","dojo/_base/lang","dojo/on","dojo/domReady","dojo/sniff","dojo/Stateful","dojo/_base/window","dojo/window","./a11y","./registry","./main"],function(_1,_2,_3,_4,_5,_6,_7,on,_8,_9,_a,_b,_c,_d,_e,_f){
var _10;
var _11=_2([_a,_6],{curNode:null,activeStack:[],constructor:function(){
var _12=_7.hitch(this,function(_13){
if(_3.isDescendant(this.curNode,_13)){
this.set("curNode",null);
}
if(_3.isDescendant(this.prevNode,_13)){
this.set("prevNode",null);
}
});
_1.before(_5,"empty",_12);
_1.before(_5,"destroy",_12);
},registerIframe:function(_14){
return this.registerWin(_14.contentWindow,_14);
},registerWin:function(_15,_16){
var _17=this,_18=_15.document&&_15.document.body;
if(_18){
var mdh=on(_15.document,"mousedown, touchstart",function(evt){
_17._justMouseDowned=true;
setTimeout(function(){
_17._justMouseDowned=false;
},0);
if(evt&&evt.target&&evt.target.parentNode==null){
return;
}
_17._onTouchNode(_16||evt.target,"mouse");
});
var fih=on(_18,"focusin",function(evt){
_10=(new Date()).getTime();
if(!evt.target.tagName){
return;
}
var tag=evt.target.tagName.toLowerCase();
if(tag=="#document"||tag=="body"){
return;
}
if(_d.isTabNavigable(evt.target)){
_17._onFocusNode(_16||evt.target);
}else{
_17._onTouchNode(_16||evt.target);
}
});
var foh=on(_18,"focusout",function(evt){
if((new Date()).getTime()<_10+100){
return;
}
_17._onBlurNode(_16||evt.target);
});
return {remove:function(){
mdh.remove();
fih.remove();
foh.remove();
mdh=fih=foh=null;
_18=null;
}};
}
},_onBlurNode:function(_19){
if(this._clearFocusTimer){
clearTimeout(this._clearFocusTimer);
}
this._clearFocusTimer=setTimeout(_7.hitch(this,function(){
this.set("prevNode",this.curNode);
this.set("curNode",null);
}),0);
if(this._justMouseDowned){
return;
}
if(this._clearActiveWidgetsTimer){
clearTimeout(this._clearActiveWidgetsTimer);
}
this._clearActiveWidgetsTimer=setTimeout(_7.hitch(this,function(){
delete this._clearActiveWidgetsTimer;
this._setStack([]);
}),0);
},_onTouchNode:function(_1a,by){
if(this._clearActiveWidgetsTimer){
clearTimeout(this._clearActiveWidgetsTimer);
delete this._clearActiveWidgetsTimer;
}
var _1b=[];
try{
while(_1a){
var _1c=_4.get(_1a,"dijitPopupParent");
if(_1c){
_1a=_e.byId(_1c).domNode;
}else{
if(_1a.tagName&&_1a.tagName.toLowerCase()=="body"){
if(_1a===_b.body()){
break;
}
_1a=_c.get(_1a.ownerDocument).frameElement;
}else{
var id=_1a.getAttribute&&_1a.getAttribute("widgetId"),_1d=id&&_e.byId(id);
if(_1d&&!(by=="mouse"&&_1d.get("disabled"))){
_1b.unshift(id);
}
_1a=_1a.parentNode;
}
}
}
}
catch(e){
}
this._setStack(_1b,by);
},_onFocusNode:function(_1e){
if(!_1e){
return;
}
if(_1e.nodeType==9){
return;
}
if(this._clearFocusTimer){
clearTimeout(this._clearFocusTimer);
delete this._clearFocusTimer;
}
this._onTouchNode(_1e);
if(_1e==this.curNode){
return;
}
this.set("prevNode",this.curNode);
this.set("curNode",_1e);
},_setStack:function(_1f,by){
var _20=this.activeStack,_21=_20.length-1,_22=_1f.length-1;
if(_1f[_22]==_20[_21]){
return;
}
this.set("activeStack",_1f);
var _23,i;
for(i=_21;i>=0&&_20[i]!=_1f[i];i--){
_23=_e.byId(_20[i]);
if(_23){
_23._hasBeenBlurred=true;
_23.set("focused",false);
if(_23._focusManager==this){
_23._onBlur(by);
}
this.emit("widget-blur",_23,by);
}
}
for(i++;i<=_22;i++){
_23=_e.byId(_1f[i]);
if(_23){
_23.set("focused",true);
if(_23._focusManager==this){
_23._onFocus(by);
}
this.emit("widget-focus",_23,by);
}
}
},focus:function(_24){
if(_24){
try{
_24.focus();
}
catch(e){
}
}
}});
var _25=new _11();
_8(function(){
var _26=_25.registerWin(_c.get(document));
if(_9("ie")){
on(window,"unload",function(){
if(_26){
_26.remove();
_26=null;
}
});
}
});
_f.focus=function(_27){
_25.focus(_27);
};
for(var _28 in _25){
if(!/^_/.test(_28)){
_f.focus[_28]=typeof _25[_28]=="function"?_7.hitch(_25,_28):_25[_28];
}
}
_25.watch(function(_29,_2a,_2b){
_f.focus[_29]=_2b;
});
return _25;
});
