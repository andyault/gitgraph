const express = require('express');

const graphs = require('./graphs');
const util = require('./lib/util');
const draw = require('./lib/draw');
const gitGraph = require('./lib/gitgraph');

//
const app = express();

app.disable('etag');

//
app.get('/', (req, res, next) => {
  const links = Object.keys(graphs)
    .map(name => {
      const label = name.replace(/\-/g, ' ');
      return `<li><a href="/${name}">${label}</a></li>`;
    })
    .join('\n');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf8" />
    </head>
    <body>
      <ul style="text-transform: capitalize;">
        ${links}
      </ul>
    </body>
    </html>`;

  res.send(html);
});

app.get('/:graph', (req, res, next) => {
  const populateGraph = graphs[req.params.graph];
  if (!populateGraph) return next();

  //
  const reqGraph = new gitGraph.Graph();
  populateGraph(reqGraph);

  const html = util.renderGraph(reqGraph, draw.AXIS_VERTICAL);
  res
    // .type('image/png')
    .send(html);
});

app.get('/favicon.ico', (req, res) => res.send(''));
app.all('*', (req, res) => res.status(404).send('404'));

//
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
