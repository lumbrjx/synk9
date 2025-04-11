import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { ProcessStep } from './process-steps.entity';
import { Agent } from './agent.entity';

@Entity()
export class Process {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column()
	name: string;

	@Column()
	description: string;

	@Column()
	createdAt: Date;

	@Column("text", { array: true })
	label: string[];

	@OneToMany(() => ProcessStep, step => step.process, { cascade: true })
	steps: ProcessStep[];

	@ManyToOne(() => Agent, agent => agent.processes, { nullable: false, onDelete: 'RESTRICT' })
	@JoinColumn({ name: 'agentId' })
	agent: Agent
}

