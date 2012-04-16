/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gantt.TabMenu"]){
dojo._hasResource["dojox.gantt.TabMenu"]=true;
dojo.provide("dojox.gantt.TabMenu");
dojo.require("dijit.dijit");
dojo.require("dijit.Menu");
dojo.require("dijit.Dialog");
dojo.require("dijit.form.NumberSpinner");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.DateTextBox");
dojo.require("dijit.form.TimeTextBox");
dojo.require("dojo.date.locale");
dojo.require("dijit.form.Form");
dojo.require("dojo.parser");
(function(){
dojo.declare("dojox.gantt.TabMenu",null,{constructor:function(_1){
this.ganttChart=_1;
this.menuPanel=null;
this.paneContentArea=null;
this.paneActionBar=null;
this.tabPanelDlg=null;
this.tabPanelDlgId=null;
this.arrTabs=[];
this.isShow=false;
this.buildContent();
},buildContent:function(){
this.createMenuPanel();
this.createTabPanel();
var _2=this.createTab(11,"Add Successor Task","t",true,this);
_2.addItem(1,"Id","id",true);
_2.addItem(2,"Name","name");
_2.addItem(3,"Start Time","startTime");
_2.addItem(4,"Duration (hours)","duration");
_2.addItem(5,"Percent Complete (%)","percentage");
_2.addItem(6,"Task Assignee","taskOwner");
_2.addAction("addSuccessorTaskAction");
var _3=this.createTab(10,"Add Child Task","t",true,this);
_3.addItem(1,"Id","id",true);
_3.addItem(2,"Name","name");
_3.addItem(3,"Start Time","startTime");
_3.addItem(4,"Duration (hours)","duration");
_3.addItem(5,"Percent Complete (%)","percentage");
_3.addItem(6,"Task Assignee","taskOwner");
_3.addAction("addChildTaskAction");
var _4=this.createTab(4,"Set Duration(hours)","t",true,this,true);
_4.addItem(1,"Duration (hours)","duration",true);
_4.addAction("durationUpdateAction");
var _5=this.createTab(5,"Set Complete Percentage (%)","t",true,this,true);
_5.addItem(1,"Percent Complete (%)","percentage",true);
_5.addAction("cpUpdateAction");
var _6=this.createTab(20,"Set Owner","t",true,this,true);
_6.addItem(1,"Task Assignee","taskOwner",true);
_6.addAction("ownerUpdateAction");
var _7=this.createTab(13,"Set Previous Task","t",true,this);
_7.addItem(1,"Previous Task Id","previousTaskId",true);
_7.addAction("ptUpdateAction");
var _8=this.createTab(1,"Rename Task","t",true,this,true);
_8.addItem(1,"New Name","name",true);
_8.addAction("renameTaskAction");
var _9=this.createTab(2,"Delete Task","t",true,this);
_9.addAction("deleteAction");
var _a=this.createTab(12,"Add New Project","p",false,this);
_a.addItem(1,"Id","id",true);
_a.addItem(2,"Name","name",true);
_a.addItem(3,"Start Date","startDate",true);
_a.addAction("addProjectAction");
var _b=this.createTab(8,"Set Complete Percentage (%)","p",true,this,true);
_b.addItem(1,"Percent Complete (%)","percentage",true);
_b.addAction("cpProjectAction");
var _c=this.createTab(6,"Rename Project","p",true,this,true);
_c.addItem(1,"New Name","name",true);
_c.addAction("renameProjectAction");
var _d=this.createTab(7,"Delete Project","p",true,this);
_d.addAction("deleteProjectAction");
var _e=this.createTab(9,"Add New Task","p",true,this);
_e.addItem(1,"Id","id",true);
_e.addItem(2,"Name","name");
_e.addItem(3,"Start Time","startTime");
_e.addItem(4,"Duration (hours)","duration");
_e.addItem(5,"Percent Complete (%)","percentage");
_e.addItem(6,"Task Assignee","taskOwner");
_e.addItem(7,"Parent Task Id","parentTaskId");
_e.addItem(8,"Previous Task Id","previousTaskId");
_e.addAction("addTaskAction");
},createMenuPanel:function(){
this.menuPanel=dojo.create("div",{innerHTML:"<table></table>",className:"ganttMenuPanel"},this.ganttChart.content);
dojo.addClass(this.menuPanel.firstChild,"ganttContextMenu");
this.menuPanel.firstChild.cellPadding=0;
this.menuPanel.firstChild.cellSpacing=0;
},createTabPanel:function(){
this.tabPanelDlg=dijit.byId(this.tabPanelDlgId)||new dijit.Dialog({title:"Settings"});
this.tabPanelDlgId=this.tabPanelDlg.id;
this.tabPanelDlg.closeButtonNode.style.display="none";
var _f=this.tabPanelDlg.containerNode;
this.paneContentArea=dojo.create("div",{className:"dijitDialogPaneContentArea"},_f);
this.paneActionBar=dojo.create("div",{className:"dijitDialogPaneActionBar"},_f);
this.paneContentArea.innerHTML="<table cellpadding=0 cellspacing=0><tr><th></th></tr><tr><td></td></tr></table>";
var _10=this.paneContentArea.firstChild.rows[0].cells[0];
_10.colSpan=2;
_10.innerHTML="Description: ";
dojo.addClass(_10,"ganttDialogContentHeader");
var _11=this.paneContentArea.firstChild.rows[1].cells[0];
_11.innerHTML="<table></table>";
dojo.addClass(_11.firstChild,"ganttDialogContentCell");
_11.align="center";
this.ok=new dijit.form.Button({label:"OK"});
this.cancel=new dijit.form.Button({label:"Cancel"});
this.paneActionBar.appendChild(this.ok.domNode);
this.paneActionBar.appendChild(this.cancel.domNode);
},addItemMenuPanel:function(tab){
var row=this.menuPanel.firstChild.insertRow(this.menuPanel.firstChild.rows.length);
var _12=dojo.create("td",{className:"ganttContextMenuItem",innerHTML:tab.Description});
dojo.attr(_12,"tabIndex",0);
this.ganttChart._events.push(dojo.connect(_12,"onclick",this,function(){
try{
this.hide();
tab.show();
}
catch(e){
}
}));
this.ganttChart._events.push(dojo.connect(_12,"onkeydown",this,function(e){
if(e.keyCode!=dojo.keys.ENTER){
return;
}
try{
this.hide();
tab.show();
}
catch(e){
}
}));
this.ganttChart._events.push(dojo.connect(_12,"onmouseover",this,function(){
dojo.addClass(_12,"ganttContextMenuItemHover");
}));
this.ganttChart._events.push(dojo.connect(_12,"onmouseout",this,function(){
dojo.removeClass(_12,"ganttContextMenuItemHover");
}));
row.appendChild(_12);
},show:function(_13,_14){
if(_14.constructor==dojox.gantt.GanttTaskControl){
dojo.forEach(this.arrTabs,function(tab){
if(tab.type=="t"){
tab.object=_14;
this.addItemMenuPanel(tab);
}
},this);
}else{
if(_14.constructor==dojox.gantt.GanttProjectControl){
dojo.forEach(this.arrTabs,function(tab){
if(tab.type=="p"){
tab.object=_14;
this.addItemMenuPanel(tab);
}
},this);
}
}
this.isShow=true;
dojo.style(this.menuPanel,{zIndex:15,visibility:"visible"});
var _15=dojo.position(this.menuPanel,true),_16=dojo.position(this.ganttChart.content,true),pos=dojo.coords(_13,true);
if((pos.y+_15.h)>(_16.y+_16.h+50)){
this.menuPanel.style.top=pos.y-_15.h+pos.h+"px";
}else{
this.menuPanel.style.top=pos.y+"px";
}
if(dojo._isBodyLtr()){
this.menuPanel.style.left=pos.x+pos.w+5+"px";
}else{
this.menuPanel.style.left=pos.x-_15.w-5+"px";
}
},hide:function(){
this.isShow=false;
this.menuPanel.style.visibility="hidden";
},clear:function(){
this.menuPanel.removeChild(this.menuPanel.firstChild);
this.menuPanel.innerHTML="<table></table>";
dojo.addClass(this.menuPanel.firstChild,"ganttContextMenu");
this.menuPanel.firstChild.cellPadding=0;
this.menuPanel.firstChild.cellSpacing=0;
},createTab:function(id,_17,_18,_19,_1a,_1b){
var tab=new dojox.gantt.contextMenuTab(id,_17,_18,_19,_1a,_1b);
this.arrTabs.push(tab);
return tab;
}});
dojo.declare("dojox.gantt.contextMenuTab",null,{constructor:function(id,_1c,_1d,_1e,_1f,_20){
this.id=id;
this.arrItems=[];
this.TabItemContainer=null;
this.Description=_1c;
this.tabMenu=_1f;
this.type=_1d;
this.object=null;
this.showObjectInfo=_1e;
this.withDefaultValue=_20;
},preValueValidation:function(_21){
for(var i=0;i<_21.length;i++){
var _22=_21[i];
if(_22.required&&!_22.control.textbox.value){
return false;
}
}
return true;
},encodeDate:function(_23){
return _23.getFullYear()+"."+(_23.getMonth()+1)+"."+_23.getDate();
},decodeDate:function(_24){
var arr=_24.split(".");
return (arr.length<3)?"":(new Date(arr[0],parseInt(arr[1])-1,arr[2]));
},renameTaskAction:function(){
var _25=this.arrItems[0].control.textbox.value;
if(dojo.trim(_25).length<=0){
return;
}
if(!this.preValueValidation(this.arrItems)){
return;
}
this.object.setName(_25);
this.hide();
},deleteAction:function(){
if(!this.preValueValidation(this.arrItems)){
return;
}
this.object.project.deleteTask(this.object.taskItem.id);
this.hide();
this.tabMenu.ganttChart.resource&&this.tabMenu.ganttChart.resource.reConstruct();
},durationUpdateAction:function(){
var d=this.arrItems[0].control.textbox.value;
if(!this.preValueValidation(this.arrItems)){
return;
}
if(this.object.setDuration(d)){
this.hide();
}else{
alert("Duration out of Range");
return;
}
this.tabMenu.ganttChart.resource&&this.tabMenu.ganttChart.resource.refresh();
},cpUpdateAction:function(){
var p=this.arrItems[0].control.textbox.value;
if(!this.preValueValidation(this.arrItems)){
return;
}
if(this.object.setPercentCompleted(p)){
this.hide();
}else{
alert("Complete Percentage out of Range");
return;
}
},ownerUpdateAction:function(){
var to=this.arrItems[0].control.textbox.value;
if(!this.preValueValidation(this.arrItems)){
return;
}
if(this.object.setTaskOwner(to)){
this.hide();
}else{
alert("Task owner not Valid");
return;
}
this.tabMenu.ganttChart.resource&&this.tabMenu.ganttChart.resource.reConstruct();
},ptUpdateAction:function(){
var p=this.arrItems[0].control.textbox.value;
if(!this.preValueValidation(this.arrItems)){
return;
}
if(this.object.setPreviousTask(p)){
this.hide();
}else{
alert("Please verify the Previous Task ("+p+")  and adjust its Time Range");
return;
}
},renameProjectAction:function(){
var _26=this.arrItems[0].control.textbox.value;
if(dojo.trim(_26).length<=0){
return;
}
if(!this.preValueValidation(this.arrItems)){
return;
}
this.object.setName(_26);
this.hide();
},deleteProjectAction:function(){
if(!this.preValueValidation(this.arrItems)){
return;
}
this.object.ganttChart.deleteProject(this.object.project.id);
this.hide();
this.tabMenu.ganttChart.resource&&this.tabMenu.ganttChart.resource.reConstruct();
},cpProjectAction:function(){
var p=this.arrItems[0].control.textbox.value;
if(!this.preValueValidation(this.arrItems)){
return;
}
if(this.object.setPercentCompleted(p)){
this.hide();
}else{
alert("Percentage not Acceptable");
return;
}
},addTaskAction:function(){
if(!this.preValueValidation(this.arrItems)){
return;
}
var id=this.arrItems[0].control.textbox.value,_27=this.arrItems[1].control.textbox.value,_28=this.decodeDate(this.arrItems[2].control.textbox.value),_29=this.arrItems[3].control.textbox.value,pc=this.arrItems[4].control.textbox.value,_2a=this.arrItems[5].control.textbox.value,_2b=this.arrItems[6].control.textbox.value,_2c=this.arrItems[7].control.textbox.value;
if(dojo.trim(id).length<=0){
return;
}
if(this.object.insertTask(id,_27,_28,_29,pc,_2c,_2a,_2b)){
this.hide();
}else{
alert("Please adjust your Customization");
return;
}
this.tabMenu.ganttChart.resource&&this.tabMenu.ganttChart.resource.reConstruct();
},addSuccessorTaskAction:function(){
if(!this.preValueValidation(this.arrItems)){
return;
}
var pr=this.object.project,id=this.arrItems[0].control.textbox.value,_2d=this.arrItems[1].control.textbox.value,_2e=this.decodeDate(this.arrItems[2].control.textbox.value),_2f=this.arrItems[3].control.textbox.value,pc=this.arrItems[4].control.textbox.value,_30=this.arrItems[5].control.textbox.value;
if(dojo.trim(id).length<=0){
return;
}
var _31=!this.object.parentTask?"":this.object.parentTask.taskItem.id;
var _32=this.object.taskItem.id;
if(pr.insertTask(id,_2d,_2e,_2f,pc,_32,_30,_31)){
this.hide();
}else{
alert("Please adjust your Customization");
return;
}
this.tabMenu.ganttChart.resource&&this.tabMenu.ganttChart.resource.reConstruct();
},addChildTaskAction:function(){
if(!this.preValueValidation(this.arrItems)){
return;
}
var pr=this.object.project,id=this.arrItems[0].control.textbox.value,_33=this.arrItems[1].control.textbox.value,_34=this.decodeDate(this.arrItems[2].control.textbox.value),_35=this.arrItems[3].control.textbox.value,pc=this.arrItems[4].control.textbox.value,_36=this.arrItems[5].control.textbox.value,_37=this.object.taskItem.id,_38="";
if(dojo.trim(id).length<=0){
return;
}
if(pr.insertTask(id,_33,_34,_35,pc,_38,_36,_37)){
this.hide();
}else{
alert("Please adjust your Customization");
return;
}
this.tabMenu.ganttChart.resource&&this.tabMenu.ganttChart.resource.reConstruct();
},addProjectAction:function(){
if(!this.preValueValidation(this.arrItems)){
return;
}
var id=this.arrItems[0].control.textbox.value,_39=this.arrItems[1].control.textbox.value,_3a=this.decodeDate(this.arrItems[2].control.textbox.value);
if(dojo.trim(id).length<=0||dojo.trim(_39).length<=0){
return;
}
if(this.tabMenu.ganttChart.insertProject(id,_39,_3a)){
this.hide();
}else{
alert("Please adjust your Customization");
return;
}
this.tabMenu.ganttChart.resource&&this.tabMenu.ganttChart.resource.reConstruct();
},addAction:function(_3b){
this.actionFunc=this[_3b];
},addItem:function(id,_3c,key,_3d){
var _3e;
if(key=="startTime"||key=="startDate"){
_3e=new dijit.form.DateTextBox({type:"text",constraints:{datePattern:"yyyy.M.d",strict:true}});
}else{
if(key=="percentage"){
_3e=new dijit.form.NumberSpinner({constraints:{max:100,min:0}});
}else{
if(key=="duration"){
_3e=new dijit.form.NumberSpinner({constraints:{min:0}});
}else{
_3e=new dijit.form.TextBox();
}
}
}
this.arrItems.push({id:id,name:_3c,control:_3e,tab:this,key:key,required:_3d});
},show:function(){
this.tabMenu.tabPanelDlg=this.tabMenu.tabPanelDlg||dijit.byId(this.tabMenu.tabPanelDlgId)||new dijit.Dialog({title:"Settings"});
try{
this.tabMenu.tabPanelDlg.show();
}
catch(e){
return;
}
this.tabMenu.tabPanelDlg.titleNode.innerHTML=this.Description;
var _3f=this.tabMenu.paneContentArea.firstChild.rows[1].cells[0].firstChild,_40=this.tabMenu.paneActionBar;
var _41,_42,row=null;
if(this.showObjectInfo){
if(this.object){
if(this.object.constructor==dojox.gantt.GanttTaskControl){
this.insertData(_3f,"Id",this.object.taskItem.id);
this.insertData(_3f,"Name",this.object.taskItem.name);
this.insertData(_3f,"Start Time",this.encodeDate(this.object.taskItem.startTime));
this.insertData(_3f,"Duration (hours)",this.object.taskItem.duration+" hours");
this.insertData(_3f,"Percent Complete (%)",this.object.taskItem.percentage+"%");
this.insertData(_3f,"Task Assignee",this.object.taskItem.taskOwner);
this.insertData(_3f,"Previous Task Id",this.object.taskItem.previousTaskId);
}else{
this.insertData(_3f,"Id",this.object.project.id);
this.insertData(_3f,"Name",this.object.project.name);
this.insertData(_3f,"Start date",this.encodeDate(this.object.project.startDate));
}
}
}
row=_3f.insertRow(_3f.rows.length);
_41=row.insertCell(row.cells.length);
_41.colSpan=2;
_41.innerHTML="<hr/>";
row=_3f.insertRow(_3f.rows.length);
_41=row.insertCell(row.cells.length);
_41.colSpan=2;
dojo.addClass(_41,"ganttMenuDialogInputCellHeader");
_41.innerHTML="Customization: "+this.Description;
dojo.forEach(this.arrItems,function(_43){
row=_3f.insertRow(_3f.rows.length);
_41=row.insertCell(row.cells.length);
dojo.addClass(_41,"ganttMenuDialogInputCell");
_42=row.insertCell(row.cells.length);
dojo.addClass(_42,"ganttMenuDialogInputCellValue");
_41.innerHTML=_43.name;
_42.appendChild(_43.control.domNode);
if(this.withDefaultValue&&this.object){
if(this.object.constructor==dojox.gantt.GanttTaskControl){
if(_43.key=="startTime"){
_43.control.textbox.value=this.encodeDate(this.object.taskItem.startTime);
}else{
_43.control.textbox.value=_43.key?this.object.taskItem[_43.key]:"";
}
}else{
if(_43.key=="startDate"){
_43.control.textbox.value=this.encodeDate(this.object.project.startDate);
}else{
_43.control.textbox.value=_43.key?(this.object.project[_43.key]||this.object[_43.key]||""):"";
}
}
}else{
_43.control.textbox.placeholder=_43.required?"---required---":"---optional---";
}
},this);
this.tabMenu.ok.onClick=dojo.hitch(this,this.actionFunc);
this.tabMenu.cancel.onClick=dojo.hitch(this,this.hide);
},hide:function(){
try{
this.tabMenu.tabPanelDlg.hide();
}
catch(e){
this.tabMenu.tabPanelDlg.destroy();
}
var _44=this.tabMenu.paneContentArea.firstChild.rows[1].cells[0];
_44.firstChild.parentNode.removeChild(_44.firstChild);
_44.innerHTML="<table></table>";
dojo.addClass(_44.firstChild,"ganttDialogContentCell");
},insertData:function(_45,_46,_47){
var _48,_49,row=null;
row=_45.insertRow(_45.rows.length);
_48=row.insertCell(row.cells.length);
dojo.addClass(_48,"ganttMenuDialogDescCell");
_48.innerHTML=_46;
_49=row.insertCell(row.cells.length);
dojo.addClass(_49,"ganttMenuDialogDescCellValue");
_49.innerHTML=_47;
}});
})();
}
