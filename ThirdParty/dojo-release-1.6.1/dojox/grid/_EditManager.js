/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid._EditManager"]){
dojo._hasResource["dojox.grid._EditManager"]=true;
dojo.provide("dojox.grid._EditManager");
dojo.require("dojox.grid.util");
dojo.declare("dojox.grid._EditManager",null,{constructor:function(_1){
this.grid=_1;
if(dojo.isIE){
this.connections=[dojo.connect(document.body,"onfocus",dojo.hitch(this,"_boomerangFocus"))];
}else{
this.connections=[dojo.connect(this.grid,"onBlur",this,"apply")];
}
},info:{},destroy:function(){
dojo.forEach(this.connections,dojo.disconnect);
},cellFocus:function(_2,_3){
if(this.grid.singleClickEdit||this.isEditRow(_3)){
this.setEditCell(_2,_3);
}else{
this.apply();
}
if(this.isEditing()||(_2&&_2.editable&&_2.alwaysEditing)){
this._focusEditor(_2,_3);
}
},rowClick:function(e){
if(this.isEditing()&&!this.isEditRow(e.rowIndex)){
this.apply();
}
},styleRow:function(_4){
if(_4.index==this.info.rowIndex){
_4.customClasses+=" dojoxGridRowEditing";
}
},dispatchEvent:function(e){
var c=e.cell,ed=(c&&c["editable"])?c:0;
return ed&&ed.dispatchEvent(e.dispatch,e);
},isEditing:function(){
return this.info.rowIndex!==undefined;
},isEditCell:function(_5,_6){
return (this.info.rowIndex===_5)&&(this.info.cell.index==_6);
},isEditRow:function(_7){
return this.info.rowIndex===_7;
},setEditCell:function(_8,_9){
if(!this.isEditCell(_9,_8.index)&&this.grid.canEdit&&this.grid.canEdit(_8,_9)){
this.start(_8,_9,this.isEditRow(_9)||_8.editable);
}
},_focusEditor:function(_a,_b){
dojox.grid.util.fire(_a,"focus",[_b]);
},focusEditor:function(){
if(this.isEditing()){
this._focusEditor(this.info.cell,this.info.rowIndex);
}
},_boomerangWindow:500,_shouldCatchBoomerang:function(){
return this._catchBoomerang>new Date().getTime();
},_boomerangFocus:function(){
if(this._shouldCatchBoomerang()){
this.grid.focus.focusGrid();
this.focusEditor();
this._catchBoomerang=0;
}
},_doCatchBoomerang:function(){
if(dojo.isIE){
this._catchBoomerang=new Date().getTime()+this._boomerangWindow;
}
},start:function(_c,_d,_e){
this.grid.beginUpdate();
this.editorApply();
if(this.isEditing()&&!this.isEditRow(_d)){
this.applyRowEdit();
this.grid.updateRow(_d);
}
if(_e){
this.info={cell:_c,rowIndex:_d};
this.grid.doStartEdit(_c,_d);
this.grid.updateRow(_d);
}else{
this.info={};
}
this.grid.endUpdate();
this.grid.focus.focusGrid();
this._focusEditor(_c,_d);
this._doCatchBoomerang();
},_editorDo:function(_f){
var c=this.info.cell;
if(c&&c.editable){
c[_f](this.info.rowIndex);
}
},editorApply:function(){
this._editorDo("apply");
},editorCancel:function(){
this._editorDo("cancel");
},applyCellEdit:function(_10,_11,_12){
if(this.grid.canEdit(_11,_12)){
this.grid.doApplyCellEdit(_10,_12,_11.field);
}
},applyRowEdit:function(){
this.grid.doApplyEdit(this.info.rowIndex,this.info.cell.field);
},apply:function(){
if(this.isEditing()){
this.grid.beginUpdate();
this.editorApply();
this.applyRowEdit();
this.info={};
this.grid.endUpdate();
this.grid.focus.focusGrid();
this._doCatchBoomerang();
}
},cancel:function(){
if(this.isEditing()){
this.grid.beginUpdate();
this.editorCancel();
this.info={};
this.grid.endUpdate();
this.grid.focus.focusGrid();
this._doCatchBoomerang();
}
},save:function(_13,_14){
var c=this.info.cell;
if(this.isEditRow(_13)&&(!_14||c.view==_14)&&c.editable){
c.save(c,this.info.rowIndex);
}
},restore:function(_15,_16){
var c=this.info.cell;
if(this.isEditRow(_16)&&c.view==_15&&c.editable){
c.restore(c,this.info.rowIndex);
}
}});
}
