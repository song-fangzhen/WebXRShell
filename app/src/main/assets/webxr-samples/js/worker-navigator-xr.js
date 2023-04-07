// Copyright 2023 The Immersive Web Community Group
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import {Scene} from './render/scenes/scene.js';
import {Renderer} from './render/core/renderer.js';
import {Node} from './render/core/node.js';
import {Gltf2Node} from './render/nodes/gltf2.js';
import {SkyboxNode} from './render/nodes/skybox.js';
import {BoxBuilder} from './render/geometry/box-builder.js';
import {PbrMaterial} from './render/materials/pbr.js';
import {mat4} from './render/math/gl-matrix.js';

// XR globals.
let g_xr_immersive_ref_space = null;

// WebGL scene globals.
let g_gl = null;
let g_render = null;
let g_scene = null;
let g_boxes = [];

/*================ Shaders ====================*/

// Vertex shader source code
var vertCode =
'attribute vec3 coordinates;' +

'void main(void) {' +
   ' gl_Position = vec4(coordinates, 1.0);' +
'}';

//fragment shader source code
var fragCode =
'void main(void) {' +
   ' gl_FragColor = vec4(1.0, 1.0, 1.0, 0.1);' +
'}';

let scale = 0.25;
let vertices = [
   -0.5,0.5,0.0,
   -0.5,-0.5,0.0,
   0.5,-0.5,0.0,
];
vertices = vertices.map(x => x * scale);

let indices = [0,1,2];

let g_gl_initialized = false;
let g_shader_program = null;

function initializeIfNeed() {
    if (g_gl_initialized) {
        return;
    }

    let gl = g_gl;

    // Create an empty buffer object to store vertex buffer
    let vertexBuffer = gl.createBuffer();
    // Bind appropriate array buffer to it
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Pass the vertex data to the buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    // Unbind the buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Create an empty buffer object to store Index buffer
    let indexBuffer = gl.createBuffer();
    // Bind appropriate array buffer to it
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    // Pass the index data to the buffer
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    // Unbind the buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    // Create a vertex shader object
    let vertShader = gl.createShader(gl.VERTEX_SHADER);
    // Attach vertex shader source code
    gl.shaderSource(vertShader, vertCode);
    // Compile the vertex shader
    gl.compileShader(vertShader);

    // Create fragment shader object
    let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    // Attach fragment shader source code
    gl.shaderSource(fragShader, fragCode);
    // Compile the fragment shader
    gl.compileShader(fragShader);

    // Create a shader program object to store
    // the combined shader program
    let shaderProgram = gl.createProgram();
    // Attach a vertex shader
    gl.attachShader(shaderProgram, vertShader);
    // Attach a fragment shader
    gl.attachShader(shaderProgram, fragShader);

    // Link both the programs
    gl.linkProgram(shaderProgram);

    // Use the combined shader program object
    gl.useProgram(shaderProgram);

    /*======= Associating shaders to buffer objects =======*/

    // Bind vertex buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Bind index buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // Get the attribute location
    var coord = gl.getAttribLocation(shaderProgram, "coordinates");
    // Point an attribute to the currently bound VBO
    gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);
    // Enable the attribute
    gl.enableVertexAttribArray(coord);

    g_shader_program = shaderProgram;
    g_gl_initialized = true;
}

function drawFrame() {
    initializeIfNeed();

    let gl = g_gl;

    // Use the combined shader program object
    gl.useProgram(g_shader_program);

    /*=========Drawing the triangle===========*/

    // Draw the triangle
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
}

class Drawer {
  constructor(draw_scene) {
    this.#draw_scene = draw_scene;
  }
  draw(draw_info) {
    this.#draw_scene ? this.#scene(draw_info) : this.#triangle(draw_info);
  }
  #triangle(draw_info) {
    let pose = draw_info.pose;
    let session = draw_info.session;

    let gl = g_gl;
    let glLayer = session.renderState.baseLayer;
    gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);
    // 清理颜色, 默认为黑色.
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    for (let view of pose.views) {
        let viewport = glLayer.getViewport(view);
        gl.viewport(viewport.x, viewport.y,
                    viewport.width, viewport.height);

        drawFrame();
    }
    gl.flush();
  }
  #scene(draw_info) {
      let frame = draw_info.frame;
      let pose = draw_info.pose;
      let time = draw_info.time;

      let boxes = g_boxes;
      let scene = g_scene;
      scene.startFrame();
      // Update the matrix for each box
      for (let box of boxes) {
        let node = box.node;
        mat4.identity(node.matrix);
        mat4.translate(node.matrix, node.matrix, box.position);
        mat4.rotateX(node.matrix, node.matrix, time/1000);
        mat4.rotateY(node.matrix, node.matrix, time/1500);
        mat4.scale(node.matrix, node.matrix, box.scale);
      }
      scene.drawXRFrame(frame, pose);
      scene.endFrame();
  }
  #draw_scene = true;
};

