//>>built
define("dijit/PopupMenuItem",["dojo/_base/declare","dojo/dom-style","dojo/_base/lang","dojo/query","./popup","./registry","./MenuItem","./hccss"],function(_1,_2,_3,_4,pm,_5,_6){
return _1("dijit.PopupMenuItem",_6,{_fillContent:function(){
if(this.srcNodeRef){
var _7=_4("*",this.srcNodeRef);
this.inherited(arguments,[_7[0]]);
this.dropDownContainer=this.srcNodeRef;
}
},_openPopup:function(_8,_9){
var _a=this.popup;
pm.open(_3.delegate(_8,{popup:this.popup,around:this.domNode}));
if(_9&&_a.focus){
_a.focus();
}
},_closePopup:function(){
pm.close(this.popup);
this.popup.parentMenu=null;
},startup:function(){
if(this._started){
return;
}
this.inherited(arguments);
if(!this.popup){
var _b=_4("[widgetId]",this.dropDownContainer)[0];
this.popup=_5.byNode(_b);
}
this.ownerDocumentBody.appendChild(this.popup.domNode);
this.popup.startup();
this.popup.domNode.style.display="none";
if(this.arrowWrapper){
_2.set(this.arrowWrapper,"visibility","");
}
this.focusNode.setAttribute("aria-haspopup","true");
},destroyDescendants:function(_c){
if(this.popup){
if(!this.popup._destroyed){
this.popup.destroyRecursive(_c);
}
delete this.popup;
}
this.inherited(arguments);
}});
});
