class Pagination {
  constructor(modelName, model, query, page, limit) {
    this.modelName = modelName
    this.model = model;
    this.query = query;
    this.page = parseInt(page, 10) || 1;
    this.limit = parseInt(limit, 10) || 10;
    this.skip = (this.page - 1) * this.limit;
  }

  async paginate() {
    const total = await this.model.countDocuments(this.query);
    const results = await this.model.find(this.query)
      .skip(this.skip)
      .limit(this.limit);

    return {
      status: "success",
      pagination: {
        total,
        count: results.length,
        page: this.page,
        pages: Math.ceil(total / this.limit),
      },
      data: {
        [this.modelName]: results
      },
    };
  }
}

module.exports = Pagination;
