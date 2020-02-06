const express = require('express');

const graphs = require('./graphs');
const lib = require('./index');
const gitGraph = require('./lib/gitgraph');

//
const app = express();

app.disable('etag');

//
app.get('/:type(|svg|img)', (req, res) => {
  const { type } = req.params;

  const links = Object.keys(graphs)
    .map(name => {
      const label = name.replace(/\-/g, ' ');

      let link = `<li><a href="/${type ? type + '/' : ''}${name}">${label}</a>`;

      if (!type) {
        link += ` (<a href="/img/${name}">Img</a>)`;
      }

      link += `</li>`;
      return link;
    })
    .join('\n');

  let html = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf8" />
    </head>
    <body>`;

  if (!type) {
    html += `
      <div>Filter: <a href="/svg">Svg</a> <a href="/img">Img</a></div>`;
  }

  html += `
      <ul style="text-transform: capitalize;">
        ${links}
      </ul>
    </body>
  </html>`;

  res.send(html);
});

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
