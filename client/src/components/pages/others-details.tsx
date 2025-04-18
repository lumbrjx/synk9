import { useParams } from 'react-router-dom';
import { useAxiosMutation } from "@/hooks/mutate";
import { z } from 'zod';
import { update } from '@/mutations/agent';
import { useAxiosQuery } from '@/hooks/get';
import { query } from '@/queries/agent';
import { useEffect, useState } from 'react';
import { CustomForm } from '../ui/custom-form';

const formSchema = z.object({
	name: z.string().min(2),
	description: z.string().min(2),
	plcId: z.string().min(2),
	locked: z.boolean().default(false),
});


export default function AgentDetails() {
	const { id } = useParams();

	const createMutation = useAxiosMutation({
		mutationFn: (data: z.infer<typeof formSchema>) =>
			update("/agent/" + id, data),
		options: {
			onSuccess: () => {
				console.log("Agent created!")
			},
			onError: (e) => console.log("err", e),
		},
	})

	const [defaultVal, setDefaultVal] = useState({
		name: "",
		description: "",
		plcId: "",
		locked: false
	});

	const {
		data: sensors,
		isLoading,
		isError,
		error,
		isFetching,
		status
	} = useAxiosQuery({
		queryKey: ['oneAgent'],
		queryFn: async () => {
			try {
				console.log("Fetching sensors...");
				const response = await query('/agent/' + id);
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
				plcId: sensors.plcId,
				locked: sensors.locked
			})
		}
		if (isError) {
			console.error("Error details:", error);
		}
	}, [status, isLoading, isFetching, sensors, isError, error]);

	const fields = [
		{ name: "name", label: "Label", placeholder: "my-agent", type: "input" as const },
		{ name: "description", label: "Description", placeholder: "very awesome agent", type: "input" as const },
		{ name: "plcId", label: "PLC ID", placeholder: "very awesome agent", type: "input" as const },
		{ name: "locked", label: "Locked", placeholder: "true", type: "checkbox" as const },
	];

	const onSubmit = (data: z.infer<typeof formSchema>) => {
		console.log(data)
		createMutation.mutate(data)
	}

	return (
		<div className='py-8 '>
			<div className='flex flex-row text-xl justify-around w-full p-4'>
				<CustomForm onSubmit={onSubmit} formSchema={formSchema} fields={fields} defaultValues={defaultVal} />
				{sensors && (
					<div className='ps-3 text-2xl flex flex-col gap-4 pt-2'>
						<p className='text-[#808191]'><span className='text-[#808191] font-medium'>Fingerprint:</span> {sensors.fingerprint}</p>
						<p className='text-[#808191]'><span className=' text-[#808191] font-medium'>Created At:</span> {sensors.createdAt}</p>
						<p className='text-[#808191]'><span className=' text-[#808191] font-medium'>Known:</span> {sensors.known ? "true" : "false"} </p>
						<p className='text-[#808191]'><span className=' text-[#808191] font-medium'>Status:</span> {sensors.status}</p>
					</div>
				)}

			</div>

		</div >
	);
}

