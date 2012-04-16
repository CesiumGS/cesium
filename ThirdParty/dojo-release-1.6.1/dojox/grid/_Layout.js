/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid._Layout"]){
dojo._hasResource["dojox.grid._Layout"]=true;
dojo.provide("dojox.grid._Layout");
dojo.require("dojox.grid.cells");
dojo.require("dojox.grid._RowSelector");
dojo.declare("dojox.grid._Layout",null,{constructor:function(_1){
this.grid=_1;
},cells:[],structure:null,defaultWidth:"6em",moveColumn:function(_2,_3,_4,_5,_6){
var _7=this.structure[_2].cells[0];
var _8=this.structure[_3].cells[0];
var _9=null;
var _a=0;
var _b=0;
for(var i=0,c;c=_7[i];i++){
if(c.index==_4){
_a=i;
break;
}
}
_9=_7.splice(_a,1)[0];
_9.view=this.grid.views.views[_3];
for(i=0,c=null;c=_8[i];i++){
if(c.index==_5){
_b=i;
break;
}
}
if(!_6){
_b+=1;
}
_8.splice(_b,0,_9);
var _c=this.grid.getCell(this.grid.getSortIndex());
if(_c){
_c._currentlySorted=this.grid.getSortAsc();
}
this.cells=[];
_4=0;
var v;
for(i=0;v=this.structure[i];i++){
for(var j=0,cs;cs=v.cells[j];j++){
for(var k=0;c=cs[k];k++){
c.index=_4;
this.cells.push(c);
if("_currentlySorted" in c){
var si=_4+1;
si*=c._currentlySorted?1:-1;
this.grid.sortInfo=si;
delete c._currentlySorted;
}
_4++;
}
}
}
dojo.forEach(this.cells,function(c){
var _d=c.markup[2].split(" ");
var _e=parseInt(_d[1].substring(5));
if(_e!=c.index){
_d[1]="idx=\""+c.index+"\"";
c.markup[2]=_d.join(" ");
}
});
this.grid.setupHeaderMenu();
},setColumnVisibility:function(_f,_10){
var _11=this.cells[_f];
if(_11.hidden==_10){
_11.hidden=!_10;
var v=_11.view,w=v.viewWidth;
if(w&&w!="auto"){
v._togglingColumn=dojo.marginBox(_11.getHeaderNode()).w||0;
}
v.update();
return true;
}else{
return false;
}
},addCellDef:function(_12,_13,_14){
var _15=this;
var _16=function(_17){
var w=0;
if(_17.colSpan>1){
w=0;
}else{
w=_17.width||_15._defaultCellProps.width||_15.defaultWidth;
if(!isNaN(w)){
w=w+"em";
}
}
return w;
};
var _18={grid:this.grid,subrow:_12,layoutIndex:_13,index:this.cells.length};
if(_14&&_14 instanceof dojox.grid.cells._Base){
var _19=dojo.clone(_14);
_18.unitWidth=_16(_19._props);
_19=dojo.mixin(_19,this._defaultCellProps,_14._props,_18);
return _19;
}
var _1a=_14.type||_14.cellType||this._defaultCellProps.type||this._defaultCellProps.cellType||dojox.grid.cells.Cell;
_18.unitWidth=_16(_14);
return new _1a(dojo.mixin({},this._defaultCellProps,_14,_18));
},addRowDef:function(_1b,_1c){
var _1d=[];
var _1e=0,_1f=0,_20=true;
for(var i=0,def,_21;(def=_1c[i]);i++){
_21=this.addCellDef(_1b,i,def);
_1d.push(_21);
this.cells.push(_21);
if(_20&&_21.relWidth){
_1e+=_21.relWidth;
}else{
if(_21.width){
var w=_21.width;
if(typeof w=="string"&&w.slice(-1)=="%"){
_1f+=window.parseInt(w,10);
}else{
if(w=="auto"){
_20=false;
}
}
}
}
}
if(_1e&&_20){
dojo.forEach(_1d,function(_22){
if(_22.relWidth){
_22.width=_22.unitWidth=((_22.relWidth/_1e)*(100-_1f))+"%";
}
});
}
return _1d;
},addRowsDef:function(_23){
var _24=[];
if(dojo.isArray(_23)){
if(dojo.isArray(_23[0])){
for(var i=0,row;_23&&(row=_23[i]);i++){
_24.push(this.addRowDef(i,row));
}
}else{
_24.push(this.addRowDef(0,_23));
}
}
return _24;
},addViewDef:function(_25){
this._defaultCellProps=_25.defaultCell||{};
if(_25.width&&_25.width=="auto"){
delete _25.width;
}
return dojo.mixin({},_25,{cells:this.addRowsDef(_25.rows||_25.cells)});
},setStructure:function(_26){
this.fieldIndex=0;
this.cells=[];
var s=this.structure=[];
if(this.grid.rowSelector){
var sel={type:dojox._scopeName+".grid._RowSelector"};
if(dojo.isString(this.grid.rowSelector)){
var _27=this.grid.rowSelector;
if(_27=="false"){
sel=null;
}else{
if(_27!="true"){
sel["width"]=_27;
}
}
}else{
if(!this.grid.rowSelector){
sel=null;
}
}
if(sel){
s.push(this.addViewDef(sel));
}
}
var _28=function(def){
return ("name" in def||"field" in def||"get" in def);
};
var _29=function(def){
if(dojo.isArray(def)){
if(dojo.isArray(def[0])||_28(def[0])){
return true;
}
}
return false;
};
var _2a=function(def){
return (def!==null&&dojo.isObject(def)&&("cells" in def||"rows" in def||("type" in def&&!_28(def))));
};
if(dojo.isArray(_26)){
var _2b=false;
for(var i=0,st;(st=_26[i]);i++){
if(_2a(st)){
_2b=true;
break;
}
}
if(!_2b){
s.push(this.addViewDef({cells:_26}));
}else{
for(i=0;(st=_26[i]);i++){
if(_29(st)){
s.push(this.addViewDef({cells:st}));
}else{
if(_2a(st)){
s.push(this.addViewDef(st));
}
}
}
}
}else{
if(_2a(_26)){
s.push(this.addViewDef(_26));
}
}
this.cellCount=this.cells.length;
this.grid.setupHeaderMenu();
}});
}
