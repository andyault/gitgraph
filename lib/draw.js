const d3 = require('d3');

const { commitTypes } = require('./gitgraph');
const util = require('./util');

//ugly!
//d3.create tries to use the global document.documentElement which doesn't exist
//instead, we need to use the jsdom documentElement
//but this is giving InvalidCharacterErrors about names being [object Object]
const { dom } = util.initDOM();
const create = name =>
  d3.select(d3.creator(name).call(dom.window.document.documentElement));
const append = (parent, child) =>
  d3.select(parent.node().appendChild(child.node()));

const draw = {
  //constants
  PADDING_HORIZONTAL: 16,
  PADDING_VERTICAL: 16,

  COMMIT_RADIUS: 12,
  LINE_WIDTH: 4,
  FONT_SIZE: 16,
  FONT_FAMILY: 'helvetica, segoe ui, sans-serif',
  BACKGROUND_COLOR: '#fff',

  //  horizontal
  LEGEND_WIDTH: null,
  COMMIT_MESSAGE_ROTATION_DEGS: 30,
  BRANCH_HEIGHT: 32,
  COMMIT_WIDTH: 48,

  //  vertical
  BRANCH_WIDTH: 32,
  COMMIT_HEIGHT: 48,

  //  axes - don't edit
  AXIS_HORIZONTAL: 'AXIS_HORIZONTAL',
  AXIS_VERTICAL: 'AXIS_VERTICAL',

  //methods
  createGraph: data => {
    //create scales
    const maxIndex = Math.max(
      ...data.map(branch =>
        Math.max(...branch.values.map(commit => commit.index))
      )
    );

    //todo - see if we can get away with [0, 1], [COMMIT_HEIGHT, 0]
    const scale = {
      x: d3.scaleLinear([0, 1], [0, draw.BRANCH_WIDTH]),
      y: d3.scaleLinear([0, maxIndex], [maxIndex * draw.COMMIT_HEIGHT, 0]),
    };

    //the whole svg
    const svg = create('svg')
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

    //and a group for merge lines
    const mergeLines = drawUtil.createMergeLines(data, scale);
    append(main, mergeLines);

    //use a group for each branch
    const branches = main
      .selectAll('g.branch')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'branch')
      .attr('id', branch => branch.key)
      .attr('transform', (_, i) => `translate(${scale.x(i)}, 0)`)
      .attr('fill', 'none')
      .attr('stroke', branch => branch.color)
      .attr('stroke-width', '4');

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
      .selectAll('circle.commit')
      .data(branch =>
        branch.values.filter(
          commit =>
            commit.index > 0 &&
            commit.type != commitTypes.END &&
            commit.type != commitTypes.DELETE
        )
      )
      .enter()
      .append('circle')
      .attr('class', 'commit')
      .attr('cx', scale.x(0.5))
      .attr('cy', commit => scale.y(commit.index))
      .attr('r', draw.COMMIT_RADIUS)
      .attr('fill', function() {
        return d3.select(this.parentNode).datum().color;
      })
      .attr('stroke', '#fff')
      .attr('paint-order', 'stroke')
      .attr('stroke-width', 4);

    //then ripples
    branches.each(function(branch) {
      const branchSelection = d3.select(this);

      //x
      const deleteCommit = branch.values.find(
        commit => commit.type === commitTypes.DELETE
      );

      if (deleteCommit) {
        append(
          branchSelection,
          drawUtil.createX(scale.x(0.5), scale.y(deleteCommit.index))
        );
      }

      //start ripple
      if (branch.values.find(commit => commit.index < 0)) {
        append(
          branchSelection,
          drawUtil.createRipple(scale.x(0.5), scale.y(0))
        );
      }

      //end ripple
      if (!branch.values.find(commit => commit.type === commitTypes.DELETE)) {
        append(
          branchSelection,
          drawUtil.createRipple(scale.x(0.5), scale.y(maxIndex))
        );
      }
    });

    return svg;
  },

  createGraph2: (data, selection) => {
    const svg = drawUtil.onSvgEnter(selection);
    const main = drawUtil.onMainEnter(svg);

    console.log(svg.empty(), svg);

    main.call(draw.redraw, data);

    return svg;
  },

  redraw: (main, data) => {
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

    //
    // const mergeLines = drawUtil.createMergeLines(data, scale);
    // append(main, mergeLines);

    //branches
    const branches = main
      .selectAll('g.branch')
      .data(data, branch => branch.key)
      .join(enter => drawUtil.onBranchEnter(enter, scale));

    //commits
    branches
      .selectAll('circle.commit')
      .data(branch =>
        branch.values.filter(
          commit =>
            commit.index > 0 &&
            commit.type != commitTypes.END &&
            commit.type != commitTypes.DELETE
        )
      )
      .join(enter => drawUtil.onCommitEnter(enter, scale));

    branches.each(function(branch) {
      const branchSelection = d3.select(this);

      //branch lines
      const branchLine = drawUtil.createBranchLine(scale);

      branchSelection.join(noop, update =>
        drawUtil.onBranchLineUpdate(update, branchLine)
      );

      //start ripple
      const preStartCommit = branch.values.find(commit => commit.index < 0);

      if (preStartCommit) {
        branchSelection.join(noop, update =>
          drawUtil.onStartUpdate(update, scale)
        );
      }

      //X and end ripple
      const deleteCommit = branch.values.find(
        commit => commit.type === commitTypes.DELETE
      );

      if (deleteCommit) {
        branchSelection.join(noop, update =>
          drawUtil.onDeleteUpdate(update, deleteCommit, scale)
        );
      } else {
        branchSelection.join(noop, update =>
          drawUtil.onEndUpdate(update, maxIndex, scale)
        );
      }
    });
  },
};

