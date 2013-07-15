//>>built
require({cache:{"url:dijit/layout/templates/_TabButton.html":"<div role=\"presentation\" data-dojo-attach-point=\"titleNode,innerDiv,tabContent\" class=\"dijitTabInner dijitTabContent\">\n\t<span role=\"presentation\" class=\"dijitInline dijitIcon dijitTabButtonIcon\" data-dojo-attach-point=\"iconNode\"></span>\n\t<span data-dojo-attach-point='containerNode,focusNode' class='tabLabel'></span>\n\t<span class=\"dijitInline dijitTabCloseButton dijitTabCloseIcon\" data-dojo-attach-point='closeNode'\n\t\t  role=\"presentation\">\n\t\t<span data-dojo-attach-point='closeText' class='dijitTabCloseText'>[x]</span\n\t\t\t\t></span>\n</div>\n"}});
define("dijit/layout/TabController",["dojo/_base/declare","dojo/dom","dojo/dom-attr","dojo/dom-class","dojo/has","dojo/i18n","dojo/_base/lang","./StackController","../registry","../Menu","../MenuItem","dojo/text!./templates/_TabButton.html","dojo/i18n!../nls/common"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b,_c){
var _d=_1("dijit.layout._TabButton"+(_5("dojo-bidi")?"_NoBidi":""),_8.StackButton,{baseClass:"dijitTab",cssStateNodes:{closeNode:"dijitTabCloseButton"},templateString:_c,_setNameAttr:"focusNode",scrollOnFocus:false,buildRendering:function(){
this.inherited(arguments);
_2.setSelectable(this.containerNode,false);
},startup:function(){
this.inherited(arguments);
var n=this.domNode;
this.defer(function(){
n.className=n.className;
},1);
},_setCloseButtonAttr:function(_e){
this._set("closeButton",_e);
_4.toggle(this.domNode,"dijitClosable",_e);
this.closeNode.style.display=_e?"":"none";
if(_e){
var _f=_6.getLocalization("dijit","common");
if(this.closeNode){
_3.set(this.closeNode,"title",_f.itemClose);
}
}
},_setDisabledAttr:function(_10){
this.inherited(arguments);
if(this.closeNode){
if(_10){
_3.remove(this.closeNode,"title");
}else{
var _11=_6.getLocalization("dijit","common");
_3.set(this.closeNode,"title",_11.itemClose);
}
}
},_setLabelAttr:function(_12){
this.inherited(arguments);
if(!this.showLabel&&!this.params.title){
this.iconNode.alt=_7.trim(this.containerNode.innerText||this.containerNode.textContent||"");
}
}});
if(_5("dojo-bidi")){
_d=_1("dijit.layout._TabButton",_d,{_setLabelAttr:function(_13){
this.inherited(arguments);
this.applyTextDir(this.iconNode,this.iconNode.alt);
}});
}
var _14=_1("dijit.layout.TabController",_8,{baseClass:"dijitTabController",templateString:"<div role='tablist' data-dojo-attach-event='onkeydown:onkeydown'></div>",tabPosition:"top",buttonWidget:_d,buttonWidgetCloseClass:"dijitTabCloseButton",postCreate:function(){
this.inherited(arguments);
var _15=new _a({id:this.id+"_Menu",ownerDocument:this.ownerDocument,dir:this.dir,lang:this.lang,textDir:this.textDir,targetNodeIds:[this.domNode],selector:function(_16){
return _4.contains(_16,"dijitClosable")&&!_4.contains(_16,"dijitTabDisabled");
}});
this.own(_15);
var _17=_6.getLocalization("dijit","common"),_18=this;
_15.addChild(new _b({label:_17.itemClose,ownerDocument:this.ownerDocument,dir:this.dir,lang:this.lang,textDir:this.textDir,onClick:function(evt){
var _19=_9.byNode(this.getParent().currentTarget);
_18.onCloseButtonClick(_19.page);
}}));
}});
_14.TabButton=_d;
return _14;
});
