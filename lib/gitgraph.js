/**
 * @todo remove end method?
 * @todo add color to options
 * @todo move message and author to options?
 * @todo add option to not progress graph?
 *   could be hidden, only used for delete
 *   or, if don't progress = true, ignore commit message
 * @todo update jsdoc
 * @todo remove util file, separate server
 * @todo add svg support
 * @todo vertical option?
 * @todo better styles - copy from git kraken or sourcetree
 * @todo add more git actions? rebase, cherry pick, etc
 * @todo add animations?
 */

/**
 * @typedef Commit
 * @property {string} [type]
 * @property {string} [message] - The commit message
 * @property {string} [author] - The commit author
 * @property {bool} [dashed] - Whether or not this commit should be displayed
 *   with dashed lines
 */

/**
 * @typedef CommitOptions
 * @property {string} [message] - The commit message
 * @property {string} [author] - The commit author
 */

/**
 * @typedef branchOptions
 * @property {Branch|string} [from] - The existing Branch from which this Branch
 *   should be created
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
    this.ended = false;
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

    this.commit({ type: commitTypes.START });
    this.started = true;

    return this;
  }

  /**
   * End the Graph. Any new commits made after a Graph has ended will error.
   * @returns {Graph} The current Graph
   */
  end() {
    if (!this.started)
      throw new Error('Graph must have been started before ending');

    if (this.ended) throw new Error('Graph already ended');

    this.commit({ type: commitTypes.END });
    this.ended = true;

    return this;
  }

  /**
   * Private method for adding to this Graph's commits
   * @param {Commit} commit - The commit to push
   */
  commit(commit) {
    if (this.ended) throw new Error('Graph has been ended');

    this.commits.push(commit);
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

    //also write to commits so we have a reference of when this branch was made
    graph.commit({
      type: commitTypes.BRANCH,
      branch: name,
      from: graph.started ? options.from : undefined,
      message: commitOptions.message,
      author: commitOptions.author,
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
      type: commitTypes.COMMIT,
      branch: this.name,
      message: commitOptions.message,
      author: commitOptions.author,
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

    //possibly generate a commit message
    if (!commitOptions.message)
      commitOptions.message = `Merge branch '${fromName}' into ${this.name}`;

    //add to graph
    const commit = {
      type: commitTypes.MERGE,
      branch: this.name,
      from: fromName,
      message: commitOptions.message,
      author: commitOptions.author,
      dashed: commitOptions.dashed,
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
      type: commitTypes.DELETE,
      branch: this.name,
      message: commitOptions.message,
      author: commitOptions.author,
    };

    this.graph.commit(commit);

    return this;
  }
};

//done :)
module.exports.commitTypes = commitTypes;
module.exports.Graph = Graph;
