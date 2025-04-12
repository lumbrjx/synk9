import { Module } from '@nestjs/common';
import { SensorService } from './sensor.service';
import { SensorController } from './sensor.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sensor } from 'src/entities';

@Module({
	imports: [TypeOrmModule.forFeature([Sensor]) ],
  controllers: [SensorController],
  providers: [SensorService],
})
export class SensorModule {}
