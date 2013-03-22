define(["doh", "../ColumnView", "../MatrixView", "dojo/store/Memory", "dojo/store/Observable"], 
	function(doh, ColumnView, MatrixView, Memory, Observable){
	doh.register("tests.unitTest_editing", [
	
		function test_MoveNoSnap(doh){
			var item = {	id:0, startTime: new Date(2011, 0, 5, 10), endTime: new Date(2011, 0, 5, 11) };
			var data = [ item ];
			
			var o = new ColumnView({				
				startDate:  new Date(2011, 0, 5),
				store: new Observable(new Memory({data: data})),
				snapSteps: 1
			});
			
			var cal = o.dateModule;
			o.validateRendering();
			
			var renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "move",
				editedItem: renderItem,
				rendererKind: "vertical",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 10, 30)], "move", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 10, 37)], "mouse"); // move +7 min in time
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5, 10, 7)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 5, 11, 7)), 0);
			
			renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "move",
				editedItem: renderItem,
				rendererKind: "vertical",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 10, 30)], "move", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 10, 27)], "mouse"); // move -3 min in time
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5, 10, 4)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 5, 11, 4)), 0);
			
			o.validateRendering();
			o.destroyRecursive();
		},
		
		function test_MoveSnap(doh){
			var item = {	id:0, startTime: new Date(2011, 0, 5, 10), endTime: new Date(2011, 0, 5, 11) };
			var data = [ item ];
			
			var o = new ColumnView({			
				startDate:  new Date(2011, 0, 5),	
				store: new Observable(new Memory({data: data})),
				snapSteps: 15
			});
			
			var cal = o.dateModule;
			o.validateRendering();
			
			var renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "move",
				editedItem: renderItem,
				rendererKind: "vertical",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 10, 30)], "move", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 10, 35)], "mouse"); // move +5 min in time
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5, 10, 0)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 5, 11, 0)), 0);
			
			renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "move",
				editedItem: renderItem,
				rendererKind: "vertical",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 10, 30)], "move", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 10, 47)], "mouse"); // move +17 min in time
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5, 10, 15)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 5, 11, 15)), 0);
			
			o.validateRendering();
			o.destroyRecursive();
		},
		
		function test_ResizeNoSnap(doh){
			var item = {	id:0, startTime: new Date(2011, 0, 5, 10), endTime: new Date(2011, 0, 5, 11) };
			var data = [ item ];
			
			var o = new ColumnView({		
				startDate:  new Date(2011, 0, 5),		
				store: new Observable(new Memory({data: data})),
				snapSteps: 1
			});
			
			var cal = o.dateModule;
			o.validateRendering();
			
			var renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "resizeStart",
				editedItem: renderItem,
				rendererKind: "vertical",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 10, 30)], "resizeStart", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 10, 23)], "mouse"); // resize start -7 min in time
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5, 9, 53)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 5, 11)), 0);
			
			renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "resizeEnd",
				editedItem: renderItem,
				rendererKind: "vertical",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 10, 30)], "resizeEnd", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 10, 37)], "mouse"); // resize end +7 min in time
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5, 9, 53)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 5, 11, 8)), 0); // 7 + 1 as end is moved
			
			o.validateRendering();
			o.destroyRecursive();
		},
		
		function test_ResizeSnap(doh){
			var item = {	id:0, startTime: new Date(2011, 0, 5, 10), endTime: new Date(2011, 0, 5, 11) };
			var data = [ item ];
			
			var o = new ColumnView({	
				startDate:  new Date(2011, 0, 5),			
				store: new Observable(new Memory({data: data})),
				snapSteps: 5
			});
			
			var cal = o.dateModule;
			o.validateRendering();
			
			var renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "resizeStart",
				editedItem: renderItem,
				rendererKind: "vertical",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 10, 30)], "resizeStart", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 10, 23)], "mouse"); // resize start -7 min in time
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5, 9, 50)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 5, 11)), 0);
			
			renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "resizeEnd",
				editedItem: renderItem,
				rendererKind: "vertical",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 10, 30)], "resizeEnd", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 10, 37)], "mouse"); // resize end +7 min in time
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5, 9, 50)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 5, 11, 10)), 0);
			
			o.validateRendering();
			o.destroyRecursive();
		},
		
		function test_ResizeMinDurationColumnView(doh){
			var item = {	id:0, startTime: new Date(2011, 0, 5, 10), endTime: new Date(2011, 0, 5, 11) };
			var data = [ item ];
			
			var o = new ColumnView({	
				startDate:  new Date(2011, 0, 5),			
				store: new Observable(new Memory({data: data})),
				minDurationUnit: "minute",
				minDurationSteps: 15,
				snapSteps: 1
			});
			
			var cal = o.dateModule;
			o.validateRendering();
			
			var renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "resizeEnd",
				editedItem: renderItem,
				rendererKind: "vertical",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 10, 0)], "resizeEnd", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 9, 10)], "mouse"); //- 50 min 
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5, 10)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 5, 10, 15)), 0);					
			
			o.validateRendering();
			o.destroyRecursive();
		},
		
		function test_MoveAllDay(doh){
			
			var item = {	id:0, startTime: new Date(2011, 0, 5), endTime: new Date(2011, 0, 6), allDay: true };
			var data = [ item ];
			
			var o = new MatrixView({	
				startDate:  new Date(2011, 0, 3),			
				store: new Observable(new Memory({data: data}))
			});
			
			var cal = o.dateModule;
			o.validateRendering();					
			
			var renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "move",
				editedItem: renderItem,
				rendererKind: "horizontal",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 12)], "move", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 18)], "mouse"); // move _at_ 18
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 6)), 0);
			
			o._edProps = {
				editKind: "move",
				editedItem: renderItem,
				rendererKind: "horizontal",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 12)], "move", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 6, 1)], "mouse"); // move _at_ 6 @ 1am
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 6)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 7)), 0);
			
			o._edProps = {
				editKind: "move",
				editedItem: renderItem,
				rendererKind: "horizontal",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 6, 1)], "move", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 1)], "mouse"); // move _at_ 5 @ 1am
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 6)), 0);
			
			o.validateRendering();
			o.destroyRecursive();
		},
		
		function test_ResizeStartAllDay(doh){
			var item = {	id:0, startTime: new Date(2011, 0, 5), endTime: new Date(2011, 0, 6), allDay: true };
			var data = [ item ];
			
			var o = new MatrixView({				
				startDate:  new Date(2011, 0, 3),
				store: new Observable(new Memory({data: data}))
			});
			
			var cal = o.dateModule;
			o.validateRendering();					
			
			var renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "resizeStart",
				editedItem: renderItem,
				rendererKind: "horizontal",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 12)], "resizeStart", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 6)], "mouse"); 
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 6)), 0);
			
			o._edProps = {
				editKind: "move",
				editedItem: renderItem,
				rendererKind: "horizontal",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 12)], "resizeStart", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 4, 23)], "mouse"); 
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 4)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 6)), 0);
			
			o._edProps = {
				editKind: "move",
				editedItem: renderItem,
				rendererKind: "horizontal",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 4, 23)], "resizeStart", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 1)], "mouse"); 
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 6)), 0);
			
			o.validateRendering();
			o.destroyRecursive();
		}, 
		
		
		function test_ResizeEndAllDay(doh){
			var item = {	id:0, startTime: new Date(2011, 0, 5), endTime: new Date(2011, 0, 6), allDay: true };
			var data = [ item ];
			
			var o = new MatrixView({	
				startDate: new Date(2011, 0, 3),			
				store: new Observable(new Memory({data: data}))
			});
			
			var cal = o.dateModule;			
			o.validateRendering();					
			
			var renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "resizeEnd",
				editedItem: renderItem,
				rendererKind: "horizontal",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 12)], "resizeEnd", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 18)], "mouse"); 
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 6)), 0);
			
			o._edProps = {
				editKind: "move",
				editedItem: renderItem,
				rendererKind: "horizontal",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 12)], "resizeEnd", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 6, 1)], "mouse"); 
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 7)), 0);
			
			o._edProps = {
				editKind: "move",
				editedItem: renderItem,
				rendererKind: "horizontal",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 6, 23)], "resizeEnd", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 1)], "mouse"); 
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 6)), 0);
			
			o.validateRendering();
			o.destroyRecursive();
		}, 
		
		function test_MoveNoSnapMatrixView(doh){
			var item = {	id:0, startTime: new Date(2011, 0, 5, 10), endTime: new Date(2011, 0, 7, 11) };
			var data = [ item ];
			
			var o = new MatrixView({			
				startDate: new Date(2011, 0, 3),	
				roundToDay: false,
				store: new Observable(new Memory({data: data})),
				snapSteps: 1
			});
			
			var cal = o.dateModule;			
			o.validateRendering();
			
			var renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "move",
				editedItem: renderItem,
				rendererKind: "horizontal",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 10, 30)], "move", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 10, 37)], "mouse"); // move +7 min in time
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5, 10, 7)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 7, 11, 7)), 0);
			
			renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "move",
				editedItem: renderItem,
				rendererKind: "horizontal",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 10, 30)], "move", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 10, 27)], "mouse"); // move -3 min in time
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5, 10, 4)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 7, 11, 4)), 0);
			
			o.validateRendering();
			o.destroyRecursive();
		},
		
		function test_MoveSnapMatrixView(doh){
			var item = {	id:0, startTime: new Date(2011, 0, 5, 10), endTime: new Date(2011, 0, 7, 11) };
			var data = [ item ];
			
			var o = new MatrixView({			
				startDate: new Date(2011, 0, 3),	
				roundToDay: false,
				store: new Observable(new Memory({data: data})),
				snapSteps: 5
			});
			
			var cal = o.dateModule;			
			o.validateRendering();
			
			var renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "move",
				editedItem: renderItem,
				rendererKind: "horizontal",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 10, 30)], "move", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 10, 37)], "mouse"); // move +7 min in time
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5, 10, 5)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 7, 11, 5)), 0);
			
			renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "move",
				editedItem: renderItem,
				rendererKind: "horizontal",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 10, 30)], "move", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 10, 27)], "mouse"); // move -3 min in time
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5, 10, 0)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 7, 11, 0)), 0);
			
			o.validateRendering();
			o.destroyRecursive();
		},
		
		function test_MoveRoundToDayMatrixView(doh){
			var item = {	id:0, startTime: new Date(2011, 0, 5, 10), endTime: new Date(2011, 0, 7, 11) };
			var data = [ item ];
			
			var o = new MatrixView({			
				startDate: new Date(2011, 0, 3),	
				roundToDay: true,
				store: new Observable(new Memory({data: data}))			
			});
			
			var cal = o.dateModule;			
			o.validateRendering();
			
			var renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "move",
				editedItem: renderItem,
				rendererKind: "horizontal",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 10, 30)], "move", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 10, 37)], "mouse"); // move +7 min in time
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5, 10)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 7, 11)), 0);
			
			renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "move",
				editedItem: renderItem,
				rendererKind: "horizontal",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 10, 30)], "move", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 6, 1)], "mouse"); 
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 6, 10, 0)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 8, 11, 0)), 0);
			
			o.validateRendering();
			o.destroyRecursive();
		},
		
		function test_MoveLabelMatrixView(doh){
			var item = {	id:0, startTime: new Date(2011, 0, 5, 10), endTime: new Date(2011, 0, 5, 11) };
			var data = [ item ];
			
			var o = new MatrixView({			
				startDate: new Date(2011, 0, 3),	
				roundToDay: true,
				store: new Observable(new Memory({data: data}))			
			});
			
			var cal = o.dateModule;			
			o.validateRendering();
			
			var renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "move",
				editedItem: renderItem,
				rendererKind: "label",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 10, 30)], "move", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 10, 37)], "mouse"); // move +7 min in time
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5, 10)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 5, 11)), 0);
			
			renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "move",
				editedItem: renderItem,
				rendererKind: "label",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 5, 10, 30)], "move", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 6, 1)], "mouse"); 
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 6, 10, 0)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 6, 11, 0)), 0);
			
			o.validateRendering();
			o.destroyRecursive();
		},
		
		function test_ResizeMinDurationMatrixView(doh){
			var item = {	id:0, startTime: new Date(2011, 0, 5, 6), endTime: new Date(2011, 0, 6, 12) };
			var data = [ item ];
			
			var o = new MatrixView({
				startDate: new Date(2011, 0, 3),
				store: new Observable(new Memory({data: data})),
				roundToDay: false,
				minDurationUnit: "day",
				minDurationSteps: 1,
				snapSteps: 1
			});
			
			var cal = o.dateModule;
			
			o.validateRendering();
			
			var renderItem = o.itemToRenderItem(item, o.store);
			
			o._edProps = {
				editKind: "resizeEnd",
				editedItem: renderItem,
				rendererKind: "vertical",
				tempEditedItem: renderItem,					
				liveLayout: true			
			};
			
			o._startItemEditing(item, "mouse");
			o._startItemEditingGesture([new Date(2011, 0, 6, 10, 0)], "resizeEnd", "mouse");
			o._moveOrResizeItemGesture([new Date(2011, 0, 5, 10, 10)], "mouse"); // -1 day 
			o._endItemEditingGesture("mouse");
			o._endItemEditing("mouse", false); // validate changes
			
			doh.is(cal.compare(item.startTime, new Date(2011, 0, 5, 6)), 0);
			doh.is(cal.compare(item.endTime, new Date(2011, 0, 6, 6)), 0);					
			
			o.validateRendering();
			o.destroyRecursive();
		}
	
		
	]);
});
