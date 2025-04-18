import { useParams } from 'react-router-dom';
import { useAxiosMutation } from "@/hooks/mutate";
import FlowCanvas from '../ui/flows';
import { CustomDrawer } from '../ui/custom-drawer';
import { z } from 'zod';
import { create } from '@/mutations/agent';
import { useAxiosQuery } from '@/hooks/get';
import { query } from '@/queries/agent';
import { useEffect, useState } from 'react';

const formSchema = z.object({
	name: z.string().min(2),
	description: z.string().min(2),
	processId: z.string().min(2),
	from: z.string().optional().nullable(),
	to: z.string().optional().nullable(),
	rules: z.array(
		z.object({
			sensor_id: z.string().nonempty("Sensor is required"),
			final_value: z.number().min(1, "Final value must be greater than 0")
		})
	).min(1, "At least one rule is required")
});


export default function Details() {
	const { id } = useParams();

	const defaultValues = {
		name: "",
		description: "",
		processId: id,
		from: null,
		to: null,
		rules: [{ sensor_id: '', final_value: 0 }]
	};
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

	const [step, setStep] = useState([]);
	const [sideView, setStepSideView] = useState(null);
	const [flowStep, setFlowStep] = useState([]);
	const [availableSensors, setAvailableSensors] = useState([]);



	const {
		data: steps,
		isLoading,
		isError,
		error,
		isFetching,
		status
	} = useAxiosQuery({
		queryKey: ['steps'],
		queryFn: async () => {
			try {
				console.log("Fetching agents...");
				const response = await query('/process/step/' + id);
				const response2 = await query('/sensor');
				console.log("Fetch response:", response);
				return { response: response, response2: response2 };
			} catch (e) {
				console.error("Fetch error:", e);
				throw e;
			}
		},
		options: {
			refetchOnWindowFocus: false,
			retry: 2,
		}
	});
	useEffect(() => {
		console.log("Query status changed:", status);
		console.log("isLoading:", isLoading);
		console.log("isFetching:", isFetching);
		if (steps && steps.response) {
			console.log("steps", steps.response);
			const filtered = steps.response.map((step: any) => { return { value:step.id, label: step.name } })
			setStep(filtered)
			setFlowStep(steps.response)
		}
		if (steps && steps.response2) {
			console.log("sensors", steps.response2);
			const filtered = steps.response2.map((sensor: any) => { return { value: sensor.id, label: sensor.name } })
			setAvailableSensors(filtered)
		}
		if (isError) {
			console.error("Error details:", error);
		}
	}, [status, isLoading, isFetching, steps?.response2,steps?.response, isError, error]);

	const fields = [
		{ name: "name", label: "Label", placeholder: "my-agent", type: "input" as const },
		{ name: "description", label: "Description", placeholder: "very awesome agent", type: "input" as const },
		{
			name: "rules", label: "Rules", placeholder: "", type: "rules" as const,
			maxHeight: "150px", sensorOptions: availableSensors || []
		},
		{
			name: "from", label: "From", placeholder: "None (first step)", type: "select" as const,
			options: step || []
		},
		{
			name: "to", label: "To", placeholder: "None (last step)", type: "select" as const,
			options: step || []
		},
	];

	const onSubmit = (data: z.infer<typeof formSchema>) => {
		console.log(data)
		createMutation.mutate(data)
	}

	return (
		<div className='flex justify-between'>
			{/* Main Content */}
			<div className='flex flex-col justify-between w-full p-4'>

				<FlowCanvas steps={flowStep} setStepSideView={setStepSideView} />
				<div className='text-white'>

					HMI  for {id}
				</div>

			</div>

			{/* Sidebar */}
			<div className='py-11 flex flex-col justify-between w-1/4 bg-[#1b1b1d] p-4 text-white h-screen'>
				<h2 className='text-xl mb-4'>Sidebar</h2>

				<p>{sideView?.label}</p>
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

