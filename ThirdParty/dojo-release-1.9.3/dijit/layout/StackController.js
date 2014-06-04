//>>built
define("dijit/layout/StackController",["dojo/_base/array","dojo/_base/declare","dojo/dom-class","dojo/dom-construct","dojo/keys","dojo/_base/lang","dojo/on","dojo/topic","../focus","../registry","../_Widget","../_TemplatedMixin","../_Container","../form/ToggleButton","dojo/touch","dojo/i18n!../nls/common"],function(_1,_2,_3,_4,_5,_6,on,_7,_8,_9,_a,_b,_c,_d){
var _e=_2("dijit.layout._StackButton",_d,{tabIndex:"-1",closeButton:false,_aria_attr:"aria-selected",buildRendering:function(_f){
this.inherited(arguments);
(this.focusNode||this.domNode).setAttribute("role","tab");
}});
var _10=_2("dijit.layout.StackController",[_a,_b,_c],{baseClass:"dijitStackController",templateString:"<span role='tablist' data-dojo-attach-event='onkeydown'></span>",containerId:"",buttonWidget:_e,buttonWidgetCloseClass:"dijitStackCloseButton",pane2button:function(id){
return _9.byId(this.id+"_"+id);
},postCreate:function(){
this.inherited(arguments);
this.own(_7.subscribe(this.containerId+"-startup",_6.hitch(this,"onStartup")),_7.subscribe(this.containerId+"-addChild",_6.hitch(this,"onAddChild")),_7.subscribe(this.containerId+"-removeChild",_6.hitch(this,"onRemoveChild")),_7.subscribe(this.containerId+"-selectChild",_6.hitch(this,"onSelectChild")),_7.subscribe(this.containerId+"-containerKeyDown",_6.hitch(this,"onContainerKeyDown")));
this.containerNode.dojoClick=true;
this.own(on(this.containerNode,"click",_6.hitch(this,function(evt){
var _11=_9.getEnclosingWidget(evt.target);
if(_11!=this.containerNode&&!_11.disabled&&_11.page){
for(var _12=evt.target;_12!==this.containerNode;_12=_12.parentNode){
if(_3.contains(_12,this.buttonWidgetCloseClass)){
this.onCloseButtonClick(_11.page);
break;
}else{
if(_12==_11.domNode){
this.onButtonClick(_11.page);
break;
}
}
}
}
})));
},onStartup:function(_13){
this.textDir=_13.textDir;
_1.forEach(_13.children,this.onAddChild,this);
if(_13.selected){
this.onSelectChild(_13.selected);
}
var _14=_9.byId(this.containerId).containerNode,_15=_6.hitch(this,"pane2button"),_16={"title":"label","showtitle":"showLabel","iconclass":"iconClass","closable":"closeButton","tooltip":"title","disabled":"disabled","textdir":"textdir"},_17=function(_18,_19){
return on(_14,"attrmodified-"+_18,function(evt){
var _1a=_15(evt.detail&&evt.detail.widget&&evt.detail.widget.id);
if(_1a){
_1a.set(_19,evt.detail.newValue);
}
});
};
for(var _1b in _16){
this.own(_17(_1b,_16[_1b]));
}
},destroy:function(_1c){
this.destroyDescendants(_1c);
this.inherited(arguments);
},onAddChild:function(_1d,_1e){
var Cls=_6.isString(this.buttonWidget)?_6.getObject(this.buttonWidget):this.buttonWidget;
var _1f=new Cls({id:this.id+"_"+_1d.id,name:this.id+"_"+_1d.id,label:_1d.title,disabled:_1d.disabled,ownerDocument:this.ownerDocument,dir:_1d.dir,lang:_1d.lang,textDir:_1d.textDir||this.textDir,showLabel:_1d.showTitle,iconClass:_1d.iconClass,closeButton:_1d.closable,title:_1d.tooltip,page:_1d});
this.addChild(_1f,_1e);
_1d.controlButton=_1f;
if(!this._currentChild){
this.onSelectChild(_1d);
}
var _20=_1d._wrapper.getAttribute("aria-labelledby")?_1d._wrapper.getAttribute("aria-labelledby")+" "+_1f.id:_1f.id;
_1d._wrapper.removeAttribute("aria-label");
_1d._wrapper.setAttribute("aria-labelledby",_20);
},onRemoveChild:function(_21){
if(this._currentChild===_21){
this._currentChild=null;
}
var _22=this.pane2button(_21.id);
if(_22){
this.removeChild(_22);
_22.destroy();
}
delete _21.controlButton;
},onSelectChild:function(_23){
if(!_23){
return;
}
if(this._currentChild){
var _24=this.pane2button(this._currentChild.id);
_24.set("checked",false);
_24.focusNode.setAttribute("tabIndex","-1");
}
var _25=this.pane2button(_23.id);
_25.set("checked",true);
this._currentChild=_23;
_25.focusNode.setAttribute("tabIndex","0");
var _26=_9.byId(this.containerId);
},onButtonClick:function(_27){
var _28=this.pane2button(_27.id);
_8.focus(_28.focusNode);
if(this._currentChild&&this._currentChild.id===_27.id){
_28.set("checked",true);
}
var _29=_9.byId(this.containerId);
_29.selectChild(_27);
},onCloseButtonClick:function(_2a){
var _2b=_9.byId(this.containerId);
_2b.closeChild(_2a);
if(this._currentChild){
var b=this.pane2button(this._currentChild.id);
if(b){
_8.focus(b.focusNode||b.domNode);
}
}
},adjacent:function(_2c){
if(!this.isLeftToRight()&&(!this.tabPosition||/top|bottom/.test(this.tabPosition))){
_2c=!_2c;
}
var _2d=this.getChildren();
var idx=_1.indexOf(_2d,this.pane2button(this._currentChild.id)),_2e=_2d[idx];
var _2f;
do{
idx=(idx+(_2c?1:_2d.length-1))%_2d.length;
_2f=_2d[idx];
}while(_2f.disabled&&_2f!=_2e);
return _2f;
},onkeydown:function(e,_30){
if(this.disabled||e.altKey){
return;
}
var _31=null;
if(e.ctrlKey||!e._djpage){
switch(e.keyCode){
case _5.LEFT_ARROW:
case _5.UP_ARROW:
if(!e._djpage){
_31=false;
}
break;
case _5.PAGE_UP:
if(e.ctrlKey){
_31=false;
}
break;
case _5.RIGHT_ARROW:
case _5.DOWN_ARROW:
if(!e._djpage){
_31=true;
}
break;
case _5.PAGE_DOWN:
if(e.ctrlKey){
_31=true;
}
break;
case _5.HOME:
var _32=this.getChildren();
for(var idx=0;idx<_32.length;idx++){
var _33=_32[idx];
if(!_33.disabled){
this.onButtonClick(_33.page);
break;
}
}
e.stopPropagation();
e.preventDefault();
break;
case _5.END:
var _32=this.getChildren();
for(var idx=_32.length-1;idx>=0;idx--){
var _33=_32[idx];
if(!_33.disabled){
this.onButtonClick(_33.page);
break;
}
}
e.stopPropagation();
e.preventDefault();
break;
case _5.DELETE:
case "W".charCodeAt(0):
if(this._currentChild.closable&&(e.keyCode==_5.DELETE||e.ctrlKey)){
this.onCloseButtonClick(this._currentChild);
e.stopPropagation();
e.preventDefault();
}
break;
case _5.TAB:
if(e.ctrlKey){
this.onButtonClick(this.adjacent(!e.shiftKey).page);
e.stopPropagation();
e.preventDefault();
}
break;
}
if(_31!==null){
this.onButtonClick(this.adjacent(_31).page);
e.stopPropagation();
e.preventDefault();
}
}
},onContainerKeyDown:function(_34){
_34.e._djpage=_34.page;
this.onkeydown(_34.e);
}});
_10.StackButton=_e;
return _10;
});
