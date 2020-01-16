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
  context.lineWidth = 2;
  context.font = '16px sans-serif';
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
  context.lineWidth = 2;
  context.strokeStyle = '#000';
  context.textAlign = 'left';

  const startX =
    draw.PADDING_HORIZONTAL + draw.LEGEND_WIDTH + draw.PADDING_HORIZONTAL;

  shadowSelection.selectAll('branch').each(function(branch, j, branches) {
    const branchSelection = d3.select(this);
    const branchY = draw.PADDING_VERTICAL + draw.BRANCH_HEIGHT * (j + 0.5);

    let active = false;
    let branched = false;
    let curX = startX + draw.COMMIT_WIDTH;

    context.fillStyle = `hsl(${(j / branches.length) * 360},50%,50%)`;

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
          context.beginPath();
          context.moveTo(curX - draw.COMMIT_WIDTH / 2, branchY);
          context.lineTo(curX + draw.COMMIT_WIDTH, branchY);
          context.stroke();

          context.beginPath();
          context.lineTo(
            curX - draw.COMMIT_WIDTH / 2 - 2,
            branchY - (draw.COMMIT_RADIUS * 2.5) / 3
          );
          context.lineTo(
            curX - draw.COMMIT_WIDTH / 2 + 2,
            branchY - (draw.COMMIT_RADIUS * 1.5) / 3
          );
          context.lineTo(
            curX - draw.COMMIT_WIDTH / 2 - 2,
            branchY - (draw.COMMIT_RADIUS * 0.5) / 3
          );
          context.lineTo(
            curX - draw.COMMIT_WIDTH / 2 + 2,
            branchY + (draw.COMMIT_RADIUS * 0.5) / 3
          );
          context.lineTo(
            curX - draw.COMMIT_WIDTH / 2 - 2,
            branchY + (draw.COMMIT_RADIUS * 1.5) / 3
          );
          context.lineTo(
            curX - draw.COMMIT_WIDTH / 2 + 2,
            branchY + (draw.COMMIT_RADIUS * 2.5) / 3
          );
          context.stroke();
        }

        curX += draw.COMMIT_WIDTH;

        return;
      }

      if (commitType === gitGraph.commitTypes.BRANCH) {
        branched = true;
      } else if (commitType === gitGraph.commitTypes.DELETE) {
        branched = false;

        context.beginPath();
        context.moveTo(
          curX - draw.COMMIT_RADIUS / 2,
          branchY - draw.COMMIT_RADIUS / 2
        );
        context.lineTo(
          curX + draw.COMMIT_RADIUS / 2,
          branchY + draw.COMMIT_RADIUS / 2
        );
        context.stroke();

        context.beginPath();
        context.moveTo(
          curX + draw.COMMIT_RADIUS / 2,
          branchY - draw.COMMIT_RADIUS / 2
        );
        context.lineTo(
          curX - draw.COMMIT_RADIUS / 2,
          branchY + draw.COMMIT_RADIUS / 2
        );
        context.stroke();

        return;
      }

      if (active && branched) {
        context.beginPath();
        context.moveTo(curX, branchY);
        context.lineTo(curX + draw.COMMIT_WIDTH, branchY);
        context.stroke();

        if (commitDashed) context.setLineDash([4, 4]);

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

          context.beginPath();
          context.moveTo(curX, branchY);

          context.quadraticCurveTo(
            curX - draw.COMMIT_WIDTH / 2,
            branchY,
            curX - draw.COMMIT_WIDTH / 2,
            branchY +
              (Math.sign(fromBranchY - branchY) * draw.BRANCH_HEIGHT) / 2
          );

          context.lineTo(
            curX - draw.COMMIT_WIDTH / 2,
            fromBranchY -
              (Math.sign(fromBranchY - branchY) * draw.BRANCH_HEIGHT) / 2
          );

          context.quadraticCurveTo(
            curX - draw.COMMIT_WIDTH / 2,
            fromBranchY,
            curX - draw.COMMIT_WIDTH,
            fromBranchY
          );

          context.stroke();
        }

        if (commitType !== gitGraph.commitTypes.EMPTY) {
          context.save();

          context.beginPath();
          context.arc(curX, branchY, draw.COMMIT_RADIUS, 0, 2 * Math.PI);
          context.lineWidth *= 2;
          context.stroke();
          context.fill();

          if (commitMessage) {
            const rotation =
              (draw.COMMIT_MESSAGE_ROTATION_DEGS * Math.PI) / 180;

            context.translate(
              curX,
              branches.length * draw.BRANCH_HEIGHT + draw.PADDING_VERTICAL
            );
            context.rotate(rotation);
            context.fillStyle = '#000';
            context.fillText(commitMessage, -draw.COMMIT_RADIUS, 0);
          }

          context.restore();
        }
      }

      context.setLineDash([]);

      if (active) curX += draw.COMMIT_WIDTH;
    });

    if (branched) {
      context.beginPath();
      context.lineTo(curX - 2, branchY - (draw.COMMIT_RADIUS * 2.5) / 3);
      context.lineTo(curX + 2, branchY - (draw.COMMIT_RADIUS * 1.5) / 3);
      context.lineTo(curX - 2, branchY - (draw.COMMIT_RADIUS * 0.5) / 3);
      context.lineTo(curX + 2, branchY + (draw.COMMIT_RADIUS * 0.5) / 3);
      context.lineTo(curX - 2, branchY + (draw.COMMIT_RADIUS * 1.5) / 3);
      context.lineTo(curX + 2, branchY + (draw.COMMIT_RADIUS * 2.5) / 3);
      context.stroke();
    }
  });
};

draw.drawGraph = (context, shadowSelection) => {
  draw.clearCanvas(context, shadowSelection);

  draw.drawLegend(context, shadowSelection);
  draw.drawCommits(context, shadowSelection);
};

//
module.exports = draw;
