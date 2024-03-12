# Property Texture With Texture Transform

The test data from https://github.com/CesiumGS/cesium/issues/11708 :

It is a glTF asset that only contains a unit square.

It uses the same texture for the base color and for a Property Texture:
The texture just contains 8x8 pixels with increasing 'red' component
values: The red components will be [0 ... 64)*3. (Meaning that the
lower right pixel will have a red value of 63*3=189).

So the base color will be (black ... red), and the property values in
the property texture will be in [0...189] / 255.0 (because this
red component is a 'normalized' UINT8 property).

It uses the same texture transform for both usages of the texture,
namely with an offset of [0.25, 0.25], and a scale of [0.5, 0.5].
