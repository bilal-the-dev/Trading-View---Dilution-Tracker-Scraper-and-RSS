const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Canada/Eastern");

console.log(dayjs("2025-10-02T15:40:54.986Z").format());
console.log(dayjs.tz("2025-10-02T15:40:54.986Z").format());
console.log(
  dayjs.utc("2025-10-02T15:40:54.986Z").tz("Canada/Eastern").format()
);
console.log(dayjs.tz("2025-10-01T15:40:54.986Z").isSame(dayjs.tz(), "day"));
