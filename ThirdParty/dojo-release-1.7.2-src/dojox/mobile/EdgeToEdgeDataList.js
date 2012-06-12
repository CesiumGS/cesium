define([
	"dojo/_base/declare",
	"./EdgeToEdgeList",
	"./_DataListMixin"
], function(declare, EdgeToEdgeList, DataListMixin){

/*=====
	var EdgeToEdgeList = dojox.mobile.EdgeToEdgeList;
	var DataListMixin = dojox.mobile._DataListMixin;
=====*/

	// module:
	//		dojox/mobile/EdgeToEdgeDataList
	// summary:
	//		An enhanced version of EdgeToEdgeList.

	return declare("dojox.mobile.EdgeToEdgeDataList", [EdgeToEdgeList, DataListMixin],{
		// summary:
		//		An enhanced version of EdgeToEdgeList.
		// description:
		//		EdgeToEdgeDataList is an enhanced version of EdgeToEdgeList. It
		//		can generate ListItems according to the given dojo.data store.
	});
});
