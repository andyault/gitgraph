module.exports = {
  branches: [
    { name: 'master', existing: true },
    { name: 'feature', existing: false },
  ],
  commits: [
    { type: 'branch', branch: 'feature', from: 'master' },
    { type: 'commit', branch: 'feature' },
    { type: 'commit', branch: 'feature' },
  ],
};
