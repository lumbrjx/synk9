import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
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


	@ManyToOne(() => Process, process => process.steps, { onDelete: 'CASCADE' })
	process: Process;

	@OneToMany(() => Rule, rule => rule.step, { cascade: true })
	rules: Rule[];
}

