import app from './app';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
  ================================================
   Rumilcarapp Server running on port ${PORT}
   http://localhost:${PORT}/api/health
  ================================================
  `);
});