/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.layout.StackContainer"]){
dojo._hasResource["dijit.layout.StackContainer"]=true;
dojo.provide("dijit.layout.StackContainer");
dojo.require("dijit._Templated");
dojo.require("dijit.layout._LayoutWidget");
dojo.requireLocalization("dijit","common",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.require("dojo.cookie");
dojo.require("dijit.layout.StackController");
dojo.declare("dijit.layout.StackContainer",dijit.layout._LayoutWidget,{doLayout:true,persist:false,baseClass:"dijitStackContainer",buildRendering:function(){
this.inherited(arguments);
dojo.addClass(this.domNode,"dijitLayoutContainer");
dijit.setWaiRole(this.containerNode,"tabpanel");
},postCreate:function(){
this.inherited(arguments);
this.connect(this.domNode,"onkeypress",this._onKeyPress);
},startup:function(){
if(this._started){
return;
}
var _1=this.getChildren();
dojo.forEach(_1,this._setupChild,this);
if(this.persist){
this.selectedChildWidget=dijit.byId(dojo.cookie(this.id+"_selectedChild"));
}else{
dojo.some(_1,function(_2){
if(_2.selected){
this.selectedChildWidget=_2;
}
return _2.selected;
},this);
}
var _3=this.selectedChildWidget;
if(!_3&&_1[0]){
_3=this.selectedChildWidget=_1[0];
_3.selected=true;
}
dojo.publish(this.id+"-startup",[{children:_1,selected:_3}]);
this.inherited(arguments);
},resize:function(){
var _4=this.selectedChildWidget;
if(_4&&!this._hasBeenShown){
this._hasBeenShown=true;
this._showChild(_4);
}
this.inherited(arguments);
},_setupChild:function(_5){
this.inherited(arguments);
dojo.replaceClass(_5.domNode,"dijitHidden","dijitVisible");
_5.domNode.title="";
},addChild:function(_6,_7){
this.inherited(arguments);
if(this._started){
dojo.publish(this.id+"-addChild",[_6,_7]);
this.layout();
if(!this.selectedChildWidget){
this.selectChild(_6);
}
}
},removeChild:function(_8){
this.inherited(arguments);
if(this._started){
dojo.publish(this.id+"-removeChild",[_8]);
}
if(this._beingDestroyed){
return;
}
if(this.selectedChildWidget===_8){
this.selectedChildWidget=undefined;
if(this._started){
var _9=this.getChildren();
if(_9.length){
this.selectChild(_9[0]);
}
}
}
if(this._started){
this.layout();
}
},selectChild:function(_a,_b){
_a=dijit.byId(_a);
if(this.selectedChildWidget!=_a){
var d=this._transition(_a,this.selectedChildWidget,_b);
this._set("selectedChildWidget",_a);
dojo.publish(this.id+"-selectChild",[_a]);
if(this.persist){
dojo.cookie(this.id+"_selectedChild",this.selectedChildWidget.id);
}
}
return d;
},_transition:function(_c,_d,_e){
if(_d){
this._hideChild(_d);
}
var d=this._showChild(_c);
if(_c.resize){
if(this.doLayout){
_c.resize(this._containerContentBox||this._contentBox);
}else{
_c.resize();
}
}
return d;
},_adjacent:function(_f){
var _10=this.getChildren();
var _11=dojo.indexOf(_10,this.selectedChildWidget);
_11+=_f?1:_10.length-1;
return _10[_11%_10.length];
},forward:function(){
return this.selectChild(this._adjacent(true),true);
},back:function(){
return this.selectChild(this._adjacent(false),true);
},_onKeyPress:function(e){
dojo.publish(this.id+"-containerKeyPress",[{e:e,page:this}]);
},layout:function(){
if(this.doLayout&&this.selectedChildWidget&&this.selectedChildWidget.resize){
this.selectedChildWidget.resize(this._containerContentBox||this._contentBox);
}
},_showChild:function(_12){
var _13=this.getChildren();
_12.isFirstChild=(_12==_13[0]);
_12.isLastChild=(_12==_13[_13.length-1]);
_12._set("selected",true);
dojo.replaceClass(_12.domNode,"dijitVisible","dijitHidden");
return _12._onShow()||true;
},_hideChild:function(_14){
_14._set("selected",false);
dojo.replaceClass(_14.domNode,"dijitHidden","dijitVisible");
_14.onHide();
},closeChild:function(_15){
var _16=_15.onClose(this,_15);
if(_16){
this.removeChild(_15);
_15.destroyRecursive();
}
},destroyDescendants:function(_17){
dojo.forEach(this.getChildren(),function(_18){
this.removeChild(_18);
_18.destroyRecursive(_17);
},this);
}});
dojo.extend(dijit._Widget,{selected:false,closable:false,iconClass:"",showTitle:true});
}
