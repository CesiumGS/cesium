/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.app.List"]){
dojo._hasResource["dojox.mobile.app.List"]=true;
dojo.provide("dojox.mobile.app.List");
dojo.experimental("dojox.mobile.app.List");
dojo.require("dojo.string");
dojo.require("dijit._WidgetBase");
(function(){
var _1={};
dojo.declare("dojox.mobile.app.List",dijit._WidgetBase,{items:null,itemTemplate:"",emptyTemplate:"",dividerTemplate:"",dividerFunction:null,labelDelete:"Delete",labelCancel:"Cancel",controller:null,autoDelete:true,enableDelete:true,enableHold:true,formatters:null,_templateLoadCount:0,_mouseDownPos:null,baseClass:"list",constructor:function(){
this._checkLoadComplete=dojo.hitch(this,this._checkLoadComplete);
this._replaceToken=dojo.hitch(this,this._replaceToken);
this._postDeleteAnim=dojo.hitch(this,this._postDeleteAnim);
},postCreate:function(){
var _2=this;
if(this.emptyTemplate){
this._templateLoadCount++;
}
if(this.itemTemplate){
this._templateLoadCount++;
}
if(this.dividerTemplate){
this._templateLoadCount++;
}
this.connect(this.domNode,"onmousedown",function(_3){
var _4=_3;
if(_3.targetTouches&&_3.targetTouches.length>0){
_4=_3.targetTouches[0];
}
var _5=_2._getRowNode(_3.target);
if(_5){
_2._setDataInfo(_5,_3);
_2._selectRow(_5);
_2._mouseDownPos={x:_4.pageX,y:_4.pageY};
_2._dragThreshold=null;
}
});
this.connect(this.domNode,"onmouseup",function(_6){
if(_6.targetTouches&&_6.targetTouches.length>0){
_6=_6.targetTouches[0];
}
var _7=_2._getRowNode(_6.target);
if(_7){
_2._setDataInfo(_7,_6);
if(_2._selectedRow){
_2.onSelect(_7._data,_7._idx,_7);
}
this._deselectRow();
}
});
if(this.enableDelete){
this.connect(this.domNode,"mousemove",function(_8){
dojo.stopEvent(_8);
if(!_2._selectedRow){
return;
}
var _9=_2._getRowNode(_8.target);
if(_2.enableDelete&&_9&&!_2._deleting){
_2.handleDrag(_8);
}
});
}
this.connect(this.domNode,"onclick",function(_a){
if(_a.touches&&_a.touches.length>0){
_a=_a.touches[0];
}
var _b=_2._getRowNode(_a.target,true);
if(_b){
_2._setDataInfo(_b,_a);
}
});
this.connect(this.domNode,"mouseout",function(_c){
if(_c.touches&&_c.touches.length>0){
_c=_c.touches[0];
}
if(_c.target==_2._selectedRow){
_2._deselectRow();
}
});
if(!this.itemTemplate){
throw Error("An item template must be provided to "+this.declaredClass);
}
this._loadTemplate(this.itemTemplate,"itemTemplate",this._checkLoadComplete);
if(this.emptyTemplate){
this._loadTemplate(this.emptyTemplate,"emptyTemplate",this._checkLoadComplete);
}
if(this.dividerTemplate){
this._loadTemplate(this.dividerTemplate,"dividerTemplate",this._checkLoadComplete);
}
},handleDrag:function(_d){
var _e=_d;
if(_d.targetTouches&&_d.targetTouches.length>0){
_e=_d.targetTouches[0];
}
var _f=_e.pageX-this._mouseDownPos.x;
var _10=Math.abs(_f);
if(_10>10&&!this._dragThreshold){
this._dragThreshold=dojo.marginBox(this._selectedRow).w*0.6;
if(!this.autoDelete){
this.createDeleteButtons(this._selectedRow);
}
}
this._selectedRow.style.left=(_10>10?_f:0)+"px";
if(this._dragThreshold&&this._dragThreshold<_10){
this.preDelete(_f);
}
},handleDragCancel:function(){
if(this._deleting){
return;
}
dojo.removeClass(this._selectedRow,"hold");
this._selectedRow.style.left=0;
this._mouseDownPos=null;
this._dragThreshold=null;
this._deleteBtns&&dojo.style(this._deleteBtns,"display","none");
},preDelete:function(_11){
var _12=this;
this._deleting=true;
dojo.animateProperty({node:this._selectedRow,duration:400,properties:{left:{end:_11+((_11>0?1:-1)*this._dragThreshold*0.8)}},onEnd:dojo.hitch(this,function(){
if(this.autoDelete){
this.deleteRow(this._selectedRow);
}
})}).play();
},deleteRow:function(row){
dojo.style(row,{visibility:"hidden",minHeight:"0px"});
dojo.removeClass(row,"hold");
this._deleteAnimConn=this.connect(row,"webkitAnimationEnd",this._postDeleteAnim);
dojo.addClass(row,"collapsed");
},_postDeleteAnim:function(_13){
if(this._deleteAnimConn){
this.disconnect(this._deleteAnimConn);
this._deleteAnimConn=null;
}
var row=this._selectedRow;
var _14=row.nextSibling;
var _15=row.previousSibling;
if(_15&&_15._isDivider){
if(!_14||_14._isDivider){
_15.parentNode.removeChild(_15);
}
}
row.parentNode.removeChild(row);
this.onDelete(row._data,row._idx,this.items);
while(_14){
if(_14._idx){
_14._idx--;
}
_14=_14.nextSibling;
}
dojo.destroy(row);
dojo.query("> *:not(.buttons)",this.domNode).forEach(this.applyClass);
this._deleting=false;
this._deselectRow();
},createDeleteButtons:function(_16){
var mb=dojo.marginBox(_16);
var pos=dojo._abs(_16,true);
if(!this._deleteBtns){
this._deleteBtns=dojo.create("div",{"class":"buttons"},this.domNode);
this.buttons=[];
this.buttons.push(new dojox.mobile.Button({btnClass:"mblRedButton",label:this.labelDelete}));
this.buttons.push(new dojox.mobile.Button({btnClass:"mblBlueButton",label:this.labelCancel}));
dojo.place(this.buttons[0].domNode,this._deleteBtns);
dojo.place(this.buttons[1].domNode,this._deleteBtns);
dojo.addClass(this.buttons[0].domNode,"deleteBtn");
dojo.addClass(this.buttons[1].domNode,"cancelBtn");
this._handleButtonClick=dojo.hitch(this._handleButtonClick);
this.connect(this._deleteBtns,"onclick",this._handleButtonClick);
}
dojo.removeClass(this._deleteBtns,"fade out fast");
dojo.style(this._deleteBtns,{display:"",width:mb.w+"px",height:mb.h+"px",top:(_16.offsetTop)+"px",left:"0px"});
},onDelete:function(_17,_18,_19){
_19.splice(_18,1);
if(_19.length<1){
this.render();
}
},cancelDelete:function(){
this._deleting=false;
this.handleDragCancel();
},_handleButtonClick:function(_1a){
if(_1a.touches&&_1a.touches.length>0){
_1a=_1a.touches[0];
}
var _1b=_1a.target;
if(dojo.hasClass(_1b,"deleteBtn")){
this.deleteRow(this._selectedRow);
}else{
if(dojo.hasClass(_1b,"cancelBtn")){
this.cancelDelete();
}else{
return;
}
}
dojo.addClass(this._deleteBtns,"fade out");
},applyClass:function(_1c,idx,_1d){
dojo.removeClass(_1c,"first last");
if(idx==0){
dojo.addClass(_1c,"first");
}
if(idx==_1d.length-1){
dojo.addClass(_1c,"last");
}
},_setDataInfo:function(_1e,_1f){
_1f.item=_1e._data;
_1f.index=_1e._idx;
},onSelect:function(_20,_21,_22){
},_selectRow:function(row){
if(this._deleting&&this._selectedRow&&row!=this._selectedRow){
this.cancelDelete();
}
if(!dojo.hasClass(row,"row")){
return;
}
if(this.enableHold||this.enableDelete){
dojo.addClass(row,"hold");
}
this._selectedRow=row;
},_deselectRow:function(){
if(!this._selectedRow||this._deleting){
return;
}
this.handleDragCancel();
dojo.removeClass(this._selectedRow,"hold");
this._selectedRow=null;
},_getRowNode:function(_23,_24){
while(_23&&!_23._data&&_23!=this.domNode){
if(!_24&&dojo.hasClass(_23,"noclick")){
return null;
}
_23=_23.parentNode;
}
return _23==this.domNode?null:_23;
},applyTemplate:function(_25,_26){
return dojo._toDom(dojo.string.substitute(_25,_26,this._replaceToken,this.formatters||this));
},render:function(){
dojo.query("> *:not(.buttons)",this.domNode).forEach(dojo.destroy);
if(this.items.length<1&&this.emptyTemplate){
dojo.place(dojo._toDom(this.emptyTemplate),this.domNode,"first");
}else{
this.domNode.appendChild(this._renderRange(0,this.items.length));
}
if(dojo.hasClass(this.domNode.parentNode,"mblRoundRect")){
dojo.addClass(this.domNode.parentNode,"mblRoundRectList");
}
var _27=dojo.query("> .row",this.domNode);
if(_27.length>0){
dojo.addClass(_27[0],"first");
dojo.addClass(_27[_27.length-1],"last");
}
},_renderRange:function(_28,_29){
var _2a=[];
var row,i;
var _2b=document.createDocumentFragment();
_28=Math.max(0,_28);
_29=Math.min(_29,this.items.length);
for(i=_28;i<_29;i++){
row=this.applyTemplate(this.itemTemplate,this.items[i]);
dojo.addClass(row,"row");
row._data=this.items[i];
row._idx=i;
_2a.push(row);
}
if(!this.dividerFunction||!this.dividerTemplate){
for(i=_28;i<_29;i++){
_2a[i]._data=this.items[i];
_2a[i]._idx=i;
_2b.appendChild(_2a[i]);
}
}else{
var _2c=null;
var _2d;
var _2e;
for(i=_28;i<_29;i++){
_2a[i]._data=this.items[i];
_2a[i]._idx=i;
_2d=this.dividerFunction(this.items[i]);
if(_2d&&_2d!=_2c){
_2e=this.applyTemplate(this.dividerTemplate,{label:_2d,item:this.items[i]});
_2e._isDivider=true;
_2b.appendChild(_2e);
_2c=_2d;
}
_2b.appendChild(_2a[i]);
}
}
return _2b;
},_replaceToken:function(_2f,key){
if(key.charAt(0)=="!"){
_2f=dojo.getObject(key.substr(1),false,_this);
}
if(typeof _2f=="undefined"){
return "";
}
if(_2f==null){
return "";
}
return key.charAt(0)=="!"?_2f:_2f.toString().replace(/"/g,"&quot;");
},_checkLoadComplete:function(){
this._templateLoadCount--;
if(this._templateLoadCount<1&&this.get("items")){
this.render();
}
},_loadTemplate:function(url,_30,_31){
if(!url){
_31();
return;
}
if(_1[url]){
this.set(_30,_1[url]);
_31();
}else{
var _32=this;
dojo.xhrGet({url:url,sync:false,handleAs:"text",load:function(_33){
_1[url]=dojo.trim(_33);
_32.set(_30,_1[url]);
_31();
}});
}
},_setFormattersAttr:function(_34){
this.formatters=_34;
},_setItemsAttr:function(_35){
this.items=_35||[];
if(this._templateLoadCount<1&&_35){
this.render();
}
},destroy:function(){
if(this.buttons){
dojo.forEach(this.buttons,function(_36){
_36.destroy();
});
this.buttons=null;
}
this.inherited(arguments);
}});
})();
}
