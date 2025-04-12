import { Entity, PrimaryGeneratedColumn, Column, OneToMany, DeleteDateColumn, CreateDateColumn } from 'typeorm';
import { Process } from './process.entity';

export enum AgentState {
	ready = 'ready',
	busy = 'busy',
	offline = 'offline',
}

@Entity()
export class Agent {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column({ nullable: false })
	name: string;

	@Column({ nullable: true })
	description: string;

	@Column({ nullable: false })
	fingerprint: string;

	@Column({
		type: 'enum',
		enum: AgentState,
		default: AgentState.offline,
	})
	status: AgentState;

	@Column({ default: false })
	known: boolean;

	@Column({ default: false })
	locked: boolean;

	@Column({ nullable: false })
	plcId: string;

	@DeleteDateColumn()
	deletedAt?: Date;

	@CreateDateColumn({ type: 'timestamp' })
	createdAt: Date;

	@OneToMany(() => Process, process => process.agent)
	processes: Process[];
}

