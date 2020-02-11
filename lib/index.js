const d3 = require('d3');
const { JSDOM } = require('jsdom');

const { commitTypes } = require('./gitgraph');
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

    //create scales
    const maxIndex = Math.max(
      ...data.map(branch =>
        Math.max(...branch.values.map(commit => commit.index))
      )
    );

    const scale = {
      x: d3.scaleLinear([0, 1], [0, draw.BRANCH_WIDTH]),
      y: d3.scaleLinear([0, maxIndex], [maxIndex * draw.COMMIT_HEIGHT, 0]),
    };

    //the whole svg
    const svg = selection
      .append('svg')
      .attr('width', 1024)
      .attr('height', 512)
      .attr('style', 'outline: 1px solid red;');

    //use a group to apply our outer padding
    const main = svg
      .append('g')
      .attr('id', 'main')
      .attr(
        'transform',
        `translate(${draw.PADDING_HORIZONTAL}, ${draw.PADDING_VERTICAL})`
      );

    //use a group for each branch
    const branches = main
      .selectAll('g')
      .data(data)
      .enter()
      .append('g')
      .attr('id', branch => branch.key)
      .attr('transform', (_, i) => `translate(${i * draw.BRANCH_WIDTH}, 0)`);

    //for each branch, add commit lines first
    const line = d3
      .line()
      .defined((commit, i, commits) => {
        //only show our start commit as defined if this branch has commits
        //before start (aka index < 0)
        if (commit.index === 0)
          return !!commits.find(otherCommit => otherCommit.index < 0);

        //otherwise we only care about commits after start
        return commit.index > 0;
      })
      .x(scale.x(0.5))
      .y(commit => scale.y(commit.index));

    branches.each(function(branch) {
      d3.select(this)
        .append('path')
        .attr('d', line(branch.values))
        .attr('fill', 'none')
        .attr('stroke', 'black');
    });

    //then circles
    branches
      .selectAll('circle')
      .data(branch =>
        branch.values.filter(
          commit => commit.index > 0 && commit.type != commitTypes.END
        )
      )
      .enter()
      .append('circle')
      .attr('cx', scale.x(0.5))
      .attr('cy', commit => scale.y(commit.index))
      .attr('r', draw.COMMIT_RADIUS);

    //then ripples
    branches.each(function(branch) {
      const branchSelection = d3.select(this);

      //start ripple
      if (branch.values.find(commit => commit.index < 0)) {
        branchSelection
          .append('path')
          .attr('transform', `translate(${scale.x(0.5)}, ${scale.y(0)})`)
          .attr('d', util.ripplePath)
          .attr('fill', 'none')
          .attr('stroke', 'green');
      }

      //end ripple
      if (!branch.values.find(commit => commit.type === commitTypes.DELETE)) {
        branchSelection
          .append('path')
          .attr('transform', `translate(${scale.x(0.5)}, ${scale.y(maxIndex)})`)
          .attr('d', util.ripplePath)
          .attr('fill', 'none')
          .attr('stroke', 'green');
      }
    });

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
    //[{ key: "branch", values: [ commits ] }]
    const nested = d3
      .nest()
      .key(commit => commit.branch)
      .sortKeys((a, b) => d3.ascending(indices[a], indices[b]))
      .sortValues((a, b) => d3.ascending(a.index, b.index))
      .entries(graph.commits.filter(commit => commit.branch));

    //add a start and end "commit" to each branch
    let maxIndex = -1;

    nested.forEach(branch => {
      //add the start commit at index 0
      let firstPositiveIndex = 0;

      for (let i = 0; i < branch.values.length; i++) {
        const { index } = branch.values[i];

        if (index > 0) {
          if (!firstPositiveIndex) firstPositiveIndex = i;
          if (index > maxIndex) maxIndex = index;
        }
      }

      branch.values.splice(firstPositiveIndex, 0, {
        type: commitTypes.START,
        index: 0,
      });
    });

    //add the end commit at the end
    if (maxIndex > 0) {
      nested.forEach(branch => {
        //but only if the branch wasn't deleted
        const deleteCommit = branch.values.find(
          commit => commit.type === commitTypes.DELETE
        );

        if (!deleteCommit)
          branch.values.push({ type: commitTypes.END, index: maxIndex + 1 });
      });
    }

    return nested;
  },

  ripplePath: (() => {
    const steps = 5;

    const xStep = draw.COMMIT_RADIUS / (steps / 2);
    const yStep = 4;

    const ret = `
      M ${-draw.COMMIT_RADIUS}, ${-yStep / 2}
      l ${xStep}, ${yStep}
      l ${xStep}, ${-yStep}
      l ${xStep}, ${yStep}
      l ${xStep}, ${-yStep}
      l ${xStep}, ${yStep}
    `;

    return ret.replace(/[\n\s]/g, '');
  })(),
};

module.exports = lib;
