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

    //map each branch name to its index
    const branchIndices = data.reduce(
      (hash, branch, i) => ({ ...hash, [branch.key]: i }),
      {}
    );

    //the whole svg
    const svg = selection
      .append('svg')
      .attr('width', 256)
      .attr('height', 592)
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
      .attr('transform', (_, i) => `translate(${i * draw.BRANCH_WIDTH}, 0)`)
      .attr('fill', 'none')
      .attr('stroke', branch => branch.color)
      .attr('stroke-width', '4');

    //and a group for merge lines
    const mergeLines = main.insert('g', ':first-child');

    //for each branch, add merge lines first
    branches.each(function(branch, i) {
      for (let j = branch.values.length - 1; j >= 0; j--) {
        const mergeCommit = branch.values[j];

        if (
          mergeCommit.index > 0 &&
          (mergeCommit.type === commitTypes.MERGE ||
            mergeCommit.type === commitTypes.BRANCH)
        ) {
          const fromX = scale.x(i + 0.5);
          const fromY = scale.y(mergeCommit.index);
          const toX = scale.x(branchIndices[mergeCommit.from] + 0.5);
          const r = Math.min(draw.BRANCH_WIDTH, draw.COMMIT_HEIGHT) / 2;
          const sign = Math.sign(fromX - toX);
          const dir = (sign + 1) / 2;

          const path = util.trimPathString(`
            M ${fromX}, ${fromY}
            a ${r}, ${r}, 90, 0, ${dir}, ${-sign * r}, ${r}
            l ${toX - fromX + sign * r * 2}, 0
            a ${r}, ${r}, 90, 0, ${1 - dir}, ${-sign * r}, ${r}
          `);

          const mergeLine = mergeLines
            .append('path')
            .attr('d', path)
            .attr('fill', 'none')
            .attr('stroke', branch.color)
            .attr('stroke-width', 4);

          if (mergeCommit.dashed) mergeLine.attr('stroke-dasharray', '4');
        }
      }
    });

    //then commit lines
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
        .attr('d', line(branch.values));
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
      .attr('r', draw.COMMIT_RADIUS)
      .attr('fill', function() {
        return d3.select(this.parentNode).datum().color;
      })
      .attr('stroke', '#fff')
      .attr('paint-order', 'stroke')
      .attr('stroke-width', 8);

    //then ripples
    branches.each(function(branch) {
      const branchSelection = d3.select(this);

      //start ripple
      if (branch.values.find(commit => commit.index < 0)) {
        branchSelection
          .append('path')
          .attr('transform', `translate(${scale.x(0.5)}, ${scale.y(0)})`)
          .attr('d', util.ripplePath)
          .attr('stroke', '#fff')
          .attr('stroke-width', 8);

        branchSelection
          .append('path')
          .attr('transform', `translate(${scale.x(0.5)}, ${scale.y(0)})`)
          .attr('d', util.ripplePath);
      }

      //end ripple
      if (!branch.values.find(commit => commit.type === commitTypes.DELETE)) {
        branchSelection
          .append('path')
          .attr('transform', `translate(${scale.x(0.5)}, ${scale.y(maxIndex)})`)
          .attr('d', util.ripplePath)
          .attr('stroke', '#fff')
          .attr('stroke-width', '8');

        branchSelection
          .append('path')
          .attr('transform', `translate(${scale.x(0.5)}, ${scale.y(maxIndex)})`)
          .attr('d', util.ripplePath);
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

    nested.forEach((branch, i) => {
      //add the start commit at index 0
      let firstPositiveIndex;

      for (let i = 0; i < branch.values.length; i++) {
        const { index } = branch.values[i];

        if (index > 0) {
          if (firstPositiveIndex === undefined) firstPositiveIndex = i;
          if (index > maxIndex) maxIndex = index;
        }
      }

      branch.values.splice(firstPositiveIndex || 0, 0, {
        type: commitTypes.START,
        index: 0,
      });

      //while we're here, add color
      branch.color = graph.branches[i].color;
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

  trimPathString: str => str.replace(/[\n\s]/g, ''),
};

util.ripplePath = (() => {
  const steps = 5;

  const xStep = draw.COMMIT_RADIUS / (steps / 2);
  const yStep = 4;

  const ret = `
    M ${-draw.COMMIT_RADIUS}, ${-yStep / 2}
    l ${xStep}, ${yStep}
    , ${xStep}, ${-yStep}
    , ${xStep}, ${yStep}
    , ${xStep}, ${-yStep}
    , ${xStep}, ${yStep}
  `;

  return util.trimPathString(ret);
})();

module.exports = lib;
