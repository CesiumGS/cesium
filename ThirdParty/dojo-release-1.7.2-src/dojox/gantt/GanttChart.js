dojo.provide("dojox.gantt.GanttChart");

dojo.require("dijit.Tooltip");
dojo.require("dojox.gantt.GanttProjectItem");
dojo.require("dojox.gantt.GanttResourceItem");
dojo.require("dojox.gantt.TabMenu");
dojo.require("dojo.date.locale");

(function(){
	dojo.declare("dojox.gantt.GanttChart", null, {
		constructor: function(configuration, node){
			this.resourceChartHeight = configuration.resourceChartHeight !== undefined ? configuration.resourceChartHeight : false;
			this.withResource = configuration.withResource !== undefined ? configuration.withResource : true;
			this.correctError = configuration.autoCorrectError !== undefined ? configuration.autoCorrectError : false;
			this.isShowConMenu = this.isContentEditable = !configuration.readOnly;
			this.withTaskId = configuration.withTaskId !== undefined ? configuration.withTaskId : !configuration.readOnly;
			this.animation = configuration.animation !== undefined ? configuration.animation : true;
			this.saveProgramPath = configuration.saveProgramPath  || "saveGanttData.php";
			this.dataFilePath = configuration.dataFilePath  || "gantt_default.json";
			this.contentHeight = configuration.height || 400;
			this.contentWidth = configuration.width || 600;
			this.content = dojo.byId(node);
			this.scrollBarWidth = 18;
			this.panelTimeHeight = 102;
			this.maxWidthPanelNames = 150;
			this.maxWidthTaskNames = 150;
			this.minWorkLength = 8;
			this.heightTaskItem = 12;
			this.heightTaskItemExtra = 11;
			this.pixelsPerDay = 24;//px
			this.hsPerDay = 8;
			this.pixelsPerWorkHour = this.pixelsPerDay / this.hsPerDay;//px
			this.pixelsPerHour = this.pixelsPerDay / 24;//px
			this.countDays = 0;
			this.totalDays = 0;
			this.startDate = null;
			this.initialPos = 0;
			
			this.contentDataHeight = 0;
			this.panelTimeExpandDelta = 20;
			
			this.divTimeInfo = null;
			this.panelNames = null;
			this.panelTime = null;
			this.contentData = null;
			this.tabMenu = null;
			
			this.project = [];
			this.arrProjects = [];
			
			this.xmlLoader = null;
			this.isMoving = false;
			this.isResizing = false;
			this.animationNodes = [];
			this.scale = 1;
			this.tempDayInPixels = 0;
			this.resource = null;
			this.months = dojo.date.locale.getNames("months", "wide");
			this._events = [];
		},
		getProject: function(id){
			return dojo.filter(this.arrProjects, function(proj){
				return proj.project.id == id;
			}, this)[0];
		},
		checkPosPreviousTask: function(predTask, task){
			var widthPred = this.getWidthOnDuration(predTask.duration);
			var posPred = this.getPosOnDate(predTask.startTime);
			var posChild = this.getPosOnDate(task.startTime);
			if((widthPred + posPred) > posChild){
				return false;
			}
			return true;
		},
		correctPosPreviousTask: function(predTask, ctask, ctaskObj){
			var newDate = new Date(predTask.startTime);
			newDate.setHours(newDate.getHours() + (predTask.duration / this.hsPerDay * 24))
			if(newDate.getHours() > 0){
				newDate.setHours(0);
				newDate.setDate(newDate.getDate() + 1);
			}
			ctaskObj ? (ctaskObj.setStartTime(newDate, true)) : (ctask.startTime = newDate);
			if(ctask.parentTask){
				if(!this.checkPosParentTask(ctask.parentTask, ctask)){
					var newDate2 = new Date(ctask.parentTask.startTime);
					newDate2.setHours(newDate2.getHours() + (ctask.parentTask.duration / this.hsPerDay * 24))
					ctask.duration = parseInt((parseInt((newDate2 - ctask.startTime) / (1000 * 60 * 60))) * this.hsPerDay / 24);
				}
			}
		},
		correctPosParentTask: function(parentTask, ctask){
			if(!ctask.previousTask){
				if(parentTask.startTime > ctask.startTime){
					ctask.startTime = new Date(parentTask.startTime);
				}
				if(!this.checkPosParentTask(parentTask, ctask)){
					ctask.duration = parentTask.duration;
				}
			}else{
				this.correctPosPreviousTask(ctask.previousTask, ctask);
			}
		},
		checkPosParentTaskInTree: function(parentTask){
			var exception = false;
			for(var i = 0; i < parentTask.cldTasks.length; i++){
				var pcTask = parentTask.cldTasks[i];
				if(!this.checkPosParentTask(parentTask, pcTask)){
					if(!this.correctError){
						return true;
					}else{
						this.correctPosParentTask(parentTask, pcTask);
					}
				}
				if(parentTask.startTime > pcTask.startTime){
					if(!this.correctError){
						return true;
					}else{
						this.correctPosParentTask(parentTask, pcTask);
					}
				}
				if(pcTask.cldTasks.length > 0){
					exception = this.checkPosParentTaskInTree(pcTask);
				}
			}
			return exception;
		},
		setPreviousTask: function(project){
			var exception = false;
			for(var i = 0; i < project.parentTasks.length; i++){
				var ppTask = project.parentTasks[i];
				if(ppTask.previousTaskId){
					ppTask.previousTask = project.getTaskById(ppTask.previousTaskId);
					if(!ppTask.previousTask){
						if(!this.correctError){
							return true;
						}
					}
					ppTask.previousTask.cldPreTasks.push(ppTask);
				}
				if(ppTask.previousTask){
					if(!this.checkPosPreviousTask(ppTask.previousTask, ppTask)){
						if(!this.correctError){
							return true;
						}else{
							this.correctPosPreviousTask(ppTask.previousTask, ppTask);
						}
					}
				}
				exception = this.setPreviousTaskInTree(ppTask);
			}
			return exception;
		},
		setPreviousTaskInTree: function(parentTask){
			var exception = false;
			for(var i = 0; i < parentTask.cldTasks.length; i++){
				var pcTask = parentTask.cldTasks[i];
				if(pcTask.previousTaskId){
					pcTask.previousTask = parentTask.project.getTaskById(pcTask.previousTaskId);
					if(!pcTask.previousTask){
						if(!this.correctError){
							return true;
						}
					}
					if(!this.checkPosPreviousTask(pcTask.previousTask, pcTask)){
						if(!this.correctError){
							return true;
						}else{
							this.correctPosPreviousTask(pcTask.previousTask, pcTask);
						}
					}
					pcTask.previousTask.cldPreTasks.push(pcTask);
				}
				
				if(pcTask.cldTasks.length > 0){
					exception = this.setPreviousTaskInTree(pcTask);
				}
			}
			return exception;
		},
		checkPosParentTask: function(parentTask, task){
			var widthParent = this.getWidthOnDuration(parentTask.duration);
			var posParent = this.getPosOnDate(parentTask.startTime);
			var posChild = this.getPosOnDate(task.startTime);
			var widthChild = this.getWidthOnDuration(task.duration);
			return (widthParent + posParent) >= (posChild + widthChild);
		},
		addProject: function(projectItem){
			this.project.push(projectItem);
		},
		deleteProject: function(id){
			var project = this.getProject(id);
			if(project){
				if(project.arrTasks.length > 0){
					while(project.arrTasks.length > 0){
						project.deleteChildTask(project.arrTasks[0]);
					}
				}
				var rowHeight = this.heightTaskItemExtra + this.heightTaskItem;
				project.nextProject && project.shiftNextProject(project, -rowHeight); //rowHeight: 23
				this.project = dojo.filter(this.project, function(proj){
					return proj.id != project.project.id;
				}, this);
				if((project.previousProject) && (project.nextProject)){
					var previousProject = project.previousProject;
					previousProject.nextProject = project.nextProject;
				}
				if((project.previousProject) && !(project.nextProject)){
					var previousProject = project.previousProject;
					previousProject.nextProject = null;
				}
				if(!(project.previousProject) && (project.nextProject)){
					var nextProject = project.nextProject;
					nextProject.previousProject = null;
				}
				for(var i = 0; i < this.arrProjects.length; i++){
					if(this.arrProjects[i].project.id == id){
						this.arrProjects.splice(i, 1);
					}
				}
				project.projectItem[0].parentNode.removeChild(project.projectItem[0]);
				project.descrProject.parentNode.removeChild(project.descrProject);
				project.projectNameItem.parentNode.removeChild(project.projectNameItem);
				this.contentDataHeight -= this.heightTaskItemExtra + this.heightTaskItem;
				if(this.project.length == 0){
					var d = new Date(this.startDate);
					var t = new Date(d.setDate(d.getDate() + 1));
					var pi = new dojox.gantt.GanttProjectItem({
						id: 1,
						name: "New Project",
						startDate: t
					});
					this.project.push(pi);
					var project = new dojox.gantt.GanttProjectControl(this, pi);
					project.create();
					this.arrProjects.push(project);
					this.contentDataHeight += this.heightTaskItemExtra + this.heightTaskItem;
				}
				this.checkPosition();
			}
		},
		insertProject: function(id, name, startDate){
			if(this.startDate >= startDate){
				return false;
			}
			if(this.getProject(id)){
				return false;
			}
			this.checkHeighPanelTasks();
			var project = new dojox.gantt.GanttProjectItem({
				id: id,
				name: name,
				startDate: startDate
			});
			this.project.push(project);
			var _project = new dojox.gantt.GanttProjectControl(this, project);
			for(var i = 0; i < this.arrProjects.length; i++){
				var curProject = this.arrProjects[i],
					preProject = this.arrProjects[i-1],
					nextProject = this.arrProjects[i+1];
				if(startDate < curProject.project.startDate){
					this.arrProjects.splice(i, 0, _project);
					if(i > 0){
						_project.previousProject = preProject;
						preProject.nextProject = _project;
					}
					if(i + 1 <= this.arrProjects.length){
						_project.nextProject = nextProject;
						nextProject.previousProject = _project;
						var rowHeight = this.heightTaskItem + this.heightTaskItemExtra;
						_project.shiftNextProject(_project, rowHeight);
					}
					_project.create();
					_project.hideDescrProject();
					this.checkPosition();
					return _project;
				}
			}
			if(this.arrProjects.length > 0){
				this.arrProjects[this.arrProjects.length - 1].nextProject = _project;
				_project.previousProject = this.arrProjects[this.arrProjects.length - 1];
			}
			this.arrProjects.push(_project);
			_project.create();
			_project.hideDescrProject();
			this.checkPosition();
			return _project;
		},
		openTree: function(parentTask){
			var lastParentTask = this.getLastCloseParent(parentTask);
			this.openNode(lastParentTask);
			parentTask.taskItem.id != lastParentTask.taskItem.id && this.openTree(parentTask);
		},
		openNode: function(parentTask){
			if(!parentTask.isExpanded){
				dojo.removeClass(parentTask.cTaskNameItem[2], "ganttImageTreeExpand");
				dojo.addClass(parentTask.cTaskNameItem[2], "ganttImageTreeCollapse");
				parentTask.isExpanded = true;
				parentTask.shiftCurrentTasks(parentTask, parentTask.hideTasksHeight);
				parentTask.showChildTasks(parentTask, parentTask.isExpanded);
				parentTask.hideTasksHeight = 0;
			}
		},
		getLastCloseParent: function(task){
			if(task.parentTask){
				if((!task.parentTask.isExpanded) ||
				(task.parentTask.cTaskNameItem[2].style.display == "none")){
					return this.getLastCloseParent(task.parentTask);
				}else{
					return task;
				}
			}else{
				return task;
			}
		},
		getProjectItemById: function(id){
			return dojo.filter(this.project, function(proj){
				return proj.id == id;
			}, this)[0];
		},
		clearAll: function(){
			this.contentDataHeight = 0;
			this.startDate = null;
			this.clearData();
			this.clearItems();
			this.clearEvents();
		},
		clearEvents: function(){
			dojo.forEach(this._events, dojo.disconnect);
			this._events = [];
		},
		clearData: function(){
			this.project = [];
			this.arrProjects = [];
		},
		clearItems: function(){
			this.contentData.removeChild(this.contentData.firstChild);
			this.contentData.appendChild(this.createPanelTasks());
			this.panelNames.removeChild(this.panelNames.firstChild);
			this.panelNames.appendChild(this.createPanelNamesTasks());
			this.panelTime.removeChild(this.panelTime.firstChild);
		},
		buildUIContent: function(){
			this.project.sort(this.sortProjStartDate);
			this.startDate = this.getStartDate();
			this.panelTime.appendChild(this.createPanelTime());
			for(var i = 0; i < this.project.length; i++){
				var proj = this.project[i];
				for(var k = 0; k < proj.parentTasks.length; k++){
					var ppTask = proj.parentTasks[k];
					if(ppTask.startTime){
						this.setStartTimeChild(ppTask);
					}else{
						return;
					}
					if(this.setPreviousTask(proj)){
						return;
					}
				}
				for(var k = 0; k < proj.parentTasks.length; k++){
					var ppTask = proj.parentTasks[k];
					if(ppTask.startTime < proj.startDate){
						return;
					}
					if(this.checkPosParentTaskInTree(ppTask)) return;
				}
				this.sortTasksByStartTime(proj);
			}
			
			for(var i = 0; i < this.project.length; i++){
				var proj = this.project[i];
				var project = new dojox.gantt.GanttProjectControl(this, proj);
				if(this.arrProjects.length > 0){
					var previousProject = this.arrProjects[this.arrProjects.length - 1];
					project.previousProject = previousProject;
					previousProject.nextProject = project;
				}
				project.create();
				this.checkHeighPanelTasks();
				this.arrProjects.push(project);
				this.createTasks(project);
			}
			this.resource && this.resource.reConstruct();
			this.postLoadData();
			this.postBindEvents();
		},
		loadJSONData: function(filename){
			var _this = this;
			_this.dataFilePath = filename || _this.dataFilePath;
			dojo.xhrGet({
				url: _this.dataFilePath,
				sync: true,
				load: function(text, ioArgs){
					_this.loadJSONString(text);
					_this.buildUIContent();
					alert("Successfully! Loaded data from: " + _this.dataFilePath);
				},
				error: function(err, ioArgs){
					alert("Failed! Load error: " + _this.dataFilePath);
				}
			});
		},
		loadJSONString: function(content){
			//load data
			if(!content){ return; }
			this.clearAll();
			var jsonObj = dojo.fromJson(content);
			
			var items = jsonObj.items;
			dojo.forEach(items, function(pItem){
				var startDate = pItem.startdate.split("-");
				var project = new dojox.gantt.GanttProjectItem({
					id: pItem.id,
					name: pItem.name,
					startDate: new Date(startDate[0], (parseInt(startDate[1]) - 1), startDate[2])
				});
				var tItems = pItem.tasks;
				dojo.forEach(tItems, function(tItem){
					var id = tItem.id,
						name = tItem.name,
						starttime = tItem.starttime.split("-");
						duration = tItem.duration,
						percentage = tItem.percentage,
						previousTaskId = tItem.previousTaskId,
						taskOwner = tItem.taskOwner;
					
					var task = new dojox.gantt.GanttTaskItem({
						id: id,
						name: name,
						startTime: new Date(starttime[0], (parseInt(starttime[1]) - 1), starttime[2]),
						duration: duration,
						percentage: percentage,
						previousTaskId: previousTaskId,
						taskOwner: taskOwner
					});
					var ctItems = tItem.children;
					if(ctItems.length != 0){
						this.buildChildTasksData(task, ctItems);
					}
					project.addTask(task);
				}, this);
				this.addProject(project);
			 }, this);
		},
		buildChildTasksData: function(parentTask, childTaskItems){
			childTaskItems && dojo.forEach(childTaskItems, function(ctItem){
				var id = ctItem.id,
					name = ctItem.name,
					starttime = ctItem.starttime.split("-"),
					duration = ctItem.duration,
					percentage = ctItem.percentage,
					previousTaskId = ctItem.previousTaskId,
					taskOwner = ctItem.taskOwner;
				
				var task = new dojox.gantt.GanttTaskItem({
					id: id,
					name: name,
					startTime: new Date(starttime[0], (parseInt(starttime[1]) - 1), starttime[2]),
					duration: duration,
					percentage: percentage,
					previousTaskId: previousTaskId,
					taskOwner: taskOwner
				});
				task.parentTask = parentTask;
				parentTask.addChildTask(task);
				
				var ctItems = ctItem.children;
				if(ctItems.length != 0){
					this.buildChildTasksData(task, ctItems);
				}
			}, this);
		},
		getJSONData: function(){
			var jsonObj = {identifier: 'id', items: []};
			dojo.forEach(this.project, function(proj){
				var project = {
					id: proj.id,
					name: proj.name,
					startdate: proj.startDate.getFullYear() + '-' + (proj.startDate.getMonth() + 1) + '-' + proj.startDate.getDate(),
					tasks: []
				};
				jsonObj.items.push(project);
				dojo.forEach(proj.parentTasks, function(pTask){
					var task = {
						id: pTask.id,
						name: pTask.name,
						starttime: pTask.startTime.getFullYear() + '-' + (pTask.startTime.getMonth() + 1) + '-' + pTask.startTime.getDate(),
						duration: pTask.duration,
						percentage: pTask.percentage,
						previousTaskId: (pTask.previousTaskId || ''),
						taskOwner: (pTask.taskOwner || ''),
						children: this.getChildTasksData(pTask.cldTasks)
					};
					project.tasks.push(task);
				}, this);
			}, this);
			return jsonObj;
		},
		getChildTasksData: function(childTasks){
			var cTaskObj = [];
			childTasks && childTasks.length > 0 && dojo.forEach(childTasks, function(childTask){
				var ctask = {
					id: childTask.id,
					name: childTask.name,
					starttime: childTask.startTime.getFullYear() + '-' + (childTask.startTime.getMonth() + 1) + '-' + childTask.startTime.getDate(),
					duration: childTask.duration,
					percentage: childTask.percentage,
					previousTaskId: (childTask.previousTaskId || ''),
					taskOwner: (childTask.taskOwner || ''),
					children: this.getChildTasksData(childTask.cldTasks)
				};
				cTaskObj.push(ctask);
			}, this);
			return cTaskObj;
		},
		saveJSONData: function(fileName){
			var _this = this;
			_this.dataFilePath = (fileName && dojo.trim(fileName).length > 0) ? fileName : this.dataFilePath;
			try {
				var td = dojo.xhrPost({
					url: _this.saveProgramPath,
					content: {filename: _this.dataFilePath, data: dojo.toJson(_this.getJSONData())},
					handle: function(res, ioArgs){
						if((dojo._isDocumentOk(ioArgs.xhr))||
							(ioArgs.xhr.status == 405)
						){
							alert("Successfully! Saved data to " + _this.dataFilePath);
						}else{
							alert("Failed! Saved error");
						}
					}
				});
			} catch (e){
				alert("exception: " + e.message);
			}
		},
		sortTaskStartTime: function(a, b){
			return a.startTime < b.startTime ? -1 : (a.startTime > b.startTime ? 1 : 0);
		},
		sortProjStartDate: function(a, b){
			return a.startDate < b.startDate ? -1 : (a.startDate > b.startDate ? 1 : 0);
		},
		setStartTimeChild: function(parentTask){
			dojo.forEach(parentTask.cldTasks, function(pcTask){
				if(!pcTask.startTime){
					pcTask.startTime = parentTask.startTime;
				}
				if(pcTask.cldTasks.length != 0){
					this.setStartTimeChild(pcTask);
				}
			}, this);
		},
		createPanelTasks: function(){
			var panelTask = dojo.create("div", {
				className: "ganttTaskPanel"
			});
			dojo.style(panelTask, {
				height: (this.contentHeight - this.panelTimeHeight - this.scrollBarWidth) + "px"
			});
			return panelTask;
		},
		refreshParams: function(pixelsPerDay){
			this.pixelsPerDay = pixelsPerDay;
			this.pixelsPerWorkHour = this.pixelsPerDay / this.hsPerDay;
			this.pixelsPerHour = this.pixelsPerDay / 24;
		},
		createPanelNamesTasksHeader: function(){
			var _this = this;
			var panelHeader = dojo.create("div", {className: "ganttPanelHeader"});
			var tblHeader = dojo.create("table", {
				cellPadding: "0px",
				border: "0px",
				cellSpacing: "0px",
				bgColor: "#FFFFFF",
				className: "ganttToolbar"
			}, panelHeader);
			var firstRow = tblHeader.insertRow(tblHeader.rows.length);
			var secondRow = tblHeader.insertRow(tblHeader.rows.length);
			var thirdRow = tblHeader.insertRow(tblHeader.rows.length);
			var forthRow = tblHeader.insertRow(tblHeader.rows.length);
			var zoomIn = dojo.create("td", {
				align: "center",
				vAlign: "middle",
				className: "ganttToolbarZoomIn"
			}, firstRow);
			var zoomInFn = dojo.hitch(this, function(){
				if(this.scale * 2 > 5){return;}
				this.scale = this.scale * 2;
				this.switchTeleMicroView(this.pixelsPerDay * this.scale);
			});
			dojo.disconnect(this.zoomInClickEvent);
			this.zoomInClickEvent = dojo.connect(zoomIn, "onclick", this, zoomInFn);
			//a11y support
			dojo.disconnect(this.zoomInKeyEvent);
			this.zoomInKeyEvent = dojo.connect(zoomIn, "onkeydown", this, function(e){
				if(e.keyCode != dojo.keys.ENTER){return;}
				zoomInFn();
			});
			dojo.attr(zoomIn, "tabIndex", 0);
			var zoomOut = dojo.create("td", {
				align: "center",
				vAlign: "middle",
				className: "ganttToolbarZoomOut"
			}, firstRow);
			var zoomOutFn = dojo.hitch(this, function(){
				if(this.scale * 0.5 < 0.2){return;}
				this.scale = this.scale * 0.5;
				this.switchTeleMicroView(this.pixelsPerDay * this.scale);
			});
			dojo.disconnect(this.zoomOutClickEvent);
			this.zoomOutClickEvent = dojo.connect(zoomOut, "onclick", this, zoomOutFn);
			//a11y support
			dojo.disconnect(this.zoomOutKeyEvent);
			this.zoomOutKeyEvent = dojo.connect(zoomOut, "onkeydown", this, function(e){
				if(e.keyCode != dojo.keys.ENTER){return;}
				zoomOutFn();
			});
			dojo.attr(zoomOut, "tabIndex", 0);
			var micro = dojo.create("td", {
				align: "center",
				vAlign: "middle",
				className: "ganttToolbarMicro"
			}, secondRow);
			dojo.disconnect(this.microClickEvent);
			this.microClickEvent = dojo.connect(micro, "onclick", this, dojo.hitch(this, this.refresh, this.animation?15:1, 0, 2));
			//a11y support
			dojo.disconnect(this.microKeyEvent);
			this.microKeyEvent = dojo.connect(micro, "onkeydown", this, function(e){
				if(e.keyCode != dojo.keys.ENTER){return;}
				micro.blur();
				this.refresh(this.animation?15:1, 0, 2);
			});
			dojo.attr(micro, "tabIndex", 0);
			var tele = dojo.create("td", {
				align: "center",
				vAlign: "middle",
				className: "ganttToolbarTele"
			}, secondRow);
			dojo.disconnect(this.teleClickEvent);
			this.teleClickEvent = dojo.connect(tele, "onclick", this, dojo.hitch(this, this.refresh, this.animation?15:1, 0, 0.5));
			//a11y support
			dojo.disconnect(this.teleKeyEvent);
			this.teleKeyEvent = dojo.connect(tele, "onkeydown", this, function(e){
				if(e.keyCode != dojo.keys.ENTER){return;}
				tele.blur();
				this.refresh(this.animation?15:1, 0, 0.5);
			});
			dojo.attr(tele, "tabIndex", 0);
			var save = dojo.create("td", {
				align: "center",
				vAlign: "middle",
				className: "ganttToolbarSave"
			}, thirdRow);
			dojo.disconnect(this.saveClickEvent);
			this.saveClickEvent = dojo.connect(save, "onclick", this, dojo.hitch(this, this.saveJSONData, ""));
			//a11y support
			dojo.disconnect(this.saveKeyEvent);
			this.saveKeyEvent = dojo.connect(save, "onkeydown", this, function(e){
				if(e.keyCode != dojo.keys.ENTER){return;}
				this.saveJSONData("");
			});
			dojo.attr(save, "tabIndex", 0);
			var load = dojo.create("td", {
				align: "center",
				vAlign: "middle",
				className: "ganttToolbarLoad"
			}, thirdRow);
			dojo.disconnect(this.loadClickEvent);
			this.loadClickEvent = dojo.connect(load, "onclick", this, dojo.hitch(this, this.loadJSONData, ""));
			//a11y support
			dojo.disconnect(this.loadKeyEvent);
			this.loadKeyEvent = dojo.connect(load, "onkeydown", this, function(e){
				if(e.keyCode != dojo.keys.ENTER){return;}
				this.loadJSONData("");
			});
			dojo.attr(load, "tabIndex", 0);
			//action popup description
			var actions = [zoomIn, zoomOut, micro, tele, save, load],
				titles = ["Enlarge timeline", "Shrink timeline", "Zoom in time zone(microscope view)", "Zoom out time zone(telescope view)",
							"Save gantt data to json file", "Load gantt data from json file"];
			dojo.forEach(actions, function(action, i){
				var title = titles[i];
				var tooltipShow = function(){
					dojo.addClass(action, "ganttToolbarActionHover");
					dijit.showTooltip(title, action, ["above", "below"]);
				};
				action.onmouseover = tooltipShow;
				//a11y support
				action.onfocus = tooltipShow;
				var tooltipHide = function(){
					dojo.removeClass(action, "ganttToolbarActionHover");
					action && dijit.hideTooltip(action);
				};
				action.onmouseout = tooltipHide;
				action.onblur = tooltipHide;
			}, this);
			return panelHeader;
		},
		createPanelNamesTasks: function(){
			var panelNameTask = dojo.create("div", {
				innerHTML: "&nbsp;",
				className: "ganttPanelNames"
			});
			dojo.style(panelNameTask, {
				height: (this.contentHeight - this.panelTimeHeight - this.scrollBarWidth) + "px",
				width: this.maxWidthPanelNames + "px"
			});
			return panelNameTask;
		},
		createPanelTime: function(){
			var panelTime = dojo.create("div", {className: "ganttPanelTime"});
			var tblTime = dojo.create("table", {
				cellPadding: "0px",
				border: "0px",
				cellSpacing: "0px",
				bgColor: "#FFFFFF",
				className: "ganttTblTime"
			}, panelTime);
			this.totalDays = this.countDays;
			//year
			var newYearRow = tblTime.insertRow(tblTime.rows.length), newYear = oldYear = new Date(this.startDate).getFullYear(), ycount = 0;
			for(var i = 0; i < this.countDays; i++, ycount++){
				var date = new Date(this.startDate);
				date.setDate(date.getDate() + i);
				newYear = date.getFullYear();
				if(newYear != oldYear){
					this.addYearInPanelTime(newYearRow, ycount, oldYear);
					ycount = 0;
					oldYear = newYear;
				}
			}
			this.addYearInPanelTime(newYearRow, ycount, newYear);
			dojo.style(newYearRow, "display", "none");
			//month
			var newMonthRow = tblTime.insertRow(tblTime.rows.length), newMonth = oldMonth = new Date(this.startDate).getMonth(), mcount = 0, lastYear = 1970;
			for(var i = 0; i < this.countDays; i++, mcount++){
				var date = new Date(this.startDate);
				date.setDate(date.getDate() + i);
				newMonth = date.getMonth();
				lastYear = date.getFullYear();
				if(newMonth != oldMonth){
					this.addMonthInPanelTime(newMonthRow, mcount, oldMonth, lastYear);
					mcount = 0;
					oldMonth = newMonth;
				}
			}
			this.addMonthInPanelTime(newMonthRow, mcount, newMonth, lastYear);
			//week
			var newWeekRow = tblTime.insertRow(tblTime.rows.length), newWeek = oldWeek = dojo.date.locale._getWeekOfYear(new Date(this.startDate)), mcount = 0;
			for(var i = 0; i < this.countDays; i++, mcount++){
				var date = new Date(this.startDate);
				date.setDate(date.getDate() + i);
				newWeek = dojo.date.locale._getWeekOfYear(date);
				if(newWeek != oldWeek){
					this.addWeekInPanelTime(newWeekRow, mcount, oldWeek);
					mcount = 0;
					oldWeek = newWeek;
				}
			}
			this.addWeekInPanelTime(newWeekRow, mcount, newWeek);
			//day
			var newDayRow = tblTime.insertRow(tblTime.rows.length);
			for(var i = 0; i < this.countDays; i++){
				this.addDayInPanelTime(newDayRow);
			}
			//hour
			var newHourRow = tblTime.insertRow(tblTime.rows.length);
			for(var i = 0; i < this.countDays; i++){
				this.addHourInPanelTime(newHourRow);
			}
			dojo.style(newHourRow, "display", "none");
			return panelTime;
		},
		adjustPanelTime: function(width){
			var maxEndPos = dojo.map(this.arrProjects, function(project){
				return (parseInt(project.projectItem[0].style.left) + parseInt(project.projectItem[0].firstChild.style.width)
					+ project.descrProject.offsetWidth + this.panelTimeExpandDelta);
			}, this).sort(function(a,b){return b-a})[0];
			if(this.maxTaskEndPos != maxEndPos){
				//reset panel time
				var prows = this.panelTime.firstChild.firstChild.rows;
				for(var i = 0; i <= 4; i++){//prows.length
					this.removeCell(prows[i]);
				};
				var countDays = Math.round((maxEndPos+this.panelTimeExpandDelta) / this.pixelsPerDay);
				this.totalDays = countDays;
				//year
				var newYear = oldYear = new Date(this.startDate).getFullYear(), ycount = 0;
				for(var i = 0; i < countDays; i++, ycount++){
					var date = new Date(this.startDate);
					date.setDate(date.getDate() + i);
					newYear = date.getFullYear();
					if(newYear != oldYear){
						this.addYearInPanelTime(prows[0], ycount, oldYear);
						ycount = 0;
						oldYear = newYear;
					}
				}
				this.addYearInPanelTime(prows[0], ycount, newYear);
				//month
				var newMonth = oldMonth = new Date(this.startDate).getMonth(), mcount = 0, lastYear = 1970;
				for(var i = 0; i < countDays; i++, mcount++){
					var date = new Date(this.startDate);
					date.setDate(date.getDate() + i);
					newMonth = date.getMonth();
					lastYear = date.getFullYear();
					if(newMonth != oldMonth){
						this.addMonthInPanelTime(prows[1], mcount, oldMonth, lastYear);
						mcount = 0;
						oldMonth = newMonth;
					}
				}
				this.addMonthInPanelTime(prows[1], mcount, newMonth, lastYear);
				//week
				var newWeek = oldWeek = dojo.date.locale._getWeekOfYear(new Date(this.startDate)), mcount = 0;
				for(var i = 0; i < countDays; i++, mcount++){
					var date = new Date(this.startDate);
					date.setDate(date.getDate() + i);
					newWeek = dojo.date.locale._getWeekOfYear(date);
					if(newWeek != oldWeek){
						this.addWeekInPanelTime(prows[2], mcount, oldWeek);
						mcount = 0;
						oldWeek = newWeek;
					}
				}
				this.addWeekInPanelTime(prows[2], mcount, newWeek);
				//day
				for(var i = 0; i < countDays; i++){
					this.addDayInPanelTime(prows[3]);
				}
				//hour
				for(var i = 0; i < countDays; i++){
					this.addHourInPanelTime(prows[4]);
				}
				this.panelTime.firstChild.firstChild.style.width = this.pixelsPerDay * (prows[3].cells.length) + "px";
				this.contentData.firstChild.style.width = this.pixelsPerDay * (prows[3].cells.length) + "px";
				this.maxTaskEndPos = maxEndPos;
			}
		},
		addYearInPanelTime: function(row, count, year){
			var data = "Year   " + year;
			var newCell = dojo.create("td", {
				colSpan: count,
				align: "center",
				vAlign: "middle",
				className: "ganttYearNumber",
				innerHTML: this.pixelsPerDay * count > 20 ? data : "",
				innerHTMLData: data
			}, row);
			dojo.style(newCell, "width", (this.pixelsPerDay * count) + "px");
		},
		addMonthInPanelTime: function(row, count, month, year){
			var data = this.months[month] + (year ? " of " + year : "");
			var newCell = dojo.create("td", {
				colSpan: count,
				align: "center",
				vAlign: "middle",
				className: "ganttMonthNumber",
				innerHTML: this.pixelsPerDay * count > 30 ? data : "",
				innerHTMLData: data
			}, row);
			dojo.style(newCell, "width", (this.pixelsPerDay * count) + "px");
		},
		addWeekInPanelTime: function(row, count, week){
			var data = "Week   " + week;
			var newCell = dojo.create("td", {
				colSpan: count,
				align: "center",
				vAlign: "middle",
				className: "ganttWeekNumber",
				innerHTML: this.pixelsPerDay * count > 20 ? data : "",
				innerHTMLData: data
			}, row);
			dojo.style(newCell, "width", (this.pixelsPerDay * count) + "px");
		},
		addDayInPanelTime: function(row){
			var date = new Date(this.startDate);
			date.setDate(date.getDate() + parseInt(row.cells.length));
			var newCell = dojo.create("td", {
				align: "center",
				vAlign: "middle",
				className: "ganttDayNumber",
				innerHTML: this.pixelsPerDay > 20 ? date.getDate() : "",
				innerHTMLData: String(date.getDate()),
				data: row.cells.length
			}, row);
			dojo.style(newCell, "width", this.pixelsPerDay + "px");
			(date.getDay() >= 5) && dojo.addClass(newCell, "ganttDayNumberWeekend");
			this._events.push(
				dojo.connect(newCell, "onmouseover", this, function(event){
					var dayTime = event.target || event.srcElement;
					var date = new Date(this.startDate.getTime());
					date.setDate(date.getDate() + parseInt(dojo.attr(dayTime, "data")));
					dijit.showTooltip(date.getFullYear() + "." + (date.getMonth() + 1) + "." + date.getDate(), newCell, ["above", "below"]);
				})
			);
			this._events.push(
				dojo.connect(newCell, "onmouseout", this, function(event){
					var dayTime = event.target || event.srcElement;
					dayTime && dijit.hideTooltip(dayTime);
				})
			);
		},
		addHourInPanelTime: function(row){
			var newCell = dojo.create("td", {
				align: "center",
				vAlign: "middle",
				className: "ganttHourNumber",
				data: row.cells.length
			}, row);
			dojo.style(newCell, "width", this.pixelsPerDay + "px");
			
			var hourTable = dojo.create("table", {
				cellPadding: "0",
				cellSpacing: "0"
			}, newCell);
			var newRow = hourTable.insertRow(hourTable.rows.length);
			for(var i = 0; i < this.hsPerDay; i++){
				var hourTD = dojo.create("td", {
					className: "ganttHourClass"
				}, newRow);
				dojo.style(hourTD, "width", (this.pixelsPerDay / this.hsPerDay) + "px");
				dojo.attr(hourTD, "innerHTMLData", String(9 + i));
				if(this.pixelsPerDay / this.hsPerDay > 5){
					dojo.attr(hourTD, "innerHTML", String(9 + i));
				}
				dojo.addClass(hourTD, i <= 3?"ganttHourNumberAM":"ganttHourNumberPM");
			}
		},
		incHeightPanelTasks: function(height){
			var containerTasks = this.contentData.firstChild;
			containerTasks.style.height = parseInt(containerTasks.style.height) + height + "px";
		},
		incHeightPanelNames: function(height){
			var containerNames = this.panelNames.firstChild;
			containerNames.style.height = parseInt(containerNames.style.height) + height + "px";
		},
		checkPosition: function(){
			dojo.forEach(this.arrProjects, function(project){
				dojo.forEach(project.arrTasks, function(task){
					task.checkPosition();
				}, this);
			}, this);
		},
		checkHeighPanelTasks: function(){
			this.contentDataHeight += this.heightTaskItemExtra + this.heightTaskItem;
			if((parseInt(this.contentData.firstChild.style.height) <= this.contentDataHeight)){
				this.incHeightPanelTasks(this.heightTaskItem + this.heightTaskItemExtra);
				this.incHeightPanelNames(this.heightTaskItem + this.heightTaskItemExtra);
			}
		},
		sortTasksByStartTime: function(project){
			project.parentTasks.sort(this.sortTaskStartTime);
			for(var i = 0; i < project.parentTasks.length; i++){
				project.parentTasks[i] = this.sortChildTasks(project.parentTasks[i]);
			}
		},
		sortChildTasks: function(parenttask){
			parenttask.cldTasks.sort(this.sortTaskStartTime);
			for(var i = 0; i < parenttask.cldTasks.length; i++){
				if(parenttask.cldTasks[i].cldTasks.length > 0) this.sortChildTasks(parenttask.cldTasks[i]);
			}
			return parenttask;
		},
		refresh: function(count, current, multi){
			//return if no task items
			if(this.arrProjects.length <= 0){return;}
			if(this.arrProjects[0].arrTasks.length <= 0){return;}
			//Show panel of names
			if(!count || current > count){
				this.refreshController();
				if(this.resource){
					this.resource.refresh();
				}
				this.tempDayInPixels = 0;
				this.panelNameHeadersCover && dojo.style(this.panelNameHeadersCover, "display", "none");
				return;
			}
			if(this.tempDayInPixels == 0){
				this.tempDayInPixels = this.pixelsPerDay;
			}
			this.panelNameHeadersCover && dojo.style(this.panelNameHeadersCover, "display", "");
			var dip = this.tempDayInPixels + this.tempDayInPixels * (multi - 1) * Math.pow((current / count), 2);
			this.refreshParams(dip);
			dojo.forEach(this.arrProjects, function(project){
				dojo.forEach(project.arrTasks, function(task){
					task.refresh();
				}, this);
				project.refresh();
			}, this);
			setTimeout(dojo.hitch(this, function(){
				this.refresh(count, ++current, multi);
			}), 15);
		},
		switchTeleMicroView: function(dip){
			var plChild = this.panelTime.firstChild.firstChild;
			for(var i = 0; i < 5; i++){//0:Y 1:M 2:W 3:D 4:H
				if(dip > 40){
					dojo.style(plChild.rows[i], "display", (i==0||i==1)?"none":"");
				}else if(dip < 20){
					dojo.style(plChild.rows[i], "display", (i==2||i==4)?"none":"");
				}else{
					dojo.style(plChild.rows[i], "display", (i==0||i==4)?"none":"");
				}
			}
		},
		refreshController: function(){
			this.contentData.firstChild.style.width = Math.max(1200, this.pixelsPerDay * this.totalDays) + "px";
			this.panelTime.firstChild.style.width = this.pixelsPerDay * this.totalDays + "px";
			this.panelTime.firstChild.firstChild.style.width = this.pixelsPerDay * this.totalDays + "px";
			this.switchTeleMicroView(this.pixelsPerDay);
			dojo.forEach(this.panelTime.firstChild.firstChild.rows, function(row){
				dojo.forEach(row.childNodes, function(td){
					var cs = parseInt(dojo.attr(td, "colSpan") || 1);
					var idata = dojo.trim(dojo.attr(td, "innerHTMLData")||"");
					if(idata.length > 0){
						dojo.attr(td, "innerHTML", this.pixelsPerDay * cs < 20 ? "" : idata);
					}else{
						dojo.forEach(td.firstChild.rows[0].childNodes, function(td){
							var sdata = dojo.trim(dojo.attr(td, "innerHTMLData")||"");
							dojo.attr(td, "innerHTML", this.pixelsPerDay / this.hsPerDay > 10 ? sdata : "");
						}, this);
					}
					if(cs == 1){
						dojo.style(td, "width", (this.pixelsPerDay*cs) + "px");
						if(idata.length <= 0){
							dojo.forEach(td.firstChild.rows[0].childNodes, function(td){
								dojo.style(td, "width", (this.pixelsPerDay*cs / this.hsPerDay) + "px");
							}, this);
						}
					}
				}, this);
			}, this);
		},
		init: function(){
			this.startDate = this.getStartDate();
			dojo.style(this.content, {
				width: this.contentWidth + "px",
				height: this.contentHeight + "px"
			});
			//create Table
			this.tableControl = dojo.create("table", {
				cellPadding: "0",
				cellSpacing: "0",
				className: "ganttTabelControl"
			});
			var newRowTblControl = this.tableControl.insertRow(this.tableControl.rows.length);
			//Add to content Table
			this.content.appendChild(this.tableControl);
			this.countDays = this.getCountDays();
			//Creation panel of time
			this.panelTime = dojo.create("div", {className: "ganttPanelTimeContainer"});
			dojo.style(this.panelTime, "height", this.panelTimeHeight + "px");
			this.panelTime.appendChild(this.createPanelTime());
			//Creation panel contentData
			this.contentData = dojo.create("div", {className: "ganttContentDataContainer"});
			dojo.style(this.contentData, "height", (this.contentHeight - this.panelTimeHeight) + "px");
			this.contentData.appendChild(this.createPanelTasks());
			//Creation panel of names
			var newCellTblControl = dojo.create("td", {
				vAlign: "top"
			});
			//Creation panel of task header
			this.panelNameHeaders = dojo.create("div", {className: "ganttPanelNameHeaders"}, newCellTblControl);
			dojo.style(this.panelNameHeaders, {
				height: this.panelTimeHeight + "px",
				width: this.maxWidthPanelNames + "px"
			});
			this.panelNameHeaders.appendChild(this.createPanelNamesTasksHeader());
			this.panelNames = dojo.create("div", {className: "ganttPanelNamesContainer"}, newCellTblControl);
			this.panelNames.appendChild(this.createPanelNamesTasks());
			newRowTblControl.appendChild(newCellTblControl);
			//add to control contentData and dataTime
			newCellTblControl = dojo.create("td", {
				vAlign: "top"
			});
			var divCell = dojo.create("div", {className: "ganttDivCell"});
			divCell.appendChild(this.panelTime);
			divCell.appendChild(this.contentData);
			newCellTblControl.appendChild(divCell);
			newRowTblControl.appendChild(newCellTblControl);
			//Show panel of names
			dojo.style(this.panelNames, "height", (this.contentHeight - this.panelTimeHeight - this.scrollBarWidth) + "px");
			dojo.style(this.panelNames, "width", this.maxWidthPanelNames + "px");
			dojo.style(this.contentData, "width", (this.contentWidth - this.maxWidthPanelNames) + "px");
			dojo.style(this.contentData.firstChild, "width", this.pixelsPerDay * this.countDays + "px");
			dojo.style(this.panelTime, "width", (this.contentWidth - this.maxWidthPanelNames - this.scrollBarWidth) + "px");
			dojo.style(this.panelTime.firstChild, "width", this.pixelsPerDay * this.countDays + "px");
			if(this.isShowConMenu){
				this.tabMenu = new dojox.gantt.TabMenu(this);
			}
			var _this = this;
			this.contentData.onscroll = function(){
				_this.panelTime.scrollLeft = this.scrollLeft;
				if(_this.panelNames){
					_this.panelNames.scrollTop = this.scrollTop;
					if(_this.isShowConMenu){
						_this.tabMenu.hide();
					}
				}
				if(_this.resource){
					_this.resource.contentData.scrollLeft = this.scrollLeft;
				}
			}
			this.project.sort(this.sortProjStartDate);
			for(var i = 0; i < this.project.length; i++){
				var proj = this.project[i];
				for(var k = 0; k < proj.parentTasks.length; k++){
					var ppTask = proj.parentTasks[k];
					if(!ppTask.startTime){
						ppTask.startTime = proj.startDate;
					}
					this.setStartTimeChild(ppTask);
					if(this.setPreviousTask(proj)){
						return;
					}
				}
				for(var k = 0; k < proj.parentTasks.length; k++){
					var ppTask = proj.parentTasks[k];
					if(ppTask.startTime < proj.startDate){
						if(!this.correctError){
							return;
						}else{
							ppTask.startTime = proj.startDate;
						}
					}
					if(this.checkPosParentTaskInTree(ppTask)){
						return;
					}
				}
				this.sortTasksByStartTime(proj);
			}
			for(var i = 0; i < this.project.length; i++){
				//creation project
				var proj = this.project[i];
				var project = new dojox.gantt.GanttProjectControl(this, proj);
				if(this.arrProjects.length > 0){
					var previousProject = this.arrProjects[this.arrProjects.length - 1];
					project.previousProject = previousProject;
					previousProject.nextProject = project;
				}
				project.create();
				this.checkHeighPanelTasks();
				this.arrProjects.push(project);
				this.createTasks(project);
			}
			if(this.withResource){
				this.resource = new dojox.gantt.GanttResourceItem(this);
				this.resource.create();
			}
			this.postLoadData();
			this.postBindEvents();
			return this;
		},
		postLoadData: function(){
			dojo.forEach(this.arrProjects, function(project){
				dojo.forEach(project.arrTasks, function(task){
					task.postLoadData();
				}, this);
				project.postLoadData();
			}, this);
			//toolbar cover div
			var cpos = dojo.coords(this.panelNameHeaders);
			if(!this.panelNameHeadersCover){
				this.panelNameHeadersCover = dojo.create("div", {className: "ganttHeaderCover"}, this.panelNameHeaders.parentNode);
				dojo.style(this.panelNameHeadersCover, {
					left: cpos.l+"px",
					top: cpos.t+"px",
					height: cpos.h+"px",
					width: cpos.w+"px",
					display: "none"
				});
			}
		},
		postBindEvents: function(){
			//highlight row
			var pos = dojo.position(this.tableControl, true);
			!dojo.isIE && this._events.push(
				dojo.connect(this.tableControl, "onmousemove", this, function(event){
					var elem = event.srcElement || event.target;
					if(elem == this.panelNames.firstChild || elem == this.contentData.firstChild){
						//23: this.heightTaskItem + this.heightTaskItemExtra
						var rowHeight = this.heightTaskItem + this.heightTaskItemExtra;
						var hlTop = parseInt(event.layerY / rowHeight) * rowHeight + this.panelTimeHeight - this.contentData.scrollTop;
						if(hlTop != this.oldHLTop && hlTop < (pos.h - 50)){
							if(this.highLightDiv){
								dojo.style(this.highLightDiv, "top", (pos.y + hlTop) + "px");
							}else{
								this.highLightDiv = dojo.create("div", {
									className: "ganttRowHighlight"
								}, dojo.body());
								dojo.style(this.highLightDiv, {
									top: (pos.y + hlTop) + "px",
									left: pos.x + "px",
									width: (pos.w - 20) + "px",
									height: rowHeight + "px"
								});
							}
						}
						this.oldHLTop = hlTop;
					}
				})
			);
			//TODO: other event bindings
		},
		getStartDate: function(){
			dojo.forEach(this.project, function(proj){
				if(this.startDate){
					if(proj.startDate < this.startDate){
						this.startDate = new Date(proj.startDate);
					}
				}else{
					this.startDate = new Date(proj.startDate);
				}
			}, this);
			this.initialPos = 24 * this.pixelsPerHour;
			return this.startDate ? new Date(this.startDate.setHours(this.startDate.getHours() - 24)) : new Date();
		},
		getCountDays: function(){
			return parseInt((this.contentWidth - this.maxWidthPanelNames) / (this.pixelsPerHour * 24));
		},
		createTasks: function(project){
			dojo.forEach(project.project.parentTasks, function(pppTask, i){
				if(i > 0){
					project.project.parentTasks[i - 1].nextParentTask = pppTask;
					pppTask.previousParentTask = project.project.parentTasks[i - 1];
				}
				var task = new dojox.gantt.GanttTaskControl(pppTask, project, this);
				project.arrTasks.push(task);
				task.create();
				this.checkHeighPanelTasks();
				if(pppTask.cldTasks.length > 0){
					this.createChildItemControls(pppTask.cldTasks, project);
				}
			}, this);
		},
		createChildItemControls: function(arrChildTasks, project){
			arrChildTasks && dojo.forEach(arrChildTasks, function(cTask, i){
				if(i > 0){
					cTask.previousChildTask = arrChildTasks[i - 1];
					arrChildTasks[i - 1].nextChildTask = cTask;
				}
				var task = new dojox.gantt.GanttTaskControl(cTask, project, this);
				task.create();
				this.checkHeighPanelTasks();
				if(cTask.cldTasks.length > 0){
					this.createChildItemControls(cTask.cldTasks, project);
				}
			}, this);
		},
		getPosOnDate: function(startTime){
			return (startTime - this.startDate) / (60 * 60 * 1000) * this.pixelsPerHour;
		},
		getWidthOnDuration: function(duration){
			return Math.round(this.pixelsPerWorkHour * duration);
		},
		getLastChildTask: function(task){
			return task.childTask.length > 0 ? this.getLastChildTask(task.childTask[task.childTask.length - 1]) : task;
		},
		removeCell: function(row){
			while(row.cells[0]){
				row.deleteCell(row.cells[0]);
			}
		}
	});
})();