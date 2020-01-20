const d3 = require('d3');
const { JSDOM } = require('jsdom');
const pretty = require('pretty');

const draw = require('./draw');
const gitGraph = require('./gitgraph');

const util = {};

/** Create a new virtual DOM */
util.initDOM = function initDOM() {
  const dom = new JSDOM();
  const selection = d3.select(dom.window.document.body);

  const ret = {
    dom,
    selection,
  };

  return ret;
};

/** Create a new canvas and return a reference to the context */
util.initCanvas = function initCanvas(shadowSelection) {
  const { dom, selection } = util.initDOM();
  const canvasSelection = selection.append('canvas');

  const canvas = canvasSelection.node();
  const context = canvas.getContext('2d');

  const { width, height } = draw.getCanvasSize(context, shadowSelection);

  canvasSelection.attr('width', width).attr('height', height);

  const ret = {
    dom,
    selection,
    canvas,
    context,
  };

  return ret;
};

/** Create a new virtual DOM and virtual canvas, render the given graph, and
 * return a reference to the populated DOM */
util.renderGraph = function renderGraph(graph) {
  const shadowInfo = util.initDOM();
  initShadow(shadowInfo, graph);

  //once our shadow is accurate, draw it
  const canvasInfo = util.initCanvas(shadowInfo.selection);
  draw.drawGraph(canvasInfo.context, shadowInfo.selection);

  //create final output
  // const ret = createOutput(shadowInfo, canvasInfo);
  const ret = createImageOutput(canvasInfo);
  return ret;
};

const initShadow = (shadowInfo, graph) => {
  shadowInfo.selection
    .selectAll('branch')
    .data(graph.branches)
    .enter()
    .append('branch')
    .attr('name', branch => branch.name)
    .attr(
      'color',
      (branch, i, branches) =>
        branch.color || draw.generateColor(i, branches.length)
    )
    .selectAll('commit')
    .data(graph.commits)
    .enter()
    .append('commit')
    .attr('type', function(commit, i, nodes) {
      const branch = d3.select(this.parentNode).datum();

      if (
        commit.branch !== branch.name &&
        commit.type !== gitGraph.commitTypes.START &&
        commit.type !== gitGraph.commitTypes.END
      )
        return gitGraph.commitTypes.EMPTY;

      return commit.type;
    })
    .attr('from', function(commit, i, nodes) {
      const branch = d3.select(this.parentNode).datum();
      if (commit.branch !== branch.name) return;

      if (
        commit.type === gitGraph.commitTypes.BRANCH ||
        commit.type === gitGraph.commitTypes.MERGE
      )
        return commit.from;
    })
    .attr('dashed', function(commit, i, nodes) {
      const branch = d3.select(this.parentNode).datum();
      if (commit.branch !== branch.name) return;

      if (
        commit.type === gitGraph.commitTypes.BRANCH ||
        commit.type === gitGraph.commitTypes.MERGE
      )
        return commit.dashed;
    })
    .attr('inplace', function(commit, i, nodes) {
      if (commit.inplace) return true;
    })
    .text(function(commit, i, nodes) {
      const branch = d3.select(this.parentNode).datum();
      if (commit.branch !== branch.name) return '';

      return commit.message || '';
    });
};

const createOutput = (shadowInfo, canvasInfo) => {
  const dom = new JSDOM();
  const { document } = dom.window;

  const img = document.createElement('img');
  img.style.border = '1px solid red';
  img.src = canvasInfo.canvas.toDataURL();
  document.body.appendChild(img);

  const pre = document.createElement('pre');
  pre.style.borderTop = '1px solid #666';
  pre.style.paddingTop = '1em';
  pre.textContent = pretty(shadowInfo.dom.window.document.body.innerHTML);
  document.body.appendChild(pre);

  return dom.serialize();
};

const createImageOutput = canvasInfo => {
  const base64 = canvasInfo.canvas.toDataURL();
  const data = base64.split(',')[1];
  const ret = Buffer.from(data, 'base64');

  return ret;
};

//
module.exports = util;