let g_drawer = null;

// Called every time a XRSession requests that a new frame be drawn.
function onXRFrame(time, frame) {
    let session = frame.session;
    session.requestAnimationFrame(onXRFrame);

    let pose = frame.getViewerPose(g_xr_immersive_ref_space);
    if (pose) {
        const draw_info = {
            frame: frame,
            pose: pose,
            session: session,
            time: time
        };
        g_drawer.draw(draw_info);
    }
}

function startRequestImmersiveSession() {
    navigator.xr.requestSession('immersive-vr').then((session) => {
        let offscreenCanvas = new OffscreenCanvas(18, 18);
        let gl = offscreenCanvas.getContext('webgl', {
          xrCompatible: true
        });

        // Create a renderer with that GL context (this is just for the samples
        // framework and has nothing to do with WebXR specifically.)
        let renderer = new Renderer(gl);

        let scene = new Scene();
//        scene.addNode(new Gltf2Node({url: '../media/gltf/cube-room/cube-room.gltf'}));
        scene.addNode(new Gltf2Node({url: '../media/gltf/space/space.gltf'}));
//        scene.addNode(new SkyboxNode({url: '../media/textures/milky-way-4k.png'}));

        // Set the scene's renderer, which creates the necessary GPU resources.
        scene.setRenderer(renderer);

        // Create several boxes to use for hit testing.
        let boxes = [];
        let boxBuilder = new BoxBuilder();
        boxBuilder.pushCube([0, 0, 0], 0.4);
        let boxPrimitive = boxBuilder.finishPrimitive(renderer);

        function _addBox(x, y, z, r, g, b) {
          let boxMaterial = new PbrMaterial();
          boxMaterial.baseColorFactor.value = [r, g, b, 1.0];
          let boxRenderPrimitive = renderer.createRenderPrimitive(boxPrimitive, boxMaterial);
          let boxNode = new Node();
          boxNode.addRenderPrimitive(boxRenderPrimitive);
          // Marks the node as one that needs to be checked when hit testing.
          boxNode.selectable = true;
          boxes.push({
            node: boxNode,
            renderPrimitive: boxRenderPrimitive,
            position: [x, y, z],
            scale: [1, 1, 1],
          });
          scene.addNode(boxNode);
        }

        _addBox(-1.0, 0.0, -1.3, 1.0, 0.0, 0.0);
        _addBox(0.0, 0.1, -1.5, 0.0, 1.0, 0.0);
        _addBox(1.0, 0.0, -1.3, 0.0, 0.0, 1.0);

        // Use the new WebGL context to create a XRWebGLLayer and set it as the
        // sessions baseLayer. This allows any content rendered to the layer to
        // be displayed on the XRDevice.
        let glLayer = new XRWebGLLayer(session, gl);
        session.updateRenderState({
          baseLayer: glLayer
        });

        let draw_scene = true;
        let refSpaceType = draw_scene ? 'local' : 'viewer';
        session.requestReferenceSpace(refSpaceType).then((refSpace) => {
            g_boxes = boxes;
            g_drawer = new Drawer(draw_scene);
            g_gl = gl;
            g_render = renderer;
            g_scene = scene;
            g_xr_immersive_ref_space = refSpace;

            session.addEventListener('end', onSessionEnded);
            session.requestAnimationFrame(onXRFrame);

            if (!draw_scene) {
                let auto_exit_time = 3000;
                setTimeout(() => {
                    stopImmersiveSessionAnimate(session);
                }, auto_exit_time);
            }
        });
    });
}

function stopImmersiveSessionAnimate(session) {
    session.end();
}

function onSessionEnded(event) {
    g_boxes = [];
    g_drawer = null;
    g_gl = null;
    g_gl_initialized = false;
    g_render = null;
    g_scene = null;
    g_shader_program = null;
    g_xr_immersive_ref_space = null;
}

const CALLBACKS = {
isSessionSupported : () => {
    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        console.log(`supported: ${supported}`);
        postMessage(['is-session-supported', supported]);
    });
},
onRequestSession : () => {
    startRequestImmersiveSession();
}
};

onmessage = function(e) {
    let type = e.data[0];
    switch(type) {
        case 'is-session-supported':
            CALLBACKS.isSessionSupported();
        break;

        case 'requestSession':
            CALLBACKS.onRequestSession();
        break;

        default:
            console.log('Not supported msg type.');
        break;
    }
}
