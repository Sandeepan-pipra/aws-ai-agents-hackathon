const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  
  res.status(statusCode).json({
    error: {
      code,
      message: err.message,
      details: err.details || {}
    }
  });
};

module.exports = errorHandler;
