

var mongoose = require('mongoose');
var projectSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: String,
    members: String,
    finishedWorks: String,
    startTime: String,
    endTime: String,
    archived: Boolean,
    author: String,
});
mongoose.model('Project', projectSchema);