const express = require("express");
const router = express.Router();
const courses = require("../data/courses.json");

router.get("/", (req, res) => {
  const { subject } = req.query; // ?subject=CS
  const list = subject ? courses.filter((c) => c.subject === subject) : courses;
  res.json(list);
});

module.exports = router;
