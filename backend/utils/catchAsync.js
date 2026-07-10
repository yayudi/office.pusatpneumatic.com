/**
 * Utility to catch errors in async express route handlers
 * and pass them to the global error handler via next()
 *
 * @param {Function} fn - The async route handler function
 * @returns {Function} - Express middleware function
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default catchAsync;
