const dayjs = require("./dayjs.js");

exports.isToday = (date) => dayjs.tz(date).isSame(dayjs.tz(), "day");
