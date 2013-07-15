/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/hccss",["require","./_base/config","./dom-class","./dom-style","./has","./domReady","./_base/window"],function(_1,_2,_3,_4,_5,_6,_7){
_5.add("highcontrast",function(){
var _8=_7.doc.createElement("div");
_8.style.cssText="border: 1px solid; border-color:red green; position: absolute; height: 5px; top: -999px;"+"background-image: url("+(_2.blankGif||_1.toUrl("./resources/blank.gif"))+");";
_7.body().appendChild(_8);
var cs=_4.getComputedStyle(_8),_9=cs.backgroundImage,hc=(cs.borderTopColor==cs.borderRightColor)||(_9&&(_9=="none"||_9=="url(invalid-url:)"));
if(_5("ie")<=8){
_8.outerHTML="";
}else{
_7.body().removeChild(_8);
}
return hc;
});
_6(function(){
if(_5("highcontrast")){
_3.add(_7.body(),"dj_a11y");
}
});
return _5;
});
