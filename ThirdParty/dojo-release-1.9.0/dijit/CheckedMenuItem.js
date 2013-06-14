//>>built
define("dijit/CheckedMenuItem",["dojo/_base/declare","dojo/dom-class","./MenuItem","dojo/text!./templates/CheckedMenuItem.html","./hccss"],function(_1,_2,_3,_4){
return _1("dijit.CheckedMenuItem",_3,{baseClass:"dijitCheckedMenuItem",templateString:_4,checked:false,_setCheckedAttr:function(_5){
_2.toggle(this.domNode,this.baseClass+"Checked",_5);
this.domNode.setAttribute("aria-checked",_5?"true":"false");
this._set("checked",_5);
},iconClass:"",role:"menuitemcheckbox",checkedChar:"&#10003;",onChange:function(){
},_onClick:function(_6){
if(!this.disabled){
this.set("checked",!this.checked);
this.onChange(this.checked);
}
this.onClick(_6);
}});
});
require({cache:{"url:dijit/templates/CheckedMenuItem.html":"<tr class=\"dijitReset dijitMenuItem\" data-dojo-attach-point=\"focusNode\" role=\"${role}\" tabIndex=\"-1\" aria-checked=\"${checked}\">\n\t<td class=\"dijitReset dijitMenuItemIconCell\" role=\"presentation\">\n\t\t<span class=\"dijitInline dijitIcon dijitMenuItemIcon dijitCheckedMenuItemIcon\" data-dojo-attach-point=\"iconNode\"></span>\n\t\t<span class=\"dijitMenuItemIconChar dijitCheckedMenuItemIconChar\">${checkedChar}</span>\n\t</td>\n\t<td class=\"dijitReset dijitMenuItemLabel\" colspan=\"2\" data-dojo-attach-point=\"containerNode,labelNode,textDirNode\"></td>\n\t<td class=\"dijitReset dijitMenuItemAccelKey\" style=\"display: none\" data-dojo-attach-point=\"accelKeyNode\"></td>\n\t<td class=\"dijitReset dijitMenuArrowCell\" role=\"presentation\">&#160;</td>\n</tr>\n"}});
