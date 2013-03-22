define([
	"./contextMenuTab",
	"./GanttTaskControl",
	"./GanttProjectControl",
	"dijit/Dialog",
	"dijit/form/Button",
	"dijit/form/Form",
	"dijit/registry",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/lang",
    "dojo/date/locale",
	"dojo/request",
	"dojo/on",
	"dojo/dom",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dojo/dom-attr",
	"dojo/dom-geometry",
	"dojo/keys",
	"dojo/domReady!"
], function(contextMenuTab, GanttTaskControl, GanttProjectControl,
		Dialog, Button, Form,
		registry, declare, arrayUtil, lang, locale, request, on,
		dom, domClass, domConstruct, domStyle, domAttr, domGeometry, keys){
	return declare("dojox.gantt.TabMenu", [], {
		constructor: function(chart){
			this.ganttChart = chart;
			this.menuPanel = null;
			this.paneContentArea = null;
			this.paneActionBar = null;
			this.tabPanelDlg = null;
			this.tabPanelDlgId = null;
			this.arrTabs = [];
			this.isShow = false;
			this.buildContent();
		},
		buildContent: function(){
			this.createMenuPanel();
			this.createTabPanel();
			
			//tasks customization
			var taskSucAdd = this.createTab(11, "Add Successor Task", "t", true, this);
			taskSucAdd.addItem(1, "Id", "id", true);
			taskSucAdd.addItem(2, "Name", "name");
			taskSucAdd.addItem(3, "Start Time", "startTime");
			taskSucAdd.addItem(4, "Duration (hours)", "duration");
			taskSucAdd.addItem(5, "Percent Complete (%)", "percentage");
			taskSucAdd.addItem(6, "Task Assignee", "taskOwner");
			taskSucAdd.addAction("addSuccessorTaskAction");
			
			var taskChildAdd = this.createTab(10, "Add Child Task", "t", true, this);
			taskChildAdd.addItem(1, "Id", "id", true);
			taskChildAdd.addItem(2, "Name", "name");
			taskChildAdd.addItem(3, "Start Time", "startTime");
			taskChildAdd.addItem(4, "Duration (hours)", "duration");
			taskChildAdd.addItem(5, "Percent Complete (%)", "percentage");
			taskChildAdd.addItem(6, "Task Assignee", "taskOwner");
			taskChildAdd.addAction("addChildTaskAction");
			
			var taskDuration = this.createTab(4, "Set Duration(hours)", "t", true, this, true);
			taskDuration.addItem(1, "Duration (hours)", "duration", true);
			taskDuration.addAction("durationUpdateAction");
			
			var taskCP = this.createTab(5, "Set Complete Percentage (%)", "t", true, this, true);
			taskCP.addItem(1, "Percent Complete (%)", "percentage", true);
			taskCP.addAction("cpUpdateAction");
			
			var taskOwner = this.createTab(20, "Set Owner", "t", true, this, true);
			taskOwner.addItem(1, "Task Assignee", "taskOwner", true);
			taskOwner.addAction("ownerUpdateAction");
			
			var taskPrevious = this.createTab(13, "Set Previous Task", "t", true, this);
			taskPrevious.addItem(1, "Previous Task Id", "previousTaskId", true);
			taskPrevious.addAction("ptUpdateAction");
			
			var taskRename = this.createTab(1, "Rename Task", "t", true, this, true);
			taskRename.addItem(1, "New Name", "name", true);
			taskRename.addAction("renameTaskAction");
			
			var taskDelete = this.createTab(2, "Delete Task", "t", true, this);
			taskDelete.addAction("deleteAction");
			
			//projects customization
			var projectAdd = this.createTab(12, "Add New Project", "p", false, this);
			projectAdd.addItem(1, "Id", "id", true);
			projectAdd.addItem(2, "Name", "name", true);
			projectAdd.addItem(3, "Start Date", "startDate", true);
			projectAdd.addAction("addProjectAction");
			
			var projectCP = this.createTab(8, "Set Complete Percentage (%)", "p", true, this, true);
			projectCP.addItem(1, "Percent Complete (%)", "percentage", true);
			projectCP.addAction("cpProjectAction");
			
			var projectRename = this.createTab(6, "Rename Project", "p", true, this, true);
			projectRename.addItem(1, "New Name", "name", true);
			projectRename.addAction("renameProjectAction");
			
			var projectDelete = this.createTab(7, "Delete Project", "p", true, this);
			projectDelete.addAction("deleteProjectAction");
			
			//task relative
			var projectTaskAdd = this.createTab(9, "Add New Task", "p", true, this);
			projectTaskAdd.addItem(1, "Id", "id", true);
			projectTaskAdd.addItem(2, "Name", "name");
			projectTaskAdd.addItem(3, "Start Time", "startTime");
			projectTaskAdd.addItem(4, "Duration (hours)", "duration");
			projectTaskAdd.addItem(5, "Percent Complete (%)", "percentage");
			projectTaskAdd.addItem(6, "Task Assignee", "taskOwner");
			projectTaskAdd.addItem(7, "Parent Task Id", "parentTaskId");
			projectTaskAdd.addItem(8, "Previous Task Id", "previousTaskId");
			projectTaskAdd.addAction("addTaskAction");
		},
		createMenuPanel: function(){
			this.menuPanel = domConstruct.create("div", {
				innerHTML: "<table></table>",
				className: "ganttMenuPanel"
			}, this.ganttChart.content);
			domClass.add(this.menuPanel.firstChild, "ganttContextMenu");
			this.menuPanel.firstChild.cellPadding = 0;
			this.menuPanel.firstChild.cellSpacing = 0;
		},
		createTabPanel: function(){
			this.tabPanelDlg = registry.byId(this.tabPanelDlgId) ||
				new Dialog({
					title: "Settings"
				});
			this.tabPanelDlgId = this.tabPanelDlg.id;
			this.tabPanelDlg.closeButtonNode.style.display = "none";
			var tabPanel = this.tabPanelDlg.containerNode;
			this.paneContentArea = domConstruct.create("div", {className: "dijitDialogPaneContentArea"}, tabPanel);
			this.paneActionBar = domConstruct.create("div", {className: "dijitDialogPaneActionBar"}, tabPanel);
			this.paneContentArea.innerHTML = "<table cellpadding=0 cellspacing=0><tr><th></th></tr><tr><td></td></tr></table>";
			var headerCell = this.paneContentArea.firstChild.rows[0].cells[0];
			headerCell.colSpan = 2;
			headerCell.innerHTML = "Description: ";
			domClass.add(headerCell, "ganttDialogContentHeader");
			var contentCell = this.paneContentArea.firstChild.rows[1].cells[0];
			contentCell.innerHTML = "<table></table>";
			domClass.add(contentCell.firstChild, "ganttDialogContentCell");
			contentCell.align = "center";
			this.ok = new Button({label: "OK"});
			this.cancel = new Button({label: "Cancel"});
			this.paneActionBar.appendChild(this.ok.domNode);
			this.paneActionBar.appendChild(this.cancel.domNode);
		},
		addItemMenuPanel: function(tab){
			var row = this.menuPanel.firstChild.insertRow(this.menuPanel.firstChild.rows.length);
			var cell = domConstruct.create("td", {
				className: "ganttContextMenuItem",
				innerHTML: tab.Description
			});
			domAttr.set(cell, "tabIndex", 0);
			this.ganttChart._events.push(
				on(cell, "click", lang.hitch(this, function(){
					try{
						this.hide();
						tab.show();
					}catch(e){
						console.log("dialog open exception: " + e.message);
					}
				}))
			);
			this.ganttChart._events.push(
				on(cell, "keydown", lang.hitch(this, function(event){
					if(event.keyCode != keys.ENTER){return;}
					try{
						this.hide();
						tab.show();
					}catch(e){
						console.log("dialog open exception: " + e.message);
					}
				}))
			);
			this.ganttChart._events.push(
				on(cell, "mouseover", lang.hitch(this, function(){
					domClass.add(cell, "ganttContextMenuItemHover");
				}))
			);
			this.ganttChart._events.push(
				on(cell, "mouseout", lang.hitch(this, function(){
					domClass.remove(cell, "ganttContextMenuItemHover");
				}))
			);
			row.appendChild(cell);
		},
		show: function(elem, object){
			if(object.constructor == GanttTaskControl){
				arrayUtil.forEach(this.arrTabs, function(tab){
					if(tab.type == "t"){
						tab.object = object;
						this.addItemMenuPanel(tab);
					}
				}, this);
			}else if(object.constructor == GanttProjectControl){
				arrayUtil.forEach(this.arrTabs, function(tab){
					if(tab.type == "p"){
						tab.object = object;
						this.addItemMenuPanel(tab);
					}
				}, this);
			}
			this.isShow = true;
			domStyle.set(this.menuPanel, {
				zIndex: 15,
				visibility: "visible"
			});
			//make sure menu box inside gantt's bounding box
			var menuBox = domGeometry.position(this.menuPanel, true),
				bBox = domGeometry.position(this.ganttChart.content, true),
				pos = domGeometry.position(elem, true);
			if((pos.y + menuBox.h) > (bBox.y + bBox.h + 50)){
				this.menuPanel.style.top = pos.y - menuBox.h + pos.h + "px";
			}else{
				this.menuPanel.style.top = pos.y + "px";
			}
			if(domGeometry.isBodyLtr()){
				this.menuPanel.style.left = pos.x + pos.w + 5 + "px";
			}else{
				this.menuPanel.style.left = pos.x - menuBox.w - 5 + "px";
			}
		},
		hide: function(){
			this.isShow = false;
			this.menuPanel.style.visibility = "hidden";
		},
		clear: function(){
			this.menuPanel.removeChild(this.menuPanel.firstChild);
			this.menuPanel.innerHTML = "<table></table>";
			domClass.add(this.menuPanel.firstChild, "ganttContextMenu");
			this.menuPanel.firstChild.cellPadding = 0;
			this.menuPanel.firstChild.cellSpacing = 0;
		},
		createTab: function(id, desc, type, showOInfo, menu, withDefaultValue){
			var tab = new contextMenuTab(id, desc, type, showOInfo, menu, withDefaultValue);
			this.arrTabs.push(tab);
			return tab;
		}
	});	
});
