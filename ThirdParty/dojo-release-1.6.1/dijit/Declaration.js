/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.Declaration"]){
dojo._hasResource["dijit.Declaration"]=true;
dojo.provide("dijit.Declaration");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.declare("dijit.Declaration",dijit._Widget,{_noScript:true,stopParser:true,widgetClass:"",defaults:null,mixins:[],buildRendering:function(){
var _1=this.srcNodeRef.parentNode.removeChild(this.srcNodeRef),_2=dojo.query("> script[type^='dojo/method']",_1).orphan(),_3=dojo.query("> script[type^='dojo/connect']",_1).orphan(),_4=_1.nodeName;
var _5=this.defaults||{};
dojo.forEach(_2,function(s){
var _6=s.getAttribute("event")||s.getAttribute("data-dojo-event"),_7=dojo.parser._functionFromScript(s);
if(_6){
_5[_6]=_7;
}else{
_3.push(s);
}
});
this.mixins=this.mixins.length?dojo.map(this.mixins,function(_8){
return dojo.getObject(_8);
}):[dijit._Widget,dijit._Templated];
_5.widgetsInTemplate=true;
_5._skipNodeCache=true;
_5.templateString="<"+_4+" class='"+_1.className+"' dojoAttachPoint='"+(_1.getAttribute("dojoAttachPoint")||"")+"' dojoAttachEvent='"+(_1.getAttribute("dojoAttachEvent")||"")+"' >"+_1.innerHTML.replace(/\%7B/g,"{").replace(/\%7D/g,"}")+"</"+_4+">";
dojo.query("[dojoType]",_1).forEach(function(_9){
_9.removeAttribute("dojoType");
});
var wc=dojo.declare(this.widgetClass,this.mixins,_5);
dojo.forEach(_3,function(s){
var _a=s.getAttribute("event")||s.getAttribute("data-dojo-event")||"postscript",_b=dojo.parser._functionFromScript(s);
dojo.connect(wc.prototype,_a,_b);
});
}});
}
