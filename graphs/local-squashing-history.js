const colors = require('../lib/colors');

module.exports = graph => {
  const master = graph.branch('master', {}, { color: colors.master });
  const staging = graph.branch('staging', {}, { color: colors.staging });
  const dev = graph.branch('dev', {}, { color: colors.dev });

  graph.start();

  const feature = master.branch(
    'feature',
    { message: 'branch into feature' },
    { color: colors.feature }
  );

  dev
    .merge(feature, { message: 'feature v1' })
    .merge(feature, { message: 'feature v2' });

  staging.merge(feature, { message: 'feature' });

  staging.commit({ message: 'revert feature' });

  dev
    .merge(feature, { message: 'feature v3' })
    .merge(feature, { message: 'feature v4' });

  staging.merge(feature, { message: 'feature' });
};
