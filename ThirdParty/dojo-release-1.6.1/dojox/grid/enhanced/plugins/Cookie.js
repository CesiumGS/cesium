/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.Cookie"]){
dojo._hasResource["dojox.grid.enhanced.plugins.Cookie"]=true;
dojo.provide("dojox.grid.enhanced.plugins.Cookie");
dojo.require("dojox.grid.enhanced._Plugin");
dojo.require("dojo.cookie");
dojo.require("dojox.grid._RowSelector");
dojo.require("dojox.grid.cells._base");
(function(){
var _1=function(_2){
return window.location+"/"+_2.id;
};
var _3=function(_4){
var _5=[];
if(!dojo.isArray(_4)){
_4=[_4];
}
dojo.forEach(_4,function(_6){
if(dojo.isArray(_6)){
_6={"cells":_6};
}
var _7=_6.rows||_6.cells;
if(dojo.isArray(_7)){
if(!dojo.isArray(_7[0])){
_7=[_7];
}
dojo.forEach(_7,function(_8){
if(dojo.isArray(_8)){
dojo.forEach(_8,function(_9){
_5.push(_9);
});
}
});
}
});
return _5;
};
var _a=function(_b,_c){
if(dojo.isArray(_b)){
var _d=_c._setStructureAttr;
_c._setStructureAttr=function(_e){
if(!_c._colWidthLoaded){
_c._colWidthLoaded=true;
var _f=_3(_e);
for(var i=_f.length-1;i>=0;--i){
if(typeof _b[i]=="number"){
_f[i].width=_b[i]+"px";
}
}
}
_d.call(_c,_e);
_c._setStructureAttr=_d;
};
}
};
var _10=function(_11){
return dojo.map(dojo.filter(_11.layout.cells,function(_12){
return !(_12.isRowSelector||_12 instanceof dojox.grid.cells.RowIndex);
}),function(_13){
return dojo[dojo.isWebKit?"marginBox":"contentBox"](_13.getHeaderNode()).w;
});
};
var _14=function(_15,_16){
if(_15&&dojo.every(_15,function(_17){
return dojo.isArray(_17)&&dojo.every(_17,function(_18){
return dojo.isArray(_18)&&_18.length>0;
});
})){
var _19=_16._setStructureAttr;
var _1a=function(def){
return ("name" in def||"field" in def||"get" in def);
};
var _1b=function(def){
return (def!==null&&dojo.isObject(def)&&("cells" in def||"rows" in def||("type" in def&&!_1a(def))));
};
_16._setStructureAttr=function(_1c){
if(!_16._colOrderLoaded){
_16._colOrderLoaded=true;
_16._setStructureAttr=_19;
_1c=dojo.clone(_1c);
if(dojo.isArray(_1c)&&!dojo.some(_1c,_1b)){
_1c=[{cells:_1c}];
}else{
if(_1b(_1c)){
_1c=[_1c];
}
}
var _1d=_3(_1c);
dojo.forEach(dojo.isArray(_1c)?_1c:[_1c],function(_1e,_1f){
var _20=_1e;
if(dojo.isArray(_1e)){
_1e.splice(0,_1e.length);
}else{
delete _1e.rows;
_20=_1e.cells=[];
}
dojo.forEach(_15[_1f],function(_21){
dojo.forEach(_21,function(_22){
var i,_23;
for(i=0;i<_1d.length;++i){
_23=_1d[i];
if(dojo.toJson({"name":_23.name,"field":_23.field})==dojo.toJson(_22)){
break;
}
}
if(i<_1d.length){
_20.push(_23);
}
});
});
});
}
_19.call(_16,_1c);
};
}
};
var _24=function(_25){
var _26=dojo.map(dojo.filter(_25.views.views,function(_27){
return !(_27 instanceof dojox.grid._RowSelector);
}),function(_28){
return dojo.map(_28.structure.cells,function(_29){
return dojo.map(dojo.filter(_29,function(_2a){
return !(_2a.isRowSelector||_2a instanceof dojox.grid.cells.RowIndex);
}),function(_2b){
return {"name":_2b.name,"field":_2b.field};
});
});
});
return _26;
};
var _2c=function(_2d,_2e){
try{
if(dojo.isObject(_2d)){
_2e.setSortIndex(_2d.idx,_2d.asc);
}
}
catch(e){
}
};
var _2f=function(_30){
return {idx:_30.getSortIndex(),asc:_30.getSortAsc()};
};
if(!dojo.isIE){
dojo.addOnWindowUnload(function(){
dojo.forEach(dijit.findWidgets(dojo.body()),function(_31){
if(_31 instanceof dojox.grid.EnhancedGrid&&!_31._destroyed){
_31.destroyRecursive();
}
});
});
}
dojo.declare("dojox.grid.enhanced.plugins.Cookie",dojox.grid.enhanced._Plugin,{name:"cookie",_cookieEnabled:true,constructor:function(_32,_33){
this.grid=_32;
_33=(_33&&dojo.isObject(_33))?_33:{};
this.cookieProps=_33.cookieProps;
this._cookieHandlers=[];
this._mixinGrid();
this.addCookieHandler({name:"columnWidth",onLoad:_a,onSave:_10});
this.addCookieHandler({name:"columnOrder",onLoad:_14,onSave:_24});
this.addCookieHandler({name:"sortOrder",onLoad:_2c,onSave:_2f});
dojo.forEach(this._cookieHandlers,function(_34){
if(_33[_34.name]===false){
_34.enable=false;
}
},this);
},destroy:function(){
this._saveCookie();
this._cookieHandlers=null;
this.inherited(arguments);
},_mixinGrid:function(){
var g=this.grid;
g.addCookieHandler=dojo.hitch(this,"addCookieHandler");
g.removeCookie=dojo.hitch(this,"removeCookie");
g.setCookieEnabled=dojo.hitch(this,"setCookieEnabled");
g.getCookieEnabled=dojo.hitch(this,"getCookieEnabled");
},_saveCookie:function(){
if(this.getCookieEnabled()){
var _35={},chs=this._cookieHandlers,_36=this.cookieProps,_37=_1(this.grid);
for(var i=chs.length-1;i>=0;--i){
if(chs[i].enabled){
_35[chs[i].name]=chs[i].onSave(this.grid);
}
}
_36=dojo.isObject(this.cookieProps)?this.cookieProps:{};
dojo.cookie(_37,dojo.toJson(_35),_36);
}else{
this.removeCookie();
}
},onPreInit:function(){
var _38=this.grid,chs=this._cookieHandlers,_39=_1(_38),_3a=dojo.cookie(_39);
if(_3a){
_3a=dojo.fromJson(_3a);
for(var i=0;i<chs.length;++i){
if(chs[i].name in _3a&&chs[i].enabled){
chs[i].onLoad(_3a[chs[i].name],_38);
}
}
}
this._cookie=_3a||{};
this._cookieStartedup=true;
},addCookieHandler:function(_3b){
if(_3b.name){
var _3c=function(){
};
_3b.onLoad=_3b.onLoad||_3c;
_3b.onSave=_3b.onSave||_3c;
if(!("enabled" in _3b)){
_3b.enabled=true;
}
for(var i=this._cookieHandlers.length-1;i>=0;--i){
if(this._cookieHandlers[i].name==_3b.name){
this._cookieHandlers.splice(i,1);
}
}
this._cookieHandlers.push(_3b);
if(this._cookieStartedup&&_3b.name in this._cookie){
_3b.onLoad(this._cookie[_3b.name],this.grid);
}
}
},removeCookie:function(){
var key=_1(this.grid);
dojo.cookie(key,null,{expires:-1});
},setCookieEnabled:function(_3d,_3e){
if(arguments.length==2){
var chs=this._cookieHandlers;
for(var i=chs.length-1;i>=0;--i){
if(chs[i].name===_3d){
chs[i].enabled=!!_3e;
}
}
}else{
this._cookieEnabled=!!_3d;
if(!this._cookieEnabled){
this.removeCookie();
}
}
},getCookieEnabled:function(_3f){
if(dojo.isString(_3f)){
var chs=this._cookieHandlers;
for(var i=chs.length-1;i>=0;--i){
if(chs[i].name==_3f){
return chs[i].enabled;
}
}
return false;
}
return this._cookieEnabled;
}});
dojox.grid.EnhancedGrid.registerPlugin(dojox.grid.enhanced.plugins.Cookie,{"preInit":true});
})();
}
