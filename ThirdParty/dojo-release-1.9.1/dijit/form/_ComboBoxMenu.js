//>>built
define("dijit/form/_ComboBoxMenu",["dojo/_base/declare","dojo/dom-class","dojo/dom-style","dojo/keys","../_WidgetBase","../_TemplatedMixin","./_ComboBoxMenuMixin","./_ListMouseMixin"],function(_1,_2,_3,_4,_5,_6,_7,_8){
return _1("dijit.form._ComboBoxMenu",[_5,_6,_8,_7],{templateString:"<div class='dijitReset dijitMenu' data-dojo-attach-point='containerNode' style='overflow: auto; overflow-x: hidden;' role='listbox'>"+"<div class='dijitMenuItem dijitMenuPreviousButton' data-dojo-attach-point='previousButton' role='option'></div>"+"<div class='dijitMenuItem dijitMenuNextButton' data-dojo-attach-point='nextButton' role='option'></div>"+"</div>",baseClass:"dijitComboBoxMenu",postCreate:function(){
this.inherited(arguments);
if(!this.isLeftToRight()){
_2.add(this.previousButton,"dijitMenuItemRtl");
_2.add(this.nextButton,"dijitMenuItemRtl");
}
this.containerNode.setAttribute("role","listbox");
},_createMenuItem:function(){
var _9=this.ownerDocument.createElement("div");
_9.className="dijitReset dijitMenuItem"+(this.isLeftToRight()?"":" dijitMenuItemRtl");
_9.setAttribute("role","option");
return _9;
},onHover:function(_a){
_2.add(_a,"dijitMenuItemHover");
},onUnhover:function(_b){
_2.remove(_b,"dijitMenuItemHover");
},onSelect:function(_c){
_2.add(_c,"dijitMenuItemSelected");
},onDeselect:function(_d){
_2.remove(_d,"dijitMenuItemSelected");
},_page:function(up){
var _e=0;
var _f=this.domNode.scrollTop;
var _10=_3.get(this.domNode,"height");
if(!this.getHighlightedOption()){
this.selectNextNode();
}
while(_e<_10){
var _11=this.getHighlightedOption();
if(up){
if(!_11.previousSibling||_11.previousSibling.style.display=="none"){
break;
}
this.selectPreviousNode();
}else{
if(!_11.nextSibling||_11.nextSibling.style.display=="none"){
break;
}
this.selectNextNode();
}
var _12=this.domNode.scrollTop;
_e+=(_12-_f)*(up?-1:1);
_f=_12;
}
},handleKey:function(evt){
switch(evt.keyCode){
case _4.DOWN_ARROW:
this.selectNextNode();
return false;
case _4.PAGE_DOWN:
this._page(false);
return false;
case _4.UP_ARROW:
this.selectPreviousNode();
return false;
case _4.PAGE_UP:
this._page(true);
return false;
default:
return true;
}
}});
});
