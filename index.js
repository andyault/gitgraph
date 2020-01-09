const express = require('express');
const { JSDOM } = require('jsdom');

const graphs = require('./graphs');

//
const app = express();

app.get('/favicon.ico', (req, res) => res.send(''));

app.get('/:graph', async (req, res, next) => {
  const graph = graphs[req.params.graph];

  if (!graph) return next();

  console.log(graph);

  const dom = new JSDOM();
  res.send(dom.serialize);
});

app.all('*', (req, res) => res.status(404).send('404'));

//
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
