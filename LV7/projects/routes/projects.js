
var express = require("express"),
    router = express.Router(),
    mongoose = require("mongoose"),
    bodyParser = require("body-parser"),
    methodOverride = require("method-override");

router.use(bodyParser.urlencoded({
    extended: true
}));
router.use(
    methodOverride(function (req, res) {
        if (req.body && typeof req.body === "object" && "_method" in req.body) {
            var method = req.body._method;
            delete req.body._method;
            return method;
        }
    })
);

router.route("/archive").get(async function (req, res, next) {
    if (redirectIfNotLoggedIn(req, res)) return;

    const uid = req.session.uid.toString();

    try {
        const user = await mongoose.model("User").findById(uid).exec();
        const projects = await mongoose
            .model("Project")
            .find({
                archived: true,
                $or: [{
                        author: uid,
                    },
                    {
                        members: {
                            $regex: user.username,
                            $options: "i",
                        },
                    },
                ],
            })
            .exec();

        res.format({
            html: function () {
                res.render("projects/archive", {
                    title: "My Archived Projects",
                    projects: projects,
                });
            },
            json: function () {
                res.json(projects);
            },
        });
    } catch (err) {
        console.error(err);
    }
});

router.route("/my").get(function (req, res, next) {
    if (redirectIfNotLoggedIn(req, res)) return;

    const uid = req.session.uid.toString();

    mongoose.model("User")
        .findById(uid)
        .then(user => {
            mongoose.model("Project")
                .find({
                    author: uid
                })
                .then(leaderProjects => {
                    mongoose.model("Project")
                        .find({
                            members: {
                                $regex: user.username,
                                $options: "i"
                            }
                        })
                        .then(memberProjects => {
                            res.format({
                                html: function () {
                                    res.render("projects/my", {
                                        title: "My Projects",
                                        leaderProjects: leaderProjects,
                                        memberProjects: memberProjects,
                                    });
                                },
                                json: function () {
                                    res.json(leaderProjects);
                                    res.json(memberProjects);
                                },
                            });
                        })
                        .catch(err => console.error(err));
                })
                .catch(err => console.error(err));
        })
        .catch(err => console.error(err));
});

router.route("/delete/:id").delete(function (req, res) {
    if (redirectIfNotLoggedIn(req, res)) return;

    mongoose.model("Project").findById(req.params.id, function (err, project) {
        if (err) {
            return console.error(err);
        } else {
            project.remove(function (err, project) {
                if (err) {
                    return console.error(err);
                } else {
                    console.log("DELETE removing ID: " + project._id);
                    res.format({
                        html: function () {
                            res.redirect("/projects/my");
                        },
                        json: function () {
                            res.json({
                                message: "deleted",
                                item: project,
                            });
                        },
                    });
                }
            });
        }
    });
});

router
    .route("/")
    .get(async function (req, res, next) {
        if (redirectIfNotLoggedIn(req, res)) return;
        const Project = mongoose.model("Project");
        const User = mongoose.model("User");

        try {
            const projects = await Project.find().exec();
            const users = await User.find().exec();

            for (project of projects) {
                for (user of users) {
                    if (project.author == user._id) {
                        project.authorName = user.username;
                        break;
                    }
                }
            }

            res.format({
                html: function () {
                    res.render("projects/index", {
                        title: "Projects",
                        projects: projects,
                    });
                },
                json: function () {
                    res.json(projects);
                },
            });
        } catch (err) {
            console.error(err);
        }

    })
    .post(async function (req, res) {
        if (redirectIfNotLoggedIn(req, res)) return;

        const name = req.body.name;
        const description = req.body.description;
        const price = req.body.price;
        const _members = req.param("member");
        let members;
        if (typeof _members === "undefined") {
            members = "";
        } else {
            members = _members.toString();
        }
        const finishedWorks = req.body.finishedWorks;
        const startTime = req.body.startTime;
        const endTime = req.body.endTime;
        const archived = req.body.archived === "on";
        const author = req.session.uid;

        try {
            const project = await mongoose.model("Project").create({
                name: name,
                description: description,
                price: price,
                members: members,
                finishedWorks: finishedWorks,
                startTime: startTime,
                endTime: endTime,
                archived: archived,
                author: author,
            });

            console.log("POST creating new project: " + project);

            res.format({
                html: function () {
                    res.location("projects");
                    res.redirect("/projects");
                },
                json: function () {
                    res.json(project);
                },
            });
        } catch (err) {
            res.send("There was a problem adding the information to the database.");
        }
    });

