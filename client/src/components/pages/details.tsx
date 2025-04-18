import { useParams } from 'react-router-dom';
import { useAxiosMutation } from "@/hooks/mutate";
import FlowCanvas from '../ui/flows';
import { CustomDrawer } from '../ui/custom-drawer';
import { z } from 'zod';
import { create } from '@/mutations/agent';

const formSchema = z.object({
	name: z.string().min(2),
	description: z.string().min(2),
	processId: z.string().min(2),
	rules: z.array(z.object({
		sensorId: z.string().min(2),
		final_value: z.number().nullish()
	})),
})
const fields = [
	{ name: "name", label: "Label", placeholder: "my-agent" },
	{ name: "description", label: "Description", placeholder: "very awesome agent" },
	{ name: "rules", label: "rules", placeholder: "aASDV34ETWHvaxz" },
]

export default function Details() {
	const { id } = useParams();

	const defaultValues = { name: "", description: "", processId: id, rules: [{ sensorId: '', final_value: 0 }] };
	const createMutation = useAxiosMutation({
		mutationFn: (data: z.infer<typeof formSchema>) =>
			create("/process/step", data),
		options: {
			onSuccess: () => {
				console.log("Agent created!")
			},
			onError: (e) => console.log("err", e),
		},
	})

	const onSubmit = (data: z.infer<typeof formSchema>) => {
		console.log(data)
		createMutation.mutate(data)
	}

	// Then in <ReactFlow />:
	return (
		<div className='flex justify-between'>
			{/* Main Content */}
			<div className='flex flex-col justify-between w-full p-4'>

				<FlowCanvas />
				<div className='text-white'>

					HMI  for {id}
				</div>

			</div>

			{/* Sidebar */}
			<div className='py-11 flex flex-col justify-between w-1/4 bg-[#1b1b1d] p-4 text-white h-screen'>
				<h2 className='text-xl mb-4'>Sidebar</h2>

				<p>Some sidebar content here.</p>
				<CustomDrawer
					formSchema={formSchema}
					formFields={fields}
					defaultValues={defaultValues}
					onSubmit={(d: any) => onSubmit(d)}
					drawerDescription="Add a new process step to the system."
					drawerTitle="Add New Process Step"
					topic="Add Process Step" />
			</div>
		</div >
	);
}

