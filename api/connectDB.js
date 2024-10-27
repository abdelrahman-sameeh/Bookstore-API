const { default: mongoose } = require("mongoose");

const connectDB = async () => {
  try {
    console.time("MongoDB Connection Time");

    // تحديد URI بناءً على الوضع (التطوير أو الإنتاج)
    const dbURI =
      process.env.MODE === "dev"
        ? process.env.DP_URI
        : process.env.DP_URI_PROD;

    if (!dbURI) {
      throw new Error(
        `Database connection string (${process.env.MODE === "dev" ? "DP_URI" : "DP_URI_PROD"}) is not defined in environment variables.`
      );
    }

    // الاتصال بقاعدة البيانات
    const conn = await mongoose.connect(dbURI);

    console.timeEnd("MongoDB Connection Time");
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.timeEnd("MongoDB Connection Time");

    console.error("❌ Failed to connect to MongoDB.");
    console.error(`Error: ${error.message}`);

    // إعادة المحاولة بعد 1 ثانية في حال حدوث خطأ
    setTimeout(connectDB, 1000);
  }
};


module.exports = connectDB;
