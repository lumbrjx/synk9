import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn, CreateDateColumn, DeleteDateColumn } from 'typeorm';
import { ProcessStep } from './process-steps.entity';
import { Agent } from './agent.entity';

export enum ProcessState {
	running = 'running',
	stopped = 'stopped',
}

@Entity()
export class Process {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column()
	name: string;

	@Column()
	description: string;

	@Column({
		type: 'enum',
		enum: ProcessState,
		default: ProcessState.stopped,
	})
	status: ProcessState;

	@CreateDateColumn({ type: 'timestamp' })
	createdAt: Date;

	@OneToMany(() => ProcessStep, step => step.process, { cascade: true })
	steps: ProcessStep[];

	@ManyToOne(() => Agent, agent => agent.processes, { nullable: false, onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'agentId' })
	agent: Agent

	@Column({
		type: "json",
		default: null
	})
	flow: any
	@DeleteDateColumn({ type: 'timestamp', nullable: true })
	deletedAt?: Date;

}

