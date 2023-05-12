var express = require('express');
var router = express.Router();
const mongoose = require('mongoose')

router.get('/', async function (req, res, next) {
    const data = await mongoose.model('Project').find()
    res.render('list-projects', {
        projects: data
    });
});

router.get('/json', async function (req, res, next) {
    const data = await mongoose.model('Project').find()
    res.send(JSON.stringify(data))
});


router.get('/add-member/:id', function (req, res, next) {
    res.render('add-member', {
        project: {
            id: req.params.id
        }
    });
});

router.post('/add-member', async function (req, res, next) {
    const project = await mongoose.model('Project').findById(req.body.id)
    const existing = project.members || []
    existing.push(req.body.member)
    project.members = existing
    await project.save()
    res.redirect('/projects');
});

router.get('/create', function (req, res, next) {
    res.render('single-project', {
        project: {}
    });
});

router.get('/edit/:id', async function (req, res, next) {
    const single = await mongoose.model('Project').findById(req.params.id)
    res.render('single-project', {
        project: single
    });
});

router.get('/delete/:id', async function (req, res, next) {
    const single = await mongoose.model('Project').deleteOne({
        _id: req.params.id
    })
    res.redirect('/projects');
});

router.post('/', async function (req, res, next) {
    if (req.body.id) {
        const doc = await mongoose.model('Project').findById(req.body.id)
        Object.assign(doc, req.body)
        await doc.save()
    } else {
        await mongoose.model('Project').create(req.body)
    }

    res.redirect('/projects')
});

module.exports = router;