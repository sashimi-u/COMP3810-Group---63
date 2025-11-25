module.exports = function flashMiddleware(req, res, next) {
  try {
    res.locals.flash = req.session && req.session.flash ? req.session.flash : null;
    if (req.session) delete req.session.flash;
  } catch (e) {
    // swallow any session read errors and continue
  }
  next();
};
