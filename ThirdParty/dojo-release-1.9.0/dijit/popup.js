//>>built
define("dijit/popup",["dojo/_base/array","dojo/aspect","dojo/_base/declare","dojo/dom","dojo/dom-attr","dojo/dom-construct","dojo/dom-geometry","dojo/dom-style","dojo/has","dojo/keys","dojo/_base/lang","dojo/on","./place","./BackgroundIframe","./Viewport","./main"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b,on,_c,_d,_e,_f){
function _10(){
if(this._popupWrapper){
_6.destroy(this._popupWrapper);
delete this._popupWrapper;
}
};
var _11=_3(null,{_stack:[],_beginZIndex:1000,_idGen:1,_repositionAll:function(){
if(this._firstAroundNode){
var _12=this._firstAroundPosition,_13=_7.position(this._firstAroundNode,true),dx=_13.x-_12.x,dy=_13.y-_12.y;
if(dx||dy){
this._firstAroundPosition=_13;
for(var i=0;i<this._stack.length;i++){
var _14=this._stack[i].wrapper.style;
_14.top=(parseInt(_14.top,10)+dy)+"px";
if(_14.right=="auto"){
_14.left=(parseInt(_14.left,10)+dx)+"px";
}else{
_14.right=(parseInt(_14.right,10)-dx)+"px";
}
}
}
this._aroundMoveListener=setTimeout(_b.hitch(this,"_repositionAll"),dx||dy?10:50);
}
},_createWrapper:function(_15){
var _16=_15._popupWrapper,_17=_15.domNode;
if(!_16){
_16=_6.create("div",{"class":"dijitPopup",style:{display:"none"},role:"region","aria-label":_15["aria-label"]||_15.label||_15.name||_15.id},_15.ownerDocumentBody);
_16.appendChild(_17);
var s=_17.style;
s.display="";
s.visibility="";
s.position="";
s.top="0px";
_15._popupWrapper=_16;
_2.after(_15,"destroy",_10,true);
}
return _16;
},moveOffScreen:function(_18){
var _19=this._createWrapper(_18);
var ltr=_7.isBodyLtr(_18.ownerDocument),_1a={visibility:"hidden",top:"-9999px",display:""};
_1a[ltr?"left":"right"]="-9999px";
_1a[ltr?"right":"left"]="auto";
_8.set(_19,_1a);
return _19;
},hide:function(_1b){
var _1c=this._createWrapper(_1b);
_8.set(_1c,{display:"none",height:"auto",overflow:"visible",border:""});
var _1d=_1b.domNode;
if("_originalStyle" in _1d){
_1d.style.cssText=_1d._originalStyle;
}
},getTopPopup:function(){
var _1e=this._stack;
for(var pi=_1e.length-1;pi>0&&_1e[pi].parent===_1e[pi-1].widget;pi--){
}
return _1e[pi];
},open:function(_1f){
var _20=this._stack,_21=_1f.popup,_22=_21.domNode,_23=_1f.orient||["below","below-alt","above","above-alt"],ltr=_1f.parent?_1f.parent.isLeftToRight():_7.isBodyLtr(_21.ownerDocument),_24=_1f.around,id=(_1f.around&&_1f.around.id)?(_1f.around.id+"_dropdown"):("popup_"+this._idGen++);
while(_20.length&&(!_1f.parent||!_4.isDescendant(_1f.parent.domNode,_20[_20.length-1].widget.domNode))){
this.close(_20[_20.length-1].widget);
}
var _25=this.moveOffScreen(_21);
if(_21.startup&&!_21._started){
_21.startup();
}
var _26,_27=_7.position(_22);
if("maxHeight" in _1f&&_1f.maxHeight!=-1){
_26=_1f.maxHeight||Infinity;
}else{
var _28=_e.getEffectiveBox(this.ownerDocument),_29=_24?_7.position(_24,false):{y:_1f.y-(_1f.padding||0),h:(_1f.padding||0)*2};
_26=Math.floor(Math.max(_29.y,_28.h-(_29.y+_29.h)));
}
if(_27.h>_26){
var cs=_8.getComputedStyle(_22),_2a=cs.borderLeftWidth+" "+cs.borderLeftStyle+" "+cs.borderLeftColor;
_8.set(_25,{overflowY:"scroll",height:_26+"px",border:_2a});
_22._originalStyle=_22.style.cssText;
_22.style.border="none";
}
_5.set(_25,{id:id,style:{zIndex:this._beginZIndex+_20.length},"class":"dijitPopup "+(_21.baseClass||_21["class"]||"").split(" ")[0]+"Popup",dijitPopupParent:_1f.parent?_1f.parent.id:""});
if(_20.length==0&&_24){
this._firstAroundNode=_24;
this._firstAroundPosition=_7.position(_24,true);
this._aroundMoveListener=setTimeout(_b.hitch(this,"_repositionAll"),50);
}
if(_9("config-bgIframe")&&!_21.bgIframe){
_21.bgIframe=new _d(_25);
}
var _2b=_21.orient?_b.hitch(_21,"orient"):null,_2c=_24?_c.around(_25,_24,_23,ltr,_2b):_c.at(_25,_1f,_23=="R"?["TR","BR","TL","BL"]:["TL","BL","TR","BR"],_1f.padding,_2b);
_25.style.visibility="visible";
_22.style.visibility="visible";
var _2d=[];
_2d.push(on(_25,"keydown",_b.hitch(this,function(evt){
if(evt.keyCode==_a.ESCAPE&&_1f.onCancel){
evt.stopPropagation();
evt.preventDefault();
_1f.onCancel();
}else{
if(evt.keyCode==_a.TAB){
evt.stopPropagation();
evt.preventDefault();
var _2e=this.getTopPopup();
if(_2e&&_2e.onCancel){
_2e.onCancel();
}
}
}
})));
if(_21.onCancel&&_1f.onCancel){
_2d.push(_21.on("cancel",_1f.onCancel));
}
_2d.push(_21.on(_21.onExecute?"execute":"change",_b.hitch(this,function(){
var _2f=this.getTopPopup();
if(_2f&&_2f.onExecute){
_2f.onExecute();
}
})));
_20.push({widget:_21,wrapper:_25,parent:_1f.parent,onExecute:_1f.onExecute,onCancel:_1f.onCancel,onClose:_1f.onClose,handlers:_2d});
if(_21.onOpen){
_21.onOpen(_2c);
}
return _2c;
},close:function(_30){
var _31=this._stack;
while((_30&&_1.some(_31,function(_32){
return _32.widget==_30;
}))||(!_30&&_31.length)){
var top=_31.pop(),_33=top.widget,_34=top.onClose;
if(_33.onClose){
_33.onClose();
}
var h;
while(h=top.handlers.pop()){
h.remove();
}
if(_33&&_33.domNode){
this.hide(_33);
}
if(_34){
_34();
}
}
if(_31.length==0&&this._aroundMoveListener){
clearTimeout(this._aroundMoveListener);
this._firstAroundNode=this._firstAroundPosition=this._aroundMoveListener=null;
}
}});
return (_f.popup=new _11());
});
