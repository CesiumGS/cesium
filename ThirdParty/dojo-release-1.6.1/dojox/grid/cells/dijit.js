/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.cells.dijit"]){
dojo._hasResource["dojox.grid.cells.dijit"]=true;
dojo.provide("dojox.grid.cells.dijit");
dojo.require("dojox.grid.cells");
dojo.require("dijit.form.DateTextBox");
dojo.require("dijit.form.TimeTextBox");
dojo.require("dijit.form.ComboBox");
dojo.require("dojo.data.ItemFileReadStore");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.NumberSpinner");
dojo.require("dijit.form.NumberTextBox");
dojo.require("dijit.form.CurrencyTextBox");
dojo.require("dijit.form.HorizontalSlider");
dojo.require("dijit.Editor");
(function(){
var _1=dojox.grid.cells;
dojo.declare("dojox.grid.cells._Widget",_1._Base,{widgetClass:dijit.form.TextBox,constructor:function(_2){
this.widget=null;
if(typeof this.widgetClass=="string"){
dojo.deprecated("Passing a string to widgetClass is deprecated","pass the widget class object instead","2.0");
this.widgetClass=dojo.getObject(this.widgetClass);
}
},formatEditing:function(_3,_4){
this.needFormatNode(_3,_4);
return "<div></div>";
},getValue:function(_5){
return this.widget.get("value");
},setValue:function(_6,_7){
if(this.widget&&this.widget.set){
if(this.widget.onLoadDeferred){
var _8=this;
this.widget.onLoadDeferred.addCallback(function(){
_8.widget.set("value",_7===null?"":_7);
});
}else{
this.widget.set("value",_7);
}
}else{
this.inherited(arguments);
}
},getWidgetProps:function(_9){
return dojo.mixin({dir:this.dir,lang:this.lang},this.widgetProps||{},{constraints:dojo.mixin({},this.constraint)||{},value:_9});
},createWidget:function(_a,_b,_c){
return new this.widgetClass(this.getWidgetProps(_b),_a);
},attachWidget:function(_d,_e,_f){
_d.appendChild(this.widget.domNode);
this.setValue(_f,_e);
},formatNode:function(_10,_11,_12){
if(!this.widgetClass){
return _11;
}
if(!this.widget){
this.widget=this.createWidget.apply(this,arguments);
}else{
this.attachWidget.apply(this,arguments);
}
this.sizeWidget.apply(this,arguments);
this.grid.views.renormalizeRow(_12);
this.grid.scroller.rowHeightChanged(_12,true);
this.focus();
return undefined;
},sizeWidget:function(_13,_14,_15){
var p=this.getNode(_15),box=dojo.contentBox(p);
dojo.marginBox(this.widget.domNode,{w:box.w});
},focus:function(_16,_17){
if(this.widget){
setTimeout(dojo.hitch(this.widget,function(){
dojox.grid.util.fire(this,"focus");
}),0);
}
},_finish:function(_18){
this.inherited(arguments);
dojox.grid.util.removeNode(this.widget.domNode);
if(dojo.isIE){
dojo.setSelectable(this.widget.domNode,true);
}
}});
_1._Widget.markupFactory=function(_19,_1a){
_1._Base.markupFactory(_19,_1a);
var d=dojo;
var _1b=d.trim(d.attr(_19,"widgetProps")||"");
var _1c=d.trim(d.attr(_19,"constraint")||"");
var _1d=d.trim(d.attr(_19,"widgetClass")||"");
if(_1b){
_1a.widgetProps=d.fromJson(_1b);
}
if(_1c){
_1a.constraint=d.fromJson(_1c);
}
if(_1d){
_1a.widgetClass=d.getObject(_1d);
}
};
dojo.declare("dojox.grid.cells.ComboBox",_1._Widget,{widgetClass:dijit.form.ComboBox,getWidgetProps:function(_1e){
var _1f=[];
dojo.forEach(this.options,function(o){
_1f.push({name:o,value:o});
});
var _20=new dojo.data.ItemFileReadStore({data:{identifier:"name",items:_1f}});
return dojo.mixin({},this.widgetProps||{},{value:_1e,store:_20});
},getValue:function(){
var e=this.widget;
e.set("displayedValue",e.get("displayedValue"));
return e.get("value");
}});
_1.ComboBox.markupFactory=function(_21,_22){
_1._Widget.markupFactory(_21,_22);
var d=dojo;
var _23=d.trim(d.attr(_21,"options")||"");
if(_23){
var o=_23.split(",");
if(o[0]!=_23){
_22.options=o;
}
}
};
dojo.declare("dojox.grid.cells.DateTextBox",_1._Widget,{widgetClass:dijit.form.DateTextBox,setValue:function(_24,_25){
if(this.widget){
this.widget.set("value",new Date(_25));
}else{
this.inherited(arguments);
}
},getWidgetProps:function(_26){
return dojo.mixin(this.inherited(arguments),{value:new Date(_26)});
}});
_1.DateTextBox.markupFactory=function(_27,_28){
_1._Widget.markupFactory(_27,_28);
};
dojo.declare("dojox.grid.cells.CheckBox",_1._Widget,{widgetClass:dijit.form.CheckBox,getValue:function(){
return this.widget.checked;
},setValue:function(_29,_2a){
if(this.widget&&this.widget.attributeMap.checked){
this.widget.set("checked",_2a);
}else{
this.inherited(arguments);
}
},sizeWidget:function(_2b,_2c,_2d){
return;
}});
_1.CheckBox.markupFactory=function(_2e,_2f){
_1._Widget.markupFactory(_2e,_2f);
};
dojo.declare("dojox.grid.cells.Editor",_1._Widget,{widgetClass:dijit.Editor,getWidgetProps:function(_30){
return dojo.mixin({},this.widgetProps||{},{height:this.widgetHeight||"100px"});
},createWidget:function(_31,_32,_33){
var _34=new this.widgetClass(this.getWidgetProps(_32),_31);
dojo.connect(_34,"onLoad",dojo.hitch(this,"populateEditor"));
return _34;
},formatNode:function(_35,_36,_37){
this.content=_36;
this.inherited(arguments);
if(dojo.isMoz){
var e=this.widget;
e.open();
if(this.widgetToolbar){
dojo.place(e.toolbar.domNode,e.editingArea,"before");
}
}
},populateEditor:function(){
this.widget.set("value",this.content);
this.widget.placeCursorAtEnd();
}});
_1.Editor.markupFactory=function(_38,_39){
_1._Widget.markupFactory(_38,_39);
var d=dojo;
var h=dojo.trim(dojo.attr(_38,"widgetHeight")||"");
if(h){
if((h!="auto")&&(h.substr(-2)!="em")){
h=parseInt(h,10)+"px";
}
_39.widgetHeight=h;
}
};
})();
}
