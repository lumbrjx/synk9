import { useParams } from 'react-router-dom';
import { Button } from '../ui/button';
import { useAxiosMutation } from "@/hooks/mutate";
import { z } from 'zod';
import { remove, update } from '@/mutations/agent';
import { useAxiosQuery } from '@/hooks/get';
import { query } from '@/queries/agent';
import { useEffect, useState } from 'react';
import { CustomForm } from '../ui/custom-form';
import { toast } from 'sonner';

const formSchema = z.object({
	name: z.string().min(2),
	description: z.string().min(2),
	start_register: z.coerce.number(),
  end_register: z.coerce.number(),
});


export default function SensorDetails() {
	const { id } = useParams();

	const createMutation = useAxiosMutation({
		mutationFn: (data: z.infer<typeof formSchema>) =>
			update("/sensor/" + id, data),
		options: {
			onSuccess: () => {
				toast.success("Sensor updated successfully!");
			},
			onError: (e) => {
				console.error("Create error", e);
				toast.error("Failed to update sensor.");
			}
		},
	})
	const [defaultVal, setDefaultVal] = useState({
		name: "",
		description: "",
		start_register: 0,
		end_register: 0
	});

	const {
		data: sensors,
		isLoading,
		isError,
		error,
		isFetching,
		status
	} = useAxiosQuery({
		queryKey: ['oneSensor'],
		queryFn: async () => {
			try {
				console.log("Fetching sensors...");
				const response = await query('/sensor/' + id);
				console.log("im sensor", sensors)
				return response;
			} catch (e) {
				console.error("Fetch error:", e);
				throw e;
			}
		},
		options: {
			refetchOnWindowFocus: true,
			retry: 10,
		}
	});
	const deleteMutation = useAxiosMutation({
		mutationFn: () =>
			remove("/sensor/" + id),
		options: {
			onSuccess: () => {
				toast.success("Sensor deleted successfully!");
			},
			onError: (e) => {
				console.error("Create error", e);
				toast.error("Failed to delete sensor.");
			}
		},
	})

	useEffect(() => {
		console.log("Query status changed:", status);
		console.log("isLoading:", isLoading);
		console.log("isFetching:", isFetching);
		console.log("im sensor", sensors)
		if (sensors) {
			console.log("im sensor new", sensors)
			setDefaultVal({
				name: sensors.name,
				description: sensors.description,
				start_register: sensors.start_register,
				end_register: sensors.end_register
			})
		}
		if (isError) {
			console.error("Error details:", error);
		}
	}, [status, isLoading, isFetching, sensors, isError, error]);

	const fields = [
		{ name: "name", label: "Label", placeholder: "my-agent", type: "input" as const },
		{ name: "description", label: "Description", placeholder: "very awesome agent", type: "input" as const },
		{ name: "start_register", label: "Start Reg", placeholder: "very awesome agent", type: "input-number" as const },
		{ name: "end_register", label: "End Reg", placeholder: "true", type: "input-number" as const },
	];
	const onDelete = () => {
		deleteMutation.mutate()
	}
	const onSubmit = (data: z.infer<typeof formSchema>) => {
		console.log(data)
		createMutation.mutate(data)
	}

	return (
		<div className='py-8 '>
			<div className='flex flex-row text-xl justify-around w-full p-4'>
				<CustomForm onSubmit={onSubmit} formSchema={formSchema} fields={fields} defaultValues={defaultVal} />
				{sensors && <div className='ps-3 text-2xl flex flex-col gap-4 pt-2'>
					<p className='text-[#808191]'><span className=' text-[#808191] font-medium'>Created At:</span> {sensors.createdAt}</p>
					<p className='text-[#808191]'><span className=' text-[#808191] font-medium'>Status:</span> {sensors.status}</p>

					<Button onClick={onDelete} className="bg-red-300 hover:bg-red-200 w-88 text-black">Remove Sensor</Button>
				</div>}
			</div>

		</div >
	);
}

