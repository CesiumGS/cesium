/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.data.dom"]){
dojo._hasResource["dojox.data.dom"]=true;
dojo.provide("dojox.data.dom");
dojo.require("dojox.xml.parser");
dojo.deprecated("dojox.data.dom","Use dojox.xml.parser instead.","2.0");
dojox.data.dom.createDocument=function(_1,_2){
dojo.deprecated("dojox.data.dom.createDocument()","Use dojox.xml.parser.parse() instead.","2.0");
try{
return dojox.xml.parser.parse(_1,_2);
}
catch(e){
return null;
}
};
dojox.data.dom.textContent=function(_3,_4){
dojo.deprecated("dojox.data.dom.textContent()","Use dojox.xml.parser.textContent() instead.","2.0");
if(arguments.length>1){
return dojox.xml.parser.textContent(_3,_4);
}else{
return dojox.xml.parser.textContent(_3);
}
};
dojox.data.dom.replaceChildren=function(_5,_6){
dojo.deprecated("dojox.data.dom.replaceChildren()","Use dojox.xml.parser.replaceChildren() instead.","2.0");
dojox.xml.parser.replaceChildren(_5,_6);
};
dojox.data.dom.removeChildren=function(_7){
dojo.deprecated("dojox.data.dom.removeChildren()","Use dojox.xml.parser.removeChildren() instead.","2.0");
return dojox.xml.parser.removeChildren(_7);
};
dojox.data.dom.innerXML=function(_8){
dojo.deprecated("dojox.data.dom.innerXML()","Use dojox.xml.parser.innerXML() instead.","2.0");
return dojox.xml.parser.innerXML(_8);
};
}
