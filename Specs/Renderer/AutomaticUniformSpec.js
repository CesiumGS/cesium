/*global defineSuite*/
defineSuite([
         '../Specs/createContext',
         '../Specs/destroyContext',
         'Core/Matrix4',
         'Core/PrimitiveType',
         'Renderer/BufferUsage'
     ], 'Renderer/AutomaticUniforms', function(
         createContext,
         destroyContext,
         Matrix4,
         PrimitiveType,
         BufferUsage) {
    "use strict";
    /*global it,expect,beforeEach,afterEach*/

    var context;

    beforeEach(function() {
        context = createContext();
    });

    afterEach(function() {
        destroyContext(context);
    });

    function verifyDraw(fs) {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var sp = context.createShaderProgram(vs, fs);

        var va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        context.clear();
        expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);

        sp = sp.destroy();
        va = va.destroy();
    }

    it('can declare automatic uniforms', function() {
        var fs =
            'uniform ivec4 agi_viewport; ' +
            'void main() { ' +
            '  gl_FragColor = vec4((agi_viewport.x == 0) && (agi_viewport.y == 0) && (agi_viewport.z == 1) && (agi_viewport.w == 1)); ' +
            '}';
        verifyDraw(fs);
    });

    it('has agi_viewport', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4((agi_viewport.x == 0) && (agi_viewport.y == 0) && (agi_viewport.z == 1) && (agi_viewport.w == 1)); ' +
            '}';
        verifyDraw(fs);
    });

    it('has agi_viewportOrthographic', function() {
        var fs =
            'void main() { ' +
            '  bool b0 = (agi_viewportOrthographic[0][0] != 0.0) && (agi_viewportOrthographic[1][0] == 0.0) && (agi_viewportOrthographic[2][0] == 0.0) && (agi_viewportOrthographic[3][0] != 0.0); ' +
            '  bool b1 = (agi_viewportOrthographic[0][1] == 0.0) && (agi_viewportOrthographic[1][1] != 0.0) && (agi_viewportOrthographic[2][1] == 0.0) && (agi_viewportOrthographic[3][1] != 0.0); ' +
            '  bool b2 = (agi_viewportOrthographic[0][2] == 0.0) && (agi_viewportOrthographic[1][2] == 0.0) && (agi_viewportOrthographic[2][2] != 0.0) && (agi_viewportOrthographic[3][2] != 0.0); ' +
            '  bool b3 = (agi_viewportOrthographic[0][3] == 0.0) && (agi_viewportOrthographic[1][3] == 0.0) && (agi_viewportOrthographic[2][3] == 0.0) && (agi_viewportOrthographic[3][3] == 1.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';
        verifyDraw(fs);
    });

    it('has agi_viewportTransformation', function() {
        var fs =
            'void main() { ' +
            '  bool b0 = (agi_viewportTransformation[0][0] != 0.0) && (agi_viewportTransformation[1][0] == 0.0) && (agi_viewportTransformation[2][0] == 0.0) && (agi_viewportTransformation[3][0] != 0.0); ' +
            '  bool b1 = (agi_viewportTransformation[0][1] == 0.0) && (agi_viewportTransformation[1][1] != 0.0) && (agi_viewportTransformation[2][1] == 0.0) && (agi_viewportTransformation[3][1] != 0.0); ' +
            '  bool b2 = (agi_viewportTransformation[0][2] == 0.0) && (agi_viewportTransformation[1][2] == 0.0) && (agi_viewportTransformation[2][2] != 0.0) && (agi_viewportTransformation[3][2] != 0.0); ' +
            '  bool b3 = (agi_viewportTransformation[0][3] == 0.0) && (agi_viewportTransformation[1][3] == 0.0) && (agi_viewportTransformation[2][3] == 0.0) && (agi_viewportTransformation[3][3] == 1.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';
        verifyDraw(fs);
    });

    it('has agi_model', function() {
        var us = context.getUniformState();
        us.setModel(new Matrix4( 1.0,  2.0,  3.0,  4.0,
                                 5.0,  6.0,  7.0,  8.0,
                                 9.0, 10.0, 11.0, 12.0,
                                13.0, 14.0, 15.0, 16.0));
        var fs =
            'void main() { ' +
            '  bool b0 = (agi_model[0][0] ==  1.0) && (agi_model[1][0] ==  2.0) && (agi_model[2][0] ==  3.0) && (agi_model[3][0] ==  4.0); ' +
            '  bool b1 = (agi_model[0][1] ==  5.0) && (agi_model[1][1] ==  6.0) && (agi_model[2][1] ==  7.0) && (agi_model[3][1] ==  8.0); ' +
            '  bool b2 = (agi_model[0][2] ==  9.0) && (agi_model[1][2] == 10.0) && (agi_model[2][2] == 11.0) && (agi_model[3][2] == 12.0); ' +
            '  bool b3 = (agi_model[0][3] == 13.0) && (agi_model[1][3] == 14.0) && (agi_model[2][3] == 15.0) && (agi_model[3][3] == 16.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';
        verifyDraw(fs);
    });

    it('has agi_view', function() {
        var us = context.getUniformState();
        us.setView(new Matrix4( 1.0,  2.0,  3.0,  4.0,
                                5.0,  6.0,  7.0,  8.0,
                                9.0, 10.0, 11.0, 12.0,
                               13.0, 14.0, 15.0, 16.0));

        var fs =
            'void main() { ' +
            '  bool b0 = (agi_view[0][0] ==  1.0) && (agi_view[1][0] ==  2.0) && (agi_view[2][0] ==  3.0) && (agi_view[3][0] ==  4.0); ' +
            '  bool b1 = (agi_view[0][1] ==  5.0) && (agi_view[1][1] ==  6.0) && (agi_view[2][1] ==  7.0) && (agi_view[3][1] ==  8.0); ' +
            '  bool b2 = (agi_view[0][2] ==  9.0) && (agi_view[1][2] == 10.0) && (agi_view[2][2] == 11.0) && (agi_view[3][2] == 12.0); ' +
            '  bool b3 = (agi_view[0][3] == 13.0) && (agi_view[1][3] == 14.0) && (agi_view[2][3] == 15.0) && (agi_view[3][3] == 16.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';
        verifyDraw(fs);
    });

    it('has agi_inverseView', function() {
        var us = context.getUniformState();
        us.setView(new Matrix4(1.0, 0.0, 0.0, 7.0,
                               0.0, 1.0, 0.0, 8.0,
                               0.0, 0.0, 1.0, 9.0,
                               0.0, 0.0, 0.0, 1.0));

        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(' +
            '    (agi_inverseView[0][0] == 1.0) && (agi_inverseView[1][0] == 0.0) && (agi_inverseView[2][0] == 0.0) && ' +
            '    (agi_inverseView[0][1] == 0.0) && (agi_inverseView[1][1] == 1.0) && (agi_inverseView[2][1] == 0.0) && ' +
            '    (agi_inverseView[0][2] == 0.0) && (agi_inverseView[1][2] == 0.0) && (agi_inverseView[2][2] == 1.0) ' +
            '  ); ' +
            '}';
        verifyDraw(fs);
    });

    it('has agi_projection', function() {
        var us = context.getUniformState();
        us.setProjection(new Matrix4( 1.0,  2.0,  3.0,  4.0,
                                      5.0,  6.0,  7.0,  8.0,
                                      9.0, 10.0, 11.0, 12.0,
                                     13.0, 14.0, 15.0, 16.0));

        var fs =
            'void main() { ' +
            '  bool b0 = (agi_projection[0][0] ==  1.0) && (agi_projection[1][0] ==  2.0) && (agi_projection[2][0] ==  3.0) && (agi_projection[3][0] ==  4.0); ' +
            '  bool b1 = (agi_projection[0][1] ==  5.0) && (agi_projection[1][1] ==  6.0) && (agi_projection[2][1] ==  7.0) && (agi_projection[3][1] ==  8.0); ' +
            '  bool b2 = (agi_projection[0][2] ==  9.0) && (agi_projection[1][2] == 10.0) && (agi_projection[2][2] == 11.0) && (agi_projection[3][2] == 12.0); ' +
            '  bool b3 = (agi_projection[0][3] == 13.0) && (agi_projection[1][3] == 14.0) && (agi_projection[2][3] == 15.0) && (agi_projection[3][3] == 16.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';
        verifyDraw(fs);
    });

    it('has agi_inverseProjection', function() {
        var us = context.getUniformState();
        us.setProjection(new Matrix4(1.0, 0.0, 0.0, 1.0,
                                     0.0, 1.0, 0.0, 2.0,
                                     0.0, 0.0, 1.0, 3.0,
                                     0.0, 0.0, 0.0, 1.0));

        var fs =
            'void main() { ' +
            '  bool b0 = (agi_inverseProjection[0][0] == 1.0) && (agi_inverseProjection[1][0] == 0.0) && (agi_inverseProjection[2][0] == 0.0) && (agi_inverseProjection[3][0] == -1.0); ' +
            '  bool b1 = (agi_inverseProjection[0][1] == 0.0) && (agi_inverseProjection[1][1] == 1.0) && (agi_inverseProjection[2][1] == 0.0) && (agi_inverseProjection[3][1] == -2.0); ' +
            '  bool b2 = (agi_inverseProjection[0][2] == 0.0) && (agi_inverseProjection[1][2] == 0.0) && (agi_inverseProjection[2][2] == 1.0) && (agi_inverseProjection[3][2] == -3.0); ' +
            '  bool b3 = (agi_inverseProjection[0][3] == 0.0) && (agi_inverseProjection[1][3] == 0.0) && (agi_inverseProjection[2][3] == 0.0) && (agi_inverseProjection[3][3] ==  1.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';
        verifyDraw(fs);
    });

    it('has agi_infiniteProjection', function() {
        var us = context.getUniformState();
        us.setInfiniteProjection(new Matrix4( 1.0,  2.0,  3.0,  4.0,
                                              5.0,  6.0,  7.0,  8.0,
                                              9.0, 10.0, 11.0, 12.0,
                                             13.0, 14.0, 15.0, 16.0));

        var fs =
            'void main() { ' +
            '  bool b0 = (agi_infiniteProjection[0][0] ==  1.0) && (agi_infiniteProjection[1][0] ==  2.0) && (agi_infiniteProjection[2][0] ==  3.0) && (agi_infiniteProjection[3][0] ==  4.0); ' +
            '  bool b1 = (agi_infiniteProjection[0][1] ==  5.0) && (agi_infiniteProjection[1][1] ==  6.0) && (agi_infiniteProjection[2][1] ==  7.0) && (agi_infiniteProjection[3][1] ==  8.0); ' +
            '  bool b2 = (agi_infiniteProjection[0][2] ==  9.0) && (agi_infiniteProjection[1][2] == 10.0) && (agi_infiniteProjection[2][2] == 11.0) && (agi_infiniteProjection[3][2] == 12.0); ' +
            '  bool b3 = (agi_infiniteProjection[0][3] == 13.0) && (agi_infiniteProjection[1][3] == 14.0) && (agi_infiniteProjection[2][3] == 15.0) && (agi_infiniteProjection[3][3] == 16.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';
        verifyDraw(fs);
    });

    it('has agi_modelView', function() {
        var us = context.getUniformState();
        us.setModel(new Matrix4(2.0, 0.0, 0.0, 0.0,
                                0.0, 2.0, 0.0, 0.0,
                                0.0, 0.0, 2.0, 0.0,
                                0.0, 0.0, 0.0, 1.0));
        us.setView(new Matrix4(1.0, 0.0, 0.0, 1.0,
                               0.0, 1.0, 0.0, 1.0,
                               0.0, 0.0, 1.0, 1.0,
                               0.0, 0.0, 0.0, 1.0));

        var fs =
            'void main() { ' +
            '  bool b0 = (agi_modelView[0][0] == 2.0) && (agi_modelView[1][0] == 0.0) && (agi_modelView[2][0] == 0.0) && (agi_modelView[3][0] == 1.0); ' +
            '  bool b1 = (agi_modelView[0][1] == 0.0) && (agi_modelView[1][1] == 2.0) && (agi_modelView[2][1] == 0.0) && (agi_modelView[3][1] == 1.0); ' +
            '  bool b2 = (agi_modelView[0][2] == 0.0) && (agi_modelView[1][2] == 0.0) && (agi_modelView[2][2] == 2.0) && (agi_modelView[3][2] == 1.0); ' +
            '  bool b3 = (agi_modelView[0][3] == 0.0) && (agi_modelView[1][3] == 0.0) && (agi_modelView[2][3] == 0.0) && (agi_modelView[3][3] == 1.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';
        verifyDraw(fs);
    });

    it('has agi_inverseModelView', function() {
        var us = context.getUniformState();
        us.setModel(new Matrix4(1.0, 0.0, 0.0, 1.0,
                                0.0, 1.0, 0.0, 2.0,
                                0.0, 0.0, 1.0, 3.0,
                                0.0, 0.0, 0.0, 1.0));
        us.setView(new Matrix4(1.0, 0.0, 0.0, 0.0,
                               0.0, 1.0, 0.0, 0.0,
                               0.0, 0.0, 1.0, 0.0,
                               0.0, 0.0, 0.0, 1.0));

        var fs =
            'void main() { ' +
            '  bool b0 = (agi_inverseModelView[0][0] == 1.0) && (agi_inverseModelView[1][0] == 0.0) && (agi_inverseModelView[2][0] == 0.0) && (agi_inverseModelView[3][0] == -1.0); ' +
            '  bool b1 = (agi_inverseModelView[0][1] == 0.0) && (agi_inverseModelView[1][1] == 1.0) && (agi_inverseModelView[2][1] == 0.0) && (agi_inverseModelView[3][1] == -2.0); ' +
            '  bool b2 = (agi_inverseModelView[0][2] == 0.0) && (agi_inverseModelView[1][2] == 0.0) && (agi_inverseModelView[2][2] == 1.0) && (agi_inverseModelView[3][2] == -3.0); ' +
            '  bool b3 = (agi_inverseModelView[0][3] == 0.0) && (agi_inverseModelView[1][3] == 0.0) && (agi_inverseModelView[2][3] == 0.0) && (agi_inverseModelView[3][3] ==  1.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';
        verifyDraw(fs);
    });

    it('has agi_viewProjection', function() {
        var us = context.getUniformState();
        us.setView(new Matrix4(1.0, 0.0, 0.0, 0.0,
                               0.0, 1.0, 0.0, 8.0,
                               0.0, 0.0, 1.0, 0.0,
                               0.0, 0.0, 0.0, 1.0));
        us.setProjection(new Matrix4(1.0, 0.0, 0.0, 0.0,
                                     0.0, 1.0, 0.0, 0.0,
                                     0.0, 0.0, 1.0, 9.0,
                                     0.0, 0.0, 0.0, 1.0));

        var fs =
            'void main() { ' +
            '  bool b0 = (agi_viewProjection[0][0] == 1.0) && (agi_viewProjection[1][0] == 0.0) && (agi_viewProjection[2][0] == 0.0) && (agi_viewProjection[3][0] == 0.0); ' +
            '  bool b1 = (agi_viewProjection[0][1] == 0.0) && (agi_viewProjection[1][1] == 1.0) && (agi_viewProjection[2][1] == 0.0) && (agi_viewProjection[3][1] == 8.0); ' +
            '  bool b2 = (agi_viewProjection[0][2] == 0.0) && (agi_viewProjection[1][2] == 0.0) && (agi_viewProjection[2][2] == 1.0) && (agi_viewProjection[3][2] == 9.0); ' +
            '  bool b3 = (agi_viewProjection[0][3] == 0.0) && (agi_viewProjection[1][3] == 0.0) && (agi_viewProjection[2][3] == 0.0) && (agi_viewProjection[3][3] == 1.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';

        verifyDraw(fs);
    });

    it('has agi_modelViewProjection', function() {
        var us = context.getUniformState();
        us.setModel(new Matrix4(1.0, 0.0, 0.0, 7.0,
                                0.0, 1.0, 0.0, 0.0,
                                0.0, 0.0, 1.0, 0.0,
                                0.0, 0.0, 0.0, 1.0));
        us.setView(new Matrix4(1.0, 0.0, 0.0, 0.0,
                               0.0, 1.0, 0.0, 8.0,
                               0.0, 0.0, 1.0, 0.0,
                               0.0, 0.0, 0.0, 1.0));
        us.setProjection(new Matrix4(1.0, 0.0, 0.0, 0.0,
                                     0.0, 1.0, 0.0, 0.0,
                                     0.0, 0.0, 1.0, 9.0,
                                     0.0, 0.0, 0.0, 1.0));

        var fs =
            'void main() { ' +
            '  bool b0 = (agi_modelViewProjection[0][0] == 1.0) && (agi_modelViewProjection[1][0] == 0.0) && (agi_modelViewProjection[2][0] == 0.0) && (agi_modelViewProjection[3][0] == 7.0); ' +
            '  bool b1 = (agi_modelViewProjection[0][1] == 0.0) && (agi_modelViewProjection[1][1] == 1.0) && (agi_modelViewProjection[2][1] == 0.0) && (agi_modelViewProjection[3][1] == 8.0); ' +
            '  bool b2 = (agi_modelViewProjection[0][2] == 0.0) && (agi_modelViewProjection[1][2] == 0.0) && (agi_modelViewProjection[2][2] == 1.0) && (agi_modelViewProjection[3][2] == 9.0); ' +
            '  bool b3 = (agi_modelViewProjection[0][3] == 0.0) && (agi_modelViewProjection[1][3] == 0.0) && (agi_modelViewProjection[2][3] == 0.0) && (agi_modelViewProjection[3][3] == 1.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';

        verifyDraw(fs);
    });

    it('has agi_modelViewInfiniteProjection', function() {
        var us = context.getUniformState();
        us.setModel(new Matrix4(1.0, 0.0, 0.0, 7.0,
                                0.0, 1.0, 0.0, 0.0,
                                0.0, 0.0, 1.0, 0.0,
                                0.0, 0.0, 0.0, 1.0));
        us.setView(new Matrix4(1.0, 0.0, 0.0, 0.0,
                               0.0, 1.0, 0.0, 8.0,
                               0.0, 0.0, 1.0, 0.0,
                               0.0, 0.0, 0.0, 1.0));
        us.setInfiniteProjection(new Matrix4(1.0, 0.0, 0.0, 0.0,
                                             0.0, 1.0, 0.0, 0.0,
                                             0.0, 0.0, 1.0, 9.0,
                                             0.0, 0.0, 0.0, 1.0));

        var fs =
            'void main() { ' +
            '  bool b0 = (agi_modelViewInfiniteProjection[0][0] == 1.0) && (agi_modelViewInfiniteProjection[1][0] == 0.0) && (agi_modelViewInfiniteProjection[2][0] == 0.0) && (agi_modelViewInfiniteProjection[3][0] == 7.0); ' +
            '  bool b1 = (agi_modelViewInfiniteProjection[0][1] == 0.0) && (agi_modelViewInfiniteProjection[1][1] == 1.0) && (agi_modelViewInfiniteProjection[2][1] == 0.0) && (agi_modelViewInfiniteProjection[3][1] == 8.0); ' +
            '  bool b2 = (agi_modelViewInfiniteProjection[0][2] == 0.0) && (agi_modelViewInfiniteProjection[1][2] == 0.0) && (agi_modelViewInfiniteProjection[2][2] == 1.0) && (agi_modelViewInfiniteProjection[3][2] == 9.0); ' +
            '  bool b3 = (agi_modelViewInfiniteProjection[0][3] == 0.0) && (agi_modelViewInfiniteProjection[1][3] == 0.0) && (agi_modelViewInfiniteProjection[2][3] == 0.0) && (agi_modelViewInfiniteProjection[3][3] == 1.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';

        verifyDraw(fs);
    });

    it('has agi_normal', function() {
        var us = context.getUniformState();
        us.setModel(new Matrix4(1.0, 0.0, 0.0, 7.0,
                                0.0, 1.0, 0.0, 8.0,
                                0.0, 0.0, 1.0, 9.0,
                                0.0, 0.0, 0.0, 1.0));

        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(' +
            '    (agi_normal[0][0] == 1.0) && (agi_normal[1][0] == 0.0) && (agi_normal[2][0] == 0.0) && ' +
            '    (agi_normal[0][1] == 0.0) && (agi_normal[1][1] == 1.0) && (agi_normal[2][1] == 0.0) && ' +
            '    (agi_normal[0][2] == 0.0) && (agi_normal[1][2] == 0.0) && (agi_normal[2][2] == 1.0) ' +
            '  ); ' +
            '}';
        verifyDraw(fs);
    });

    it('has agi_inverseNormal', function() {
        var us = context.getUniformState();
        us.setModel(new Matrix4(1.0, 0.0, 0.0, 7.0,
                                0.0, 1.0, 0.0, 8.0,
                                0.0, 0.0, 1.0, 9.0,
                                0.0, 0.0, 0.0, 1.0));
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(' +
            '    (agi_inverseNormal[0][0] == 1.0) && (agi_inverseNormal[1][0] == 0.0) && (agi_inverseNormal[2][0] == 0.0) && ' +
            '    (agi_inverseNormal[0][1] == 0.0) && (agi_inverseNormal[1][1] == 1.0) && (agi_inverseNormal[2][1] == 0.0) && ' +
            '    (agi_inverseNormal[0][2] == 0.0) && (agi_inverseNormal[1][2] == 0.0) && (agi_inverseNormal[2][2] == 1.0) ' +
            '  ); ' +
            '}';
        verifyDraw(fs);
    });

    it('has agi_sunDirectionEC', function() {
        var fs = 'void main() { gl_FragColor = vec4(agi_sunDirectionEC != vec3(0.0)); }';
        verifyDraw(fs);
    });

    it('has agi_sunDirectionWC', function() {
        var fs = 'void main() { gl_FragColor = vec4(agi_sunDirectionWC != vec3(0.0)); }';
        verifyDraw(fs);
    });

    it('has agi_viewerPositionWC', function() {
        var fs = 'void main() { gl_FragColor = vec4(agi_viewerPositionWC == vec3(0.0)); }';
        verifyDraw(fs);
    });
});