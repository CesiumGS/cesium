/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.collections.BinaryTree"]){
dojo._hasResource["dojox.collections.BinaryTree"]=true;
dojo.provide("dojox.collections.BinaryTree");
dojo.require("dojox.collections._base");
dojox.collections.BinaryTree=function(_1){
function _2(_3,_4,_5){
this.value=_3||null;
this.right=_4||null;
this.left=_5||null;
this.clone=function(){
var c=new _2();
if(this.value.value){
c.value=this.value.clone();
}else{
c.value=this.value;
}
if(this.left!=null){
c.left=this.left.clone();
}
if(this.right!=null){
c.right=this.right.clone();
}
return c;
};
this.compare=function(n){
if(this.value>n.value){
return 1;
}
if(this.value<n.value){
return -1;
}
return 0;
};
this.compareData=function(d){
if(this.value>d){
return 1;
}
if(this.value<d){
return -1;
}
return 0;
};
};
function _6(_7,a){
if(_7){
_6(_7.left,a);
a.push(_7.value);
_6(_7.right,a);
}
};
function _8(_9,_a){
var s="";
if(_9){
s=_9.value.toString()+_a;
s+=_8(_9.left,_a);
s+=_8(_9.right,_a);
}
return s;
};
function _b(_c,_d){
var s="";
if(_c){
s=_b(_c.left,_d);
s+=_c.value.toString()+_d;
s+=_b(_c.right,_d);
}
return s;
};
function _e(_f,sep){
var s="";
if(_f){
s=_e(_f.left,sep);
s+=_e(_f.right,sep);
s+=_f.value.toString()+sep;
}
return s;
};
function _10(_11,_12){
if(!_11){
return null;
}
var i=_11.compareData(_12);
if(i==0){
return _11;
}
if(i>0){
return _10(_11.left,_12);
}else{
return _10(_11.right,_12);
}
};
this.add=function(_13){
var n=new _2(_13);
var i;
var _14=_15;
var _16=null;
while(_14){
i=_14.compare(n);
if(i==0){
return;
}
_16=_14;
if(i>0){
_14=_14.left;
}else{
_14=_14.right;
}
}
this.count++;
if(!_16){
_15=n;
}else{
i=_16.compare(n);
if(i>0){
_16.left=n;
}else{
_16.right=n;
}
}
};
this.clear=function(){
_15=null;
this.count=0;
};
this.clone=function(){
var c=new dojox.collections.BinaryTree();
var itr=this.getIterator();
while(!itr.atEnd()){
c.add(itr.get());
}
return c;
};
this.contains=function(_17){
return this.search(_17)!=null;
};
this.deleteData=function(_18){
var _19=_15;
var _1a=null;
var i=_19.compareData(_18);
while(i!=0&&_19!=null){
if(i>0){
_1a=_19;
_19=_19.left;
}else{
if(i<0){
_1a=_19;
_19=_19.right;
}
}
i=_19.compareData(_18);
}
if(!_19){
return;
}
this.count--;
if(!_19.right){
if(!_1a){
_15=_19.left;
}else{
i=_1a.compare(_19);
if(i>0){
_1a.left=_19.left;
}else{
if(i<0){
_1a.right=_19.left;
}
}
}
}else{
if(!_19.right.left){
if(!_1a){
_15=_19.right;
}else{
i=_1a.compare(_19);
if(i>0){
_1a.left=_19.right;
}else{
if(i<0){
_1a.right=_19.right;
}
}
}
}else{
var _1b=_19.right.left;
var _1c=_19.right;
while(_1b.left!=null){
_1c=_1b;
_1b=_1b.left;
}
_1c.left=_1b.right;
_1b.left=_19.left;
_1b.right=_19.right;
if(!_1a){
_15=_1b;
}else{
i=_1a.compare(_19);
if(i>0){
_1a.left=_1b;
}else{
if(i<0){
_1a.right=_1b;
}
}
}
}
}
};
this.getIterator=function(){
var a=[];
_6(_15,a);
return new dojox.collections.Iterator(a);
};
this.search=function(_1d){
return _10(_15,_1d);
};
this.toString=function(_1e,sep){
if(!_1e){
_1e=dojox.collections.BinaryTree.TraversalMethods.Inorder;
}
if(!sep){
sep=",";
}
var s="";
switch(_1e){
case dojox.collections.BinaryTree.TraversalMethods.Preorder:
s=_8(_15,sep);
break;
case dojox.collections.BinaryTree.TraversalMethods.Inorder:
s=_b(_15,sep);
break;
case dojox.collections.BinaryTree.TraversalMethods.Postorder:
s=_e(_15,sep);
break;
}
if(s.length==0){
return "";
}else{
return s.substring(0,s.length-sep.length);
}
};
this.count=0;
var _15=this.root=null;
if(_1){
this.add(_1);
}
};
dojox.collections.BinaryTree.TraversalMethods={Preorder:1,Inorder:2,Postorder:3};
}
