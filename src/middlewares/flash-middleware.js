module.exports = (req, res, next) => {
    res.locals.session = req.session;
    res.locals.success = req.session.successMessage;
    res.locals.error = req.session.errorMessage;
    res.locals.message = req.session.message;
    res.locals.warning = req.session.warningMessage;
    res.locals.info = req.session.infoMessage;
    delete req.session.successMessage;
    delete req.session.errorMessage;
    delete req.session.message;
    delete req.session.warningMessage;
    delete req.session.infoMessage;
    next();
};