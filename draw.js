const d3 = require('d3');

const draw = {
  CANVAS_WIDTH: 1024,
  CANVAS_HEIGHT: 512,
};

draw.clearCanvas = context => {
  context.clearRect(0, 0, draw.CANVAS_WIDTH, draw.CANVAS_HEIGHT);
};

draw.drawLegend = (context, shadowSelection) => {
  context.lineWidth = 2;
  context.font = '12px sans-serif';

  context.moveTo(128, 16);
  context.lineTo(128, draw.CANVAS_HEIGHT - 16);
  context.stroke();

  shadowSelection.selectAll('branch').each(function(branch, i, branches) {
    const branchSelection = d3.select(this);
    const iMax = branches.length - 1.5;

    const labelY = draw.CANVAS_HEIGHT / 2 + (i - iMax / 2) * 16;
    context.fillText(branchSelection.text(), 16, labelY);
  });
};

draw.drawGraph = (context, shadowSelection) => {
  draw.clearCanvas(context);

  draw.drawLegend(context, shadowSelection);
};

//
module.exports = draw;
