const httpStatus = (statusCode) => {
  if(isNaN(+statusCode)){
    statusCode = 500
  }
  
  if(+statusCode >= 400 && +statusCode < 500  ){
    return 'failed'
  }
  if(+statusCode >= 500  ){
    return 'error'
  }
}

module.exports = httpStatus
