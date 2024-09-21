const { default: mongoose } = require("mongoose");

const connectDB = async () => {
  try {
    console.time('MongoDB Connection Time');

    if (!process.env.DP_URI) {
      throw new Error("Database connection string (DP_URI) is not defined in environment variables.");
    }

    const conn = await mongoose.connect(process.env.DP_URI);

    console.timeEnd('MongoDB Connection Time');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.timeEnd('MongoDB Connection Time');
    
    console.error("❌ Failed to connect to MongoDB. Please check your connection string and database server.");

    console.error(`Error details: ${error.message}`);
    
    setTimeout(connectDB, 1000 );
    // process.exit(1); 
  }
};

module.exports = connectDB;
