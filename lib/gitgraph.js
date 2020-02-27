/**
 * @todo add animations!
 * @todo figure out better implementation for commit messages
 *   how to handle inplace commits? currently just ignoring messages for inplace
 * @todo add more git actions? rebase, cherry pick, etc
 */

/**
 * @typedef Commit
 * @property {string} [type]
 * @property {string} [message] - The commit message
 * @property {string} [author] - The commit author
 * @property {bool} [dashed=false] - Whether or not this commit should be
 *   displayed with dashed lines
 * @property {bool} [inplace=false] - If a commit is "inplace", it will not
 *   advance the graph
 */

/**
 * @typedef CommitOptions
 * @property {string} [message] - The commit message
 * @property {string} [author] - The commit author
 * @property {bool} [inplace=false] - If a commit is "inplace", it will not
 *   advance the graph
 */

/**
 * @typedef branchOptions
 * @property {Branch|string} [from] - The existing Branch from which this Branch
 *   should be created
 * @property {number} [index] - The desired index at which to insert this branch
 *   into its graph. Note that no branches will be replaced
 */

/**
 * @readonly
 * @enum {string}
 */
const commitTypes = {
  START: 'START',
  BRANCH: 'BRANCH',
  COMMIT: 'COMMIT',
  MERGE: 'MERGE',
  DELETE: 'DELETE',
  END: 'END',

  EMPTY: 'EMPTY',
};

/** Graph */
const Graph = class Graph {
  /**
   * Create a new Graph
   * @constructor {Graph}
   * @returns {Graph} The newly created Graph
   */
  constructor() {
    this.branches = [];
    this.commits = [];
    this.started = false;
    this.index = 0;
  }

  /**
   * Create a new Branch
   * @param {string} name - The unique name of the Branch to create
   * @param {CommitOptions} commitOptions - Options for the initial commit of
   *   this new branch
   * @param {BranchOptions} [options]
   * @param {number} [options.index] - The order in which this Branch should be
   *   shown in the Graph
   * @returns {Branch} The newly created Branch
   */
  branch(name, commitOptions = {}, options = {}) {
    const { index, ...branchOptions } = options;

    const branch = new Branch(name, this, commitOptions, branchOptions);

    //use index if given
    const spliceIndex = options.index || this.branches.length;
    this.branches.splice(spliceIndex, 0, branch);

    //return new branch for chaining
    return branch;
  }

  /**
   * Start the Graph. Any Branches created before start is called will be shown
   * as existing previously, and any Branches created after start is called will
   * be shown as being created by a commit.
   * @returns {Graph} The current Graph
   */
  start() {
    if (this.started) throw new Error('Graph already started');

    this.commit({ type: commitTypes.START }); // , branch: '_meta' });
    this.started = true;

    return this;
  }

  /**
   * Private method for adding to this Graph's commits
   * @param {Commit} commit - The commit to push
   */
  commit(commit) {
    const { message, inplace, ...final } = commit;

    //when we get a START commit
    //  make all existing commits have negative indices
    //  make the start commit index 0
    if (final.type === commitTypes.START) {
      for (let i = 0; i < this.commits.length; i++)
        this.commits[i].index -= this.index;

      this.index = 0;
    }

    final.index = this.index;

    //in place commits shouldn't increase the index or have a message
    //(so that we can't have two commit messages in the same spot)
    if (!inplace) {
      final.message = message;
      this.index += 1;
    }

    this.commits.push(final);
  }
};

/** Branch */
const Branch = class Branch {
  /**
   * Create a new Branch
   * @param {string} name - The name of this branch
   * @param {Graph} graph - The Graph to which this Branch belongs
   * @param {CommitOptions} commitOptions -
   * @param {BranchOptions} branchOptions -
   * @returns
   */
  constructor(name, graph, commitOptions, branchOptions) {
    //make sure name and graph have been given
    if (!name) throw new Error('`name` is required');
    if (!graph) throw new Error('`graph` is required');

    //make sure name is unique
    const existing = graph.branches.find(branch => branch.name === name);

    if (existing) throw new Error('Branch names must be unique');

    //make sure from exists
    if (graph.started && branchOptions.from) {
      const fromExisting = graph.branches.find(
        branch => branch.name === branchOptions.from
      );

      if (!fromExisting)
        throw new Error('`options.from` must refer to an existing branch');
    }

    //branch is safe to create
    this.name = name;
    this.graph = graph;
    this.color = branchOptions.color;

    //also write to commits so we have a reference of when this branch was made
    graph.commit({
      ...commitOptions,
      type: commitTypes.BRANCH,
      branch: name,
      from: graph.started ? branchOptions.from : undefined,
    });

    return this;
  }

  /**
   * Add a new commit to the Graph for this Branch
   * @param {CommitOptions} [commitOptions] -
   * @returns {Branch} The current Branch for chaining
   */
  commit(commitOptions = {}) {
    const commit = {
      ...commitOptions,
      type: commitTypes.COMMIT,
      branch: this.name,
    };

    this.graph.commit(commit);

    return this;
  }

  /**
   * Add a new merge commit to the Graph for this Branch
   * @param {string|Branch} from The Branch from which to merge
   * @param {CommitOptions} [commitOptions] -
   * @param {string} [commitOptions.message] - The commit message. If not given,
   *   the commit message will be set to "Merge branch '{from}' into
   *   {this.name}"
   * @param {string} [author] - The commit author
   * @returns {Branch} The current Branch
   */
  merge(from, commitOptions = {}) {
    //from can be a branch or a string
    let fromName = from;

    if (typeof fromName === 'object') fromName = from.name;

    //make sure from exists
    const fromIndex = this.graph.branches.findIndex(
      branch => branch.name === fromName
    );

    if (fromIndex < 0)
      throw new Error('`from` must refer to an existing branch');

    //add to graph
    const commit = {
      message: `Merge branch '${fromName}' into ${this.name}`,
      ...commitOptions,
      type: commitTypes.MERGE,
      branch: this.name,
      from: fromName,
    };

    this.graph.commit(commit);

    return this;
  }

  /**
   * Create a new Branch from the current Branch
   * @param {string} name - The unique name of the Branch to create
   * @param {CommitOptions} [commitOptions] -
   * @param {object} [options]
   * @param {number} [options.index] - The order in which this Branch should be
   *   shown in the Graph
   * @returns {Branch} The newly created Branch
   */
  branch(name, commitOptions = {}, options = {}) {
    const graphOptions = {
      ...options,
      from: this.name,
    };

    const newBranch = this.graph.branch(name, commitOptions, graphOptions);
    return newBranch;
  }

  /**
   * Delete this branch
   * @param {CommitOptions} [commitOptions] -
   */
  delete(commitOptions = {}) {
    const commit = {
      inplace: true,
      ...commitOptions,
      type: commitTypes.DELETE,
      branch: this.name,
    };

    this.graph.commit(commit);

    return this;
  }
};

//done :)
module.exports.commitTypes = commitTypes;
module.exports.Graph = Graph;
