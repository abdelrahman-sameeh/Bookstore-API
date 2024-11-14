const request = require("supertest");
const { app } = require("../index");
const { User } = require("../models/user.model");
const Delivery = require("../models/delivery.model");

const userData = {
  name: "Ahmed",
  email: "ahmed555_test@gmail.com",
  password: "0000",
  role: "user",
};

const deliveryData = {
  name: "Ahmed",
  password: "0000",
  email: "ahmed_555_delivery@gmail.com",
  role: "delivery",
};

let token;

beforeAll(async () => {
  // Ensure test user does not already exist
  await User.findOneAndDelete({ email: userData.email });
  const delivery = await User.findOne({ email: deliveryData.email });
  if (delivery) {
    await Delivery.findOneAndDelete({ user: delivery._id });
    await delivery.deleteOne();
  }
});

afterAll(async () => {
  // Clean up: delete test user after all tests
  await User.findOneAndDelete({ email: userData.email });
  const delivery = await User.findOne({ email: deliveryData.email });
  if (delivery) {
    await Delivery.findOneAndDelete({ user: delivery._id });
    await delivery.deleteOne();
  }
});

describe("Authentication Endpoints", () => {
  describe("Register Endpoint", () => {
    it("should register a new account", async () => {
      const res = await request(app).post("/api/v1/register").send(userData);
      expect(res.statusCode).toEqual(201);
    });

    it("should not allow registering with the same account", async () => {
      const res = await request(app).post("/api/v1/register").send(userData);
      expect(res.statusCode).toEqual(400);
      expect(res.body.message?.toLowerCase()).toEqual("email already exist");
    });

    it("should register delivery account", async () => {
      const res = await request(app)
        .post("/api/v1/register")
        .send(deliveryData);
      expect(res.statusCode).toEqual(201);
    });
  });

  describe("Login Endpoint", () => {
    it("should login successfully", async () => {
      const response = await request(app).post("/api/v1/login").send({
        email: userData.email,
        password: userData.password,
      });
      expect(response.body.status).toBe("success");
      expect(response.statusCode).toBe(200);
      token = response.body.data.token;
    });

    it("should login failed", async () => {
      const response = await request(app)
        .post("/api/v1/login")
        .send({
          email: userData.email,
          password: userData.password + "123",
        });
      expect(response.body.status).toBe("failed");
      expect(response.statusCode).toBe(400);
      expect(response.body.message?.toLowerCase()).toBe(
        "email or password are incorrect"
      );
    });
  });

  describe("LoggedIn User", () => {
    it("should get LoggedIn user", async () => {
      const response = await request(app)
        .get("/api/v1/auth")
        .set("Authorization", `Bearer ${token}`)
        .send();
      expect(response.statusCode).toBe(200);
      expect(response.body.data.user.email).toBe(userData.email);
    });
  });
});
