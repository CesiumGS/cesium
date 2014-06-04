//>>built
define("dijit/layout/LinkPane",["./ContentPane","../_TemplatedMixin","dojo/_base/declare"],function(_1,_2,_3){
return _3("dijit.layout.LinkPane",[_1,_2],{templateString:"<div class=\"dijitLinkPane\" data-dojo-attach-point=\"containerNode\"></div>",postMixInProperties:function(){
if(this.srcNodeRef){
this.title+=this.srcNodeRef.innerHTML;
}
this.inherited(arguments);
},_fillContent:function(){
}});
});
