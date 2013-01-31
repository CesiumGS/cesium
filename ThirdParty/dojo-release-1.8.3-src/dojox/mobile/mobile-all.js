define([
	"./_base",
	"./_EditableIconMixin",
	"./_EditableListMixin",
	"./_ExecScriptMixin",
	"./_IconItemPane",
	"./Accordion",
	"./Audio",
	"./Badge",
	"./Button",
	"./Carousel",
	"./CarouselItem",
	"./CheckBox",
	"./ComboBox",
	"./compat",
	"./ContentPane",
	"./DataCarousel",
	"./DatePicker",
	"./EdgeToEdgeDataList",
	"./EdgeToEdgeStoreList",
	"./ExpandingTextArea",
	"./FixedSplitter",
	"./FixedSplitterPane",
	"./GridLayout",
	"./Icon",
	"./IconContainer",
	"./IconItem",
	"./IconMenu",
	"./IconMenuItem",
	"./Opener",
	"./Overlay",
	"./PageIndicator",
	"./ProgressBar",
	"./RadioButton",
	"./Rating",
	"./RoundRectDataList",
	"./RoundRectStoreList",
	"./ScreenSizeAware",
	"./ScrollablePane",
	"./ScrollableView",
	"./SearchBox",
	"./Slider",
	"./SpinWheel",
	"./SpinWheelDatePicker",
	"./SpinWheelSlot",
	"./SpinWheelTimePicker",
	"./StoreCarousel",
	"./SwapView",
	"./TabBar",
	"./TabBarButton",
	"./TextArea",
	"./TextBox",
	"./TimePicker",
	"./ToggleButton",
	"./Tooltip",
	"./transition",
	"./TransitionEvent",
	"./TreeView",
	"./ValuePicker",
	"./ValuePickerDatePicker",
	"./ValuePickerSlot",
	"./ValuePickerTimePicker",
	"./Video",
	"./ViewController",
	"./dh/ContentTypeMap",
	"./dh/DataHandler",
	"./dh/HtmlContentHandler",
	"./dh/HtmlScriptContentHandler",
	"./dh/JsonContentHandler",
	"./dh/PatternFileTypeMap",
	"./dh/StringDataSource",
	"./dh/SuffixFileTypeMap",
	"./dh/UrlDataSource"
], function(common){
	// module:
	//		dojox/mobile/mobile-all

	console.warn("dojox/mobile/mobile-all may include much more code than your application actually requires. We strongly recommend that you use a custom build.");

	/*=====
	return {
		// summary:
		//		A roll-up that includes every mobile module. You probably don't need
		//		this. Demo purposes only.
	};
	=====*/
	return common;
});
