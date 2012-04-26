/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.Tree"]){
dojo._hasResource["dijit.Tree"]=true;
dojo.provide("dijit.Tree");
dojo.require("dojo.fx");
dojo.require("dojo.DeferredList");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit._Container");
dojo.require("dijit._Contained");
dojo.require("dijit._CssStateMixin");
dojo.require("dojo.cookie");
dojo.require("dijit.tree.TreeStoreModel");
dojo.require("dijit.tree.ForestStoreModel");
dojo.require("dijit.tree._dndSelector");
dojo.declare("dijit._TreeNode",[dijit._Widget,dijit._Templated,dijit._Container,dijit._Contained,dijit._CssStateMixin],{item:null,isTreeNode:true,label:"",isExpandable:null,isExpanded:false,state:"UNCHECKED",templateString:dojo.cache("dijit","templates/TreeNode.html","<div class=\"dijitTreeNode\" role=\"presentation\"\n\t><div dojoAttachPoint=\"rowNode\" class=\"dijitTreeRow\" role=\"presentation\" dojoAttachEvent=\"onmouseenter:_onMouseEnter, onmouseleave:_onMouseLeave, onclick:_onClick, ondblclick:_onDblClick\"\n\t\t><img src=\"${_blankGif}\" alt=\"\" dojoAttachPoint=\"expandoNode\" class=\"dijitTreeExpando\" role=\"presentation\"\n\t\t/><span dojoAttachPoint=\"expandoNodeText\" class=\"dijitExpandoText\" role=\"presentation\"\n\t\t></span\n\t\t><span dojoAttachPoint=\"contentNode\"\n\t\t\tclass=\"dijitTreeContent\" role=\"presentation\">\n\t\t\t<img src=\"${_blankGif}\" alt=\"\" dojoAttachPoint=\"iconNode\" class=\"dijitIcon dijitTreeIcon\" role=\"presentation\"\n\t\t\t/><span dojoAttachPoint=\"labelNode\" class=\"dijitTreeLabel\" role=\"treeitem\" tabindex=\"-1\" aria-selected=\"false\" dojoAttachEvent=\"onfocus:_onLabelFocus\"></span>\n\t\t</span\n\t></div>\n\t<div dojoAttachPoint=\"containerNode\" class=\"dijitTreeContainer\" role=\"presentation\" style=\"display: none;\"></div>\n</div>\n"),baseClass:"dijitTreeNode",cssStateNodes:{rowNode:"dijitTreeRow",labelNode:"dijitTreeLabel"},attributeMap:dojo.delegate(dijit._Widget.prototype.attributeMap,{label:{node:"labelNode",type:"innerText"},tooltip:{node:"rowNode",type:"attribute",attribute:"title"}}),buildRendering:function(){
this.inherited(arguments);
this._setExpando();
this._updateItemClasses(this.item);
if(this.isExpandable){
dijit.setWaiState(this.labelNode,"expanded",this.isExpanded);
}
this.setSelected(false);
},_setIndentAttr:function(_1){
var _2=(Math.max(_1,0)*this.tree._nodePixelIndent)+"px";
dojo.style(this.domNode,"backgroundPosition",_2+" 0px");
dojo.style(this.rowNode,this.isLeftToRight()?"paddingLeft":"paddingRight",_2);
dojo.forEach(this.getChildren(),function(_3){
_3.set("indent",_1+1);
});
this._set("indent",_1);
},markProcessing:function(){
this.state="LOADING";
this._setExpando(true);
},unmarkProcessing:function(){
this._setExpando(false);
},_updateItemClasses:function(_4){
var _5=this.tree,_6=_5.model;
if(_5._v10Compat&&_4===_6.root){
_4=null;
}
this._applyClassAndStyle(_4,"icon","Icon");
this._applyClassAndStyle(_4,"label","Label");
this._applyClassAndStyle(_4,"row","Row");
},_applyClassAndStyle:function(_7,_8,_9){
var _a="_"+_8+"Class";
var _b=_8+"Node";
var _c=this[_a];
this[_a]=this.tree["get"+_9+"Class"](_7,this.isExpanded);
dojo.replaceClass(this[_b],this[_a]||"",_c||"");
dojo.style(this[_b],this.tree["get"+_9+"Style"](_7,this.isExpanded)||{});
},_updateLayout:function(){
var _d=this.getParent();
if(!_d||_d.rowNode.style.display=="none"){
dojo.addClass(this.domNode,"dijitTreeIsRoot");
}else{
dojo.toggleClass(this.domNode,"dijitTreeIsLast",!this.getNextSibling());
}
},_setExpando:function(_e){
var _f=["dijitTreeExpandoLoading","dijitTreeExpandoOpened","dijitTreeExpandoClosed","dijitTreeExpandoLeaf"],_10=["*","-","+","*"],idx=_e?0:(this.isExpandable?(this.isExpanded?1:2):3);
dojo.replaceClass(this.expandoNode,_f[idx],_f);
this.expandoNodeText.innerHTML=_10[idx];
},expand:function(){
if(this._expandDeferred){
return this._expandDeferred;
}
this._wipeOut&&this._wipeOut.stop();
this.isExpanded=true;
dijit.setWaiState(this.labelNode,"expanded","true");
if(this.tree.showRoot||this!==this.tree.rootNode){
dijit.setWaiRole(this.containerNode,"group");
}
dojo.addClass(this.contentNode,"dijitTreeContentExpanded");
this._setExpando();
this._updateItemClasses(this.item);
if(this==this.tree.rootNode){
dijit.setWaiState(this.tree.domNode,"expanded","true");
}
var def,_11=dojo.fx.wipeIn({node:this.containerNode,duration:dijit.defaultDuration,onEnd:function(){
def.callback(true);
}});
def=(this._expandDeferred=new dojo.Deferred(function(){
_11.stop();
}));
_11.play();
return def;
},collapse:function(){
if(!this.isExpanded){
return;
}
if(this._expandDeferred){
this._expandDeferred.cancel();
delete this._expandDeferred;
}
this.isExpanded=false;
dijit.setWaiState(this.labelNode,"expanded","false");
if(this==this.tree.rootNode){
dijit.setWaiState(this.tree.domNode,"expanded","false");
}
dojo.removeClass(this.contentNode,"dijitTreeContentExpanded");
this._setExpando();
this._updateItemClasses(this.item);
if(!this._wipeOut){
this._wipeOut=dojo.fx.wipeOut({node:this.containerNode,duration:dijit.defaultDuration});
}
this._wipeOut.play();
},indent:0,setChildItems:function(_12){
var _13=this.tree,_14=_13.model,_15=[];
dojo.forEach(this.getChildren(),function(_16){
dijit._Container.prototype.removeChild.call(this,_16);
},this);
this.state="LOADED";
if(_12&&_12.length>0){
this.isExpandable=true;
dojo.forEach(_12,function(_17){
var id=_14.getIdentity(_17),_18=_13._itemNodesMap[id],_19;
if(_18){
for(var i=0;i<_18.length;i++){
if(_18[i]&&!_18[i].getParent()){
_19=_18[i];
_19.set("indent",this.indent+1);
break;
}
}
}
if(!_19){
_19=this.tree._createTreeNode({item:_17,tree:_13,isExpandable:_14.mayHaveChildren(_17),label:_13.getLabel(_17),tooltip:_13.getTooltip(_17),dir:_13.dir,lang:_13.lang,indent:this.indent+1});
if(_18){
_18.push(_19);
}else{
_13._itemNodesMap[id]=[_19];
}
}
this.addChild(_19);
if(this.tree.autoExpand||this.tree._state(_17)){
_15.push(_13._expandNode(_19));
}
},this);
dojo.forEach(this.getChildren(),function(_1a,idx){
_1a._updateLayout();
});
}else{
this.isExpandable=false;
}
if(this._setExpando){
this._setExpando(false);
}
this._updateItemClasses(this.item);
if(this==_13.rootNode){
var fc=this.tree.showRoot?this:this.getChildren()[0];
if(fc){
fc.setFocusable(true);
_13.lastFocused=fc;
}else{
_13.domNode.setAttribute("tabIndex","0");
}
}
return new dojo.DeferredList(_15);
},getTreePath:function(){
var _1b=this;
var _1c=[];
while(_1b&&_1b!==this.tree.rootNode){
_1c.unshift(_1b.item);
_1b=_1b.getParent();
}
_1c.unshift(this.tree.rootNode.item);
return _1c;
},getIdentity:function(){
return this.tree.model.getIdentity(this.item);
},removeChild:function(_1d){
this.inherited(arguments);
var _1e=this.getChildren();
if(_1e.length==0){
this.isExpandable=false;
this.collapse();
}
dojo.forEach(_1e,function(_1f){
_1f._updateLayout();
});
},makeExpandable:function(){
this.isExpandable=true;
this._setExpando(false);
},_onLabelFocus:function(evt){
this.tree._onNodeFocus(this);
},setSelected:function(_20){
dijit.setWaiState(this.labelNode,"selected",_20);
dojo.toggleClass(this.rowNode,"dijitTreeRowSelected",_20);
},setFocusable:function(_21){
this.labelNode.setAttribute("tabIndex",_21?"0":"-1");
},_onClick:function(evt){
this.tree._onClick(this,evt);
},_onDblClick:function(evt){
this.tree._onDblClick(this,evt);
},_onMouseEnter:function(evt){
this.tree._onNodeMouseEnter(this,evt);
},_onMouseLeave:function(evt){
this.tree._onNodeMouseLeave(this,evt);
}});
dojo.declare("dijit.Tree",[dijit._Widget,dijit._Templated],{store:null,model:null,query:null,label:"",showRoot:true,childrenAttr:["children"],paths:[],path:[],selectedItems:null,selectedItem:null,openOnClick:false,openOnDblClick:false,templateString:dojo.cache("dijit","templates/Tree.html","<div class=\"dijitTree dijitTreeContainer\" role=\"tree\"\n\tdojoAttachEvent=\"onkeypress:_onKeyPress\">\n\t<div class=\"dijitInline dijitTreeIndent\" style=\"position: absolute; top: -9999px\" dojoAttachPoint=\"indentDetector\"></div>\n</div>\n"),persist:true,autoExpand:false,dndController:"dijit.tree._dndSelector",dndParams:["onDndDrop","itemCreator","onDndCancel","checkAcceptance","checkItemAcceptance","dragThreshold","betweenThreshold"],onDndDrop:null,itemCreator:null,onDndCancel:null,checkAcceptance:null,checkItemAcceptance:null,dragThreshold:5,betweenThreshold:0,_nodePixelIndent:19,_publish:function(_22,_23){
dojo.publish(this.id,[dojo.mixin({tree:this,event:_22},_23||{})]);
},postMixInProperties:function(){
this.tree=this;
if(this.autoExpand){
this.persist=false;
}
this._itemNodesMap={};
if(!this.cookieName){
this.cookieName=this.id+"SaveStateCookie";
}
this._loadDeferred=new dojo.Deferred();
this.inherited(arguments);
},postCreate:function(){
this._initState();
if(!this.model){
this._store2model();
}
this.connect(this.model,"onChange","_onItemChange");
this.connect(this.model,"onChildrenChange","_onItemChildrenChange");
this.connect(this.model,"onDelete","_onItemDelete");
this._load();
this.inherited(arguments);
if(this.dndController){
if(dojo.isString(this.dndController)){
this.dndController=dojo.getObject(this.dndController);
}
var _24={};
for(var i=0;i<this.dndParams.length;i++){
if(this[this.dndParams[i]]){
_24[this.dndParams[i]]=this[this.dndParams[i]];
}
}
this.dndController=new this.dndController(this,_24);
}
},_store2model:function(){
this._v10Compat=true;
dojo.deprecated("Tree: from version 2.0, should specify a model object rather than a store/query");
var _25={id:this.id+"_ForestStoreModel",store:this.store,query:this.query,childrenAttrs:this.childrenAttr};
if(this.params.mayHaveChildren){
_25.mayHaveChildren=dojo.hitch(this,"mayHaveChildren");
}
if(this.params.getItemChildren){
_25.getChildren=dojo.hitch(this,function(_26,_27,_28){
this.getItemChildren((this._v10Compat&&_26===this.model.root)?null:_26,_27,_28);
});
}
this.model=new dijit.tree.ForestStoreModel(_25);
this.showRoot=Boolean(this.label);
},onLoad:function(){
},_load:function(){
this.model.getRoot(dojo.hitch(this,function(_29){
var rn=(this.rootNode=this.tree._createTreeNode({item:_29,tree:this,isExpandable:true,label:this.label||this.getLabel(_29),indent:this.showRoot?0:-1}));
if(!this.showRoot){
rn.rowNode.style.display="none";
dijit.setWaiRole(this.domNode,"presentation");
dijit.setWaiRole(rn.labelNode,"presentation");
dijit.setWaiRole(rn.containerNode,"tree");
}
this.domNode.appendChild(rn.domNode);
var _2a=this.model.getIdentity(_29);
if(this._itemNodesMap[_2a]){
this._itemNodesMap[_2a].push(rn);
}else{
this._itemNodesMap[_2a]=[rn];
}
rn._updateLayout();
this._expandNode(rn).addCallback(dojo.hitch(this,function(){
this._loadDeferred.callback(true);
this.onLoad();
}));
}),function(err){
console.error(this,": error loading root: ",err);
});
},getNodesByItem:function(_2b){
if(!_2b){
return [];
}
var _2c=dojo.isString(_2b)?_2b:this.model.getIdentity(_2b);
return [].concat(this._itemNodesMap[_2c]);
},_setSelectedItemAttr:function(_2d){
this.set("selectedItems",[_2d]);
},_setSelectedItemsAttr:function(_2e){
var _2f=this;
this._loadDeferred.addCallback(dojo.hitch(this,function(){
var _30=dojo.map(_2e,function(_31){
return (!_31||dojo.isString(_31))?_31:_2f.model.getIdentity(_31);
});
var _32=[];
dojo.forEach(_30,function(id){
_32=_32.concat(_2f._itemNodesMap[id]||[]);
});
this.set("selectedNodes",_32);
}));
},_setPathAttr:function(_33){
if(_33.length){
return this.set("paths",[_33]);
}else{
return this.set("paths",[]);
}
},_setPathsAttr:function(_34){
var _35=this;
return new dojo.DeferredList(dojo.map(_34,function(_36){
var d=new dojo.Deferred();
_36=dojo.map(_36,function(_37){
return dojo.isString(_37)?_37:_35.model.getIdentity(_37);
});
if(_36.length){
_35._loadDeferred.addCallback(function(){
_38(_36,[_35.rootNode],d);
});
}else{
d.errback("Empty path");
}
return d;
})).addCallback(_39);
function _38(_3a,_3b,def){
var _3c=_3a.shift();
var _3d=dojo.filter(_3b,function(_3e){
return _3e.getIdentity()==_3c;
})[0];
if(!!_3d){
if(_3a.length){
_35._expandNode(_3d).addCallback(function(){
_38(_3a,_3d.getChildren(),def);
});
}else{
def.callback(_3d);
}
}else{
def.errback("Could not expand path at "+_3c);
}
};
function _39(_3f){
_35.set("selectedNodes",dojo.map(dojo.filter(_3f,function(x){
return x[0];
}),function(x){
return x[1];
}));
};
},_setSelectedNodeAttr:function(_40){
this.set("selectedNodes",[_40]);
},_setSelectedNodesAttr:function(_41){
this._loadDeferred.addCallback(dojo.hitch(this,function(){
this.dndController.setSelection(_41);
}));
},mayHaveChildren:function(_42){
},getItemChildren:function(_43,_44){
},getLabel:function(_45){
return this.model.getLabel(_45);
},getIconClass:function(_46,_47){
return (!_46||this.model.mayHaveChildren(_46))?(_47?"dijitFolderOpened":"dijitFolderClosed"):"dijitLeaf";
},getLabelClass:function(_48,_49){
},getRowClass:function(_4a,_4b){
},getIconStyle:function(_4c,_4d){
},getLabelStyle:function(_4e,_4f){
},getRowStyle:function(_50,_51){
},getTooltip:function(_52){
return "";
},_onKeyPress:function(e){
if(e.altKey){
return;
}
var dk=dojo.keys;
var _53=dijit.getEnclosingWidget(e.target);
if(!_53){
return;
}
var key=e.charOrCode;
if(typeof key=="string"&&key!=" "){
if(!e.altKey&&!e.ctrlKey&&!e.shiftKey&&!e.metaKey){
this._onLetterKeyNav({node:_53,key:key.toLowerCase()});
dojo.stopEvent(e);
}
}else{
if(this._curSearch){
clearTimeout(this._curSearch.timer);
delete this._curSearch;
}
var map=this._keyHandlerMap;
if(!map){
map={};
map[dk.ENTER]="_onEnterKey";
map[dk.SPACE]=map[" "]="_onEnterKey";
map[this.isLeftToRight()?dk.LEFT_ARROW:dk.RIGHT_ARROW]="_onLeftArrow";
map[this.isLeftToRight()?dk.RIGHT_ARROW:dk.LEFT_ARROW]="_onRightArrow";
map[dk.UP_ARROW]="_onUpArrow";
map[dk.DOWN_ARROW]="_onDownArrow";
map[dk.HOME]="_onHomeKey";
map[dk.END]="_onEndKey";
this._keyHandlerMap=map;
}
if(this._keyHandlerMap[key]){
this[this._keyHandlerMap[key]]({node:_53,item:_53.item,evt:e});
dojo.stopEvent(e);
}
}
},_onEnterKey:function(_54){
this._publish("execute",{item:_54.item,node:_54.node});
this.dndController.userSelect(_54.node,dojo.isCopyKey(_54.evt),_54.evt.shiftKey);
this.onClick(_54.item,_54.node,_54.evt);
},_onDownArrow:function(_55){
var _56=this._getNextNode(_55.node);
if(_56&&_56.isTreeNode){
this.focusNode(_56);
}
},_onUpArrow:function(_57){
var _58=_57.node;
var _59=_58.getPreviousSibling();
if(_59){
_58=_59;
while(_58.isExpandable&&_58.isExpanded&&_58.hasChildren()){
var _5a=_58.getChildren();
_58=_5a[_5a.length-1];
}
}else{
var _5b=_58.getParent();
if(!(!this.showRoot&&_5b===this.rootNode)){
_58=_5b;
}
}
if(_58&&_58.isTreeNode){
this.focusNode(_58);
}
},_onRightArrow:function(_5c){
var _5d=_5c.node;
if(_5d.isExpandable&&!_5d.isExpanded){
this._expandNode(_5d);
}else{
if(_5d.hasChildren()){
_5d=_5d.getChildren()[0];
if(_5d&&_5d.isTreeNode){
this.focusNode(_5d);
}
}
}
},_onLeftArrow:function(_5e){
var _5f=_5e.node;
if(_5f.isExpandable&&_5f.isExpanded){
this._collapseNode(_5f);
}else{
var _60=_5f.getParent();
if(_60&&_60.isTreeNode&&!(!this.showRoot&&_60===this.rootNode)){
this.focusNode(_60);
}
}
},_onHomeKey:function(){
var _61=this._getRootOrFirstNode();
if(_61){
this.focusNode(_61);
}
},_onEndKey:function(_62){
var _63=this.rootNode;
while(_63.isExpanded){
var c=_63.getChildren();
_63=c[c.length-1];
}
if(_63&&_63.isTreeNode){
this.focusNode(_63);
}
},multiCharSearchDuration:250,_onLetterKeyNav:function(_64){
var cs=this._curSearch;
if(cs){
cs.pattern=cs.pattern+_64.key;
clearTimeout(cs.timer);
}else{
cs=this._curSearch={pattern:_64.key,startNode:_64.node};
}
var _65=this;
cs.timer=setTimeout(function(){
delete _65._curSearch;
},this.multiCharSearchDuration);
var _66=cs.startNode;
do{
_66=this._getNextNode(_66);
if(!_66){
_66=this._getRootOrFirstNode();
}
}while(_66!==cs.startNode&&(_66.label.toLowerCase().substr(0,cs.pattern.length)!=cs.pattern));
if(_66&&_66.isTreeNode){
if(_66!==cs.startNode){
this.focusNode(_66);
}
}
},isExpandoNode:function(_67,_68){
return dojo.isDescendant(_67,_68.expandoNode);
},_onClick:function(_69,e){
var _6a=e.target,_6b=this.isExpandoNode(_6a,_69);
if((this.openOnClick&&_69.isExpandable)||_6b){
if(_69.isExpandable){
this._onExpandoClick({node:_69});
}
}else{
this._publish("execute",{item:_69.item,node:_69,evt:e});
this.onClick(_69.item,_69,e);
this.focusNode(_69);
}
dojo.stopEvent(e);
},_onDblClick:function(_6c,e){
var _6d=e.target,_6e=(_6d==_6c.expandoNode||_6d==_6c.expandoNodeText);
if((this.openOnDblClick&&_6c.isExpandable)||_6e){
if(_6c.isExpandable){
this._onExpandoClick({node:_6c});
}
}else{
this._publish("execute",{item:_6c.item,node:_6c,evt:e});
this.onDblClick(_6c.item,_6c,e);
this.focusNode(_6c);
}
dojo.stopEvent(e);
},_onExpandoClick:function(_6f){
var _70=_6f.node;
this.focusNode(_70);
if(_70.isExpanded){
this._collapseNode(_70);
}else{
this._expandNode(_70);
}
},onClick:function(_71,_72,evt){
},onDblClick:function(_73,_74,evt){
},onOpen:function(_75,_76){
},onClose:function(_77,_78){
},_getNextNode:function(_79){
if(_79.isExpandable&&_79.isExpanded&&_79.hasChildren()){
return _79.getChildren()[0];
}else{
while(_79&&_79.isTreeNode){
var _7a=_79.getNextSibling();
if(_7a){
return _7a;
}
_79=_79.getParent();
}
return null;
}
},_getRootOrFirstNode:function(){
return this.showRoot?this.rootNode:this.rootNode.getChildren()[0];
},_collapseNode:function(_7b){
if(_7b._expandNodeDeferred){
delete _7b._expandNodeDeferred;
}
if(_7b.isExpandable){
if(_7b.state=="LOADING"){
return;
}
_7b.collapse();
this.onClose(_7b.item,_7b);
if(_7b.item){
this._state(_7b.item,false);
this._saveState();
}
}
},_expandNode:function(_7c,_7d){
if(_7c._expandNodeDeferred&&!_7d){
return _7c._expandNodeDeferred;
}
var _7e=this.model,_7f=_7c.item,_80=this;
switch(_7c.state){
case "UNCHECKED":
_7c.markProcessing();
var def=(_7c._expandNodeDeferred=new dojo.Deferred());
_7e.getChildren(_7f,function(_81){
_7c.unmarkProcessing();
var _82=_7c.setChildItems(_81);
var ed=_80._expandNode(_7c,true);
_82.addCallback(function(){
ed.addCallback(function(){
def.callback();
});
});
},function(err){
console.error(_80,": error loading root children: ",err);
});
break;
default:
def=(_7c._expandNodeDeferred=_7c.expand());
this.onOpen(_7c.item,_7c);
if(_7f){
this._state(_7f,true);
this._saveState();
}
}
return def;
},focusNode:function(_83){
dijit.focus(_83.labelNode);
},_onNodeFocus:function(_84){
if(_84&&_84!=this.lastFocused){
if(this.lastFocused&&!this.lastFocused._destroyed){
this.lastFocused.setFocusable(false);
}
_84.setFocusable(true);
this.lastFocused=_84;
}
},_onNodeMouseEnter:function(_85){
},_onNodeMouseLeave:function(_86){
},_onItemChange:function(_87){
var _88=this.model,_89=_88.getIdentity(_87),_8a=this._itemNodesMap[_89];
if(_8a){
var _8b=this.getLabel(_87),_8c=this.getTooltip(_87);
dojo.forEach(_8a,function(_8d){
_8d.set({item:_87,label:_8b,tooltip:_8c});
_8d._updateItemClasses(_87);
});
}
},_onItemChildrenChange:function(_8e,_8f){
var _90=this.model,_91=_90.getIdentity(_8e),_92=this._itemNodesMap[_91];
if(_92){
dojo.forEach(_92,function(_93){
_93.setChildItems(_8f);
});
}
},_onItemDelete:function(_94){
var _95=this.model,_96=_95.getIdentity(_94),_97=this._itemNodesMap[_96];
if(_97){
dojo.forEach(_97,function(_98){
this.dndController.removeTreeNode(_98);
var _99=_98.getParent();
if(_99){
_99.removeChild(_98);
}
_98.destroyRecursive();
},this);
delete this._itemNodesMap[_96];
}
},_initState:function(){
if(this.persist){
var _9a=dojo.cookie(this.cookieName);
this._openedItemIds={};
if(_9a){
dojo.forEach(_9a.split(","),function(_9b){
this._openedItemIds[_9b]=true;
},this);
}
}
},_state:function(_9c,_9d){
if(!this.persist){
return false;
}
var id=this.model.getIdentity(_9c);
if(arguments.length===1){
return this._openedItemIds[id];
}
if(_9d){
this._openedItemIds[id]=true;
}else{
delete this._openedItemIds[id];
}
},_saveState:function(){
if(!this.persist){
return;
}
var ary=[];
for(var id in this._openedItemIds){
ary.push(id);
}
dojo.cookie(this.cookieName,ary.join(","),{expires:365});
},destroy:function(){
if(this._curSearch){
clearTimeout(this._curSearch.timer);
delete this._curSearch;
}
if(this.rootNode){
this.rootNode.destroyRecursive();
}
if(this.dndController&&!dojo.isString(this.dndController)){
this.dndController.destroy();
}
this.rootNode=null;
this.inherited(arguments);
},destroyRecursive:function(){
this.destroy();
},resize:function(_9e){
if(_9e){
dojo.marginBox(this.domNode,_9e);
}
this._nodePixelIndent=dojo._getMarginSize(this.tree.indentDetector).w;
if(this.tree.rootNode){
this.tree.rootNode.set("indent",this.showRoot?0:-1);
}
},_createTreeNode:function(_9f){
return new dijit._TreeNode(_9f);
}});
}
