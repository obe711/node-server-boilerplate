/* eslint-disable no-param-reassign */

function removeEmptyProps(obj) {
  return [...Object.keys(obj)].reduce((acc, prop) => {
    if (obj[prop] === '') return acc;

    return {
      ...acc,
      [prop]: obj[prop],
    };
  }, {});
}

const paginate = (schema) => {
  /**
   * @typedef {Object} QueryResult
   * @property {Document[]} results - Results found
   * @property {number} page - Current page
   * @property {number} limit - Maximum number of results per page
   * @property {number} totalPages - Total number of pages
   * @property {number} totalResults - Total number of documents
   */
  /**
   * Query for documents with pagination
   * @param {Object} [filter] - Mongo filter
   * @param {Object} [options] - Query options
   * @param {string} [options.sortBy] - Sorting criteria using the format: sortField:(desc|asc). Multiple sorting criteria should be separated by commas (,)
   * @param {string} [options.populate] - Populate data fields. Hierarchy of fields should be separated by (.). Multiple populating criteria should be separated by commas (,)
   * @param {number} [options.limit] - Maximum number of results per page (default = 10)
   * @param {number} [options.page] - Current page (default = 1)
   * @param {string} [search] - Search for a string in the fields specified in the searchableFields property
   * @returns {Promise<QueryResult>}
   */
  schema.statics.paginate = async function (unCheckedFilter, options, search) {
    const filter = removeEmptyProps(unCheckedFilter);
    if (filter?.startDate) {
      Object.assign(filter, {
        createdAt: {
          ...filter.createdAt,
          $gte: new Date(parseInt(filter.startDate, 10)),
        },
      });
      delete filter.startDate;
    }
    if (filter?.endDate) {
      Object.assign(filter, {
        createdAt: {
          ...filter.createdAt,
          $lt: new Date(new Date(parseInt(filter.endDate, 10)).setDate(new Date(parseInt(filter.endDate, 10)).getDate() + 1)),
        },
      });
      delete filter.endDate;
    }

    let sort = '';
    if (options.sortBy) {
      const sortingCriteria = [];
      options.sortBy.split(',').forEach((sortOption) => {
        const [key, order] = sortOption.split(':');
        sortingCriteria.push((order === 'desc' ? '-' : '') + key);
      });
      sort = sortingCriteria.join(' ');
    } else {
      sort = 'createdAt';
    }

    const limit = options.limit && parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
    const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
    const skip = (page - 1) * limit;

    // Global Search
    const searchFilter = [...this.searchableFields()].map((field) => {
      return {
        [field]: { $regex: search, $options: 'i' },
      };
    });
    const searchQuery = search ? { $or: searchFilter } : {};

    const countPromise = this.countDocuments({ ...filter, ...searchQuery }).exec();
    let docsPromise = this.find({ ...filter, ...searchQuery })
      .sort(sort)
      .skip(skip)
      .limit(limit);

    if (options.populate) {
      options.populate.split(',').forEach((populateOption) => {
        docsPromise = docsPromise.populate(
          populateOption
            .split('.')
            .reverse()
            .reduce((a, b) => ({ path: b, populate: a }))
        );
      });
    }

    docsPromise = docsPromise.exec();

    return Promise.all([countPromise, docsPromise]).then((values) => {
      const [totalResults, results] = values;
      const totalPages = Math.ceil(totalResults / limit);
      const result = {
        results,
        page,
        limit,
        totalPages,
        totalResults,
      };
      return Promise.resolve(result);
    });
  };
};

module.exports = paginate;
