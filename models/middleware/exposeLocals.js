module.exports = function exposeLocals(req, res, next) {
  try {
    try {
      res.locals.csrfToken = req.csrfToken();
    } catch (e) {
      res.locals.csrfToken = undefined;
    }
  } catch (err) {
    res.locals.csrfToken = undefined;
  }

  try {
    res.locals.showDemo = process.env.NODE_ENV !== 'production';
  } catch (err) {
    res.locals.showDemo = false;
  }

  next();
};
