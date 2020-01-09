const d3 = require('d3');
const { JSDOM } = require('jsdom');

const util = {};

/** Create a new virtual DOM */
util.initDOM = function initDOM() {
  const dom = new JSDOM();
  const body = d3.select(dom.window.document.body);

  const ret = {
    dom,
    body,
  };

  return ret;
};

/** Create a new canvas and return a reference to the context */
util.initCanvas = function initCanvas() {
  const { dom, body } = util.initDOM();

  const canvas = body
    .append('canvas')
    .attr('width', 1024)
    .attr('height', 512);

  const context = canvas.node().getContext('2d');

  const ret = {
    dom,
    body,
    canvas,
    context,
  };

  return ret;
};

/** Create a new virtual DOM and virtual canvas, render the given graph, and
 * return a reference to the populated DOM */
util.renderGraph = function renderGraph(graph) {
  const canvasInfo = util.initCanvas();
  const shadowInfo = util.initDOM();

  //create elements in the DOM to keep track of our graph
  const selection = shadowInfo.body.selectAll('branch').data(graph.branches);

  selection
    .enter()
    .append('branch')
    .text(d => d.name);

  //add fake dom to canvas dom
  const pre = canvasInfo.dom.window.document.createElement('pre');
  pre.textContent = shadowInfo.dom.window.document.body.innerHTML;

  canvasInfo.dom.window.document.body.appendChild(pre);

  //done :)
  return canvasInfo.dom;
};

//
module.exports = util;
