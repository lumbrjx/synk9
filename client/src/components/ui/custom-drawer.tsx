"use client"
import { Button } from "@/components/ui/button"
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer"
import { CustomForm } from "./custom-form"
import { FC } from "react"
import { z } from "zod"

// Updated field configuration with type
type FieldConfig = {
	name: string
	label: string
	type: 'input' | 'select' | 'checkbox' | "rules"
	placeholder?: string
	description?: string
	options?: { value: string; label: string }[]
}

type CustomDrawerType = React.HTMLAttributes<HTMLElement> & {
	topic: string,
	drawerTitle: string,
	drawerDescription: string,
	formSchema: z.ZodObject<any>,
	defaultValues: any,
	formFields: FieldConfig[],
	onSubmit: (values: any) => void
}

export const CustomDrawer: FC<CustomDrawerType> = ({ ...props }) => {
	return (
		<Drawer>
			<DrawerTrigger asChild>
				<Button variant="outline" className="text-black">{props.topic}</Button>
			</DrawerTrigger>
			<DrawerContent>
				<div className="mx-auto w-full bg-primary max-w-sm font-lexend">
					<DrawerHeader >
						<DrawerTitle className="text-purple-200 text-4xl text-center">{props.drawerTitle}</DrawerTitle>
						<DrawerDescription className="text-center">{props.drawerDescription}</DrawerDescription>
					</DrawerHeader>
					<CustomForm
						formSchema={props.formSchema}
						defaultValues={props.defaultValues}
						fields={props.formFields}
						onSubmit={props.onSubmit}
					/>
					<DrawerFooter  >
						<DrawerClose asChild >
							<Button variant="outline" >Cancel</Button>
						</DrawerClose>
					</DrawerFooter>
				</div>
			</DrawerContent>
		</Drawer>
	)
}
