//>>built
define("dijit/Declaration",["dojo/_base/array","dojo/aspect","dojo/_base/declare","dojo/_base/lang","dojo/parser","dojo/query","./_Widget","./_TemplatedMixin","./_WidgetsInTemplateMixin","dojo/NodeList-dom"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9){
return _3("dijit.Declaration",_7,{_noScript:true,stopParser:true,widgetClass:"",defaults:null,mixins:[],buildRendering:function(){
var _a=this.srcNodeRef.parentNode.removeChild(this.srcNodeRef),_b=_6("> script[type='dojo/method']",_a).orphan(),_c=_6("> script[type='dojo/connect']",_a).orphan(),_d=_6("> script[type='dojo/aspect']",_a).orphan(),_e=_a.nodeName;
var _f=this.defaults||{};
_1.forEach(_b,function(s){
var evt=s.getAttribute("event")||s.getAttribute("data-dojo-event"),_10=_5._functionFromScript(s,"data-dojo-");
if(evt){
_f[evt]=_10;
}else{
_d.push(s);
}
});
if(this.mixins.length){
this.mixins=_1.map(this.mixins,function(_11){
return _4.getObject(_11);
});
}else{
this.mixins=[_7,_8,_9];
}
_f._skipNodeCache=true;
_f.templateString="<"+_e+" class='"+_a.className+"'"+" data-dojo-attach-point='"+(_a.getAttribute("data-dojo-attach-point")||_a.getAttribute("dojoAttachPoint")||"")+"' data-dojo-attach-event='"+(_a.getAttribute("data-dojo-attach-event")||_a.getAttribute("dojoAttachEvent")||"")+"' >"+_a.innerHTML.replace(/\%7B/g,"{").replace(/\%7D/g,"}")+"</"+_e+">";
var wc=_3(this.widgetClass,this.mixins,_f);
_1.forEach(_d,function(s){
var _12=s.getAttribute("data-dojo-advice")||"after",_13=s.getAttribute("data-dojo-method")||"postscript",_14=_5._functionFromScript(s);
_2.after(wc.prototype,_13,_14,true);
});
_1.forEach(_c,function(s){
var evt=s.getAttribute("event")||s.getAttribute("data-dojo-event"),_15=_5._functionFromScript(s);
_2.after(wc.prototype,evt,_15,true);
});
}});
});
