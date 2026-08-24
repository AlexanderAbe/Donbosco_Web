module.exports = (req, res, next) => {
    res.locals.session = req.session; 
    res.locals.success = req.session.successMessage;
    delete req.session.successMessage;
    next();
};