import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../ui/data-table";
import { CustomDrawer } from "../ui/custom-drawer";
import { z } from "zod";
import { useAxiosMutation } from "@/hooks/mutate";
import { create } from "@/mutations/agent";
import { useAxiosQuery } from "@/hooks/get";
import { query } from "@/queries/agent";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { queryClient } from "@/main";

const formSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(2),
  agentId: z.string().min(2),
})


const defaultValues = { name: "", description: "", agentId: '' };

export default function Processes() {
  type Payment = {
    id: string
    plcId: number
    status: "pending" | "processing" | "success" | "failed"
    label: string
  }
  const columns: ColumnDef<Payment>[] = [

    {
      accessorKey: "name",
      header: "Label",
    },
    {
      accessorKey: "status",
      header: "status",
    },
    {
      accessorKey: "id",
      header: "Id",
    },
  ]
  const [defaultVal, setDefaultVal] = useState([]);
  const {
    data: agents,
    isLoading,
    isError,
    error,
    isFetching,
    status
  } = useAxiosQuery({
    queryKey: ['processes'],
    queryFn: async () => {
      try {
        console.log("Fetching agents...");
        const response = await query('/process');
        const response2 = await query("/agent")
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
  const createMutation = useAxiosMutation({
    mutationFn: (data: z.infer<typeof formSchema>) =>
      create("/process", data),
    options: {
      onSuccess: () => {
        toast.success("Process created successfully!");
				queryClient.invalidateQueries({ queryKey: ['processes'] });
      },
      onError: (e) => {
        console.error("Create error", e);
        toast.error("Process to create agent.");
      }
    },
  })

  useEffect(() => {
    console.log("Query status changed:", status);
    console.log("isLoading:", isLoading);
    console.log("isFetching:", isFetching);
    if (agents) {
      const filtered = agents.response2.map((sensor: any) => ({ value: sensor.id, label: sensor.name }));
      setDefaultVal(filtered);
    }
    if (isError) {
      console.error("Error details:", error);
    }
  }, [status, isLoading, isFetching, agents, isError, error]);
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log(data)
    createMutation.mutate(data)
  }
  const fields = [
    { name: "name", label: "Label", placeholder: "my-process", type: "input" as const },
    { name: "description", label: "Description", placeholder: "very awesome process", type: "input" as const },
    { name: "agentId", label: "Pick an Agent", placeholder: "agent", type: "select" as const, options: defaultVal || [] },
  ]

  return (
    <div>
      <h1 className="text-3xl  py-8 ps-12 font-bold">Processes</h1>
      <div className="flex flex-col">

        <div className="flex justify-end mt-10 w-full pe-12">
          <CustomDrawer
            formSchema={formSchema}
            formFields={fields}
            defaultValues={defaultValues}
            onSubmit={(d: any) => onSubmit(d)}
            drawerDescription="Add a new process to the system."
            drawerTitle="Add New Process"
            topic="Add Process" />
        </div>

        <div className="w-screen container mx-auto py-10">
          {isLoading ? (
            <div className="text-center py-4">Loading processes...</div>
          ) : isError ? (
            <div className="text-center text-red-500 py-4">
              Error loading processes. Please try again.
            </div>
          ) : (
            <DataTable
              route="details"
              columns={columns}
              data={agents?.response || []}
            />
          )}
        </div>
      </div>

    </div>
  );
}
