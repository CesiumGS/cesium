//>>built
define("dijit/Menu",["require","dojo/_base/array","dojo/_base/declare","dojo/dom","dojo/dom-attr","dojo/dom-geometry","dojo/dom-style","dojo/keys","dojo/_base/lang","dojo/on","dojo/sniff","dojo/_base/window","dojo/window","./popup","./DropDownMenu","dojo/ready"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,on,_a,_b,_c,pm,_d,_e){
if(_a("dijit-legacy-requires")){
_e(0,function(){
var _f=["dijit/MenuItem","dijit/PopupMenuItem","dijit/CheckedMenuItem","dijit/MenuSeparator"];
_1(_f);
});
}
return _3("dijit.Menu",_d,{constructor:function(){
this._bindings=[];
},targetNodeIds:[],selector:"",contextMenuForWindow:false,leftClickToOpen:false,refocus:true,postCreate:function(){
if(this.contextMenuForWindow){
this.bindDomNode(this.ownerDocumentBody);
}else{
_2.forEach(this.targetNodeIds,this.bindDomNode,this);
}
this.inherited(arguments);
},_iframeContentWindow:function(_10){
return _c.get(this._iframeContentDocument(_10))||this._iframeContentDocument(_10)["__parent__"]||(_10.name&&document.frames[_10.name])||null;
},_iframeContentDocument:function(_11){
return _11.contentDocument||(_11.contentWindow&&_11.contentWindow.document)||(_11.name&&document.frames[_11.name]&&document.frames[_11.name].document)||null;
},bindDomNode:function(_12){
_12=_4.byId(_12,this.ownerDocument);
var cn;
if(_12.tagName.toLowerCase()=="iframe"){
var _13=_12,_14=this._iframeContentWindow(_13);
cn=_b.body(_14.document);
}else{
cn=(_12==_b.body(this.ownerDocument)?this.ownerDocument.documentElement:_12);
}
var _15={node:_12,iframe:_13};
_5.set(_12,"_dijitMenu"+this.id,this._bindings.push(_15));
var _16=_9.hitch(this,function(cn){
var _17=this.selector,_18=_17?function(_19){
return on.selector(_17,_19);
}:function(_1a){
return _1a;
},_1b=this;
return [on(cn,_18(this.leftClickToOpen?"click":"contextmenu"),function(evt){
evt.stopPropagation();
evt.preventDefault();
_1b._scheduleOpen(this,_13,{x:evt.pageX,y:evt.pageY});
}),on(cn,_18("keydown"),function(evt){
if(evt.shiftKey&&evt.keyCode==_8.F10){
evt.stopPropagation();
evt.preventDefault();
_1b._scheduleOpen(this,_13);
}
})];
});
_15.connects=cn?_16(cn):[];
if(_13){
_15.onloadHandler=_9.hitch(this,function(){
var _1c=this._iframeContentWindow(_13),cn=_b.body(_1c.document);
_15.connects=_16(cn);
});
if(_13.addEventListener){
_13.addEventListener("load",_15.onloadHandler,false);
}else{
_13.attachEvent("onload",_15.onloadHandler);
}
}
},unBindDomNode:function(_1d){
var _1e;
try{
_1e=_4.byId(_1d,this.ownerDocument);
}
catch(e){
return;
}
var _1f="_dijitMenu"+this.id;
if(_1e&&_5.has(_1e,_1f)){
var bid=_5.get(_1e,_1f)-1,b=this._bindings[bid],h;
while((h=b.connects.pop())){
h.remove();
}
var _20=b.iframe;
if(_20){
if(_20.removeEventListener){
_20.removeEventListener("load",b.onloadHandler,false);
}else{
_20.detachEvent("onload",b.onloadHandler);
}
}
_5.remove(_1e,_1f);
delete this._bindings[bid];
}
},_scheduleOpen:function(_21,_22,_23){
if(!this._openTimer){
this._openTimer=this.defer(function(){
delete this._openTimer;
this._openMyself({target:_21,iframe:_22,coords:_23});
},1);
}
},_openMyself:function(_24){
var _25=_24.target,_26=_24.iframe,_27=_24.coords,_28=!_27;
this.currentTarget=_25;
if(_27){
if(_26){
var ifc=_6.position(_26,true),_29=this._iframeContentWindow(_26),_2a=_6.docScroll(_29.document);
var cs=_7.getComputedStyle(_26),tp=_7.toPixelValue,_2b=(_a("ie")&&_a("quirks")?0:tp(_26,cs.paddingLeft))+(_a("ie")&&_a("quirks")?tp(_26,cs.borderLeftWidth):0),top=(_a("ie")&&_a("quirks")?0:tp(_26,cs.paddingTop))+(_a("ie")&&_a("quirks")?tp(_26,cs.borderTopWidth):0);
_27.x+=ifc.x+_2b-_2a.x;
_27.y+=ifc.y+top-_2a.y;
}
}else{
_27=_6.position(_25,true);
_27.x+=10;
_27.y+=10;
}
var _2c=this;
var _2d=this._focusManager.get("prevNode");
var _2e=this._focusManager.get("curNode");
var _2f=!_2e||(_4.isDescendant(_2e,this.domNode))?_2d:_2e;
function _30(){
if(_2c.refocus&&_2f){
_2f.focus();
}
pm.close(_2c);
};
pm.open({popup:this,x:_27.x,y:_27.y,onExecute:_30,onCancel:_30,orient:this.isLeftToRight()?"L":"R"});
this.focus();
if(!_28){
this.defer(function(){
this._cleanUp(true);
});
}
this._onBlur=function(){
this.inherited("_onBlur",arguments);
pm.close(this);
};
},destroy:function(){
_2.forEach(this._bindings,function(b){
if(b){
this.unBindDomNode(b.node);
}
},this);
this.inherited(arguments);
}});
});
