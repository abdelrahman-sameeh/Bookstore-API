const request = require("supertest");
const app = require("../index");

describe("API Endpoints", () => {
  it("Register New Account", async () => {
    const res = await request(app).post("/api/v1/register").send({
      name: "Ahmed",
      email: "ahmed@gmail.com",
      password: "0000",
      role: "user",
    });

    expect(res.statusCode).toEqual(201);
    console.log(res);
    
    // expect(res.body.title).toEqual("The Alchemist");
  });
});
