require("dotenv").config();
const express = require("express");
const morgan = require("morgan");

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

const app = express();
connectDB();

app.use(express.static("./public"));

// app.use((req, res, next) => {
//   res.setTimeout(300000, () => {
//     res.status(408).send("Request timed out");
//   });
//   next();
// });

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
