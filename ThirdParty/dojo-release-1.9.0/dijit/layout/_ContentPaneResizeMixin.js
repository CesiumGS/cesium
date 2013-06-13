//>>built
define("dijit/layout/_ContentPaneResizeMixin",["dojo/_base/array","dojo/_base/declare","dojo/dom-class","dojo/dom-geometry","dojo/dom-style","dojo/_base/lang","dojo/query","dojo/sniff","../registry","../Viewport","./utils"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b){
return _2("dijit.layout._ContentPaneResizeMixin",null,{doLayout:true,isLayoutContainer:true,startup:function(){
if(this._started){
return;
}
var _c=this.getParent();
this._childOfLayoutWidget=_c&&_c.isLayoutContainer;
this._needLayout=!this._childOfLayoutWidget;
this.inherited(arguments);
if(this._isShown()){
this._onShow();
}
if(!this._childOfLayoutWidget){
this.own(_a.on("resize",_6.hitch(this,"resize")));
}
},_checkIfSingleChild:function(){
var _d=[],_e=false;
_7("> *",this.containerNode).some(function(_f){
var _10=_9.byNode(_f);
if(_10&&_10.resize){
_d.push(_10);
}else{
if(!/script|link|style/i.test(_f.nodeName)&&_f.offsetHeight){
_e=true;
}
}
});
this._singleChild=_d.length==1&&!_e?_d[0]:null;
_3.toggle(this.containerNode,this.baseClass+"SingleChild",!!this._singleChild);
},resize:function(_11,_12){
this._resizeCalled=true;
this._scheduleLayout(_11,_12);
},_scheduleLayout:function(_13,_14){
if(this._isShown()){
this._layout(_13,_14);
}else{
this._needLayout=true;
this._changeSize=_13;
this._resultSize=_14;
}
},_layout:function(_15,_16){
delete this._needLayout;
if(!this._wasShown&&this.open!==false){
this._onShow();
}
if(_15){
_4.setMarginBox(this.domNode,_15);
}
var cn=this.containerNode;
if(cn===this.domNode){
var mb=_16||{};
_6.mixin(mb,_15||{});
if(!("h" in mb)||!("w" in mb)){
mb=_6.mixin(_4.getMarginBox(cn),mb);
}
this._contentBox=_b.marginBox2contentBox(cn,mb);
}else{
this._contentBox=_4.getContentBox(cn);
}
this._layoutChildren();
},_layoutChildren:function(){
if(this.doLayout){
this._checkIfSingleChild();
}
if(this._singleChild&&this._singleChild.resize){
var cb=this._contentBox||_4.getContentBox(this.containerNode);
this._singleChild.resize({w:cb.w,h:cb.h});
}else{
var _17=this.getChildren(),_18,i=0;
while(_18=_17[i++]){
if(_18.resize){
_18.resize();
}
}
}
},_isShown:function(){
if(this._childOfLayoutWidget){
if(this._resizeCalled&&"open" in this){
return this.open;
}
return this._resizeCalled;
}else{
if("open" in this){
return this.open;
}else{
var _19=this.domNode,_1a=this.domNode.parentNode;
return (_19.style.display!="none")&&(_19.style.visibility!="hidden")&&!_3.contains(_19,"dijitHidden")&&_1a&&_1a.style&&(_1a.style.display!="none");
}
}
},_onShow:function(){
this._wasShown=true;
if(this._needLayout){
this._layout(this._changeSize,this._resultSize);
}
this.inherited(arguments);
}});
});
