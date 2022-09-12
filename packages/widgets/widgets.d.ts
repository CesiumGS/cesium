declare module "@cesium/widgets" {
/**
 * <span style="display: block; text-align: center;">
 * <img src="Images/AnimationWidget.png" width="211" height="142" alt="" />
 * <br />Animation widget
 * </span>
 * <br /><br />
 * The Animation widget provides buttons for play, pause, and reverse, along with the
 * current time and date, surrounded by a "shuttle ring" for controlling the speed of animation.
 * <br /><br />
 * The "shuttle ring" concept is borrowed from video editing, where typically a
 * "jog wheel" can be rotated to move past individual animation frames very slowly, and
 * a surrounding shuttle ring can be twisted to control direction and speed of fast playback.
 * Cesium typically treats time as continuous (not broken into pre-defined animation frames),
 * so this widget offers no jog wheel.  Instead, the shuttle ring is capable of both fast and
 * very slow playback.  Click and drag the shuttle ring pointer itself (shown above in green),
 * or click in the rest of the ring area to nudge the pointer to the next preset speed in that direction.
 * <br /><br />
 * The Animation widget also provides a "realtime" button (in the upper-left) that keeps
 * animation time in sync with the end user's system clock, typically displaying
 * "today" or "right now."  This mode is not available in {@link ClockRange.CLAMPED} or
 * {@link ClockRange.LOOP_STOP} mode if the current time is outside of {@link Clock}'s startTime and endTime.
 * @example
 * // In HTML head, include a link to Animation.css stylesheet,
 * // and in the body, include: <div id="animationContainer"></div>
 *
 * const clock = new Cesium.Clock();
 * const clockViewModel = new Cesium.ClockViewModel(clock);
 * const viewModel = new Cesium.AnimationViewModel(clockViewModel);
 * const widget = new Cesium.Animation('animationContainer', viewModel);
 *
 * function tick() {
 *     clock.tick();
 *     requestAnimationFrame(tick);
 * }
 * requestAnimationFrame(tick);
 * @param container - The DOM element or ID that will contain the widget.
 * @param viewModel - The view model used by this widget.
 */
export class Animation {
    constructor(container: Element | string, viewModel: AnimationViewModel);
    /**
     * Gets the parent container.
     */
    readonly container: Element;
    /**
     * Gets the view model.
     */
    readonly viewModel: AnimationViewModel;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the animation widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
    /**
     * Resizes the widget to match the container size.
     * This function should be called whenever the container size is changed.
     */
    resize(): void;
    /**
     * Updates the widget to reflect any modified CSS rules for theming.
     * @example
     * //Switch to the cesium-lighter theme.
     * document.body.className = 'cesium-lighter';
     * animation.applyThemeChanges();
     */
    applyThemeChanges(): void;
}

/**
 * The view model for the {@link Animation} widget.
 * @param clockViewModel - The ClockViewModel instance to use.
 */
export class AnimationViewModel {
    constructor(clockViewModel: ClockViewModel);
    /**
     * Gets or sets whether the shuttle ring is currently being dragged.  This property is observable.
     */
    shuttleRingDragging: boolean;
    /**
     * Gets or sets whether dragging the shuttle ring should cause the multiplier
     * to snap to the defined tick values rather than interpolating between them.
     * This property is observable.
     */
    snapToTicks: boolean;
    /**
     * Gets the string representation of the current time.  This property is observable.
     */
    timeLabel: string;
    /**
     * Gets the string representation of the current date.  This property is observable.
     */
    dateLabel: string;
    /**
     * Gets the string representation of the current multiplier.  This property is observable.
     */
    multiplierLabel: string;
    /**
     * Gets or sets the current shuttle ring angle.  This property is observable.
     */
    shuttleRingAngle: number;
    /**
     * Gets or sets the default date formatter used by new instances.
     */
    static defaultDateFormatter: AnimationViewModel.DateFormatter;
    /**
     * Gets or sets the default array of known clock multipliers associated with new instances of the shuttle ring.
     */
    static defaultTicks: number[];
    /**
     * Gets or sets the default time formatter used by new instances.
     */
    static defaultTimeFormatter: AnimationViewModel.TimeFormatter;
    /**
     * Gets a copy of the array of positive known clock multipliers to associate with the shuttle ring.
     * @returns The array of known clock multipliers associated with the shuttle ring.
     */
    getShuttleRingTicks(): number[];
    /**
     * Sets the array of positive known clock multipliers to associate with the shuttle ring.
     * These values will have negative equivalents created for them and sets both the minimum
     * and maximum range of values for the shuttle ring as well as the values that are snapped
     * to when a single click is made.  The values need not be in order, as they will be sorted
     * automatically, and duplicate values will be removed.
     * @param positiveTicks - The list of known positive clock multipliers to associate with the shuttle ring.
     */
    setShuttleRingTicks(positiveTicks: number[]): void;
    /**
     * Gets a command that decreases the speed of animation.
     */
    slower: Command;
    /**
     * Gets a command that increases the speed of animation.
     */
    faster: Command;
    /**
     * Gets the clock view model.
     */
    clockViewModel: ClockViewModel;
    /**
     * Gets the pause toggle button view model.
     */
    pauseViewModel: ToggleButtonViewModel;
    /**
     * Gets the reverse toggle button view model.
     */
    playReverseViewModel: ToggleButtonViewModel;
    /**
     * Gets the play toggle button view model.
     */
    playForwardViewModel: ToggleButtonViewModel;
    /**
     * Gets the realtime toggle button view model.
     */
    playRealtimeViewModel: ToggleButtonViewModel;
    /**
     * Gets or sets the function which formats a date for display.
     */
    dateFormatter: AnimationViewModel.DateFormatter;
    /**
     * Gets or sets the function which formats a time for display.
     */
    timeFormatter: AnimationViewModel.TimeFormatter;
}

export namespace AnimationViewModel {
    /**
     * A function that formats a date for display.
     * @param date - The date to be formatted
     * @param viewModel - The AnimationViewModel instance requesting formatting.
     */
    type DateFormatter = (date: JulianDate, viewModel: AnimationViewModel) => string;
    /**
     * A function that formats a time for display.
     * @param date - The date to be formatted
     * @param viewModel - The AnimationViewModel instance requesting formatting.
     */
    type TimeFormatter = (date: JulianDate, viewModel: AnimationViewModel) => string;
}

/**
 * <span style="display: block; text-align: center;">
 * <img src="Images/BaseLayerPicker.png" width="264" height="287" alt="" />
 * <br />BaseLayerPicker with its drop-panel open.
 * </span>
 * <br /><br />
 * The BaseLayerPicker is a single button widget that displays a panel of available imagery and
 * terrain providers.  When imagery is selected, the corresponding imagery layer is created and inserted
 * as the base layer of the imagery collection; removing the existing base.  When terrain is selected,
 * it replaces the current terrain provider.  Each item in the available providers list contains a name,
 * a representative icon, and a tooltip to display more information when hovered. The list is initially
 * empty, and must be configured before use, as illustrated in the below example.
 * @example
 * // In HTML head, include a link to the BaseLayerPicker.css stylesheet,
 * // and in the body, include: <div id="baseLayerPickerContainer"
 * //   style="position:absolute;top:24px;right:24px;width:38px;height:38px;"></div>
 *
 * //Create the list of available providers we would like the user to select from.
 * //This example uses 3, OpenStreetMap, The Black Marble, and a single, non-streaming world image.
 * const imageryViewModels = [];
 * imageryViewModels.push(new Cesium.ProviderViewModel({
 *      name : 'Open\u00adStreet\u00adMap',
 *      iconUrl : Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/openStreetMap.png'),
 *      tooltip : 'OpenStreetMap (OSM) is a collaborative project to create a free editable \
 * map of the world.\nhttp://www.openstreetmap.org',
 *      creationFunction : function() {
 *          return new Cesium.OpenStreetMapImageryProvider({
 *              url : 'https://a.tile.openstreetmap.org/'
 *          });
 *      }
 *  }));
 *
 *  imageryViewModels.push(new Cesium.ProviderViewModel({
 *      name : 'Earth at Night',
 *      iconUrl : Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/blackMarble.png'),
 *      tooltip : 'The lights of cities and villages trace the outlines of civilization \
 * in this global view of the Earth at night as seen by NASA/NOAA\'s Suomi NPP satellite.',
 *      creationFunction : function() {
 *          return new Cesium.IonImageryProvider({ assetId: 3812 });
 *      }
 *  }));
 *
 *  imageryViewModels.push(new Cesium.ProviderViewModel({
 *      name : 'Natural Earth\u00a0II',
 *      iconUrl : Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/naturalEarthII.png'),
 *      tooltip : 'Natural Earth II, darkened for contrast.\nhttp://www.naturalearthdata.com/',
 *      creationFunction : function() {
 *          return new Cesium.TileMapServiceImageryProvider({
 *              url : Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
 *          });
 *      }
 *  }));
 *
 * //Create a CesiumWidget without imagery, if you haven't already done so.
 * const cesiumWidget = new Cesium.CesiumWidget('cesiumContainer', { imageryProvider: false });
 *
 * //Finally, create the baseLayerPicker widget using our view models.
 * const layers = cesiumWidget.imageryLayers;
 * const baseLayerPicker = new Cesium.BaseLayerPicker('baseLayerPickerContainer', {
 *     globe : cesiumWidget.scene.globe,
 *     imageryProviderViewModels : imageryViewModels
 * });
 * @param container - The parent HTML container node or ID for this widget.
 * @param options - Object with the following properties:
 * @param options.globe - The Globe to use.
 * @param [options.imageryProviderViewModels = []] - The array of ProviderViewModel instances to use for imagery.
 * @param [options.selectedImageryProviderViewModel] - The view model for the current base imagery layer, if not supplied the first available imagery layer is used.
 * @param [options.terrainProviderViewModels = []] - The array of ProviderViewModel instances to use for terrain.
 * @param [options.selectedTerrainProviderViewModel] - The view model for the current base terrain layer, if not supplied the first available terrain layer is used.
 */
export class BaseLayerPicker {
    constructor(container: Element | string, options: {
        globe: Globe;
        imageryProviderViewModels?: ProviderViewModel[];
        selectedImageryProviderViewModel?: ProviderViewModel;
        terrainProviderViewModels?: ProviderViewModel[];
        selectedTerrainProviderViewModel?: ProviderViewModel;
    });
    /**
     * Gets the parent container.
     */
    container: Element;
    /**
     * Gets the view model.
     */
    viewModel: BaseLayerPickerViewModel;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
}

/**
 * The view model for {@link BaseLayerPicker}.
 * @param options - Object with the following properties:
 * @param options.globe - The Globe to use.
 * @param [options.imageryProviderViewModels = []] - The array of ProviderViewModel instances to use for imagery.
 * @param [options.selectedImageryProviderViewModel] - The view model for the current base imagery layer, if not supplied the first available imagery layer is used.
 * @param [options.terrainProviderViewModels = []] - The array of ProviderViewModel instances to use for terrain.
 * @param [options.selectedTerrainProviderViewModel] - The view model for the current base terrain layer, if not supplied the first available terrain layer is used.
 */
export class BaseLayerPickerViewModel {
    constructor(options: {
        globe: Globe;
        imageryProviderViewModels?: ProviderViewModel[];
        selectedImageryProviderViewModel?: ProviderViewModel;
        terrainProviderViewModels?: ProviderViewModel[];
        selectedTerrainProviderViewModel?: ProviderViewModel;
    });
    /**
     * Gets or sets an array of ProviderViewModel instances available for imagery selection.
     * This property is observable.
     */
    imageryProviderViewModels: ProviderViewModel[];
    /**
     * Gets or sets an array of ProviderViewModel instances available for terrain selection.
     * This property is observable.
     */
    terrainProviderViewModels: ProviderViewModel[];
    /**
     * Gets or sets whether the imagery selection drop-down is currently visible.
     */
    dropDownVisible: boolean;
    /**
     * Gets the button tooltip.  This property is observable.
     */
    buttonTooltip: string;
    /**
     * Gets the button background image.  This property is observable.
     */
    buttonImageUrl: string;
    /**
     * Gets or sets the currently selected imagery.  This property is observable.
     */
    selectedImagery: ProviderViewModel;
    /**
     * Gets or sets the currently selected terrain.  This property is observable.
     */
    selectedTerrain: ProviderViewModel;
    /**
     * Gets the command to toggle the visibility of the drop down.
     */
    toggleDropDown: Command;
    /**
     * Gets the globe.
     */
    globe: Globe;
}

/**
 * A view model that represents each item in the {@link BaseLayerPicker}.
 * @param options - The object containing all parameters.
 * @param options.name - The name of the layer.
 * @param options.tooltip - The tooltip to show when the item is moused over.
 * @param options.iconUrl - An icon representing the layer.
 * @param [options.category] - A category for the layer.
 * @param options.creationFunction - A function or Command
 *        that creates one or more providers which will be added to the globe when this item is selected.
 */
export class ProviderViewModel {
    constructor(options: {
        name: string;
        tooltip: string;
        iconUrl: string;
        category?: string;
        creationFunction: ProviderViewModel.CreationFunction | Command;
    });
    /**
     * Gets the display name.  This property is observable.
     */
    name: string;
    /**
     * Gets the tooltip.  This property is observable.
     */
    tooltip: string;
    /**
     * Gets the icon.  This property is observable.
     */
    iconUrl: string;
    /**
     * Gets the Command that creates one or more providers which will be added to
     * the globe when this item is selected.
     */
    readonly creationCommand: Command;
    /**
     * Gets the category
     */
    readonly category: string;
}

export namespace ProviderViewModel {
    /**
     * A function which creates one or more providers.
     */
    type CreationFunction = () => ImageryProvider | TerrainProvider | ImageryProvider[] | TerrainProvider[];
}

/**
 * Inspector widget to aid in debugging 3D Tiles
 * @param container - The DOM element or ID that will contain the widget.
 * @param scene - the Scene instance to use.
 */
export class Cesium3DTilesInspector {
    constructor(container: Element | string, scene: Scene);
    /**
     * Gets the parent container.
     */
    container: Element;
    /**
     * Gets the view model.
     */
    viewModel: Cesium3DTilesInspectorViewModel;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
}

/**
 * The view model for {@link Cesium3DTilesInspector}.
 * @param scene - The scene instance to use.
 * @param performanceContainer - The container for the performance display
 */
export class Cesium3DTilesInspectorViewModel {
    constructor(scene: Scene, performanceContainer: HTMLElement);
    /**
     * Gets or sets the flag to enable performance display.  This property is observable.
     */
    performance: boolean;
    /**
     * Gets or sets the flag to show statistics.  This property is observable.
     */
    showStatistics: boolean;
    /**
     * Gets or sets the flag to show pick statistics.  This property is observable.
     */
    showPickStatistics: boolean;
    /**
     * Gets or sets the flag to show resource cache statistics. This property is
     * observable.
     */
    showResourceCacheStatistics: boolean;
    /**
     * Gets or sets the flag to show the inspector.  This property is observable.
     */
    inspectorVisible: boolean;
    /**
     * Gets or sets the flag to show the tileset section.  This property is observable.
     */
    tilesetVisible: boolean;
    /**
     * Gets or sets the flag to show the display section.  This property is observable.
     */
    displayVisible: boolean;
    /**
     * Gets or sets the flag to show the update section.  This property is observable.
     */
    updateVisible: boolean;
    /**
     * Gets or sets the flag to show the logging section.  This property is observable.
     */
    loggingVisible: boolean;
    /**
     * Gets or sets the flag to show the style section.  This property is observable.
     */
    styleVisible: boolean;
    /**
     * Gets or sets the flag to show the tile info section.  This property is observable.
     */
    tileDebugLabelsVisible: boolean;
    /**
     * Gets or sets the flag to show the optimization info section. This property is observable.
     */
    optimizationVisible: boolean;
    /**
     * Gets or sets the JSON for the tileset style.  This property is observable.
     */
    styleString: string;
    /**
     * Gets the names of the properties in the tileset.  This property is observable.
     */
    readonly properties: string[];
    /**
     * Gets or sets the flag to enable dynamic screen space error.  This property is observable.
     */
    dynamicScreenSpaceError: boolean;
    /**
     * Gets or sets the color blend mode.  This property is observable.
     */
    colorBlendMode: Cesium3DTileColorBlendMode;
    /**
     * Gets or sets the flag to enable picking.  This property is observable.
     */
    picking: boolean;
    /**
     * Gets or sets the flag to colorize tiles.  This property is observable.
     */
    colorize: boolean;
    /**
     * Gets or sets the flag to draw with wireframe.  This property is observable.
     */
    wireframe: boolean;
    /**
     * Gets or sets the flag to show bounding volumes.  This property is observable.
     */
    showBoundingVolumes: boolean;
    /**
     * Gets or sets the flag to show content volumes.  This property is observable.
     */
    showContentBoundingVolumes: boolean;
    /**
     * Gets or sets the flag to show request volumes.  This property is observable.
     */
    showRequestVolumes: boolean;
    /**
     * Gets or sets the flag to suspend updates.  This property is observable.
     */
    freezeFrame: boolean;
    /**
     * Gets or sets the flag to show debug labels only for the currently picked tile.  This property is observable.
     */
    showOnlyPickedTileDebugLabel: boolean;
    /**
     * Gets or sets the flag to show tile geometric error.  This property is observable.
     */
    showGeometricError: boolean;
    /**
     * Displays the number of commands, points, triangles and features used per tile.  This property is observable.
     */
    showRenderingStatistics: boolean;
    /**
     * Displays the memory used per tile.  This property is observable.
     */
    showMemoryUsage: boolean;
    /**
     * Gets or sets the flag to show the tile url.  This property is observable.
     */
    showUrl: boolean;
    /**
     * Gets or sets the maximum screen space error.  This property is observable.
     */
    maximumScreenSpaceError: number;
    /**
     * Gets or sets the dynamic screen space error density.  This property is observable.
     */
    dynamicScreenSpaceErrorDensity: number;
    /**
     * Gets or sets the dynamic screen space error density slider value.
     * This allows the slider to be exponential because values tend to be closer to 0 than 1.
     * This property is observable.
     */
    dynamicScreenSpaceErrorDensitySliderValue: number;
    /**
     * Gets or sets the dynamic screen space error factor.  This property is observable.
     */
    dynamicScreenSpaceErrorFactor: number;
    /**
     * Gets or sets the flag to enable point cloud shading. This property is observable.
     */
    pointCloudShading: boolean;
    /**
     * Gets or sets the geometric error scale.  This property is observable.
     */
    geometricErrorScale: number;
    /**
     * Gets or sets the maximum attenuation.  This property is observable.
     */
    maximumAttenuation: number;
    /**
     * Gets or sets the base resolution.  This property is observable.
     */
    baseResolution: number;
    /**
     * Gets or sets the flag to enable eye dome lighting. This property is observable.
     */
    eyeDomeLighting: boolean;
    /**
     * Gets or sets the eye dome lighting strength.  This property is observable.
     */
    eyeDomeLightingStrength: number;
    /**
     * Gets or sets the eye dome lighting radius.  This property is observable.
     */
    eyeDomeLightingRadius: number;
    /**
     * Gets or sets the pick state
     */
    pickActive: boolean;
    /**
     * Gets or sets the flag to determine if level of detail skipping should be applied during the traversal.
     * This property is observable.
     */
    skipLevelOfDetail: boolean;
    /**
     * Gets or sets the multiplier defining the minimum screen space error to skip. This property is observable.
     */
    skipScreenSpaceErrorFactor: number;
    /**
     * Gets or sets the screen space error that must be reached before skipping levels of detail. This property is observable.
     */
    baseScreenSpaceError: number;
    /**
     * Gets or sets the constant defining the minimum number of levels to skip when loading tiles. This property is observable.
     */
    skipLevels: number;
    /**
     * Gets or sets the flag which, when true, only tiles that meet the maximum screen space error will ever be downloaded.
     * This property is observable.
     */
    immediatelyLoadDesiredLevelOfDetail: boolean;
    /**
     * Gets or sets the flag which determines whether siblings of visible tiles are always downloaded during traversal.
     * This property is observable
     */
    loadSiblings: boolean;
    /**
     * Gets the scene
     */
    readonly scene: Scene;
    /**
     * Gets the performance container
     */
    readonly performanceContainer: HTMLElement;
    /**
     * Gets the statistics text.  This property is observable.
     */
    readonly statisticsText: string;
    /**
     * Gets the pick statistics text.  This property is observable.
     */
    readonly pickStatisticsText: string;
    /**
     * Gets the resource cache statistics text. This property is observable.
     */
    readonly resourceCacheStatisticsText: string;
    /**
     * Gets the available blend modes
     */
    readonly colorBlendModes: object[];
    /**
     * Gets the editor error message
     */
    readonly editorError: string;
    /**
     * Gets or sets the tileset of the view model.
     */
    tileset: Cesium3DTileset;
    /**
     * Gets the current feature of the view model.
     */
    feature: Cesium3DTileFeature;
    /**
     * Gets the current tile of the view model
     */
    tile: Cesium3DTile;
    /**
     * Toggles the pick tileset mode
     */
    togglePickTileset(): void;
    /**
     * Toggles the inspector visibility
     */
    toggleInspector(): void;
    /**
     * Toggles the visibility of the tileset section
     */
    toggleTileset(): void;
    /**
     * Toggles the visibility of the display section
     */
    toggleDisplay(): void;
    /**
     * Toggles the visibility of the update section
     */
    toggleUpdate(): void;
    /**
     * Toggles the visibility of the logging section
     */
    toggleLogging(): void;
    /**
     * Toggles the visibility of the style section
     */
    toggleStyle(): void;
    /**
     * Toggles the visibility of the tile Debug Info section
     */
    toggleTileDebugLabels(): void;
    /**
     * Toggles the visibility of the optimization section
     */
    toggleOptimization(): void;
    /**
     * Trims tile cache
     */
    trimTilesCache(): void;
    /**
     * Compiles the style in the style editor.
     */
    compileStyle(): void;
    /**
     * Handles key press events on the style editor.
     */
    styleEditorKeyPress(): void;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
    /**
     * Generates an HTML string of the statistics
     * @param tileset - The tileset
     * @param isPick - Whether this is getting the statistics for the pick pass
     * @returns The formatted statistics
     */
    static getStatistics(tileset: Cesium3DTileset, isPick: boolean): string;
}

/**
 * Inspector widget to aid in debugging
 * @param container - The DOM element or ID that will contain the widget.
 * @param scene - The Scene instance to use.
 */
export class CesiumInspector {
    constructor(container: Element | string, scene: Scene);
    /**
     * Gets the parent container.
     */
    container: Element;
    /**
     * Gets the view model.
     */
    viewModel: CesiumInspectorViewModel;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
}

/**
 * The view model for {@link CesiumInspector}.
 * @param scene - The scene instance to use.
 * @param performanceContainer - The instance to use for performance container.
 */
export class CesiumInspectorViewModel {
    constructor(scene: Scene, performanceContainer: Element);
    /**
     * Gets or sets the show frustums state.  This property is observable.
     */
    frustums: boolean;
    /**
     * Gets or sets the show frustum planes state.  This property is observable.
     */
    frustumPlanes: boolean;
    /**
     * Gets or sets the show performance display state.  This property is observable.
     */
    performance: boolean;
    /**
     * Gets or sets the shader cache text.  This property is observable.
     */
    shaderCacheText: string;
    /**
     * Gets or sets the show primitive bounding sphere state.  This property is observable.
     */
    primitiveBoundingSphere: boolean;
    /**
     * Gets or sets the show primitive reference frame state.  This property is observable.
     */
    primitiveReferenceFrame: boolean;
    /**
     * Gets or sets the filter primitive state.  This property is observable.
     */
    filterPrimitive: boolean;
    /**
     * Gets or sets the show tile bounding sphere state.  This property is observable.
     */
    tileBoundingSphere: boolean;
    /**
     * Gets or sets the filter tile state.  This property is observable.
     */
    filterTile: boolean;
    /**
     * Gets or sets the show wireframe state.  This property is observable.
     */
    wireframe: boolean;
    /**
     * Gets or sets the index of the depth frustum to display.  This property is observable.
     */
    depthFrustum: number;
    /**
     * Gets or sets the suspend updates state.  This property is observable.
     */
    suspendUpdates: boolean;
    /**
     * Gets or sets the show tile coordinates state.  This property is observable.
     */
    tileCoordinates: boolean;
    /**
     * Gets or sets the frustum statistic text.  This property is observable.
     */
    frustumStatisticText: string;
    /**
     * Gets or sets the selected tile information text.  This property is observable.
     */
    tileText: string;
    /**
     * Gets if a primitive has been selected.  This property is observable.
     */
    hasPickedPrimitive: boolean;
    /**
     * Gets if a tile has been selected.  This property is observable
     */
    hasPickedTile: boolean;
    /**
     * Gets if the picking primitive command is active.  This property is observable.
     */
    pickPrimitiveActive: boolean;
    /**
     * Gets if the picking tile command is active.  This property is observable.
     */
    pickTileActive: boolean;
    /**
     * Gets or sets if the cesium inspector drop down is visible.  This property is observable.
     */
    dropDownVisible: boolean;
    /**
     * Gets or sets if the general section is visible.  This property is observable.
     */
    generalVisible: boolean;
    /**
     * Gets or sets if the primitive section is visible.  This property is observable.
     */
    primitivesVisible: boolean;
    /**
     * Gets or sets if the terrain section is visible.  This property is observable.
     */
    terrainVisible: boolean;
    /**
     * Gets or sets the index of the depth frustum text.  This property is observable.
     */
    depthFrustumText: string;
    /**
     * Gets the scene to control.
     */
    scene: Scene;
    /**
     * Gets the container of the PerformanceDisplay
     */
    performanceContainer: Element;
    /**
     * Gets the command to toggle the visibility of the drop down.
     */
    toggleDropDown: Command;
    /**
     * Gets the command to toggle the visibility of a BoundingSphere for a primitive
     */
    showPrimitiveBoundingSphere: Command;
    /**
     * Gets the command to toggle the visibility of a {@link DebugModelMatrixPrimitive} for the model matrix of a primitive
     */
    showPrimitiveReferenceFrame: Command;
    /**
     * Gets the command to toggle a filter that renders only a selected primitive
     */
    doFilterPrimitive: Command;
    /**
     * Gets the command to increment the depth frustum index to be shown
     */
    incrementDepthFrustum: Command;
    /**
     * Gets the command to decrement the depth frustum index to be shown
     */
    decrementDepthFrustum: Command;
    /**
     * Gets the command to toggle the visibility of tile coordinates
     */
    showTileCoordinates: Command;
    /**
     * Gets the command to toggle the visibility of a BoundingSphere for a selected tile
     */
    showTileBoundingSphere: Command;
    /**
     * Gets the command to toggle a filter that renders only a selected tile
     */
    doFilterTile: Command;
    /**
     * Gets the command to expand and collapse the general section
     */
    toggleGeneral: Command;
    /**
     * Gets the command to expand and collapse the primitives section
     */
    togglePrimitives: Command;
    /**
     * Gets the command to expand and collapse the terrain section
     */
    toggleTerrain: Command;
    /**
     * Gets the command to pick a primitive
     */
    pickPrimitive: Command;
    /**
     * Gets the command to pick a tile
     */
    pickTile: Command;
    /**
     * Gets the command to pick a tile
     */
    selectParent: Command;
    /**
     * Gets the command to pick a tile
     */
    selectNW: Command;
    /**
     * Gets the command to pick a tile
     */
    selectNE: Command;
    /**
     * Gets the command to pick a tile
     */
    selectSW: Command;
    /**
     * Gets the command to pick a tile
     */
    selectSE: Command;
    /**
     * Gets or sets the current selected primitive
     */
    primitive: Command;
    /**
     * Gets or sets the current selected tile
     */
    tile: Command;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
}

/**
 * A widget containing a Cesium scene.
 * @example
 * // For each example, include a link to CesiumWidget.css stylesheet in HTML head,
 * // and in the body, include: <div id="cesiumContainer"></div>
 *
 * //Widget with no terrain and default Bing Maps imagery provider.
 * const widget = new Cesium.CesiumWidget('cesiumContainer');
 *
 * //Widget with ion imagery and Cesium World Terrain.
 * const widget2 = new Cesium.CesiumWidget('cesiumContainer', {
 *     imageryProvider : Cesium.createWorldImagery(),
 *     terrainProvider : Cesium.createWorldTerrain(),
 *     skyBox : new Cesium.SkyBox({
 *         sources : {
 *           positiveX : 'stars/TychoSkymapII.t3_08192x04096_80_px.jpg',
 *           negativeX : 'stars/TychoSkymapII.t3_08192x04096_80_mx.jpg',
 *           positiveY : 'stars/TychoSkymapII.t3_08192x04096_80_py.jpg',
 *           negativeY : 'stars/TychoSkymapII.t3_08192x04096_80_my.jpg',
 *           positiveZ : 'stars/TychoSkymapII.t3_08192x04096_80_pz.jpg',
 *           negativeZ : 'stars/TychoSkymapII.t3_08192x04096_80_mz.jpg'
 *         }
 *     }),
 *     // Show Columbus View map with Web Mercator projection
 *     sceneMode : Cesium.SceneMode.COLUMBUS_VIEW,
 *     mapProjection : new Cesium.WebMercatorProjection()
 * });
 * @param container - The DOM element or ID that will contain the widget.
 * @param [options] - Object with the following properties:
 * @param [options.clock = new Clock()] - The clock to use to control current time.
 * @param [options.imageryProvider = createWorldImagery()] - The imagery provider to serve as the base layer. If set to <code>false</code>, no imagery provider will be added.
 * @param [options.terrainProvider = new EllipsoidTerrainProvider] - The terrain provider.
 * @param [options.skyBox] - The skybox used to render the stars.  When <code>undefined</code>, the default stars are used. If set to <code>false</code>, no skyBox, Sun, or Moon will be added.
 * @param [options.skyAtmosphere] - Blue sky, and the glow around the Earth's limb.  Set to <code>false</code> to turn it off.
 * @param [options.sceneMode = SceneMode.SCENE3D] - The initial scene mode.
 * @param [options.scene3DOnly = false] - When <code>true</code>, each geometry instance will only be rendered in 3D to save GPU memory.
 * @param [options.orderIndependentTranslucency = true] - If true and the configuration supports it, use order independent translucency.
 * @param [options.mapProjection = new GeographicProjection()] - The map projection to use in 2D and Columbus View modes.
 * @param [options.globe = new Globe(mapProjection.ellipsoid)] - The globe to use in the scene.  If set to <code>false</code>, no globe will be added.
 * @param [options.useDefaultRenderLoop = true] - True if this widget should control the render loop, false otherwise.
 * @param [options.useBrowserRecommendedResolution = true] - If true, render at the browser's recommended resolution and ignore <code>window.devicePixelRatio</code>.
 * @param [options.targetFrameRate] - The target frame rate when using the default render loop.
 * @param [options.showRenderLoopErrors = true] - If true, this widget will automatically display an HTML panel to the user containing the error, if a render loop error occurs.
 * @param [options.contextOptions] - Context and WebGL creation properties corresponding to <code>options</code> passed to {@link Scene}.
 * @param [options.creditContainer] - The DOM element or ID that will contain the {@link CreditDisplay}.  If not specified, the credits are added
 *        to the bottom of the widget itself.
 * @param [options.creditViewport] - The DOM element or ID that will contain the credit pop up created by the {@link CreditDisplay}.  If not specified, it will appear over the widget itself.
 * @param [options.shadows = false] - Determines if shadows are cast by light sources.
 * @param [options.terrainShadows = ShadowMode.RECEIVE_ONLY] - Determines if the terrain casts or receives shadows from light sources.
 * @param [options.mapMode2D = MapMode2D.INFINITE_SCROLL] - Determines if the 2D map is rotatable or can be scrolled infinitely in the horizontal direction.
 * @param [options.blurActiveElementOnCanvasFocus = true] - If true, the active element will blur when the viewer's canvas is clicked. Setting this to false is useful for cases when the canvas is clicked only for retrieving position or an entity data without actually meaning to set the canvas to be the active element.
 * @param [options.requestRenderMode = false] - If true, rendering a frame will only occur when needed as determined by changes within the scene. Enabling improves performance of the application, but requires using {@link Scene#requestRender} to render a new frame explicitly in this mode. This will be necessary in many cases after making changes to the scene in other parts of the API. See {@link https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/|Improving Performance with Explicit Rendering}.
 * @param [options.maximumRenderTimeChange = 0.0] - If requestRenderMode is true, this value defines the maximum change in simulation time allowed before a render is requested. See {@link https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/|Improving Performance with Explicit Rendering}.
 * @param [options.msaaSamples = 1] - If provided, this value controls the rate of multisample antialiasing. Typical multisampling rates are 2, 4, and sometimes 8 samples per pixel. Higher sampling rates of MSAA may impact performance in exchange for improved visual quality. This value only applies to WebGL2 contexts that support multisample render targets.
 */
export class CesiumWidget {
    constructor(container: Element | string, options?: {
        clock?: Clock;
        imageryProvider?: ImageryProvider | false;
        terrainProvider?: TerrainProvider;
        skyBox?: SkyBox | false;
        skyAtmosphere?: SkyAtmosphere | false;
        sceneMode?: SceneMode;
        scene3DOnly?: boolean;
        orderIndependentTranslucency?: boolean;
        mapProjection?: MapProjection;
        globe?: Globe | false;
        useDefaultRenderLoop?: boolean;
        useBrowserRecommendedResolution?: boolean;
        targetFrameRate?: number;
        showRenderLoopErrors?: boolean;
        contextOptions?: any;
        creditContainer?: Element | string;
        creditViewport?: Element | string;
        shadows?: boolean;
        terrainShadows?: ShadowMode;
        mapMode2D?: MapMode2D;
        blurActiveElementOnCanvasFocus?: boolean;
        requestRenderMode?: boolean;
        maximumRenderTimeChange?: number;
        msaaSamples?: number;
    });
    /**
     * Gets the parent container.
     */
    readonly container: Element;
    /**
     * Gets the canvas.
     */
    readonly canvas: HTMLCanvasElement;
    /**
     * Gets the credit container.
     */
    readonly creditContainer: Element;
    /**
     * Gets the credit viewport
     */
    readonly creditViewport: Element;
    /**
     * Gets the scene.
     */
    readonly scene: Scene;
    /**
     * Gets the collection of image layers that will be rendered on the globe.
     */
    readonly imageryLayers: ImageryLayerCollection;
    /**
     * The terrain provider providing surface geometry for the globe.
     */
    terrainProvider: TerrainProvider;
    /**
     * Gets the camera.
     */
    readonly camera: Camera;
    /**
     * Gets the clock.
     */
    readonly clock: Clock;
    /**
     * Gets the screen space event handler.
     */
    readonly screenSpaceEventHandler: ScreenSpaceEventHandler;
    /**
     * Gets or sets the target frame rate of the widget when <code>useDefaultRenderLoop</code>
     * is true. If undefined, the browser's requestAnimationFrame implementation
     * determines the frame rate.  If defined, this value must be greater than 0.  A value higher
     * than the underlying requestAnimationFrame implementation will have no effect.
     */
    targetFrameRate: number;
    /**
     * Gets or sets whether or not this widget should control the render loop.
     * If true the widget will use requestAnimationFrame to
     * perform rendering and resizing of the widget, as well as drive the
     * simulation clock. If set to false, you must manually call the
     * <code>resize</code>, <code>render</code> methods as part of a custom
     * render loop.  If an error occurs during rendering, {@link Scene}'s
     * <code>renderError</code> event will be raised and this property
     * will be set to false.  It must be set back to true to continue rendering
     * after the error.
     */
    useDefaultRenderLoop: boolean;
    /**
     * Gets or sets a scaling factor for rendering resolution.  Values less than 1.0 can improve
     * performance on less powerful devices while values greater than 1.0 will render at a higher
     * resolution and then scale down, resulting in improved visual fidelity.
     * For example, if the widget is laid out at a size of 640x480, setting this value to 0.5
     * will cause the scene to be rendered at 320x240 and then scaled up while setting
     * it to 2.0 will cause the scene to be rendered at 1280x960 and then scaled down.
     */
    resolutionScale: number;
    /**
     * Boolean flag indicating if the browser's recommended resolution is used.
     * If true, the browser's device pixel ratio is ignored and 1.0 is used instead,
     * effectively rendering based on CSS pixels instead of device pixels. This can improve
     * performance on less powerful devices that have high pixel density. When false, rendering
     * will be in device pixels. {@link CesiumWidget#resolutionScale} will still take effect whether
     * this flag is true or false.
     */
    useBrowserRecommendedResolution: boolean;
    /**
     * Show an error panel to the user containing a title and a longer error message,
     * which can be dismissed using an OK button.  This panel is displayed automatically
     * when a render loop error occurs, if showRenderLoopErrors was not false when the
     * widget was constructed.
     * @param title - The title to be displayed on the error panel.  This string is interpreted as text.
     * @param [message] - A helpful, user-facing message to display prior to the detailed error information.  This string is interpreted as HTML.
     * @param [error] - The error to be displayed on the error panel.  This string is formatted using {@link formatError} and then displayed as text.
     */
    showErrorPanel(title: string, message?: string, error?: string): void;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
    /**
     * Updates the canvas size, camera aspect ratio, and viewport size.
     * This function is called automatically as needed unless
     * <code>useDefaultRenderLoop</code> is set to false.
     */
    resize(): void;
    /**
     * Renders the scene.  This function is called automatically
     * unless <code>useDefaultRenderLoop</code> is set to false;
     */
    render(): void;
}

/**
 * A view model which exposes a {@link Clock} for user interfaces.
 * @param [clock] - The clock object wrapped by this view model, if undefined a new instance will be created.
 */
export class ClockViewModel {
    constructor(clock?: Clock);
    /**
     * Gets the current system time.
     * This property is observable.
     */
    systemTime: JulianDate;
    /**
     * Gets or sets the start time of the clock.
     * See {@link Clock#startTime}.
     * This property is observable.
     */
    startTime: JulianDate;
    /**
     * Gets or sets the stop time of the clock.
     * See {@link Clock#stopTime}.
     * This property is observable.
     */
    stopTime: JulianDate;
    /**
     * Gets or sets the current time.
     * See {@link Clock#currentTime}.
     * This property is observable.
     */
    currentTime: JulianDate;
    /**
     * Gets or sets the clock multiplier.
     * See {@link Clock#multiplier}.
     * This property is observable.
     */
    multiplier: number;
    /**
     * Gets or sets the clock step setting.
     * See {@link Clock#clockStep}.
     * This property is observable.
     */
    clockStep: ClockStep;
    /**
     * Gets or sets the clock range setting.
     * See {@link Clock#clockRange}.
     * This property is observable.
     */
    clockRange: ClockRange;
    /**
     * Gets or sets whether the clock can animate.
     * See {@link Clock#canAnimate}.
     * This property is observable.
     */
    canAnimate: boolean;
    /**
     * Gets or sets whether the clock should animate.
     * See {@link Clock#shouldAnimate}.
     * This property is observable.
     */
    shouldAnimate: boolean;
    /**
     * Gets the underlying Clock.
     */
    clock: Clock;
    /**
     * Updates the view model with the contents of the underlying clock.
     * Can be called to force an update of the viewModel if the underlying
     * clock has changed and <code>Clock.tick</code> has not yet been called.
     */
    synchronize(): void;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the view model.  Should be called to
     * properly clean up the view model when it is no longer needed.
     */
    destroy(): void;
}

/**
 * A Command is a function with an extra <code>canExecute</code> observable property to determine
 * whether the command can be executed.  When executed, a Command function will check the
 * value of <code>canExecute</code> and throw if false.
 *
 * This type describes an interface and is not intended to be instantiated directly.
 * See {@link createCommand} to create a command from a function.
 */
export class Command {
    constructor();
    /**
     * Gets whether this command can currently be executed.  This property is observable.
     */
    canExecute: boolean;
    /**
     * Gets an event which is raised before the command executes, the event
     * is raised with an object containing two properties: a <code>cancel</code> property,
     * which if set to false by the listener will prevent the command from being executed, and
     * an <code>args</code> property, which is the array of arguments being passed to the command.
     */
    beforeExecute: Event;
    /**
     * Gets an event which is raised after the command executes, the event
     * is raised with the return value of the command as its only parameter.
     */
    afterExecute: Event;
}

/**
 * Create a Command from a given function, for use with ViewModels.
 *
 * A Command is a function with an extra <code>canExecute</code> observable property to determine
 * whether the command can be executed.  When executed, a Command function will check the
 * value of <code>canExecute</code> and throw if false.  It also provides events for when
 * a command has been or is about to be executed.
 * @param func - The function to execute.
 * @param [canExecute = true] - A boolean indicating whether the function can currently be executed.
 */
export function createCommand(func: (...params: any[]) => any, canExecute?: boolean): void;

/**
 * A single button widget for toggling fullscreen mode.
 * @param container - The DOM element or ID that will contain the widget.
 * @param [fullscreenElement = document.body] - The element or id to be placed into fullscreen mode.
 */
export class FullscreenButton {
    constructor(container: Element | string, fullscreenElement?: Element | string);
    /**
     * Gets the parent container.
     */
    container: Element;
    /**
     * Gets the view model.
     */
    viewModel: FullscreenButtonViewModel;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
}

/**
 * The view model for {@link FullscreenButton}.
 * @param [fullscreenElement = document.body] - The element or id to be placed into fullscreen mode.
 * @param [container] - The DOM element or ID that will contain the widget.
 */
export class FullscreenButtonViewModel {
    constructor(fullscreenElement?: Element | string, container?: Element | string);
    /**
     * Gets whether or not fullscreen mode is active.  This property is observable.
     */
    isFullscreen: boolean;
    /**
     * Gets or sets whether or not fullscreen functionality should be enabled.  This property is observable.
     */
    isFullscreenEnabled: boolean;
    /**
     * Gets the tooltip.  This property is observable.
     */
    tooltip: string;
    /**
     * Gets or sets the HTML element to place into fullscreen mode when the
     * corresponding button is pressed.
     */
    fullscreenElement: Element;
    /**
     * Gets the Command to toggle fullscreen mode.
     */
    command: Command;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the view model.  Should be called to
     * properly clean up the view model when it is no longer needed.
     */
    destroy(): void;
}

/**
 * A widget for finding addresses and landmarks, and flying the camera to them.  Geocoding is
 * performed using {@link https://cesium.com/cesium-ion/|Cesium ion}.
 * @param options - Object with the following properties:
 * @param options.container - The DOM element or ID that will contain the widget.
 * @param options.scene - The Scene instance to use.
 * @param [options.geocoderServices] - The geocoder services to be used
 * @param [options.autoComplete = true] - True if the geocoder should query as the user types to autocomplete
 * @param [options.flightDuration = 1.5] - The duration of the camera flight to an entered location, in seconds.
 * @param [options.destinationFound = GeocoderViewModel.flyToDestination] - A callback function that is called after a successful geocode.  If not supplied, the default behavior is to fly the camera to the result destination.
 */
export class Geocoder {
    constructor(options: {
        container: Element | string;
        scene: Scene;
        geocoderServices?: GeocoderService[];
        autoComplete?: boolean;
        flightDuration?: number;
        destinationFound?: Geocoder.DestinationFoundFunction;
    });
    /**
     * Gets the parent container.
     */
    container: Element;
    /**
     * Gets the parent container.
     */
    searchSuggestionsContainer: Element;
    /**
     * Gets the view model.
     */
    viewModel: GeocoderViewModel;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
}

export namespace Geocoder {
    /**
     * A function that handles the result of a successful geocode.
     * @param viewModel - The view model.
     * @param destination - The destination result of the geocode.
     */
    type DestinationFoundFunction = (viewModel: GeocoderViewModel, destination: Cartesian3 | Rectangle) => void;
}

/**
 * The view model for the {@link Geocoder} widget.
 * @param options - Object with the following properties:
 * @param options.scene - The Scene instance to use.
 * @param [options.geocoderServices] - Geocoder services to use for geocoding queries.
 *        If more than one are supplied, suggestions will be gathered for the geocoders that support it,
 *        and if no suggestion is selected the result from the first geocoder service wil be used.
 * @param [options.flightDuration] - The duration of the camera flight to an entered location, in seconds.
 * @param [options.destinationFound = GeocoderViewModel.flyToDestination] - A callback function that is called after a successful geocode.  If not supplied, the default behavior is to fly the camera to the result destination.
 */
export class GeocoderViewModel {
    constructor(options: {
        scene: Scene;
        geocoderServices?: GeocoderService[];
        flightDuration?: number;
        destinationFound?: Geocoder.DestinationFoundFunction;
    });
    /**
     * Gets or sets a value indicating if this instance should always show its text input field.
     */
    keepExpanded: boolean;
    /**
     * True if the geocoder should query as the user types to autocomplete
     */
    autoComplete: boolean;
    /**
     * Gets and sets the command called when a geocode destination is found
     */
    destinationFound: Geocoder.DestinationFoundFunction;
    /**
     * Gets a value indicating whether a search is currently in progress.  This property is observable.
     */
    isSearchInProgress: boolean;
    /**
     * Gets or sets the text to search for.  The text can be an address, or longitude, latitude,
     * and optional height, where longitude and latitude are in degrees and height is in meters.
     */
    searchText: string;
    /**
     * Gets or sets the the duration of the camera flight in seconds.
     * A value of zero causes the camera to instantly switch to the geocoding location.
     * The duration will be computed based on the distance when undefined.
     */
    flightDuration: number | undefined;
    /**
     * Gets the event triggered on flight completion.
     */
    complete: Event;
    /**
     * Gets the scene to control.
     */
    scene: Scene;
    /**
     * Gets the Command that is executed when the button is clicked.
     */
    search: Command;
    /**
     * Gets the currently selected geocoder search suggestion
     */
    selectedSuggestion: any;
    /**
     * Gets the list of geocoder search suggestions
     */
    suggestions: object[];
    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
    /**
     * A function to fly to the destination found by a successful geocode.
     */
    static flyToDestination: Geocoder.DestinationFoundFunction;
}

/**
 * A single button widget for returning to the default camera view of the current scene.
 * @param container - The DOM element or ID that will contain the widget.
 * @param scene - The Scene instance to use.
 * @param [duration] - The time, in seconds, it takes to complete the camera flight home.
 */
export class HomeButton {
    constructor(container: Element | string, scene: Scene, duration?: number);
    /**
     * Gets the parent container.
     */
    container: Element;
    /**
     * Gets the view model.
     */
    viewModel: HomeButtonViewModel;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
}

/**
 * The view model for {@link HomeButton}.
 * @param scene - The scene instance to use.
 * @param [duration] - The duration of the camera flight in seconds.
 */
export class HomeButtonViewModel {
    constructor(scene: Scene, duration?: number);
    /**
     * Gets or sets the tooltip.  This property is observable.
     */
    tooltip: string;
    /**
     * Gets the scene to control.
     */
    scene: Scene;
    /**
     * Gets the Command that is executed when the button is clicked.
     */
    command: Command;
    /**
     * Gets or sets the the duration of the camera flight in seconds.
     * A value of zero causes the camera to instantly switch to home view.
     * The duration will be computed based on the distance when undefined.
     */
    duration: number | undefined;
}

/**
 * A widget for displaying information or a description.
 * @param container - The DOM element or ID that will contain the widget.
 */
export class InfoBox {
    constructor(container: Element | string);
    /**
     * Gets the parent container.
     */
    container: Element;
    /**
     * Gets the view model.
     */
    viewModel: InfoBoxViewModel;
    /**
     * Gets the iframe used to display the description.
     */
    frame: HTMLIFrameElement;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
}

/**
 * The view model for {@link InfoBox}.
 */
export class InfoBoxViewModel {
    constructor();
    /**
     * Gets or sets the maximum height of the info box in pixels.  This property is observable.
     */
    maxHeight: number;
    /**
     * Gets or sets whether the camera tracking icon is enabled.
     */
    enableCamera: boolean;
    /**
     * Gets or sets the status of current camera tracking of the selected object.
     */
    isCameraTracking: boolean;
    /**
     * Gets or sets the visibility of the info box.
     */
    showInfo: boolean;
    /**
     * Gets or sets the title text in the info box.
     */
    titleText: string;
    /**
     * Gets or sets the description HTML for the info box.
     */
    description: string;
    /**
     * Gets the SVG path of the camera icon, which can change to be "crossed out" or not.
     */
    cameraIconPath: string;
    /**
     * Gets the maximum height of sections within the info box, minus an offset, in CSS-ready form.
     * @param offset - The offset in pixels.
     */
    maxHeightOffset(offset: number): string;
    /**
     * Gets an {@link Event} that is fired when the user clicks the camera icon.
     */
    cameraClicked: Event;
    /**
     * Gets an {@link Event} that is fired when the user closes the info box.
     */
    closeClicked: Event;
}

/**
 * <p>The NavigationHelpButton is a single button widget for displaying instructions for
 * navigating the globe with the mouse.</p><p style="clear: both;"></p><br/>
 * @example
 * // In HTML head, include a link to the NavigationHelpButton.css stylesheet,
 * // and in the body, include: <div id="navigationHelpButtonContainer"></div>
 *
 * const navigationHelpButton = new Cesium.NavigationHelpButton({
 *     container : 'navigationHelpButtonContainer'
 * });
 * @param options - Object with the following properties:
 * @param options.container - The DOM element or ID that will contain the widget.
 * @param [options.instructionsInitiallyVisible = false] - True if the navigation instructions should initially be visible; otherwise, false.
 */
export class NavigationHelpButton {
    constructor(options: {
        container: Element | string;
        instructionsInitiallyVisible?: boolean;
    });
    /**
     * Gets the parent container.
     */
    container: Element;
    /**
     * Gets the view model.
     */
    viewModel: NavigationHelpButtonViewModel;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
}

/**
 * The view model for {@link NavigationHelpButton}.
 */
export class NavigationHelpButtonViewModel {
    constructor();
    /**
     * Gets or sets whether the instructions are currently shown.  This property is observable.
     */
    showInstructions: boolean;
    /**
     * Gets or sets the tooltip.  This property is observable.
     */
    tooltip: string;
    /**
     * Gets the Command that is executed when the button is clicked.
     */
    command: Command;
    /**
     * Gets the Command that is executed when the mouse instructions should be shown.
     */
    showClick: Command;
    /**
     * Gets the Command that is executed when the touch instructions should be shown.
     */
    showTouch: Command;
}

/**
 * Monitors performance of the application and displays a message if poor performance is detected.
 * @param [options] - Object with the following properties:
 * @param options.container - The DOM element or ID that will contain the widget.
 * @param options.scene - The {@link Scene} for which to monitor performance.
 * @param [options.lowFrameRateMessage = 'This application appears to be performing poorly on your system.  Please try using a different web browser or updating your video drivers.'] - The
 *        message to display when a low frame rate is detected.  The message is interpeted as HTML, so make sure
 *        it comes from a trusted source so that your application is not vulnerable to cross-site scripting attacks.
 */
export class PerformanceWatchdog {
    constructor(options?: {
        container: Element | string;
        scene: Scene;
        lowFrameRateMessage?: string;
    });
    /**
     * Gets the parent container.
     */
    container: Element;
    /**
     * Gets the view model.
     */
    viewModel: PerformanceWatchdogViewModel;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
}

/**
 * The view model for {@link PerformanceWatchdog}.
 * @param [options] - Object with the following properties:
 * @param options.scene - The Scene instance for which to monitor performance.
 * @param [options.lowFrameRateMessage = 'This application appears to be performing poorly on your system.  Please try using a different web browser or updating your video drivers.'] - The
 *        message to display when a low frame rate is detected.  The message is interpeted as HTML, so make sure
 *        it comes from a trusted source so that your application is not vulnerable to cross-site scripting attacks.
 */
export class PerformanceWatchdogViewModel {
    constructor(options?: {
        scene: Scene;
        lowFrameRateMessage?: string;
    });
    /**
     * Gets or sets the message to display when a low frame rate is detected.  This string will be interpreted as HTML.
     */
    lowFrameRateMessage: string;
    /**
     * Gets or sets a value indicating whether the low frame rate message has previously been dismissed by the user.  If it has
     * been dismissed, the message will not be redisplayed, no matter the frame rate.
     */
    lowFrameRateMessageDismissed: boolean;
    /**
     * Gets or sets a value indicating whether the low frame rate message is currently being displayed.
     */
    showingLowFrameRateMessage: boolean;
    /**
     * Gets the {@link Scene} instance for which to monitor performance.
     */
    scene: Scene;
    /**
     * Gets a command that dismisses the low frame rate message.  Once it is dismissed, the message
     * will not be redisplayed.
     */
    dismissMessage: Command;
}

/**
 * The ProjectionPicker is a single button widget for switching between perspective and orthographic projections.
 * @example
 * // In HTML head, include a link to the ProjectionPicker.css stylesheet,
 * // and in the body, include: <div id="projectionPickerContainer"></div>
 * // Note: This code assumes you already have a Scene instance.
 *
 * const projectionPicker = new Cesium.ProjectionPicker('projectionPickerContainer', scene);
 * @param container - The DOM element or ID that will contain the widget.
 * @param scene - The Scene instance to use.
 */
export class ProjectionPicker {
    constructor(container: Element | string, scene: Scene);
    /**
     * Gets the parent container.
     */
    container: Element;
    /**
     * Gets the view model.
     */
    viewModel: ProjectionPickerViewModel;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
}

/**
 * The view model for {@link ProjectionPicker}.
 * @param scene - The Scene to switch projections.
 */
export class ProjectionPickerViewModel {
    constructor(scene: Scene);
    /**
     * Gets or sets whether the button drop-down is currently visible.  This property is observable.
     */
    dropDownVisible: boolean;
    /**
     * Gets or sets the perspective projection tooltip.  This property is observable.
     */
    tooltipPerspective: string;
    /**
     * Gets or sets the orthographic projection tooltip.  This property is observable.
     */
    tooltipOrthographic: string;
    /**
     * Gets the currently active tooltip.  This property is observable.
     */
    selectedTooltip: string;
    /**
     * Gets or sets the current SceneMode.  This property is observable.
     */
    sceneMode: SceneMode;
    /**
     * Gets the scene
     */
    scene: Scene;
    /**
     * Gets the command to toggle the drop down box.
     */
    toggleDropDown: Command;
    /**
     * Gets the command to switch to a perspective projection.
     */
    switchToPerspective: Command;
    /**
     * Gets the command to switch to orthographic projection.
     */
    switchToOrthographic: Command;
    /**
     * Gets whether the scene is currently using an orthographic projection.
     */
    isOrthographicProjection: Command;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the view model.
     */
    destroy(): void;
}

/**
 * <img src="Images/sceneModePicker.png" style="float: left; margin-right: 10px;" width="44" height="116" />
 * <p>The SceneModePicker is a single button widget for switching between scene modes;
 * shown to the left in its expanded state. Programatic switching of scene modes will
 * be automatically reflected in the widget as long as the specified Scene
 * is used to perform the change.</p><p style="clear: both;"></p><br/>
 * @example
 * // In HTML head, include a link to the SceneModePicker.css stylesheet,
 * // and in the body, include: <div id="sceneModePickerContainer"></div>
 * // Note: This code assumes you already have a Scene instance.
 *
 * const sceneModePicker = new Cesium.SceneModePicker('sceneModePickerContainer', scene);
 * @param container - The DOM element or ID that will contain the widget.
 * @param scene - The Scene instance to use.
 * @param [duration = 2.0] - The time, in seconds, it takes for the scene to transition.
 */
export class SceneModePicker {
    constructor(container: Element | string, scene: Scene, duration?: number);
    /**
     * Gets the parent container.
     */
    container: Element;
    /**
     * Gets the view model.
     */
    viewModel: SceneModePickerViewModel;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
}

/**
 * The view model for {@link SceneModePicker}.
 * @param scene - The Scene to morph
 * @param [duration = 2.0] - The duration of scene morph animations, in seconds
 */
export class SceneModePickerViewModel {
    constructor(scene: Scene, duration?: number);
    /**
     * Gets or sets the current SceneMode.  This property is observable.
     */
    sceneMode: SceneMode;
    /**
     * Gets or sets whether the button drop-down is currently visible.  This property is observable.
     */
    dropDownVisible: boolean;
    /**
     * Gets or sets the 2D tooltip.  This property is observable.
     */
    tooltip2D: string;
    /**
     * Gets or sets the 3D tooltip.  This property is observable.
     */
    tooltip3D: string;
    /**
     * Gets or sets the Columbus View tooltip.  This property is observable.
     */
    tooltipColumbusView: string;
    /**
     * Gets the currently active tooltip.  This property is observable.
     */
    selectedTooltip: string;
    /**
     * Gets the scene
     */
    scene: Scene;
    /**
     * Gets or sets the the duration of scene mode transition animations in seconds.
     * A value of zero causes the scene to instantly change modes.
     */
    duration: number;
    /**
     * Gets the command to toggle the drop down box.
     */
    toggleDropDown: Command;
    /**
     * Gets the command to morph to 2D.
     */
    morphTo2D: Command;
    /**
     * Gets the command to morph to 3D.
     */
    morphTo3D: Command;
    /**
     * Gets the command to morph to Columbus View.
     */
    morphToColumbusView: Command;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the view model.
     */
    destroy(): void;
}

/**
 * A widget for displaying an indicator on a selected object.
 * @param container - The DOM element or ID that will contain the widget.
 * @param scene - The Scene instance to use.
 */
export class SelectionIndicator {
    constructor(container: Element | string, scene: Scene);
    /**
     * Gets the parent container.
     */
    container: Element;
    /**
     * Gets the view model.
     */
    viewModel: SelectionIndicatorViewModel;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
}

/**
 * The view model for {@link SelectionIndicator}.
 * @param scene - The scene instance to use for screen-space coordinate conversion.
 * @param selectionIndicatorElement - The element containing all elements that make up the selection indicator.
 * @param container - The DOM element that contains the widget.
 */
export class SelectionIndicatorViewModel {
    constructor(scene: Scene, selectionIndicatorElement: Element, container: Element);
    /**
     * Gets or sets the world position of the object for which to display the selection indicator.
     */
    position: Cartesian3;
    /**
     * Gets or sets the visibility of the selection indicator.
     */
    showSelection: boolean;
    /**
     * Gets the visibility of the position indicator.  This can be false even if an
     * object is selected, when the selected object has no position.
     */
    isVisible: boolean;
    /**
     * Gets or sets the function for converting the world position of the object to the screen space position.
     * @example
     * selectionIndicatorViewModel.computeScreenSpacePosition = function(position, result) {
     *     return Cesium.SceneTransforms.wgs84ToWindowCoordinates(scene, position, result);
     * };
     */
    computeScreenSpacePosition: SelectionIndicatorViewModel.ComputeScreenSpacePosition;
    /**
     * Updates the view of the selection indicator to match the position and content properties of the view model.
     * This function should be called as part of the render loop.
     */
    update(): void;
    /**
     * Animate the indicator to draw attention to the selection.
     */
    animateAppear(): void;
    /**
     * Animate the indicator to release the selection.
     */
    animateDepart(): void;
    /**
     * Gets the HTML element containing the selection indicator.
     */
    container: Element;
    /**
     * Gets the HTML element that holds the selection indicator.
     */
    selectionIndicatorElement: Element;
    /**
     * Gets the scene being used.
     */
    scene: Scene;
}

export namespace SelectionIndicatorViewModel {
    /**
     * A function that converts the world position of an object to a screen space position.
     * @param position - The position in WGS84 (world) coordinates.
     * @param result - An object to return the input position transformed to window coordinates.
     */
    type ComputeScreenSpacePosition = (position: Cartesian3, result: Cartesian2) => Cartesian2;
}

/**
 * A Knockout binding handler that creates a DOM element for a single SVG path.
 * This binding handler will be registered as cesiumSvgPath.
 *
 * <p>
 * The parameter to this binding is an object with the following properties:
 * </p>
 *
 * <ul>
 * <li>path: The SVG path as a string.</li>
 * <li>width: The width of the SVG path with no transformations applied.</li>
 * <li>height: The height of the SVG path with no transformations applied.</li>
 * <li>css: Optional. A string containing additional CSS classes to apply to the SVG. 'cesium-svgPath-svg' is always applied.</li>
 * </ul>
 * @example
 * // Create an SVG as a child of a div
 * <div data-bind="cesiumSvgPath: { path: 'M 100 100 L 300 100 L 200 300 z', width: 28, height: 28 }"></div>
 *
 * // parameters can be observable from the view model
 * <div data-bind="cesiumSvgPath: { path: currentPath, width: currentWidth, height: currentHeight }"></div>
 *
 * // or the whole object can be observable from the view model
 * <div data-bind="cesiumSvgPath: svgPathOptions"></div>
 */
export namespace SvgPathBindingHandler {
    function register(): void;
}

/**
 * The Timeline is a widget for displaying and controlling the current scene time.
 * @param container - The parent HTML container node for this widget.
 * @param clock - The clock to use.
 */
export class Timeline {
    constructor(container: Element, clock: Clock);
    /**
     * Gets the parent container.
     */
    container: Element;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
    /**
     * Sets the view to the provided times.
     * @param startTime - The start time.
     * @param stopTime - The stop time.
     */
    zoomTo(startTime: JulianDate, stopTime: JulianDate): void;
    /**
     * Resizes the widget to match the container size.
     */
    resize(): void;
}

/**
 * A view model which exposes the properties of a toggle button.
 * @param command - The command which will be executed when the button is toggled.
 * @param [options] - Object with the following properties:
 * @param [options.toggled = false] - A boolean indicating whether the button should be initially toggled.
 * @param [options.tooltip = ''] - A string containing the button's tooltip.
 */
export class ToggleButtonViewModel {
    constructor(command: Command, options?: {
        toggled?: boolean;
        tooltip?: string;
    });
    /**
     * Gets or sets whether the button is currently toggled.  This property is observable.
     */
    toggled: boolean;
    /**
     * Gets or sets the button's tooltip.  This property is observable.
     */
    tooltip: string;
    /**
     * Gets the command which will be executed when the button is toggled.
     */
    command: Command;
}

export namespace Viewer {
    /**
     * Initialization options for the Viewer constructor
     * @property [animation = true] - If set to false, the Animation widget will not be created.
     * @property [baseLayerPicker = true] - If set to false, the BaseLayerPicker widget will not be created.
     * @property [fullscreenButton = true] - If set to false, the FullscreenButton widget will not be created.
     * @property [vrButton = false] - If set to true, the VRButton widget will be created.
     * @property [geocoder = true] - If set to false, the Geocoder widget will not be created.
     * @property [homeButton = true] - If set to false, the HomeButton widget will not be created.
     * @property [infoBox = true] - If set to false, the InfoBox widget will not be created.
     * @property [sceneModePicker = true] - If set to false, the SceneModePicker widget will not be created.
     * @property [selectionIndicator = true] - If set to false, the SelectionIndicator widget will not be created.
     * @property [timeline = true] - If set to false, the Timeline widget will not be created.
     * @property [navigationHelpButton = true] - If set to false, the navigation help button will not be created.
     * @property [navigationInstructionsInitiallyVisible = true] - True if the navigation instructions should initially be visible, or false if the should not be shown until the user explicitly clicks the button.
     * @property [scene3DOnly = false] - When <code>true</code>, each geometry instance will only be rendered in 3D to save GPU memory.
     * @property [shouldAnimate = false] - <code>true</code> if the clock should attempt to advance simulation time by default, <code>false</code> otherwise.  This option takes precedence over setting {@link Viewer#clockViewModel}.
     * @property [clockViewModel = new ClockViewModel(clock)] - The clock view model to use to control current time.
     * @property [selectedImageryProviderViewModel] - The view model for the current base imagery layer, if not supplied the first available base layer is used.  This value is only valid if `baseLayerPicker` is set to true.
     * @property [imageryProviderViewModels = createDefaultImageryProviderViewModels()] - The array of ProviderViewModels to be selectable from the BaseLayerPicker.  This value is only valid if `baseLayerPicker` is set to true.
     * @property [selectedTerrainProviderViewModel] - The view model for the current base terrain layer, if not supplied the first available base layer is used.  This value is only valid if `baseLayerPicker` is set to true.
     * @property [terrainProviderViewModels = createDefaultTerrainProviderViewModels()] - The array of ProviderViewModels to be selectable from the BaseLayerPicker.  This value is only valid if `baseLayerPicker` is set to true.
     * @property [imageryProvider = createWorldImagery()] - The imagery provider to use.  This value is only valid if `baseLayerPicker` is set to false.
     * @property [terrainProvider = new EllipsoidTerrainProvider()] - The terrain provider to use
     * @property [skyBox] - The skybox used to render the stars.  When <code>undefined</code>, the default stars are used. If set to <code>false</code>, no skyBox, Sun, or Moon will be added.
     * @property [skyAtmosphere] - Blue sky, and the glow around the Earth's limb.  Set to <code>false</code> to turn it off.
     * @property [fullscreenElement = document.body] - The element or id to be placed into fullscreen mode when the full screen button is pressed.
     * @property [useDefaultRenderLoop = true] - True if this widget should control the render loop, false otherwise.
     * @property [targetFrameRate] - The target frame rate when using the default render loop.
     * @property [showRenderLoopErrors = true] - If true, this widget will automatically display an HTML panel to the user containing the error, if a render loop error occurs.
     * @property [useBrowserRecommendedResolution = true] - If true, render at the browser's recommended resolution and ignore <code>window.devicePixelRatio</code>.
     * @property [automaticallyTrackDataSourceClocks = true] - If true, this widget will automatically track the clock settings of newly added DataSources, updating if the DataSource's clock changes.  Set this to false if you want to configure the clock independently.
     * @property [contextOptions] - Context and WebGL creation properties corresponding to <code>options</code> passed to {@link Scene}.
     * @property [sceneMode = SceneMode.SCENE3D] - The initial scene mode.
     * @property [mapProjection = new GeographicProjection()] - The map projection to use in 2D and Columbus View modes.
     * @property [globe = new Globe(mapProjection.ellipsoid)] - The globe to use in the scene.  If set to <code>false</code>, no globe will be added.
     * @property [orderIndependentTranslucency = true] - If true and the configuration supports it, use order independent translucency.
     * @property [creditContainer] - The DOM element or ID that will contain the {@link CreditDisplay}.  If not specified, the credits are added to the bottom of the widget itself.
     * @property [creditViewport] - The DOM element or ID that will contain the credit pop up created by the {@link CreditDisplay}.  If not specified, it will appear over the widget itself.
     * @property [dataSources = new DataSourceCollection()] - The collection of data sources visualized by the widget.  If this parameter is provided,
     *                               the instance is assumed to be owned by the caller and will not be destroyed when the viewer is destroyed.
     * @property [shadows = false] - Determines if shadows are cast by light sources.
     * @property [terrainShadows = ShadowMode.RECEIVE_ONLY] - Determines if the terrain casts or receives shadows from light sources.
     * @property [mapMode2D = MapMode2D.INFINITE_SCROLL] - Determines if the 2D map is rotatable or can be scrolled infinitely in the horizontal direction.
     * @property [projectionPicker = false] - If set to true, the ProjectionPicker widget will be created.
     * @property [blurActiveElementOnCanvasFocus = true] - If true, the active element will blur when the viewer's canvas is clicked. Setting this to false is useful for cases when the canvas is clicked only for retrieving position or an entity data without actually meaning to set the canvas to be the active element.
     * @property [requestRenderMode = false] - If true, rendering a frame will only occur when needed as determined by changes within the scene. Enabling reduces the CPU/GPU usage of your application and uses less battery on mobile, but requires using {@link Scene#requestRender} to render a new frame explicitly in this mode. This will be necessary in many cases after making changes to the scene in other parts of the API. See {@link https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/|Improving Performance with Explicit Rendering}.
     * @property [maximumRenderTimeChange = 0.0] - If requestRenderMode is true, this value defines the maximum change in simulation time allowed before a render is requested. See {@link https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/|Improving Performance with Explicit Rendering}.
     * @property [depthPlaneEllipsoidOffset = 0.0] - Adjust the DepthPlane to address rendering artefacts below ellipsoid zero elevation.
     * @property [msaaSamples = 1] - If provided, this value controls the rate of multisample antialiasing. Typical multisampling rates are 2, 4, and sometimes 8 samples per pixel. Higher sampling rates of MSAA may impact performance in exchange for improved visual quality. This value only applies to WebGL2 contexts that support multisample render targets.
     */
    type ConstructorOptions = {
        animation?: boolean;
        baseLayerPicker?: boolean;
        fullscreenButton?: boolean;
        vrButton?: boolean;
        geocoder?: boolean | GeocoderService[];
        homeButton?: boolean;
        infoBox?: boolean;
        sceneModePicker?: boolean;
        selectionIndicator?: boolean;
        timeline?: boolean;
        navigationHelpButton?: boolean;
        navigationInstructionsInitiallyVisible?: boolean;
        scene3DOnly?: boolean;
        shouldAnimate?: boolean;
        clockViewModel?: ClockViewModel;
        selectedImageryProviderViewModel?: ProviderViewModel;
        imageryProviderViewModels?: ProviderViewModel[];
        selectedTerrainProviderViewModel?: ProviderViewModel;
        terrainProviderViewModels?: ProviderViewModel[];
        imageryProvider?: ImageryProvider;
        terrainProvider?: TerrainProvider;
        skyBox?: SkyBox | false;
        skyAtmosphere?: SkyAtmosphere | false;
        fullscreenElement?: Element | string;
        useDefaultRenderLoop?: boolean;
        targetFrameRate?: number;
        showRenderLoopErrors?: boolean;
        useBrowserRecommendedResolution?: boolean;
        automaticallyTrackDataSourceClocks?: boolean;
        contextOptions?: any;
        sceneMode?: SceneMode;
        mapProjection?: MapProjection;
        globe?: Globe | false;
        orderIndependentTranslucency?: boolean;
        creditContainer?: Element | string;
        creditViewport?: Element | string;
        dataSources?: DataSourceCollection;
        shadows?: boolean;
        terrainShadows?: ShadowMode;
        mapMode2D?: MapMode2D;
        projectionPicker?: boolean;
        blurActiveElementOnCanvasFocus?: boolean;
        requestRenderMode?: boolean;
        maximumRenderTimeChange?: number;
        depthPlaneEllipsoidOffset?: number;
        msaaSamples?: number;
    };
    /**
     * A function that augments a Viewer instance with additional functionality.
     * @param viewer - The viewer instance.
     * @param options - Options object to be passed to the mixin function.
     */
    type ViewerMixin = (viewer: Viewer, options: any) => void;
}

/**
 * A base widget for building applications.  It composites all of the standard Cesium widgets into one reusable package.
 * The widget can always be extended by using mixins, which add functionality useful for a variety of applications.
 * @example
 * //Initialize the viewer widget with several custom options and mixins.
 * const viewer = new Cesium.Viewer('cesiumContainer', {
 *     //Start in Columbus Viewer
 *     sceneMode : Cesium.SceneMode.COLUMBUS_VIEW,
 *     //Use Cesium World Terrain
 *     terrainProvider : Cesium.createWorldTerrain(),
 *     //Hide the base layer picker
 *     baseLayerPicker : false,
 *     //Use OpenStreetMaps
 *     imageryProvider : new Cesium.OpenStreetMapImageryProvider({
 *         url : 'https://a.tile.openstreetmap.org/'
 *     }),
 *     skyBox : new Cesium.SkyBox({
 *         sources : {
 *           positiveX : 'stars/TychoSkymapII.t3_08192x04096_80_px.jpg',
 *           negativeX : 'stars/TychoSkymapII.t3_08192x04096_80_mx.jpg',
 *           positiveY : 'stars/TychoSkymapII.t3_08192x04096_80_py.jpg',
 *           negativeY : 'stars/TychoSkymapII.t3_08192x04096_80_my.jpg',
 *           positiveZ : 'stars/TychoSkymapII.t3_08192x04096_80_pz.jpg',
 *           negativeZ : 'stars/TychoSkymapII.t3_08192x04096_80_mz.jpg'
 *         }
 *     }),
 *     // Show Columbus View map with Web Mercator projection
 *     mapProjection : new Cesium.WebMercatorProjection()
 * });
 *
 * //Add basic drag and drop functionality
 * viewer.extend(Cesium.viewerDragDropMixin);
 *
 * //Show a pop-up alert if we encounter an error when processing a dropped file
 * viewer.dropError.addEventListener(function(dropHandler, name, error) {
 *     console.log(error);
 *     window.alert(error);
 * });
 * @param container - The DOM element or ID that will contain the widget.
 * @param [options] - Object describing initialization options
 */
export class Viewer {
    constructor(container: Element | string, options?: Viewer.ConstructorOptions);
    /**
     * Gets the parent container.
     */
    readonly container: Element;
    /**
     * Gets the DOM element for the area at the bottom of the window containing the
     * {@link CreditDisplay} and potentially other things.
     */
    readonly bottomContainer: Element;
    /**
     * Gets the CesiumWidget.
     */
    readonly cesiumWidget: CesiumWidget;
    /**
     * Gets the selection indicator.
     */
    readonly selectionIndicator: SelectionIndicator;
    /**
     * Gets the info box.
     */
    readonly infoBox: InfoBox;
    /**
     * Gets the Geocoder.
     */
    readonly geocoder: Geocoder;
    /**
     * Gets the HomeButton.
     */
    readonly homeButton: HomeButton;
    /**
     * Gets the SceneModePicker.
     */
    readonly sceneModePicker: SceneModePicker;
    /**
     * Gets the ProjectionPicker.
     */
    readonly projectionPicker: ProjectionPicker;
    /**
     * Gets the BaseLayerPicker.
     */
    readonly baseLayerPicker: BaseLayerPicker;
    /**
     * Gets the NavigationHelpButton.
     */
    readonly navigationHelpButton: NavigationHelpButton;
    /**
     * Gets the Animation widget.
     */
    readonly animation: Animation;
    /**
     * Gets the Timeline widget.
     */
    readonly timeline: Timeline;
    /**
     * Gets the FullscreenButton.
     */
    readonly fullscreenButton: FullscreenButton;
    /**
     * Gets the VRButton.
     */
    readonly vrButton: VRButton;
    /**
     * Gets the display used for {@link DataSource} visualization.
     */
    readonly dataSourceDisplay: DataSourceDisplay;
    /**
     * Gets the collection of entities not tied to a particular data source.
     * This is a shortcut to [dataSourceDisplay.defaultDataSource.entities]{@link Viewer#dataSourceDisplay}.
     */
    readonly entities: EntityCollection;
    /**
     * Gets the set of {@link DataSource} instances to be visualized.
     */
    readonly dataSources: DataSourceCollection;
    /**
     * Gets the canvas.
     */
    readonly canvas: HTMLCanvasElement;
    /**
     * Gets the scene.
     */
    readonly scene: Scene;
    /**
     * Determines if shadows are cast by light sources.
     */
    shadows: boolean;
    /**
     * Determines if the terrain casts or shadows from light sources.
     */
    terrainShadows: ShadowMode;
    /**
     * Get the scene's shadow map
     */
    readonly shadowMap: ShadowMap;
    /**
     * Gets the collection of image layers that will be rendered on the globe.
     */
    readonly imageryLayers: ImageryLayerCollection;
    /**
     * The terrain provider providing surface geometry for the globe.
     */
    terrainProvider: TerrainProvider;
    /**
     * Gets the camera.
     */
    readonly camera: Camera;
    /**
     * Gets the post-process stages.
     */
    readonly postProcessStages: PostProcessStageCollection;
    /**
     * Gets the clock.
     */
    readonly clock: Clock;
    /**
     * Gets the clock view model.
     */
    readonly clockViewModel: ClockViewModel;
    /**
     * Gets the screen space event handler.
     */
    readonly screenSpaceEventHandler: ScreenSpaceEventHandler;
    /**
     * Gets or sets the target frame rate of the widget when <code>useDefaultRenderLoop</code>
     * is true. If undefined, the browser's requestAnimationFrame implementation
     * determines the frame rate.  If defined, this value must be greater than 0.  A value higher
     * than the underlying requestAnimationFrame implementation will have no effect.
     */
    targetFrameRate: number;
    /**
     * Gets or sets whether or not this widget should control the render loop.
     * If true the widget will use requestAnimationFrame to
     * perform rendering and resizing of the widget, as well as drive the
     * simulation clock. If set to false, you must manually call the
     * <code>resize</code>, <code>render</code> methods
     * as part of a custom render loop.  If an error occurs during rendering, {@link Scene}'s
     * <code>renderError</code> event will be raised and this property
     * will be set to false.  It must be set back to true to continue rendering
     * after the error.
     */
    useDefaultRenderLoop: boolean;
    /**
     * Gets or sets a scaling factor for rendering resolution.  Values less than 1.0 can improve
     * performance on less powerful devices while values greater than 1.0 will render at a higher
     * resolution and then scale down, resulting in improved visual fidelity.
     * For example, if the widget is laid out at a size of 640x480, setting this value to 0.5
     * will cause the scene to be rendered at 320x240 and then scaled up while setting
     * it to 2.0 will cause the scene to be rendered at 1280x960 and then scaled down.
     */
    resolutionScale: number;
    /**
     * Boolean flag indicating if the browser's recommended resolution is used.
     * If true, the browser's device pixel ratio is ignored and 1.0 is used instead,
     * effectively rendering based on CSS pixels instead of device pixels. This can improve
     * performance on less powerful devices that have high pixel density. When false, rendering
     * will be in device pixels. {@link Viewer#resolutionScale} will still take effect whether
     * this flag is true or false.
     */
    useBrowserRecommendedResolution: boolean;
    /**
     * Gets or sets whether or not data sources can temporarily pause
     * animation in order to avoid showing an incomplete picture to the user.
     * For example, if asynchronous primitives are being processed in the
     * background, the clock will not advance until the geometry is ready.
     */
    allowDataSourcesToSuspendAnimation: boolean;
    /**
     * Gets or sets the Entity instance currently being tracked by the camera.
     */
    trackedEntity: Entity | undefined;
    /**
     * Gets or sets the object instance for which to display a selection indicator.
     *
     * If a user interactively picks a Cesium3DTilesFeature instance, then this property
     * will contain a transient Entity instance with a property named "feature" that is
     * the instance that was picked.
     */
    selectedEntity: Entity | undefined;
    /**
     * Gets the event that is raised when the selected entity changes.
     */
    readonly selectedEntityChanged: Event;
    /**
     * Gets the event that is raised when the tracked entity changes.
     */
    readonly trackedEntityChanged: Event;
    /**
     * Gets or sets the data source to track with the viewer's clock.
     */
    clockTrackedDataSource: DataSource;
    /**
     * Extends the base viewer functionality with the provided mixin.
     * A mixin may add additional properties, functions, or other behavior
     * to the provided viewer instance.
     * @param mixin - The Viewer mixin to add to this instance.
     * @param [options] - The options object to be passed to the mixin function.
     */
    extend(mixin: Viewer.ViewerMixin, options?: any): void;
    /**
     * Resizes the widget to match the container size.
     * This function is called automatically as needed unless
     * <code>useDefaultRenderLoop</code> is set to false.
     */
    resize(): void;
    /**
     * This forces the widget to re-think its layout, including
     * widget sizes and credit placement.
     */
    forceResize(): void;
    /**
     * Renders the scene.  This function is called automatically
     * unless <code>useDefaultRenderLoop</code> is set to false;
     */
    render(): void;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
    /**
     * Asynchronously sets the camera to view the provided entity, entities, or data source.
     * If the data source is still in the process of loading or the visualization is otherwise still loading,
     * this method waits for the data to be ready before performing the zoom.
     *
     * <p>The offset is heading/pitch/range in the local east-north-up reference frame centered at the center of the bounding sphere.
     * The heading and the pitch angles are defined in the local east-north-up reference frame.
     * The heading is the angle from y axis and increasing towards the x axis. Pitch is the rotation from the xy-plane. Positive pitch
     * angles are above the plane. Negative pitch angles are below the plane. The range is the distance from the center. If the range is
     * zero, a range will be computed such that the whole bounding sphere is visible.</p>
     *
     * <p>In 2D, there must be a top down view. The camera will be placed above the target looking down. The height above the
     * target will be the range. The heading will be determined from the offset. If the heading cannot be
     * determined from the offset, the heading will be north.</p>
     * @param target - The entity, array of entities, entity collection, data source, Cesium3DTileset, point cloud, or imagery layer to view. You can also pass a promise that resolves to one of the previously mentioned types.
     * @param [offset] - The offset from the center of the entity in the local east-north-up reference frame.
     * @returns A Promise that resolves to true if the zoom was successful or false if the target is not currently visualized in the scene or the zoom was cancelled.
     */
    zoomTo(target: Entity | Entity[] | EntityCollection | DataSource | ImageryLayer | Cesium3DTileset | TimeDynamicPointCloud | Promise<Entity | Entity[] | EntityCollection | DataSource | ImageryLayer | Cesium3DTileset | TimeDynamicPointCloud>, offset?: HeadingPitchRange): Promise<boolean>;
    /**
     * Flies the camera to the provided entity, entities, or data source.
     * If the data source is still in the process of loading or the visualization is otherwise still loading,
     * this method waits for the data to be ready before performing the flight.
     *
     * <p>The offset is heading/pitch/range in the local east-north-up reference frame centered at the center of the bounding sphere.
     * The heading and the pitch angles are defined in the local east-north-up reference frame.
     * The heading is the angle from y axis and increasing towards the x axis. Pitch is the rotation from the xy-plane. Positive pitch
     * angles are above the plane. Negative pitch angles are below the plane. The range is the distance from the center. If the range is
     * zero, a range will be computed such that the whole bounding sphere is visible.</p>
     *
     * <p>In 2D, there must be a top down view. The camera will be placed above the target looking down. The height above the
     * target will be the range. The heading will be determined from the offset. If the heading cannot be
     * determined from the offset, the heading will be north.</p>
     * @param target - The entity, array of entities, entity collection, data source, Cesium3DTileset, point cloud, or imagery layer to view. You can also pass a promise that resolves to one of the previously mentioned types.
     * @param [options] - Object with the following properties:
     * @param [options.duration = 3.0] - The duration of the flight in seconds.
     * @param [options.maximumHeight] - The maximum height at the peak of the flight.
     * @param [options.offset] - The offset from the target in the local east-north-up reference frame centered at the target.
     * @returns A Promise that resolves to true if the flight was successful or false if the target is not currently visualized in the scene or the flight was cancelled. //TODO: Cleanup entity mentions
     */
    flyTo(target: Entity | Entity[] | EntityCollection | DataSource | ImageryLayer | Cesium3DTileset | TimeDynamicPointCloud | Promise<Entity | Entity[] | EntityCollection | DataSource | ImageryLayer | Cesium3DTileset | TimeDynamicPointCloud>, options?: {
        duration?: number;
        maximumHeight?: number;
        offset?: HeadingPitchRange;
    }): Promise<boolean>;
}

/**
 * A mixin which adds the {@link Cesium3DTilesInspector} widget to the {@link Viewer} widget.
 * Rather than being called directly, this function is normally passed as
 * a parameter to {@link Viewer#extend}, as shown in the example below.
 * @example
 * const viewer = new Cesium.Viewer('cesiumContainer');
 * viewer.extend(Cesium.viewerCesium3DTilesInspectorMixin);
 * @param viewer - The viewer instance.
 */
export function viewerCesium3DTilesInspectorMixin(viewer: Viewer): void;

/**
 * A mixin which adds the CesiumInspector widget to the Viewer widget.
 * Rather than being called directly, this function is normally passed as
 * a parameter to {@link Viewer#extend}, as shown in the example below.
 * @example
 * const viewer = new Cesium.Viewer('cesiumContainer');
 * viewer.extend(Cesium.viewerCesiumInspectorMixin);
 * @param viewer - The viewer instance.
 */
export function viewerCesiumInspectorMixin(viewer: Viewer): void;

/**
 * A mixin which adds default drag and drop support for CZML files to the Viewer widget.
 * Rather than being called directly, this function is normally passed as
 * a parameter to {@link Viewer#extend}, as shown in the example below.
 * @example
 * // Add basic drag and drop support and pop up an alert window on error.
 * const viewer = new Cesium.Viewer('cesiumContainer');
 * viewer.extend(Cesium.viewerDragDropMixin);
 * viewer.dropError.addEventListener(function(viewerArg, source, error) {
 *     window.alert('Error processing ' + source + ':' + error);
 * });
 * @param viewer - The viewer instance.
 * @param [options] - Object with the following properties:
 * @param [options.dropTarget = viewer.container] - The DOM element which will serve as the drop target.
 * @param [options.clearOnDrop = true] - When true, dropping files will clear all existing data sources first, when false, new data sources will be loaded after the existing ones.
 * @param [options.flyToOnDrop = true] - When true, dropping files will fly to the data source once it is loaded.
 * @param [options.clampToGround = true] - When true, datasources are clamped to the ground.
 * @param [options.proxy] - The proxy to be used for KML network links.
 */
export function viewerDragDropMixin(viewer: Viewer, options?: {
    dropTarget?: Element | string;
    clearOnDrop?: boolean;
    flyToOnDrop?: boolean;
    clampToGround?: boolean;
    proxy?: Proxy;
}): void;

/**
 * A mixin which adds the {@link PerformanceWatchdog} widget to the {@link Viewer} widget.
 * Rather than being called directly, this function is normally passed as
 * a parameter to {@link Viewer#extend}, as shown in the example below.
 * @example
 * const viewer = new Cesium.Viewer('cesiumContainer');
 * viewer.extend(Cesium.viewerPerformanceWatchdogMixin, {
 *     lowFrameRateMessage : 'Why is this going so <em>slowly</em>?'
 * });
 * @param viewer - The viewer instance.
 * @param [options] - An object with properties.
 * @param [options.lowFrameRateMessage = 'This application appears to be performing poorly on your system.  Please try using a different web browser or updating your video drivers.'] - The
 *        message to display when a low frame rate is detected.  The message is interpeted as HTML, so make sure
 *        it comes from a trusted source so that your application is not vulnerable to cross-site scripting attacks.
 */
export function viewerPerformanceWatchdogMixin(viewer: Viewer, options?: {
    lowFrameRateMessage?: string;
}): void;

/**
 * A single button widget for toggling vr mode.
 * @param container - The DOM element or ID that will contain the widget.
 * @param scene - The scene.
 * @param [vrElement = document.body] - The element or id to be placed into vr mode.
 */
export class VRButton {
    constructor(container: Element | string, scene: Scene, vrElement?: Element | string);
    /**
     * Gets the parent container.
     */
    container: Element;
    /**
     * Gets the view model.
     */
    viewModel: VRButtonViewModel;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    destroy(): void;
}

/**
 * The view model for {@link VRButton}.
 * @param scene - The scene.
 * @param [vrElement = document.body] - The element or id to be placed into VR mode.
 */
export class VRButtonViewModel {
    constructor(scene: Scene, vrElement?: Element | string);
    /**
     * Gets whether or not VR mode is active.
     */
    isVRMode: boolean;
    /**
     * Gets or sets whether or not VR functionality should be enabled.
     */
    isVREnabled: boolean;
    /**
     * Gets the tooltip.  This property is observable.
     */
    tooltip: string;
    /**
     * Gets or sets the HTML element to place into VR mode when the
     * corresponding button is pressed.
     */
    vrElement: Element;
    /**
     * Gets the Command to toggle VR mode.
     */
    command: Command;
    /**
     * @returns true if the object has been destroyed, false otherwise.
     */
    isDestroyed(): boolean;
    /**
     * Destroys the view model.  Should be called to
     * properly clean up the view model when it is no longer needed.
     */
    destroy(): void;
}


}
