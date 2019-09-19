import Check from '../Core/Check.js';
import defined from '../Core/defined.js';

    /**
     * A static class with helper functions used by the CesiumInspector and Cesium3DTilesInspector
     * @private
     */
    var InspectorShared = {};

    /**
     * Creates a checkbox component
     * @param {String} labelText The text to display in the checkbox label
     * @param {String} checkedBinding The name of the variable used for checked binding
     * @param {String} [enableBinding] The name of the variable used for enable binding
     * @return {Element}
     */
    InspectorShared.createCheckbox = function (labelText, checkedBinding, enableBinding) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.string('labelText', labelText);
        Check.typeOf.string('checkedBinding', checkedBinding);
        //>>includeEnd('debug');
        var checkboxContainer = document.createElement('div');
        var checkboxLabel = document.createElement('label');
        var checkboxInput = document.createElement('input');
        checkboxInput.type = 'checkbox';

        var binding = 'checked: ' + checkedBinding;
        if (defined(enableBinding)) {
            binding += ', enable: ' + enableBinding;
        }
        checkboxInput.setAttribute('data-bind', binding);
        checkboxLabel.appendChild(checkboxInput);
        checkboxLabel.appendChild(document.createTextNode(labelText));
        checkboxContainer.appendChild(checkboxLabel);
        return checkboxContainer;
    };

    /**
     * Creates a section element
     * @param {Element} panel The parent element
     * @param {String} headerText The text to display at the top of the section
     * @param {String} sectionVisibleBinding The name of the variable used for visible binding
     * @param {String} toggleSectionVisibilityBinding The name of the function used to toggle visibility
     * @return {Element}
     */
    InspectorShared.createSection = function (panel, headerText, sectionVisibleBinding, toggleSectionVisibilityBinding) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('panel', panel);
        Check.typeOf.string('headerText', headerText);
        Check.typeOf.string('sectionVisibleBinding', sectionVisibleBinding);
        Check.typeOf.string('toggleSectionVisibilityBinding', toggleSectionVisibilityBinding);
        //>>includeEnd('debug');
        var section = document.createElement('div');
        section.className = 'cesium-cesiumInspector-section';
        section.setAttribute('data-bind', 'css: { "cesium-cesiumInspector-section-collapsed": !' + sectionVisibleBinding + ' }');
        panel.appendChild(section);

        var sectionHeader = document.createElement('h3');
        sectionHeader.className = 'cesium-cesiumInspector-sectionHeader';
        sectionHeader.appendChild(document.createTextNode(headerText));
        sectionHeader.setAttribute('data-bind', 'click: ' + toggleSectionVisibilityBinding);
        section.appendChild(sectionHeader);

        var sectionContent = document.createElement('div');
        sectionContent.className = 'cesium-cesiumInspector-sectionContent';
        section.appendChild(sectionContent);
        return sectionContent;
    };
export default InspectorShared;
