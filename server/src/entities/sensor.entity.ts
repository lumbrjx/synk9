import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	DeleteDateColumn,
	ManyToOne,
	JoinColumn,
} from 'typeorm';
import { Agent } from './agent.entity';

@Entity()
export class Sensor {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column()
	name: string;

	@CreateDateColumn({ type: 'timestamp' })
	createdAt: Date;

	@Column({ nullable: true })
	description: string;

	@Column()
	register: string;

	@Column()
	start_register: number;

	@Column()
	end_register: number;

	@DeleteDateColumn({ type: 'timestamp', nullable: true })
	deletedAt?: Date;

	@ManyToOne(() => Agent, agent => agent.sensors, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'agentId' })
	agent: Agent;

	@Column()
	agentId: string; // Foreign key
}

