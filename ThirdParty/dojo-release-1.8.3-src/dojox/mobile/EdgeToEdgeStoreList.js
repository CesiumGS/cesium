define([
	"dojo/_base/declare",
	"./EdgeToEdgeList",
	"./_StoreListMixin"
], function(declare, EdgeToEdgeList, StoreListMixin){

	// module:
	//		dojox/mobile/EdgeToEdgeStoreList

	return declare("dojox.mobile.EdgeToEdgeStoreList", [EdgeToEdgeList, StoreListMixin],{
		// summary:
		//		A dojo/store-enabled version of EdgeToEdgeList.
		// description:
		//		EdgeToEdgeStoreList is an enhanced version of EdgeToEdgeList. It
		//		can generate ListItems according to the given dojo/store store.
	});
});
