/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.rails"]){
dojo._hasResource["dojox.rails"]=true;
dojo.provide("dojox.rails");
dojo.require("dojo.NodeList-traverse");
dojox.rails.live=function(_1,_2,fn){
if(dojo.isIE&&_2.match(/^(on)?submit$/i)){
dojox.rails.live(_1,"click",function(_3){
var _4=_3.target,_5=_4.tagName.toLowerCase();
if((_5=="input"||_5=="button")&&dojo.attr(_4,"type").toLowerCase()=="submit"){
var _6=dojo.query(_4).closest("form");
if(_6.length){
var h=dojo.connect(_6[0],"submit",function(_7){
dojo.disconnect(h);
fn.call(_7.target,_7);
});
}
}
});
}else{
dojo.connect(dojo.body(),_2,function(_8){
var nl=dojo.query(_8.target).closest(_1);
if(nl.length){
fn.call(nl[0],_8);
}
});
}
};
dojo.ready((function(d,dr,dg){
return function(){
var q=d.query,_9=dr.live,_a=q("meta[name=csrf-token]").attr("content"),_b=q("meta[name=csrf-param]").attr("content");
var _c=function(_d,_e){
var _f="<form style=\"display:none\" method=\"post\" action=\""+_d+"\">"+"<input type=\"hidden\" name=\"_method\" value=\""+_e+"\" />"+"<input type=\"hidden\" name=\""+_b+"\" value=\""+_a+"\" />"+"</form>";
return dojo.place(_f,dojo.body());
};
var _10=function(_11){
d.forEach(_11,function(_12){
if(!d.attr(_12,"disabled")){
var _13=_12.tagName.toLowerCase()=="input"?"value":"innerHTML";
var _14=d.attr(_12,"data-disable-with");
var _15=d.attr(_12,_13);
d.attr(_12,"disabled",true);
d.attr(_12,"data-original-value",_15);
d.attr(_12,_13,_14);
}
});
};
var _16={"text":"text","json":"application/json","json-comment-optional":"text","json-comment-filtered":"text","javascript":"application/javascript","xml":"text/xml"};
var _17=function(evt){
var el=evt.target,tag=el.tagName.toLowerCase();
var _18=tag.toLowerCase()=="form"?d.formToObject(el):{},_19=d.attr(el,"data-type")||"javascript",_1a=(d.attr(el,"method")||d.attr(el,"data-method")||"get").toLowerCase(),url=d.attr(el,"action")||d.attr(el,"href");
if(tag!="form"&&_1a!="get"){
el=_c(url,_1a);
_1a="POST";
}
evt.preventDefault();
d.publish("ajax:before",[el]);
var _1b=d.xhr(_1a,{url:url,headers:{"Accept":_16[_19]},content:_18,handleAs:_19,load:function(_1c,_1d){
d.publish("ajax:success",[el,_1c,_1d]);
},error:function(_1e,_1f){
d.publish("ajax:failure",[el,_1e,_1f]);
},handle:function(_20,_21){
d.publish("ajax:complete",[el,_20,_21]);
}});
d.publish("ajax:after",[el]);
};
var _22=function(el){
q("*[data-disable-with][disabled]",el).forEach(function(_23){
var _24=_23.tagName.toLowerCase()=="input"?"value":"innerHTML";
var _25=d.attr(_23,"data-original-value");
d.attr(_23,"disabled",false);
d.attr(_23,"data-original-value",null);
d.attr(_23,_24,_25);
});
};
var _26=function(evt){
var el=evt.target,_27=_c(el.href,dojo.attr(el,"data-method"));
evt.preventDefault();
_27.submit();
};
var _28=function(evt){
var el=evt.target,_29=q("*[data-disable-with]",el);
if(_29.length){
_10(_29);
}
if(d.attr(el,"data-remote")){
evt.preventDefault();
_17(evt);
}
};
var _2a=function(evt){
var _2b=dg.confirm(d.attr(evt.target,"data-confirm"));
if(!_2b){
evt.preventDefault();
}else{
if(d.attr(evt.target,"data-remote")){
_17(evt);
}
}
};
_9("*[data-confirm]","click",_2a);
d.subscribe("ajax:complete",_22);
_9("a[data-remote]:not([data-confirm])","click",_17);
_9("a[data-method]:not([data-remote])","click",_26);
_9("form","submit",_28);
};
})(dojo,dojox.rails,dojo.global));
}
