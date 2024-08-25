require("dotenv").config();
const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cron = require("node-cron");

const connectDB = require("./api/connectDB");
const httpStatus = require("./utils/httpStatus");

const authRouter = require("./routes/auth.routes");
const categoryRouter = require("./routes/category.routes");
const bookRouter = require("./routes/book.routes");
const addressRouter = require("./routes/address.routes");
const couponsRouter = require("./routes/coupon.routes");
const cartRouter = require("./routes/cart.routes");
const orderRouter = require("./routes/order.routes");
const paymentRouter = require("./routes/payment.routes");
const webhookRoutes = require("./routes/webhook.routes");
const { retryFailedRefunds } = require("./controllers/payment.controllers");

const app = express();
connectDB();

app.use(express.static("./public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Schedule the job to run every 5 minutes
cron.schedule("0 */4 * * *", () => {
  console.log("Running scheduled job to retry failed refunds");
  retryFailedRefunds();
});

if (process.env.MODE == "dev") {
  app.use(morgan("dev"));
}

// global webhook
// make sure webhook before """app.use(express.json())"""
app.use("/api/v1", webhookRoutes);

app.use(express.json());

app.use("/api/v1", authRouter);
app.use("/api/v1", categoryRouter);
app.use("/api/v1", bookRouter);
app.use("/api/v1", addressRouter);
app.use("/api/v1", couponsRouter);
app.use("/api/v1", cartRouter);
app.use("/api/v1", orderRouter);
app.use("/api/v1", paymentRouter);

app.all("*", (req, res) => {
  return res.status(404).json({ error: "not found this route" });
});

app.use((error, req, res, next) => {
  let jsonResponse =
    process.env.MODE == "dev"
      ? {
          message: error.message,
          status: httpStatus(error.statusCode),
          stack: error.stack,
        }
      : { message: error.message, status: httpStatus(error.statusCode) };

  res.status(error.statusCode || 500).json(jsonResponse);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`App listen in port ${PORT}`);
});
