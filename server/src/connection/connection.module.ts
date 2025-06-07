import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { INFLUX_CLIENT, REDIS_CLIENT } from './constants';
import { InfluxDB } from '@influxdata/influxdb-client';
import * as path from 'path';
import { BullModule } from '@nestjs/bullmq';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		BullModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				connection: {
					host: config.get("REDIS_HOST"),
					port: config.get("REDIS_PORT"),
					password: config.get("REDIS_PASSWORD"),
				}
			})
		}),
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
				entities:
					[path.join(__dirname, '../**/*.entity.{ts,js}')],
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
					password: config.get('REDIS_PASSWORD'),
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
					token: config.get('INFLUXDB_TOKEN'),
				});
			},
		},
	],
	exports: [REDIS_CLIENT, INFLUX_CLIENT],
})
export class ConnectionModule { }

