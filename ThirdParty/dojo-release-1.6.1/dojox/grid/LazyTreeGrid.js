/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.LazyTreeGrid"]){
dojo._hasResource["dojox.grid.LazyTreeGrid"]=true;
dojo.provide("dojox.grid.LazyTreeGrid");
dojo.require("dojox.grid._View");
dojo.require("dojox.grid.TreeGrid");
dojo.require("dojox.grid.cells.tree");
dojo.require("dojox.grid.LazyTreeGridStoreModel");
dojo.declare("dojox.grid._LazyExpando",[dijit._Widget,dijit._Templated],{itemId:"",cellIdx:-1,view:null,rowIdx:-1,expandoCell:null,level:0,open:false,templateString:"<div class=\"dojoxGridExpando\"\n\t><div class=\"dojoxGridExpandoNode\" dojoAttachEvent=\"onclick:onToggle\"\n\t\t><div class=\"dojoxGridExpandoNodeInner\" dojoAttachPoint=\"expandoInner\"></div\n\t></div\n></div>\n",onToggle:function(_1){
this.setOpen(!this.view.grid.cache.getExpandoStatusByRowIndex(this.rowIdx));
try{
dojo.stopEvent(_1);
}
catch(e){
}
},setOpen:function(_2){
var g=this.view.grid,_3=g.cache.getItemByRowIndex(this.rowIdx);
if(!g.treeModel.mayHaveChildren(_3)){
g.stateChangeNode=null;
return;
}
if(_3&&!g._loading){
g.stateChangeNode=this.domNode;
g.cache.updateCache(this.rowIdx,{"expandoStatus":_2});
g.expandoFetch(this.rowIdx,_2);
this.open=_2;
}
this._updateOpenState(_3);
},_updateOpenState:function(_4){
var _5=this.view.grid;
if(_4&&_5.treeModel.mayHaveChildren(_4)){
var _6=_5.cache.getExpandoStatusByRowIndex(this.rowIdx);
this.expandoInner.innerHTML=_6?"-":"+";
dojo.toggleClass(this.domNode,"dojoxGridExpandoOpened",_6);
dijit.setWaiState(this.domNode.parentNode,"expanded",_6);
}
},setRowNode:function(_7,_8,_9){
if(this.cellIdx<0||!this.itemId){
return false;
}
this._initialized=false;
this.view=_9;
this.rowIdx=_7;
this.expandoCell=_9.structure.cells[0][this.cellIdx];
var d=this.domNode;
if(d&&d.parentNode&&d.parentNode.parentNode){
this._tableRow=d.parentNode.parentNode;
}
dojo.style(this.domNode,"marginLeft",(this.level*1.125)+"em");
this._updateOpenState(_9.grid.cache.getItemByRowIndex(this.rowIdx));
return true;
}});
dojo.declare("dojox.grid._TreeGridContentBuilder",dojox.grid._ContentBuilder,{generateHtml:function(_a,_b){
var _c=this.getTableArray(),_d=this.grid,v=this.view,_e=v.structure.cells,_f=_d.getItem(_b),_10=0,_11=_d.cache.getTreePathByRowIndex(_b),_12=[],_13=[];
dojox.grid.util.fire(this.view,"onBeforeRow",[_b,_e]);
if(_f!==null&&_11!==null){
_12=_11.split("/");
_10=_12.length-1;
_13[0]="dojoxGridRowToggle-"+_12.join("-");
if(!_d.treeModel.mayHaveChildren(_f)){
_13.push("dojoxGridNoChildren");
}
}
for(var j=0,row;(row=_e[j]);j++){
if(row.hidden||row.header){
continue;
}
var tr="<tr style=\"\" class=\""+_13.join(" ")+"\" dojoxTreeGridPath=\""+_12.join("/")+"\" dojoxTreeGridBaseClasses=\""+_13.join(" ")+"\">";
_c.push(tr);
var k=0,_14=this._getColSpans(_10);
var _15=0,_16=[];
if(_14){
dojo.forEach(_14,function(c){
for(var i=0,_17;(_17=row[i]);i++){
if(i>=c.start&&i<=c.end){
_15+=this._getCellWidth(row,i);
}
}
_16.push(_15);
_15=0;
},this);
}
for(var i=0,_18,m,cc,cs;(_18=row[i]);i++){
m=_18.markup;
cc=_18.customClasses=[];
cs=_18.customStyles=[];
if(_14&&_14[k]&&(i>=_14[k].start&&i<=_14[k].end)){
var _19=_14[k].primary?_14[k].primary:_14[k].start;
if(i==_19){
m[5]=_18.formatAtLevel(_12,_f,_10,false,_13[0],cc,_b);
m[1]=cc.join(" ");
var pbm=dojo.marginBox(_18.getHeaderNode()).w-dojo.contentBox(_18.getHeaderNode()).w;
cs=_18.customStyles=["width:"+(_16[k]-pbm)+"px"];
m[3]=cs.join(";");
_c.push.apply(_c,m);
}else{
if(i==_14[k].end){
k++;
continue;
}else{
continue;
}
}
}else{
m[5]=_18.formatAtLevel(_12,_f,_10,false,_13[0],cc,_b);
m[1]=cc.join(" ");
m[3]=cs.join(";");
_c.push.apply(_c,m);
}
}
_c.push("</tr>");
}
_c.push("</table>");
return _c.join("");
},_getColSpans:function(_1a){
var _1b=this.grid.colSpans;
if(_1b&&(_1b[_1a])){
return _1b[_1a];
}else{
return null;
}
},_getCellWidth:function(_1c,_1d){
var _1e=_1c[_1d].getHeaderNode();
if(_1d==_1c.length-1||dojo.every(_1c.slice(_1d+1),function(_1f){
return _1f.hidden;
})){
var _20=dojo.position(_1c[_1d].view.headerContentNode.firstChild);
return _20.x+_20.w-dojo.position(_1e).x;
}else{
var _21=_1c[_1d+1].getHeaderNode();
return dojo.position(_21).x-dojo.position(_1e).x;
}
}});
dojo.declare("dojox.grid._TreeGridView",[dojox.grid._View],{_contentBuilderClass:dojox.grid._TreeGridContentBuilder,postCreate:function(){
this.inherited(arguments);
this._expandos={};
this.connect(this.grid,"_cleanupExpandoCache","_cleanupExpandoCache");
},_cleanupExpandoCache:function(_22,_23,_24){
if(_22==-1){
return;
}
dojo.forEach(this.grid.layout.cells,function(_25){
if(_25.openStates&&_23 in _25.openStates){
delete _25.openStates[_23];
}
});
for(var i in this._expandos){
if(this._expandos[i]){
this._expandos[i].destroy();
}
}
this._expandos={};
},onAfterRow:function(_26,_27,_28){
dojo.query("span.dojoxGridExpando",_28).forEach(function(n){
if(n&&n.parentNode){
var _29,_2a,_2b=this.grid._by_idx;
if(_2b&&_2b[_26]&&_2b[_26].idty){
_29=_2b[_26].idty;
_2a=this._expandos[_29];
}
if(_2a){
dojo.place(_2a.domNode,n,"replace");
_2a.itemId=n.getAttribute("itemId");
_2a.cellIdx=parseInt(n.getAttribute("cellIdx"),10);
if(isNaN(_2a.cellIdx)){
_2a.cellIdx=-1;
}
}else{
_2a=dojo.parser.parse(n.parentNode)[0];
if(_29){
this._expandos[_29]=_2a;
}
}
if(!_2a.setRowNode(_26,_28,this)){
_2a.domNode.parentNode.removeChild(_2a.domNode);
}
}
},this);
this.inherited(arguments);
}});
dojox.grid.cells.LazyTreeCell=dojo.mixin(dojo.clone(dojox.grid.cells.TreeCell),{formatAtLevel:function(_2c,_2d,_2e,_2f,_30,_31,_32){
if(!_2d){
return this.formatIndexes(_32,_2c,_2d,_2e);
}
if(!dojo.isArray(_2c)){
_2c=[_2c];
}
var _33="";
var ret="";
if(this.isCollapsable){
var _34=this.grid.store,id="";
if(_2d&&_34.isItem(_2d)){
id=_34.getIdentity(_2d);
}
_31.push("dojoxGridExpandoCell");
ret="<span "+dojo._scopeName+"Type=\"dojox.grid._LazyExpando\" level=\""+_2e+"\" class=\"dojoxGridExpando\""+"\" toggleClass=\""+_30+"\" itemId=\""+id+"\" cellIdx=\""+this.index+"\"></span>";
}
_33=ret+this.formatIndexes(_32,_2c,_2d,_2e);
if(this.grid.focus.cell&&this.index==this.grid.focus.cell.index&&_2c.join("/")==this.grid.focus.rowIndex){
_31.push(this.grid.focus.focusClass);
}
return _33;
},formatIndexes:function(_35,_36,_37,_38){
var _39=this.grid.edit.info,d=this.get?this.get(_36[0],_37,_36):(this.value||this.defaultValue);
if(this.editable&&(this.alwaysEditing||(_39.rowIndex==_36[0]&&_39.cell==this))){
return this.formatEditing(d,_35,_36);
}else{
return this._defaultFormat(d,[d,_35,_38,this]);
}
}});
dojo.declare("dojox.grid._LazyTreeLayout",dojox.grid._Layout,{setStructure:function(_3a){
var s=_3a;
var g=this.grid;
if(g&&!dojo.every(s,function(i){
return ("cells" in i);
})){
s=arguments[0]=[{cells:[s]}];
}
if(s.length==1&&s[0].cells.length==1){
s[0].type="dojox.grid._TreeGridView";
this._isCollapsable=true;
s[0].cells[0][this.grid.expandoCell].isCollapsable=true;
}
this.inherited(arguments);
},addCellDef:function(_3b,_3c,_3d){
var obj=this.inherited(arguments);
return dojo.mixin(obj,dojox.grid.cells.LazyTreeCell);
}});
dojo.declare("dojox.grid.TreeGridItemCache",null,{unInit:true,items:null,constructor:function(_3e){
this.rowsPerPage=_3e.rowsPerPage;
this._buildCache(_3e.rowsPerPage);
},_buildCache:function(_3f){
this.items=[];
for(var i=0;i<_3f;i++){
this.cacheItem(i,{item:null,treePath:i+"",expandoStatus:false});
}
},cacheItem:function(_40,_41){
this.items[_40]=dojo.mixin({item:null,treePath:"",expandoStatus:false},_41);
},insertItem:function(_42,_43){
this.items.splice(_42,0,dojo.mixin({item:null,treePath:"",expandoStatus:false},_43));
},initCache:function(_44){
if(!this.unInit){
return;
}
this._buildCache(_44);
this.unInit=false;
},getItemByRowIndex:function(_45){
return this.items[_45]?this.items[_45].item:null;
},getItemByTreePath:function(_46){
for(var i=0,len=this.items.length;i<len;i++){
if(this.items[i].treePath===_46){
return this.items[i].item;
}
}
return null;
},getTreePathByRowIndex:function(_47){
return this.items[_47]?this.items[_47].treePath:null;
},getExpandoStatusByRowIndex:function(_48){
return this.items[_48]?this.items[_48].expandoStatus:null;
},getInfoByItem:function(_49){
for(var i=0,len=this.items.length;i<len;i++){
if(this.items[i].item==_49){
return dojo.mixin({rowIdx:i},this.items[i]);
}
}
return null;
},updateCache:function(_4a,_4b){
if(this.items[_4a]){
dojo.mixin(this.items[_4a],_4b);
}
},deleteItem:function(_4c){
if(this.items[_4c]){
this.items.splice(_4c,1);
}
},cleanChildren:function(_4d){
var _4e=this.getTreePathByRowIndex(_4d);
for(var i=this.items.length-1;i>=0;i--){
if(this.items[i].treePath.indexOf(_4e)===0&&this.items[i].treePath!==_4e){
this.items.splice(i,1);
}
}
},emptyCache:function(){
this.unInit=true;
this._buildCache(this.rowsPerPage);
},cleanupCache:function(){
this.items=null;
}});
dojo.declare("dojox.grid.LazyTreeGrid",dojox.grid.TreeGrid,{treeModel:null,_layoutClass:dojox.grid._LazyTreeLayout,colSpans:null,postCreate:function(){
this.inherited(arguments);
this.cache=new dojox.grid.TreeGridItemCache(this);
if(!this.treeModel||!(this.treeModel instanceof dijit.tree.ForestStoreModel)){
throw new Error("dojox.grid.LazyTreeGrid: must use a treeModel and treeModel must be an instance of dijit.tree.ForestStoreModel");
}
dojo.addClass(this.domNode,"dojoxGridTreeModel");
dojo.setSelectable(this.domNode,this.selectable);
},createManagers:function(){
this.rows=new dojox.grid._RowManager(this);
this.focus=new dojox.grid._FocusManager(this);
this.edit=new dojox.grid._EditManager(this);
},createSelection:function(){
this.selection=new dojox.grid.DataSelection(this);
},setModel:function(_4f){
if(!_4f){
return;
}
this._setModel(_4f);
this._refresh(true);
},setStore:function(_50,_51,_52){
if(!_50){
return;
}
this._setQuery(_51,_52);
this.treeModel.query=_51;
this.treeModel.store=_50;
this.treeModel.root.children=[];
this.setModel(this.treeModel);
},_setQuery:function(_53,_54){
this.inherited(arguments);
this.treeModel.query=_53;
},destroy:function(){
this._cleanup();
this.inherited(arguments);
},_cleanup:function(){
this.cache.emptyCache();
this._cleanupExpandoCache();
},setSortIndex:function(_55,_56){
if(this.canSort(_55+1)){
this._cleanup();
}
this.inherited(arguments);
},_refresh:function(_57){
this._cleanup();
this.inherited(arguments);
},render:function(){
this.inherited(arguments);
this.setScrollTop(this.scrollTop);
},_onNew:function(_58,_59){
var _5a=false;
var _5b;
if(_59&&this.store.isItem(_59.item)&&dojo.some(this.treeModel.childrenAttrs,function(c){
return c===_59.attribute;
})){
_5a=true;
_5b=this.cache.getInfoByItem(_59.item);
}
if(!_5a){
this.inherited(arguments);
var _5c=this.cache.items;
var _5d=(parseInt(_5c[_5c.length-1].treePath.split("/")[0],10)+1)+"";
this.cache.insertItem(this.get("rowCount"),{item:_58,treePath:_5d,expandoStatus:false});
}else{
if(_5b&&_5b.expandoStatus&&_5b.rowIdx>=0){
this.expandoFetch(_5b.rowIdx,false);
this.expandoFetch(_5b.rowIdx,true);
}else{
if(_5b&&_5b.rowIdx){
this.updateRow(_5b.rowIdx);
}
}
}
},_onDelete:function(_5e){
this._pages=[];
this._bop=-1;
this._eop=-1;
this._refresh();
},_cleanupExpandoCache:function(_5f,_60,_61){
},_fetch:function(_62,_63){
_62=_62||0;
this.reqQueue=[];
var i=0,_64=[];
var _65=Math.min(this.rowsPerPage,this.cache.items.length-_62);
for(i=_62;i<_65;i++){
if(this.cache.getItemByRowIndex(i)){
_64.push(this.cache.getItemByRowIndex(i));
}else{
break;
}
}
if(_64.length===_65){
this._onFetchComplete(_64,{startRowIdx:_62,count:_65});
}else{
this.reqQueueIndex=0;
var _66="",_67="",_68=_62,_69=this.cache.getTreePathByRowIndex(_62);
_65=0;
for(i=_62+1;i<_62+this.rowsPerPage;i++){
if(!this.cache.getTreePathByRowIndex(i)){
break;
}
_66=this.cache.getTreePathByRowIndex(i-1).split("/").length-1;
_67=this.cache.getTreePathByRowIndex(i).split("/").length-1;
if(_66!==_67){
this.reqQueue.push({startTreePath:_69,startRowIdx:_68,count:_65+1});
_65=0;
_68=i;
_69=this.cache.getTreePathByRowIndex(i);
}else{
_65++;
}
}
this.reqQueue.push({startTreePath:_69,startRowIdx:_68,count:_65+1});
var len=this.reqQueue.length;
for(i=0;i<len;i++){
this._fetchItems(i,dojo.hitch(this,"_onFetchBegin"),dojo.hitch(this,"_onFetchComplete"),dojo.hitch(this,"_onFetchError"));
}
}
},_fetchItems:function(idx,_6a,_6b,_6c){
if(!this._loading){
this._loading=true;
this.showMessage(this.loadingMessage);
}
var _6d=this.reqQueue[idx].startTreePath.split("/").length-1;
this._pending_requests[this.reqQueue[idx].startRowIdx]=true;
if(_6d===0){
this.store.fetch({start:parseInt(this.reqQueue[idx].startTreePath,10),startRowIdx:this.reqQueue[idx].startRowIdx,count:this.reqQueue[idx].count,query:this.query,sort:this.getSortProps(),queryOptions:this.queryOptions,onBegin:_6a,onComplete:_6b,onError:_6c});
}else{
var _6e=this.reqQueue[idx].startTreePath;
var _6f=_6e.substring(0,_6e.lastIndexOf("/"));
var _70=_6e.substring(_6e.lastIndexOf("/")+1);
var _71=this.cache.getItemByTreePath(_6f);
if(!_71){
throw new Error("Lazy loading TreeGrid on fetch error:");
}
var _72=this.store.getIdentity(_71);
this.queryObj={start:parseInt(_70,10),startRowIdx:this.reqQueue[idx].startRowIdx,count:this.reqQueue[idx].count,parentId:_72,sort:this.getSortProps()};
this.treeModel.getChildren(_71,_6b,_6c,this.queryObj);
}
},_onFetchBegin:function(_73,_74){
this.cache.initCache(_73);
_73=this.cache.items.length;
this.inherited(arguments);
},filter:function(_75,_76){
this.cache.emptyCache();
this.inherited(arguments);
},_onFetchComplete:function(_77,_78,_79){
var _7a="",_7b,_7c,_7d;
if(_78){
_7b=_78.startRowIdx;
_7c=_78.count;
_7d=0;
}else{
_7b=this.queryObj.startRowIdx;
_7c=this.queryObj.count;
_7d=this.queryObj.start;
}
for(var i=0;i<_7c;i++){
_7a=this.cache.getTreePathByRowIndex(_7b+i);
if(_7a){
if(!this.cache.getItemByRowIndex(_7b+i)){
this.cache.cacheItem(_7b+i,{item:_77[_7d+i],treePath:_7a,expandoStatus:false});
}
}
}
this._pending_requests[_7b]=false;
if(!this.scroller){
return;
}
var len=Math.min(_7c,_77.length);
for(i=0;i<len;i++){
this._addItem(_77[_7d+i],_7b+i,true);
}
this.updateRows(_7b,len);
if(this._lastScrollTop){
this.setScrollTop(this._lastScrollTop);
}
if(this._loading){
this._loading=false;
if(!this.cache.items.length){
this.showMessage(this.noDataMessage);
}else{
this.showMessage();
}
}
},expandoFetch:function(_7e,_7f){
if(this._loading){
return;
}
this._loading=true;
this.toggleLoadingClass(true);
var _80=this.cache.getItemByRowIndex(_7e);
this.expandoRowIndex=_7e;
this._pages=[];
if(_7f){
var _81=this.store.getIdentity(_80);
var _82={start:0,count:this.keepRows,parentId:_81,sort:this.getSortProps()};
this.treeModel.getChildren(_80,dojo.hitch(this,"_onExpandoComplete"),dojo.hitch(this,"_onFetchError"),_82);
}else{
this.cache.cleanChildren(_7e);
for(var i=_7e+1,len=this._by_idx.length;i<len;i++){
delete this._by_idx[i];
}
this.updateRowCount(this.cache.items.length);
if(this.cache.getTreePathByRowIndex(_7e+1)){
this._fetch(_7e+1);
}else{
this._fetch(_7e);
}
this.toggleLoadingClass(false);
}
},_onExpandoComplete:function(_83,_84,_85){
var _86=this.cache.getTreePathByRowIndex(this.expandoRowIndex);
if(_85&&!isNaN(parseInt(_85,10))){
_85=parseInt(_85,10);
}else{
_85=_83.length;
}
var i,j=0,len=this._by_idx.length;
for(i=this.expandoRowIndex+1;j<_85;i++,j++){
this.cache.insertItem(i,{item:null,treePath:_86+"/"+j,expandoStatus:false});
}
this.updateRowCount(this.cache.items.length);
for(i=this.expandoRowIndex+1;i<len;i++){
delete this._by_idx[i];
}
this.cache.updateCache(this.expandoRowIndex,{childrenNum:_85});
for(i=0;i<_85;i++){
this.cache.updateCache(this.expandoRowIndex+1+i,{item:_83[i]});
}
for(i=0;i<Math.min(_85,this.keepRows);i++){
this._addItem(_83[i],this.expandoRowIndex+1+i,false);
this.updateRow(this.expandoRowIndex+1+i);
}
this.toggleLoadingClass(false);
this.stateChangeNode=null;
if(this._loading){
this._loading=false;
}
if(_85<this.keepRows&&this.cache.getTreePathByRowIndex(this.expandoRowIndex+1+_85)){
this._fetch(this.expandoRowIndex+1+_85);
}
},toggleLoadingClass:function(_87){
if(this.stateChangeNode){
dojo.toggleClass(this.stateChangeNode,"dojoxGridExpandoLoading",_87);
}
},styleRowNode:function(_88,_89){
if(_89){
this.rows.styleRowNode(_88,_89);
}
},onStyleRow:function(row){
if(!this.layout._isCollapsable){
this.inherited(arguments);
return;
}
var _8a=dojo.attr(row.node,"dojoxTreeGridBaseClasses");
if(_8a){
row.customClasses=_8a;
}
var i=row;
i.customClasses+=(i.odd?" dojoxGridRowOdd":"")+(i.selected?" dojoxGridRowSelected":"")+(i.over?" dojoxGridRowOver":"");
this.focus.styleRow(i);
this.edit.styleRow(i);
},dokeydown:function(e){
if(e.altKey||e.metaKey){
return;
}
var dk=dojo.keys,_8b=e.target,_8c=_8b&&_8b.firstChild?dijit.byId(_8b.firstChild.id):null;
if(e.keyCode===dk.ENTER&&_8c instanceof dojox.grid._LazyExpando){
_8c.onToggle();
}
this.onKeyDown(e);
}});
dojox.grid.LazyTreeGrid.markupFactory=function(_8d,_8e,_8f,_90){
return dojox.grid.TreeGrid.markupFactory(_8d,_8e,_8f,_90);
};
}
