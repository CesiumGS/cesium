//>>built
define("dijit/ToolbarSeparator",["dojo/_base/declare","dojo/dom","./_Widget","./_TemplatedMixin"],function(_1,_2,_3,_4){
return _1("dijit.ToolbarSeparator",[_3,_4],{templateString:"<div class=\"dijitToolbarSeparator dijitInline\" role=\"presentation\"></div>",buildRendering:function(){
this.inherited(arguments);
_2.setSelectable(this.domNode,false);
},isFocusable:function(){
return false;
}});
});
