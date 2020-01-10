const graph = {
  commitTypes: {
    START: 'START',
    BRANCH: 'BRANCH',
    COMMIT: 'COMMIT',
    MERGE: 'MERGE',
    DELETE: 'DELETE',
    END: 'END',
  },
};

/** Graph */
graph.Graph = class Graph {
  constructor() {
    this.branches = [];
    this.commits = [];
    this.started = false;
    this.ended = false;
  }

  /**
   * Create a new Branch
   * @param {string} name - The unique name of the Branch to create
   * @param {object} [options]
   * @param {string} [options.from] - The existing Branch from which this Branch
   *   should be created
   * @param {number} [options.index] - The order in which this Branch should be
   *   shown in the Graph
   * @returns {Branch} The newly created Branch
   */
  branch(name, options = {}) {
    //make sure name is unique
    const existing = this.branches.find(branch => branch.name === name);

    if (existing) throw new Error('Branch names must be unique');

    //make sure from exists
    if (this.started && options.from) {
      const fromExisting = this.branches.find(
        branch => branch.name === options.from
      );

      if (!fromExisting)
        throw new Error('`options.from` must refer to an existing branch');
    }

    //use index if given
    const index = options.index || this.branches.length;

    //use splice so that indexes will be sequential and nothing gets replaced
    const branch = new graph.Branch(name, this);

    this.branches.splice(index, 0, branch);

    //also write to commits so we have a reference of when this branch was made
    this.commit({
      type: graph.commitTypes.BRANCH,
      branch: branch.name,
      from: this.started ? options.from : undefined,
    });

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

    this.commit({ type: graph.commitTypes.START });
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

    this.commit({ type: graph.commitTypes.END });
    this.ended = true;

    return this;
  }

  /**
   * Private method for adding to this Graph's commits
   * @param {object} commit - The commit to push
   */
  commit(commit) {
    if (this.ended) throw new Error('Graph has been ended');

    this.commits.push(commit);
  }
};

/** Branch */
graph.Branch = class Branch {
  constructor(name, graph) {
    this.name = name;
    this.graph = graph;
  }

  /**
   * Add a new commit to the Graph for this Branch
   * @param {string} [message] - The commit message
   * @param {string} [author] - The commit author
   * @returns {Branch} The current Branch
   */
  commit(message = '', author) {
    const commit = {
      type: graph.commitTypes.COMMIT,
      branch: this.name,
      message,
      author,
    };

    this.graph.commit(commit);

    return this;
  }

  /**
   * Add a new merge commit to the Graph for this Branch
   * @param {string|Branch} from The Branch from which to merge
   * @param {string} [message] - The commit message. If not given, the commit
   *   message will be set to "Merge branch '{from}' into {this.name}"
   * @param {string} author - The commit author
   * @returns {Branch} The current Branch
   */
  merge(from, message = '', author) {
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
      type: graph.commitTypes.MERGE,
      branch: this.name,
      fromIndex,
      from: fromName,
      message,
      author,
    };

    this.graph.commit(commit);

    return this;
  }

  /**
   * Create a new Branch from the current Branch
   * @param {string} name - The unique name of the Branch to create
   * @param {object} [options]
   * @param {number} [options.index] - The order in which this Branch should be
   *   shown in the Graph
   * @returns {Branch} The newly created Branch
   */
  branch(name, options) {
    const graphOptions = {
      ...options,
      from: this.name,
    };

    const newBranch = this.graph.branch(name, graphOptions);
    return newBranch;
  }
};

//done :)
module.exports = graph;
