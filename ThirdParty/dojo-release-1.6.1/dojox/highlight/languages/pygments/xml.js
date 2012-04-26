/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.highlight.languages.pygments.xml"]){
dojo._hasResource["dojox.highlight.languages.pygments.xml"]=true;
dojo.provide("dojox.highlight.languages.pygments.xml");
dojo.require("dojox.highlight._base");
dojox.highlight.languages.pygments.xml={a:1};
dojox.highlight.languages.xml={defaultMode:{contains:["name entity","comment","comment preproc","_tag"]},modes:[{className:"comment",begin:"<!--",end:"-->"},{className:"comment preproc",begin:"\\<\\!\\[CDATA\\[",end:"\\]\\]\\>"},{className:"comment preproc",begin:"\\<\\!",end:"\\>"},{className:"comment preproc",begin:"\\<\\?",end:"\\?\\>",relevance:5},{className:"string",begin:"'",end:"'",illegal:"\\n",relevance:0},{className:"string",begin:"\"",end:"\"",illegal:"\\n",relevance:0},{className:"name entity",begin:"\\&[a-z]+;",end:"^"},{className:"name tag",begin:"\\b[a-z0-9_\\:\\-]+\\b",end:"^"},{className:"name attribute",begin:"\\b[a-z0-9_\\:\\-]+=",end:"^",relevance:0},{className:"_tag",begin:"\\<",end:"\\>",contains:["name tag","name attribute","string"]},{className:"_tag",begin:"\\</",end:"\\>",contains:["name tag"]}]};
}
