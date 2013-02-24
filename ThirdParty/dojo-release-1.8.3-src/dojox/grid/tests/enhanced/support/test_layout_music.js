var formatDate = function(inDatum){
	var dtb = new dijit.form.DateTextBox({});
	var res = dojo.date.locale.parse(inDatum,{
		selector: "date",
		datePattern: "yyyy/MM/dd"
	});
	dtb.set("value",res);
	return dtb;
};
this.layout = [
	[{//--------------------------------------------------------------------------0
		defaultCell: {editable: true, autoComplete:true, type: dojox.grid.cells._Widget},
		cells:
		[
			{ field: "id", name:"Index", datatype:"number", width: 2.5},
			{ field: "Genre", name:"Genre", datatype:"string", width: 10},
			{ field: "Artist", name:"Artist", datatype:"string", width: 10},
			{ field: "Year", name:"Year", datatype:"string", width: 2.5},
			{ field: "Album", name:"Album", datatype:"string", width: 10},
			{ field: "Name", name:"Name", datatype:"string", width: 8, disabledConditions: [
				"contains", "notcontains"
			]},
			{ field: "Length", name:"Length", datatype:"string", width: 4},
			{ field: "Track", name:"Track", datatype:"number", width: 3
//				,get: function(rowIndex, item){
//					if(item){
//						return "Track " + this.grid.store.getValue(item, this.field);
//					}else{
//						return this.value || this.defaultValue;
//					}
//				}
			},
			{ field: "Composer", name:"Composer", datatype:"string", width: 12},
			{ field: "Download Date", name:"Download Date", datatype:"date", width: 12,
				navigatable: true, editable: false,
				//formatter: formatDate,
				dataTypeArgs: {
					datePattern: "yyyy/M/d"
				}
			},
			{ field: "Last Played", name:"Last Played", datatype:"time", width: 6,
				dataTypeArgs: {
					timePattern: "HH:mm:ss"
				}
			},
			{ field: "Heard", name: "Checked", datatype:"boolean", width: 6/*, type: dojox.grid.cells.CheckBox*/},
			{ field: "Checked", name:"Checked (Customized Label)", editable: false, datatype:"boolean", width: 15, dataTypeArgs: {
				trueLabel: "This sounds like a very old song.",
				falseLabel: "Never heard of this song."
			}}
		]
	}],
	[{//--------------------------------------------------------------------------1
		defaultCell: {},
		rows:
		[[
//			{ field: "id", name:"Index(1)", width: "5px"},
//			{ field: "Genre", name:"Genre(2)", width: "5px"},
//			{ field: "Artist", name:"Artist(3)", width: "5px"},
//			{ field: "Year", name:"Year(4)", width: "5px"},
//			{ field: "Album", name:"Album(5)", width: "5px"},
//			{ field: "Name", name:"Name(6)", width: "5px"},
//			{ field: "Length", name:"Length(7)", width: "5px"},
//			{ field: "Track", name:"Track(8)", width: "5px"},
//			{ field: "Composer", name:"Composer(9)", width: "5px"},
//			{ field: "Download Date", name:"Download Date(10)", width: "5px"},
//			{ field: "Last Played", name:"Last Played(11)", width: "5px"}
			
			{ field: "id", name:"Index(1)", hidden: false},
			{ field: "Genre", name:"Genre(2)", hidden: false},
			{ field: "Artist", name:"Artist(3)", hidden: false},
			{ field: "Year", name:"Year(4)", hidden: false},
			{ field: "Album", name:"Album(5)", hidden: false},
			{ field: "Name", name:"Name(6)", hidden: false},
			{ field: "Length", name:"Length(7)", hidden: false},
			{ field: "Track", name:"Track(8)", hidden: false},
			{ field: "Composer", name:"Composer(9)", hidden: false},
			{ field: "Download Date", name:"Download Date(10)", cellFormatter: {
				selector: "date",
				parse: {datePattern: "yyyy/M/d"},
				format:{datePattern: "MMMM d, yyyy"}
			}, hidden: false},
			{ field: "Last Played", name:"Last Played(11)", hidden: false}
		]]
	}],
	[//--------------------------------------------------------------------------2
		{//first view
			width: "300px",
			rows:
			[
				{ field: "Genre", width: '6'},
				{ field: "Artist", width: '5'},
				{ field: "Year", width: '6'},
				{ field: "Album", width: '10'}
			]
		},
		{//second view
			rows:
			[
				{ field: "Name", width: '17'},
				{ field: "Length", width: '6'},
				{ field: "Track", width: '6'},
				{ field: "Composer", width: '15'}
			]
		}
	],
	[//--------------------------------------------------------------------------3
		{//first view
			rows:
			[
				{ field: "Genre", width: '8'},
				{ field: "Artist", width: '6'},
				{ field: "Year", width: '6'},
				{ field: "Album", width: '10'},
				{ field: "Name", width: '10'},
				{ field: "Length", width: '6'},
				{ field: "Track", width: '6'},
				{ field: "Composer", width: '13'},
				{ field: "Download Date", width: '10'},
				{ field: "Last Played", width: '10'}
			]
		}
	],
	[{//--------------------------------------------------------------------------4
		rows:
		[
			[
				{ field: "Genre"},
				{ field: "Artist"},
				{ field: "Year"},
				{ field: "Album"},
				{ field: "Name"}
			],[
				{ field: "Length"},
				{ field: "Track"},
				{ field: "Composer"},
				{ field: "Download Date"},
				{ field: "Last Played"}
			]
		]}
	],
	[//--------------------------------------------------------------------------5
		{//first view
			rows:
			[
				[
					{ field: "Genre", width: '10', rowSpan: 2},
					{ field: "Artist", width: '15'},
					{ field: "Year", width: '15'},
				],[
					{ field: "Album", colSpan: 2}
				]
			]
		},
		{//second view
			rows:
			[
				[
					{ field: "Name", width: '20', rowSpan: 2},
					{ field: "Length", width: '20'},
					{ field: "Track"}
				],[
					{ field: "Composer", colSpan: 2},
					
				],[
					{ field: "Download Date"},
					{ field: "Last Played"},
					{ field: "Checked"}
				]
			]
		}
	]
];
