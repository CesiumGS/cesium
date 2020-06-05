import ClippingPolygon from "../../Source/Scene/ClippingPolygon.js";
import PolygonHierarchy from "../../Source/Core/PolygonHierarchy.js";
import Cartesian3 from "../../Source/Core/Cartesian3.js";
import Matrix4 from "../../Source/Core/Matrix4.js";
import BoundingSphere from "../../Source/Core/BoundingSphere.js";
import Cartographic from "../../Source/Core/Cartographic.js";

describe("Scene/ClippingPolygon", function () {
  // prettier-ignore
  var coloradoBoundaryECEF =
  [
    new Cartesian3(-1483132.6118617766, -4586466.1397278225, 4162750.5664251903),
    new Cartesian3(-1306830.1054550062, -4640193.5668967, 4162291.5282076155),
    new Cartesian3(-1170464.5181384478, -4676041.788416427, 4162750.5664251903),
    new Cartesian3(-1006635.362080386, -4714025.799998029, 4162750.5664251903),
    new Cartesian3(-1021730.8265712946, -4784717.146391854, 4078123.8740084106),
    new Cartesian3(-1064162.144338376, -4988089.875097037, 3816931.0243110945),
    new Cartesian3(-1147369.5949660358, -4969234.714178492, 3817416.470178762),
    new Cartesian3(-1263040.64619151, -4941478.523433706, 3816931.0243110945),
    new Cartesian3(-1479968.0924533417, -4880899.1094683, 3816931.024311095),
    new Cartesian3(-1526912.2714726557, -4866034.273129951, 3817416.4701787615),
    new Cartesian3(-1663966.3042978912, -4820888.587201569, 3817416.4701787615),
    new Cartesian3(-1638200.935371567, -4746240.457199701, 3920021.4124960876),
    new Cartesian3(-1637105.4814648873, -4738660.06955747, 3929573.7306454126),
    new Cartesian3(-1617417.1160520257, -4683121.79641693, 4003119.2230556826),
    new Cartesian3(-1573284.5993211386, -4556750.687971856, 4162291.5282076155),
    new Cartesian3(-1483132.6118617766, -4586466.1397278225, 4162750.5664251903)
  ];

  var colorado = new PolygonHierarchy(coloradoBoundaryECEF);
  var boundingSphere = BoundingSphere.fromPoints(coloradoBoundaryECEF);
  var cartographic = Cartographic.fromCartesian(boundingSphere.center);
  var coloradoCenter = Cartographic.toCartesian(cartographic);

  it("constructs with expected default values", function () {
    var clippingPolygon = ClippingPolygon.fromPolygonHierarchies({
      polygonHierarchies: [colorado],
    });

    expect(clippingPolygon.union).toEqual(false);
    expect(clippingPolygon.enabled).toEqual(true);
  });

  it("worldToENU matrix translates from world space to east north up space", function () {
    var clippingPolygon = ClippingPolygon.fromPolygonHierarchies({
      polygonHierarchies: [colorado],
    });

    var worldToENU = clippingPolygon.worldToENU;
    var result = Matrix4.multiplyByPoint(
      worldToENU,
      coloradoCenter,
      new Cartesian3()
    );

    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(0);
  });
});
