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

const formSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(2),
  start_register: z.coerce.number(),
  end_register: z.coerce.number(),
  agentId:z.string().min(2),
})


const defaultValues = { name: "", description: "", start_register: 0, end_register: 0 };

export default function Sensors() {
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
  const {
    data: agents,
    isLoading,
    isError,
    error,
    isFetching,
    status
  } = useAxiosQuery({
    queryKey: ['sensors'],
    queryFn: async () => {
      try {
        console.log("Fetching agents...");
        const response = await query('/sensor');
        const response2 = await query('/agent');
        console.log("Fetch response:", response);
        return {response, response2};
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
      create("/sensor", data),

    options: {
      onSuccess: () => {
        toast.success("Sensor created successfully!");
      },
      onError: (e) => {
        console.error("Create error", e);
        toast.error("Failed to create sensor.");
      }
    },
  })
  const [defaultVal, setDefaultVal] = useState([]);
  const fields = [
    { name: "name", label: "Label", placeholder: "my-sensor", type: "input" as const },
    { name: "description", label: "Description", placeholder: "very awesome sensor", type: "input" as const },
    { name: "start_register", label: "Start Reg", placeholder: "512", type: "input-number" as const },
    { name: "end_register", label: "End Reg", placeholder: "42", type: "input-number" as const },
    { name: "agentId", label: "Pick an Agent", placeholder: "agent", type: "select" as const, options: defaultVal || [] },
  ]
  useEffect(() => {
    console.log("Query status changed:", status);
    console.log("isLoading:", isLoading);
    console.log("isFetching:", isFetching);
    if (agents?.response2) {
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
              route="sensor/details"
              columns={columns}
              data={agents?.response || []}
            />
          )}
        </div>
      </div>

    </div>
  );
}
