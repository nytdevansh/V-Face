const { FaceGuard } = require("./FaceGuard");
const { hashEncoding } = require("./utils");
const FaceExtraction = require("./FaceExtraction");

module.exports = {
    FaceGuard,
    hashEncoding,
    ...FaceExtraction
};
