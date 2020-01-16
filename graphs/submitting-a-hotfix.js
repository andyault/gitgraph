module.exports = graph => {
  const master = graph.branch('master');
  const staging = graph.branch('staging');
  const foh = graph.branch('foh');
  const hotfix = graph.branch('hotfix');

  graph.start();

  staging.merge(hotfix, { message: 'PR to staging', dashed: true });
  master.merge(hotfix, { message: 'PR to master', dashed: true });
  foh.merge(hotfix, { message: 'PR to FOH', dashed: true });

  hotfix.delete();
};
