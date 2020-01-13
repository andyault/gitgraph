module.exports = graph => {
  const master = graph.branch('master');
  const staging = graph.branch('staging');
  const foh = graph.branch('foh');
  const hotfix = graph.branch('hotfix');

  graph.start();

  staging.merge(hotfix, null, null, { dashed: true });
  master.merge(hotfix, null, null, { dashed: true });
  foh.merge(hotfix, null, null, { dashed: true });

  hotfix.delete();
  graph.end();
};
