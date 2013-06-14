//>>built
define("dijit/layout/StackContainer",["dojo/_base/array","dojo/cookie","dojo/_base/declare","dojo/dom-class","dojo/dom-construct","dojo/has","dojo/_base/lang","dojo/on","dojo/ready","dojo/topic","dojo/when","../registry","../_WidgetBase","./_LayoutWidget","dojo/i18n!../nls/common"],function(_1,_2,_3,_4,_5,_6,_7,on,_8,_9,_a,_b,_c,_d){
if(_6("dijit-legacy-requires")){
_8(0,function(){
var _e=["dijit/layout/StackController"];
require(_e);
});
}
var _f=_3("dijit.layout.StackContainer",_d,{doLayout:true,persist:false,baseClass:"dijitStackContainer",buildRendering:function(){
this.inherited(arguments);
_4.add(this.domNode,"dijitLayoutContainer");
},postCreate:function(){
this.inherited(arguments);
this.own(on(this.domNode,"keydown",_7.hitch(this,"_onKeyDown")));
},startup:function(){
if(this._started){
return;
}
var _10=this.getChildren();
_1.forEach(_10,this._setupChild,this);
if(this.persist){
this.selectedChildWidget=_b.byId(_2(this.id+"_selectedChild"));
}else{
_1.some(_10,function(_11){
if(_11.selected){
this.selectedChildWidget=_11;
}
return _11.selected;
},this);
}
var _12=this.selectedChildWidget;
if(!_12&&_10[0]){
_12=this.selectedChildWidget=_10[0];
_12.selected=true;
}
_9.publish(this.id+"-startup",{children:_10,selected:_12,textDir:this.textDir});
this.inherited(arguments);
},resize:function(){
if(!this._hasBeenShown){
this._hasBeenShown=true;
var _13=this.selectedChildWidget;
if(_13){
this._showChild(_13);
}
}
this.inherited(arguments);
},_setupChild:function(_14){
var _15=_14.domNode,_16=_5.place("<div role='tabpanel' class='"+this.baseClass+"ChildWrapper dijitHidden'>",_14.domNode,"replace"),_17=_14["aria-label"]||_14.title||_14.label;
if(_17){
_16.setAttribute("aria-label",_17);
}
_5.place(_15,_16);
_14._wrapper=_16;
this.inherited(arguments);
if(_15.style.display=="none"){
_15.style.display="block";
}
_14.domNode.title="";
},addChild:function(_18,_19){
this.inherited(arguments);
if(this._started){
_9.publish(this.id+"-addChild",_18,_19);
this.layout();
if(!this.selectedChildWidget){
this.selectChild(_18);
}
}
},removeChild:function(_1a){
var idx=_1.indexOf(this.getChildren(),_1a);
this.inherited(arguments);
_5.destroy(_1a._wrapper);
delete _1a._wrapper;
if(this._started){
_9.publish(this.id+"-removeChild",_1a);
}
if(this._descendantsBeingDestroyed){
return;
}
if(this.selectedChildWidget===_1a){
this.selectedChildWidget=undefined;
if(this._started){
var _1b=this.getChildren();
if(_1b.length){
this.selectChild(_1b[Math.max(idx-1,0)]);
}
}
}
if(this._started){
this.layout();
}
},selectChild:function(_1c,_1d){
var d;
_1c=_b.byId(_1c);
if(this.selectedChildWidget!=_1c){
d=this._transition(_1c,this.selectedChildWidget,_1d);
this._set("selectedChildWidget",_1c);
_9.publish(this.id+"-selectChild",_1c);
if(this.persist){
_2(this.id+"_selectedChild",this.selectedChildWidget.id);
}
}
return _a(d||true);
},_transition:function(_1e,_1f){
if(_1f){
this._hideChild(_1f);
}
var d=this._showChild(_1e);
if(_1e.resize){
if(this.doLayout){
_1e.resize(this._containerContentBox||this._contentBox);
}else{
_1e.resize();
}
}
return d;
},_adjacent:function(_20){
var _21=this.getChildren();
var _22=_1.indexOf(_21,this.selectedChildWidget);
_22+=_20?1:_21.length-1;
return _21[_22%_21.length];
},forward:function(){
return this.selectChild(this._adjacent(true),true);
},back:function(){
return this.selectChild(this._adjacent(false),true);
},_onKeyDown:function(e){
_9.publish(this.id+"-containerKeyDown",{e:e,page:this});
},layout:function(){
var _23=this.selectedChildWidget;
if(_23&&_23.resize){
if(this.doLayout){
_23.resize(this._containerContentBox||this._contentBox);
}else{
_23.resize();
}
}
},_showChild:function(_24){
var _25=this.getChildren();
_24.isFirstChild=(_24==_25[0]);
_24.isLastChild=(_24==_25[_25.length-1]);
_24._set("selected",true);
if(_24._wrapper){
_4.replace(_24._wrapper,"dijitVisible","dijitHidden");
}
return (_24._onShow&&_24._onShow())||true;
},_hideChild:function(_26){
_26._set("selected",false);
if(_26._wrapper){
_4.replace(_26._wrapper,"dijitHidden","dijitVisible");
}
_26.onHide&&_26.onHide();
},closeChild:function(_27){
var _28=_27.onClose&&_27.onClose(this,_27);
if(_28){
this.removeChild(_27);
_27.destroyRecursive();
}
},destroyDescendants:function(_29){
this._descendantsBeingDestroyed=true;
this.selectedChildWidget=undefined;
_1.forEach(this.getChildren(),function(_2a){
if(!_29){
this.removeChild(_2a);
}
_2a.destroyRecursive(_29);
},this);
this._descendantsBeingDestroyed=false;
}});
_f.ChildWidgetProperties={selected:false,disabled:false,closable:false,iconClass:"dijitNoIcon",showTitle:true};
_7.extend(_c,_f.ChildWidgetProperties);
return _f;
});
