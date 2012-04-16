/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.SortList"]){
dojo._hasResource["dojox.widget.SortList"]=true;
dojo.provide("dojox.widget.SortList");
dojo.experimental("dojox.widget.SortList");
dojo.require("dijit.layout._LayoutWidget");
dojo.require("dijit._Templated");
dojo.declare("dojox.widget.SortList",[dijit.layout._LayoutWidget,dijit._Templated],{title:"",heading:"",descending:true,selected:null,sortable:true,store:"",key:"name",baseClass:"dojoxSortList",templateString:dojo.cache("dojox.widget","SortList/SortList.html","<div class=\"sortList\" id=\"${id}\">\n\t\t<div class=\"sortListTitle\" dojoAttachPoint=\"titleNode\">\n\t\t<div class=\"dijitInline sortListIcon\">&thinsp;</div>\n\t\t<span dojoAttachPoint=\"focusNode\">${title}</span>\n\t\t</div>\n\t\t<div class=\"sortListBodyWrapper\" dojoAttachEvent=\"onmouseover: _set, onmouseout: _unset, onclick:_handleClick\" dojoAttachPoint=\"bodyWrapper\">\n\t\t<ul dojoAttachPoint=\"containerNode\" class=\"sortListBody\"></ul>\n\t</div>\n</div>\n"),_addItem:function(_1){
dojo.create("li",{innerHTML:this.store.getValue(_1,this.key).replace(/</g,"&lt;")},this.containerNode);
},postCreate:function(){
if(this.store){
this.store=dojo.getObject(this.store);
var _2={onItem:dojo.hitch(this,"_addItem"),onComplete:dojo.hitch(this,"onSort")};
this.store.fetch(_2);
}else{
this.onSort();
}
this.inherited(arguments);
},startup:function(){
this.inherited(arguments);
if(this.heading){
this.setTitle(this.heading);
this.title=this.heading;
}
setTimeout(dojo.hitch(this,"resize"),5);
if(this.sortable){
this.connect(this.titleNode,"onclick","onSort");
}
},resize:function(){
this.inherited(arguments);
var _3=((this._contentBox.h)-(dojo.style(this.titleNode,"height")))-10;
this.bodyWrapper.style.height=Math.abs(_3)+"px";
},onSort:function(e){
var _4=dojo.query("li",this.domNode);
if(this.sortable){
this.descending=!this.descending;
dojo.addClass(this.titleNode,((this.descending)?"sortListDesc":"sortListAsc"));
dojo.removeClass(this.titleNode,((this.descending)?"sortListAsc":"sortListDesc"));
_4.sort(this._sorter);
if(this.descending){
_4.reverse();
}
}
var i=0;
dojo.forEach(_4,function(_5){
dojo[(i++)%2===0?"addClass":"removeClass"](_5,"sortListItemOdd");
this.containerNode.appendChild(_5);
},this);
},_set:function(e){
if(e.target!==this.bodyWrapper){
dojo.addClass(e.target,"sortListItemHover");
}
},_unset:function(e){
dojo.removeClass(e.target,"sortListItemHover");
},_handleClick:function(e){
dojo.toggleClass(e.target,"sortListItemSelected");
e.target.focus();
this._updateValues(e.target.innerHTML);
},_updateValues:function(){
this._selected=dojo.query("li.sortListItemSelected",this.containerNode);
this.selected=[];
dojo.forEach(this._selected,function(_6){
this.selected.push(_6.innerHTML);
},this);
this.onChanged(arguments);
},_sorter:function(a,b){
var _7=a.innerHTML;
var _8=b.innerHTML;
if(_7>_8){
return 1;
}
if(_7<_8){
return -1;
}
return 0;
},setTitle:function(_9){
this.focusNode.innerHTML=this.title=_9;
},onChanged:function(){
}});
}
