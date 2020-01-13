const express = require('express');

const graphs = require('./graphs');
const util = require('./util');
const gitGraph = require('./gitgraph');

//
const app = express();

app.get('/:graph', async (req, res, next) => {
  const populateGraph = graphs[req.params.graph];
  if (!populateGraph) return next();

  //
  const reqGraph = new gitGraph.Graph();
  populateGraph(reqGraph);

  const dom = util.renderGraph(reqGraph);
  res.send(dom.serialize());
});

app.get('/favicon.ico', (req, res) => res.send(''));
app.all('*', (req, res) => res.status(404).send('404'));

//
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
