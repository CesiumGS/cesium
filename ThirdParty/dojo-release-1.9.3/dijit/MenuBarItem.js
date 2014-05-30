//>>built
require({cache:{"url:dijit/templates/MenuBarItem.html":"<div class=\"dijitReset dijitInline dijitMenuItem dijitMenuItemLabel\" data-dojo-attach-point=\"focusNode\"\n\t \trole=\"menuitem\" tabIndex=\"-1\">\n\t<span data-dojo-attach-point=\"containerNode,textDirNode\"></span>\n</div>\n"}});
define("dijit/MenuBarItem",["dojo/_base/declare","./MenuItem","dojo/text!./templates/MenuBarItem.html"],function(_1,_2,_3){
var _4=_1("dijit._MenuBarItemMixin",null,{templateString:_3,_setIconClassAttr:null});
var _5=_1("dijit.MenuBarItem",[_2,_4],{});
_5._MenuBarItemMixin=_4;
return _5;
});
