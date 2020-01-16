const d3 = require('d3');

const gitGraph = require('./gitgraph');

const draw = {
  PADDING_HORIZONTAL: 16,
  PADDING_VERTICAL: 16,

  LEGEND_WIDTH: 96,
  BRANCH_HEIGHT: 64,
  COMMIT_WIDTH: 64,
  COMMIT_RADIUS: 16,

  COMMIT_MESSAGE_ROTATION_DEGS: 30,
  LINE_WIDTH: 4,
  FONT: '16px sans-serif',
};

draw.getCanvasSize = shadowSelection => {
  const branches = shadowSelection.selectAll('branch');
  const numBranches = branches.size() + 1;

  const commits = shadowSelection.select('branch').selectAll('commit');
  const numCommits = commits.data().reduce(
    (sum, commit) => {
      if (commit.type == gitGraph.commitTypes.START) sum.started = true;
      if (sum.started) sum.num += 1;

      return sum;
    },
    { started: false, num: 1.5 }
  ).num;

  const width =
    draw.PADDING_HORIZONTAL +
    draw.LEGEND_WIDTH +
    draw.PADDING_HORIZONTAL +
    draw.COMMIT_WIDTH * numCommits +
    draw.PADDING_HORIZONTAL;

  const height =
    draw.PADDING_VERTICAL +
    draw.BRANCH_HEIGHT * numBranches +
    draw.PADDING_VERTICAL;

  const size = { width, height };
  return size;
};

draw.clearCanvas = (context, shadowSelection) => {
  const { width, height } = draw.getCanvasSize(shadowSelection);
  context.clearRect(0, 0, width, height);
};

draw.drawLegend = (context, shadowSelection) => {
  context.lineWidth = draw.LINE_WIDTH;
  context.font = draw.FONT;
  context.textBaseline = 'middle';
  context.textAlign = 'right';

  const branches = shadowSelection.selectAll('branch');

  context.beginPath();
  context.moveTo(
    draw.PADDING_HORIZONTAL + draw.LEGEND_WIDTH,
    draw.PADDING_VERTICAL
  );
  context.lineTo(
    draw.PADDING_HORIZONTAL + draw.LEGEND_WIDTH,
    draw.PADDING_VERTICAL + branches.size() * draw.BRANCH_HEIGHT
  );
  context.stroke();

  branches.each(function(branch, i) {
    const branchSelection = d3.select(this);
    const branchName = branchSelection.attr('name');

    context.fillText(
      branchName,
      draw.PADDING_HORIZONTAL + draw.LEGEND_WIDTH - draw.PADDING_HORIZONTAL,
      draw.PADDING_VERTICAL + draw.BRANCH_HEIGHT * (i + 0.5)
    );
  });
};

draw.drawCommits = (context, shadowSelection) => {
  const startX =
    draw.PADDING_HORIZONTAL + draw.LEGEND_WIDTH + draw.PADDING_HORIZONTAL;

  shadowSelection.selectAll('branch').each(function(branch, j, branches) {
    const branchSelection = d3.select(this);
    const branchY = draw.PADDING_VERTICAL + draw.BRANCH_HEIGHT * (j + 0.5);

    let active = false;
    let branched = false;
    let curX = startX + draw.COMMIT_WIDTH;

    const branchColor = `hsl(${(j / branches.length) * 360},50%,50%)`;

    branchSelection.selectAll('commit').each(function(commit, i, commits) {
      const commitSelection = d3.select(this);
      const commitType = commitSelection.attr('type');
      const commitFrom = commitSelection.attr('from');
      const commitDashed = commitSelection.attr('dashed');
      const commitMessage = commitSelection.text();

      //start our graph - draw lines from any existing branches and continue
      if (commitType === gitGraph.commitTypes.START) {
        active = true;

        if (branched) {
          drawUtil.drawCommitLine(
            context,
            curX - draw.COMMIT_WIDTH / 2,
            branchY,
            branchColor
          );
          drawUtil.drawCommitLine(context, curX, branchY, branchColor);
          drawUtil.drawRipple(
            context,
            curX - draw.COMMIT_WIDTH / 2,
            branchY,
            branchColor
          );
        }

        curX += draw.COMMIT_WIDTH;

        return;
      }

      if (commitType === gitGraph.commitTypes.BRANCH) {
        branched = true;
      } else if (commitType === gitGraph.commitTypes.DELETE) {
        drawUtil.drawX(context, curX, branchY, branchColor);

        branched = false;
        return;
      }

      if (active && branched) {
        drawUtil.drawCommitLine(context, curX, branchY, branchColor);

        if (
          (commitType === gitGraph.commitTypes.BRANCH ||
            commitType === gitGraph.commitTypes.MERGE) &&
          commitFrom
        ) {
          const fromIndex = Array.prototype.slice
            .call(branches)
            .findIndex(branch => d3.select(branch).datum().name === commitFrom);

          const fromBranchY =
            draw.PADDING_VERTICAL + draw.BRANCH_HEIGHT * (fromIndex + 0.5);

          if (commitDashed) context.setLineDash([4, 4]);

          drawUtil.drawMergeLine(
            context,
            curX,
            fromBranchY,
            branchY,
            branchColor
          );

          context.setLineDash([]);
        }

        if (commitType !== gitGraph.commitTypes.EMPTY) {
          drawUtil.drawCommit(context, curX, branchY, branchColor);

          if (commitMessage) {
            const messageY =
              branches.length * draw.BRANCH_HEIGHT + draw.PADDING_VERTICAL;

            drawUtil.drawCommitMessage(context, curX, messageY, commitMessage);
          }
        }
      }

      if (active) curX += draw.COMMIT_WIDTH;
    });

    if (branched) drawUtil.drawRipple(context, curX, branchY, branchColor);
  });
};

