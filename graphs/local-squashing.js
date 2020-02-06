const colors = require('../lib/colors');

module.exports = graph => {
  const master = graph.branch('master', {}, { color: colors.master });
  const staging = graph.branch('staging', {}, { color: colors.staging });
  const dev = graph.branch('dev', {}, { color: colors.dev });

  graph.start();

  master.commit();

  //work on feature
  const feature = master
    .branch(
      'feature',
      { message: 'branch from master' },
      { color: colors.feature }
    )
    .commit({ message: 'work 1' })
    .commit({ message: 'work 2' })
    .commit({ message: 'work 3' });

  //squash merge to to-dev
  const toDev = dev
    .branch(
      'to-dev',
      { message: 'branch from dev' },
      { index: 3, color: colors.toDev }
    )
    .merge(feature, { message: 'squash feature v1' });

  dev.merge(toDev, { message: 'PR to dev', dashed: true });

  //responding to qa on feature
  feature
    .commit({ message: 'work 4' })
    .commit({ message: 'work 5' })
    .commit({ message: 'work 6' });

  //squash merge to to-dev
  toDev.merge(dev).merge(feature, { message: 'squash feature v2' });

  dev.merge(toDev, { message: 'PR to dev 2', dashed: true });

  //squash merge to staging
  const toStaging = staging
    .branch(
      'to-staging',
      { message: 'branch from staging' },
      { index: 2, color: colors.toStaging }
    )
    .merge(feature, { message: 'squash feature v1 and 2' });

  staging.merge(toStaging, { message: 'PR to staging' });
};
