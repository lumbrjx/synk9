import { Entity, PrimaryGeneratedColumn, Column, OneToMany, DeleteDateColumn } from 'typeorm';
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

	@Column()
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

	@Column()
	plcId: string;

	@DeleteDateColumn()
	deletedAt?: Date;

	@OneToMany(() => Process, process => process.agent)
	processes: Process[];
}