router.get("/new", async function (req, res) {
    if (redirectIfNotLoggedIn(req, res)) return;

    const uid = req.session.uid.toString();

    try {
        const users = await mongoose
            .model("User")
            .find({
                _id: {
                    $ne: uid,
                },
            })
            .exec();

        res.render("projects/new", {
            title: "New Project",
            users: users,
        });
    } catch (err) {
        console.log("GET Error: There was a problem retrieving: " + err);
    }
});


router.route("/:id").get(async function (req, res) {
    if (redirectIfNotLoggedIn(req, res)) return;

    const uid = req.session.uid.toString();

    try {
        const user = await mongoose.model("User").findById(uid);
        const project = await mongoose.model("Project").findOne({
            _id: req.params.id
        });
        res.format({
            html: function () {
                res.render("projects/show", {
                    project: project,
                    author: user.username,
                    title: "Details",
                });
            },
            json: function () {
                res.json(project);
            },
        });
    } catch (err) {
        console.log("GET Error: There was a problem retrieving: " + err);
        res.status(500).send("Error retrieving data");
    }
});

router
    .route("/edit/:id")
    .get(async function (req, res) {
        if (redirectIfNotLoggedIn(req, res)) return;

        const uid = req.session.uid.toString();

        try {
            const users = await mongoose.model("User").find({
                _id: {
                    $ne: uid
                }
            });

            const project = await mongoose.model("Project").findById(req.params.id);

            for (user of users) {
                const members = project.members;
                if (members === "" || members === null) {
                    user.checked = false;
                } else {
                    user.checked = members.includes(user.username);
                }
            }

            res.format({
                html: function () {
                    res.render("projects/edit", {
                        title: "Project: " + project._id,
                        project: project,
                        users: users,
                        title: "Edit",
                    });
                },
                json: function () {
                    res.json(project);
                    res.json(users);
                },
            });
        } catch (err) {
            console.log("GET Error: There was a problem retrieving: " + err);
        }
    })
    .put(function (req, res) {
        if (redirectIfNotLoggedIn(req, res)) return;

        const name = req.body.name;
        const description = req.body.description;
        const price = req.body.price;
        const _members = req.param("member");
        let members;
        if (typeof _members === "undefined") {
            members = "";
        } else {
            members = _members.toString();
        }
        const finishedWorks = req.body.finishedWorks;
        const startTime = req.body.startTime;
        const endTime = req.body.endTime;
        const archived = req.body.archived === "on";

        mongoose.model("Project")
            .findByIdAndUpdate(req.params.id, {
                name: name,
                description: description,
                price: price,
                members: members,
                finishedWorks: finishedWorks,
                startTime: startTime,
                endTime: endTime,
                archived: archived,
            })
            .then(function (projectId) {
                res.format({
                    html: function () {
                        res.redirect("/projects/my");
                    },
                });
            })
            .catch(function (err) {
                res.send(
                    "There was a problem updating the information to the database: " +
                    err
                );
            });
    });

router
    .route("/editMember/:id")
    .get(function (req, res) {
        if (redirectIfNotLoggedIn(req, res)) return;

        const uid = req.session.uid.toString();

        mongoose.model("User")
            .find({
                _id: {
                    $ne: uid
                }
            })
            .exec()
            .then(users => {
                mongoose.model("Project").findById(req.params.id, function (err, project) {
                    if (err) {
                        console.log("GET Error: There was a problem retrieving: " + err);
                    } else {
                        for (user of users) {
                            const members = project.members;
                            if (members === "" || members === null) {
                                user.checked = false;
                            } else {
                                user.checked = members.includes(user.username);
                            }
                        }

                        res.format({
                            html: function () {
                                res.render("projects/edit_member", {
                                    title: "Project: " + project._id,
                                    project: project,
                                    users: users,
                                    title: "Edit",
                                });
                            },
                            json: function () {
                                res.json(project);
                                res.json(users);
                            },
                        });
                    }
                });
            })
            .catch(err => {
                console.log("GET Error: There was a problem retrieving: " + err);
            });
    })
    .put(function (req, res) {
        if (redirectIfNotLoggedIn(req, res)) return;

        const finishedWorks = req.body.finishedWorks;

        mongoose.model("Project").findById(req.params.id, function (err, project) {
            project.update({
                    finishedWorks: finishedWorks,
                },
                function (err, projectId) {
                    if (err) {
                        res.send(
                            "There was a problem updating the information to the database: " +
                            err
                        );
                    } else {
                        res.format({
                            html: function () {
                                res.redirect("/projects/my");
                            },
                        });
                    }
                }
            );
        });
    });

function redirectIfNotLoggedIn(req, res) {
    if (!req.session.uid) {
        res.redirect("/login");
        return true;
    }
    return false;
}

module.exports = router;