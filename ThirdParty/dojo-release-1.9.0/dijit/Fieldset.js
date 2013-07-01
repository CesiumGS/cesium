//>>built
define("dijit/Fieldset",["dojo/_base/declare","dojo/query!css2","dijit/TitlePane","dojo/text!./templates/Fieldset.html"],function(_1,_2,_3,_4){
return _1("dijit.Fieldset",_3,{baseClass:"dijitFieldset",title:"",open:true,templateString:_4,postCreate:function(){
if(!this.legend){
var _5=_2("legend",this.containerNode);
if(_5.length){
this.set("title",_5[0].innerHTML);
_5[0].parentNode.removeChild(_5[0]);
}
}
this.inherited(arguments);
}});
});
require({cache:{"url:dijit/templates/Fieldset.html":"<fieldset>\n\t<legend data-dojo-attach-event=\"ondijitclick:_onTitleClick, onkeydown:_onTitleKey\"\n\t\t\tdojoAttachPoint=\"titleBarNode, titleNode, focusNode\">\n\t\t<span data-dojo-attach-point=\"arrowNode\" class=\"dijitInline dijitArrowNode\" role=\"presentation\"></span\n\t\t><span data-dojo-attach-point=\"arrowNodeInner\" class=\"dijitArrowNodeInner\"></span\n\t\t><span dojoAttachPoint=\"titleNode\" class=\"dijitFieldsetLegendNode\"></span>\n\t</legend>\n\t<div class=\"dijitFieldsetContentOuter\" data-dojo-attach-point=\"hideNode\" role=\"presentation\">\n\t\t<div class=\"dijitReset\" data-dojo-attach-point=\"wipeNode\" role=\"presentation\">\n\t\t\t<div class=\"dijitFieldsetContentInner\" data-dojo-attach-point=\"containerNode\" role=\"region\" id=\"${id}_pane\" aria-labelledby=\"${id}_titleBarNode\">\n\t\t\t\t<!-- nested divs because wipeIn()/wipeOut() doesn't work right on node w/padding etc.  Put padding on inner div. -->\n\t\t\t</div>\n\t\t</div>\n\t</div>\n</fieldset>\n"}});
