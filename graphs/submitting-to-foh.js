module.exports = graph => {
  const foh = graph.branch('foh');
  const feature = graph.branch('feature');

  graph.start();

  const toFoh = feature.branch('to-foh', null, null, { index: 1 }).merge(foh);

  foh.merge(toFoh, null, null, { dashed: true });

  graph.end();
};
