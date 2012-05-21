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
	dojo.declare("dojox.gantt.TabMenu", null, {
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
			this.menuPanel = dojo.create("div", {
				innerHTML: "<table></table>",
				className: "ganttMenuPanel"
			}, this.ganttChart.content);
			dojo.addClass(this.menuPanel.firstChild, "ganttContextMenu");
			this.menuPanel.firstChild.cellPadding = 0;
			this.menuPanel.firstChild.cellSpacing = 0;
		},
		createTabPanel: function(){
			this.tabPanelDlg = dijit.byId(this.tabPanelDlgId) ||
				new dijit.Dialog({
					title: "Settings"
				});
			this.tabPanelDlgId = this.tabPanelDlg.id;
			this.tabPanelDlg.closeButtonNode.style.display = "none";
			var tabPanel = this.tabPanelDlg.containerNode;
			this.paneContentArea = dojo.create("div", {className: "dijitDialogPaneContentArea"}, tabPanel);
			this.paneActionBar = dojo.create("div", {className: "dijitDialogPaneActionBar"}, tabPanel);
			this.paneContentArea.innerHTML = "<table cellpadding=0 cellspacing=0><tr><th></th></tr><tr><td></td></tr></table>";
			var headerCell = this.paneContentArea.firstChild.rows[0].cells[0];
			headerCell.colSpan = 2;
			headerCell.innerHTML = "Description: ";
			dojo.addClass(headerCell, "ganttDialogContentHeader");
			var contentCell = this.paneContentArea.firstChild.rows[1].cells[0];
			contentCell.innerHTML = "<table></table>";
			dojo.addClass(contentCell.firstChild, "ganttDialogContentCell");
			contentCell.align = "center";
			this.ok = new dijit.form.Button({label: "OK"});
			this.cancel = new dijit.form.Button({label: "Cancel"});
			this.paneActionBar.appendChild(this.ok.domNode);
			this.paneActionBar.appendChild(this.cancel.domNode);
		},
		addItemMenuPanel: function(tab){
			var row = this.menuPanel.firstChild.insertRow(this.menuPanel.firstChild.rows.length);
			var cell = dojo.create("td", {
				className: "ganttContextMenuItem",
				innerHTML: tab.Description
			});
			dojo.attr(cell, "tabIndex", 0);
			this.ganttChart._events.push(
				dojo.connect(cell, "onclick", this, function(){
					try{
						this.hide();
						tab.show();
					}catch(e){
						console.log("dialog open exception: " + e.message);
					}
				})
			);
			this.ganttChart._events.push(
				dojo.connect(cell, "onkeydown", this, function(e){
					if(e.keyCode != dojo.keys.ENTER){return;}
					try{
						this.hide();
						tab.show();
					}catch(e){
						console.log("dialog open exception: " + e.message);
					}
				})
			);
			this.ganttChart._events.push(
				dojo.connect(cell, "onmouseover", this, function(){
					dojo.addClass(cell, "ganttContextMenuItemHover");
				})
			);
			this.ganttChart._events.push(
				dojo.connect(cell, "onmouseout", this, function(){
					dojo.removeClass(cell, "ganttContextMenuItemHover");
				})
			);
			row.appendChild(cell);
		},
		show: function(elem, object){
			if(object.constructor == dojox.gantt.GanttTaskControl){
				dojo.forEach(this.arrTabs, function(tab){
					if(tab.type == "t"){
						tab.object = object;
						this.addItemMenuPanel(tab);
					}
				}, this);
			}else if(object.constructor == dojox.gantt.GanttProjectControl){
				dojo.forEach(this.arrTabs, function(tab){
					if(tab.type == "p"){
						tab.object = object;
						this.addItemMenuPanel(tab);
					}
				}, this);
			}
			this.isShow = true;
			dojo.style(this.menuPanel, {
				zIndex: 15,
				visibility: "visible"
			});
			//make sure menu box inside gantt's bounding box
			var menuBox = dojo.position(this.menuPanel, true),
				bBox = dojo.position(this.ganttChart.content, true),
				pos = dojo.coords(elem, true);
			if((pos.y + menuBox.h) > (bBox.y + bBox.h + 50)){
				this.menuPanel.style.top = pos.y - menuBox.h + pos.h + "px";
			}else{
				this.menuPanel.style.top = pos.y + "px";
			}
			if(dojo._isBodyLtr()){
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
			dojo.addClass(this.menuPanel.firstChild, "ganttContextMenu");
			this.menuPanel.firstChild.cellPadding = 0;
			this.menuPanel.firstChild.cellSpacing = 0;
		},
		createTab: function(id, desc, type, showOInfo, menu, withDefaultValue){
			var tab = new dojox.gantt.contextMenuTab(id, desc, type, showOInfo, menu, withDefaultValue);
			this.arrTabs.push(tab);
			return tab;
		}
	});
	
	dojo.declare("dojox.gantt.contextMenuTab", null, {
		constructor: function(id, description, type, showOInfo, tabMenu, withDefaultValue){
			this.id = id;
			this.arrItems = [];
			this.TabItemContainer = null;
			this.Description = description;
			this.tabMenu = tabMenu;
			this.type = type;
			this.object = null;
			this.showObjectInfo = showOInfo;
			this.withDefaultValue = withDefaultValue;
		},
		preValueValidation: function(items){
			for(var i = 0; i < items.length; i++){
				var item = items[i];
				//TODO add more validation for Id, Name, .....
				if(item.required && !item.control.textbox.value){
					return false;
				}
			}
			return true;
		},
		encodeDate: function(date){
			return date.getFullYear() + "." + (date.getMonth() + 1) + "." + date.getDate();
		},
		decodeDate: function(dateStr){
			var arr = dateStr.split(".");
			return (arr.length < 3) ? "" : (new Date(arr[0], parseInt(arr[1]) - 1, arr[2]));
		},
		renameTaskAction: function(){
			var name = this.arrItems[0].control.textbox.value;
			if(dojo.trim(name).length <= 0){
				return;
			}
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			this.object.setName(name);
			this.hide();
		},
		deleteAction: function(){
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			this.object.project.deleteTask(this.object.taskItem.id);
			this.hide();
			this.tabMenu.ganttChart.resource && this.tabMenu.ganttChart.resource.reConstruct();
		},
		durationUpdateAction: function(){
			var d = this.arrItems[0].control.textbox.value;
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			if(this.object.setDuration(d)){
				this.hide();
			}else{
				alert("Duration out of Range");
				return;
			}
			this.tabMenu.ganttChart.resource && this.tabMenu.ganttChart.resource.refresh();
		},
		cpUpdateAction: function(){
			var p = this.arrItems[0].control.textbox.value;
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			if(this.object.setPercentCompleted(p)){
				this.hide();
			}else{
				alert("Complete Percentage out of Range");
				return;
			}
		},
		ownerUpdateAction: function(){
			var to = this.arrItems[0].control.textbox.value;
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			if(this.object.setTaskOwner(to)){
				this.hide();
			}else{
				alert("Task owner not Valid");
				return;
			}
			this.tabMenu.ganttChart.resource && this.tabMenu.ganttChart.resource.reConstruct();
		},
		ptUpdateAction: function(){
			var p = this.arrItems[0].control.textbox.value;
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			if(this.object.setPreviousTask(p)){
				this.hide();
			}else{
				alert("Please verify the Previous Task (" + p + ")  and adjust its Time Range");
				return;
			}
		},
		renameProjectAction: function(){
			var name = this.arrItems[0].control.textbox.value;
			if(dojo.trim(name).length <= 0){
				return;
			}
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			this.object.setName(name);
			this.hide();
		},
		deleteProjectAction: function(){
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			this.object.ganttChart.deleteProject(this.object.project.id);
			this.hide();
			this.tabMenu.ganttChart.resource && this.tabMenu.ganttChart.resource.reConstruct();
		},
		cpProjectAction: function(){
			var p = this.arrItems[0].control.textbox.value;
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			if(this.object.setPercentCompleted(p)){
				this.hide();
			}else{
				alert("Percentage not Acceptable");
				return;
			}
		},
		addTaskAction: function(){
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			var id = this.arrItems[0].control.textbox.value,
				name = this.arrItems[1].control.textbox.value,
				startTime = this.decodeDate(this.arrItems[2].control.textbox.value),
				duration = this.arrItems[3].control.textbox.value,
				pc = this.arrItems[4].control.textbox.value,
				owner = this.arrItems[5].control.textbox.value,
				parentTaskId = this.arrItems[6].control.textbox.value,
				predTaskId = this.arrItems[7].control.textbox.value;
			if(dojo.trim(id).length <= 0){
				return;
			}
			if(this.object.insertTask(id, name, startTime, duration, pc, predTaskId, owner, parentTaskId)){
				this.hide();
			}else{
				alert("Please adjust your Customization");
				return;
			}
			this.tabMenu.ganttChart.resource && this.tabMenu.ganttChart.resource.reConstruct();
		},
		addSuccessorTaskAction: function(){
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			var pr = this.object.project,
				id = this.arrItems[0].control.textbox.value,
				name = this.arrItems[1].control.textbox.value,
				startTime = this.decodeDate(this.arrItems[2].control.textbox.value),
				duration = this.arrItems[3].control.textbox.value,
				pc = this.arrItems[4].control.textbox.value,
				owner = this.arrItems[5].control.textbox.value;
			if(dojo.trim(id).length <= 0){
				return;
			}
			var parentTaskId = !this.object.parentTask ? "" : this.object.parentTask.taskItem.id;
			var predTaskId = this.object.taskItem.id;
			if(pr.insertTask(id, name, startTime, duration, pc, predTaskId, owner, parentTaskId)){
				this.hide();
			}else{
				alert("Please adjust your Customization");
				return;
			}
			this.tabMenu.ganttChart.resource && this.tabMenu.ganttChart.resource.reConstruct();
		},
		addChildTaskAction: function(){
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			var pr = this.object.project,
				id = this.arrItems[0].control.textbox.value,
				name = this.arrItems[1].control.textbox.value,
				startTime = this.decodeDate(this.arrItems[2].control.textbox.value),
				duration = this.arrItems[3].control.textbox.value,
				pc = this.arrItems[4].control.textbox.value,
				owner = this.arrItems[5].control.textbox.value,
				parentTaskId = this.object.taskItem.id,
				predTaskId = "";
			if(dojo.trim(id).length <= 0){
				return;
			}
			if(pr.insertTask(id, name, startTime, duration, pc, predTaskId, owner, parentTaskId)){
				this.hide();
			}else{
				alert("Please adjust your Customization");
				return;
			}
			this.tabMenu.ganttChart.resource && this.tabMenu.ganttChart.resource.reConstruct();
		},
		addProjectAction: function(){
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			var id = this.arrItems[0].control.textbox.value,
			namePr = this.arrItems[1].control.textbox.value,
			startDatePr = this.decodeDate(this.arrItems[2].control.textbox.value);
			if(dojo.trim(id).length <= 0 || dojo.trim(namePr).length <= 0){
				return;
			}
			if(this.tabMenu.ganttChart.insertProject(id, namePr, startDatePr)){
				this.hide();
			}else{
				alert("Please adjust your Customization");
				return;
			}
			this.tabMenu.ganttChart.resource && this.tabMenu.ganttChart.resource.reConstruct();
		},
		
		addAction: function(handler){
			this.actionFunc = this[handler];
		},
		addItem: function(id, name, key, required){
			var inputControl;
			if(key == "startTime" || key == "startDate"){
				inputControl = new dijit.form.DateTextBox({type:"text", constraints:{datePattern:"yyyy.M.d", strict:true}});
			}else if(key == "percentage"){
				inputControl = new dijit.form.NumberSpinner({ constraints:{ max:100, min:0 }});
			}else if(key == "duration"){
				inputControl = new dijit.form.NumberSpinner({ constraints:{ min:0 }});
			}else{
				inputControl = new dijit.form.TextBox();
			}
			this.arrItems.push({
				id: id,
				name: name,
				control: inputControl,
				tab: this,
				key: key,
				required: required
			});
		},
		show: function(){
			this.tabMenu.tabPanelDlg = this.tabMenu.tabPanelDlg || dijit.byId(this.tabMenu.tabPanelDlgId) ||
				new dijit.Dialog({
					title: "Settings"
				});
			try{
				this.tabMenu.tabPanelDlg.show();
			}catch(e){
				console.log("dialog show exception: " + e.message);
				return;
			}
			this.tabMenu.tabPanelDlg.titleNode.innerHTML = this.Description;
			var content = this.tabMenu.paneContentArea.firstChild.rows[1].cells[0].firstChild,
				action = this.tabMenu.paneActionBar;
			var cell, cellValue, row = null;
			
			if(this.showObjectInfo){
				if(this.object){
					if(this.object.constructor == dojox.gantt.GanttTaskControl){
						this.insertData(content, "Id", this.object.taskItem.id);
						this.insertData(content, "Name", this.object.taskItem.name);
						this.insertData(content, "Start Time", this.encodeDate(this.object.taskItem.startTime));
						this.insertData(content, "Duration (hours)", this.object.taskItem.duration + " hours");
						this.insertData(content, "Percent Complete (%)", this.object.taskItem.percentage + "%");
						this.insertData(content, "Task Assignee", this.object.taskItem.taskOwner);
						this.insertData(content, "Previous Task Id", this.object.taskItem.previousTaskId);
					}else{
						this.insertData(content, "Id", this.object.project.id);
						this.insertData(content, "Name", this.object.project.name);
						this.insertData(content, "Start date", this.encodeDate(this.object.project.startDate));
					}
				}
			}
			//separator
			row = content.insertRow(content.rows.length);
			cell = row.insertCell(row.cells.length);
			cell.colSpan = 2;
			cell.innerHTML = "<hr/>";
			//input section header
			row = content.insertRow(content.rows.length);
			cell = row.insertCell(row.cells.length);
			cell.colSpan = 2;
			dojo.addClass(cell, "ganttMenuDialogInputCellHeader");
			cell.innerHTML = "Customization: " + this.Description;
			//input details
			dojo.forEach(this.arrItems, function(item){
				row = content.insertRow(content.rows.length);
				cell = row.insertCell(row.cells.length);
				dojo.addClass(cell, "ganttMenuDialogInputCell");
				cellValue = row.insertCell(row.cells.length);
				dojo.addClass(cellValue, "ganttMenuDialogInputCellValue");
				cell.innerHTML = item.name;
				cellValue.appendChild(item.control.domNode);
				//initialize default value
				if(this.withDefaultValue && this.object){
					if(this.object.constructor == dojox.gantt.GanttTaskControl){
						if(item.key == "startTime"){
							item.control.textbox.value = this.encodeDate(this.object.taskItem.startTime);
						}else{
							item.control.textbox.value = item.key ? this.object.taskItem[item.key] : "";
						}
					}else{
						if(item.key == "startDate"){
							item.control.textbox.value = this.encodeDate(this.object.project.startDate);
						}else{
							item.control.textbox.value = item.key ? (this.object.project[item.key] || this.object[item.key] || "") : "";
						}
					}
				}else{
					//HTML5 placeholder property
					item.control.textbox.placeholder = item.required ? "---required---" : "---optional---";
				}
			}, this);
			this.tabMenu.ok.onClick = dojo.hitch(this, this.actionFunc);
			this.tabMenu.cancel.onClick = dojo.hitch(this, this.hide);
		},
		hide: function(){
			try{
				this.tabMenu.tabPanelDlg.hide();
			}catch(e){
				console.log("dialog show exception: " + e.message);
				this.tabMenu.tabPanelDlg.destroy();
			}
			var cell = this.tabMenu.paneContentArea.firstChild.rows[1].cells[0];
			cell.firstChild.parentNode.removeChild(cell.firstChild);
			cell.innerHTML = "<table></table>";
			dojo.addClass(cell.firstChild, "ganttDialogContentCell");
		},
		insertData: function(content, name, value){
			var cell, cellValue, row = null;
			row = content.insertRow(content.rows.length);
			cell = row.insertCell(row.cells.length);
			dojo.addClass(cell, "ganttMenuDialogDescCell");
			cell.innerHTML = name;
			cellValue = row.insertCell(row.cells.length);
			dojo.addClass(cellValue, "ganttMenuDialogDescCellValue");
			cellValue.innerHTML = value;
		}
	});
})();
