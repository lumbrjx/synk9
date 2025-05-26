import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAxiosMutation } from "@/hooks/mutate";
import { z } from 'zod';
import { remove, create } from '@/mutations/agent';
import { useAxiosQuery } from '@/hooks/get';
import { query } from '@/queries/agent';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { queryClient } from '@/main';
import { ReactFlowProvider } from 'reactflow';
import { ScadaFlowBuilder } from '../ui/flow';

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

        queryClient.invalidateQueries({ queryKey: ['steps'] });
      },
      onError: (e) => {
        console.error("Create error", e);
        toast.error("Failed to create process step.");
      }
    }
  });

  const navigate = useNavigate();
  const deleteMutation = useAxiosMutation({
    mutationFn: () =>
      remove("/process/" + id),
    options: {
      onSuccess: () => {
        toast.success("Process removed successfully!");
        queryClient.invalidateQueries({ queryKey: ['steps'] });
        navigate("/processes")
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

  const [proc, setProc] = useState();
  const [availableSensors, setAvailableSensors] = useState([]);
  const [isRunning, setIsRunning] = useState(false); // <-- NEW STATE
  console.log("imrunninnngng", isRunning);

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
        const response2 = await query('/sensor/process/' + id);
        const response3 = await query('/process/' + id);
        console.log("Fetch response:", response2);
        return {  response2, response3 };
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
    if (steps?.response3) {
      const state = steps.response3.status === "running";
      setIsRunning(state)
      setProc(steps.response3);
    }
    if (steps?.response2) {
      const filtered = steps.response2.map((sensor: any) => ({ value: sensor.id, label: sensor.name }));
      console.log("im the champ")
      setAvailableSensors(filtered);
    }
    if (isError) {
      console.error("Error details:", error);
    }
  }, [status, isLoading, isFetching, steps?.response2, steps?.response, isError, error]);

  const fields = [
    {
      name: "rules", label: "Rules", placeholder: "", type: "rules" as const,
      maxHeight: "150px", sensorOptions: availableSensors || []
    },
  ];




  return (
    <div className='flex justify-between'>
      {/* Main Content */}
      <div className='flex flex-col justify-between w-full p-4'>

        <ReactFlowProvider>
          <ScadaFlowBuilder
            formSchema={formSchema}
            formFields={fields}
            defaultValues={defaultValues}
            onSubmit={(d: any) => onSubmit(d)}
            drawerDescription="Add a new process step to the system."
            drawerTitle="Add New Process Step"
            buttonDisabled={isRunning}
            setIsRunning={(d) => setIsRunning(d)}
            onDelete={() => onDelete()}
            topic="Add Process Step"
            pageId={id}
            sensorOpt={availableSensors}
          />
        </ReactFlowProvider>

        <div className='text-white'>
          HMI for {id}
        </div>
      </div>

    </div>
  );
}

