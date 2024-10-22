class Pagination {
  constructor(modelName, model, query, page, limit, sort, populate=[]) {
    this.modelName = modelName;
    this.model = model;
    this.query = query;
    this.page = parseInt(page, 10) || 1;
    this.limit = parseInt(limit, 10) || 10;
    this.skip = (this.page - 1) * this.limit;
    this.sort = sort || {};
    this.populate = populate
  }

  async paginate() {
    const total = await this.model.countDocuments(this.query);
    let results = this.model.find(this.query)
      .sort(this.sort)
      .skip(this.skip)
      .limit(this.limit)

    if(this.populate && this.populate.length){
      const pop = this.populate.map(pop => ([{path: pop.field, select: pop.select}]))
      results.populate(pop)
    }else{
      results.populate(this.populate)
    }

    results = await results

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
