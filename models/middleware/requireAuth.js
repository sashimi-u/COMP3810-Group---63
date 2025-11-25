module.exports = function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    // remember the originally requested URL so we can return after login
    req.session = req.session || {};
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  next();
};
