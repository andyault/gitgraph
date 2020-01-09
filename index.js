const express = require('express');

const graphs = require('./graphs');
const util = require('./util');

//
const app = express();

app.get('/:graph', async (req, res, next) => {
  const graph = graphs[req.params.graph];
  if (!graph) return next();

  //
  const dom = util.renderGraph(graph);
  res.send(dom.serialize());
});

app.get('/favicon.ico', (req, res) => res.send(''));
app.all('*', (req, res) => res.status(404).send('404'));

//
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
