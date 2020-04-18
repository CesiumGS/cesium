import { ColorMaterialProperty } from "../Source/Cesium.js";

function testMaterialDefinitionChanged(property, name, value1, value2) {
  var listener = jasmine.createSpy("listener");
  property.definitionChanged.addEventListener(listener);

  var oldValue = property[name];
  property[name] = new ColorMaterialProperty(value1);
  expect(listener).toHaveBeenCalledWith(
    property,
    name,
    property[name],
    oldValue
  );
  listener.calls.reset();

  property[name].color.setValue(value2);
  expect(listener).toHaveBeenCalledWith(
    property,
    name,
    property[name],
    property[name]
  );
  listener.calls.reset();

  property[name] = property[name];
  expect(listener.calls.count()).toEqual(0);
}
export default testMaterialDefinitionChanged;
