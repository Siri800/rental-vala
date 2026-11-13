import { app } from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  console.log(`\n🚀 Rental Vala API server running at http://localhost:${env.PORT}`);
  console.log(`   Health check: http://localhost:${env.PORT}/health`);
  console.log(`   Categories  : http://localhost:${env.PORT}/api/v1/categories\n`);
});