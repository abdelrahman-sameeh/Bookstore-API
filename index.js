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

const { retryFailedRefunds } = require("./controllers/payment.controllers");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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
server.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});

// Socket.io setup
io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle socket events here

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});
