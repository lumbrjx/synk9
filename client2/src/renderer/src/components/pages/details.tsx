import { useParams } from 'react-router-dom';
import { Button } from '../ui/button';
import { useAxiosMutation } from "@/hooks/mutate";
import FlowCanvas from '../ui/flows';
import { CustomDrawer } from '../ui/custom-drawer';
import { z } from 'zod';
import { remove, create } from '@/mutations/agent';
import { useAxiosQuery } from '@/hooks/get';
import { query } from '@/queries/agent';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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
				toast.success("Process step created successfully!");
			},
			onError: (e) => {
				console.error("Create error", e);
				toast.error("Failed to create process step.");
			}
		}
	});

	const deleteMutation = useAxiosMutation({
		mutationFn: () =>
			remove("/agent/" + id),
		options: {
			onSuccess: () => {
				toast.success("Process step removed successfully!");
			},
			onError: (e) => {
				console.error("Create error", e);
				toast.error("Failed to remove process step.");
			}
		}
	});

	const onSubmit = (data: z.infer<typeof formSchema>) => {
		console.log(data);
		createMutation.mutate(data);
	};

	const onDelete = () => {
		deleteMutation.mutate();
	};

	const [step, setStep] = useState([]);
	const [sideView, setStepSideView] = useState(null);
	const [flowStep, setFlowStep] = useState([]);
	const [availableSensors, setAvailableSensors] = useState([]);
	const [isRunning, setIsRunning] = useState(false); // <-- NEW STATE

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
				return { response, response2 };
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

		if (steps?.response) {
			const filtered = steps.response.map((step: any) => ({ value: step.id, label: step.name }));
			setStep(filtered);
			setFlowStep(steps.response);
		}
		if (steps?.response2) {
			const filtered = steps.response2.map((sensor: any) => ({ value: sensor.id, label: sensor.name }));
			setAvailableSensors(filtered);
		}
		if (isError) {
			console.error("Error details:", error);
		}
	}, [status, isLoading, isFetching, steps?.response2, steps?.response, isError, error]);

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

	const handleStart = () => {
		setIsRunning(true);
		console.log("Process started");
		// Optionally call an API to start the process
	};

	const handlePause = () => {
		setIsRunning(false);
		console.log("Process paused");
		// Optionally call an API to pause the process
	};

	return (
		<div className='flex justify-between'>
			{/* Main Content */}
			<div className='flex flex-col justify-between w-full p-4'>
				<FlowCanvas steps={flowStep} setStepSideView={setStepSideView} />
				<div className='text-white'>
					HMI for {id}
				</div>
			</div>

			{/* Sidebar */}
			<div className='py-11 flex flex-col justify-between w-1/4 bg-[#1b1b1d] p-4 text-white h-screen'>
				<h2 className='text-xl mb-4'>Sidebar</h2>
				<p>{sideView?.label}</p>

				<div className="w-full flex flex-col gap-4">
					<CustomDrawer
						formSchema={formSchema}
						formFields={fields}
						defaultValues={defaultValues}
						onSubmit={(d: any) => onSubmit(d)}
						drawerDescription="Add a new process step to the system."
						drawerTitle="Add New Process Step"
						topic="Add Process Step"
					/>

					{isRunning ? (
						<Button
							onClick={handlePause}
							className="bg-yellow-300 hover:bg-yellow-200 w-88 text-black"
						>
							Pause Process
						</Button>
					) : (
						<Button
							onClick={handleStart}
							className="bg-green-300 hover:bg-green-200 w-88 text-black"
						>
							Start Process
						</Button>
					)}

					<Button
						onClick={onDelete}
						className="bg-red-300 hover:bg-red-200 w-88 text-black"
						disabled={isRunning}
					>
						Remove Process
					</Button>
				</div>
			</div>
		</div>
	);
}

