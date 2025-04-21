import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, DeleteDateColumn } from 'typeorm';
import { Process } from './process.entity';
import { Rule } from './rule.entity';

@Entity()
export class ProcessStep {
	@PrimaryGeneratedColumn("uuid")
	id: string;

	@Column()
	name: string;

	@Column()
	description: string;

	@Column({ default: false })
	skip: boolean;

	@CreateDateColumn({ type: 'timestamp' })
	createdAt: Date;

	@DeleteDateColumn({ type: 'timestamp', nullable: true })
	deletedAt?: Date;

	@ManyToOne(() => ProcessStep, { onDelete: 'CASCADE', nullable: true })
	from: ProcessStep;

	@ManyToOne(() => ProcessStep, { onDelete: 'CASCADE', nullable: true })
	to: ProcessStep;

	@ManyToOne(() => Process, process => process.steps, { onDelete: 'CASCADE' })
	process: Process;

	@OneToMany(() => Rule, rule => rule.step, { cascade: true })
	rules: Rule[];
}

