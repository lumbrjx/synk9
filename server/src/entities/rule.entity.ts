import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Sensor } from './sensor.entity';
import { ProcessStep } from './process-steps.entity';

@Entity()
export class Rule {
	@PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Sensor, { eager: true })
  sensor: Sensor;

  @Column('text') 
  expectedValue: string;

  @ManyToOne(() => ProcessStep, step => step.rules, { onDelete: 'CASCADE' })
  step: ProcessStep;
}

