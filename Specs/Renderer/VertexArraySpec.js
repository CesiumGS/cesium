/*global defineSuite*/
defineSuite([
         '../Specs/createContext',
         '../Specs/destroyContext',
         'Core/ComponentDatatype',
         'Core/PrimitiveType',
         'Renderer/BufferUsage'
     ], 'Renderer/VertexArray', function(
         createContext,
         destroyContext,
         ComponentDatatype,
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

    it('binds', function() {
        var positionBuffer = context.createVertexBuffer(3, BufferUsage.STATIC_DRAW);

        var attributes = [{
            index : 0,
            enabled : true,
            vertexBuffer : positionBuffer,
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.FLOAT,
            normalize : false,
            offsetInBytes : 0,
            strideInBytes : 0
        // tightly packed
        }];

        var va = context.createVertexArray(attributes);
        va._bind();
        va = va.destroy();
    });

    it('binds with default values', function() {
        var positionBuffer = context.createVertexBuffer(3, BufferUsage.STATIC_DRAW);

        var attributes = [{
            vertexBuffer : positionBuffer,
            componentsPerAttribute : 3
        }];
        var va = context.createVertexArray(attributes);

        expect(va.getNumberOfAttributes()).toEqual(1);
        expect(va.getAttribute(0).index).toEqual(0);
        expect(va.getAttribute(0).enabled).toEqual(true);
        expect(va.getAttribute(0).vertexBuffer).toEqual(positionBuffer);
        expect(va.getAttribute(0).componentsPerAttribute).toEqual(3);
        expect(va.getAttribute(0).componentDatatype).toEqual(ComponentDatatype.FLOAT);
        expect(va.getAttribute(0).normalize).toEqual(false);
        expect(va.getAttribute(0).offsetInBytes).toEqual(0);
        expect(va.getAttribute(0).strideInBytes).toEqual(0);

        va._bind();
        va = va.destroy();
    });

    it('binds with multiple buffers', function() {
        var attributeSize = 3 * Float32Array.BYTES_PER_ELEMENT;
        var positionBuffer = context.createVertexBuffer(attributeSize, BufferUsage.STATIC_DRAW);
        var normalBuffer = context.createVertexBuffer(attributeSize, BufferUsage.STATIC_DRAW);

        var attributes = [{
            index : 0,
            vertexBuffer : positionBuffer,
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.FLOAT
        }, {
            index : 1,
            vertexBuffer : normalBuffer,
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.FLOAT
        }];

        var va = context.createVertexArray(attributes);
        expect(va.getNumberOfAttributes()).toEqual(2);
        va._bind();
        va = va.destroy();
    });

    it('binds with interleaved buffer', function() {
        var attributeSize = 3 * Float32Array.BYTES_PER_ELEMENT;
        var buffer = context.createVertexBuffer(attributeSize, BufferUsage.STATIC_DRAW);

        var attributes = [{
            vertexBuffer : buffer,
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.FLOAT,
            offsetInBytes : 0,
            strideInBytes : 2 * attributeSize
        }, {
            vertexBuffer : buffer,
            componentsPerAttribute : 3,
            componentDatatype : ComponentDatatype.FLOAT,
            normalize : true,
            offsetInBytes : attributeSize,
            strideInBytes : 2 * attributeSize
        }];

        var va = context.createVertexArray(attributes);
        expect(va.getNumberOfAttributes()).toEqual(2);
        va._bind();
        va = va.destroy();
    });

    it('adds attributes', function() {
        var positionBuffer = context.createVertexBuffer(3, BufferUsage.STATIC_DRAW);

        var va = context.createVertexArray();
        va.addAttribute({
            vertexBuffer : positionBuffer,
            componentsPerAttribute : 3
        });

        expect(va.getNumberOfAttributes()).toEqual(1);
        expect(va.getAttribute(0).index).toEqual(0);
        expect(va.getAttribute(0).enabled).toEqual(true);
        expect(va.getAttribute(0).vertexBuffer).toEqual(positionBuffer);
        expect(va.getAttribute(0).componentsPerAttribute).toEqual(3);
        expect(va.getAttribute(0).componentDatatype).toEqual(ComponentDatatype.FLOAT);
        expect(va.getAttribute(0).normalize).toEqual(false);
        expect(va.getAttribute(0).offsetInBytes).toEqual(0);
        expect(va.getAttribute(0).strideInBytes).toEqual(0);

        va = va.destroy();
    });

    it('modifies attributes', function() {
        var buffer = context.createVertexBuffer(6, BufferUsage.STATIC_DRAW);

        var attributes = [{
            vertexBuffer : buffer,
            componentsPerAttribute : 3
        }];
        var va = context.createVertexArray(attributes);
        expect(va.getNumberOfAttributes()).toEqual(1);
        expect(va.getAttribute(0).enabled).toEqual(true);

        va.getAttribute(0).enabled = false;
        expect(va.getAttribute(0).enabled).toEqual(false);

        va._bind();
        va = va.destroy();
    });

    it('removes attributes', function() {
        var buffer = context.createVertexBuffer(3, BufferUsage.STATIC_DRAW);

        var va = context.createVertexArray();
        va.addAttribute({ // implicit index: 0
            vertexBuffer : buffer,
            componentsPerAttribute : 1
        });
        va.addAttribute({ // implicit index: 1
            vertexBuffer : buffer,
            componentsPerAttribute : 2
        });
        va.addAttribute({ // implicit index: 2
            vertexBuffer : buffer,
            componentsPerAttribute : 3
        });

        expect(va.getNumberOfAttributes()).toEqual(3);
        expect(va.getAttribute(0).componentsPerAttribute).toEqual(1);
        expect(va.getAttribute(1).componentsPerAttribute).toEqual(2);
        expect(va.getAttribute(2).componentsPerAttribute).toEqual(3);

        expect(va.removeAttribute({
            index : 1
        })).toEqual(true);
        expect(va.getNumberOfAttributes()).toEqual(2);
        expect(va.getAttribute(0).componentsPerAttribute).toEqual(1);
        expect(va.getAttribute(1).componentsPerAttribute).toEqual(3);

        expect(va.removeAttribute({
            index : 0
        })).toEqual(true);
        expect(va.getNumberOfAttributes()).toEqual(1);
        expect(va.getAttribute(0).componentsPerAttribute).toEqual(3);

        expect(va.removeAttribute({
            index : 2
        })).toEqual(true);
        expect(va.getNumberOfAttributes()).toEqual(0);
        expect(va.removeAttribute({
            index : 2
        })).toEqual(false);
    });

    // The following specs test draw calls that pull from a constant attribute.
    // Due to what I believe is a range checking bug in Firefox (Section 6.4 of
    // the WebGL spec), an attribute backed by a buffer must also be bound,
    // otherwise drawArrays unjustly reports an INVALID_OPERATION, hence the
    // firefoxWorkaround attribute below.  In practice, we will always have
    // an attribute backed by a buffer anyway.

    it('renders with a one-component constant value', function() {
        var vs =
            'attribute float attr;' +
            'attribute float firefoxWorkaround;' +
            'varying vec4 v_color;' +
            'void main() { ' +
            '  v_color = vec4(attr == 0.5) + vec4(firefoxWorkaround);' +
            '  gl_PointSize = 1.0;' +
            '  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);' +
            '}';
        var fs =
            'varying vec4 v_color;' +
            'void main() { gl_FragColor = v_color; }';
        var sp = context.createShaderProgram(vs, fs, {
            attr : 0,
            firefoxWorkaround : 1
        });

        var va = context.createVertexArray();
        va.addAttribute({
            value : [0.5]
        });
        va.addAttribute({
            vertexBuffer : context.createVertexBuffer(Float32Array.BYTES_PER_ELEMENT, BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 1
        });

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            count : 1
        });

        expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);

        sp = sp.destroy();
        va = va.destroy();
    });

    it('renders with a two-component constant value', function() {
        var vs =
            'attribute vec2 attr;' +
            'attribute float firefoxWorkaround;' +
            'varying vec4 v_color;' +
            'void main() { ' +
            '  v_color = vec4(attr == vec2(0.25, 0.75)) + vec4(firefoxWorkaround);' +
            '  gl_PointSize = 1.0;' +
            '  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);' +
            '}';
        var fs =
            'varying vec4 v_color;' +
            'void main() { gl_FragColor = v_color; }';
        var sp = context.createShaderProgram(vs, fs, {
            attr : 0,
            firefoxWorkaround : 1
        });

        var va = context.createVertexArray();
        va.addAttribute({
            value : [0.25, 0.75]
        });
        va.addAttribute({
            vertexBuffer : context.createVertexBuffer(Float32Array.BYTES_PER_ELEMENT, BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 1
        });

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            count : 1
        });

        expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);

        sp = sp.destroy();
        va = va.destroy();
    });

    it('renders with a three-component constant value', function() {
        var vs =
            'attribute vec3 attr;' +
            'attribute float firefoxWorkaround;' +
            'varying vec4 v_color;' +
            'void main() { ' +
            '  v_color = vec4(attr == vec3(0.25, 0.5, 0.75)) + vec4(firefoxWorkaround);' +
            '  gl_PointSize = 1.0;' +
            '  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);' +
            '}';
        var fs =
            'varying vec4 v_color;' +
            'void main() { gl_FragColor = v_color; }';
        var sp = context.createShaderProgram(vs, fs, {
            attr : 0,
            firefoxWorkaround : 1
        });

        var va = context.createVertexArray();
        va.addAttribute({
            value : [0.25, 0.5, 0.75]
        });
        va.addAttribute({
            vertexBuffer : context.createVertexBuffer(Float32Array.BYTES_PER_ELEMENT, BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 1
        });

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            count : 1
        });

        expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);

        sp = sp.destroy();
        va = va.destroy();
    });

    it('renders with a four-component constant value', function() {
        var vs =
            'attribute vec4 attr;' +
            'attribute float firefoxWorkaround;' +
            'varying vec4 v_color;' +
            'void main() { ' +
            '  v_color = vec4(attr == vec4(0.2, 0.4, 0.6, 0.8)) + vec4(firefoxWorkaround);' +
            '  gl_PointSize = 1.0;' +
            '  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);' +
            '}';
        var fs =
            'varying vec4 v_color;' +
            'void main() { gl_FragColor = v_color; }';
        var sp = context.createShaderProgram(vs, fs, {
            attr : 0,
            firefoxWorkaround : 1
        });

        var va = context.createVertexArray();
        va.addAttribute({
            value : [0.2, 0.4, 0.6, 0.8]
        });
        va.addAttribute({
            vertexBuffer : context.createVertexBuffer(Float32Array.BYTES_PER_ELEMENT, BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 1
        });

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            count : 1
        });

        expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);

        sp = sp.destroy();
        va = va.destroy();
    });

    it('destroys', function() {
        var va = context.createVertexArray({});
        expect(va.isDestroyed()).toEqual(false);
        va.destroy();
        expect(va.isDestroyed()).toEqual(true);
    });

    it('fails to create (missing vertexBuffer and value)', function() {
        var attributes = [{
            componentsPerAttribute : 3
        }];

        expect(function() {
            return context.createVertexArray(attributes);
        }).toThrow();
    });

    it('fails to create (provides both vertexBuffer and value)', function() {
        var buffer = context.createVertexBuffer(3, BufferUsage.STATIC_DRAW);

        var attributes = [{
            vertexBuffer : buffer,
            value : [1, 2, 3],
            componentsPerAttribute : 3
        }];

        expect(function() {
            return context.createVertexArray(attributes);
        }).toThrow();
    });

    it('fails to create with duplicate indices', function() {
        var buffer = context.createVertexBuffer(1, BufferUsage.STATIC_DRAW);

        var attributes = [{
            index : 1,
            vertexBuffer : buffer,
            componentsPerAttribute : 1
        }, {
            index : 1,
            vertexBuffer : buffer,
            componentsPerAttribute : 1
        }];

        expect(function() {
            return context.createVertexArray(attributes);
        }).toThrow();
    });

    it('fails to create (componentsPerAttribute missing)', function() {
        var buffer = context.createVertexBuffer(3, BufferUsage.STATIC_DRAW);

        var attributes = [{
            vertexBuffer : buffer
        }];

        expect(function() {
            return context.createVertexArray(attributes);
        }).toThrow();
    });

    it('fails to create (componentsPerAttribute < 1)', function() {
        var attributes = [{
            componentsPerAttribute : 0
        }];

        expect(function() {
            return context.createVertexArray(attributes);
        }).toThrow();
    });

    it('fails to create (componentsPerAttribute > 4)', function() {
        var attributes = [{
            componentsPerAttribute : 5
        }];

        expect(function() {
            return context.createVertexArray(attributes);
        }).toThrow();
    });

    it('fails to create (value.length < 1)', function() {
        var attributes = [{
            value : []
        }];

        expect(function() {
            return context.createVertexArray(attributes);
        }).toThrow();
    });

    it('fails to create (value.length > 4)', function() {
        var attributes = [{
            value : [1.0, 2.0, 3.0, 4.0, 5.0]
        }];

        expect(function() {
            return context.createVertexArray(attributes);
        }).toThrow();
    });

    it('fails to create (componentDatatype)', function() {
        var buffer = context.createVertexBuffer(3, BufferUsage.STATIC_DRAW);

        var attributes = [{
            vertexBuffer : buffer,
            componentsPerAttribute : 3,
            componentDatatype : 'invalid component datatype'
        }];

        expect(function() {
            return context.createVertexArray(attributes);
        }).toThrow();
    });

    it('fails to create (strideInBytes)', function() {
        var buffer = context.createVertexBuffer(3, BufferUsage.STATIC_DRAW);

        var attributes = [{
            vertexBuffer : buffer,
            componentsPerAttribute : 3,
            strideInBytes : 256
        }];

        expect(function() {
            return context.createVertexArray(attributes);
        }).toThrow();
    });

    it('fails to get attribute', function() {
        var va = context.createVertexArray();

        expect(function() {
            return va.getAttribute();
        }).toThrow();
    });

    it('fails to add attribute with duplicate index', function() {
        var buffer = context.createVertexBuffer(3, BufferUsage.STATIC_DRAW);

        var va = context.createVertexArray();
        va.addAttribute({
            index : 1,
            vertexBuffer : buffer,
            componentsPerAttribute : 3
        });

        expect(function() {
            va.addAttribute({
                index : 1,
                vertexBuffer : buffer,
                componentsPerAttribute : 3
            });
        }).toThrow();
    });

    it('fails to add attribute without vertex buffer', function() {
        var va = context.createVertexArray();

        expect(function() {
            va.addAttribute({});
        }).toThrow();
    });

    it('fails to remove attribute without an index', function() {
        var va = context.createVertexArray();

        expect(function() {
            va.removeAttribute({});
        }).toThrow();
    });

    it('fails to destroy', function() {
        var va = context.createVertexArray();
        va.destroy();

        expect(function() {
            va.destroy();
        }).toThrow();
    });
});
