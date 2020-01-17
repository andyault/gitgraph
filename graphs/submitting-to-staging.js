module.exports = graph => {
  const staging = graph.branch('staging');
  const feature = graph.branch('feature');
  const toFoh = graph.branch('to-foh');

  graph.start();

  const toStaging = feature
    .branch('to-staging', {}, { index: 1 })
    .merge(staging);

  staging.merge(toStaging, { dashed: true });

  toFoh.delete();
};
