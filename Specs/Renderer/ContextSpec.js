/*global defineSuite*/
defineSuite([
        'Renderer/Context',
        'Core/Color',
        'Core/IndexDatatype',
        'Core/PixelFormat',
        'Renderer/Buffer',
        'Renderer/BufferUsage',
        'Renderer/ContextLimits',
        'Renderer/Framebuffer',
        'Renderer/PixelDatatype',
        'Renderer/Renderbuffer',
        'Renderer/RenderbufferFormat',
        'Renderer/Texture',
        'Specs/createContext',
        'Specs/renderFragment'
    ], function(
        Context,
        Color,
        IndexDatatype,
        PixelFormat,
        Buffer,
        BufferUsage,
        ContextLimits,
        Framebuffer,
        PixelDatatype,
        Renderbuffer,
        RenderbufferFormat,
        Texture,
        createContext,
        renderFragment) {
    'use strict';

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    it('has a unique ID', function() {
        var c = createContext();
        expect(c.id).toBeDefined();
        expect(c.id).not.toEqual(context.id);
        c.destroyForSpecs();
    });

    it('get canvas', function() {
        expect(context.canvas).not.toBeNull();
    });

    it('get redBits', function() {
        expect(context.redBits).toEqual(8);
    });

    it('get greenBits', function() {
        expect(context.greenBits).toEqual(8);
    });

    it('get blueBits', function() {
        expect(context.blueBits).toEqual(8);
    });

    it('get alphaBits', function() {
        expect(context.alphaBits).toEqual(8);
    });

    it('get depthBits', function() {
        expect(context.depthBits).toBeGreaterThanOrEqualTo(16);
    });

    it('get stencilBits', function() {
        expect(context.stencilBits).toBeGreaterThanOrEqualTo(0);
    });

    it('get maximumCombinedTextureImageUnits', function() {
        expect(ContextLimits.maximumCombinedTextureImageUnits).toBeGreaterThanOrEqualTo(8);
    });

    it('get maximumCubeMapSize', function() {
        expect(ContextLimits.maximumCubeMapSize).toBeGreaterThanOrEqualTo(16);
    });

    it('get maximumFragmentUniformVectors', function() {
        expect(ContextLimits.maximumFragmentUniformVectors).toBeGreaterThanOrEqualTo(16);
    });

    it('get maximumTextureImageUnits', function() {
        expect(ContextLimits.maximumTextureImageUnits).toBeGreaterThanOrEqualTo(8);
    });

    it('get maximumRenderbufferSize', function() {
        expect(ContextLimits.maximumRenderbufferSize).toBeGreaterThanOrEqualTo(1);
    });

    it('get maximumTextureSize', function() {
        expect(ContextLimits.maximumTextureSize).toBeGreaterThanOrEqualTo(64);
    });

    it('get maximumVaryingVectors', function() {
        expect(ContextLimits.maximumVaryingVectors).toBeGreaterThanOrEqualTo(8);
    });

    it('get maximumVertexAttributes', function() {
        expect(ContextLimits.maximumVertexAttributes).toBeGreaterThanOrEqualTo(8);
    });

    it('get maximumVertexTextureImageUnits', function() {
        expect(ContextLimits.maximumVertexTextureImageUnits).toBeGreaterThanOrEqualTo(0);
    });

    it('get maximumVertexUniformVectors', function() {
        expect(ContextLimits.maximumVertexUniformVectors).toBeGreaterThanOrEqualTo(1);
    });

    it('get minimumAliasedLineWidth', function() {
        expect(ContextLimits.minimumAliasedLineWidth).toBeLessThanOrEqualTo(1);
    });

    it('get maximumAliasedLineWidth', function() {
        expect(ContextLimits.maximumAliasedLineWidth).toBeGreaterThanOrEqualTo(1);
    });

    it('get minimumAliasedPointSize', function() {
        expect(ContextLimits.minimumAliasedPointSize).toBeLessThanOrEqualTo(1);
    });

    it('get maximumAliasedPointSize', function() {
        expect(ContextLimits.maximumAliasedPointSize).toBeGreaterThanOrEqualTo(1);
    });

    it('get maximumViewportWidth', function() {
        expect(ContextLimits.maximumViewportWidth).toBeGreaterThan(0);
    });

    it('get maximumViewportHeight', function() {
        expect(ContextLimits.maximumViewportHeight).toBeGreaterThan(0);
    });

    it('gets antialias', function() {
        var c = createContext({
            webgl : {
                antialias : false
            }
        });
        expect(c.antialias).toEqual(false);
        c.destroyForSpecs();
    });

    it('gets the standard derivatives extension', function() {
        var fs = '';

        if (context.standardDerivatives && !context.webgl2) {
            fs += '#extension GL_OES_standard_derivatives : enable\n';
        }

        fs +=
            'void main()\n' +
            '{\n';
         
        if (context.standardDerivatives) {
            fs += '  gl_FragColor = vec4(dFdx(1.0), dFdy(1.0), 1.0, 1.0);\n';
        } else {
            fs += '  gl_FragColor = vec4(1.0);\n';
        }
         
         fs += '}';

        var pixel = renderFragment(context, fs);

        if (context.standardDerivatives) {
            expect(pixel).toEqual([0, 0, 255, 255]);
        } else {
            expect(pixel).toEqual([255, 255, 255, 255]);
        }
    });

    it('gets the element index uint extension', function() {
        if (context.elementIndexUint) {
            var buffer = Buffer.createIndexBuffer({
                context : context,
                sizeInBytes : 6,
                usage : BufferUsage.STREAM_DRAW,
                indexDatatype : IndexDatatype.UNSIGNED_INT
            });
            expect(buffer).toBeDefined();
            buffer.destroy();
        } else {
            expect(function() {
                Buffer.createIndexBuffer({
                    context : context,
                    sizeInBytes : 6,
                    usage : BufferUsage.STREAM_DRAW,
                    indexDatatype : IndexDatatype.UNSIGNED_INT
                });
            }).toThrowDeveloperError();
        }
    });

    it('gets the depth texture extension', function() {
        expect(context.depthTexture).toBeDefined();
    });

    it('gets the texture float extension', function() {
        expect(context.floatingPointTexture).toBeDefined();
    });

    it('gets texture filter anisotropic extension', function() {
        expect(context.textureFilterAnisotropic).toBeDefined();
    });

    it('gets maximum texture filter anisotropy', function() {
        if(context.textureFilterAnisotropic) {
            expect(ContextLimits.maximumTextureFilterAnisotropy >= 2).toEqual(true);
        } else {
            expect(ContextLimits.maximumTextureFilterAnisotropy).toEqual(1);
        }
    });

    it('gets vertex array object extension', function() {
        expect(context.vertexArrayObject).toBeDefined();
    });

    it('get the fragment depth extension', function() {
        var fs =
            'void main()\n' +
            '{\n' +
            '  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n' +
            '}';

        var pixel = renderFragment(context, fs, 0.5, true);
        expect(pixel).toEqual([255, 0, 0, 255]);

        var fsFragDepth = '';
        
        if (context.fragmentDepth && !context.webgl2) {
            fsFragDepth += '#extension GL_EXT_frag_depth : enable\n';
        }
        
        fsFragDepth +=
            'void main()\n' +
            '{\n' +
            '    gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);\n';
        
        if (context.fragmentDepth) {
            fsFragDepth += '    gl_FragDepth';
            if (!context.webgl2) {
                fsFragDepth += 'EXT';
            }
            fsFragDepth += ' = 0.0;\n';
        }
        
        fsFragDepth += '}\n';

        pixel = renderFragment(context, fsFragDepth, 1.0, false);

        if (context.fragmentDepth) {
            expect(pixel).toEqual([0, 255, 0, 255]);
        } else {
            expect(pixel).toEqual([255, 0, 0, 255]);
        }
    });

    it('get the draw buffers extension', function() {
        expect(context.drawBuffers).toBeDefined();
    });

    it('get the maximum number of draw buffers', function() {
        if (context.drawBuffers) {
            expect(ContextLimits.maximumDrawBuffers).toBeGreaterThanOrEqualTo(1);
        } else {
            expect(ContextLimits.maximumDrawBuffers).toEqual(1);
        }
    });

    it('get the maximum number of color attachments', function() {
        if (context.drawBuffers) {
            expect(ContextLimits.maximumColorAttachments).toBeGreaterThanOrEqualTo(4);
        } else {
            expect(ContextLimits.maximumColorAttachments).toEqual(1);
        }
    });

    it('can create a pick ID and retrieve an object by pick color', function() {
        var o = {};
        var pickId = context.createPickId(o);

        expect(pickId).toBeDefined();
        expect(context.getObjectByPickColor(pickId.color)).toBe(o);
    });

    it('throws when creating a pick ID without an object', function() {
        expect(function() {
            context.createPickId(undefined);
        }).toThrowDeveloperError();
    });

    it('returns undefined when retrieving an object by unknown pick color', function() {
        expect(context.getObjectByPickColor(Color.WHITE)).toBeUndefined();
    });

    it('throws when getObjectByPickColor is called without a color', function() {
        expect(function() {
            context.getObjectByPickColor(undefined);
        }).toThrowDeveloperError();
    });

    it('fails to construct (null canvas)', function() {
        expect(function() {
            return new Context();
        }).toThrowDeveloperError();
    });

    it('isDestroyed', function() {
        var c = createContext();
        expect(c.isDestroyed()).toEqual(false);
        c.destroyForSpecs();
        expect(c.isDestroyed()).toEqual(true);
    });

    it('destroying Context destroys objects in cache', function() {
        var c = createContext();
        var destroyableObject = jasmine.createSpyObj('destroyableObject', ['destroy']);
        c.cache.foo = destroyableObject;
        c.destroyForSpecs();
        expect(destroyableObject.destroy).toHaveBeenCalled();
    });

    it('non-destroyable objects are allowed in the cache', function() {
        var c = createContext();
        var nonDestroyableObject = {};
        c.cache.foo = nonDestroyableObject;
        c.destroyForSpecs();
    });

    it('returns the underling drawingBufferWidth', function() {
        var c = createContext(undefined, 1024, 768);
        expect(c.drawingBufferWidth).toBe(1024);
        c.destroyForSpecs();
    });

    it('returns the underling drawingBufferHeight', function() {
        var c = createContext(undefined, 1024, 768);
        expect(c.drawingBufferHeight).toBe(768);
        c.destroyForSpecs();
    });
    
    describe('blitFramebuffer', function() {
        it('throws when WebGL 2.0 is not supported', function() {
            if (!context.webgl2) {
                expect(function() {
                    context.blitFramebuffer();
                }).toThrowDeveloperError();
            }
        });
        
        it ('throws without source framebuffer', function() {
            if (context.webgl2) {
                var fbo = new Framebuffer({
                    context : context,
                    colorTextures : [new Texture({
                        context : context,
                        width : 1,
                        height : 1
                    })]
                });
                
                expect(function() {
                    context.blitFramebuffer({
                        destination : {
                            framebuffer : fbo
                        }
                    });
                }).toThrowDeveloperError();
                
                fbo.destroy();
            }
        });
        
        it ('throws without destination framebuffer', function() {
            if (context.webgl2) {
                var fbo = new Framebuffer({
                    context : context,
                    colorTextures : [new Texture({
                        context : context,
                        width : 1,
                        height : 1
                    })]
                });
                
                expect(function() {
                    context.blitFramebuffer({
                        source : {
                            framebuffer : fbo
                        }
                    });
                }).toThrowDeveloperError();
                
                fbo.destroy();
            }
        });
        
        it('throws with the same source and destination framebuffers', function() {
            if (context.webgl2) {
                var fbo = new Framebuffer({
                    context : context,
                    colorTextures : [new Texture({
                        context : context,
                        width : 1,
                        height : 1
                    })]
                });
                
                expect(function() {
                    context.blitFramebuffer({
                        source : {
                            framebuffer : fbo
                        },
                        destination : {
                            framebuffer : fbo
                        }
                    });
                }).toThrowDeveloperError();
                
                fbo.destroy();
            }
        });
        
        it('throws when missing a color attachment and the color bit is true', function() {
            if (context.webgl2) {
                var fbo1 = new Framebuffer({
                    context : context,
                    depthRenderbuffer : new Renderbuffer({
                        context : context,
                        width : 1,
                        height : 1,
                        format : RenderbufferFormat.DEPTH_COMPONENT16
                    })
                });
                var fbo2 = new Framebuffer({
                    context : context,
                    colorTextures : [new Texture({
                        context : context,
                        width : 1,
                        height : 1
                    })]
                });
                
                expect(function() {
                    context.blitFramebuffer({
                        source : {
                            framebuffer : fbo1
                        },
                        destination : {
                            framebuffer : fbo2
                        },
                        mask : {
                            color : true
                        }
                    });
                }).toThrowDeveloperError();
                
                expect(function() {
                    context.blitFramebuffer({
                        source : {
                            framebuffer : fbo2
                        },
                        destination : {
                            framebuffer : fbo1
                        },
                        mask : {
                            color : true
                        }
                    });
                }).toThrowDeveloperError();
                
                fbo1.destroy();
                fbo2.destroy();
            }
        });
        
        it('throws when missing a depth renderbuffer attachment and the depth bit is true', function() {
            if (context.webgl2) {
                var fbo1 = new Framebuffer({
                    context : context,
                    depthRenderbuffer : new Renderbuffer({
                        context : context,
                        width : 1,
                        height : 1,
                        format : RenderbufferFormat.DEPTH_COMPONENT16
                    })
                });
                var fbo2 = new Framebuffer({
                    context : context,
                    colorTextures : [new Texture({
                        context : context,
                        width : 1,
                        height : 1
                    })]
                });
                
                expect(function() {
                    context.blitFramebuffer({
                        source : {
                            framebuffer : fbo1
                        },
                        destination : {
                            framebuffer : fbo2
                        },
                        mask : {
                            color : false,
                            depth : true
                        }
                    });
                }).toThrowDeveloperError();
                
                expect(function() {
                    context.blitFramebuffer({
                        source : {
                            framebuffer : fbo2
                        },
                        destination : {
                            framebuffer : fbo1
                        },
                        mask : {
                            color : false,
                            depth : true
                        }
                    });
                }).toThrowDeveloperError();
                
                fbo1.destroy();
                fbo2.destroy();
            }
        });
        
        it('throws when missing a depth texture attachment and the depth bit is true', function() {
            // TODO: This check can be removed when the depth texture issue with Webgl 2.0 is resolved.
            if (context.webgl2 && context.depthTexture) {
                var fbo1 = new Framebuffer({
                    context : context,
                    depthTexture : new Texture({
                        context : context,
                        width : 1,
                        height : 1,
                        pixelFormat : PixelFormat.DEPTH_COMPONENT,
                        pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                    })
                });
                var fbo2 = new Framebuffer({
                    context : context,
                    colorTextures : [new Texture({
                        context : context,
                        width : 1,
                        height : 1
                    })]
                });
                
                expect(function() {
                    context.blitFramebuffer({
                        source : {
                            framebuffer : fbo1
                        },
                        destination : {
                            framebuffer : fbo2
                        },
                        mask : {
                            color : false,
                            depth : true
                        }
                    });
                }).toThrowDeveloperError();
                
                expect(function() {
                    context.blitFramebuffer({
                        source : {
                            framebuffer : fbo2
                        },
                        destination : {
                            framebuffer : fbo1
                        },
                        mask : {
                            color : false,
                            depth : true
                        }
                    });
                }).toThrowDeveloperError();
                
                fbo1.destroy();
                fbo2.destroy();
            }
        });
        
        it('throws when missing all depth attachments and the depth bit is true', function() {
            if (context.webgl2) {
                var fbo1 = new Framebuffer({
                    context : context,
                    colorTextures : [new Texture({
                        context : context,
                        width : 1,
                        height : 1
                    })]
                });
                var fbo2 = new Framebuffer({
                    context : context,
                    colorTextures : [new Texture({
                        context : context,
                        width : 1,
                        height : 1
                    })]
                });
                
                expect(function() {
                    context.blitFramebuffer({
                        source : {
                            framebuffer : fbo1
                        },
                        destination : {
                            framebuffer : fbo2
                        },
                        mask : {
                            color : false,
                            depth : true
                        }
                    });
                }).toThrowDeveloperError();
                
                expect(function() {
                    context.blitFramebuffer({
                        source : {
                            framebuffer : fbo2
                        },
                        destination : {
                            framebuffer : fbo1
                        },
                        mask : {
                            color : false,
                            depth : true
                        }
                    });
                }).toThrowDeveloperError();
                
                fbo1.destroy();
                fbo2.destroy();
            }
        });
        
        it('throws when missing a stencil attachment and the stencil bit is true', function() {
            var fbo1 = new Framebuffer({
                context : context,
                stencilRenderbuffer : new Renderbuffer({
                    context : context,
                    width : 1,
                    height : 1,
                    format : RenderbufferFormat.STENCIL_INDEX8
                })
            });
            var fbo2 = new Framebuffer({
                context : context,
                colorTextures : [new Texture({
                    context : context,
                    width : 1,
                    height : 1
                })]
            });
            
            expect(function() {
                context.blitFramebuffer({
                    source : {
                        framebuffer : fbo1
                    },
                    destination : {
                        framebuffer : fbo2
                    },
                    mask : {
                        color : false,
                        stencil : true
                    }
                });
            }).toThrowDeveloperError();
            
            expect(function() {
                context.blitFramebuffer({
                    source : {
                        framebuffer : fbo2
                    },
                    destination : {
                        framebuffer : fbo1
                    },
                    mask : {
                        color : false,
                        stencil : true
                    }
                });
            }).toThrowDeveloperError();
            
            fbo1.destroy();
            fbo2.destroy();
        });
        
        it('throws when missing all stencil attachments and the stencil bit is true', function() {
            if (context.webgl2) {
                var fbo1 = new Framebuffer({
                    context : context,
                    colorTextures : [new Texture({
                        context : context,
                        width : 1,
                        height : 1
                    })]
                });
                var fbo2 = new Framebuffer({
                    context : context,
                    colorTextures : [new Texture({
                        context : context,
                        width : 1,
                        height : 1
                    })]
                });
                
                expect(function() {
                    context.blitFramebuffer({
                        source : {
                            framebuffer : fbo1
                        },
                        destination : {
                            framebuffer : fbo2
                        },
                        mask : {
                            color : false,
                            stencil : true
                        }
                    });
                }).toThrowDeveloperError();
                
                expect(function() {
                    context.blitFramebuffer({
                        source : {
                            framebuffer : fbo2
                        },
                        destination : {
                            framebuffer : fbo1
                        },
                        mask : {
                            color : false,
                            stencil : true
                        }
                    });
                }).toThrowDeveloperError();
                
                fbo1.destroy();
                fbo2.destroy();
            }
        });
        
        it('throws when missing a depth-stencil renderbuffer attachment and the depth and stencil bits are true', function() {
            if (context.webgl2) {
                var fbo1 = new Framebuffer({
                    context : context,
                    depthStencilRenderbuffer : new Renderbuffer({
                        context : context,
                        width : 1,
                        height : 1,
                        format : RenderbufferFormat.DEPTH_STENCIL
                    })
                });
                var fbo2 = new Framebuffer({
                    context : context,
                    colorTextures : [new Texture({
                        context : context,
                        width : 1,
                        height : 1
                    })]
                });
                
                expect(function() {
                    context.blitFramebuffer({
                        source : {
                            framebuffer : fbo1
                        },
                        destination : {
                            framebuffer : fbo2
                        },
                        mask : {
                            color : false,
                            depth : true,
                            stencil : true
                        }
                    });
                }).toThrowDeveloperError();
                
                expect(function() {
                    context.blitFramebuffer({
                        source : {
                            framebuffer : fbo2
                        },
                        destination : {
                            framebuffer : fbo1
                        },
                        mask : {
                            color : false,
                            depth : true,
                            stencil : true
                        }
                    });
                }).toThrowDeveloperError();
                
                fbo1.destroy();
                fbo2.destroy();
            }
        });
        
        it('throws when missing a depth-stencil texture attachment and the depth and stencil bits are true', function() {
            // TODO: This check can be removed when the depth texture issue with Webgl 2.0 is resolved.
            if (context.webgl2 && context.depthTexture) {
                var fbo1 = new Framebuffer({
                    context : context,
                    depthStencilTexture : new Texture({
                        context : context,
                        width : 1,
                        height : 1,
                        pixelFormat : PixelFormat.DEPTH_STENCIL,
                        pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8
                    })
                });
                var fbo2 = new Framebuffer({
                    context : context,
                    colorTextures : [new Texture({
                        context : context,
                        width : 1,
                        height : 1
                    })]
                });
                
                expect(function() {
                    context.blitFramebuffer({
                        source : {
                            framebuffer : fbo1
                        },
                        destination : {
                            framebuffer : fbo2
                        },
                        mask : {
                            color : false,
                            depth : true,
                            stencil : true
                        }
                    });
                }).toThrowDeveloperError();
                
                expect(function() {
                    context.blitFramebuffer({
                        source : {
                            framebuffer : fbo2
                        },
                        destination : {
                            framebuffer : fbo1
                        },
                        mask : {
                            color : false,
                            depth : true,
                            stencil : true
                        }
                    });
                }).toThrowDeveloperError();
                
                fbo1.destroy();
                fbo2.destroy();
            }
        });
        
        it('throws when missing all depth-stencil attachments and the depth and stencil bits are true', function() {
            if (context.webgl2) {
                var fbo1 = new Framebuffer({
                    context : context,
                    colorTextures : [new Texture({
                        context : context,
                        width : 1,
                        height : 1
                    })]
                });
                var fbo2 = new Framebuffer({
                    context : context,
                    colorTextures : [new Texture({
                        context : context,
                        width : 1,
                        height : 1
                    })]
                });
                
                expect(function() {
                    context.blitFramebuffer({
                        source : {
                            framebuffer : fbo1
                        },
                        destination : {
                            framebuffer : fbo2
                        },
                        mask : {
                            color : false,
                            depth : true,
                            stencil : true
                        }
                    });
                }).toThrowDeveloperError();
                
                expect(function() {
                    context.blitFramebuffer({
                        source : {
                            framebuffer : fbo2
                        },
                        destination : {
                            framebuffer : fbo1
                        },
                        mask : {
                            color : false,
                            depth : true,
                            stencil : true
                        }
                    });
                }).toThrowDeveloperError();
                
                fbo1.destroy();
                fbo2.destroy();
            }
        });
        
        it('throws when the filter is linear and either the depth or stencil bits are set.', function() {
            if (context.webgl2) {
                var fbo1 = new Framebuffer({
                    context : context,colorTextures : [new Texture({
                        context : context,
                        width : 1,
                        height : 1
                    })],
                    depthStencilRenderbuffer : new Renderbuffer({
                        context : context,
                        width : 1,
                        height : 1,
                        format : RenderbufferFormat.DEPTH_STENCIL
                    })
                });
                var fbo2 = new Framebuffer({
                    context : context,
                    colorTextures : [new Texture({
                        context : context,
                        width : 1,
                        height : 1
                    })],
                    depthStencilRenderbuffer : new Renderbuffer({
                        context : context,
                        width : 1,
                        height : 1,
                        format : RenderbufferFormat.DEPTH_STENCIL
                    })
                });
                
                expect(function() {
                    context.blitFramebuffer({
                        source : {
                            framebuffer : fbo1
                        },
                        destination : {
                            framebuffer : fbo2
                        },
                        mask : {
                            color : true,
                            depth : true,
                            stencil : true
                        },
                        linearFilter : true
                    });
                }).toThrowDeveloperError();
                
                fbo1.destroy();
                fbo2.destroy();
            }
        });
    });
}, 'WebGL');
