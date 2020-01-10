module.exports = graph => {
  const master = graph.branch('staging');

  graph.start();

  const feature = master
    .branch('feature')
    .commit()
    .commit()
    .commit();

  graph.end();
};
