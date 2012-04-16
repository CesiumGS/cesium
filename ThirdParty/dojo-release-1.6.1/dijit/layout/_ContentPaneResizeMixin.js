/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.layout._ContentPaneResizeMixin"]){
dojo._hasResource["dijit.layout._ContentPaneResizeMixin"]=true;
dojo.provide("dijit.layout._ContentPaneResizeMixin");
dojo.require("dijit._Contained");
dojo.require("dijit.layout._LayoutWidget");
dojo.declare("dijit.layout._ContentPaneResizeMixin",null,{doLayout:true,isContainer:true,isLayoutContainer:true,_startChildren:function(){
dojo.forEach(this.getChildren(),function(_1){
_1.startup();
_1._started=true;
});
},startup:function(){
if(this._started){
return;
}
var _2=dijit._Contained.prototype.getParent.call(this);
this._childOfLayoutWidget=_2&&_2.isLayoutContainer;
this._needLayout=!this._childOfLayoutWidget;
this.inherited(arguments);
this._startChildren();
if(this._isShown()){
this._onShow();
}
if(!this._childOfLayoutWidget){
this.connect(dojo.isIE?this.domNode:dojo.global,"onresize",function(){
this._needLayout=!this._childOfLayoutWidget;
this.resize();
});
}
},_checkIfSingleChild:function(){
var _3=dojo.query("> *",this.containerNode).filter(function(_4){
return _4.tagName!=="SCRIPT";
}),_5=_3.filter(function(_6){
return dojo.hasAttr(_6,"data-dojo-type")||dojo.hasAttr(_6,"dojoType")||dojo.hasAttr(_6,"widgetId");
}),_7=dojo.filter(_5.map(dijit.byNode),function(_8){
return _8&&_8.domNode&&_8.resize;
});
if(_3.length==_5.length&&_7.length==1){
this._singleChild=_7[0];
}else{
delete this._singleChild;
}
dojo.toggleClass(this.containerNode,this.baseClass+"SingleChild",!!this._singleChild);
},resize:function(_9,_a){
if(!this._wasShown&&this.open!==false){
this._onShow();
}
this._resizeCalled=true;
this._scheduleLayout(_9,_a);
},_scheduleLayout:function(_b,_c){
if(this._isShown()){
this._layout(_b,_c);
}else{
this._needLayout=true;
this._changeSize=_b;
this._resultSize=_c;
}
},_layout:function(_d,_e){
if(_d){
dojo.marginBox(this.domNode,_d);
}
var cn=this.containerNode;
if(cn===this.domNode){
var mb=_e||{};
dojo.mixin(mb,_d||{});
if(!("h" in mb)||!("w" in mb)){
mb=dojo.mixin(dojo.marginBox(cn),mb);
}
this._contentBox=dijit.layout.marginBox2contentBox(cn,mb);
}else{
this._contentBox=dojo.contentBox(cn);
}
this._layoutChildren();
delete this._needLayout;
},_layoutChildren:function(){
if(this.doLayout){
this._checkIfSingleChild();
}
if(this._singleChild&&this._singleChild.resize){
var cb=this._contentBox||dojo.contentBox(this.containerNode);
this._singleChild.resize({w:cb.w,h:cb.h});
}else{
dojo.forEach(this.getChildren(),function(_f){
if(_f.resize){
_f.resize();
}
});
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
var _10=this.domNode,_11=this.domNode.parentNode;
return (_10.style.display!="none")&&(_10.style.visibility!="hidden")&&!dojo.hasClass(_10,"dijitHidden")&&_11&&_11.style&&(_11.style.display!="none");
}
}
},_onShow:function(){
if(this._needLayout){
this._layout(this._changeSize,this._resultSize);
}
this.inherited(arguments);
this._wasShown=true;
}});
}
