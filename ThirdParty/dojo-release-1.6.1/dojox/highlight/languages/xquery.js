/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.highlight.languages.xquery"]){
dojo._hasResource["dojox.highlight.languages.xquery"]=true;
dojo.provide("dojox.highlight.languages.xquery");
dojo.require("dojox.highlight._base");
(function(){
var _1={className:"comment",begin:"\\(\\:",end:"\\:\\)"};
var _2={"ancestor":1,"ancestor-or-self":1,"and":1,"as":1,"ascending":1,"at":1,"attribute":1,"base-uri":1,"boundary-space":1,"by":1,"case":1,"cast":1,"castable":1,"child":1,"collation":1,"comment":1,"construction":1,"copy-namespaces":1,"declare":1,"default":1,"descendant":1,"descendant-or-self":1,"descending":1,"div":1,"document":1,"document-node":1,"element":1,"else":1,"empty":1,"empty-sequence":1,"encoding":1,"eq":1,"every":1,"except":1,"external":1,"following":1,"following-sibling":1,"for":1,"function":1,"ge":1,"greatest":1,"gt":1,"idiv":1,"if":1,"import":1,"in":1,"inherit":1,"instance":1,"intersect":1,"is":1,"item":1,"lax":1,"le":1,"least":1,"let":1,"lt":1,"mod":1,"module":1,"namespace":1,"ne":1,"node":1,"no-inherit":1,"no-preserve":1,"of":1,"option":1,"or":1,"order":1,"ordered":1,"ordering":1,"parent":1,"preceding":1,"preceding-sibling":1,"preserve":1,"processing-instruction":1,"return":1,"satisfies":1,"schema":1,"schema-attribute":1,"schema-element":1,"self":1,"some":1,"stable":1,"strict":1,"strip":1,"text":1,"then":1,"to":1,"treat":1,"typeswitch":1,"union":1,"unordered":1,"validate":1,"variable":1,"version":1,"where":1,"xquery":1};
var dh=dojox.highlight,_3=dh.constants;
dh.languages.xquery={case_insensitive:true,defaultMode:{lexems:[_3.IDENT_RE],contains:["string","number","comment"],keywords:{"keyword":_2}},modes:[_1],XQUERY_COMMENT:_1};
})();
}
