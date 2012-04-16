/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid._TreeView"]){
dojo._hasResource["dojox.grid._TreeView"]=true;
dojo.provide("dojox.grid._TreeView");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojox.grid._View");
dojo.declare("dojox.grid._Expando",[dijit._Widget,dijit._Templated],{open:false,toggleClass:"",itemId:"",cellIdx:-1,view:null,rowNode:null,rowIdx:-1,expandoCell:null,level:0,templateString:"<div class=\"dojoxGridExpando\"\n\t><div class=\"dojoxGridExpandoNode\" dojoAttachEvent=\"onclick:onToggle\"\n\t\t><div class=\"dojoxGridExpandoNodeInner\" dojoAttachPoint=\"expandoInner\"></div\n\t></div\n></div>\n",_toggleRows:function(_1,_2){
if(!_1||!this.rowNode){
return;
}
if(dojo.query("table.dojoxGridRowTableNeedsRowUpdate").length){
if(this._initialized){
this.view.grid.updateRow(this.rowIdx);
}
return;
}
var _3=this;
var g=this.view.grid;
if(g.treeModel){
var p=this._tableRow?dojo.attr(this._tableRow,"dojoxTreeGridPath"):"";
if(p){
dojo.query("tr[dojoxTreeGridPath^=\""+p+"/\"]",this.rowNode).forEach(function(n){
var en=dojo.query(".dojoxGridExpando",n)[0];
if(en&&en.parentNode&&en.parentNode.parentNode&&!dojo.hasClass(en.parentNode.parentNode,"dojoxGridNoChildren")){
var ew=dijit.byNode(en);
if(ew){
ew._toggleRows(_1,ew.open&&_2);
}
}
n.style.display=_2?"":"none";
});
}
}else{
dojo.query("tr."+_1,this.rowNode).forEach(function(n){
if(dojo.hasClass(n,"dojoxGridExpandoRow")){
var en=dojo.query(".dojoxGridExpando",n)[0];
if(en){
var ew=dijit.byNode(en);
var _4=ew?ew.toggleClass:en.getAttribute("toggleClass");
var _5=ew?ew.open:_3.expandoCell.getOpenState(en.getAttribute("itemId"));
_3._toggleRows(_4,_5&&_2);
}
}
n.style.display=_2?"":"none";
});
}
},setOpen:function(_6){
if(_6&&dojo.hasClass(this.domNode,"dojoxGridExpandoLoading")){
_6=false;
}
var _7=this.view;
var _8=_7.grid;
var _9=_8.store;
var _a=_8.treeModel;
var d=this;
var _b=this.rowIdx;
var me=_8._by_idx[_b];
if(!me){
return;
}
if(_a&&!this._loadedChildren){
if(_6){
var _c=_8.getItem(dojo.attr(this._tableRow,"dojoxTreeGridPath"));
if(_c){
this.expandoInner.innerHTML="o";
dojo.addClass(this.domNode,"dojoxGridExpandoLoading");
_a.getChildren(_c,function(_d){
d._loadedChildren=true;
d._setOpen(_6);
});
}else{
this._setOpen(_6);
}
}else{
this._setOpen(_6);
}
}else{
if(!_a&&_9){
if(_6){
var _e=_8._by_idx[this.rowIdx];
if(_e&&!_9.isItemLoaded(_e.item)){
this.expandoInner.innerHTML="o";
dojo.addClass(this.domNode,"dojoxGridExpandoLoading");
_9.loadItem({item:_e.item,onItem:dojo.hitch(this,function(i){
var _f=_9.getIdentity(i);
_8._by_idty[_f]=_8._by_idx[this.rowIdx]={idty:_f,item:i};
this._setOpen(_6);
})});
}else{
this._setOpen(_6);
}
}else{
this._setOpen(_6);
}
}else{
this._setOpen(_6);
}
}
},_setOpen:function(_10){
if(_10&&this._tableRow&&dojo.hasClass(this._tableRow,"dojoxGridNoChildren")){
this._setOpen(false);
return;
}
this.expandoInner.innerHTML=_10?"-":"+";
dojo.removeClass(this.domNode,"dojoxGridExpandoLoading");
dojo.toggleClass(this.domNode,"dojoxGridExpandoOpened",_10);
if(this._tableRow){
dojo.toggleClass(this._tableRow,"dojoxGridRowCollapsed",!_10);
var _11=dojo.attr(this._tableRow,"dojoxTreeGridBaseClasses");
var _12="";
if(_10){
_12=dojo.trim((" "+_11+" ").replace(" dojoxGridRowCollapsed "," "));
}else{
if((" "+_11+" ").indexOf(" dojoxGridRowCollapsed ")<0){
_12=_11+(_11?" ":"")+"dojoxGridRowCollapsed";
}else{
_12=_11;
}
}
dojo.attr(this._tableRow,"dojoxTreeGridBaseClasses",_12);
}
var _13=(this.open!==_10);
this.open=_10;
if(this.expandoCell&&this.itemId){
this.expandoCell.openStates[this.itemId]=_10;
}
var v=this.view;
var g=v.grid;
if(this.toggleClass&&_13){
if(!this._tableRow||!this._tableRow.style.display){
this._toggleRows(this.toggleClass,_10);
}
}
if(v&&this._initialized&&this.rowIdx>=0){
g.rowHeightChanged(this.rowIdx);
g.postresize();
v.hasVScrollbar(true);
}
this._initialized=true;
},onToggle:function(e){
this.setOpen(!this.open);
dojo.stopEvent(e);
},setRowNode:function(_14,_15,_16){
if(this.cellIdx<0||!this.itemId){
return false;
}
this._initialized=false;
this.view=_16;
this.rowNode=_15;
this.rowIdx=_14;
this.expandoCell=_16.structure.cells[0][this.cellIdx];
var d=this.domNode;
if(d&&d.parentNode&&d.parentNode.parentNode){
this._tableRow=d.parentNode.parentNode;
}
this.open=this.expandoCell.getOpenState(this.itemId);
if(_16.grid.treeModel){
dojo.style(this.domNode,"marginLeft",(this.level*18)+"px");
if(this.domNode.parentNode){
dojo.style(this.domNode.parentNode,"backgroundPosition",((this.level*18)+(3))+"px");
}
}
this.setOpen(this.open);
return true;
}});
dojo.declare("dojox.grid._TreeContentBuilder",dojox.grid._ContentBuilder,{generateHtml:function(_17,_18){
var _19=this.getTableArray(),v=this.view,row=v.structure.cells[0],_1a=this.grid.getItem(_18),_1b=this.grid,_1c=this.grid.store;
dojox.grid.util.fire(this.view,"onBeforeRow",[_18,[row]]);
var _1d=function(_1e,_1f,_20,_21,_22,_23){
if(!_23){
if(_19[0].indexOf("dojoxGridRowTableNeedsRowUpdate")==-1){
_19[0]=_19[0].replace("dojoxGridRowTable","dojoxGridRowTable dojoxGridRowTableNeedsRowUpdate");
}
return;
}
var _24=_19.length;
_21=_21||[];
var _25=_21.join("|");
var _26=_21[_21.length-1];
var _27=_26+(_20?" dojoxGridSummaryRow":"");
var _28="";
if(_1b.treeModel&&_1f&&!_1b.treeModel.mayHaveChildren(_1f)){
_27+=" dojoxGridNoChildren";
}
_19.push("<tr style=\""+_28+"\" class=\""+_27+"\" dojoxTreeGridPath=\""+_22.join("/")+"\" dojoxTreeGridBaseClasses=\""+_27+"\">");
var _29=_1e+1;
var _2a=null;
for(var i=0,_2b;(_2b=row[i]);i++){
var m=_2b.markup,cc=_2b.customClasses=[],cs=_2b.customStyles=[];
m[5]=_2b.formatAtLevel(_22,_1f,_1e,_20,_26,cc);
m[1]=cc.join(" ");
m[3]=cs.join(";");
_19.push.apply(_19,m);
if(!_2a&&_2b.level===_29&&_2b.parentCell){
_2a=_2b.parentCell;
}
}
_19.push("</tr>");
if(_1f&&_1c&&_1c.isItem(_1f)){
var _2c=_1c.getIdentity(_1f);
if(typeof _1b._by_idty_paths[_2c]=="undefined"){
_1b._by_idty_paths[_2c]=_22.join("/");
}
}
var _2d;
var _2e;
var _2f;
var _30;
var _31=_22.concat([]);
if(_1b.treeModel&&_1f){
if(_1b.treeModel.mayHaveChildren(_1f)){
_2d=v.structure.cells[0][_1b.expandoCell||0];
_2e=_2d.getOpenState(_1f)&&_23;
_2f=new dojox.grid.TreePath(_22.join("/"),_1b);
_30=_2f.children(true)||[];
dojo.forEach(_30,function(_32,idx){
var _33=_25.split("|");
_33.push(_33[_33.length-1]+"-"+idx);
_31.push(idx);
_1d(_29,_32,false,_33,_31,_2e);
_31.pop();
});
}
}else{
if(_1f&&_2a&&!_20){
_2d=v.structure.cells[0][_2a.level];
_2e=_2d.getOpenState(_1f)&&_23;
if(_1c.hasAttribute(_1f,_2a.field)){
var _34=_25.split("|");
_34.pop();
_2f=new dojox.grid.TreePath(_22.join("/"),_1b);
_30=_2f.children(true)||[];
if(_30.length){
_19[_24]="<tr class=\""+_34.join(" ")+" dojoxGridExpandoRow\" dojoxTreeGridPath=\""+_22.join("/")+"\">";
dojo.forEach(_30,function(_35,idx){
var _36=_25.split("|");
_36.push(_36[_36.length-1]+"-"+idx);
_31.push(idx);
_1d(_29,_35,false,_36,_31,_2e);
_31.pop();
});
_31.push(_30.length);
_1d(_1e,_1f,true,_21,_31,_2e);
}else{
_19[_24]="<tr class=\""+_26+" dojoxGridNoChildren\" dojoxTreeGridPath=\""+_22.join("/")+"\">";
}
}else{
if(!_1c.isItemLoaded(_1f)){
_19[0]=_19[0].replace("dojoxGridRowTable","dojoxGridRowTable dojoxGridRowTableNeedsRowUpdate");
}else{
_19[_24]="<tr class=\""+_26+" dojoxGridNoChildren\" dojoxTreeGridPath=\""+_22.join("/")+"\">";
}
}
}else{
if(_1f&&!_20&&_21.length>1){
_19[_24]="<tr class=\""+_21[_21.length-2]+"\" dojoxTreeGridPath=\""+_22.join("/")+"\">";
}
}
}
};
_1d(0,_1a,false,["dojoxGridRowToggle-"+_18],[_18],true);
_19.push("</table>");
return _19.join("");
},findTarget:function(_37,_38){
var n=_37;
while(n&&(n!=this.domNode)){
if(n.tagName&&n.tagName.toLowerCase()=="tr"){
break;
}
n=n.parentNode;
}
return (n!=this.domNode)?n:null;
},getCellNode:function(_39,_3a){
var _3b=dojo.query("td[idx='"+_3a+"']",_39)[0];
if(_3b&&_3b.parentNode&&!dojo.hasClass(_3b.parentNode,"dojoxGridSummaryRow")){
return _3b;
}
},decorateEvent:function(e){
e.rowNode=this.findRowTarget(e.target);
if(!e.rowNode){
return false;
}
e.rowIndex=dojo.attr(e.rowNode,"dojoxTreeGridPath");
this.baseDecorateEvent(e);
e.cell=this.grid.getCell(e.cellIndex);
return true;
}});
dojo.declare("dojox.grid._TreeView",[dojox.grid._View],{_contentBuilderClass:dojox.grid._TreeContentBuilder,_onDndDrop:function(_3c,_3d,_3e){
if(this.grid&&this.grid.aggregator){
this.grid.aggregator.clearSubtotalCache();
}
this.inherited(arguments);
},postCreate:function(){
this.inherited(arguments);
this.connect(this.grid,"_cleanupExpandoCache","_cleanupExpandoCache");
},_cleanupExpandoCache:function(_3f,_40,_41){
if(_3f==-1){
return;
}
dojo.forEach(this.grid.layout.cells,function(_42){
if(typeof _42["openStates"]!="undefined"){
if(_40 in _42.openStates){
delete _42.openStates[_40];
}
}
});
if(typeof _3f=="string"&&_3f.indexOf("/")>-1){
var _43=new dojox.grid.TreePath(_3f,this.grid);
var _44=_43.parent();
while(_44){
_43=_44;
_44=_43.parent();
}
var _45=_43.item();
if(!_45){
return;
}
var _46=this.grid.store.getIdentity(_45);
if(typeof this._expandos[_46]!="undefined"){
for(var i in this._expandos[_46]){
var exp=this._expandos[_46][i];
if(exp){
exp.destroy();
}
delete this._expandos[_46][i];
}
delete this._expandos[_46];
}
}else{
for(var i in this._expandos){
if(typeof this._expandos[i]!="undefined"){
for(var j in this._expandos[i]){
var exp=this._expandos[i][j];
if(exp){
exp.destroy();
}
}
}
}
this._expandos={};
}
},postMixInProperties:function(){
this.inherited(arguments);
this._expandos={};
},onBeforeRow:function(_47,_48){
var g=this.grid;
if(g._by_idx&&g._by_idx[_47]&&g._by_idx[_47].idty){
var _49=g._by_idx[_47].idty;
this._expandos[_49]=this._expandos[_49]||{};
}
this.inherited(arguments);
},onAfterRow:function(_4a,_4b,_4c){
dojo.forEach(dojo.query("span.dojoxGridExpando",_4c),function(n){
if(n&&n.parentNode){
var tc=n.getAttribute("toggleClass");
var _4d;
var _4e;
var g=this.grid;
if(g._by_idx&&g._by_idx[_4a]&&g._by_idx[_4a].idty){
_4d=g._by_idx[_4a].idty;
_4e=this._expandos[_4d][tc];
}
if(_4e){
dojo.place(_4e.domNode,n,"replace");
_4e.itemId=n.getAttribute("itemId");
_4e.cellIdx=parseInt(n.getAttribute("cellIdx"),10);
if(isNaN(_4e.cellIdx)){
_4e.cellIdx=-1;
}
}else{
_4e=dojo.parser.parse(n.parentNode)[0];
if(_4d){
this._expandos[_4d][tc]=_4e;
}
}
if(!_4e.setRowNode(_4a,_4c,this)){
_4e.domNode.parentNode.removeChild(_4e.domNode);
}
}
},this);
var alt=false;
var _4f=this;
dojo.query("tr[dojoxTreeGridPath]",_4c).forEach(function(n){
dojo.toggleClass(n,"dojoxGridSubRowAlt",alt);
dojo.attr(n,"dojoxTreeGridBaseClasses",n.className);
alt=!alt;
_4f.grid.rows.styleRowNode(dojo.attr(n,"dojoxTreeGridPath"),n);
});
this.inherited(arguments);
},updateRowStyles:function(_50){
var _51=dojo.query("tr[dojoxTreeGridPath='"+_50+"']",this.domNode);
if(_51.length){
this.styleRowNode(_50,_51[0]);
}
},getCellNode:function(_52,_53){
var row=dojo.query("tr[dojoxTreeGridPath='"+_52+"']",this.domNode)[0];
if(row){
return this.content.getCellNode(row,_53);
}
}});
}
