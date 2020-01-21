const d3 = require('d3');

const gitGraph = require('./gitgraph');

const draw = {
  //constants
  PADDING_HORIZONTAL: 16,
  PADDING_VERTICAL: 16,

  COMMIT_RADIUS: 16,
  COMMIT_MESSAGE_ROTATION_DEGS: 30,
  LINE_WIDTH: 4,
  FONT_SIZE: 16,
  FONT_FAMILY: 'helvetica, segoe ui, sans-serif',
  BACKGROUND_COLOR: '#fff',

  //  horizontal
  LEGEND_WIDTH: null,
  BRANCH_HEIGHT: 64,
  COMMIT_WIDTH: 64,

  //  vertical
  BRANCH_WIDTH: 64,
  COMMIT_HEIGHT: 64,

  //  axes - don't edit
  AXIS_HORIZONTAL: 'AXIS_HORIZONTAL',
  AXIS_VERTICAL: 'AXIS_VERTICAL',

  //methods
  getCanvasSize: (context, shadowSelection, axis = draw.AXIS_HORIZONTAL) => {
    const branches = shadowSelection.selectAll('branch');
    const numBranches = branches.size();

    const commits = shadowSelection.select('branch').selectAll('commit');
    const numCommits = commits.data().reduce(
      (sum, commit) => {
        if (commit.type == gitGraph.commitTypes.START) sum.started = true;

        if (sum.started && !commit.inplace) sum.num += 1;

        return sum;
      },
      { started: false, num: 0 } //0.5 for existing branches on start, 1 for end
    ).num;

    const size = {};

    if (axis === draw.AXIS_HORIZONTAL) {
      size.width =
        draw.PADDING_HORIZONTAL +
        drawUtil.calcLegendWidth(context, branches) +
        draw.PADDING_HORIZONTAL +
        draw.COMMIT_WIDTH * (numCommits + 0.5) +
        draw.PADDING_HORIZONTAL +
        draw.PADDING_HORIZONTAL;

      size.height =
        draw.PADDING_VERTICAL +
        draw.BRANCH_HEIGHT * numBranches +
        draw.PADDING_VERTICAL;
    } else {
      size.width =
        draw.PADDING_HORIZONTAL +
        draw.BRANCH_WIDTH * numBranches +
        draw.PADDING_HORIZONTAL;

      size.height =
        draw.PADDING_VERTICAL +
        draw.COMMIT_HEIGHT * numCommits * 3 +
        draw.PADDING_HORIZONTAL;
    }

    return size;
  },

  drawGraph: (context, shadowSelection, axis = draw.AXIS_HORIZONTAL) => {
    const { width, height } = draw.getCanvasSize(
      context,
      shadowSelection,
      axis
    );

    context.fillStyle = draw.BACKGROUND_COLOR;
    context.fillRect(0, 0, width, height);

    const branches = shadowSelection.selectAll('branch');
    let x = draw.PADDING_HORIZONTAL;
    let y = draw.PADDING_VERTICAL;

    if (axis === draw.AXIS_HORIZONTAL) {
      const legendWidth = drawUtil.calcLegendWidth(context, branches);
      drawUtil.drawLegend(context, x, y, branches, legendWidth);

      x += legendWidth + draw.PADDING_HORIZONTAL;
    }

    drawUtil.drawMerges(context, x, y, branches, axis);
    drawUtil.drawCommits(context, x, y, branches, axis);
  },
};

