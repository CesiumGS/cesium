import {
  Cartesian2,
  Cartesian3,
  HorizontalOrigin,
  Label,
  LabelStyle,
  NearFarScalar,
  VerticalOrigin,
} from "../../index.js";

describe("Scene/Label", function () {
  it("equals returns true for another equivalent label", function () {
    const label = new Label({
      position: new Cartesian3(1.0, 2.0, 3.0),
      text: "equals",
    });
    const otherLabel = new Label({
      position: new Cartesian3(1.0, 2.0, 3.0),
      text: "equals",
    });

    expect(label.equals(otherLabel)).toEqual(true);
  });

  it("equals returns false for inequivalent label", function () {
    const label = new Label({
      position: new Cartesian3(1.0, 2.0, 3.0),
    });
    const otherLabel = new Label({
      position: new Cartesian3(4.0, 5.0, 6.0),
    });

    expect(label.equals(otherLabel)).toEqual(false);
  });

  it("equals returns false for undefined", function () {
    // This tests the `LabelCollection.equals` function itself, not simple equality.
    const label = new Label();
    expect(label.equals(undefined)).toEqual(false);
  });

  it("can set properties", function () {
    const label = new Label();

    const show = false;
    const position = new Cartesian3(1.0, 2.0, 3.0);
    const text = "abc";
    const font = '24px "Open Sans"';
    const fillColor = {
      red: 2.0,
      green: 3.0,
      blue: 4.0,
      alpha: 1.0,
    };
    const outlineColor = {
      red: 3.0,
      green: 4.0,
      blue: 2.0,
      alpha: 1.0,
    };
    const outlineWidth = 2;
    const style = LabelStyle.FILL_AND_OUTLINE;
    const pixelOffset = new Cartesian2(4.0, 5.0);
    const eyeOffset = new Cartesian3(6.0, 7.0, 8.0);
    const horizontalOrigin = HorizontalOrigin.LEFT;
    const verticalOrigin = VerticalOrigin.BOTTOM;
    const scale = 2.0;
    const translucency = new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0);
    const pixelOffsetScale = new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0);
    const scaleByDistance = new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0);

    label.show = show;
    label.position = position;
    label.text = text;
    label.font = font;
    label.fillColor = fillColor;
    label.outlineColor = outlineColor;
    label.outlineWidth = outlineWidth;
    label.style = style;
    label.pixelOffset = pixelOffset;
    label.eyeOffset = eyeOffset;
    label.horizontalOrigin = horizontalOrigin;
    label.verticalOrigin = verticalOrigin;
    label.scale = scale;
    label.translucencyByDistance = translucency;
    label.pixelOffsetScaleByDistance = pixelOffsetScale;
    label.scaleByDistance = scaleByDistance;

    expect(label.show).toEqual(show);
    expect(label.position).toEqual(position);
    expect(label.text).toEqual(text);
    expect(label.font).toEqual(font);
    expect(label.fillColor).toEqual(fillColor);
    expect(label.outlineColor).toEqual(outlineColor);
    expect(label.outlineWidth).toEqual(outlineWidth);
    expect(label.style).toEqual(style);
    expect(label.pixelOffset).toEqual(pixelOffset);
    expect(label.eyeOffset).toEqual(eyeOffset);
    expect(label.horizontalOrigin).toEqual(horizontalOrigin);
    expect(label.verticalOrigin).toEqual(verticalOrigin);
    expect(label.scale).toEqual(scale);
    expect(label.translucencyByDistance).toEqual(translucency);
    expect(label.pixelOffsetScaleByDistance).toEqual(pixelOffsetScale);
    expect(label.scaleByDistance).toEqual(scaleByDistance);
  });

  it("filterUnsupportedCharacters removes unicode characters from text only if they cause render issues", function () {
    const text = "a😀b";
    const expectedText = "a😀b";
    expect(Label.filterUnsupportedCharacters(text)).toEqual(expectedText);
  });

  it("filterUnsupportedCharacters removes unicode characters from text only if they cause render issues", function () {
    const text = "awe2!$34f❤️b";
    const expectedText = "awe2!$34f❤️b";
    expect(Label.filterUnsupportedCharacters(text)).toEqual(expectedText);
  });

  it("filterUnsupportedCharacters removes unicode characters from text only if they cause render issues", function () {
    const text = "lakneklf\u200fsldknfklf";
    const expectedText = "lakneklfsldknfklf";
    expect(Label.filterUnsupportedCharacters(text)).toEqual(expectedText);
  });

  it("filterUnsupportedCharacters removes unicode characters from text only if they cause render issues", function () {
    const text = "test \u200f - with Right-to-Left Mark (RLM)";
    const expectedText = "test  - with Right-to-Left Mark (RLM)";
    expect(Label.filterUnsupportedCharacters(text)).toEqual(expectedText);
  });

  it("filterUnsupportedCharacters removes unicode characters from text only if they cause render issues", function () {
    const text = "test \u200b - with Zero-Width Space";
    const expectedText = "test  - with Zero-Width Space";
    expect(Label.filterUnsupportedCharacters(text)).toEqual(expectedText);
  });

  it("filterUnsupportedCharacters removes unicode characters from text only if they cause render issues", function () {
    const text = "test \u202a - with Left-to-Right Embedding";
    const expectedText = "test  - with Left-to-Right Embedding";
    expect(Label.filterUnsupportedCharacters(text)).toEqual(expectedText);
  });

  it("filterUnsupportedCharacters removes unicode characters from text only if they cause render issues", function () {
    const text = "test 😀 - Emoji";
    const expectedText = "test 😀 - Emoji";
    expect(Label.filterUnsupportedCharacters(text)).toEqual(expectedText);
  });

  it("filterUnsupportedCharacters removes unicode characters from text only if they cause render issues", function () {
    const text = "test ❤️ - Emoji";
    const expectedText = "test ❤️ - Emoji";
    expect(Label.filterUnsupportedCharacters(text)).toEqual(expectedText);
  });

  it("filterUnsupportedCharacters removes unicode characters from text only if they cause render issues", function () {
    const text = "test 🌍 - Emoji";
    const expectedText = "test 🌍 - Emoji";
    expect(Label.filterUnsupportedCharacters(text)).toEqual(expectedText);
  });

  it("filterUnsupportedCharacters removes unicode characters from text only if they cause render issues", function () {
    const text = "test \u2060 - with Word Joiner";
    const expectedText = "test  - with Word Joiner";
    expect(Label.filterUnsupportedCharacters(text)).toEqual(expectedText);
  });

  it("filterUnsupportedCharacters removes unicode characters from text only if they cause render issues", function () {
    const text = "test \u0000 - with Null Character";
    const expectedText = "test  - with Null Character";
    expect(Label.filterUnsupportedCharacters(text)).toEqual(expectedText);
  });

  it("filterUnsupportedCharacters removes unicode characters from text only if they cause render issues", function () {
    const text = "test \u000E - with Shift Out (SO)";
    const expectedText = "test  - with Shift Out (SO)";
    expect(Label.filterUnsupportedCharacters(text)).toEqual(expectedText);
  });

  it("filterUnsupportedCharacters removes unicode characters from text only if they cause render issues", function () {
    const text = "test \u001F - with Unit Separator (US)";
    const expectedText = "test  - with Unit Separator (US)";
    expect(Label.filterUnsupportedCharacters(text)).toEqual(expectedText);
  });

  it("should not modify text when rightToLeft is false", function () {
    const text = "bla bla bla";
    const label = new Label();
    label.text = text;

    expect(label.text).toEqual(text);
  });

  describe("right to left detection", function () {
    beforeAll(function () {
      Label.enableRightToLeftDetection = true;
    });

    afterAll(function () {
      Label.enableRightToLeftDetection = false;
    });

    it("should not modify text when rightToLeft is true and there are no RTL characters", function () {
      const text = "bla bla bla";
      const label = new Label();
      label.text = text;

      expect(label.text).toEqual(text);
    });

    it("should reverse text when there are only hebrew characters and rightToLeft is true", function () {
      const text = "שלום";
      const expectedText = "םולש";
      const label = new Label();
      label.text = text;

      expect(label.text).toEqual(text);
      expect(label._renderedText).toEqual(expectedText);
    });

    it("should reverse text when there are only arabic characters and rightToLeft is true", function () {
      const text = "مرحبا";
      const expectedText = "ابحرم";
      const label = new Label();
      label.text = text;

      expect(label.text).toEqual(text);
      expect(label._renderedText).toEqual(expectedText);
    });

    it("should reverse part of text when there is mix of right-to-left and other kind of characters and rightToLeft is true", function () {
      const text = 'Master (אדון): "Hello"\nתלמיד (student): "שלום"';
      const expectedText = 'Master (ןודא): "Hello"\n"םולש" :(student) דימלת';
      const label = new Label();
      label.text = text;

      expect(label.text).toEqual(text);
      expect(label._renderedText).toEqual(expectedText);
    });

    it("should reverse all text and replace brackets when there is right-to-left characters and rightToLeft is true", function () {
      const text = "משפט [מורכב] {עם} תווים <מיוחדים special>";
      const expectedText = "<special םידחוימ> םיוות {םע} [בכרומ] טפשמ";
      const label = new Label();
      label.text = text;

      expect(label.text).toEqual(text);
      expect(label._renderedText).toEqual(expectedText);
    });

    it("should reverse only text that detected as rtl text when it begin with non rtl characters when rightToLeft is true", function () {
      const text =
        "(interesting sentence with hebrew characters) שלום(עליך)חביבי.";
      const expectedText =
        "(interesting sentence with hebrew characters) יביבח(ךילע)םולש.";
      const label = new Label();
      label.text = text;

      expect(label.text).toEqual(text);
      expect(label._renderedText).toEqual(expectedText);
    });

    it("should not change text if it contains only non alphanumeric characters when rightToLeft is true", function () {
      const text = "([{- -}])";
      const expectedText = "([{- -}])";
      const label = new Label();
      label.text = text;

      expect(label.text).toEqual(expectedText);
    });

    it("detects characters in the range \\u05D0-\\u05EA", function () {
      const text = "\u05D1\u05D2";
      const expectedText = "\u05D2\u05D1";
      const label = new Label();
      label.text = text;

      expect(label.text).toEqual(text);
      expect(label._renderedText).toEqual(expectedText);
    });

    it("detects characters in the range \\u0600-\\u06FF", function () {
      const text = "\u0601\u0602";
      const expectedText = "\u0602\u0601";
      const label = new Label();
      label.text = text;

      expect(label.text).toEqual(text);
      expect(label._renderedText).toEqual(expectedText);
    });

    it("detects characters in the range \\u0750-\\u077F", function () {
      const text = "\u0751\u0752";
      const expectedText = "\u0752\u0751";
      const label = new Label();
      label.text = text;

      expect(label.text).toEqual(text);
      expect(label._renderedText).toEqual(expectedText);
    });

    it("detects characters in the range \\u08A0-\\u08FF", function () {
      const text = "\u08A1\u08A2";
      const expectedText = "\u08A2\u08A1";
      const label = new Label();
      label.text = text;

      expect(label.text).toEqual(text);
      expect(label._renderedText).toEqual(expectedText);
    });

    it("should reversing correctly non alphabetic characters", function () {
      const text = "A אב: ג\nאב: ג";
      const expectedText = "A ג :בא\nג :בא";
      const label = new Label();
      label.text = text;

      expect(label.text).toEqual(text);
      expect(label._renderedText).toEqual(expectedText);
    });
  });
});
