import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AccountService } from './account/account.service';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.useGlobalPipes(new ValidationPipe());
	app.enableCors();
	await seedAdminUser(app); 
	await app.listen(process.env.PORT ?? 3000);
}
async function seedAdminUser(app) {
	const userService = app.get(AccountService);
	const existing = await userService.findByUsername('admin');
	if (!existing) {
		await userService.createSuperAdmin();
		console.log('✅ Seeded default admin user: admin/admin');
	} else {
		console.log('ℹ️ Admin user already exists, skipping seed');
	}
}
bootstrap();
