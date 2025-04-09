import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { INFLUX_CLIENT, REDIS_CLIENT } from './constants';
import { InfluxDB } from '@influxdata/influxdb-client';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),

		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				type: 'postgres',
				host: config.get('DB_HOST'),
				port: config.get<number>('DB_PORT'),
				username: config.get('DB_USERNAME'),
				password: config.get('DB_PASSWORD'),
				database: config.get('DB_NAME'),
				entities: [],
				synchronize: true,
			}),
		}),
	],
	providers: [
		{
			provide: REDIS_CLIENT,
			inject: [ConfigService],
			useFactory: (config: ConfigService) => {
				return new Redis({
					host: config.get('REDIS_HOST'),
					port: config.get<number>('REDIS_PORT'),
				});
			},
		},
		{
			provide: INFLUX_CLIENT,
			inject: [ConfigService],
			useFactory: (config: ConfigService) => {
				return new InfluxDB({
					url: config.get('INFLUX_URL') as string,
					token: config.get('INFLUX_TOKEN'),
				});
			},
		},
	],
	exports: [REDIS_CLIENT, INFLUX_CLIENT],
})
export class ConnectionModule { }

