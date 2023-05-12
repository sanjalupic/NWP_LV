var mongoose = require('mongoose');
var blobSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    workdone: String,
    start: Date,
    end: Date,
    members: [String],
});
mongoose.model('Project', blobSchema);