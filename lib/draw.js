const d3 = require('d3');

const gitGraph = require('./gitgraph');

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
  drawGraph: (context, shadowSelection, axis = draw.AXIS_HORIZONTAL) => {
    const { width, height } = drawUtil.getCanvasSize(
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

    const branchLabels = drawUtil.calcBranchLabels(branchesSelection);

    branchesSelection.each(function(branch, j, branches) {
      const branchSelection = d3.select(this);
      const branchColor = branchSelection.attr('color');

      const commitsSelection = branchSelection.selectAll('commit');

      let active = false;
      let branched = false;

      //primary pos is how far we are parallel to the given axis
      //secondary pos is how far we are perpendicular to the given axis
      let primaryPos, secondaryPos;

      if (isHorizontal) {
        primaryPos = startX; // + draw.COMMIT_WIDTH / 2;
        secondaryPos = startY + draw.BRANCH_HEIGHT * (j + 0.5);
      } else {
        const numCommits = drawUtil.calcNumCommits(commitsSelection.data());

        primaryPos = startY + draw.COMMIT_HEIGHT * (numCommits + 0.5);
        secondaryPos = startX + draw.BRANCH_WIDTH * (j + 0.5);
      }

      let x, y;

      commitsSelection.each(function(commit, i, commits) {
        const commitSelection = d3.select(this);
        const commitType = commitSelection.attr('type');
        const commitMessage = commitSelection.text();
        const commitInPlace = commitSelection.attr('inplace');

        x = isHorizontal ? primaryPos : secondaryPos;
        y = isHorizontal ? secondaryPos : primaryPos;

        //start our graph - draw lines from any existing branches and continue
        if (commitType === gitGraph.commitTypes.START) {
          active = true;

          if (branched) {
            let fromX = x,
              fromY = y,
              toX = x,
              toY = y;

            if (isHorizontal) {
              // fromX -= draw.COMMIT_WIDTH / 2;
              toX += draw.COMMIT_WIDTH;
            } else {
              // fromY += draw.COMMIT_HEIGHT / 2;
              toY -= draw.COMMIT_HEIGHT;
            }

            drawUtil.drawCommitLine(
              context,
              fromX,
              fromY,
              toX,
              toY,
              branchColor
            );

            drawUtil.drawRipple(context, fromX, fromY, branchColor, axis);
          }
        } else {
          if (commitType === gitGraph.commitTypes.BRANCH) {
            branched = true;
          } else if (commitType === gitGraph.commitTypes.DELETE) {
            branched = false;

            drawUtil.drawX(context, x, y, branchColor);
          }

          if (active && branched) {
            if (!commitInPlace) {
              let toX = x,
                toY = y;

              if (isHorizontal) {
                toX += draw.COMMIT_WIDTH;
              } else {
                toY -= draw.COMMIT_HEIGHT;
              }

              drawUtil.drawCommitLine(context, x, y, toX, toY, branchColor);
            }

            if (commitType !== gitGraph.commitTypes.EMPTY) {
              drawUtil.drawCommit(context, x, y, branchColor);

              if (!isHorizontal) {
                const messageX =
                  startX +
                  branches.length * draw.BRANCH_WIDTH +
                  draw.PADDING_HORIZONTAL;
                const messageY = y;

                let curBranchLabels = '';

                if (branchLabels[i]) {
                  curBranchLabels = branchLabels[i]
                    .map(label => `[${label.toUpperCase()}] `)
                    .join('');
                }

                if (commitMessage || curBranchLabels) {
                  drawUtil.drawCommitMessage(
                    context,
                    messageX,
                    messageY,
                    curBranchLabels + commitMessage
                  );
                }
              }
            }
          }
        }

        if (active && !commitInPlace) {
          primaryPos += isHorizontal ? draw.COMMIT_WIDTH : -draw.COMMIT_HEIGHT;
        }
      });

      if (branched) {
        x = isHorizontal ? primaryPos : secondaryPos;
        y = isHorizontal ? secondaryPos : primaryPos;

        drawUtil.drawRipple(context, x, y, branchColor, axis);
      }
    });
  },

  drawMerges: (context, startX, startY, branchesSelection, axis) => {
    const isHorizontal = axis === draw.AXIS_HORIZONTAL;

    branchesSelection.each(function(branch, j, branches) {
      const branchSelection = d3.select(this);
      const branchColor = branchSelection.attr('color');

      const commitsSelection = branchSelection.selectAll('commit');

      let active = false;
      let branched = false;

      //primary pos is how far we are parallel to the given axis
      //secondary pos is how far we are perpendicular to the given axis
      let primaryPos, secondaryPos;

      if (isHorizontal) {
        primaryPos = startX; // + draw.COMMIT_WIDTH / 2;
        secondaryPos = startY + draw.BRANCH_HEIGHT * (j + 0.5);
      } else {
        const numCommits = drawUtil.calcNumCommits(commitsSelection.data());

        primaryPos = startY + draw.COMMIT_HEIGHT * (numCommits + 0.5);
        secondaryPos = startX + draw.BRANCH_WIDTH * (j + 0.5);
      }

      let x, y;

      commitsSelection.each(function(commit, i, commits) {
        const commitSelection = d3.select(this);
        const commitType = commitSelection.attr('type');
        const commitFrom = commitSelection.attr('from');
        const commitDashed = commitSelection.attr('dashed');
        const commitInPlace = commitSelection.attr('inplace');

        x = isHorizontal ? primaryPos : secondaryPos;
        y = isHorizontal ? secondaryPos : primaryPos;

        //start our graph - draw lines from any existing branches and continue
        if (commitType === gitGraph.commitTypes.START) {
          active = true;
        } else {
          if (commitType === gitGraph.commitTypes.BRANCH) {
            branched = true;
          } else if (commitType === gitGraph.commitTypes.DELETE) {
            branched = false;
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
              .findIndex(
                branch => d3.select(branch).datum().name === commitFrom
              );

            let fromX = x,
              fromY = y,
              toX = x,
              toY = y;

            if (isHorizontal) {
              fromX -= draw.COMMIT_WIDTH;
              fromY =
                draw.PADDING_VERTICAL + draw.BRANCH_HEIGHT * (fromIndex + 0.5);
            } else {
              fromY += draw.COMMIT_HEIGHT;
              fromX =
                draw.PADDING_HORIZONTAL + draw.BRANCH_WIDTH * (fromIndex + 0.5);
            }

            if (commitDashed) context.setLineDash([4, 4]);

            drawUtil.drawMergeLine(
              context,
              fromX,
              fromY,
              toX,
              toY,
              branchColor,
              axis
            );

            context.setLineDash([]);
          }
        }

        if (active && !commitInPlace) {
          primaryPos += isHorizontal ? draw.COMMIT_WIDTH : -draw.COMMIT_HEIGHT;
        }
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
      context.lineTo(cx - 2, cy - (draw.COMMIT_RADIUS * 2.5) / 2.5);
      context.lineTo(cx + 2, cy - (draw.COMMIT_RADIUS * 1.5) / 2.5);
      context.lineTo(cx - 2, cy - (draw.COMMIT_RADIUS * 0.5) / 2.5);
      context.lineTo(cx + 2, cy + (draw.COMMIT_RADIUS * 0.5) / 2.5);
      context.lineTo(cx - 2, cy + (draw.COMMIT_RADIUS * 1.5) / 2.5);
      context.lineTo(cx + 2, cy + (draw.COMMIT_RADIUS * 2.5) / 2.5);
    } else {
      context.lineTo(cx - (draw.COMMIT_RADIUS * 2.5) / 2.5, cy - 2);
      context.lineTo(cx - (draw.COMMIT_RADIUS * 1.5) / 2.5, cy + 2);
      context.lineTo(cx - (draw.COMMIT_RADIUS * 0.5) / 2.5, cy - 2);
      context.lineTo(cx + (draw.COMMIT_RADIUS * 0.5) / 2.5, cy + 2);
      context.lineTo(cx + (draw.COMMIT_RADIUS * 1.5) / 2.5, cy - 2);
      context.lineTo(cx + (draw.COMMIT_RADIUS * 2.5) / 2.5, cy + 2);
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
    context.textBaseline = 'middle';
    context.font = drawUtil.font;

    context.fillText(message, x, y - draw.FONT_SIZE / 8);
  },

  drawCommitLine: (context, fromX, fromY, toX, toY, color = '#000') => {
    // context.lineWidth = draw.LINE_WIDTH * 2.25;
    // context.strokeStyle = draw.BACKGROUND_COLOR;

    context.beginPath();
    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);
    // context.stroke();

    context.lineWidth = draw.LINE_WIDTH;
    context.strokeStyle = color;

    context.stroke();
  },

  drawMergeLine: (context, fromX, fromY, toX, toY, color = '#000', axis) => {
    context.lineWidth = draw.LINE_WIDTH;
    context.strokeStyle = color;

    context.beginPath();
    context.moveTo(fromX, fromY);

    if (axis === draw.AXIS_HORIZONTAL) {
      const halfCommitWidth = draw.COMMIT_WIDTH / 2;
      const halfBranchHeight =
        (Math.sign(toY - fromY) * draw.BRANCH_HEIGHT) / 2;

      context.quadraticCurveTo(
        fromX + halfCommitWidth,
        fromY,
        fromX + halfCommitWidth,
        fromY + halfBranchHeight
      );

      context.lineTo(toX - halfCommitWidth, toY - halfBranchHeight);
      context.quadraticCurveTo(toX - halfCommitWidth, toY, toX, toY);
    } else {
      const halfBranchWidth = (Math.sign(toX - fromX) * draw.BRANCH_WIDTH) / 2;
      const halfCommitHeight = draw.COMMIT_HEIGHT / 2;

      context.quadraticCurveTo(
        fromX,
        fromY - halfCommitHeight,
        fromX + halfBranchWidth,
        fromY - halfCommitHeight
      );

      context.lineTo(toX - halfBranchWidth, toY + halfCommitHeight);
      context.quadraticCurveTo(toX, toY + halfCommitHeight, toX, toY);
    }

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

  calcNumCommits: commits => {
    const numCommits = commits.reduce(
      (sum, commit) => {
        if (commit.type == gitGraph.commitTypes.START) sum.started = true;

        if (sum.started && !commit.inplace) sum.num += 1;

        return sum;
      },
      { started: false, num: 0 }
    ).num;

    return numCommits;
  },

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

  calcBranchLabels: branchesSelection => {
    const branchLabels = [];

    branchesSelection.each(function() {
      const branchSelection = d3.select(this);
      const branchName = branchSelection.attr('name');

      let lastCommitIndex = -1;

      branchSelection.selectAll('commit').each(function(commit, i, commits) {
        const commitSelection = d3.select(this);
        const commitType = commitSelection.attr('type');
        const commitInPlace = commitSelection.attr('inplace');

        if (commitType !== gitGraph.commitTypes.EMPTY) {
          lastCommitIndex = i;

          if (commitInPlace) lastCommitIndex += 1;
        }
      });

      if (lastCommitIndex > -1) {
        if (!branchLabels[lastCommitIndex]) branchLabels[lastCommitIndex] = [];

        branchLabels[lastCommitIndex].push(branchName);
      }
    });

    return branchLabels;
  },

  getCanvasSize: (context, shadowSelection, axis = draw.AXIS_HORIZONTAL) => {
    const branchesSelection = shadowSelection.selectAll('branch');
    const numBranches = branchesSelection.size();

    const commitsSelection = shadowSelection
      .select('branch')
      .selectAll('commit');
    const commitsData = commitsSelection.data();
    const numCommits = drawUtil.calcNumCommits(commitsData);

    const size = {};

    if (axis === draw.AXIS_HORIZONTAL) {
      size.width =
        draw.PADDING_HORIZONTAL +
        drawUtil.calcLegendWidth(context, branchesSelection) +
        draw.PADDING_HORIZONTAL +
        draw.COMMIT_WIDTH * numCommits +
        draw.PADDING_HORIZONTAL +
        draw.PADDING_HORIZONTAL;

      size.height =
        draw.PADDING_VERTICAL +
        draw.BRANCH_HEIGHT * numBranches +
        draw.PADDING_VERTICAL;
    } else {
      context.font = drawUtil.font;

      const branchLabels = drawUtil.calcBranchLabels(branchesSelection);

      const messagesWidth = Math.max(
        ...commitsData.map(({ message = '' }, i) => {
          let curBranchLabels = '';

          if (branchLabels[i]) {
            curBranchLabels = branchLabels[i]
              .map(label => `[${label.toUpperCase()}] `)
              .join('');
          }

          const { width } = context.measureText(curBranchLabels + message);
          return width;
        })
      );

      size.width =
        draw.PADDING_HORIZONTAL +
        draw.BRANCH_WIDTH * numBranches +
        draw.PADDING_HORIZONTAL +
        messagesWidth +
        draw.PADDING_HORIZONTAL;

      size.height =
        draw.PADDING_VERTICAL +
        draw.COMMIT_HEIGHT * (numCommits + 0.5) +
        draw.PADDING_VERTICAL +
        draw.PADDING_VERTICAL;
    }

    return size;
  },
};

//
module.exports = draw;
module.exports.generateColor = drawUtil.generateColor;
module.exports.getCanvasSize = drawUtil.getCanvasSize;