//
const drawUtil = {
  //calculated constants
  commitMessageRotation: (draw.COMMIT_MESSAGE_ROTATION_DEGS * Math.PI) / 180,
  font: `${draw.FONT_SIZE}px ${draw.FONT_FAMILY}`,
  fontBold: `bold ${Math.ceil(draw.FONT_SIZE * 0.75)}px ${draw.FONT_FAMILY}`,

  //complex methods
  drawLegend: (context, x, y, branches, legendWidth) => {
    context.lineWidth = draw.LINE_WIDTH;
    context.font = drawUtil.fontBold;
    context.textBaseline = 'middle';
    context.textAlign = 'right';

    const w = legendWidth || drawUtil.calcLegendWidth(context, branches);
    const rightX = x + w;

    branches.each(function(branch, i) {
      const branchSelection = d3.select(this);
      const branchName = branchSelection.attr('name').toUpperCase();
      const branchColor = branchSelection.attr('color');

      const wPadding = draw.PADDING_HORIZONTAL / 2;
      const hPadding = draw.PADDING_VERTICAL / 4;

      const branchW = context.measureText(branchName).width + wPadding * 2;
      const branchH = draw.FONT_SIZE + hPadding * 2;

      const branchY = y + draw.BRANCH_HEIGHT * (i + 0.5);

      drawUtil.drawRoundedRect(
        context,
        rightX - branchW,
        branchY - branchH / 2,
        branchW,
        branchH,
        draw.COMMIT_RADIUS / 2,
        branchColor
      );

      context.fillStyle = '#fff';
      context.fillText(branchName, rightX - wPadding, branchY);
    });
  },

  drawCommits: (context, startX, startY, branchesSelection, axis) => {
    const isHorizontal = axis === draw.AXIS_HORIZONTAL;

    branchesSelection.each(function(branch, j, branches) {
      const branchSelection = d3.select(this);
      const branchColor = branchSelection.attr('color');

      const commitsSelection = branchSelection.selectAll('commit');

      let active = false;
      let branched = false;

      //primary pos is how far we are parallel to the given axis
      //secondary pos is how far we are perpendicular to the given axis
      let primaryPos, secondaryPos, x, y;

      if (isHorizontal) {
        x = primaryPos = startX + draw.COMMIT_WIDTH / 2;
        y = secondaryPos = startY + draw.BRANCH_HEIGHT * (j + 0.5);
      } else {
        y = primaryPos = startY + draw.COMMIT_HEIGHT * commitsSelection.size();
        x = secondaryPos = startX + draw.BRANCH_WIDTH / 2;
      }

      commitsSelection.each(function(commit, i, commits) {
        const commitSelection = d3.select(this);
        const commitType = commitSelection.attr('type');
        const commitMessage = commitSelection.text();
        const commitInPlace = commitSelection.attr('inplace');

        //start our graph - draw lines from any existing branches and continue
        if (commitType === gitGraph.commitTypes.START) {
          active = true;

          if (branched) {
            if (isHorizontal) {
              drawUtil.drawCommitLine(
                context,
                primaryPos - draw.COMMIT_WIDTH / 2,
                secondaryPos,
                primaryPos + draw.COMMIT_WIDTH,
                secondaryPos,
                branchColor
              );

              drawUtil.drawRipple(
                context,
                primaryPos - draw.COMMIT_WIDTH / 2,
                secondaryPos,
                branchColor,
                axis
              );
            } else {
              drawUtil.drawCommitLine(
                context,
                secondaryPos,
                primaryPos + draw.COMMIT_HEIGHT / 2,
                secondaryPos,
                primaryPos - draw.COMMIT_HEIGHT,
                branchColor
              );

              drawUtil.drawRipple(
                context,
                secondaryPos,
                primaryPos + draw.COMMIT_HEIGHT / 2,
                branchColor,
                axis
              );
            }
          }

          primaryPos += draw.COMMIT_WIDTH;

          return;
        }

        if (commitType === gitGraph.commitTypes.BRANCH) {
          branched = true;
        } else if (commitType === gitGraph.commitTypes.DELETE) {
          drawUtil.drawX(context, primaryPos, secondaryPos, branchColor);

          branched = false;
          return;
        }

        if (active && branched) {
          if (!commitInPlace) {
            drawUtil.drawCommitLine(
              context,
              primaryPos,
              secondaryPos,
              primaryPos + draw.COMMIT_WIDTH,
              secondaryPos,
              branchColor
            );
          }

          if (commitType !== gitGraph.commitTypes.EMPTY) {
            drawUtil.drawCommit(context, primaryPos, secondaryPos, branchColor);

            if (commitMessage) {
              const messageY =
                branches.length * draw.BRANCH_HEIGHT + draw.PADDING_VERTICAL;

              drawUtil.drawCommitMessage(
                context,
                primaryPos,
                messageY,
                commitMessage
              );
            }
          }
        }

        if (active && !commitInPlace) {
          primaryPos +=
            (axis === draw.AXIS_HORIZONTAL ? 1 : -1) * draw.COMMIT_WIDTH;
        }
      });

      if (branched) {
        drawUtil.drawRipple(
          context,
          primaryPos,
          secondaryPos,
          branchColor,
          axis
        );
      }
    });
  },

  drawMerges: (context, startX, startY, branches, axis) => {
    branches.each(function(branch, j, branches) {
      const branchSelection = d3.select(this);
      const branchColor = branchSelection.attr('color');

      let active = false;
      let branched = false;
      const branchY = startY + draw.BRANCH_HEIGHT * (j + 0.5);
      let curX = startX + draw.COMMIT_WIDTH / 2;

      branchSelection.selectAll('commit').each(function(commit, i, commits) {
        const commitSelection = d3.select(this);
        const commitType = commitSelection.attr('type');
        const commitFrom = commitSelection.attr('from');
        const commitDashed = commitSelection.attr('dashed');
        const commitInPlace = commitSelection.attr('inplace');

        //start our graph - draw lines from any existing branches and continue
        if (commitType === gitGraph.commitTypes.START) {
          active = true;
          curX += draw.COMMIT_WIDTH;

          return;
        }

        if (commitType === gitGraph.commitTypes.BRANCH) {
          branched = true;
        } else if (commitType === gitGraph.commitTypes.DELETE) {
          branched = false;
          return;
        }

        if (
          active &&
          branched &&
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
            curX - draw.COMMIT_WIDTH,
            fromBranchY,
            curX,
            branchY,
            branchColor
          );

          context.setLineDash([]);
        }

        if (active && !commitInPlace) curX += draw.COMMIT_WIDTH;
      });
    });
  },

  //simple methods
  drawRipple: (
    context,
    cx,
    cy,
    color = '#000',
    axis = draw.AXIS_HORIZONTAL
  ) => {
    context.lineWidth = draw.LINE_WIDTH * 2.25;
    context.strokeStyle = draw.BACKGROUND_COLOR;

    context.beginPath();

    if (axis === draw.AXIS_HORIZONTAL) {
      context.lineTo(cx - 2, cy - (draw.COMMIT_RADIUS * 2.5) / 3);
      context.lineTo(cx + 2, cy - (draw.COMMIT_RADIUS * 1.5) / 3);
      context.lineTo(cx - 2, cy - (draw.COMMIT_RADIUS * 0.5) / 3);
      context.lineTo(cx + 2, cy + (draw.COMMIT_RADIUS * 0.5) / 3);
      context.lineTo(cx - 2, cy + (draw.COMMIT_RADIUS * 1.5) / 3);
      context.lineTo(cx + 2, cy + (draw.COMMIT_RADIUS * 2.5) / 3);
    } else {
      context.lineTo(cx - (draw.COMMIT_RADIUS * 2.5) / 3, cy - 2);
      context.lineTo(cx - (draw.COMMIT_RADIUS * 1.5) / 3, cy + 2);
      context.lineTo(cx - (draw.COMMIT_RADIUS * 0.5) / 3, cy - 2);
      context.lineTo(cx + (draw.COMMIT_RADIUS * 0.5) / 3, cy + 2);
      context.lineTo(cx + (draw.COMMIT_RADIUS * 1.5) / 3, cy - 2);
      context.lineTo(cx + (draw.COMMIT_RADIUS * 2.5) / 3, cy + 2);
    }

    context.stroke();

    context.lineWidth = draw.LINE_WIDTH;
    context.strokeStyle = color;

    context.stroke();
  },

  drawX: (context, cx, cy, color = '#000') => {
    context.lineWidth = draw.LINE_WIDTH * 2.25;
    context.strokeStyle = draw.BACKGROUND_COLOR;

    context.beginPath();
    context.moveTo(cx - draw.COMMIT_RADIUS / 2, cy - draw.COMMIT_RADIUS / 2);
    context.lineTo(cx + draw.COMMIT_RADIUS / 2, cy + draw.COMMIT_RADIUS / 2);
    context.stroke();

    context.beginPath();
    context.moveTo(cx + draw.COMMIT_RADIUS / 2, cy - draw.COMMIT_RADIUS / 2);
    context.lineTo(cx - draw.COMMIT_RADIUS / 2, cy + draw.COMMIT_RADIUS / 2);
    context.stroke();

    context.lineWidth = draw.LINE_WIDTH;
    context.strokeStyle = color;

    context.beginPath();
    context.moveTo(cx - draw.COMMIT_RADIUS / 2, cy - draw.COMMIT_RADIUS / 2);
    context.lineTo(cx + draw.COMMIT_RADIUS / 2, cy + draw.COMMIT_RADIUS / 2);
    context.stroke();

    context.beginPath();
    context.moveTo(cx + draw.COMMIT_RADIUS / 2, cy - draw.COMMIT_RADIUS / 2);
    context.lineTo(cx - draw.COMMIT_RADIUS / 2, cy + draw.COMMIT_RADIUS / 2);
    context.stroke();
  },

  drawCommit: (context, cx, cy, color = '#000') => {
    context.lineWidth = draw.LINE_WIDTH * 1.5;
    context.fillStyle = color;
    context.strokeStyle = draw.BACKGROUND_COLOR;

    context.beginPath();
    context.arc(cx, cy, draw.COMMIT_RADIUS, 0, 2 * Math.PI);
    context.stroke();
    context.fill();
  },

  drawCommitMessage: (context, x, y, message) => {
    context.fillStyle = '#000';
    context.textAlign = 'left';
    context.font = drawUtil.font;

    context.save();

    context.translate(x, y);
    context.rotate(drawUtil.commitMessageRotation);
    context.fillText(message, -draw.COMMIT_RADIUS, 0);

    context.restore();
  },

  drawCommitLine: (context, fromX, fromY, toX, toY, color = '#000') => {
    context.lineWidth = draw.LINE_WIDTH * 2.25;
    context.strokeStyle = draw.BACKGROUND_COLOR;

    context.beginPath();
    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);
    context.stroke();

    context.lineWidth = draw.LINE_WIDTH;
    context.strokeStyle = color;

    context.stroke();
  },

  drawMergeLine: (context, fromX, fromY, toX, toY, color = '#000') => {
    context.lineWidth = draw.LINE_WIDTH;
    context.strokeStyle = color;

    context.beginPath();
    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);

    // const curveYDiff = (Math.sign(fromY - toY) * draw.BRANCH_HEIGHT) / 2;

    // context.quadraticCurveTo(
    //   fromX - draw.COMMIT_WIDTH / 2,
    //   toY,
    //   fromX - draw.COMMIT_WIDTH / 2,
    //   toY + curveYDiff
    // );

    // context.lineTo(fromX - draw.COMMIT_WIDTH / 2, fromY - curveYDiff);

    // context.quadraticCurveTo(
    //   fromX - draw.COMMIT_WIDTH / 2,
    //   fromY,
    //   fromX - draw.COMMIT_WIDTH,
    //   fromY
    // );

    context.stroke();
  },

  drawRoundedRect: (context, x, y, w, h, r, fill, stroke) => {
    const radius = Math.min(r, Math.min(w / 2, h / 2));

    context.lineWidth = draw.LINE_WIDTH;
    context.fillStyle = fill;
    context.strokeStyle = stroke;

    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + w - radius, y);
    context.quadraticCurveTo(x + w, y, x + w, y + radius);
    context.lineTo(x + w, y + h - radius);
    context.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    context.lineTo(x + radius, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);

    if (fill) context.fill();
    if (stroke) context.stroke();
  },

  //non-drawing methods
  generateColor: (i, length) => `hsl(${(i / length) * 360},50%,50%)`,

  calcLegendWidth: (context, branches) => {
    if (draw.LEGEND_WIDTH) return draw.LEGEND_WIDTH;

    context.font = drawUtil.fontBold;

    const nameWidths = [];
    branches.each(function(branch, i) {
      const branchSelection = d3.select(this);
      const branchName = branchSelection.attr('name').toUpperCase();

      nameWidths[i] = context.measureText(branchName).width;
    });

    const width = Math.max(...nameWidths) + draw.PADDING_HORIZONTAL;
    return width;
  },
};

//
module.exports = draw;
module.exports.generateColor = drawUtil.generateColor;
