const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const pinoHttp = require('pino-http');
const logger = require('./config/logger');
const patientRoutes = require('./routes/patientRoutes');
const { logSecurityHeaders } = require('./middleware/logSecurityHeaders');
const { notFound } = require('./middleware/notFound');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

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
  res.status(200).json({ status: 'ok', service: 'patient-service' });
});

app.use('/patients', patientRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
