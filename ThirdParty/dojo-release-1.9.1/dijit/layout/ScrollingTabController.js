//>>built
require({cache:{"url:dijit/layout/templates/ScrollingTabController.html":"<div class=\"dijitTabListContainer-${tabPosition}\" style=\"visibility:hidden\">\n\t<div data-dojo-type=\"dijit.layout._ScrollingTabControllerMenuButton\"\n\t\t class=\"tabStripButton-${tabPosition}\"\n\t\t id=\"${id}_menuBtn\"\n\t\t data-dojo-props=\"containerId: '${containerId}', iconClass: 'dijitTabStripMenuIcon',\n\t\t\t\t\tdropDownPosition: ['below-alt', 'above-alt']\"\n\t\t data-dojo-attach-point=\"_menuBtn\" showLabel=\"false\" title=\"\">&#9660;</div>\n\t<div data-dojo-type=\"dijit.layout._ScrollingTabControllerButton\"\n\t\t class=\"tabStripButton-${tabPosition}\"\n\t\t id=\"${id}_leftBtn\"\n\t\t data-dojo-props=\"iconClass:'dijitTabStripSlideLeftIcon', showLabel:false, title:''\"\n\t\t data-dojo-attach-point=\"_leftBtn\" data-dojo-attach-event=\"onClick: doSlideLeft\">&#9664;</div>\n\t<div data-dojo-type=\"dijit.layout._ScrollingTabControllerButton\"\n\t\t class=\"tabStripButton-${tabPosition}\"\n\t\t id=\"${id}_rightBtn\"\n\t\t data-dojo-props=\"iconClass:'dijitTabStripSlideRightIcon', showLabel:false, title:''\"\n\t\t data-dojo-attach-point=\"_rightBtn\" data-dojo-attach-event=\"onClick: doSlideRight\">&#9654;</div>\n\t<div class='dijitTabListWrapper' data-dojo-attach-point='tablistWrapper'>\n\t\t<div role='tablist' data-dojo-attach-event='onkeydown:onkeydown'\n\t\t\t data-dojo-attach-point='containerNode' class='nowrapTabStrip'></div>\n\t</div>\n</div>","url:dijit/layout/templates/_ScrollingTabControllerButton.html":"<div data-dojo-attach-event=\"ondijitclick:_onClick\" class=\"dijitTabInnerDiv dijitTabContent dijitButtonContents\"  data-dojo-attach-point=\"focusNode\" role=\"button\">\n\t<span role=\"presentation\" class=\"dijitInline dijitTabStripIcon\" data-dojo-attach-point=\"iconNode\"></span>\n\t<span data-dojo-attach-point=\"containerNode,titleNode\" class=\"dijitButtonText\"></span>\n</div>"}});
define("dijit/layout/ScrollingTabController",["dojo/_base/array","dojo/_base/declare","dojo/dom-class","dojo/dom-geometry","dojo/dom-style","dojo/_base/fx","dojo/_base/lang","dojo/on","dojo/query","dojo/sniff","../registry","dojo/text!./templates/ScrollingTabController.html","dojo/text!./templates/_ScrollingTabControllerButton.html","./TabController","./utils","../_WidgetsInTemplateMixin","../Menu","../MenuItem","../form/Button","../_HasDropDown","dojo/NodeList-dom","../a11yclick"],function(_1,_2,_3,_4,_5,fx,_6,on,_7,_8,_9,_a,_b,_c,_d,_e,_f,_10,_11,_12){
var _13=_2("dijit.layout.ScrollingTabController",[_c,_e],{baseClass:"dijitTabController dijitScrollingTabController",templateString:_a,useMenu:true,useSlider:true,tabStripClass:"",_minScroll:5,_setClassAttr:{node:"containerNode",type:"class"},buildRendering:function(){
this.inherited(arguments);
var n=this.domNode;
this.scrollNode=this.tablistWrapper;
this._initButtons();
if(!this.tabStripClass){
this.tabStripClass="dijitTabContainer"+this.tabPosition.charAt(0).toUpperCase()+this.tabPosition.substr(1).replace(/-.*/,"")+"None";
_3.add(n,"tabStrip-disabled");
}
_3.add(this.tablistWrapper,this.tabStripClass);
},onStartup:function(){
this.inherited(arguments);
_5.set(this.domNode,"visibility","");
this._postStartup=true;
this.own(on(this.containerNode,"attrmodified-label, attrmodified-iconclass",_6.hitch(this,function(evt){
if(this._dim){
this.resize(this._dim);
}
})));
},onAddChild:function(_14,_15){
this.inherited(arguments);
_5.set(this.containerNode,"width",(_5.get(this.containerNode,"width")+200)+"px");
},onRemoveChild:function(_16,_17){
var _18=this.pane2button(_16.id);
if(this._selectedTab===_18.domNode){
this._selectedTab=null;
}
this.inherited(arguments);
},_initButtons:function(){
this._btnWidth=0;
this._buttons=_7("> .tabStripButton",this.domNode).filter(function(btn){
if((this.useMenu&&btn==this._menuBtn.domNode)||(this.useSlider&&(btn==this._rightBtn.domNode||btn==this._leftBtn.domNode))){
this._btnWidth+=_4.getMarginSize(btn).w;
return true;
}else{
_5.set(btn,"display","none");
return false;
}
},this);
},_getTabsWidth:function(){
var _19=this.getChildren();
if(_19.length){
var _1a=_19[this.isLeftToRight()?0:_19.length-1].domNode,_1b=_19[this.isLeftToRight()?_19.length-1:0].domNode;
return _1b.offsetLeft+_1b.offsetWidth-_1a.offsetLeft;
}else{
return 0;
}
},_enableBtn:function(_1c){
var _1d=this._getTabsWidth();
_1c=_1c||_5.get(this.scrollNode,"width");
return _1d>0&&_1c<_1d;
},resize:function(dim){
this._dim=dim;
this.scrollNode.style.height="auto";
var cb=this._contentBox=_d.marginBox2contentBox(this.domNode,{h:0,w:dim.w});
cb.h=this.scrollNode.offsetHeight;
_4.setContentSize(this.domNode,cb);
var _1e=this._enableBtn(this._contentBox.w);
this._buttons.style("display",_1e?"":"none");
this._leftBtn.region="left";
this._rightBtn.region="right";
this._menuBtn.region=this.isLeftToRight()?"right":"left";
_d.layoutChildren(this.domNode,this._contentBox,[this._menuBtn,this._leftBtn,this._rightBtn,{domNode:this.scrollNode,region:"center"}]);
if(this._selectedTab){
if(this._anim&&this._anim.status()=="playing"){
this._anim.stop();
}
this.scrollNode.scrollLeft=this._convertToScrollLeft(this._getScrollForSelectedTab());
}
this._setButtonClass(this._getScroll());
this._postResize=true;
return {h:this._contentBox.h,w:dim.w};
},_getScroll:function(){
return (this.isLeftToRight()||_8("ie")<8||(_8("ie")&&_8("quirks"))||_8("webkit"))?this.scrollNode.scrollLeft:_5.get(this.containerNode,"width")-_5.get(this.scrollNode,"width")+(_8("ie")>=8?-1:1)*this.scrollNode.scrollLeft;
},_convertToScrollLeft:function(val){
if(this.isLeftToRight()||_8("ie")<8||(_8("ie")&&_8("quirks"))||_8("webkit")){
return val;
}else{
var _1f=_5.get(this.containerNode,"width")-_5.get(this.scrollNode,"width");
return (_8("ie")>=8?-1:1)*(val-_1f);
}
},onSelectChild:function(_20){
var tab=this.pane2button(_20.id);
if(!tab){
return;
}
var _21=tab.domNode;
if(_21!=this._selectedTab){
this._selectedTab=_21;
if(this._postResize){
var sl=this._getScroll();
if(sl>_21.offsetLeft||sl+_5.get(this.scrollNode,"width")<_21.offsetLeft+_5.get(_21,"width")){
this.createSmoothScroll().play();
}
}
}
this.inherited(arguments);
},_getScrollBounds:function(){
var _22=this.getChildren(),_23=_5.get(this.scrollNode,"width"),_24=_5.get(this.containerNode,"width"),_25=_24-_23,_26=this._getTabsWidth();
if(_22.length&&_26>_23){
return {min:this.isLeftToRight()?0:_22[_22.length-1].domNode.offsetLeft,max:this.isLeftToRight()?(_22[_22.length-1].domNode.offsetLeft+_22[_22.length-1].domNode.offsetWidth)-_23:_25};
}else{
var _27=this.isLeftToRight()?0:_25;
return {min:_27,max:_27};
}
},_getScrollForSelectedTab:function(){
var w=this.scrollNode,n=this._selectedTab,_28=_5.get(this.scrollNode,"width"),_29=this._getScrollBounds();
var pos=(n.offsetLeft+_5.get(n,"width")/2)-_28/2;
pos=Math.min(Math.max(pos,_29.min),_29.max);
return pos;
},createSmoothScroll:function(x){
if(arguments.length>0){
var _2a=this._getScrollBounds();
x=Math.min(Math.max(x,_2a.min),_2a.max);
}else{
x=this._getScrollForSelectedTab();
}
if(this._anim&&this._anim.status()=="playing"){
this._anim.stop();
}
var _2b=this,w=this.scrollNode,_2c=new fx.Animation({beforeBegin:function(){
if(this.curve){
delete this.curve;
}
var _2d=w.scrollLeft,_2e=_2b._convertToScrollLeft(x);
_2c.curve=new fx._Line(_2d,_2e);
},onAnimate:function(val){
w.scrollLeft=val;
}});
this._anim=_2c;
this._setButtonClass(x);
return _2c;
},_getBtnNode:function(e){
var n=e.target;
while(n&&!_3.contains(n,"tabStripButton")){
n=n.parentNode;
}
return n;
},doSlideRight:function(e){
this.doSlide(1,this._getBtnNode(e));
},doSlideLeft:function(e){
this.doSlide(-1,this._getBtnNode(e));
},doSlide:function(_2f,_30){
if(_30&&_3.contains(_30,"dijitTabDisabled")){
return;
}
var _31=_5.get(this.scrollNode,"width");
var d=(_31*0.75)*_2f;
var to=this._getScroll()+d;
this._setButtonClass(to);
this.createSmoothScroll(to).play();
},_setButtonClass:function(_32){
var _33=this._getScrollBounds();
this._leftBtn.set("disabled",_32<=_33.min);
this._rightBtn.set("disabled",_32>=_33.max);
}});
var _34=_2("dijit.layout._ScrollingTabControllerButtonMixin",null,{baseClass:"dijitTab tabStripButton",templateString:_b,tabIndex:"",isFocusable:function(){
return false;
}});
_2("dijit.layout._ScrollingTabControllerButton",[_11,_34]);
_2("dijit.layout._ScrollingTabControllerMenuButton",[_11,_12,_34],{containerId:"",tabIndex:"-1",isLoaded:function(){
return false;
},loadDropDown:function(_35){
this.dropDown=new _f({id:this.containerId+"_menu",ownerDocument:this.ownerDocument,dir:this.dir,lang:this.lang,textDir:this.textDir});
var _36=_9.byId(this.containerId);
_1.forEach(_36.getChildren(),function(_37){
var _38=new _10({id:_37.id+"_stcMi",label:_37.title,iconClass:_37.iconClass,disabled:_37.disabled,ownerDocument:this.ownerDocument,dir:_37.dir,lang:_37.lang,textDir:_37.textDir||_36.textDir,onClick:function(){
_36.selectChild(_37);
}});
this.dropDown.addChild(_38);
},this);
_35();
},closeDropDown:function(_39){
this.inherited(arguments);
if(this.dropDown){
this._popupStateNode.removeAttribute("aria-owns");
this.dropDown.destroyRecursive();
delete this.dropDown;
}
}});
return _13;
});
