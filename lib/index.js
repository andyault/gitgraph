const d3 = require('d3');
const { JSDOM } = require('jsdom');

const { commitTypes } = require('./gitgraph');

const lib = {
  /**
   * Generate the source of an SVG diagram for the given graph
   * @param {Graph} graph
   * @returns {string} The new SVG
   */
  buildSvg: graph => {
    const { dom, selection } = util.initDOM();
    const svg = selection.append('svg');

    const data = util.processGraph(graph);

    selection.append('pre').text(JSON.stringify(data, null, ' '));
    return dom.serialize();
  },

  /**
   * Convert the given svg into an image
   * @param {string} svg
   * @returns {Buffer} The new image
   */
  buildImageFromSvg: svg => {
    const { dom, selection } = util.initDOM();

    const canvasSelection = selection.append('canvas');
    const canvas = canvasSelection.node();
    const context = canvas.getContext('2d');

    const width = 1024;
    const height = 512;

    canvasSelection.attr('width', width).attr('height', height);

    // draw svg on canvas

    const base64 = canvas.toDataURL();
    const data = base64.split(',')[1];
    const ret = Buffer.from(data, 'base64');

    return ret;
  },
};

const util = {
  /** Create a new virtual DOM and return it */
  initDOM: () => {
    const dom = new JSDOM();
    const selection = d3.select(dom.window.document.body);

    return { dom, selection };
  },

  /**
   * Process the given Graph convert it to a more digestible format
   * @param {Graph} graph - The graph to process
   * @returns {object[]} The processed data
   */
  processGraph: graph => {
    //keep a map of each branch name to its index
    const indices = graph.branches.reduce(
      (previous, branch, i) => ({ ...previous, [branch.name]: i }),
      { [undefined]: -1 }
    );

    //iterate through the graph and turn it into:
    //[{ key: "name", values: [ commits ] }]
    const data = d3
      .nest()
      .key(commit => commit.branch)
      .sortKeys((a, b) => d3.ascending(indices[a], indices[b]))
      .sortValues((a, b) => d3.ascending(a.index, b.index))
      .entries(graph.commits);

    return data;
  },
};

module.exports = lib;