//
const drawUtil = {
  //calculated constants
  commitMessageRotation: (draw.COMMIT_MESSAGE_ROTATION_DEGS * Math.PI) / 180,
  font: `${draw.FONT_SIZE}px ${draw.FONT_FAMILY}`,
  fontBold: `bold ${Math.ceil(draw.FONT_SIZE * 0.75)}px ${draw.FONT_FAMILY}`,

  //path constants
  xPath: (() => {
    const radius = draw.COMMIT_RADIUS * 0.618;

    const xPath = util.trimPathString(`
      M ${-radius}, ${-radius}
      L ${radius}, ${radius}
      M ${-radius}, ${radius}
      L ${radius}, ${-radius}
    `);

    return xPath;
  })(),

  ripplePath: (() => {
    const steps = 5;

    const xStep = draw.COMMIT_RADIUS / (steps / 2);
    const yStep = 4;

    const ripplePath = util.trimPathString(`
      M ${-draw.COMMIT_RADIUS}, ${-yStep / 2}
      l ${xStep}, ${yStep}
      , ${xStep}, ${-yStep}
      , ${xStep}, ${yStep}
      , ${xStep}, ${-yStep}
      , ${xStep}, ${yStep}
    `);

    return ripplePath;
  })(),

  //selections
  onSvgEnter: selection => {
    return selection
      .append('svg')
      .attr('width', 256)
      .attr('height', 592)
      .attr('style', 'outline: 1px solid red;');
  },

  onMainEnter: selection => {
    return selection
      .append('g')
      .attr('id', 'main')
      .attr(
        'transform',
        `translate(${draw.PADDING_HORIZONTAL}, ${draw.PADDING_VERTICAL})`
      );
  },

  onBranchEnter: (selection, scale) => {
    return selection
      .append('g')
      .attr('id', branch => branch.key)
      .attr('class', 'branch')
      .attr('transform', (_, i) => `translate(${scale.x(i)}, 0)`)
      .attr('fill', 'none')
      .attr('stroke', branch => branch.color)
      .attr('stroke-width', '4');
  },

  onCommitEnter: (selection, scale) => {
    return selection
      .append('circle')
      .attr('class', 'commit')
      .attr('cx', scale.x(0.5))
      .attr('cy', commit => scale.y(commit.index))
      .attr('r', draw.COMMIT_RADIUS)
      .attr('fill', function() {
        return d3.select(this.parentNode).datum().color;
      })
      .attr('stroke', '#fff')
      .attr('paint-order', 'stroke')
      .attr('stroke-width', 4);
  },

  //updates
  onBranchLineUpdate: (selection, line) => {
    return selection.append('path').attr('d', branch => line(branch.values));
  },

  onStartUpdate: (selection, scale) => {
    const ripple = selection
      .append('g')
      .attr('class', 'ripple ripple-start')
      .attr('transform', `translate(${scale.x(0.5)}, ${scale.y(0)})`);

    ripple
      .append('path')
      .attr('d', drawUtil.ripplePath)
      .attr('stroke', '#fff')
      .attr('stroke-width', 8);

    ripple.append('path').attr('d', drawUtil.ripplePath);

    return ripple;
  },

  onDeleteUpdate: (selection, deleteCommit, scale) => {
    const x = selection
      .append('g')
      .attr('class', 'x')
      .attr(
        'transform',
        `translate(${scale.x(0.5)}, ${scale.y(deleteCommit.index)})`
      );

    x.append('path')
      .attr('d', drawUtil.xPath)
      .attr('stroke', '#fff')
      .attr('stroke-width', 8);

    x.append('path').attr('d', drawUtil.xPath);

    return x;
  },

  onEndUpdate: (selection, maxIndex, scale) => {
    const ripple = selection
      .append('g')
      .attr('class', 'ripple ripple-end')
      .attr('transform', `translate(${scale.x(0.5)}, ${scale.y(maxIndex)})`);

    ripple
      .append('path')
      .attr('d', drawUtil.ripplePath)
      .attr('stroke', '#fff')
      .attr('stroke-width', 8);

    ripple.append('path').attr('d', drawUtil.ripplePath);

    return ripple;
  },

  //lines
  createBranchLine: scale => {
    return d3
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
  },

  //groups
  createMergeLines: (data, scale) => {
    //create a new group for merge lines
    //note that we can't draw merge lines in the branch groups
    //because we need commit lines to overlap all merge lines
    const mergeLines = create('g')
      .attr('fill', 'none')
      .attr('stroke-width', 4);

    //map each branch name to its index
    const branchIndices = data.reduce(
      (hash, branch, i) => ({ ...hash, [branch.key]: i }),
      {}
    );

    //iterate data
    for (let i = 0; i < data.length; i++) {
      const branch = data[i];

      for (let j = 0; j < branch.values.length; j++) {
        const commit = branch.values[j];

        //we only care about merges that happened after the graph was started
        if (
          commit.index > 0 &&
          (commit.type === commitTypes.MERGE ||
            commit.type === commitTypes.BRANCH)
        ) {
          const fromX = scale.x(i + 0.5);
          const fromY = scale.y(commit.index);
          const toX = scale.x(branchIndices[commit.from] + 0.5);

          const mergeLine = drawUtil.createMergeLine(
            fromX,
            fromY,
            toX,
            branch.color,
            commit.dashed
          );

          append(mergeLines, mergeLine);
        }
      }
    }

    return mergeLines;
  },

  //paths
  createMergeLine: (fromX, fromY, toX, color = '#000', dashed = false) => {
    const radius = Math.min(draw.BRANCH_WIDTH, draw.COMMIT_HEIGHT) / 2;
    const sign = Math.sign(fromX - toX);
    const dir = (sign + 1) / 2;

    //note that we don't need toY, because we just use fromY - radius * 2
    const path = util.trimPathString(`
      M ${fromX}, ${fromY}
      a ${radius}, ${radius}, 90, 0, ${dir}, ${-sign * radius}, ${radius}
      l ${toX - fromX + sign * radius * 2}, 0
      a ${radius}, ${radius}, 90, 0, ${1 - dir}, ${-sign * radius}, ${radius}
    `);

    const mergeLine = create('path')
      .attr('d', path)
      .attr('stroke', color);

    if (dashed) mergeLine.attr('stroke-dasharray', '4');

    return mergeLine;
  },

  createRipple: (cx, cy) => {
    const ripple = create('g').attr('transform', `translate(${cx}, ${cy})`);

    ripple
      .append('path')
      .attr('d', drawUtil.ripplePath)
      .attr('stroke', '#fff')
      .attr('stroke-width', 8);

    ripple.append('path').attr('d', drawUtil.ripplePath);

    return ripple;
  },

  createX: (cx, cy) => {
    const x = create('g').attr('transform', `translate(${cx}, ${cy})`);

    x.append('path')
      .attr('d', drawUtil.xPath)
      .attr('stroke', '#fff')
      .attr('stroke-width', 8);

    x.append('path').attr('d', drawUtil.xPath);

    return x;
  },

  //non-drawing methods
  // calcNumCommits: commits
  // calcLegendWidth: (context, branches)
  // getCanvasSize: (context, shadowSelection, axis = draw.AXIS_HORIZONTAL)
};

//so we can keep using .join even if it's just for updates
const noop = () => {};

module.exports = draw;
