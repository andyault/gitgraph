const express = require('express');

const graphs = require('./graphs');
const lib = require('./index');
const gitGraph = require('./lib/gitgraph');

//
const app = express();

app.disable('etag');

//
app.get('/:graph', (req, res) => res.redirect(`/svg/${req.params.graph}`));

app.get('/:type(svg|img)/:graph', async (req, res, next) => {
  const populateGraph = graphs[req.params.graph];
  if (!populateGraph) return next();

  //populate graph
  const reqGraph = new gitGraph.Graph();
  populateGraph(reqGraph);

  //build response
  let result = lib.buildSvg(reqGraph);

  // if (req.params.type === 'img') {
  //   result = lib.buildImageFromSvg(result);

  //   res.type('png');
  // } else {
  //   res.type('svg');
  // }

  //done :)
  res.send(result);
});

app.get('/favicon.ico', (req, res) => res.send(''));
app.all('*', (req, res) => res.status(404).send('404'));

//
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Server listening on port ${port}`));
