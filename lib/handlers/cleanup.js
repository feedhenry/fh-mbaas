"use strict";

const express = require('express');
const Router = new express.Router();

router.post('/cleanup', require('./cleanup/tmp_cleanup'));

module.exports = Router;