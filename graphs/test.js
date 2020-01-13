module.exports = graph => {
  const master = graph.branch('staging');

  graph.start();

  const feature = master
    .branch('feature', 'init')
    .commit('work commit 1')
    .commit('work commit 2')
    .commit('work commit 3');

  graph.end();
};
