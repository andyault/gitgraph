const d3 = require('d3');
const { JSDOM } = require('jsdom');

const { commitTypes } = require('./gitgraph');

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
    //[{ key: "branch", values: [ commits ], color }]
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
      branch.color =
        graph.branches[i].color || util.generateColor(i, nested.length);
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

  getMergeCommits: nested => {
    //keep a hash of branch names to their indices
    const branchIndices = nested.reduce(
      (branchIndices, branch, i) => ({ ...branchIndices, [branch.key]: i }),
      []
    );

    //flattern all commits
    const mergeCommits = nested.reduce((mergeCommits, branch) => {
      const toIndex = branchIndices[branch.key];

      const newCommits = branch.values
        .filter(
          commit =>
            commit.index > 0 &&
            (commit.type === commitTypes.MERGE ||
              commit.type === commitTypes.BRANCH)
        )
        .map(commit => {
          const fromIndex = branchIndices[commit.from];

          const values = [
            { x: fromIndex, y: commit.index - 1 },
            { x: toIndex, y: commit.index },
          ];

          return { ...commit, values, color: branch.color };
        });

      return [...mergeCommits, ...newCommits];
    }, []);

    return mergeCommits;
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

  /**
   * Given an svg path string, trim newlines and spaces
   * @param {string} str - The string to trim
   * @returns {string} The trimmed string
   */
  trimPathString: str => str.replace(/[\n\s]/g, ''),

  /**
   * Given an index and a length, generate an equally spaced color
   * @param {number} i - The current index
   * @param {number} length - The max possible index
   * @returns {string} The generated color string
   */
  generateColor: (i, length) => `hsl(${(i / length) * 360},50%,50%)`,
};

module.exports = util;
