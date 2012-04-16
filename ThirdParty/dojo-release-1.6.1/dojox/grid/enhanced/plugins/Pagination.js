/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.Pagination"]){
dojo._hasResource["dojox.grid.enhanced.plugins.Pagination"]=true;
dojo.provide("dojox.grid.enhanced.plugins.Pagination");
dojo.require("dijit.form.NumberTextBox");
dojo.require("dijit.form.Button");
dojo.require("dojox.grid.enhanced._Plugin");
dojo.require("dojox.grid.enhanced.plugins.Dialog");
dojo.require("dojox.grid.enhanced.plugins._StoreLayer");
dojo.requireLocalization("dojox.grid.enhanced","Pagination",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hr,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dojox.grid.enhanced.plugins.Pagination",dojox.grid.enhanced._Plugin,{name:"pagination",pageSize:25,defaultRows:25,_currentPage:0,_maxSize:0,init:function(){
this.gh=null;
this.grid.rowsPerPage=this.pageSize=this.grid.rowsPerPage?this.grid.rowsPerPage:this.pageSize;
this.grid.usingPagination=true;
this.nls=dojo.i18n.getLocalization("dojox.grid.enhanced","Pagination");
this._wrapStoreLayer();
this._createPaginators(this.option);
this._regApis();
},_createPaginators:function(_1){
this.paginators=[];
if(_1.position==="both"){
this.paginators=[new dojox.grid.enhanced.plugins._Paginator(dojo.mixin(_1,{position:"bottom",plugin:this})),new dojox.grid.enhanced.plugins._Paginator(dojo.mixin(_1,{position:"top",plugin:this}))];
}else{
this.paginators=[new dojox.grid.enhanced.plugins._Paginator(dojo.mixin(_1,{plugin:this}))];
}
},_wrapStoreLayer:function(){
var g=this.grid,ns=dojox.grid.enhanced.plugins;
this._store=g.store;
this.query=g.query;
this.forcePageStoreLayer=new ns._ForcedPageStoreLayer(this);
ns.wrap(g,"_storeLayerFetch",this.forcePageStoreLayer);
this.connect(g,"setQuery",function(_2){
if(_2!==this.query){
this.query=_2;
}
});
},_stopEvent:function(_3){
try{
dojo.stopEvent(_3);
}
catch(e){
}
},_onNew:function(_4,_5){
var _6=Math.ceil(this._maxSize/this.pageSize);
if(((this._currentPage+1===_6||_6===0)&&this.grid.rowCount<this.pageSize)||this.showAll){
dojo.hitch(this.grid,this._originalOnNew)(_4,_5);
this.forcePageStoreLayer.endIdx++;
}
this._maxSize++;
if(this.showAll){
this.pageSize++;
}
if(this.showAll&&this.grid.autoHeight){
this.grid._refresh();
}else{
dojo.forEach(this.paginators,function(p){
p.update();
});
}
},_removeSelectedRows:function(){
this._multiRemoving=true;
this._originalRemove();
this._multiRemoving=false;
this.grid.resize();
this.grid._refresh();
},_onDelete:function(){
if(!this._multiRemoving){
this.grid.resize();
if(this.showAll){
this.grid._refresh();
}
}
if(this.grid.get("rowCount")===0){
this.prevPage();
}
},_regApis:function(){
var g=this.grid;
g.gotoPage=dojo.hitch(this,this.gotoPage);
g.nextPage=dojo.hitch(this,this.nextPage);
g.prevPage=dojo.hitch(this,this.prevPage);
g.gotoFirstPage=dojo.hitch(this,this.gotoFirstPage);
g.gotoLastPage=dojo.hitch(this,this.gotoLastPage);
g.changePageSize=dojo.hitch(this,this.changePageSize);
g.showGotoPageButton=dojo.hitch(this,this.showGotoPageButton);
g.getTotalRowCount=dojo.hitch(this,this.getTotalRowCount);
this.originalScrollToRow=dojo.hitch(g,g.scrollToRow);
g.scrollToRow=dojo.hitch(this,this.scrollToRow);
this._originalOnNew=dojo.hitch(g,g._onNew);
this._originalRemove=dojo.hitch(g,g.removeSelectedRows);
g.removeSelectedRows=dojo.hitch(this,this._removeSelectedRows);
g._onNew=dojo.hitch(this,this._onNew);
this.connect(g,"_onDelete",dojo.hitch(this,this._onDelete));
},destroy:function(){
this.inherited(arguments);
var g=this.grid;
try{
dojo.forEach(this.paginators,function(p){
p.destroy();
});
g.unwrap(this.forcePageStoreLayer.name());
g._onNew=this._originalOnNew;
g.removeSelectedRows=this._originalRemove;
g.scrollToRow=this.originalScrollToRow;
this.paginators=null;
this.nls=null;
}
catch(e){
console.warn("Pagination.destroy() error: ",e);
}
},nextPage:function(){
if(this._maxSize>((this._currentPage+1)*this.pageSize)){
this.gotoPage(this._currentPage+2);
}
},prevPage:function(){
if(this._currentPage>0){
this.gotoPage(this._currentPage);
}
},gotoPage:function(_7){
var _8=Math.ceil(this._maxSize/this.pageSize);
_7--;
if(_7<_8&&_7>=0&&this._currentPage!==_7){
this._currentPage=_7;
this.grid.setQuery(this.query);
this.grid.resize();
}
},gotoFirstPage:function(){
this.gotoPage(1);
},gotoLastPage:function(){
var _9=Math.ceil(this._maxSize/this.pageSize);
this.gotoPage(_9);
},changePageSize:function(_a){
if(typeof _a=="string"){
_a=parseInt(_a,10);
}
var _b=this.pageSize*this._currentPage;
dojo.forEach(this.paginators,function(f){
f.currentPageSize=this.grid.rowsPerPage=this.pageSize=_a;
if(_a>=this._maxSize){
this.grid.rowsPerPage=this.defaultRows;
this.grid.usingPagination=false;
}else{
this.grid.usingPagination=true;
}
},this);
var _c=_b+Math.min(this.pageSize,this._maxSize);
if(_c>this._maxSize){
this.gotoLastPage();
}else{
var cp=Math.ceil(_b/this.pageSize);
if(cp!==this._currentPage){
this.gotoPage(cp+1);
}else{
this.grid._refresh(true);
}
}
this.grid.resize();
},showGotoPageButton:function(_d){
dojo.forEach(this.paginators,function(p){
p._showGotoButton(_d);
});
},scrollToRow:function(_e){
var _f=parseInt(_e/this.pageSize,10),_10=Math.ceil(this._maxSize/this.pageSize);
if(_f>_10){
return;
}
this.gotoPage(_f+1);
var _11=_e%this.pageSize;
this.grid.setScrollTop(this.grid.scroller.findScrollTop(_11)+1);
},getTotalRowCount:function(){
return this._maxSize;
}});
dojo.declare("dojox.grid.enhanced.plugins._ForcedPageStoreLayer",dojox.grid.enhanced.plugins._StoreLayer,{tags:["presentation"],constructor:function(_12){
this._plugin=_12;
},_fetch:function(_13){
var _14=this,_15=_14._plugin,_16=_15.grid,_17=_13.scope||dojo.global,_18=_13.onBegin;
_13.start=_15._currentPage*_15.pageSize+_13.start;
_14.startIdx=_13.start;
_14.endIdx=_13.start+_15.pageSize-1;
if(_18&&(_15.showAll||dojo.every(_15.paginators,function(p){
return _15.showAll=!p.sizeSwitch&&!p.pageStepper&&!p.gotoButton;
}))){
_13.onBegin=function(_19,req){
_15._maxSize=_15.pageSize=_19;
_14.startIdx=0;
_14.endIdx=_19-1;
dojo.forEach(_15.paginators,function(f){
f.update();
});
req.onBegin=_18;
req.onBegin.call(_17,_19,req);
};
}else{
if(_18){
_13.onBegin=function(_1a,req){
req.start=0;
req.count=_15.pageSize;
_15._maxSize=_1a;
_14.endIdx=_14.endIdx>=_1a?(_1a-1):_14.endIdx;
if(_14.startIdx>_1a&&_1a!==0){
_16._pending_requests[req.start]=false;
_15.gotoFirstPage();
}
dojo.forEach(_15.paginators,function(f){
f.update();
});
req.onBegin=_18;
req.onBegin.call(_17,Math.min(_15.pageSize,(_1a-_14.startIdx)),req);
};
}
}
return dojo.hitch(this._store,this._originFetch)(_13);
}});
dojo.declare("dojox.grid.enhanced.plugins._Paginator",[dijit._Widget,dijit._Templated],{templateString:"<div dojoAttachPoint=\"paginatorBar\">\n\t<table cellpadding=\"0\" cellspacing=\"0\"  class=\"dojoxGridPaginator\">\n\t\t<tr>\n\t\t\t<td dojoAttachPoint=\"descriptionTd\" class=\"dojoxGridDescriptionTd\">\n\t\t\t\t<div dojoAttachPoint=\"descriptionDiv\" class=\"dojoxGridDescription\" />\n\t\t\t</td>\n\t\t\t<td dojoAttachPoint=\"sizeSwitchTd\"></td>\n\t\t\t<td dojoAttachPoint=\"pageStepperTd\" class=\"dojoxGridPaginatorFastStep\">\n\t\t\t\t<div dojoAttachPoint=\"pageStepperDiv\" class=\"dojoxGridPaginatorStep\"></div>\n\t\t\t</td>\n\t\t</tr>\n\t</table>\n</div>\n",position:"bottom",_maxItemSize:0,description:true,pageStepper:true,maxPageStep:7,sizeSwitch:true,pageSizes:["10","25","50","100","All"],gotoButton:false,constructor:function(_1b){
dojo.mixin(this,_1b);
this.grid=this.plugin.grid;
this.itemTitle=this.itemTitle?this.itemTitle:this.plugin.nls.itemTitle;
this.descTemplate=this.descTemplate?this.descTemplate:this.plugin.nls.descTemplate;
},postCreate:function(){
this.inherited(arguments);
this._setWidthValue();
var _1c=this;
var g=this.grid;
this.plugin.connect(g,"_resize",dojo.hitch(this,"_resetGridHeight"));
this._originalResize=dojo.hitch(g,"resize");
g.resize=function(_1d,_1e){
_1c._changeSize=g._pendingChangeSize=_1d;
_1c._resultSize=g._pendingResultSize=_1e;
g.sizeChange();
};
this._placeSelf();
},destroy:function(){
this.inherited(arguments);
this.grid.focus.removeArea("pagination"+this.position.toLowerCase());
if(this._gotoPageDialog){
this._gotoPageDialog.destroy();
dojo.destroy(this.gotoPageTd);
delete this.gotoPageTd;
delete this._gotoPageDialog;
}
this.grid.resize=this._originalResize;
this.pageSizes=null;
},update:function(){
this.currentPageSize=this.plugin.pageSize;
this._maxItemSize=this.plugin._maxSize;
this._updateDescription();
this._updatePageStepper();
this._updateSizeSwitch();
this._updateGotoButton();
},_setWidthValue:function(){
var _1f=["description","sizeSwitch","pageStepper"];
var _20=function(_21,_22){
var reg=new RegExp(_22+"$");
return reg.test(_21);
};
dojo.forEach(_1f,function(t){
var _23,_24=this[t];
if(_24===undefined||typeof _24=="boolean"){
return;
}
if(dojo.isString(_24)){
_23=_20(_24,"px")||_20(_24,"%")||_20(_24,"em")?_24:parseInt(_24,10)>0?parseInt(_24,10)+"px":null;
}else{
if(typeof _24==="number"&&_24>0){
_23=_24+"px";
}
}
this[t]=_23?true:false;
this[t+"Width"]=_23;
},this);
},_regFocusMgr:function(_25){
this.grid.focus.addArea({name:"pagination"+_25,onFocus:dojo.hitch(this,this._onFocusPaginator),onBlur:dojo.hitch(this,this._onBlurPaginator),onMove:dojo.hitch(this,this._moveFocus),onKeyDown:dojo.hitch(this,this._onKeyDown)});
switch(_25){
case "top":
this.grid.focus.placeArea("pagination"+_25,"before","header");
break;
case "bottom":
default:
this.grid.focus.placeArea("pagination"+_25,"after","content");
break;
}
},_placeSelf:function(){
var g=this.grid;
var _26=dojo.trim(this.position.toLowerCase());
switch(_26){
case "top":
this.placeAt(g.viewsHeaderNode,"before");
this._regFocusMgr("top");
break;
case "bottom":
default:
this.placeAt(g.viewsNode,"after");
this._regFocusMgr("bottom");
break;
}
},_resetGridHeight:function(_27,_28){
var g=this.grid;
_27=_27||this._changeSize;
_28=_28||this._resultSize;
delete this._changeSize;
delete this._resultSize;
if(g._autoHeight){
return;
}
var _29=g._getPadBorder().h;
if(!this.plugin.gh){
this.plugin.gh=dojo.contentBox(g.domNode).h+2*_29;
}
if(_28){
_27=_28;
}
if(_27){
this.plugin.gh=dojo.contentBox(g.domNode).h+2*_29;
}
var gh=this.plugin.gh,hh=g._getHeaderHeight(),ph=dojo.marginBox(this.domNode).h;
ph=this.plugin.paginators[1]?ph*2:ph;
if(typeof g.autoHeight=="number"){
var cgh=gh+ph-_29;
dojo.style(g.domNode,"height",cgh+"px");
dojo.style(g.viewsNode,"height",(cgh-ph-hh)+"px");
this._styleMsgNode(hh,dojo.marginBox(g.viewsNode).w,cgh-ph-hh);
}else{
var h=gh-ph-hh-_29;
dojo.style(g.viewsNode,"height",h+"px");
var _2a=dojo.some(g.views.views,function(v){
return v.hasHScrollbar();
});
dojo.forEach(g.viewsNode.childNodes,function(c,idx){
dojo.style(c,"height",h+"px");
});
dojo.forEach(g.views.views,function(v,idx){
if(v.scrollboxNode){
if(!v.hasHScrollbar()&&_2a){
dojo.style(v.scrollboxNode,"height",(h-dojox.html.metrics.getScrollbar().h)+"px");
}else{
dojo.style(v.scrollboxNode,"height",h+"px");
}
}
});
this._styleMsgNode(hh,dojo.marginBox(g.viewsNode).w,h);
}
},_styleMsgNode:function(top,_2b,_2c){
var _2d=this.grid.messagesNode;
dojo.style(_2d,{"position":"absolute","top":top+"px","width":_2b+"px","height":_2c+"px","z-Index":"100"});
},_updateDescription:function(){
var s=this.plugin.forcePageStoreLayer;
if(this.description&&this.descriptionDiv){
this.descriptionDiv.innerHTML=this._maxItemSize>0?dojo.string.substitute(this.descTemplate,[this.itemTitle,this._maxItemSize,s.startIdx+1,s.endIdx+1]):"0 "+this.itemTitle;
}
if(this.descriptionWidth){
dojo.style(this.descriptionTd,"width",this.descriptionWidth);
}
},_updateSizeSwitch:function(){
if(!this.sizeSwitchTd){
return;
}
if(!this.sizeSwitch||this._maxItemSize<=0){
dojo.style(this.sizeSwitchTd,"display","none");
return;
}else{
dojo.style(this.sizeSwitchTd,"display","");
}
if(this.initializedSizeNode&&!this.pageSizeValue){
return;
}
if(this.sizeSwitchTd.childNodes.length<1){
this._createSizeSwitchNodes();
}
this._updateSwitchNodeClass();
this._moveToNextActivableNode(this._getAllPageSizeNodes(),this.pageSizeValue);
this.pageSizeValue=null;
},_createSizeSwitchNodes:function(){
var _2e=null;
if(!this.pageSizes||this.pageSizes.length<1){
return;
}
dojo.forEach(this.pageSizes,function(_2f){
_2f=dojo.trim(_2f);
var _30=_2f.toLowerCase()=="all"?this.plugin.nls.allItemsLabelTemplate:dojo.string.substitute(this.plugin.nls.pageSizeLabelTemplate,[_2f]);
_2e=dojo.create("span",{innerHTML:_2f,title:_30,value:_2f,tabindex:0},this.sizeSwitchTd,"last");
dijit.setWaiState(_2e,"label",_30);
this.plugin.connect(_2e,"onclick",dojo.hitch(this,"_onSwitchPageSize"));
this.plugin.connect(_2e,"onmouseover",function(e){
dojo.addClass(e.target,"dojoxGridPageTextHover");
});
this.plugin.connect(_2e,"onmouseout",function(e){
dojo.removeClass(e.target,"dojoxGridPageTextHover");
});
_2e=dojo.create("span",{innerHTML:"|"},this.sizeSwitchTd,"last");
dojo.addClass(_2e,"dojoxGridSeparator");
},this);
dojo.destroy(_2e);
this.initializedSizeNode=true;
if(this.sizeSwitchWidth){
dojo.style(this.sizeSwitchTd,"width",this.sizeSwitchWidth);
}
},_updateSwitchNodeClass:function(){
var _31=null;
var _32=false;
var _33=function(_34,_35){
if(_35){
dojo.addClass(_34,"dojoxGridActivedSwitch");
dojo.attr(_34,"tabindex","-1");
_32=true;
}else{
dojo.addClass(_34,"dojoxGridInactiveSwitch");
dojo.attr(_34,"tabindex","0");
}
};
dojo.forEach(this.sizeSwitchTd.childNodes,function(_36){
if(_36.value){
_31=_36.value;
dojo.removeClass(_36);
if(this.pageSizeValue){
_33(_36,_31===this.pageSizeValue&&!_32);
}else{
if(_31.toLowerCase()=="all"){
_31=this._maxItemSize;
}
_33(_36,this.currentPageSize===parseInt(_31,10)&&!_32);
}
}
},this);
},_updatePageStepper:function(){
if(!this.pageStepperTd){
return;
}
if(!this.pageStepper||this._maxItemSize<=0){
dojo.style(this.pageStepperTd,"display","none");
return;
}else{
dojo.style(this.pageStepperTd,"display","");
}
if(this.pageStepperDiv.childNodes.length<1){
this._createPageStepNodes();
this._createWardBtns();
}else{
this._resetPageStepNodes();
}
this._updatePageStepNodeClass();
this._moveToNextActivableNode(this._getAllPageStepNodes(),this.pageStepValue);
this.pageStepValue=null;
},_createPageStepNodes:function(){
var _37=this._getStartPage(),_38=this._getStepPageSize(),_39="",_3a=null;
for(var i=_37;i<this.maxPageStep+1;i++){
_39=dojo.string.substitute(this.plugin.nls.pageStepLabelTemplate,[i+""]);
_3a=dojo.create("div",{innerHTML:i,value:i,title:_39,tabindex:i<_37+_38?0:-1},this.pageStepperDiv,"last");
dijit.setWaiState(_3a,"label",_39);
this.plugin.connect(_3a,"onclick",dojo.hitch(this,"_onPageStep"));
this.plugin.connect(_3a,"onmouseover",function(e){
dojo.addClass(e.target,"dojoxGridPageTextHover");
});
this.plugin.connect(_3a,"onmouseout",function(e){
dojo.removeClass(e.target,"dojoxGridPageTextHover");
});
dojo.style(_3a,"display",i<_37+_38?"block":"none");
}
if(this.pageStepperWidth){
dojo.style(this.pageStepperTd,"width",this.pageStepperWidth);
}
},_createWardBtns:function(){
var _3b=this;
var _3c={prevPage:"&#60;",firstPage:"&#171;",nextPage:"&#62;",lastPage:"&#187;"};
var _3d=function(_3e,_3f,_40){
var _41=dojo.create("div",{value:_3e,title:_3f,tabindex:1},_3b.pageStepperDiv,_40);
_3b.plugin.connect(_41,"onclick",dojo.hitch(_3b,"_onPageStep"));
dijit.setWaiState(_41,"label",_3f);
var _42=dojo.create("span",{value:_3e,title:_3f,innerHTML:_3c[_3e]},_41,_40);
dojo.addClass(_42,"dojoxGridWardButtonInner");
};
_3d("prevPage",this.plugin.nls.prevTip,"first");
_3d("firstPage",this.plugin.nls.firstTip,"first");
_3d("nextPage",this.plugin.nls.nextTip,"last");
_3d("lastPage",this.plugin.nls.lastTip,"last");
},_resetPageStepNodes:function(){
var _43=this._getStartPage(),_44=this._getStepPageSize(),_45=this.pageStepperDiv.childNodes,_46=null;
for(var i=_43,j=2;j<_45.length-2;j++,i++){
_46=_45[j];
if(i<_43+_44){
dojo.attr(_46,"innerHTML",i);
dojo.attr(_46,"value",i);
dojo.style(_46,"display","block");
dijit.setWaiState(_46,"label",dojo.string.substitute(this.plugin.nls.pageStepLabelTemplate,[i+""]));
}else{
dojo.style(_46,"display","none");
}
}
},_updatePageStepNodeClass:function(){
var _47=null,_48=this._getCurrentPageNo(),_49=this._getPageCount(),_4a=0;
var _4b=function(_4c,_4d,_4e){
var _4f=_4c.value,_50=_4d?"dojoxGrid"+_4f+"Btn":"dojoxGridInactived",_51=_4d?"dojoxGrid"+_4f+"BtnDisable":"dojoxGridActived";
if(_4e){
dojo.addClass(_4c,_51);
dojo.attr(_4c,"tabindex","-1");
}else{
dojo.addClass(_4c,_50);
dojo.attr(_4c,"tabindex","0");
}
};
dojo.forEach(this.pageStepperDiv.childNodes,function(_52){
dojo.removeClass(_52);
if(isNaN(parseInt(_52.value,10))){
dojo.addClass(_52,"dojoxGridWardButton");
var _53=_52.value=="prevPage"||_52.value=="firstPage"?1:_49;
_4b(_52,true,(_48==_53));
}else{
_47=parseInt(_52.value,10);
_4b(_52,false,(_47===_48||dojo.style(_52,"display")==="none"));
}
},this);
},_showGotoButton:function(_54){
this.gotoButton=_54;
this._updateGotoButton();
},_updateGotoButton:function(){
if(!this.gotoButton){
if(this.gotoPageTd){
if(this._gotoPageDialog){
this._gotoPageDialog.destroy();
}
dojo.destroy(this.gotoPageDiv);
dojo.destroy(this.gotoPageTd);
delete this.gotoPageDiv;
delete this.gotoPageTd;
}
return;
}
if(!this.gotoPageTd){
this._createGotoNode();
}
dojo.toggleClass(this.gotoPageDiv,"dojoxGridPaginatorGotoDivDisabled",this.plugin.pageSize>=this.plugin._maxSize);
},_createGotoNode:function(){
this.gotoPageTd=dojo.create("td",{},dojo.query("tr",this.domNode)[0],"last");
dojo.addClass(this.gotoPageTd,"dojoxGridPaginatorGotoTd");
this.gotoPageDiv=dojo.create("div",{tabindex:"0",title:this.plugin.nls.gotoButtonTitle},this.gotoPageTd,"first");
dojo.addClass(this.gotoPageDiv,"dojoxGridPaginatorGotoDiv");
this.plugin.connect(this.gotoPageDiv,"onclick",dojo.hitch(this,"_openGotopageDialog"));
var _55=dojo.create("span",{title:this.plugin.nls.gotoButtonTitle,innerHTML:"&#8869;"},this.gotoPageDiv,"last");
dojo.addClass(_55,"dojoxGridWardButtonInner");
},_openGotopageDialog:function(_56){
if(!this._gotoPageDialog){
this._gotoPageDialog=new dojox.grid.enhanced.plugins.pagination._GotoPageDialog(this.plugin);
}
if(!this._currentFocusNode){
this.grid.focus.focusArea("pagination"+this.position,_56);
}else{
this._currentFocusNode=this.gotoPageDiv;
}
if(this.focusArea!="pageStep"){
this.focusArea="pageStep";
}
this._gotoPageDialog.updatePageCount();
this._gotoPageDialog.showDialog();
},_onFocusPaginator:function(_57,_58){
if(!this._currentFocusNode){
if(_58>0){
return this._onFocusPageSizeNode(_57)?true:this._onFocusPageStepNode(_57);
}else{
if(_58<0){
return this._onFocusPageStepNode(_57)?true:this._onFocusPageSizeNode(_57);
}else{
return false;
}
}
}else{
if(_58>0){
return this.focusArea==="pageSize"?this._onFocusPageStepNode(_57):false;
}else{
if(_58<0){
return this.focusArea==="pageStep"?this._onFocusPageSizeNode(_57):false;
}else{
return false;
}
}
}
},_onFocusPageSizeNode:function(_59){
var _5a=this._getPageSizeActivableNodes();
if(_59&&_59.type!=="click"){
if(_5a[0]){
dijit.focus(_5a[0]);
this._currentFocusNode=_5a[0];
this.focusArea="pageSize";
this.plugin._stopEvent(_59);
return true;
}else{
return false;
}
}
if(_59&&_59.type=="click"){
if(dojo.indexOf(this._getPageSizeActivableNodes(),_59.target)>-1){
this.focusArea="pageSize";
this.plugin._stopEvent(_59);
return true;
}
}
return false;
},_onFocusPageStepNode:function(_5b){
var _5c=this._getPageStepActivableNodes();
if(_5b&&_5b.type!=="click"){
if(_5c[0]){
dijit.focus(_5c[0]);
this._currentFocusNode=_5c[0];
this.focusArea="pageStep";
this.plugin._stopEvent(_5b);
return true;
}else{
if(this.gotoPageDiv){
dijit.focus(this.gotoPageDiv);
this._currentFocusNode=this.gotoPageDiv;
this.focusArea="pageStep";
this.plugin._stopEvent(_5b);
return true;
}else{
return false;
}
}
}
if(_5b&&_5b.type=="click"){
if(dojo.indexOf(this._getPageStepActivableNodes(),_5b.target)>-1){
this.focusArea="pageStep";
this.plugin._stopEvent(_5b);
return true;
}else{
if(_5b.target==this.gotoPageDiv){
dijit.focus(this.gotoPageDiv);
this._currentFocusNode=this.gotoPageDiv;
this.focusArea="pageStep";
this.plugin._stopEvent(_5b);
return true;
}
}
}
return false;
},_onFocusGotoPageNode:function(_5d){
if(!this.gotoButton||!this.gotoPageTd){
return false;
}
if(_5d&&_5d.type!=="click"||(_5d.type=="click"&&_5d.target==this.gotoPageDiv)){
dijit.focus(this.gotoPageDiv);
this._currentFocusNode=this.gotoPageDiv;
this.focusArea="gotoButton";
this.plugin._stopEvent(_5d);
return true;
}
return true;
},_onBlurPaginator:function(_5e,_5f){
var _60=this._getPageSizeActivableNodes(),_61=this._getPageStepActivableNodes();
if(_5f>0&&this.focusArea==="pageSize"&&(_61.length>1||this.gotoButton)){
return false;
}else{
if(_5f<0&&this.focusArea==="pageStep"&&_60.length>1){
return false;
}
}
this._currentFocusNode=null;
this.focusArea=null;
return true;
},_onKeyDown:function(_62,_63){
if(_63){
return;
}
if(_62.altKey||_62.metaKey){
return;
}
var dk=dojo.keys;
if(_62.keyCode===dk.ENTER||_62.keyCode===dk.SPACE){
if(dojo.indexOf(this._getPageStepActivableNodes(),this._currentFocusNode)>-1){
this._onPageStep(_62);
}else{
if(dojo.indexOf(this._getPageSizeActivableNodes(),this._currentFocusNode)>-1){
this._onSwitchPageSize(_62);
}else{
if(this._currentFocusNode===this.gotoPageDiv){
this._openGotopageDialog(_62);
}
}
}
}
this.plugin._stopEvent(_62);
},_moveFocus:function(_64,_65,evt){
var _66;
if(this.focusArea=="pageSize"){
_66=this._getPageSizeActivableNodes();
}else{
if(this.focusArea=="pageStep"){
_66=this._getPageStepActivableNodes();
if(this.gotoPageDiv){
_66.push(this.gotoPageDiv);
}
}
}
if(_66.length<1){
return;
}
var _67=dojo.indexOf(_66,this._currentFocusNode);
var _68=_67+_65;
if(_68>=0&&_68<_66.length){
dijit.focus(_66[_68]);
this._currentFocusNode=_66[_68];
}
this.plugin._stopEvent(evt);
},_getPageSizeActivableNodes:function(){
return dojo.query("span[tabindex='0']",this.sizeSwitchTd);
},_getPageStepActivableNodes:function(){
return (dojo.query("div[tabindex='0']",this.pageStepperDiv));
},_getAllPageSizeNodes:function(){
var _69=[];
dojo.forEach(this.sizeSwitchTd.childNodes,function(_6a){
if(_6a.value){
_69.push(_6a);
}
});
return _69;
},_getAllPageStepNodes:function(){
var _6b=[];
for(var i=0,len=this.pageStepperDiv.childNodes.length;i<len;i++){
_6b.push(this.pageStepperDiv.childNodes[i]);
}
return _6b;
},_moveToNextActivableNode:function(_6c,_6d){
if(!_6d){
return;
}
if(_6c.length<2){
this.grid.focus.tab(1);
}
var nl=[],_6e=null,_6f=0;
dojo.forEach(_6c,function(n){
if(n.value==_6d){
nl.push(n);
_6e=n;
}else{
if(dojo.attr(n,"tabindex")=="0"){
nl.push(n);
}
}
});
if(nl.length<2){
this.grid.focus.tab(1);
}
_6f=dojo.indexOf(nl,_6e);
if(dojo.attr(_6e,"tabindex")!="0"){
_6e=nl[_6f+1]?nl[_6f+1]:nl[_6f-1];
}
dijit.focus(_6e);
this._currentFocusNode=_6e;
},_onSwitchPageSize:function(e){
var _70=this.pageSizeValue=e.target.value;
if(!_70){
return;
}
if(dojo.trim(_70.toLowerCase())=="all"){
_70=this._maxItemSize;
showAll=true;
}
this.plugin.grid.usingPagination=!this.plugin.showAll;
_70=parseInt(_70,10);
if(isNaN(_70)||_70<=0){
return;
}
if(!this._currentFocusNode){
this.grid.focus.currentArea("pagination"+this.position);
}
if(this.focusArea!="pageSize"){
this.focusArea="pageSize";
}
this.plugin.changePageSize(_70);
},_onPageStep:function(e){
var p=this.plugin,_71=this.pageStepValue=e.target.value;
if(!this._currentFocusNode){
this.grid.focus.currentArea("pagination"+this.position);
}
if(this.focusArea!="pageStep"){
this.focusArea="pageStep";
}
if(!isNaN(parseInt(_71,10))){
p.gotoPage(_71);
}else{
switch(e.target.value){
case "prevPage":
p.prevPage();
break;
case "nextPage":
p.nextPage();
break;
case "firstPage":
p.gotoFirstPage();
break;
case "lastPage":
p.gotoLastPage();
}
}
},_getCurrentPageNo:function(){
return this.plugin._currentPage+1;
},_getPageCount:function(){
if(!this._maxItemSize||!this.currentPageSize){
return 0;
}
return Math.ceil(this._maxItemSize/this.currentPageSize);
},_getStartPage:function(){
var cp=this._getCurrentPageNo();
var ms=parseInt(this.maxPageStep/2,10);
var pc=this._getPageCount();
if(cp<ms||(cp-ms)<1){
return 1;
}else{
if(pc<=this.maxPageStep){
return 1;
}else{
if(pc-cp<ms&&cp-this.maxPageStep>=0){
return pc-this.maxPageStep+1;
}else{
return (cp-ms);
}
}
}
},_getStepPageSize:function(){
var sp=this._getStartPage();
var _72=this._getPageCount();
if((sp+this.maxPageStep)>_72){
return _72-sp+1;
}else{
return this.maxPageStep;
}
}});
dojo.declare("dojox.grid.enhanced.plugins.pagination._GotoPageDialog",null,{pageCount:0,constructor:function(_73){
this.plugin=_73;
this.pageCount=this.plugin.paginators[0]._getPageCount();
this._dialogNode=dojo.create("div",{},dojo.body(),"last");
this._gotoPageDialog=new dojox.grid.enhanced.plugins.Dialog({"refNode":_73.grid.domNode,"title":this.plugin.nls.dialogTitle},this._dialogNode);
this._createDialogContent();
this._gotoPageDialog.startup();
},_createDialogContent:function(){
this._specifyNode=dojo.create("div",{innerHTML:this.plugin.nls.dialogIndication},this._gotoPageDialog.containerNode,"last");
this._pageInputDiv=dojo.create("div",{},this._gotoPageDialog.containerNode,"last");
this._pageTextBox=new dijit.form.NumberTextBox();
this._pageTextBox.constraints={fractional:false,min:1,max:this.pageCount};
this.plugin.connect(this._pageTextBox.textbox,"onkeyup",dojo.hitch(this,"_setConfirmBtnState"));
this._pageInputDiv.appendChild(this._pageTextBox.domNode);
this._pageLabel=dojo.create("label",{innerHTML:dojo.string.substitute(this.plugin.nls.pageCountIndication,[this.pageCount])},this._pageInputDiv,"last");
this._buttonDiv=dojo.create("div",{},this._gotoPageDialog.containerNode,"last");
this._confirmBtn=new dijit.form.Button({label:this.plugin.nls.dialogConfirm,onClick:dojo.hitch(this,this._onConfirm)});
this._confirmBtn.set("disabled",true);
this._cancelBtn=new dijit.form.Button({label:this.plugin.nls.dialogCancel,onClick:dojo.hitch(this,this._onCancel)});
this._buttonDiv.appendChild(this._confirmBtn.domNode);
this._buttonDiv.appendChild(this._cancelBtn.domNode);
this._styleContent();
this._gotoPageDialog.onCancel=dojo.hitch(this,this._onCancel);
this.plugin.connect(this._gotoPageDialog,"_onKey",dojo.hitch(this,"_onKeyDown"));
},_styleContent:function(){
dojo.addClass(this._specifyNode,"dojoxGridDialogMargin");
dojo.addClass(this._pageInputDiv,"dojoxGridDialogMargin");
dojo.addClass(this._buttonDiv,"dojoxGridDialogButton");
dojo.style(this._pageTextBox.domNode,"width","50px");
},updatePageCount:function(){
this.pageCount=this.plugin.paginators[0]._getPageCount();
this._pageTextBox.constraints={fractional:false,min:1,max:this.pageCount};
dojo.attr(this._pageLabel,"innerHTML",dojo.string.substitute(this.plugin.nls.pageCountIndication,[this.pageCount]));
},showDialog:function(){
this._gotoPageDialog.show();
},_onConfirm:function(_74){
if(this._pageTextBox.isValid()&&this._pageTextBox.getDisplayedValue()!==""){
this.plugin.gotoPage(this._pageTextBox.parse(this._pageTextBox.getDisplayedValue()));
this._gotoPageDialog.hide();
this._pageTextBox.reset();
}
this.plugin._stopEvent(_74);
},_onCancel:function(_75){
this._pageTextBox.reset();
this._gotoPageDialog.hide();
this.plugin._stopEvent(_75);
},_onKeyDown:function(_76){
if(_76.altKey||_76.metaKey){
return;
}
var dk=dojo.keys;
if(_76.keyCode===dk.ENTER){
this._onConfirm(_76);
}
},_setConfirmBtnState:function(){
if(this._pageTextBox.isValid()&&this._pageTextBox.getDisplayedValue()!==""){
this._confirmBtn.set("disabled",false);
}else{
this._confirmBtn.set("disabled",true);
}
},destroy:function(){
this._pageTextBox.destroy();
this._confirmBtn.destroy();
this._cancelBtn.destroy();
this._gotoPageDialog.destroy();
dojo.destroy(this._specifyNode);
dojo.destroy(this._pageInputDiv);
dojo.destroy(this._pageLabel);
dojo.destroy(this._buttonDiv);
dojo.destroy(this._dialogNode);
}});
dojox.grid.EnhancedGrid.registerPlugin(dojox.grid.enhanced.plugins.Pagination);
}
