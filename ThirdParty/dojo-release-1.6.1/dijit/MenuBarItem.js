/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.MenuBarItem"]){
dojo._hasResource["dijit.MenuBarItem"]=true;
dojo.provide("dijit.MenuBarItem");
dojo.require("dijit.MenuItem");
dojo.declare("dijit._MenuBarItemMixin",null,{templateString:dojo.cache("dijit","templates/MenuBarItem.html","<div class=\"dijitReset dijitInline dijitMenuItem dijitMenuItemLabel\" dojoAttachPoint=\"focusNode\" role=\"menuitem\" tabIndex=\"-1\"\n\t\tdojoAttachEvent=\"onmouseenter:_onHover,onmouseleave:_onUnhover,ondijitclick:_onClick\">\n\t<span dojoAttachPoint=\"containerNode\"></span>\n</div>\n"),attributeMap:dojo.delegate(dijit._Widget.prototype.attributeMap,{label:{node:"containerNode",type:"innerHTML"}})});
dojo.declare("dijit.MenuBarItem",[dijit.MenuItem,dijit._MenuBarItemMixin],{});
}
