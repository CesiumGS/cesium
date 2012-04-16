/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.RollingList"]){
dojo._hasResource["dojox.widget.RollingList"]=true;
dojo.provide("dojox.widget.RollingList");
dojo.experimental("dojox.widget.RollingList");
dojo.require("dojo.window");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit._Templated");
dojo.require("dijit._Contained");
dojo.require("dijit.layout._LayoutWidget");
dojo.require("dijit.Menu");
dojo.require("dijit.form.Button");
dojo.require("dojox.html.metrics");
dojo.require("dojo.i18n");
dojo.requireLocalization("dijit","common",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dojox.widget._RollingListPane",[dijit.layout.ContentPane,dijit._Templated,dijit._Contained],{templateString:"<div class=\"dojoxRollingListPane\"><table><tbody><tr><td dojoAttachPoint=\"containerNode\"></td></tr></tbody></div>",parentWidget:null,parentPane:null,store:null,items:null,query:null,queryOptions:null,_focusByNode:true,minWidth:0,_setContentAndScroll:function(_1,_2){
this._setContent(_1,_2);
this.parentWidget.scrollIntoView(this);
},_updateNodeWidth:function(n,_3){
n.style.width="";
var _4=dojo.marginBox(n).w;
if(_4<_3){
dojo.marginBox(n,{w:_3});
}
},_onMinWidthChange:function(v){
this._updateNodeWidth(this.domNode,v);
},_setMinWidthAttr:function(v){
if(v!==this.minWidth){
this.minWidth=v;
this._onMinWidthChange(v);
}
},startup:function(){
if(this._started){
return;
}
if(this.store&&this.store.getFeatures()["dojo.data.api.Notification"]){
window.setTimeout(dojo.hitch(this,function(){
this.connect(this.store,"onSet","_onSetItem");
this.connect(this.store,"onNew","_onNewItem");
this.connect(this.store,"onDelete","_onDeleteItem");
}),1);
}
this.connect(this.focusNode||this.domNode,"onkeypress","_focusKey");
this.parentWidget._updateClass(this.domNode,"Pane");
this.inherited(arguments);
this._onMinWidthChange(this.minWidth);
},_focusKey:function(e){
if(e.charOrCode==dojo.keys.BACKSPACE){
dojo.stopEvent(e);
return;
}else{
if(e.charOrCode==dojo.keys.LEFT_ARROW&&this.parentPane){
this.parentPane.focus();
this.parentWidget.scrollIntoView(this.parentPane);
}else{
if(e.charOrCode==dojo.keys.ENTER){
this.parentWidget._onExecute();
}
}
}
},focus:function(_5){
if(this.parentWidget._focusedPane!=this){
this.parentWidget._focusedPane=this;
this.parentWidget.scrollIntoView(this);
if(this._focusByNode&&(!this.parentWidget._savedFocus||_5)){
try{
(this.focusNode||this.domNode).focus();
}
catch(e){
}
}
}
},_onShow:function(){
if((this.store||this.items)&&((this.refreshOnShow&&this.domNode)||(!this.isLoaded&&this.domNode))){
this.refresh();
}
},_load:function(){
this.isLoaded=false;
if(this.items){
this._setContentAndScroll(this.onLoadStart(),true);
window.setTimeout(dojo.hitch(this,"_doQuery"),1);
}else{
this._doQuery();
}
},_doLoadItems:function(_6,_7){
var _8=0,_9=this.store;
dojo.forEach(_6,function(_a){
if(!_9.isItemLoaded(_a)){
_8++;
}
});
if(_8===0){
_7();
}else{
var _b=function(_c){
_8--;
if((_8)===0){
_7();
}
};
dojo.forEach(_6,function(_d){
if(!_9.isItemLoaded(_d)){
_9.loadItem({item:_d,onItem:_b});
}
});
}
},_doQuery:function(){
if(!this.domNode){
return;
}
var _e=this.parentWidget.preloadItems;
_e=(_e===true||(this.items&&this.items.length<=Number(_e)));
if(this.items&&_e){
this._doLoadItems(this.items,dojo.hitch(this,"onItems"));
}else{
if(this.items){
this.onItems();
}else{
this._setContentAndScroll(this.onFetchStart(),true);
this.store.fetch({query:this.query,onComplete:function(_f){
this.items=_f;
this.onItems();
},onError:function(e){
this._onError("Fetch",e);
},scope:this});
}
}
},_hasItem:function(_10){
var _11=this.items||[];
for(var i=0,_12;(_12=_11[i]);i++){
if(this.parentWidget._itemsMatch(_12,_10)){
return true;
}
}
return false;
},_onSetItem:function(_13,_14,_15,_16){
if(this._hasItem(_13)){
this.refresh();
}
},_onNewItem:function(_17,_18){
var sel;
if((!_18&&!this.parentPane)||(_18&&this.parentPane&&this.parentPane._hasItem(_18.item)&&(sel=this.parentPane._getSelected())&&this.parentWidget._itemsMatch(sel.item,_18.item))){
this.items.push(_17);
this.refresh();
}else{
if(_18&&this.parentPane&&this._hasItem(_18.item)){
this.refresh();
}
}
},_onDeleteItem:function(_19){
if(this._hasItem(_19)){
this.items=dojo.filter(this.items,function(i){
return (i!=_19);
});
this.refresh();
}
},onFetchStart:function(){
return this.loadingMessage;
},onFetchError:function(_1a){
return this.errorMessage;
},onLoadStart:function(){
return this.loadingMessage;
},onLoadError:function(_1b){
return this.errorMessage;
},onItems:function(){
if(!this.onLoadDeferred){
this.cancel();
this.onLoadDeferred=new dojo.Deferred(dojo.hitch(this,"cancel"));
}
this._onLoadHandler();
}});
dojo.declare("dojox.widget._RollingListGroupPane",[dojox.widget._RollingListPane],{templateString:"<div><div dojoAttachPoint=\"containerNode\"></div>"+"<div dojoAttachPoint=\"menuContainer\">"+"<div dojoAttachPoint=\"menuNode\"></div>"+"</div></div>",_menu:null,_setContent:function(_1c){
if(!this._menu){
this.inherited(arguments);
}
},_onMinWidthChange:function(v){
if(!this._menu){
return;
}
var _1d=dojo.marginBox(this.domNode).w;
var _1e=dojo.marginBox(this._menu.domNode).w;
this._updateNodeWidth(this._menu.domNode,v-(_1d-_1e));
},onItems:function(){
var _1f,_20=false;
if(this._menu){
_1f=this._getSelected();
this._menu.destroyRecursive();
}
this._menu=this._getMenu();
var _21,_22;
if(this.items.length){
dojo.forEach(this.items,function(_23){
_21=this.parentWidget._getMenuItemForItem(_23,this);
if(_21){
if(_1f&&this.parentWidget._itemsMatch(_21.item,_1f.item)){
_22=_21;
}
this._menu.addChild(_21);
}
},this);
}else{
_21=this.parentWidget._getMenuItemForItem(null,this);
if(_21){
this._menu.addChild(_21);
}
}
if(_22){
this._setSelected(_22);
if((_1f&&!_1f.children&&_22.children)||(_1f&&_1f.children&&!_22.children)){
var _24=this.parentWidget._getPaneForItem(_22.item,this,_22.children);
if(_24){
this.parentWidget.addChild(_24,this.getIndexInParent()+1);
}else{
this.parentWidget._removeAfter(this);
this.parentWidget._onItemClick(null,this,_22.item,_22.children);
}
}
}else{
if(_1f){
this.parentWidget._removeAfter(this);
}
}
this.containerNode.innerHTML="";
this.containerNode.appendChild(this._menu.domNode);
this.parentWidget.scrollIntoView(this);
this._checkScrollConnection(true);
this.inherited(arguments);
this._onMinWidthChange(this.minWidth);
},_checkScrollConnection:function(_25){
var _26=this.store;
if(this._scrollConn){
this.disconnect(this._scrollConn);
}
delete this._scrollConn;
if(!dojo.every(this.items,function(i){
return _26.isItemLoaded(i);
})){
if(_25){
this._loadVisibleItems();
}
this._scrollConn=this.connect(this.domNode,"onscroll","_onScrollPane");
}
},startup:function(){
this.inherited(arguments);
this.parentWidget._updateClass(this.domNode,"GroupPane");
},focus:function(_27){
if(this._menu){
if(this._pendingFocus){
this.disconnect(this._pendingFocus);
}
delete this._pendingFocus;
var _28=this._menu.focusedChild;
if(!_28){
var _29=dojo.query(".dojoxRollingListItemSelected",this.domNode)[0];
if(_29){
_28=dijit.byNode(_29);
}
}
if(!_28){
_28=this._menu.getChildren()[0]||this._menu;
}
this._focusByNode=false;
if(_28.focusNode){
if(!this.parentWidget._savedFocus||_27){
try{
_28.focusNode.focus();
}
catch(e){
}
}
window.setTimeout(function(){
try{
dojo.window.scrollIntoView(_28.focusNode);
}
catch(e){
}
},1);
}else{
if(_28.focus){
if(!this.parentWidget._savedFocus||_27){
_28.focus();
}
}else{
this._focusByNode=true;
}
}
this.inherited(arguments);
}else{
if(!this._pendingFocus){
this._pendingFocus=this.connect(this,"onItems","focus");
}
}
},_getMenu:function(){
var _2a=this;
var _2b=new dijit.Menu({parentMenu:this.parentPane?this.parentPane._menu:null,onCancel:function(_2c){
if(_2a.parentPane){
_2a.parentPane.focus(true);
}
},_moveToPopup:function(evt){
if(this.focusedChild&&!this.focusedChild.disabled){
this.focusedChild._onClick(evt);
}
}},this.menuNode);
this.connect(_2b,"onItemClick",function(_2d,evt){
if(_2d.disabled){
return;
}
evt.alreadySelected=dojo.hasClass(_2d.domNode,"dojoxRollingListItemSelected");
if(evt.alreadySelected&&((evt.type=="keypress"&&evt.charOrCode!=dojo.keys.ENTER)||(evt.type=="internal"))){
var p=this.parentWidget.getChildren()[this.getIndexInParent()+1];
if(p){
p.focus(true);
this.parentWidget.scrollIntoView(p);
}
}else{
this._setSelected(_2d,_2b);
this.parentWidget._onItemClick(evt,this,_2d.item,_2d.children);
if(evt.type=="keypress"&&evt.charOrCode==dojo.keys.ENTER){
this.parentWidget._onExecute();
}
}
});
if(!_2b._started){
_2b.startup();
}
return _2b;
},_onScrollPane:function(){
if(this._visibleLoadPending){
window.clearTimeout(this._visibleLoadPending);
}
this._visibleLoadPending=window.setTimeout(dojo.hitch(this,"_loadVisibleItems"),500);
},_loadVisibleItems:function(){
delete this._visibleLoadPending;
var _2e=this._menu;
if(!_2e){
return;
}
var _2f=_2e.getChildren();
if(!_2f||!_2f.length){
return;
}
var _30=function(n,m,pb){
var s=dojo.getComputedStyle(n);
var r=0;
if(m){
r+=dojo._getMarginExtents(n,s).t;
}
if(pb){
r+=dojo._getPadBorderExtents(n,s).t;
}
return r;
};
var _31=_30(this.domNode,false,true)+_30(this.containerNode,true,true)+_30(_2e.domNode,true,true)+_30(_2f[0].domNode,true,false);
var h=dojo.contentBox(this.domNode).h;
var _32=this.domNode.scrollTop-_31-(h/2);
var _33=_32+(3*h/2);
var _34=dojo.filter(_2f,function(c){
var cnt=c.domNode.offsetTop;
var s=c.store;
var i=c.item;
return (cnt>=_32&&cnt<=_33&&!s.isItemLoaded(i));
});
var _35=dojo.map(_34,function(c){
return c.item;
});
var _36=dojo.hitch(this,function(){
var _37=this._getSelected();
var _38;
dojo.forEach(_35,function(_39,idx){
var _3a=this.parentWidget._getMenuItemForItem(_39,this);
var _3b=_34[idx];
var _3c=_3b.getIndexInParent();
_2e.removeChild(_3b);
if(_3a){
if(_37&&this.parentWidget._itemsMatch(_3a.item,_37.item)){
_38=_3a;
}
_2e.addChild(_3a,_3c);
if(_2e.focusedChild==_3b){
_2e.focusChild(_3a);
}
}
_3b.destroy();
},this);
this._checkScrollConnection(false);
});
this._doLoadItems(_35,_36);
},_getSelected:function(_3d){
if(!_3d){
_3d=this._menu;
}
if(_3d){
var _3e=this._menu.getChildren();
for(var i=0,_3f;(_3f=_3e[i]);i++){
if(dojo.hasClass(_3f.domNode,"dojoxRollingListItemSelected")){
return _3f;
}
}
}
return null;
},_setSelected:function(_40,_41){
if(!_41){
_41=this._menu;
}
if(_41){
dojo.forEach(_41.getChildren(),function(i){
this.parentWidget._updateClass(i.domNode,"Item",{"Selected":(_40&&(i==_40&&!i.disabled))});
},this);
}
}});
dojo.declare("dojox.widget.RollingList",[dijit._Widget,dijit._Templated,dijit._Container],{templateString:dojo.cache("dojox.widget","RollingList/RollingList.html","<div class=\"dojoxRollingList ${className}\"\n\t><div class=\"dojoxRollingListContainer\" dojoAttachPoint=\"containerNode\" dojoAttachEvent=\"onkeypress:_onKey\"\n\t></div\n\t><div class=\"dojoxRollingListButtons\" dojoAttachPoint=\"buttonsNode\"\n        ><button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"okButton\"\n\t\t\t\tdojoAttachEvent=\"onClick:_onExecute\">${okButtonLabel}</button\n        ><button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"cancelButton\"\n\t\t\t\tdojoAttachEvent=\"onClick:_onCancel\">${cancelButtonLabel}</button\n\t></div\n></div>\n"),widgetsInTemplate:true,className:"",store:null,query:null,queryOptions:null,childrenAttrs:["children"],parentAttr:"",value:null,executeOnDblClick:true,preloadItems:false,showButtons:false,okButtonLabel:"",cancelButtonLabel:"",minPaneWidth:0,postMixInProperties:function(){
this.inherited(arguments);
var loc=dojo.i18n.getLocalization("dijit","common");
this.okButtonLabel=this.okButtonLabel||loc.buttonOk;
this.cancelButtonLabel=this.cancelButtonLabel||loc.buttonCancel;
},_setShowButtonsAttr:function(_42){
var _43=false;
if((this.showButtons!=_42&&this._started)||(this.showButtons==_42&&!this.started)){
_43=true;
}
dojo.toggleClass(this.domNode,"dojoxRollingListButtonsHidden",!_42);
this.showButtons=_42;
if(_43){
if(this._started){
this.layout();
}else{
window.setTimeout(dojo.hitch(this,"layout"),0);
}
}
},_itemsMatch:function(_44,_45){
if(!_44&&!_45){
return true;
}else{
if(!_44||!_45){
return false;
}
}
return (_44==_45||(this._isIdentity&&this.store.getIdentity(_44)==this.store.getIdentity(_45)));
},_removeAfter:function(idx){
if(typeof idx!="number"){
idx=this.getIndexOfChild(idx);
}
if(idx>=0){
dojo.forEach(this.getChildren(),function(c,i){
if(i>idx){
this.removeChild(c);
c.destroyRecursive();
}
},this);
}
var _46=this.getChildren(),_47=_46[_46.length-1];
var _48=null;
while(_47&&!_48){
var val=_47._getSelected?_47._getSelected():null;
if(val){
_48=val.item;
}
_47=_47.parentPane;
}
if(!this._setInProgress){
this._setValue(_48);
}
},addChild:function(_49,_4a){
if(_4a>0){
this._removeAfter(_4a-1);
}
this.inherited(arguments);
if(!_49._started){
_49.startup();
}
_49.attr("minWidth",this.minPaneWidth);
this.layout();
if(!this._savedFocus){
_49.focus();
}
},_setMinPaneWidthAttr:function(_4b){
if(_4b!==this.minPaneWidth){
this.minPaneWidth=_4b;
dojo.forEach(this.getChildren(),function(c){
c.attr("minWidth",_4b);
});
}
},_updateClass:function(_4c,_4d,_4e){
if(!this._declaredClasses){
this._declaredClasses=("dojoxRollingList "+this.className).split(" ");
}
dojo.forEach(this._declaredClasses,function(c){
if(c){
dojo.addClass(_4c,c+_4d);
for(var k in _4e||{}){
dojo.toggleClass(_4c,c+_4d+k,_4e[k]);
}
dojo.toggleClass(_4c,c+_4d+"FocusSelected",(dojo.hasClass(_4c,c+_4d+"Focus")&&dojo.hasClass(_4c,c+_4d+"Selected")));
dojo.toggleClass(_4c,c+_4d+"HoverSelected",(dojo.hasClass(_4c,c+_4d+"Hover")&&dojo.hasClass(_4c,c+_4d+"Selected")));
}
});
},scrollIntoView:function(_4f){
if(this._scrollingTimeout){
window.clearTimeout(this._scrollingTimeout);
}
delete this._scrollingTimeout;
this._scrollingTimeout=window.setTimeout(dojo.hitch(this,function(){
if(_4f.domNode){
dojo.window.scrollIntoView(_4f.domNode);
}
delete this._scrollingTimeout;
return;
}),1);
},resize:function(_50){
dijit.layout._LayoutWidget.prototype.resize.call(this,_50);
},layout:function(){
var _51=this.getChildren();
if(this._contentBox){
var bn=this.buttonsNode;
var _52=this._contentBox.h-dojo.marginBox(bn).h-dojox.html.metrics.getScrollbar().h;
dojo.forEach(_51,function(c){
dojo.marginBox(c.domNode,{h:_52});
});
}
if(this._focusedPane){
var foc=this._focusedPane;
delete this._focusedPane;
if(!this._savedFocus){
foc.focus();
}
}else{
if(_51&&_51.length){
if(!this._savedFocus){
_51[0].focus();
}
}
}
},_onChange:function(_53){
this.onChange(_53);
},_setValue:function(_54){
delete this._setInProgress;
if(!this._itemsMatch(this.value,_54)){
this.value=_54;
this._onChange(_54);
}
},_setValueAttr:function(_55){
if(this._itemsMatch(this.value,_55)&&!_55){
return;
}
if(this._setInProgress&&this._setInProgress===_55){
return;
}
this._setInProgress=_55;
if(!_55||!this.store.isItem(_55)){
var _56=this.getChildren()[0];
_56._setSelected(null);
this._onItemClick(null,_56,null,null);
return;
}
var _57=dojo.hitch(this,function(_58,_59){
var _5a=this.store,id;
if(this.parentAttr&&_5a.getFeatures()["dojo.data.api.Identity"]&&((id=this.store.getValue(_58,this.parentAttr))||id==="")){
var cb=function(i){
if(_5a.getIdentity(i)==_5a.getIdentity(_58)){
_59(null);
}else{
_59([i]);
}
};
if(id===""){
_59(null);
}else{
if(typeof id=="string"){
_5a.fetchItemByIdentity({identity:id,onItem:cb});
}else{
if(_5a.isItem(id)){
cb(id);
}
}
}
}else{
var _5b=this.childrenAttrs.length;
var _5c=[];
dojo.forEach(this.childrenAttrs,function(_5d){
var q={};
q[_5d]=_58;
_5a.fetch({query:q,scope:this,onComplete:function(_5e){
if(this._setInProgress!==_55){
return;
}
_5c=_5c.concat(_5e);
_5b--;
if(_5b===0){
_59(_5c);
}
}});
},this);
}
});
var _5f=dojo.hitch(this,function(_60,idx){
var set=_60[idx];
var _61=this.getChildren()[idx];
var _62;
if(set&&_61){
var fx=dojo.hitch(this,function(){
if(_62){
this.disconnect(_62);
}
delete _62;
if(this._setInProgress!==_55){
return;
}
var _63=dojo.filter(_61._menu.getChildren(),function(i){
return this._itemsMatch(i.item,set);
},this)[0];
if(_63){
idx++;
_61._menu.onItemClick(_63,{type:"internal",stopPropagation:function(){
},preventDefault:function(){
}});
if(_60[idx]){
_5f(_60,idx);
}else{
this._setValue(set);
this.onItemClick(set,_61,this.getChildItems(set));
}
}
});
if(!_61.isLoaded){
_62=this.connect(_61,"onLoad",fx);
}else{
fx();
}
}else{
if(idx===0){
this.set("value",null);
}
}
});
var _64=[];
var _65=dojo.hitch(this,function(_66){
if(_66&&_66.length){
_64.push(_66[0]);
_57(_66[0],_65);
}else{
if(!_66){
_64.pop();
}
_64.reverse();
_5f(_64,0);
}
});
var ns=this.domNode.style;
if(ns.display=="none"||ns.visibility=="hidden"){
this._setValue(_55);
}else{
if(!this._itemsMatch(_55,this._visibleItem)){
_65([_55]);
}
}
},_onItemClick:function(evt,_67,_68,_69){
if(evt){
var _6a=this._getPaneForItem(_68,_67,_69);
var _6b=(evt.type=="click"&&evt.alreadySelected);
if(_6b&&_6a){
this._removeAfter(_67.getIndexInParent()+1);
var _6c=_67.getNextSibling();
if(_6c&&_6c._setSelected){
_6c._setSelected(null);
}
this.scrollIntoView(_6c);
}else{
if(_6a){
this.addChild(_6a,_67.getIndexInParent()+1);
if(this._savedFocus){
_6a.focus(true);
}
}else{
this._removeAfter(_67);
this.scrollIntoView(_67);
}
}
}else{
if(_67){
this._removeAfter(_67);
this.scrollIntoView(_67);
}
}
if(!evt||evt.type!="internal"){
this._setValue(_68);
this.onItemClick(_68,_67,_69);
}
this._visibleItem=_68;
},_getPaneForItem:function(_6d,_6e,_6f){
var ret=this.getPaneForItem(_6d,_6e,_6f);
ret.store=this.store;
ret.parentWidget=this;
ret.parentPane=_6e||null;
if(!_6d){
ret.query=this.query;
ret.queryOptions=this.queryOptions;
}else{
if(_6f){
ret.items=_6f;
}else{
ret.items=[_6d];
}
}
return ret;
},_getMenuItemForItem:function(_70,_71){
var _72=this.store;
if(!_70||!_72||!_72.isItem(_70)){
var i=new dijit.MenuItem({label:"---",disabled:true,iconClass:"dojoxEmpty",focus:function(){
}});
this._updateClass(i.domNode,"Item");
return i;
}else{
var _73=_72.isItemLoaded(_70);
var _74=_73?this.getChildItems(_70):undefined;
var _75;
if(_74){
_75=this.getMenuItemForItem(_70,_71,_74);
_75.children=_74;
this._updateClass(_75.domNode,"Item",{"Expanding":true});
if(!_75._started){
var c=_75.connect(_75,"startup",function(){
this.disconnect(c);
dojo.style(this.arrowWrapper,"display","");
});
}else{
dojo.style(_75.arrowWrapper,"display","");
}
}else{
_75=this.getMenuItemForItem(_70,_71,null);
if(_73){
this._updateClass(_75.domNode,"Item",{"Single":true});
}else{
this._updateClass(_75.domNode,"Item",{"Unloaded":true});
_75.attr("disabled",true);
}
}
_75.store=this.store;
_75.item=_70;
if(!_75.label){
_75.attr("label",this.store.getLabel(_70).replace(/</,"&lt;"));
}
if(_75.focusNode){
var _76=this;
_75.focus=function(){
if(!this.disabled){
try{
this.focusNode.focus();
}
catch(e){
}
}
};
_75.connect(_75.focusNode,"onmouseenter",function(){
if(!this.disabled){
_76._updateClass(this.domNode,"Item",{"Hover":true});
}
});
_75.connect(_75.focusNode,"onmouseleave",function(){
if(!this.disabled){
_76._updateClass(this.domNode,"Item",{"Hover":false});
}
});
_75.connect(_75.focusNode,"blur",function(){
_76._updateClass(this.domNode,"Item",{"Focus":false,"Hover":false});
});
_75.connect(_75.focusNode,"focus",function(){
_76._updateClass(this.domNode,"Item",{"Focus":true});
_76._focusedPane=_71;
});
if(this.executeOnDblClick){
_75.connect(_75.focusNode,"ondblclick",function(){
_76._onExecute();
});
}
}
return _75;
}
},_setStore:function(_77){
if(_77===this.store&&this._started){
return;
}
this.store=_77;
this._isIdentity=_77.getFeatures()["dojo.data.api.Identity"];
var _78=this._getPaneForItem();
this.addChild(_78,0);
},_onKey:function(e){
if(e.charOrCode==dojo.keys.BACKSPACE){
dojo.stopEvent(e);
return;
}else{
if(e.charOrCode==dojo.keys.ESCAPE&&this._savedFocus){
try{
dijit.focus(this._savedFocus);
}
catch(e){
}
dojo.stopEvent(e);
return;
}else{
if(e.charOrCode==dojo.keys.LEFT_ARROW||e.charOrCode==dojo.keys.RIGHT_ARROW){
dojo.stopEvent(e);
return;
}
}
}
},_resetValue:function(){
this.set("value",this._lastExecutedValue);
},_onCancel:function(){
this._resetValue();
this.onCancel();
},_onExecute:function(){
this._lastExecutedValue=this.get("value");
this.onExecute();
},focus:function(){
var _79=this._savedFocus;
this._savedFocus=dijit.getFocus(this);
if(!this._savedFocus.node){
delete this._savedFocus;
}
if(!this._focusedPane){
var _7a=this.getChildren()[0];
if(_7a&&!_79){
_7a.focus(true);
}
}else{
this._savedFocus=dijit.getFocus(this);
var foc=this._focusedPane;
delete this._focusedPane;
if(!_79){
foc.focus(true);
}
}
},handleKey:function(e){
if(e.charOrCode==dojo.keys.DOWN_ARROW){
delete this._savedFocus;
this.focus();
return false;
}else{
if(e.charOrCode==dojo.keys.ESCAPE){
this._onCancel();
return false;
}
}
return true;
},_updateChildClasses:function(){
var _7b=this.getChildren();
var _7c=_7b.length;
dojo.forEach(_7b,function(c,idx){
dojo.toggleClass(c.domNode,"dojoxRollingListPaneCurrentChild",(idx==(_7c-1)));
dojo.toggleClass(c.domNode,"dojoxRollingListPaneCurrentSelected",(idx==(_7c-2)));
});
},startup:function(){
if(this._started){
return;
}
if(!this.getParent||!this.getParent()){
this.resize();
this.connect(dojo.global,"onresize","resize");
}
this.connect(this,"addChild","_updateChildClasses");
this.connect(this,"removeChild","_updateChildClasses");
this._setStore(this.store);
this.set("showButtons",this.showButtons);
this.inherited(arguments);
this._lastExecutedValue=this.get("value");
},getChildItems:function(_7d){
var _7e,_7f=this.store;
dojo.forEach(this.childrenAttrs,function(_80){
var _81=_7f.getValues(_7d,_80);
if(_81&&_81.length){
_7e=(_7e||[]).concat(_81);
}
});
return _7e;
},getMenuItemForItem:function(_82,_83,_84){
return new dijit.MenuItem({});
},getPaneForItem:function(_85,_86,_87){
if(!_85||_87){
return new dojox.widget._RollingListGroupPane({});
}else{
return null;
}
},onItemClick:function(_88,_89,_8a){
},onExecute:function(){
},onCancel:function(){
},onChange:function(_8b){
}});
}
