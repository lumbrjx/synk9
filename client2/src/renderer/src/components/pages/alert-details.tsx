import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../ui/button';
import { useAxiosMutation } from "@/hooks/mutate";
import { z } from 'zod';
import { remove, update } from '@/mutations/agent';
import { useAxiosQuery } from '@/hooks/get';
import { query } from '@/queries/agent';
import { useEffect, useState } from 'react';
import { CustomForm } from '../ui/custom-form';
import { toast } from 'sonner';
import { queryClient } from '@/main';

const formSchema = z.object({
  name: z.string().min(2),
  message: z.string().min(2),
  rules: z.array(z.any()),
  expectedValue: z.coerce.number(),
  agentId: z.string().min(2),
  alertType: z.enum(['normal',
    'scheduled',
    'offline',
    "incident",
    "breakdown"
  ])
})
const alertType = [

  { value: "normal", label: "normal" },
  { value: 'scheduled', label: 'scheduled' },
  { value: 'offline', label: 'offline' },
  { value: "incident", label: "incident" },
  { value: "breakdown", label: "breakdown" },

]

export default function AlertDetails() {
  const { id } = useParams();
  const createMutation = useAxiosMutation({
    mutationFn: (data: z.infer<typeof formSchema>) =>
      update("/alert-topic/" + id, data),
    options: {
      onSuccess: () => {
        toast.success("Sensor updated successfully!");
        queryClient.invalidateQueries({ queryKey: ['oneAlert'] });
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
    queryKey: ['oneAlert'],
    queryFn: async () => {
      try {
        console.log("Fetching sensors...");
        const response = await query('/alert-topic/' + id);
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

  const navigate = useNavigate();
  const deleteMutation = useAxiosMutation({
    mutationFn: () =>
      remove("/alert-topic/" + id),
    options: {
      onSuccess: () => {
        toast.success("Sensor deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ['oneAlert'] });
        navigate("/alert-topic");
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
    { name: "name", label: "Label", placeholder: "my-sensor", type: "input" as const },
    { name: "message", label: "Message to display", placeholder: "very awesome sensor", type: "input" as const },
    { name: "rules", label: "Alert Triggers", placeholder: "512", type: "double-input" as const, withVal: true },
    { name: "alertType", label: "Alert Type", placeholder: "alert", type: "select" as const, options: alertType },
  ]
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

