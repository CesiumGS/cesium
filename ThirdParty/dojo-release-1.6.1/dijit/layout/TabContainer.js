/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.layout.TabContainer"]){
dojo._hasResource["dijit.layout.TabContainer"]=true;
dojo.provide("dijit.layout.TabContainer");
dojo.require("dijit.layout._TabContainerBase");
dojo.require("dijit.layout.TabController");
dojo.require("dijit.layout.ScrollingTabController");
dojo.declare("dijit.layout.TabContainer",dijit.layout._TabContainerBase,{useMenu:true,useSlider:true,controllerWidget:"",_makeController:function(_1){
var _2=this.baseClass+"-tabs"+(this.doLayout?"":" dijitTabNoLayout"),_3=dojo.getObject(this.controllerWidget);
return new _3({id:this.id+"_tablist",dir:this.dir,lang:this.lang,tabPosition:this.tabPosition,doLayout:this.doLayout,containerId:this.id,"class":_2,nested:this.nested,useMenu:this.useMenu,useSlider:this.useSlider,tabStripClass:this.tabStrip?this.baseClass+(this.tabStrip?"":"No")+"Strip":null},_1);
},postMixInProperties:function(){
this.inherited(arguments);
if(!this.controllerWidget){
this.controllerWidget=(this.tabPosition=="top"||this.tabPosition=="bottom")&&!this.nested?"dijit.layout.ScrollingTabController":"dijit.layout.TabController";
}
}});
}
