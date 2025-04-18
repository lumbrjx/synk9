"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RulesInput, SensorOption } from "./custom-adder"
import { useEffect } from "react"

// Enhanced field configuration with rules type and sensor options
type FieldConfig = {
	name: string
	label: string
	type: 'input' | 'select' | 'checkbox' | 'rules'
	placeholder?: string
	description?: string
	options?: { value: string; label: string }[] // For select fields
	sensorOptions?: SensorOption[] // For rules input - available sensors
}

type CustomFormProps = {
	formSchema: z.ZodObject<any>
	fields: FieldConfig[]
	defaultValues: any,
	onSubmit: (values: any) => void
}

export function CustomForm({ formSchema, defaultValues, fields, onSubmit }: CustomFormProps) {
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: defaultValues
	})
	const { reset, } = form;
	useEffect(() => {
		reset(defaultValues);
	}, [defaultValues, reset]);

	console.log("Form errors:", form.formState.errors)
	// Function to render the appropriate form control based on field type
	const renderFieldControl = (field: FieldConfig, formField: any) => {
		switch (field.type) {
			case 'select':
				return (
					<Select
						onValueChange={formField.onChange}
						defaultValue={formField.value}
					>
						<SelectTrigger className="text-purple-100 w-full">
							<SelectValue placeholder={field.placeholder} />
						</SelectTrigger>
						<SelectContent>
							{field.options?.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)
			case 'checkbox':
				return (
					<Checkbox
						checked={formField.value}
						onCheckedChange={formField.onChange}
						className="data-[state=checked]:bg-purple-200"
					/>
				)
			case 'rules':
				return (
					<>
						<RulesInput
							value={formField.value || []}
							onChange={formField.onChange}
							sensorOptions={field.sensorOptions || []}
						/>
					</>
				)
			case 'input':
			default:
				return (
					<Input
						className="text-purple-100"
						placeholder={field.placeholder}
						{...formField}
					/>
				)
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<div className="grid grid-cols-1 gap-6 max-h-96 overflow-y-auto p-2">
					{fields.map((field) => (
						<FormField
							key={field.name}
							control={form.control}
							name={field.name}
							render={({ field: formField }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="text-purple-100 text-lg">{field.label}</FormLabel>

									<FormControl>
										{renderFieldControl(field, formField)}
									</FormControl>
									{field.description && (
										<FormDescription className="text-sm text-purple-100/70">{field.description}</FormDescription>
									)}

									<FormMessage />
								</FormItem>
							)}
						/>
					))}
				</div>
				<div className="w-full flex justify-center mt-6">
					<Button type="submit" className="bg-purple-200 hover:bg-purple-300 w-88 text-black">Submit</Button>
				</div>
			</form>
		</Form>
	)
}
