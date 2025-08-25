// frontend/src/lib/api.js
import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:3000/api",
  withCredentials: false, // you can keep this false for now
  timeout: 5000,
});
