/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.filter.FilterBar"]){
dojo._hasResource["dojox.grid.enhanced.plugins.filter.FilterBar"]=true;
dojo.provide("dojox.grid.enhanced.plugins.filter.FilterBar");
dojo.require("dijit.form.Button");
dojo.require("dojo.string");
dojo.require("dojo.fx");
(function(){
var _1="dojoxGridFBarHover",_2="dojoxGridFBarFiltered",_3=function(_4){
try{
if(_4&&_4.preventDefault){
dojo.stopEvent(_4);
}
}
catch(e){
}
};
dojo.declare("dojox.grid.enhanced.plugins.filter.FilterBar",[dijit._Widget,dijit._Templated],{templateString:dojo.cache("dojox.grid","enhanced/templates/FilterBar.html","<table class=\"dojoxGridFBar\" border=\"0\" cellspacing=\"0\" dojoAttachEvent=\"onclick:_onClickFilterBar, onmouseenter:_onMouseEnter, onmouseleave:_onMouseLeave, onmousemove:_onMouseMove\"\n\t><tr><td class=\"dojoxGridFBarBtnTD\"\n\t\t><span dojoType=\"dijit.form.Button\" class=\"dojoxGridFBarBtn\" dojoAttachPoint=\"defineFilterButton\" label=\"...\" iconClass=\"dojoxGridFBarDefFilterBtnIcon\" showLabel=\"true\" dojoAttachEvent=\"onClick:_showFilterDefDialog, onMouseEnter:_onEnterButton, onMouseLeave:_onLeaveButton, onMouseMove:_onMoveButton\"></span\n\t></td><td class=\"dojoxGridFBarInfoTD\"\n\t\t><span class=\"dojoxGridFBarInner\"\n\t\t\t><span class=\"dojoxGridFBarStatus\" dojoAttachPoint=\"statusBarNode\">${_noFilterMsg}</span\n\t\t\t><span dojoType=\"dijit.form.Button\" class=\"dojoxGridFBarClearFilterBtn\" dojoAttachPoint=\"clearFilterButton\" \n\t\t\t\tlabel=\"${_filterBarClearBtnLabel}\" iconClass=\"dojoxGridFBarClearFilterBtnIcon\" showLabel=\"true\" \n\t\t\t\tdojoAttachEvent=\"onClick:_clearFilterDefDialog, onMouseEnter:_onEnterButton, onMouseLeave:_onLeaveButton, onMouseMove:_onMoveButton\"></span\n\t\t\t><span dojotype=\"dijit.form.Button\" class=\"dojoxGridFBarCloseBtn\" dojoAttachPoint=\"closeFilterBarButton\" \n\t\t\t\tlabel=\"${_closeFilterBarBtnLabel}\" iconClass=\"dojoxGridFBarCloseBtnIcon\" showLabel=\"false\" \n\t\t\t\tdojoAttachEvent=\"onClick:_closeFilterBar, onMouseEnter:_onEnterButton, onMouseLeave:_onLeaveButton, onMouseMove:_onMoveButton\"></span\n\t\t></span\n\t></td></tr\n></table>\n"),widgetsInTemplate:true,_timeout_statusTooltip:300,_handle_statusTooltip:null,_curColIdx:-1,plugin:null,postMixInProperties:function(){
var _5=this.plugin;
var _6=_5.nls;
this._filterBarDefBtnLabel=_6["filterBarDefButton"];
this._filterBarClearBtnLabel=_6["filterBarClearButton"];
this._closeFilterBarBtnLabel=_6["closeFilterBarBtn"];
var _7=_5.args.itemsName||_6["defaultItemsName"];
this._noFilterMsg=dojo.string.substitute(_6["filterBarMsgNoFilterTemplate"],["",_7]);
var t=this.plugin.args.statusTipTimeout;
if(typeof t=="number"){
this._timeout_statusTooltip=t;
}
var g=_5.grid;
g.showFilterBar=dojo.hitch(this,"showFilterBar");
g.toggleFilterBar=dojo.hitch(this,"toggleFilterBar");
g.isFilterBarShown=dojo.hitch(this,"isFilterBarShown");
},postCreate:function(){
this.inherited(arguments);
if(!this.plugin.args.closeFilterbarButton){
dojo.style(this.closeFilterBarButton.domNode,"display","none");
}
var _8=this,g=this.plugin.grid,_9=this.oldGetHeaderHeight=dojo.hitch(g,g._getHeaderHeight);
this.placeAt(g.viewsHeaderNode,"after");
this.connect(this.plugin.filterDefDialog,"showDialog","_onShowFilterDefDialog");
this.connect(this.plugin.filterDefDialog,"closeDialog","_onCloseFilterDefDialog");
this.connect(g.layer("filter"),"onFiltered",this._onFiltered);
this.defineFilterButton.domNode.title=this.plugin.nls["filterBarDefButton"];
if(dojo.hasClass(dojo.body(),"dijit_a11y")){
this.defineFilterButton.set("label",this.plugin.nls["a11yFilterBarDefButton"]);
}
this.connect(this.defineFilterButton.domNode,"click",_3);
this.connect(this.clearFilterButton.domNode,"click",_3);
this.connect(this.closeFilterBarButton.domNode,"click",_3);
this.toggleClearFilterBtn(true);
this._initAriaInfo();
g._getHeaderHeight=function(){
return _9()+dojo.marginBox(_8.domNode).h;
};
g.focus.addArea({name:"filterbar",onFocus:dojo.hitch(this,this._onFocusFilterBar,false),onBlur:dojo.hitch(this,this._onBlurFilterBar)});
g.focus.placeArea("filterbar","after","header");
},uninitialize:function(){
var g=this.plugin.grid;
g._getHeaderHeight=this.oldGetHeaderHeight;
g.focus.removeArea("filterbar");
this.plugin=null;
},isFilterBarShown:function(){
return dojo.style(this.domNode,"display")!="none";
},showFilterBar:function(_a,_b,_c){
var g=this.plugin.grid;
if(_b){
if(Boolean(_a)==this.isFilterBarShown()){
return;
}
_c=_c||{};
var _d=[],_e=500;
_d.push(dojo.fx[_a?"wipeIn":"wipeOut"](dojo.mixin({"node":this.domNode,"duration":_e},_c)));
var _f=g.views.views[0].domNode.offsetHeight;
var _10={"duration":_e,"properties":{"height":{"end":dojo.hitch(this,function(){
var _11=this.domNode.scrollHeight;
if(dojo.isFF){
_11-=2;
}
return _a?(_f-_11):(_f+_11);
})}}};
dojo.forEach(g.views.views,function(_12){
_d.push(dojo.animateProperty(dojo.mixin({"node":_12.domNode},_10,_c)),dojo.animateProperty(dojo.mixin({"node":_12.scrollboxNode},_10,_c)));
});
_d.push(dojo.animateProperty(dojo.mixin({"node":g.viewsNode},_10,_c)));
dojo.fx.combine(_d).play();
}else{
dojo.style(this.domNode,"display",_a?"":"none");
g.update();
}
},toggleFilterBar:function(_13,_14){
this.showFilterBar(!this.isFilterBarShown(),_13,_14);
},getColumnIdx:function(_15){
var _16=dojo.query("[role='columnheader']",this.plugin.grid.viewsHeaderNode);
var idx=-1;
for(var i=_16.length-1;i>=0;--i){
var _17=dojo.coords(_16[i]);
if(_15>=_17.x&&_15<_17.x+_17.w){
idx=i;
break;
}
}
if(idx>=0&&this.plugin.grid.layout.cells[idx].filterable!==false){
return idx;
}else{
return -1;
}
},toggleClearFilterBtn:function(_18){
dojo.style(this.clearFilterButton.domNode,"display",_18?"none":"");
},_closeFilterBar:function(e){
_3(e);
var _19=this.plugin.filterDefDialog.getCriteria();
if(_19){
var _1a=dojo.connect(this.plugin.filterDefDialog,"clearFilter",this,function(){
this.showFilterBar(false,true);
dojo.disconnect(_1a);
});
this._clearFilterDefDialog(e);
}else{
this.showFilterBar(false,true);
}
},_showFilterDefDialog:function(e){
_3(e);
this.plugin.filterDefDialog.showDialog(this._curColIdx);
this.plugin.grid.focus.focusArea("filterbar");
},_clearFilterDefDialog:function(e){
_3(e);
this.plugin.filterDefDialog.onClearFilter();
this.plugin.grid.focus.focusArea("filterbar");
},_onEnterButton:function(e){
this._onBlurFilterBar();
_3(e);
},_onMoveButton:function(e){
this._onBlurFilterBar();
},_onLeaveButton:function(e){
this._leavingBtn=true;
},_onShowFilterDefDialog:function(_1b){
if(typeof _1b=="number"){
this._curColIdx=_1b;
}
this._defPaneIsShown=true;
},_onCloseFilterDefDialog:function(){
this._defPaneIsShown=false;
this._curColIdx=-1;
dijit.focus(this.defineFilterButton.domNode);
},_onClickFilterBar:function(e){
_3(e);
this._clearStatusTipTimeout();
this.plugin.grid.focus.focusArea("filterbar");
this.plugin.filterDefDialog.showDialog(this.getColumnIdx(e.clientX));
},_onMouseEnter:function(e){
this._onFocusFilterBar(true,null);
this._updateTipPosition(e);
this._setStatusTipTimeout();
},_onMouseMove:function(e){
if(this._leavingBtn){
this._onFocusFilterBar(true,null);
this._leavingBtn=false;
}
if(this._isFocused){
this._setStatusTipTimeout();
this._highlightHeader(this.getColumnIdx(e.clientX));
if(this._handle_statusTooltip){
this._updateTipPosition(e);
}
}
},_onMouseLeave:function(e){
this._onBlurFilterBar();
},_updateTipPosition:function(evt){
this._tippos={x:evt.pageX,y:evt.pageY};
},_onFocusFilterBar:function(_1c,evt,_1d){
if(!this.isFilterBarShown()){
return false;
}
this._isFocused=true;
dojo.addClass(this.domNode,_1);
if(!_1c){
var _1e=dojo.style(this.clearFilterButton.domNode,"display")!=="none";
var _1f=dojo.style(this.closeFilterBarButton.domNode,"display")!=="none";
if(typeof this._focusPos=="undefined"){
if(_1d>0){
this._focusPos=0;
}else{
if(_1f){
this._focusPos=1;
}else{
this._focusPos=0;
}
if(_1e){
++this._focusPos;
}
}
}
if(this._focusPos===0){
dijit.focus(this.defineFilterButton.focusNode);
}else{
if(this._focusPos===1&&_1e){
dijit.focus(this.clearFilterButton.focusNode);
}else{
dijit.focus(this.closeFilterBarButton.focusNode);
}
}
}
_3(evt);
return true;
},_onBlurFilterBar:function(evt,_20){
if(this._isFocused){
this._isFocused=false;
dojo.removeClass(this.domNode,_1);
this._clearStatusTipTimeout();
this._clearHeaderHighlight();
}
var _21=true;
if(_20){
var _22=3;
if(dojo.style(this.closeFilterBarButton.domNode,"display")==="none"){
--_22;
}
if(dojo.style(this.clearFilterButton.domNode,"display")==="none"){
--_22;
}
if(_22==1){
delete this._focusPos;
}else{
var _23=this._focusPos;
for(var _24=_23+_20;_24<0;_24+=_22){
}
_24%=_22;
if((_20>0&&_24<_23)||(_20<0&&_24>_23)){
delete this._focusPos;
}else{
this._focusPos=_24;
_21=false;
}
}
}
return _21;
},_onFiltered:function(_25,_26){
var p=this.plugin,_27=p.args.itemsName||p.nls["defaultItemsName"],msg="",g=p.grid,_28=g.layer("filter");
if(_28.filterDef()){
msg=dojo.string.substitute(p.nls["filterBarMsgHasFilterTemplate"],[_25,_26,_27]);
dojo.addClass(this.domNode,_2);
}else{
msg=dojo.string.substitute(p.nls["filterBarMsgNoFilterTemplate"],[_26,_27]);
dojo.removeClass(this.domNode,_2);
}
this.statusBarNode.innerHTML=msg;
this._focusPos=0;
},_initAriaInfo:function(){
dijit.setWaiState(this.defineFilterButton.domNode,"label",this.plugin.nls["waiFilterBarDefButton"]);
dijit.setWaiState(this.clearFilterButton.domNode,"label",this.plugin.nls["waiFilterBarClearButton"]);
},_isInColumn:function(_29,_2a,_2b){
var _2c=dojo.coords(_2a);
return _29>=_2c.x&&_29<_2c.x+_2c.w;
},_setStatusTipTimeout:function(){
this._clearStatusTipTimeout();
if(!this._defPaneIsShown){
this._handle_statusTooltip=setTimeout(dojo.hitch(this,this._showStatusTooltip),this._timeout_statusTooltip);
}
},_clearStatusTipTimeout:function(){
clearTimeout(this._handle_statusTooltip);
this._handle_statusTooltip=null;
},_showStatusTooltip:function(){
this._handle_statusTooltip=null;
this.plugin.filterStatusTip.showDialog(this._tippos.x,this._tippos.y,this.getColumnIdx(this._tippos.x));
},_highlightHeader:function(_2d){
if(_2d!=this._previousHeaderIdx){
var g=this.plugin.grid,_2e=g.getCell(this._previousHeaderIdx);
if(_2e){
dojo.removeClass(_2e.getHeaderNode(),"dojoxGridCellOver");
}
_2e=g.getCell(_2d);
if(_2e){
dojo.addClass(_2e.getHeaderNode(),"dojoxGridCellOver");
}
this._previousHeaderIdx=_2d;
}
},_clearHeaderHighlight:function(){
if(typeof this._previousHeaderIdx!="undefined"){
var g=this.plugin.grid,_2f=g.getCell(this._previousHeaderIdx);
if(_2f){
g.onHeaderCellMouseOut({cellNode:_2f.getHeaderNode()});
}
delete this._previousHeaderIdx;
}
}});
})();
}
