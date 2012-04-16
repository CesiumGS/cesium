/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.cells._base"]){
dojo._hasResource["dojox.grid.cells._base"]=true;
dojo.provide("dojox.grid.cells._base");
dojo.require("dojox.grid.util");
dojo.require("dijit._Widget");
dojo.declare("dojox.grid._DeferredTextWidget",dijit._Widget,{deferred:null,_destroyOnRemove:true,postCreate:function(){
if(this.deferred){
this.deferred.addBoth(dojo.hitch(this,function(_1){
if(this.domNode){
this.domNode.innerHTML=_1;
}
}));
}
}});
(function(){
var _2=function(_3){
try{
dojox.grid.util.fire(_3,"focus");
dojox.grid.util.fire(_3,"select");
}
catch(e){
}
};
var _4=function(){
setTimeout(dojo.hitch.apply(dojo,arguments),0);
};
var _5=dojox.grid.cells;
dojo.declare("dojox.grid.cells._Base",null,{styles:"",classes:"",editable:false,alwaysEditing:false,formatter:null,defaultValue:"...",value:null,hidden:false,noresize:false,draggable:true,_valueProp:"value",_formatPending:false,constructor:function(_6){
this._props=_6||{};
dojo.mixin(this,_6);
if(this.draggable===undefined){
this.draggable=true;
}
},_defaultFormat:function(_7,_8){
var s=this.grid.formatterScope||this;
var f=this.formatter;
if(f&&s&&typeof f=="string"){
f=this.formatter=s[f];
}
var v=(_7!=this.defaultValue&&f)?f.apply(s,_8):_7;
if(typeof v=="undefined"){
return this.defaultValue;
}
if(v&&v.addBoth){
v=new dojox.grid._DeferredTextWidget({deferred:v},dojo.create("span",{innerHTML:this.defaultValue}));
}
if(v&&v.declaredClass&&v.startup){
return "<div class='dojoxGridStubNode' linkWidget='"+v.id+"' cellIdx='"+this.index+"'>"+this.defaultValue+"</div>";
}
return v;
},format:function(_9,_a){
var f,i=this.grid.edit.info,d=this.get?this.get(_9,_a):(this.value||this.defaultValue);
d=(d&&d.replace&&this.grid.escapeHTMLInData)?d.replace(/&/g,"&amp;").replace(/</g,"&lt;"):d;
if(this.editable&&(this.alwaysEditing||(i.rowIndex==_9&&i.cell==this))){
return this.formatEditing(d,_9);
}else{
return this._defaultFormat(d,[d,_9,this]);
}
},formatEditing:function(_b,_c){
},getNode:function(_d){
return this.view.getCellNode(_d,this.index);
},getHeaderNode:function(){
return this.view.getHeaderCellNode(this.index);
},getEditNode:function(_e){
return (this.getNode(_e)||0).firstChild||0;
},canResize:function(){
var uw=this.unitWidth;
return uw&&(uw!=="auto");
},isFlex:function(){
var uw=this.unitWidth;
return uw&&dojo.isString(uw)&&(uw=="auto"||uw.slice(-1)=="%");
},applyEdit:function(_f,_10){
this.grid.edit.applyCellEdit(_f,this,_10);
},cancelEdit:function(_11){
this.grid.doCancelEdit(_11);
},_onEditBlur:function(_12){
if(this.grid.edit.isEditCell(_12,this.index)){
this.grid.edit.apply();
}
},registerOnBlur:function(_13,_14){
if(this.commitOnBlur){
dojo.connect(_13,"onblur",function(e){
setTimeout(dojo.hitch(this,"_onEditBlur",_14),250);
});
}
},needFormatNode:function(_15,_16){
this._formatPending=true;
_4(this,"_formatNode",_15,_16);
},cancelFormatNode:function(){
this._formatPending=false;
},_formatNode:function(_17,_18){
if(this._formatPending){
this._formatPending=false;
dojo.setSelectable(this.grid.domNode,true);
this.formatNode(this.getEditNode(_18),_17,_18);
}
},formatNode:function(_19,_1a,_1b){
if(dojo.isIE){
_4(this,"focus",_1b,_19);
}else{
this.focus(_1b,_19);
}
},dispatchEvent:function(m,e){
if(m in this){
return this[m](e);
}
},getValue:function(_1c){
return this.getEditNode(_1c)[this._valueProp];
},setValue:function(_1d,_1e){
var n=this.getEditNode(_1d);
if(n){
n[this._valueProp]=_1e;
}
},focus:function(_1f,_20){
_2(_20||this.getEditNode(_1f));
},save:function(_21){
this.value=this.value||this.getValue(_21);
},restore:function(_22){
this.setValue(_22,this.value);
},_finish:function(_23){
dojo.setSelectable(this.grid.domNode,false);
this.cancelFormatNode();
},apply:function(_24){
this.applyEdit(this.getValue(_24),_24);
this._finish(_24);
},cancel:function(_25){
this.cancelEdit(_25);
this._finish(_25);
}});
_5._Base.markupFactory=function(_26,_27){
var d=dojo;
var _28=d.trim(d.attr(_26,"formatter")||"");
if(_28){
_27.formatter=dojo.getObject(_28)||_28;
}
var get=d.trim(d.attr(_26,"get")||"");
if(get){
_27.get=dojo.getObject(get);
}
var _29=function(_2a,_2b,_2c){
var _2d=d.trim(d.attr(_26,_2a)||"");
if(_2d){
_2b[_2c||_2a]=!(_2d.toLowerCase()=="false");
}
};
_29("sortDesc",_27);
_29("editable",_27);
_29("alwaysEditing",_27);
_29("noresize",_27);
_29("draggable",_27);
var _2e=d.trim(d.attr(_26,"loadingText")||d.attr(_26,"defaultValue")||"");
if(_2e){
_27.defaultValue=_2e;
}
var _2f=function(_30,_31,_32){
var _33=d.trim(d.attr(_26,_30)||"")||undefined;
if(_33){
_31[_32||_30]=_33;
}
};
_2f("styles",_27);
_2f("headerStyles",_27);
_2f("cellStyles",_27);
_2f("classes",_27);
_2f("headerClasses",_27);
_2f("cellClasses",_27);
};
dojo.declare("dojox.grid.cells.Cell",_5._Base,{constructor:function(){
this.keyFilter=this.keyFilter;
},keyFilter:null,formatEditing:function(_34,_35){
this.needFormatNode(_34,_35);
return "<input class=\"dojoxGridInput\" type=\"text\" value=\""+_34+"\">";
},formatNode:function(_36,_37,_38){
this.inherited(arguments);
this.registerOnBlur(_36,_38);
},doKey:function(e){
if(this.keyFilter){
var key=String.fromCharCode(e.charCode);
if(key.search(this.keyFilter)==-1){
dojo.stopEvent(e);
}
}
},_finish:function(_39){
this.inherited(arguments);
var n=this.getEditNode(_39);
try{
dojox.grid.util.fire(n,"blur");
}
catch(e){
}
}});
_5.Cell.markupFactory=function(_3a,_3b){
_5._Base.markupFactory(_3a,_3b);
var d=dojo;
var _3c=d.trim(d.attr(_3a,"keyFilter")||"");
if(_3c){
_3b.keyFilter=new RegExp(_3c);
}
};
dojo.declare("dojox.grid.cells.RowIndex",_5.Cell,{name:"Row",postscript:function(){
this.editable=false;
},get:function(_3d){
return _3d+1;
}});
_5.RowIndex.markupFactory=function(_3e,_3f){
_5.Cell.markupFactory(_3e,_3f);
};
dojo.declare("dojox.grid.cells.Select",_5.Cell,{options:null,values:null,returnIndex:-1,constructor:function(_40){
this.values=this.values||this.options;
},formatEditing:function(_41,_42){
this.needFormatNode(_41,_42);
var h=["<select class=\"dojoxGridSelect\">"];
for(var i=0,o,v;((o=this.options[i])!==undefined)&&((v=this.values[i])!==undefined);i++){
h.push("<option",(_41==v?" selected":"")," value=\""+v+"\"",">",o,"</option>");
}
h.push("</select>");
return h.join("");
},getValue:function(_43){
var n=this.getEditNode(_43);
if(n){
var i=n.selectedIndex,o=n.options[i];
return this.returnIndex>-1?i:o.value||o.innerHTML;
}
}});
_5.Select.markupFactory=function(_44,_45){
_5.Cell.markupFactory(_44,_45);
var d=dojo;
var _46=d.trim(d.attr(_44,"options")||"");
if(_46){
var o=_46.split(",");
if(o[0]!=_46){
_45.options=o;
}
}
var _47=d.trim(d.attr(_44,"values")||"");
if(_47){
var v=_47.split(",");
if(v[0]!=_47){
_45.values=v;
}
}
};
dojo.declare("dojox.grid.cells.AlwaysEdit",_5.Cell,{alwaysEditing:true,_formatNode:function(_48,_49){
this.formatNode(this.getEditNode(_49),_48,_49);
},applyStaticValue:function(_4a){
var e=this.grid.edit;
e.applyCellEdit(this.getValue(_4a),this,_4a);
e.start(this,_4a,true);
}});
_5.AlwaysEdit.markupFactory=function(_4b,_4c){
_5.Cell.markupFactory(_4b,_4c);
};
dojo.declare("dojox.grid.cells.Bool",_5.AlwaysEdit,{_valueProp:"checked",formatEditing:function(_4d,_4e){
return "<input class=\"dojoxGridInput\" type=\"checkbox\""+(_4d?" checked=\"checked\"":"")+" style=\"width: auto\" />";
},doclick:function(e){
if(e.target.tagName=="INPUT"){
this.applyStaticValue(e.rowIndex);
}
}});
_5.Bool.markupFactory=function(_4f,_50){
_5.AlwaysEdit.markupFactory(_4f,_50);
};
})();
}
