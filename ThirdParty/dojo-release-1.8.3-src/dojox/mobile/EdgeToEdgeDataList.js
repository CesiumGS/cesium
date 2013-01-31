define([
	"dojo/_base/declare",
	"./EdgeToEdgeList",
	"./_DataListMixin"
], function(declare, EdgeToEdgeList, DataListMixin){

	// module:
	//		dojox/mobile/EdgeToEdgeDataList

	return declare("dojox.mobile.EdgeToEdgeDataList", [EdgeToEdgeList, DataListMixin],{
		// summary:
		//		A dojo/data-enabled version of EdgeToEdgeList.
		// description:
		//		EdgeToEdgeDataList is an enhanced version of EdgeToEdgeList. It
		//		can generate ListItems according to the given dojo/data store.
	});
});
