const d3 = require('d3');

const gitGraph = require('./gitgraph');

const draw = {
  CANVAS_WIDTH: 1024,
  CANVAS_HEIGHT: 512,

  // LEGEND_WIDTH: 128,
  // BRANCH_HEIGHT: 64,
  // COMMIT_WIDTH: 64,
};

draw.clearCanvas = context => {
  context.clearRect(0, 0, draw.CANVAS_WIDTH, draw.CANVAS_HEIGHT);
};

draw.drawLegend = (context, shadowSelection) => {
  context.lineWidth = 2;
  context.font = '16px sans-serif';

  context.beginPath();
  context.moveTo(128, 16);
  context.lineTo(128, draw.CANVAS_HEIGHT - 16);
  context.stroke();

  shadowSelection.selectAll('branch').each(function(branch, i, branches) {
    const branchSelection = d3.select(this);

    context.fillText(branchSelection.attr('name'), 16, 32 + i * 32);
  });
};

draw.drawCommits = (context, shadowSelection) => {
  const startX = 256 + 64;

  shadowSelection.selectAll('branch').each(function(branch, j, branches) {
    const branchSelection = d3.select(this);

    console.log(branchSelection.attr('name'));

    const branchY = 32 + j * 32;

    let active = false;
    let branched = false;
    let curX = 0;

    branchSelection.selectAll('commit').each(function(commit, i, commits) {
      const commitSelection = d3.select(this);
      const commitType = commitSelection.attr('type');
      const commitFrom = commitSelection.attr('from');

      console.log(commitSelection.attr('type'));

      if (commitType === gitGraph.commitTypes.START) {
        active = true;
        return;
      } else if (commitType === gitGraph.commitTypes.END) {
        active = false;

        context.beginPath();
        context.moveTo(startX + curX, branchY);
        context.lineTo(startX + curX - 128, branchY);
        context.stroke();

        return;
      }

      if (commitType === gitGraph.commitTypes.BRANCH) {
        branched = true;
      }

      if (active && branched) {
        if (commitType !== gitGraph.commitTypes.EMPTY) {
          console.log('  commit');
          context.beginPath();
          context.arc(startX + curX, branchY, 16, 0, 2 * Math.PI);
          context.stroke();
        }

        context.beginPath();
        context.moveTo(startX + curX, branchY);

        if (commitType === gitGraph.commitTypes.BRANCH && commitFrom) {
          const fromIndex = Array.prototype.slice
            .call(branches)
            .findIndex(branch => d3.select(branch).datum().name === commitFrom);

          const fromBranchY = 32 + fromIndex * 32;

          context.bezierCurveTo(
            startX + curX - 128 + 48,
            branchY,
            startX + curX - 48,
            fromBranchY,
            startX + curX - 128,
            fromBranchY
          );
        } else {
          context.lineTo(startX + curX - 128, branchY);
        }
        context.stroke();
      }

      if (active) curX += 128;
    });
  });
};

draw.drawGraph = (context, shadowSelection) => {
  draw.clearCanvas(context);

  draw.drawLegend(context, shadowSelection);
  draw.drawCommits(context, shadowSelection);
};

//
module.exports = draw;
