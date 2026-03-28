const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const pinoHttp = require('pino-http');
const logger = require('./config/logger');
const doctorRoutes = require('./routes/doctorRoutes');
const { logSecurityHeaders } = require('./middleware/logSecurityHeaders');
const { notFound } = require('./middleware/notFound');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));
app.use(
  pinoHttp({
    logger,
    quietReqLogger: true,
    customProps: (req, _res) => ({
      method: req.method,
      path: req.originalUrl
    }),
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url
      }),
      res: (res) => ({
        statusCode: res.statusCode
      })
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.originalUrl} -> ${res.statusCode}`,
    customErrorMessage: (req, res, err) => `${req.method} ${req.originalUrl} -> ${res.statusCode} (${err.message})`
  })
);
app.use(logSecurityHeaders);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'doctor-service',
    myScheduleUi: '/my-schedule/index.html'
  });
});

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/my-schedule', (_req, res) => {
  res.redirect(302, '/my-schedule/index.html');
});

app.use('/doctors', doctorRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
