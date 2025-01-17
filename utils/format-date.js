const { format, isToday, isThisWeek, isYesterday } = require("date-fns");

const formatMessageDate = (date) => {
  const createdAtDate = new Date(date);

  if (isToday(createdAtDate)) {
    return createdAtDate.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } else if (isYesterday(createdAtDate)) {
    return "Yesterday";
  } else if (isThisWeek(createdAtDate)) {
    return format(createdAtDate, "EEEE");
  } else {
    return format(createdAtDate, "dd/MM/yyyy");
  }
};
module.exports = {
  formatMessageDate
}
