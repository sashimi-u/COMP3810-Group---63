const csurf = require('csurf');

// create a single csurf instance for the app
const csrfProtection = csurf();

module.exports = function csrfFilter(req, res, next) {
  try {
    if (req.path && req.path.startsWith && req.path.startsWith('/api/')) return next();
    return csrfProtection(req, res, next);
  } catch (err) {
    return next(err);
  }
};
