module.exports = graph => {
  const foh = graph.branch('foh');
  const feature = graph.branch('feature');

  graph.start();

  const toFoh = feature.branch('to-foh', {}, { index: 1 }).merge(foh);

  foh.merge(toFoh, { dashed: true });
};
