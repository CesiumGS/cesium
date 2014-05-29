//>>built
require({cache:{"url:dijit/layout/templates/TabContainer.html":"<div class=\"dijitTabContainer\">\n\t<div class=\"dijitTabListWrapper\" data-dojo-attach-point=\"tablistNode\"></div>\n\t<div data-dojo-attach-point=\"tablistSpacer\" class=\"dijitTabSpacer ${baseClass}-spacer\"></div>\n\t<div class=\"dijitTabPaneWrapper ${baseClass}-container\" data-dojo-attach-point=\"containerNode\"></div>\n</div>\n"}});
define("dijit/layout/_TabContainerBase",["dojo/text!./templates/TabContainer.html","./StackContainer","./utils","../_TemplatedMixin","dojo/_base/declare","dojo/dom-class","dojo/dom-geometry","dojo/dom-style"],function(_1,_2,_3,_4,_5,_6,_7,_8){
return _5("dijit.layout._TabContainerBase",[_2,_4],{tabPosition:"top",baseClass:"dijitTabContainer",tabStrip:false,nested:false,templateString:_1,postMixInProperties:function(){
this.baseClass+=this.tabPosition.charAt(0).toUpperCase()+this.tabPosition.substr(1).replace(/-.*/,"");
this.srcNodeRef&&_8.set(this.srcNodeRef,"visibility","hidden");
this.inherited(arguments);
},buildRendering:function(){
this.inherited(arguments);
this.tablist=this._makeController(this.tablistNode);
if(!this.doLayout){
_6.add(this.domNode,"dijitTabContainerNoLayout");
}
if(this.nested){
_6.add(this.domNode,"dijitTabContainerNested");
_6.add(this.tablist.containerNode,"dijitTabContainerTabListNested");
_6.add(this.tablistSpacer,"dijitTabContainerSpacerNested");
_6.add(this.containerNode,"dijitTabPaneWrapperNested");
}else{
_6.add(this.domNode,"tabStrip-"+(this.tabStrip?"enabled":"disabled"));
}
},_setupChild:function(_9){
_6.add(_9.domNode,"dijitTabPane");
this.inherited(arguments);
},startup:function(){
if(this._started){
return;
}
this.tablist.startup();
this.inherited(arguments);
},layout:function(){
if(!this._contentBox||typeof (this._contentBox.l)=="undefined"){
return;
}
var sc=this.selectedChildWidget;
if(this.doLayout){
var _a=this.tabPosition.replace(/-h/,"");
this.tablist.region=_a;
var _b=[this.tablist,{domNode:this.tablistSpacer,region:_a},{domNode:this.containerNode,region:"center"}];
_3.layoutChildren(this.domNode,this._contentBox,_b);
this._containerContentBox=_3.marginBox2contentBox(this.containerNode,_b[2]);
if(sc&&sc.resize){
sc.resize(this._containerContentBox);
}
}else{
if(this.tablist.resize){
var s=this.tablist.domNode.style;
s.width="0";
var _c=_7.getContentBox(this.domNode).w;
s.width="";
this.tablist.resize({w:_c});
}
if(sc&&sc.resize){
sc.resize();
}
}
},destroy:function(_d){
if(this.tablist){
this.tablist.destroy(_d);
}
this.inherited(arguments);
}});
});
