import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Sensor } from './sensor.entity';
import { ProcessStep } from './process-steps.entity';

@Entity()
export class Rule {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@ManyToOne(() => Sensor, { eager: true })
	sensor: Sensor;

	@CreateDateColumn({ type: 'timestamp' })
	createdAt: Date;

	@Column()
	expectedValue: number;

	@ManyToOne(() => ProcessStep, step => step.rules, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'id' })
	step: ProcessStep;
}

