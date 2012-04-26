/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.Rearrange"]){
dojo._hasResource["dojox.grid.enhanced.plugins.Rearrange"]=true;
dojo.provide("dojox.grid.enhanced.plugins.Rearrange");
dojo.require("dojox.grid.enhanced._Plugin");
dojo.require("dojox.grid.enhanced.plugins._RowMapLayer");
dojo.declare("dojox.grid.enhanced.plugins.Rearrange",dojox.grid.enhanced._Plugin,{name:"rearrange",constructor:function(_1,_2){
this.grid=_1;
this.setArgs(_2);
var _3=new dojox.grid.enhanced.plugins._RowMapLayer(_1);
dojox.grid.enhanced.plugins.wrap(_1,"_storeLayerFetch",_3);
},setArgs:function(_4){
this.args=dojo.mixin(this.args||{},_4||{});
this.args.setIdentifierForNewItem=this.args.setIdentifierForNewItem||function(v){
return v;
};
},destroy:function(){
this.inherited(arguments);
this.grid.unwrap("rowmap");
},onSetStore:function(_5){
this.grid.layer("rowmap").clearMapping();
},_hasIdentity:function(_6){
var g=this.grid,s=g.store,_7=g.layout.cells;
if(s.getFeatures()["dojo.data.api.Identity"]){
if(dojo.some(_6,function(_8){
return s.getIdentityAttributes(g._by_idx[_8.r].item)==_7[_8.c].field;
})){
return true;
}
}
return false;
},moveColumns:function(_9,_a){
var g=this.grid,_b=g.layout,_c=_b.cells,_d,i,_e=0,_f=true,tmp={},_10={};
_9.sort(function(a,b){
return a-b;
});
for(i=0;i<_9.length;++i){
tmp[_9[i]]=i;
if(_9[i]<_a){
++_e;
}
}
var _11=0;
var _12=0;
var _13=Math.max(_9[_9.length-1],_a);
if(_13==_c.length){
--_13;
}
for(i=_9[0];i<=_13;++i){
var j=tmp[i];
if(j>=0){
if(i!=_a-_e+j){
_10[i]=_a-_e+j;
}
_11=j+1;
_12=_9.length-j-1;
}else{
if(i<_a&&_11>0){
_10[i]=i-_11;
}else{
if(i>=_a&&_12>0){
_10[i]=i+_12;
}
}
}
}
_e=0;
if(_a==_c.length){
--_a;
_f=false;
}
g._notRefreshSelection=true;
for(i=0;i<_9.length;++i){
_d=_9[i];
if(_d<_a){
_d-=_e;
}
++_e;
if(_d!=_a){
_b.moveColumn(_c[_d].view.idx,_c[_a].view.idx,_d,_a,_f);
_c=_b.cells;
}
if(_a<=_d){
++_a;
}
}
delete g._notRefreshSelection;
dojo.publish("dojox/grid/rearrange/move/"+g.id,["col",_10,_9]);
},moveRows:function(_14,_15){
var g=this.grid,_16={},_17=[],_18=[],len=_14.length,i,r,k,arr,_19,_1a;
for(i=0;i<len;++i){
r=_14[i];
if(r>=_15){
break;
}
_17.push(r);
}
_18=_14.slice(i);
arr=_17;
len=arr.length;
if(len){
_19={};
dojo.forEach(arr,function(r){
_19[r]=true;
});
_16[arr[0]]=_15-len;
for(k=0,i=arr[k]+1,_1a=i-1;i<_15;++i){
if(!_19[i]){
_16[i]=_1a;
++_1a;
}else{
++k;
_16[i]=_15-len+k;
}
}
}
arr=_18;
len=arr.length;
if(len){
_19={};
dojo.forEach(arr,function(r){
_19[r]=true;
});
_16[arr[len-1]]=_15+len-1;
for(k=len-1,i=arr[k]-1,_1a=i+1;i>=_15;--i){
if(!_19[i]){
_16[i]=_1a;
--_1a;
}else{
--k;
_16[i]=_15+k;
}
}
}
var _1b=dojo.clone(_16);
g.layer("rowmap").setMapping(_16);
g.forEachLayer(function(_1c){
if(_1c.name()!="rowmap"){
_1c.invalidate();
return true;
}else{
return false;
}
},false);
g.selection.selected=[];
g._noInternalMapping=true;
g._refresh();
setTimeout(function(){
dojo.publish("dojox/grid/rearrange/move/"+g.id,["row",_1b,_14]);
g._noInternalMapping=false;
},0);
},moveCells:function(_1d,_1e){
var g=this.grid,s=g.store;
if(s.getFeatures()["dojo.data.api.Write"]){
if(_1d.min.row==_1e.min.row&&_1d.min.col==_1e.min.col){
return;
}
var _1f=g.layout.cells,cnt=_1d.max.row-_1d.min.row+1,r,c,tr,tc,_20=[],_21=[];
for(r=_1d.min.row,tr=_1e.min.row;r<=_1d.max.row;++r,++tr){
for(c=_1d.min.col,tc=_1e.min.col;c<=_1d.max.col;++c,++tc){
while(_1f[c]&&_1f[c].hidden){
++c;
}
while(_1f[tc]&&_1f[tc].hidden){
++tc;
}
_20.push({"r":r,"c":c});
_21.push({"r":tr,"c":tc,"v":_1f[c].get(r,g._by_idx[r].item)});
}
}
if(this._hasIdentity(_20.concat(_21))){
console.warn("Can not write to identity!");
return;
}
dojo.forEach(_20,function(_22){
s.setValue(g._by_idx[_22.r].item,_1f[_22.c].field,"");
});
dojo.forEach(_21,function(_23){
s.setValue(g._by_idx[_23.r].item,_1f[_23.c].field,_23.v);
});
s.save({onComplete:function(){
dojo.publish("dojox/grid/rearrange/move/"+g.id,["cell",{"from":_1d,"to":_1e}]);
}});
}
},copyCells:function(_24,_25){
var g=this.grid,s=g.store;
if(s.getFeatures()["dojo.data.api.Write"]){
if(_24.min.row==_25.min.row&&_24.min.col==_25.min.col){
return;
}
var _26=g.layout.cells,cnt=_24.max.row-_24.min.row+1,r,c,tr,tc,_27=[];
for(r=_24.min.row,tr=_25.min.row;r<=_24.max.row;++r,++tr){
for(c=_24.min.col,tc=_25.min.col;c<=_24.max.col;++c,++tc){
while(_26[c]&&_26[c].hidden){
++c;
}
while(_26[tc]&&_26[tc].hidden){
++tc;
}
_27.push({"r":tr,"c":tc,"v":_26[c].get(r,g._by_idx[r].item)});
}
}
if(this._hasIdentity(_27)){
console.warn("Can not write to identity!");
return;
}
dojo.forEach(_27,function(_28){
s.setValue(g._by_idx[_28.r].item,_26[_28.c].field,_28.v);
});
s.save({onComplete:function(){
setTimeout(function(){
dojo.publish("dojox/grid/rearrange/copy/"+g.id,["cell",{"from":_24,"to":_25}]);
},0);
}});
}
},changeCells:function(_29,_2a,_2b){
var g=this.grid,s=g.store;
if(s.getFeatures()["dojo.data.api.Write"]){
var _2c=_29,_2d=g.layout.cells,_2e=_2c.layout.cells,cnt=_2a.max.row-_2a.min.row+1,r,c,tr,tc,_2f=[];
for(r=_2a.min.row,tr=_2b.min.row;r<=_2a.max.row;++r,++tr){
for(c=_2a.min.col,tc=_2b.min.col;c<=_2a.max.col;++c,++tc){
while(_2e[c]&&_2e[c].hidden){
++c;
}
while(_2d[tc]&&_2d[tc].hidden){
++tc;
}
_2f.push({"r":tr,"c":tc,"v":_2e[c].get(r,_2c._by_idx[r].item)});
}
}
if(this._hasIdentity(_2f)){
console.warn("Can not write to identity!");
return;
}
dojo.forEach(_2f,function(_30){
s.setValue(g._by_idx[_30.r].item,_2d[_30.c].field,_30.v);
});
s.save({onComplete:function(){
dojo.publish("dojox/grid/rearrange/change/"+g.id,["cell",_2b]);
}});
}
},clearCells:function(_31){
var g=this.grid,s=g.store;
if(s.getFeatures()["dojo.data.api.Write"]){
var _32=g.layout.cells,cnt=_31.max.row-_31.min.row+1,r,c,_33=[];
for(r=_31.min.row;r<=_31.max.row;++r){
for(c=_31.min.col;c<=_31.max.col;++c){
while(_32[c]&&_32[c].hidden){
++c;
}
_33.push({"r":r,"c":c});
}
}
if(this._hasIdentity(_33)){
console.warn("Can not write to identity!");
return;
}
dojo.forEach(_33,function(_34){
s.setValue(g._by_idx[_34.r].item,_32[_34.c].field,"");
});
s.save({onComplete:function(){
dojo.publish("dojox/grid/rearrange/change/"+g.id,["cell",_31]);
}});
}
},insertRows:function(_35,_36,_37){
try{
var g=this.grid,s=g.store,_38=g.rowCount,_39={},obj={idx:0},_3a=[],i,_3b=this;
var len=_36.length;
for(i=_37;i<g.rowCount;++i){
_39[i]=i+len;
}
if(s.getFeatures()["dojo.data.api.Write"]){
if(_35){
var _3c=_35,_3d=_3c.store,_3e;
for(i=0;!_3e;++i){
_3e=g._by_idx[i];
}
var _3f=s.getAttributes(_3e.item);
var _40=[];
dojo.forEach(_36,function(_41,i){
var _42={};
var _43=_3c._by_idx[_41];
if(_43){
dojo.forEach(_3f,function(_44){
_42[_44]=_3d.getValue(_43.item,_44);
});
_42=_3b.args.setIdentifierForNewItem(_42,s,_38+obj.idx)||_42;
try{
s.newItem(_42);
_3a.push(_37+i);
_39[_38+obj.idx]=_37+i;
++obj.idx;
}
catch(e){
}
}else{
_40.push(_41);
}
});
}else{
if(_36.length&&dojo.isObject(_36[0])){
dojo.forEach(_36,function(_45,i){
var _46=_3b.args.setIdentifierForNewItem(_45,s,_38+obj.idx)||_45;
try{
s.newItem(_46);
_3a.push(_37+i);
_39[_38+obj.idx]=_37+i;
++obj.idx;
}
catch(e){
}
});
}else{
return;
}
}
g.layer("rowmap").setMapping(_39);
s.save({onComplete:function(){
g._refresh();
setTimeout(function(){
dojo.publish("dojox/grid/rearrange/insert/"+g.id,["row",_3a]);
},0);
}});
}
}
catch(e){
}
},removeRows:function(_47){
var g=this.grid;
var s=g.store;
try{
dojo.forEach(dojo.map(_47,function(_48){
return g._by_idx[_48];
}),function(row){
if(row){
s.deleteItem(row.item);
}
});
s.save({onComplete:function(){
dojo.publish("dojox/grid/rearrange/remove/"+g.id,["row",_47]);
}});
}
catch(e){
}
},_getPageInfo:function(){
var _49=this.grid.scroller,_4a=_49.page,_4b=_49.page,_4c=_49.firstVisibleRow,_4d=_49.lastVisibleRow,_4e=_49.rowsPerPage,_4f=_49.pageNodes[0],_50,_51,_52,_53=[];
dojo.forEach(_4f,function(_54,_55){
if(!_54){
return;
}
_52=false;
_50=_55*_4e;
_51=(_55+1)*_4e-1;
if(_4c>=_50&&_4c<=_51){
_4a=_55;
_52=true;
}
if(_4d>=_50&&_4d<=_51){
_4b=_55;
_52=true;
}
if(!_52&&(_50>_4d||_51<_4c)){
_53.push(_55);
}
});
return {topPage:_4a,bottomPage:_4b,invalidPages:_53};
}});
dojox.grid.EnhancedGrid.registerPlugin(dojox.grid.enhanced.plugins.Rearrange);
}
