import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../ui/data-table";
import { CustomDrawer } from "../ui/custom-drawer";
import { z } from "zod";
import { useAxiosMutation } from "@/hooks/mutate";
import { create } from "@/mutations/agent";
import { useAxiosQuery } from "@/hooks/get";
import { query } from "@/queries/agent";
import { useEffect } from "react";
import { toast } from "sonner";
import { queryClient } from "@/main";

const formSchema = z.object({
	name: z.string().min(2),
	description: z.string().min(2),
	plcId: z.string().min(2),
	fingerprint: z.string().min(2),
})

const fields = [
	{ name: "name", label: "Label", placeholder: "my-agent", type: "input" as const },
	{ name: "description", label: "Description", placeholder: "very awesome agent", type: "input" as const },
	{ name: "plcId", label: "PLC Id", placeholder: "plc7x12ll", type: "input" as const },
	{ name: "fingerprint", label: "fingerprint", placeholder: "aASDV34ETWHvaxz", type: "input" as const },
]
const defaultValues = { name: "", description: "", plcId: '', fingerprint: "" };

export default function Agents() {
	type Payment = {
		id: string
		plcId: number
		status: "pending" | "processing" | "success" | "failed"
		label: string
	}
	const columns: ColumnDef<Payment>[] = [
		{
			accessorKey: "id",
			header: "ID",
		},
		{
			accessorKey: "name",
			header: "Label",
		},
		{
			accessorKey: "status",
			header: "status",
		},
		{
			accessorKey: "plcId",
			header: "PLC Id",
		}
	]
	const {
		data: agents,
		isLoading,
		isError,
		error,
		isFetching,
		status
	} = useAxiosQuery({
		queryKey: ['agents'],
		queryFn: async () => {
			try {
				console.log("Fetching agents...");
				const response = await query('/agent');
				console.log("Fetch response:", response);
				return response;
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
	const createMutation = useAxiosMutation({
		mutationFn: (data: z.infer<typeof formSchema>) =>
			create("/agent", data),
		options: {
			onSuccess: () => {
				toast.success("Agent created successfully!");
				queryClient.invalidateQueries({ queryKey: ['agents'] });
			},
			onError: (e) => {
				console.error("Create error", e);
				toast.error("Failed to create agent.");
			}
		},
	})

	useEffect(() => {
		console.log("Query status changed:", status);
		console.log("isLoading:", isLoading);
		console.log("isFetching:", isFetching);
		if (agents) {
			console.log("Agents data:", agents);
		}
		if (isError) {
			console.error("Error details:", error);
		}
	}, [status, isLoading, isFetching, agents, isError, error]);
	const onSubmit = (data: z.infer<typeof formSchema>) => {
		console.log(data)
		createMutation.mutate(data)
	}


	return (
		<div>
			<h1 className="text-3xl py-8 ps-12 font-bold">Agents</h1>
			<div className="flex flex-col">

				<div className="flex w-full justify-end mt-10 pe-12">
					<CustomDrawer
						formSchema={formSchema}
						formFields={fields}
						defaultValues={defaultValues}
						onSubmit={(d: any) => onSubmit(d)}
						drawerDescription="Add a new agent to the system."
						drawerTitle="Add New Agent"
						topic="Add Agent" />
				</div>

				<div className="w-screen container mx-auto py-10">
					{isLoading ? (
						<div className="text-center py-4">Loading agents...</div>
					) : isError ? (
						<div className="text-center text-red-500 py-4">
							Error loading agents. Please try again.
						</div>
					) : (
						<DataTable
							route="agent/details"
							columns={columns}
							data={agents || []}
						/>
					)}
				</div>
			</div>

		</div>
	);
}
