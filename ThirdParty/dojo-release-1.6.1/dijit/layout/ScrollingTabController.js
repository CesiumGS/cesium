/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.layout.ScrollingTabController"]){
dojo._hasResource["dijit.layout.ScrollingTabController"]=true;
dojo.provide("dijit.layout.ScrollingTabController");
dojo.require("dijit.layout.TabController");
dojo.require("dijit.Menu");
dojo.require("dijit.form.Button");
dojo.require("dijit._HasDropDown");
dojo.declare("dijit.layout.ScrollingTabController",dijit.layout.TabController,{templateString:dojo.cache("dijit.layout","templates/ScrollingTabController.html","<div class=\"dijitTabListContainer-${tabPosition}\" style=\"visibility:hidden\">\n\t<div dojoType=\"dijit.layout._ScrollingTabControllerMenuButton\"\n\t\t\tclass=\"tabStripButton-${tabPosition}\"\n\t\t\tid=\"${id}_menuBtn\" containerId=\"${containerId}\" iconClass=\"dijitTabStripMenuIcon\"\n\t\t\tdropDownPosition=\"below-alt, above-alt\"\n\t\t\tdojoAttachPoint=\"_menuBtn\" showLabel=\"false\">&#9660;</div>\n\t<div dojoType=\"dijit.layout._ScrollingTabControllerButton\"\n\t\t\tclass=\"tabStripButton-${tabPosition}\"\n\t\t\tid=\"${id}_leftBtn\" iconClass=\"dijitTabStripSlideLeftIcon\"\n\t\t\tdojoAttachPoint=\"_leftBtn\" dojoAttachEvent=\"onClick: doSlideLeft\" showLabel=\"false\">&#9664;</div>\n\t<div dojoType=\"dijit.layout._ScrollingTabControllerButton\"\n\t\t\tclass=\"tabStripButton-${tabPosition}\"\n\t\t\tid=\"${id}_rightBtn\" iconClass=\"dijitTabStripSlideRightIcon\"\n\t\t\tdojoAttachPoint=\"_rightBtn\" dojoAttachEvent=\"onClick: doSlideRight\" showLabel=\"false\">&#9654;</div>\n\t<div class='dijitTabListWrapper' dojoAttachPoint='tablistWrapper'>\n\t\t<div role='tablist' dojoAttachEvent='onkeypress:onkeypress'\n\t\t\t\tdojoAttachPoint='containerNode' class='nowrapTabStrip'></div>\n\t</div>\n</div>\n"),useMenu:true,useSlider:true,tabStripClass:"",widgetsInTemplate:true,_minScroll:5,attributeMap:dojo.delegate(dijit._Widget.prototype.attributeMap,{"class":"containerNode"}),buildRendering:function(){
this.inherited(arguments);
var n=this.domNode;
this.scrollNode=this.tablistWrapper;
this._initButtons();
if(!this.tabStripClass){
this.tabStripClass="dijitTabContainer"+this.tabPosition.charAt(0).toUpperCase()+this.tabPosition.substr(1).replace(/-.*/,"")+"None";
dojo.addClass(n,"tabStrip-disabled");
}
dojo.addClass(this.tablistWrapper,this.tabStripClass);
},onStartup:function(){
this.inherited(arguments);
dojo.style(this.domNode,"visibility","visible");
this._postStartup=true;
},onAddChild:function(_1,_2){
this.inherited(arguments);
dojo.forEach(["label","iconClass"],function(_3){
this.pane2watches[_1.id].push(this.pane2button[_1.id].watch(_3,dojo.hitch(this,function(_4,_5,_6){
if(this._postStartup&&this._dim){
this.resize(this._dim);
}
})));
},this);
dojo.style(this.containerNode,"width",(dojo.style(this.containerNode,"width")+200)+"px");
},onRemoveChild:function(_7,_8){
var _9=this.pane2button[_7.id];
if(this._selectedTab===_9.domNode){
this._selectedTab=null;
}
this.inherited(arguments);
},_initButtons:function(){
this._btnWidth=0;
this._buttons=dojo.query("> .tabStripButton",this.domNode).filter(function(_a){
if((this.useMenu&&_a==this._menuBtn.domNode)||(this.useSlider&&(_a==this._rightBtn.domNode||_a==this._leftBtn.domNode))){
this._btnWidth+=dojo._getMarginSize(_a).w;
return true;
}else{
dojo.style(_a,"display","none");
return false;
}
},this);
},_getTabsWidth:function(){
var _b=this.getChildren();
if(_b.length){
var _c=_b[this.isLeftToRight()?0:_b.length-1].domNode,_d=_b[this.isLeftToRight()?_b.length-1:0].domNode;
return _d.offsetLeft+dojo.style(_d,"width")-_c.offsetLeft;
}else{
return 0;
}
},_enableBtn:function(_e){
var _f=this._getTabsWidth();
_e=_e||dojo.style(this.scrollNode,"width");
return _f>0&&_e<_f;
},resize:function(dim){
if(this.domNode.offsetWidth==0){
return;
}
this._dim=dim;
this.scrollNode.style.height="auto";
this._contentBox=dijit.layout.marginBox2contentBox(this.domNode,{h:0,w:dim.w});
this._contentBox.h=this.scrollNode.offsetHeight;
dojo.contentBox(this.domNode,this._contentBox);
var _10=this._enableBtn(this._contentBox.w);
this._buttons.style("display",_10?"":"none");
this._leftBtn.layoutAlign="left";
this._rightBtn.layoutAlign="right";
this._menuBtn.layoutAlign=this.isLeftToRight()?"right":"left";
dijit.layout.layoutChildren(this.domNode,this._contentBox,[this._menuBtn,this._leftBtn,this._rightBtn,{domNode:this.scrollNode,layoutAlign:"client"}]);
if(this._selectedTab){
if(this._anim&&this._anim.status()=="playing"){
this._anim.stop();
}
var w=this.scrollNode,sl=this._convertToScrollLeft(this._getScrollForSelectedTab());
w.scrollLeft=sl;
}
this._setButtonClass(this._getScroll());
this._postResize=true;
return {h:this._contentBox.h,w:dim.w};
},_getScroll:function(){
var sl=(this.isLeftToRight()||dojo.isIE<8||(dojo.isIE&&dojo.isQuirks)||dojo.isWebKit)?this.scrollNode.scrollLeft:dojo.style(this.containerNode,"width")-dojo.style(this.scrollNode,"width")+(dojo.isIE==8?-1:1)*this.scrollNode.scrollLeft;
return sl;
},_convertToScrollLeft:function(val){
if(this.isLeftToRight()||dojo.isIE<8||(dojo.isIE&&dojo.isQuirks)||dojo.isWebKit){
return val;
}else{
var _11=dojo.style(this.containerNode,"width")-dojo.style(this.scrollNode,"width");
return (dojo.isIE==8?-1:1)*(val-_11);
}
},onSelectChild:function(_12){
var tab=this.pane2button[_12.id];
if(!tab||!_12){
return;
}
var _13=tab.domNode;
if(this._postResize&&_13!=this._selectedTab){
this._selectedTab=_13;
var sl=this._getScroll();
if(sl>_13.offsetLeft||sl+dojo.style(this.scrollNode,"width")<_13.offsetLeft+dojo.style(_13,"width")){
this.createSmoothScroll().play();
}
}
this.inherited(arguments);
},_getScrollBounds:function(){
var _14=this.getChildren(),_15=dojo.style(this.scrollNode,"width"),_16=dojo.style(this.containerNode,"width"),_17=_16-_15,_18=this._getTabsWidth();
if(_14.length&&_18>_15){
return {min:this.isLeftToRight()?0:_14[_14.length-1].domNode.offsetLeft,max:this.isLeftToRight()?(_14[_14.length-1].domNode.offsetLeft+dojo.style(_14[_14.length-1].domNode,"width"))-_15:_17};
}else{
var _19=this.isLeftToRight()?0:_17;
return {min:_19,max:_19};
}
},_getScrollForSelectedTab:function(){
var w=this.scrollNode,n=this._selectedTab,_1a=dojo.style(this.scrollNode,"width"),_1b=this._getScrollBounds();
var pos=(n.offsetLeft+dojo.style(n,"width")/2)-_1a/2;
pos=Math.min(Math.max(pos,_1b.min),_1b.max);
return pos;
},createSmoothScroll:function(x){
if(arguments.length>0){
var _1c=this._getScrollBounds();
x=Math.min(Math.max(x,_1c.min),_1c.max);
}else{
x=this._getScrollForSelectedTab();
}
if(this._anim&&this._anim.status()=="playing"){
this._anim.stop();
}
var _1d=this,w=this.scrollNode,_1e=new dojo._Animation({beforeBegin:function(){
if(this.curve){
delete this.curve;
}
var _1f=w.scrollLeft,_20=_1d._convertToScrollLeft(x);
_1e.curve=new dojo._Line(_1f,_20);
},onAnimate:function(val){
w.scrollLeft=val;
}});
this._anim=_1e;
this._setButtonClass(x);
return _1e;
},_getBtnNode:function(e){
var n=e.target;
while(n&&!dojo.hasClass(n,"tabStripButton")){
n=n.parentNode;
}
return n;
},doSlideRight:function(e){
this.doSlide(1,this._getBtnNode(e));
},doSlideLeft:function(e){
this.doSlide(-1,this._getBtnNode(e));
},doSlide:function(_21,_22){
if(_22&&dojo.hasClass(_22,"dijitTabDisabled")){
return;
}
var _23=dojo.style(this.scrollNode,"width");
var d=(_23*0.75)*_21;
var to=this._getScroll()+d;
this._setButtonClass(to);
this.createSmoothScroll(to).play();
},_setButtonClass:function(_24){
var _25=this._getScrollBounds();
this._leftBtn.set("disabled",_24<=_25.min);
this._rightBtn.set("disabled",_24>=_25.max);
}});
dojo.declare("dijit.layout._ScrollingTabControllerButtonMixin",null,{baseClass:"dijitTab tabStripButton",templateString:dojo.cache("dijit.layout","templates/_ScrollingTabControllerButton.html","<div dojoAttachEvent=\"onclick:_onButtonClick\">\n\t<div role=\"presentation\" class=\"dijitTabInnerDiv\" dojoattachpoint=\"innerDiv,focusNode\">\n\t\t<div role=\"presentation\" class=\"dijitTabContent dijitButtonContents\" dojoattachpoint=\"tabContent\">\n\t\t\t<img role=\"presentation\" alt=\"\" src=\"${_blankGif}\" class=\"dijitTabStripIcon\" dojoAttachPoint=\"iconNode\"/>\n\t\t\t<span dojoAttachPoint=\"containerNode,titleNode\" class=\"dijitButtonText\"></span>\n\t\t</div>\n\t</div>\n</div>\n"),tabIndex:"",isFocusable:function(){
return false;
}});
dojo.declare("dijit.layout._ScrollingTabControllerButton",[dijit.form.Button,dijit.layout._ScrollingTabControllerButtonMixin]);
dojo.declare("dijit.layout._ScrollingTabControllerMenuButton",[dijit.form.Button,dijit._HasDropDown,dijit.layout._ScrollingTabControllerButtonMixin],{containerId:"",tabIndex:"-1",isLoaded:function(){
return false;
},loadDropDown:function(_26){
this.dropDown=new dijit.Menu({id:this.containerId+"_menu",dir:this.dir,lang:this.lang});
var _27=dijit.byId(this.containerId);
dojo.forEach(_27.getChildren(),function(_28){
var _29=new dijit.MenuItem({id:_28.id+"_stcMi",label:_28.title,iconClass:_28.iconClass,dir:_28.dir,lang:_28.lang,onClick:function(){
_27.selectChild(_28);
}});
this.dropDown.addChild(_29);
},this);
_26();
},closeDropDown:function(_2a){
this.inherited(arguments);
if(this.dropDown){
this.dropDown.destroyRecursive();
delete this.dropDown;
}
}});
}