draw.drawGraph = (context, shadowSelection) => {
  draw.clearCanvas(context, shadowSelection);

  draw.drawLegend(context, shadowSelection);
  draw.drawCommits(context, shadowSelection);
};

//
const drawUtil = {
  commitMessageRotation: (draw.COMMIT_MESSAGE_ROTATION_DEGS * Math.PI) / 180,

  drawRipple: (context, x, y, color = '#000') => {
    context.lineWidth = draw.LINE_WIDTH;
    context.strokeStyle = color;

    context.beginPath();
    context.lineTo(x - 2, y - (draw.COMMIT_RADIUS * 2.5) / 3);
    context.lineTo(x + 2, y - (draw.COMMIT_RADIUS * 1.5) / 3);
    context.lineTo(x - 2, y - (draw.COMMIT_RADIUS * 0.5) / 3);
    context.lineTo(x + 2, y + (draw.COMMIT_RADIUS * 0.5) / 3);
    context.lineTo(x - 2, y + (draw.COMMIT_RADIUS * 1.5) / 3);
    context.lineTo(x + 2, y + (draw.COMMIT_RADIUS * 2.5) / 3);
    context.stroke();
  },

  drawX: (context, x, y, color = '#000') => {
    context.lineWidth = draw.LINE_WIDTH;
    context.strokeStyle = color;

    context.beginPath();
    context.moveTo(x - draw.COMMIT_RADIUS / 2, y - draw.COMMIT_RADIUS / 2);
    context.lineTo(x + draw.COMMIT_RADIUS / 2, y + draw.COMMIT_RADIUS / 2);
    context.stroke();

    context.beginPath();
    context.moveTo(x + draw.COMMIT_RADIUS / 2, y - draw.COMMIT_RADIUS / 2);
    context.lineTo(x - draw.COMMIT_RADIUS / 2, y + draw.COMMIT_RADIUS / 2);
    context.stroke();
  },

  drawCommit: (context, x, y, color = '#000') => {
    context.lineWidth = draw.LINE_WIDTH * 2;
    context.fillStyle = color;
    context.strokeStyle = '#fff';

    context.beginPath();
    context.arc(x, y, draw.COMMIT_RADIUS, 0, 2 * Math.PI);
    context.stroke();
    context.fill();
  },

  drawCommitMessage: (context, x, y, message) => {
    context.fillStyle = '#000';
    context.textAlign = 'left';
    context.font = draw.FONT;

    context.save();

    context.translate(x, y);
    context.rotate(drawUtil.commitMessageRotation);
    context.fillText(message, -draw.COMMIT_RADIUS, 0);

    context.restore();
  },

  drawCommitLine: (context, x, y, color = '#000') => {
    context.lineWidth = draw.LINE_WIDTH;
    context.strokeStyle = color;

    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + draw.COMMIT_WIDTH, y);
    context.stroke();
  },

  drawMergeLine: (context, x, fromY, toY, color = '#000') => {
    context.lineWidth = draw.LINE_WIDTH;
    context.strokeStyle = color;

    context.beginPath();
    context.moveTo(x, toY);

    const curveYDiff = (Math.sign(fromY - toY) * draw.BRANCH_HEIGHT) / 2;

    context.quadraticCurveTo(
      x - draw.COMMIT_WIDTH / 2,
      toY,
      x - draw.COMMIT_WIDTH / 2,
      toY + curveYDiff
    );

    context.lineTo(x - draw.COMMIT_WIDTH / 2, fromY - curveYDiff);

    context.quadraticCurveTo(
      x - draw.COMMIT_WIDTH / 2,
      fromY,
      x - draw.COMMIT_WIDTH,
      fromY
    );

    context.stroke();
  },
};

//
module.exports = draw;
