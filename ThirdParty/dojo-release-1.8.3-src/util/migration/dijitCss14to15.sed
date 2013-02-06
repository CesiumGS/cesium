#!/bin/sed -f

# Sed script for migration of custom CSS files against dijit 1.4 to run against dijit 1.5
# Usage:
#   $ for file in $(find . -name '*.css' -print)
# do
#   sed -f dijitCss14to15.sed -i .bak $file
# done

# Spinner
s/.dijitSpinnerUpArrowHover .dijitUpArrowButton/.dijitSpinner .dijitUpArrowButtonHover/
s/.dijitSpinnerUpArrowActive .dijitUpArrowButton/.dijitSpinner .dijitUpArrowButtonActive/
s/.dijitSpinnerDownArrowHover .dijitDownArrowButton/.dijitSpinner .dijitDownArrowButtonHover/
s/.dijitSpinnerDownArrowActive .dijitDownArrowButton/.dijitSpinner .dijitDownArrowButtonActive/

# ComboButton
s/.dijitComboButtonHover .dijitButtonContents/.dijitComboButton .dijitButtonContentsHover/
s/.dijitComboButtonActive .dijitButtonContents/.dijitComboButton .dijitButtonContentsActive/
s/.dijitComboButtonDownArrowHover .dijitArrowButton/.dijitComboButton .dijitDownArrowButtonHover/
s/.dijitComboButtonDownArrowActive .dijitArrowButton/.dijitComboButton .dijitDownArrowButtonActive/
s/.dijitComboButtonDownArrowHover .dijitDownArrowButton/.dijitComboButton .dijitDownArrowButtonHover/
s/.dijitComboButtonDownArrowActive .dijitDownArrowButton/.dijitComboButton .dijitDownArrowButtonActive/

# Accordion
s/.dijitAccordionFocused/.dijitAccordionTitleFocused/
s/.dijitAccordionTitle-hover/.dijitAccordionTitleHover/
s/.dijitAccordionTitle-selected/.dijitAccordionTitleSelected/

# TabContainer
s/.dijitTabBtnDisabled/.dijitTabDisabled/

# TabContainer tab close button
s/.dijitTab .closeButton/.dijitTabCloseButton/
s/.dijitTabCloseButton-hover/.dijitTabCloseButtonHover/
s/.dijitTabCloseButtonHover .closeImage/.dijitTabCloseButtonHover/
s/.dijitTab .closeImage/.dijitTabCloseButton/
s/.dijitTab .closeText/.dijitTabCloseText/
s/.dijitTabCloseButtonHover .dijitClosable .closeImage/.dijitTabCloseButtonHover/
s/.dijitTab .dijitClosable .closeImage/.dijitTabCloseButton/
s/.dijitTab .dijitClosable .closeText/.dijitTabCloseText/

# TabContainer: left/right/menu buttons
s/.tabStripButton img/.dijitTabStripIcon/
s/.tabStripMenuButton img/.dijitTabStripMenuIcon/
s/.tabStripSlideButtonLeft img/.dijitTabStripSlideLeftIcon/
s/.tabStripSlideButtonRight img/.dijitTabStripSlideRightIcon/
s/.tabStripButton IMG/.dijitTabStripIcon/
s/.tabStripMenuButton IMG/.dijitTabStripMenuIcon/
s/.tabStripSlideButtonLeft IMG/.dijitTabStripSlideLeftIcon/
s/.tabStripSlideButtonRight IMG/.dijitTabStripSlideRightIcon/

# Dialog
s/.dijitDialogCloseIcon-hover/.dijitDialogCloseIconHover/

# Tree
s/.dijitTreeNodeHover/.dijitTreeRowHover/
s/.dijitTreeNodeSelected/.dijitTreeRowSelected/

# TitlePane
s/.dijitTitlePaneTitle-hover/.dijitTitlePaneTitleHover/

# InlineEditBox
s/.dijitInlineEditBoxDisplayMode-hover/.dijitInlineEditBoxDisplayModeHover/
s/.dijitInlineEditBoxDisplayMode-disabled/.dijitInlineEditBoxDisplayModeDisabled/

# Editor
s/.RichTextEditable/.dijitEditor/