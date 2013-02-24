define([
	"dojo/_base/declare",
	"./Carousel",
	"./_StoreMixin"
], function(declare, Carousel, StoreMixin){

	// module:
	//		dojox/mobile/StoreCarousel

	return declare("dojox.mobile.StoreCarousel", [Carousel, StoreMixin], {
		// summary:
		//		A dojo/store enabled Carousel.
		// description:
		//		StoreCarousel is an enhanced version of dojox/mobile/Carousel. It
		//		can generate contents according to the given dojo/store store.
	});
});
