const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const profaneSchema = mongoose.Schema(
  {
    word: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
profaneSchema.plugin(toJSON);
profaneSchema.plugin(paginate);

profaneSchema.statics.searchableFields = function () {
  return ['word'];
};

/**
 * @typedef Profane
 */
const Profane = mongoose.model('Profane', profaneSchema);

module.exports = Profane;
