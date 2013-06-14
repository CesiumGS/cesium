/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/selector/_loader",["../has","require"],function(_1,_2){
"use strict";
var _3=document.createElement("div");
_1.add("dom-qsa2.1",!!_3.querySelectorAll);
_1.add("dom-qsa3",function(){
try{
_3.innerHTML="<p class='TEST'></p>";
return _3.querySelectorAll(".TEST:empty").length==1;
}
catch(e){
}
});
var _4;
var _5="./acme",_6="./lite";
return {load:function(id,_7,_8,_9){
var _a=_2;
id=id=="default"?_1("config-selectorEngine")||"css3":id;
id=id=="css2"||id=="lite"?_6:id=="css2.1"?_1("dom-qsa2.1")?_6:_5:id=="css3"?_1("dom-qsa3")?_6:_5:id=="acme"?_5:(_a=_7)&&id;
if(id.charAt(id.length-1)=="?"){
id=id.substring(0,id.length-1);
var _b=true;
}
if(_b&&(_1("dom-compliant-qsa")||_4)){
return _8(_4);
}
_a([id],function(_c){
if(id!="./lite"){
_4=_c;
}
_8(_c);
});
}};
});
