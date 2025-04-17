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
import { DrawerClose } from "./drawer"

type FieldConfig = {
	name: string
	label: string
	placeholder?: string
	description?: string
}

type CustomFormProps = {
	formSchema: z.ZodObject<any>
	fields: FieldConfig[]
	defaultValues: any,
	onSubmit: (values: any) => void
}

export function CustomForm({  formSchema, defaultValues, fields, onSubmit }: CustomFormProps) {
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: defaultValues
	})

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
			>
				<div className="grid text-2xl grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
					{fields.map((field) => (
						<FormField
							key={field.name}
							control={form.control}
							name={field.name}
							render={({ field: formField }) => (
								<FormItem className="flex flex-col">
									<FormLabel className="text-purple-100">{field.label}</FormLabel>
									<FormControl >
										{<Input className="text-purple-100" placeholder={field.placeholder} {...formField} />}
									</FormControl>
									{field.description && (
										<FormDescription>{field.description}</FormDescription>
									)}
									<FormMessage />
								</FormItem>
							)}
						/>
					))}
				</div>

				<DrawerClose asChild>
					<div className="w-full flex justify-center mt-15">
						<Button type="submit" className="bg-purple-200 hover:bg-purple-300 w-88 text-black">Submit</Button>
					</div>
				</DrawerClose>
			</form>
		</Form >
	)
}

