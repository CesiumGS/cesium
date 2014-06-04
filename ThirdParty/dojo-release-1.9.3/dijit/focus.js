//>>built
define("dijit/focus",["dojo/aspect","dojo/_base/declare","dojo/dom","dojo/dom-attr","dojo/dom-class","dojo/dom-construct","dojo/Evented","dojo/_base/lang","dojo/on","dojo/domReady","dojo/sniff","dojo/Stateful","dojo/_base/window","dojo/window","./a11y","./registry","./main"],function(_1,_2,_3,_4,_5,_6,_7,_8,on,_9,_a,_b,_c,_d,_e,_f,_10){
var _11;
var _12=_2([_b,_7],{curNode:null,activeStack:[],constructor:function(){
var _13=_8.hitch(this,function(_14){
if(_3.isDescendant(this.curNode,_14)){
this.set("curNode",null);
}
if(_3.isDescendant(this.prevNode,_14)){
this.set("prevNode",null);
}
});
_1.before(_6,"empty",_13);
_1.before(_6,"destroy",_13);
},registerIframe:function(_15){
return this.registerWin(_15.contentWindow,_15);
},registerWin:function(_16,_17){
var _18=this,_19=_16.document&&_16.document.body;
if(_19){
var mdh=on(_16.document,"mousedown, touchstart",function(evt){
_18._justMouseDowned=true;
setTimeout(function(){
_18._justMouseDowned=false;
},13);
if(evt&&evt.target&&evt.target.parentNode==null){
return;
}
_18._onTouchNode(_17||evt.target,"mouse");
});
var fih=on(_19,"focusin",function(evt){
_11=(new Date()).getTime();
if(!evt.target.tagName){
return;
}
var tag=evt.target.tagName.toLowerCase();
if(tag=="#document"||tag=="body"){
return;
}
if(_e.isFocusable(evt.target)){
_18._onFocusNode(_17||evt.target);
}else{
_18._onTouchNode(_17||evt.target);
}
});
var foh=on(_19,"focusout",function(evt){
if((new Date()).getTime()<_11+100){
return;
}
_18._onBlurNode(_17||evt.target);
});
return {remove:function(){
mdh.remove();
fih.remove();
foh.remove();
mdh=fih=foh=null;
_19=null;
}};
}
},_onBlurNode:function(_1a){
if(this._clearFocusTimer){
clearTimeout(this._clearFocusTimer);
}
this._clearFocusTimer=setTimeout(_8.hitch(this,function(){
this.set("prevNode",this.curNode);
this.set("curNode",null);
}),0);
if(this._justMouseDowned){
return;
}
if(this._clearActiveWidgetsTimer){
clearTimeout(this._clearActiveWidgetsTimer);
}
this._clearActiveWidgetsTimer=setTimeout(_8.hitch(this,function(){
delete this._clearActiveWidgetsTimer;
this._setStack([]);
}),0);
},_onTouchNode:function(_1b,by){
if(this._clearActiveWidgetsTimer){
clearTimeout(this._clearActiveWidgetsTimer);
delete this._clearActiveWidgetsTimer;
}
if(_5.contains(_1b,"dijitPopup")){
_1b=_1b.firstChild;
}
var _1c=[];
try{
while(_1b){
var _1d=_4.get(_1b,"dijitPopupParent");
if(_1d){
_1b=_f.byId(_1d).domNode;
}else{
if(_1b.tagName&&_1b.tagName.toLowerCase()=="body"){
if(_1b===_c.body()){
break;
}
_1b=_d.get(_1b.ownerDocument).frameElement;
}else{
var id=_1b.getAttribute&&_1b.getAttribute("widgetId"),_1e=id&&_f.byId(id);
if(_1e&&!(by=="mouse"&&_1e.get("disabled"))){
_1c.unshift(id);
}
_1b=_1b.parentNode;
}
}
}
}
catch(e){
}
this._setStack(_1c,by);
},_onFocusNode:function(_1f){
if(!_1f){
return;
}
if(_1f.nodeType==9){
return;
}
if(this._clearFocusTimer){
clearTimeout(this._clearFocusTimer);
delete this._clearFocusTimer;
}
this._onTouchNode(_1f);
if(_1f==this.curNode){
return;
}
this.set("prevNode",this.curNode);
this.set("curNode",_1f);
},_setStack:function(_20,by){
var _21=this.activeStack,_22=_21.length-1,_23=_20.length-1;
if(_20[_23]==_21[_22]){
return;
}
this.set("activeStack",_20);
var _24,i;
for(i=_22;i>=0&&_21[i]!=_20[i];i--){
_24=_f.byId(_21[i]);
if(_24){
_24._hasBeenBlurred=true;
_24.set("focused",false);
if(_24._focusManager==this){
_24._onBlur(by);
}
this.emit("widget-blur",_24,by);
}
}
for(i++;i<=_23;i++){
_24=_f.byId(_20[i]);
if(_24){
_24.set("focused",true);
if(_24._focusManager==this){
_24._onFocus(by);
}
this.emit("widget-focus",_24,by);
}
}
},focus:function(_25){
if(_25){
try{
_25.focus();
}
catch(e){
}
}
}});
var _26=new _12();
_9(function(){
var _27=_26.registerWin(_d.get(document));
if(_a("ie")){
on(window,"unload",function(){
if(_27){
_27.remove();
_27=null;
}
});
}
});
_10.focus=function(_28){
_26.focus(_28);
};
for(var _29 in _26){
if(!/^_/.test(_29)){
_10.focus[_29]=typeof _26[_29]=="function"?_8.hitch(_26,_29):_26[_29];
}
}
_26.watch(function(_2a,_2b,_2c){
_10.focus[_2a]=_2c;
});
return _26;
});
