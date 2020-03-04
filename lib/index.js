const util = require('./util');
const draw = require('./draw');

const lib = {
  /**
   * Generate the source of an SVG diagram for the given graph
   * @param {Graph} graph
   * @returns {string} The new SVG
   */
  buildSvg: graph => {
    const { dom, selection } = util.initDOM();

    //process data
    const data = util.processGraph(graph);

    //draw graph
    const svg = draw.createGraph2(data, selection);
    // selection.node().appendChild(svg.node());

    //done :)
    selection.append('pre').text(JSON.stringify(data, null, ' '));
    return dom.serialize();
  },
};

module.exports = lib;
