/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins._SpellCheckParser"]){
dojo._hasResource["dojox.editor.plugins._SpellCheckParser"]=true;
dojo.provide("dojox.editor.plugins._SpellCheckParser");
dojo.declare("dojox.editor.plugins._SpellCheckParser",null,{lang:"english",parseIntoWords:function(_1){
function _2(c){
var ch=c.charCodeAt(0);
return 48<=ch&&ch<=57||65<=ch&&ch<=90||97<=ch&&ch<=122;
};
var _3=this.words=[],_4=this.indices=[],_5=0,_6=_1&&_1.length,_7=0;
while(_5<_6){
var ch;
while(_5<_6&&!_2(ch=_1.charAt(_5))&&ch!="&"){
_5++;
}
if(ch=="&"){
while(++_5<_6&&(ch=_1.charAt(_5))!=";"&&_2(ch)){
}
}else{
_7=_5;
while(++_5<_6&&_2(_1.charAt(_5))){
}
if(_7<_6){
_3.push(_1.substring(_7,_5));
_4.push(_7);
}
}
}
return _3;
},getIndices:function(){
return this.indices;
}});
dojo.subscribe(dijit._scopeName+".Editor.plugin.SpellCheck.getParser",null,function(sp){
if(sp.parser){
return;
}
sp.parser=new dojox.editor.plugins._SpellCheckParser();
});
}
