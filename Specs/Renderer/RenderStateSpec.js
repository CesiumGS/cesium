/*global defineSuite*/
defineSuite([
        'Renderer/RenderState',
        'Core/WindingOrder',
        'Specs/createContext'
    ], function(
        RenderState,
        WindingOrder,
        createContext) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/
    /*global WebGLRenderingContext*/

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    it('creates with defaults', function() {
        var defaultRS = {
            frontFace : WindingOrder.COUNTER_CLOCKWISE,
            cull : {
                enabled : false,
                face : WebGLRenderingContext.BACK
            },
            lineWidth : 1,
            polygonOffset : {
                enabled : false,
                factor : 0,
                units : 0
            },
            scissorTest : {
                enabled : false,
                rectangle : {
                    x : 0,
                    y : 0,
                    width : 0,
                    height : 0
                }
            },
            depthRange : {
                near : 0,
                far : 1
            },
            depthTest : {
                enabled : false,
                func : WebGLRenderingContext.LESS
            },
            colorMask : {
                red : true,
                green : true,
                blue : true,
                alpha : true
            },
            depthMask : true,
            stencilMask : ~0,
            blending : {
                enabled : false,
                color : {
                    red : 0.0,
                    green : 0.0,
                    blue : 0.0,
                    alpha : 0.0
                },
                equationRgb : WebGLRenderingContext.FUNC_ADD,
                equationAlpha : WebGLRenderingContext.FUNC_ADD,
                functionSourceRgb : WebGLRenderingContext.ONE,
                functionSourceAlpha : WebGLRenderingContext.ONE,
                functionDestinationRgb : WebGLRenderingContext.ZERO,
                functionDestinationAlpha : WebGLRenderingContext.ZERO
            },
            stencilTest : {
                enabled : false,
                frontFunction : WebGLRenderingContext.ALWAYS,
                backFunction : WebGLRenderingContext.ALWAYS,
                reference : 0,
                mask : ~0,
                frontOperation : {
                    fail : WebGLRenderingContext.KEEP,
                    zFail : WebGLRenderingContext.KEEP,
                    zPass : WebGLRenderingContext.KEEP
                },
                backOperation : {
                    fail : WebGLRenderingContext.KEEP,
                    zFail : WebGLRenderingContext.KEEP,
                    zPass : WebGLRenderingContext.KEEP
                }
            },
            sampleCoverage : {
                enabled : false,
                value : 1.0,
                invert : false
            }
        };

        var rs = context.createRenderState();

        expect(rs.frontFace).toEqual(defaultRS.frontFace);
        expect(rs.cull.enabled).toEqual(defaultRS.cull.enabled);
        expect(rs.cull.face).toEqual(defaultRS.cull.face);
        expect(rs.cull.lineWidth).toEqual(defaultRS.cull.lineWidth);
        expect(rs.polygonOffset.enabled).toEqual(defaultRS.polygonOffset.enabled);
        expect(rs.polygonOffset.factor).toEqual(defaultRS.polygonOffset.factor);
        expect(rs.polygonOffset.units).toEqual(defaultRS.polygonOffset.units);
        expect(rs.scissorTest.enabled).toEqual(defaultRS.scissorTest.enabled);
        expect(rs.scissorTest.rectangle.x).toEqual(defaultRS.scissorTest.rectangle.x);
        expect(rs.scissorTest.rectangle.y).toEqual(defaultRS.scissorTest.rectangle.y);
        expect(rs.scissorTest.rectangle.width).toEqual(defaultRS.scissorTest.rectangle.width);
        expect(rs.scissorTest.rectangle.height).toEqual(defaultRS.scissorTest.rectangle.height);
        expect(rs.depthRange.near).toEqual(defaultRS.depthRange.near);
        expect(rs.depthRange.far).toEqual(defaultRS.depthRange.far);
        expect(rs.depthTest.enabled).toEqual(defaultRS.depthTest.enabled);
        expect(rs.depthTest.func).toEqual(defaultRS.depthTest.func);
        expect(rs.colorMask.red).toEqual(defaultRS.colorMask.red);
        expect(rs.colorMask.green).toEqual(defaultRS.colorMask.green);
        expect(rs.colorMask.blue).toEqual(defaultRS.colorMask.blue);
        expect(rs.colorMask.alpha).toEqual(defaultRS.colorMask.alpha);
        expect(rs.depthMask).toEqual(defaultRS.depthMask);
        expect(rs.stencilMask).toEqual(defaultRS.stencilMask);
        expect(rs.blending.enabled).toEqual(defaultRS.blending.enabled);
        expect(rs.blending.color.red).toEqual(defaultRS.blending.color.red);
        expect(rs.blending.color.green).toEqual(defaultRS.blending.color.green);
        expect(rs.blending.color.blue).toEqual(defaultRS.blending.color.blue);
        expect(rs.blending.color.alpha).toEqual(defaultRS.blending.color.alpha);
        expect(rs.blending.equationRgb).toEqual(defaultRS.blending.equationRgb);
        expect(rs.blending.equationAlpha).toEqual(defaultRS.blending.equationAlpha);
        expect(rs.blending.functionSourceRgb).toEqual(defaultRS.blending.functionSourceRgb);
        expect(rs.blending.functionSourceAlpha).toEqual(defaultRS.blending.functionSourceAlpha);
        expect(rs.blending.functionDestinationRgb).toEqual(defaultRS.blending.functionDestinationRgb);
        expect(rs.blending.functionDestinationAlpha).toEqual(defaultRS.blending.functionDestinationAlpha);
        expect(rs.stencilTest.enabled).toEqual(defaultRS.stencilTest.enabled);
        expect(rs.stencilTest.frontFunction).toEqual(defaultRS.stencilTest.frontFunction);
        expect(rs.stencilTest.backFunction).toEqual(defaultRS.stencilTest.backFunction);
        expect(rs.stencilTest.reference).toEqual(defaultRS.stencilTest.reference);
        expect(rs.stencilTest.mask).toEqual(defaultRS.stencilTest.mask);
        expect(rs.stencilTest.frontOperation.fail).toEqual(defaultRS.stencilTest.frontOperation.fail);
        expect(rs.stencilTest.frontOperation.zFail).toEqual(defaultRS.stencilTest.frontOperation.zFail);
        expect(rs.stencilTest.frontOperation.zPass).toEqual(defaultRS.stencilTest.frontOperation.zPass);
        expect(rs.stencilTest.backOperation.fail).toEqual(defaultRS.stencilTest.backOperation.fail);
        expect(rs.stencilTest.backOperation.zFail).toEqual(defaultRS.stencilTest.backOperation.zFail);
        expect(rs.stencilTest.backOperation.zPass).toEqual(defaultRS.stencilTest.backOperation.zPass);
        expect(rs.sampleCoverage.enabled).toEqual(defaultRS.sampleCoverage.enabled);
        expect(rs.sampleCoverage.value).toEqual(defaultRS.sampleCoverage.value);
        expect(rs.sampleCoverage.invert).toEqual(defaultRS.sampleCoverage.invert);
    });

    it('creates with all render states', function() {
        var r = {
            frontFace : WindingOrder.CLOCKWISE,
            cull : {
                enabled : true,
                face : WebGLRenderingContext.FRONT
            },
            lineWidth : context.maximumAliasedLineWidth,
            polygonOffset : {
                enabled : false,
                factor : 1,
                units : 1
            },
            scissorTest : {
                enabled : true,
                rectangle : {
                    x : 1,
                    y : 1,
                    width : 2,
                    height : 2
                }
            },
            depthRange : {
                near : 0.25,
                far : 0.75
            },
            depthTest : {
                enabled : true,
                func : WebGLRenderingContext.GREATER
            },
            colorMask : {
                red : false,
                green : false,
                blue : false,
                alpha : false
            },
            depthMask : false,
            stencilMask : 0,
            blending : {
                enabled : true,
                color : {
                    red : 1.0,
                    green : 1.0,
                    blue : 1.0,
                    alpha : 1.0
                },
                equationRgb : WebGLRenderingContext.FUNC_SUBTRACT,
                equationAlpha : WebGLRenderingContext.FUNC_SUBTRACT,
                functionSourceRgb : WebGLRenderingContext.ZERO,
                functionSourceAlpha : WebGLRenderingContext.ZERO,
                functionDestinationRgb : WebGLRenderingContext.ONE,
                functionDestinationAlpha : WebGLRenderingContext.ONE
            },
            stencilTest : {
                enabled : true,
                frontFunction : WebGLRenderingContext.NEVER,
                backFunction : WebGLRenderingContext.NEVER,
                reference : 1,
                mask : 0,
                frontOperation : {
                    fail : WebGLRenderingContext.REPLACE,
                    zFail : WebGLRenderingContext.REPLACE,
                    zPass : WebGLRenderingContext.REPLACE
                },
                backOperation : {
                    fail : WebGLRenderingContext.REPLACE,
                    zFail : WebGLRenderingContext.REPLACE,
                    zPass : WebGLRenderingContext.REPLACE
                }
            },
            sampleCoverage : {
                enabled : true,
                value : 0.5,
                invert : true
            }
        };

        var rs = context.createRenderState(r);

        expect(rs.frontFace).toEqual(r.frontFace);
        expect(rs.cull.enabled).toEqual(r.cull.enabled);
        expect(rs.cull.face).toEqual(r.cull.face);
        expect(rs.cull.lineWidth).toEqual(r.cull.lineWidth);
        expect(rs.polygonOffset.enabled).toEqual(r.polygonOffset.enabled);
        expect(rs.polygonOffset.factor).toEqual(r.polygonOffset.factor);
        expect(rs.polygonOffset.units).toEqual(r.polygonOffset.units);
        expect(rs.scissorTest.enabled).toEqual(r.scissorTest.enabled);
        expect(rs.scissorTest.rectangle.x).toEqual(r.scissorTest.rectangle.x);
        expect(rs.scissorTest.rectangle.y).toEqual(r.scissorTest.rectangle.y);
        expect(rs.scissorTest.rectangle.width).toEqual(r.scissorTest.rectangle.width);
        expect(rs.scissorTest.rectangle.height).toEqual(r.scissorTest.rectangle.height);
        expect(rs.depthRange.near).toEqual(r.depthRange.near);
        expect(rs.depthRange.far).toEqual(r.depthRange.far);
        expect(rs.depthTest.enabled).toEqual(r.depthTest.enabled);
        expect(rs.depthTest.func).toEqual(r.depthTest.func);
        expect(rs.colorMask.red).toEqual(r.colorMask.red);
        expect(rs.colorMask.green).toEqual(r.colorMask.green);
        expect(rs.colorMask.blue).toEqual(r.colorMask.blue);
        expect(rs.colorMask.alpha).toEqual(r.colorMask.alpha);
        expect(rs.depthMask).toEqual(r.depthMask);
        expect(rs.stencilMask).toEqual(r.stencilMask);
        expect(rs.blending.enabled).toEqual(r.blending.enabled);
        expect(rs.blending.color.red).toEqual(r.blending.color.red);
        expect(rs.blending.color.green).toEqual(r.blending.color.green);
        expect(rs.blending.color.blue).toEqual(r.blending.color.blue);
        expect(rs.blending.color.alpha).toEqual(r.blending.color.alpha);
        expect(rs.blending.equationRgb).toEqual(r.blending.equationRgb);
        expect(rs.blending.equationAlpha).toEqual(r.blending.equationAlpha);
        expect(rs.blending.functionSourceRgb).toEqual(r.blending.functionSourceRgb);
        expect(rs.blending.functionSourceAlpha).toEqual(r.blending.functionSourceAlpha);
        expect(rs.blending.functionDestinationRgb).toEqual(r.blending.functionDestinationRgb);
        expect(rs.blending.functionDestinationAlpha).toEqual(r.blending.functionDestinationAlpha);
        expect(rs.stencilTest.enabled).toEqual(r.stencilTest.enabled);
        expect(rs.stencilTest.frontFunction).toEqual(r.stencilTest.frontFunction);
        expect(rs.stencilTest.backFunction).toEqual(r.stencilTest.backFunction);
        expect(rs.stencilTest.reference).toEqual(r.stencilTest.reference);
        expect(rs.stencilTest.mask).toEqual(r.stencilTest.mask);
        expect(rs.stencilTest.frontOperation.fail).toEqual(r.stencilTest.frontOperation.fail);
        expect(rs.stencilTest.frontOperation.zFail).toEqual(r.stencilTest.frontOperation.zFail);
        expect(rs.stencilTest.frontOperation.zPass).toEqual(r.stencilTest.frontOperation.zPass);
        expect(rs.stencilTest.backOperation.fail).toEqual(r.stencilTest.backOperation.fail);
        expect(rs.stencilTest.backOperation.zFail).toEqual(r.stencilTest.backOperation.zFail);
        expect(rs.stencilTest.backOperation.zPass).toEqual(r.stencilTest.backOperation.zPass);
        expect(rs.sampleCoverage.enabled).toEqual(r.sampleCoverage.enabled);
        expect(rs.sampleCoverage.value).toEqual(r.sampleCoverage.value);
        expect(rs.sampleCoverage.invert).toEqual(r.sampleCoverage.invert);
    });

    it('creates with some render states', function() {
        var r = {
            frontFace : WindingOrder.CLOCKWISE,
            depthRange : {
                near : 0.25,
                far : 0.75
            }
        };

        var rs = context.createRenderState(r);
        expect(rs.frontFace).toEqual(r.frontFace);
        expect(rs.depthRange.near).toEqual(r.depthRange.near);
        expect(rs.depthRange.far).toEqual(r.depthRange.far);

        var defaultRS = context.createRenderState();
        expect(rs.cull.enabled).toEqual(defaultRS.cull.enabled);
        expect(rs.cull.face).toEqual(defaultRS.cull.face);
        expect(rs.cull.lineWidth).toEqual(defaultRS.cull.lineWidth);
        expect(rs.polygonOffset.enabled).toEqual(defaultRS.polygonOffset.enabled);
        expect(rs.polygonOffset.factor).toEqual(defaultRS.polygonOffset.factor);
        expect(rs.polygonOffset.units).toEqual(defaultRS.polygonOffset.units);
        expect(rs.scissorTest.enabled).toEqual(defaultRS.scissorTest.enabled);
        expect(rs.scissorTest.rectangle.x).toEqual(defaultRS.scissorTest.rectangle.x);
        expect(rs.scissorTest.rectangle.y).toEqual(defaultRS.scissorTest.rectangle.y);
        expect(rs.scissorTest.rectangle.width).toEqual(defaultRS.scissorTest.rectangle.width);
        expect(rs.scissorTest.rectangle.height).toEqual(defaultRS.scissorTest.rectangle.height);
        expect(rs.depthTest.enabled).toEqual(defaultRS.depthTest.enabled);
        expect(rs.depthTest.func).toEqual(defaultRS.depthTest.func);
        expect(rs.colorMask.red).toEqual(defaultRS.colorMask.red);
        expect(rs.colorMask.green).toEqual(defaultRS.colorMask.green);
        expect(rs.colorMask.blue).toEqual(defaultRS.colorMask.blue);
        expect(rs.colorMask.alpha).toEqual(defaultRS.colorMask.alpha);
        expect(rs.depthMask).toEqual(defaultRS.depthMask);
        expect(rs.stencilMask).toEqual(defaultRS.stencilMask);
        expect(rs.blending.enabled).toEqual(defaultRS.blending.enabled);
        expect(rs.blending.color.red).toEqual(defaultRS.blending.color.red);
        expect(rs.blending.color.green).toEqual(defaultRS.blending.color.green);
        expect(rs.blending.color.blue).toEqual(defaultRS.blending.color.blue);
        expect(rs.blending.color.alpha).toEqual(defaultRS.blending.color.alpha);
        expect(rs.blending.equationRgb).toEqual(defaultRS.blending.equationRgb);
        expect(rs.blending.equationAlpha).toEqual(defaultRS.blending.equationAlpha);
        expect(rs.blending.functionSourceRgb).toEqual(defaultRS.blending.functionSourceRgb);
        expect(rs.blending.functionSourceAlpha).toEqual(defaultRS.blending.functionSourceAlpha);
        expect(rs.blending.functionDestinationRgb).toEqual(defaultRS.blending.functionDestinationRgb);
        expect(rs.blending.functionDestinationAlpha).toEqual(defaultRS.blending.functionDestinationAlpha);
        expect(rs.stencilTest.enabled).toEqual(defaultRS.stencilTest.enabled);
        expect(rs.stencilTest.frontFunction).toEqual(defaultRS.stencilTest.frontFunction);
        expect(rs.stencilTest.backFunction).toEqual(defaultRS.stencilTest.backFunction);
        expect(rs.stencilTest.reference).toEqual(defaultRS.stencilTest.reference);
        expect(rs.stencilTest.mask).toEqual(defaultRS.stencilTest.mask);
        expect(rs.stencilTest.frontOperation.fail).toEqual(defaultRS.stencilTest.frontOperation.fail);
        expect(rs.stencilTest.frontOperation.zFail).toEqual(defaultRS.stencilTest.frontOperation.zFail);
        expect(rs.stencilTest.frontOperation.zPass).toEqual(defaultRS.stencilTest.frontOperation.zPass);
        expect(rs.stencilTest.backOperation.fail).toEqual(defaultRS.stencilTest.backOperation.fail);
        expect(rs.stencilTest.backOperation.zFail).toEqual(defaultRS.stencilTest.backOperation.zFail);
        expect(rs.stencilTest.backOperation.zPass).toEqual(defaultRS.stencilTest.backOperation.zPass);
        expect(rs.sampleCoverage.enabled).toEqual(defaultRS.sampleCoverage.enabled);
        expect(rs.sampleCoverage.value).toEqual(defaultRS.sampleCoverage.value);
        expect(rs.sampleCoverage.invert).toEqual(defaultRS.sampleCoverage.invert);
    });

    it('caches render states', function() {
        var rs = context.createRenderState();
        var rs2 = context.createRenderState();
        // rs3 is still the same state as rs and rs2, but with a partial definition
        var rs3 = context.createRenderState({
            depthTest : {
                enabled : false,
                func : WebGLRenderingContext.LESS
            }
        });
        // rs4 is a cache miss since it has a different depthTest
        var rs4 = context.createRenderState({
            depthTest : {
                enabled : true,
                func : WebGLRenderingContext.NEVER
            }
        });
        expect(rs2).toBe(rs);
        expect(rs3).toBe(rs);
        expect(rs4).not.toBe(rs);
    });

    it('fails to create (frontFace)', function() {
        expect(function() {
            context.createRenderState({
                frontFace : 'invalid value'
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (cull.face)', function() {
        expect(function() {
            context.createRenderState({
                cull : {
                    face : 'invalid value'
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (small lineWidth)', function() {
        expect(function() {
            context.createRenderState({
                lineWidth : context.minimumAliasedLineWidth - 1
            });
        }).toThrowRuntimeError();
    });

    it('fails to create (large lineWidth)', function() {
        expect(function() {
            context.createRenderState({
                lineWidth : context.maximumAliasedLineWidth + 1
            });
        }).toThrowRuntimeError();
    });

    it('fails to create (negative scissorTest.rectangle.width)', function() {
        expect(function() {
            context.createRenderState({
                scissorTest : {
                    rectangle : {
                        x : 0,
                        y : 0,
                        width : -1,
                        height : 0
                    }
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (negative scissorTest.rectangle.height)', function() {
        expect(function() {
            context.createRenderState({
                scissorTest : {
                    rectangle : {
                        x : 0,
                        y : 0,
                        width : 0,
                        height : -1
                    }
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (near > far)', function() {
        expect(function() {
            context.createRenderState({
                depthRange : {
                    near : 0.75,
                    far : 0.25
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (near < 0)', function() {
        expect(function() {
            context.createRenderState({
                depthRange : {
                    near : -1
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (far > 1)', function() {
        expect(function() {
            context.createRenderState({
                depthRange : {
                    far : 2
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (depthTest.func)', function() {
        expect(function() {
            context.createRenderState({
                depthTest : {
                    func : 'invalid value'
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (blending.color < 0)', function() {
        expect(function() {
            context.createRenderState({
                blending : {
                    color : {
                        red : -1.0,
                        green : 0.0,
                        blue : 0.0,
                        alpha : 0.0
                    }
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (blending.color > 1)', function() {
        expect(function() {
            context.createRenderState({
                blending : {
                    color : {
                        red : 0.0,
                        green : 0.0,
                        blue : 0.0,
                        alpha : 2.0
                    }
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (blend.equationRgb)', function() {
        expect(function() {
            context.createRenderState({
                blending : {
                    equationRgb : 'invalid value'
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (blend.equationAlpha)', function() {
        expect(function() {
            context.createRenderState({
                blending : {
                    equationAlpha : 'invalid value'
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (blend.functionSourceRgb)', function() {
        expect(function() {
            context.createRenderState({
                blending : {
                    functionSourceRgb : 'invalid value'
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (blend.functionSourceAlpha)', function() {
        expect(function() {
            context.createRenderState({
                blending : {
                    functionSourceAlpha : 'invalid value'
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (blend.functionDestinationRgb)', function() {
        expect(function() {
            context.createRenderState({
                blending : {
                    functionDestinationRgb : 'invalid value'
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (blend.functionDestinationAlpha)', function() {
        expect(function() {
            context.createRenderState({
                blending : {
                    functionDestinationAlpha : 'invalid value'
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (stencilTest.frontFunction)', function() {
        expect(function() {
            context.createRenderState({
                stencilTest : {
                    frontFunction : 'invalid value'
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (stencilTest.backFunction)', function() {
        expect(function() {
            context.createRenderState({
                stencilTest : {
                    backFunction : 'invalid value'
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (stencilTest.frontOperation.fail)', function() {
        expect(function() {
            context.createRenderState({
                stencilTest : {
                    frontOperation : {
                        fail : 'invalid value'
                    }
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (stencilTest.frontOperation.zFail)', function() {
        expect(function() {
            context.createRenderState({
                stencilTest : {
                    frontOperation : {
                        zFail : 'invalid value'
                    }
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (stencilTest.frontOperation.zPass)', function() {
        expect(function() {
            context.createRenderState({
                stencilTest : {
                    frontOperation : {
                        zPass : 'invalid value'
                    }
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (stencilTest.backOperation.fail)', function() {
        expect(function() {
            context.createRenderState({
                stencilTest : {
                    backOperation : {
                        fail : 'invalid value'
                    }
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (stencilTest.backOperation.zFail)', function() {
        expect(function() {
            context.createRenderState({
                stencilTest : {
                    backOperation : {
                        zFail : 'invalid value'
                    }
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to create (stencilTest.backOperation.zPass)', function() {
        expect(function() {
            context.createRenderState({
                stencilTest : {
                    backOperation : {
                        zPass : 'invalid value'
                    }
                }
            });
        }).toThrowDeveloperError();
    });

    it('fails to clone without renderState', function() {
        expect(function() {
            RenderState.clone(undefined);
        }).toThrowDeveloperError();
    });

    it('clones', function() {
        var r = {
            frontFace : WindingOrder.CLOCKWISE,
            cull : {
                enabled : true,
                face : WebGLRenderingContext.FRONT
            },
            lineWidth : context.maximumAliasedLineWidth,
            polygonOffset : {
                enabled : false,
                factor : 1,
                units : 1
            },
            scissorTest : {
                enabled : true,
                rectangle : {
                    x : 1,
                    y : 1,
                    width : 2,
                    height : 2
                }
            },
            depthRange : {
                near : 0.25,
                far : 0.75
            },
            depthTest : {
                enabled : true,
                func : WebGLRenderingContext.GREATER
            },
            colorMask : {
                red : false,
                green : false,
                blue : false,
                alpha : false
            },
            depthMask : false,
            stencilMask : 0,
            blending : {
                enabled : true,
                color : {
                    red : 1.0,
                    green : 1.0,
                    blue : 1.0,
                    alpha : 1.0
                },
                equationRgb : WebGLRenderingContext.FUNC_SUBTRACT,
                equationAlpha : WebGLRenderingContext.FUNC_SUBTRACT,
                functionSourceRgb : WebGLRenderingContext.ZERO,
                functionSourceAlpha : WebGLRenderingContext.ZERO,
                functionDestinationRgb : WebGLRenderingContext.ONE,
                functionDestinationAlpha : WebGLRenderingContext.ONE
            },
            stencilTest : {
                enabled : true,
                frontFunction : WebGLRenderingContext.NEVER,
                backFunction : WebGLRenderingContext.NEVER,
                reference : 1,
                mask : 0,
                frontOperation : {
                    fail : WebGLRenderingContext.REPLACE,
                    zFail : WebGLRenderingContext.REPLACE,
                    zPass : WebGLRenderingContext.REPLACE
                },
                backOperation : {
                    fail : WebGLRenderingContext.REPLACE,
                    zFail : WebGLRenderingContext.REPLACE,
                    zPass : WebGLRenderingContext.REPLACE
                }
            },
            sampleCoverage : {
                enabled : true,
                value : 0.5,
                invert : true
            }
        };

        var r2 = context.createRenderState(r);
        var rs = context.createRenderState(RenderState.clone(r));

        expect(rs.frontFace).toEqual(r.frontFace);
        expect(rs.cull.enabled).toEqual(r.cull.enabled);
        expect(rs.cull.face).toEqual(r.cull.face);
        expect(rs.cull.lineWidth).toEqual(r.cull.lineWidth);
        expect(rs.polygonOffset.enabled).toEqual(r.polygonOffset.enabled);
        expect(rs.polygonOffset.factor).toEqual(r.polygonOffset.factor);
        expect(rs.polygonOffset.units).toEqual(r.polygonOffset.units);
        expect(rs.scissorTest.enabled).toEqual(r.scissorTest.enabled);
        expect(rs.scissorTest.rectangle.x).toEqual(r.scissorTest.rectangle.x);
        expect(rs.scissorTest.rectangle.y).toEqual(r.scissorTest.rectangle.y);
        expect(rs.scissorTest.rectangle.width).toEqual(r.scissorTest.rectangle.width);
        expect(rs.scissorTest.rectangle.height).toEqual(r.scissorTest.rectangle.height);
        expect(rs.depthRange.near).toEqual(r.depthRange.near);
        expect(rs.depthRange.far).toEqual(r.depthRange.far);
        expect(rs.depthTest.enabled).toEqual(r.depthTest.enabled);
        expect(rs.depthTest.func).toEqual(r.depthTest.func);
        expect(rs.colorMask.red).toEqual(r.colorMask.red);
        expect(rs.colorMask.green).toEqual(r.colorMask.green);
        expect(rs.colorMask.blue).toEqual(r.colorMask.blue);
        expect(rs.colorMask.alpha).toEqual(r.colorMask.alpha);
        expect(rs.depthMask).toEqual(r.depthMask);
        expect(rs.stencilMask).toEqual(r.stencilMask);
        expect(rs.blending.enabled).toEqual(r.blending.enabled);
        expect(rs.blending.color.red).toEqual(r.blending.color.red);
        expect(rs.blending.color.green).toEqual(r.blending.color.green);
        expect(rs.blending.color.blue).toEqual(r.blending.color.blue);
        expect(rs.blending.color.alpha).toEqual(r.blending.color.alpha);
        expect(rs.blending.equationRgb).toEqual(r.blending.equationRgb);
        expect(rs.blending.equationAlpha).toEqual(r.blending.equationAlpha);
        expect(rs.blending.functionSourceRgb).toEqual(r.blending.functionSourceRgb);
        expect(rs.blending.functionSourceAlpha).toEqual(r.blending.functionSourceAlpha);
        expect(rs.blending.functionDestinationRgb).toEqual(r.blending.functionDestinationRgb);
        expect(rs.blending.functionDestinationAlpha).toEqual(r.blending.functionDestinationAlpha);
        expect(rs.stencilTest.enabled).toEqual(r.stencilTest.enabled);
        expect(rs.stencilTest.frontFunction).toEqual(r.stencilTest.frontFunction);
        expect(rs.stencilTest.backFunction).toEqual(r.stencilTest.backFunction);
        expect(rs.stencilTest.reference).toEqual(r.stencilTest.reference);
        expect(rs.stencilTest.mask).toEqual(r.stencilTest.mask);
        expect(rs.stencilTest.frontOperation.fail).toEqual(r.stencilTest.frontOperation.fail);
        expect(rs.stencilTest.frontOperation.zFail).toEqual(r.stencilTest.frontOperation.zFail);
        expect(rs.stencilTest.frontOperation.zPass).toEqual(r.stencilTest.frontOperation.zPass);
        expect(rs.stencilTest.backOperation.fail).toEqual(r.stencilTest.backOperation.fail);
        expect(rs.stencilTest.backOperation.zFail).toEqual(r.stencilTest.backOperation.zFail);
        expect(rs.stencilTest.backOperation.zPass).toEqual(r.stencilTest.backOperation.zPass);
        expect(rs.sampleCoverage.enabled).toEqual(r.sampleCoverage.enabled);
        expect(rs.sampleCoverage.value).toEqual(r.sampleCoverage.value);
        expect(rs.sampleCoverage.invert).toEqual(r.sampleCoverage.invert);
    });

}, 'WebGL');