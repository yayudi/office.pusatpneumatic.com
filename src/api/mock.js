// api/mock.js
import MockAdapter from "axios-mock-adapter";
import api from "./axios";

const mock = new MockAdapter(api, { delayResponse: 500 });

// Dummy data
const USER = { username: "admin", password: "12345" };
const PRODUCTS = [
  { id: 1, name: "Kompresor", stock: 10 },
  { id: 2, name: "Valve", stock: 25 },
  { id: 3, name: "Silinder", stock: 5 },
];

// ✅ Mock login
mock.onPost("/auth/login").reply(config => {
  const { username, password } = JSON.parse(config.data);

  if (username === USER.username && password === USER.password) {
    const fakeToken = "mock-jwt-token";
    localStorage.setItem("token", fakeToken);
    return [200, { success: true, token: fakeToken, message: "Login berhasil" }];
  }
  return [401, { success: false, message: "Username atau password salah" }];
});

// ✅ Mock session check
mock.onGet("/auth/session").reply(() => {
  const loggedIn = !!localStorage.getItem("token");
  return [200, { loggedIn }];
});

// ✅ Mock logout
mock.onPost("/auth/logout").reply(() => {
  localStorage.removeItem("token");
  return [200, { success: true }];
});

// ✅ Mock products
mock.onGet("/products").reply(() => {
  return [200, { success: true, data: PRODUCTS }];
});

export default mock;
