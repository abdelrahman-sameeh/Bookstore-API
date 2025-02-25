require("dotenv").config();
const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cron = require("node-cron");
const http = require("http");
const { Server } = require("socket.io");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");

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
const deliveryRouter = require("./routes/delivery.routes");
const usersRouter = require("./routes/users.routes");
const messageRouter = require("./routes/message.routes");
const chatRouter = require("./routes/chat.routes");

const { retryFailedRefunds } = require("./controllers/payment.controllers");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
  },
});

connectDB();

app.use(express.static("./public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(cors({}));

// Load YAML file
const swaggerDocument = YAML.load("./swagger.yaml");
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Schedule the job to run every 4 hours
cron.schedule("0 */4 * * *", () => {
  console.log("Running scheduled job to retry failed refunds");
  retryFailedRefunds();
});

if (process.env.MODE == "dev") {
  app.use(morgan("dev"));
}

// Global webhook
// Make sure webhook is before """app.use(express.json())"""
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
app.use("/api/v1", deliveryRouter);
app.use("/api/v1", usersRouter);
app.use("/api/v1", messageRouter);
app.use("/api/v1", chatRouter);

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
      : {
          message: error.message,
          status: httpStatus(error.statusCode),
          stack: error.stack,
        };

  res.status(error.statusCode || 500).json(jsonResponse);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});

// process.on("uncaughtException", (err) => {
//   console.error("Unhandled exception caught:", err);
//   // يمكنك إنهاء التطبيق بأمان هنا إذا لزم الأمر
//   // process.exit(1); // يمكنك اختيار 0 لإنهاء طبيعي أو 1 للإنهاء مع خطأ
// });



io.activeUsers = {};

const registerEvent = require("./socketEvents/register.socket");
const disconnectEvent = require("./socketEvents/disconnect.socket");
const chatEvent = require("./socketEvents/chat.socket");

io.on("connection", (socket) => {
  registerEvent(io, socket);
  disconnectEvent(io, socket);
  chatEvent(io, socket);
});

module.exports = { app };
