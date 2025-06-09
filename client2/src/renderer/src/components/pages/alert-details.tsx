import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../ui/button'
import { useAxiosMutation } from '@/hooks/mutate'
import { z } from 'zod'
import { remove, update } from '@/mutations/agent'
import { useAxiosQuery } from '@/hooks/get'
import { query } from '@/queries/agent'
import { ReactElement, useEffect, useState } from 'react'
import { CustomForm } from '../ui/custom-form'
import { toast } from 'sonner'
import { queryClient } from '@/main'

const formSchema = z.object({
  name: z.string().min(2),
  message: z.string().min(2),
  rules: z.array(z.any()),
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

export default function AlertDetails(): ReactElement {
  const { id } = useParams()

  const createMutation = useAxiosMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => update('/alert-topic/' + id, data),
    options: {
      onSuccess: () => {
        toast.success('Sensor updated successfully!')
        queryClient.invalidateQueries({ queryKey: ['oneAlert'] })
      },
      onError: (e) => {
        console.error('Create error', e)
        toast.error('Failed to update sensor.')
      }
    }
  })
  const [defaultVal, setDefaultVal] = useState({
    name: '',
    message: '',
    rules: [] as any,
    agentId: '' as any,
    alertType: "normal" as any
  })

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
        console.log('Fetching sensors...')
        const response = await query('/alert-topic/' + id)
        const response3 = await query('/sensor');
        console.log('im topic', sensors)
        return { response, response3 }
      } catch (e) {
        console.error('Fetch error:', e)
        throw e
      }
    },
    options: {
      refetchOnWindowFocus: true,
      retry: 10
    }
  })

  const navigate = useNavigate()
  const deleteMutation = useAxiosMutation({
    mutationFn: () => remove('/alert-topic/' + id),
    options: {
      onSuccess: () => {
        toast.success('Topic deleted successfully!')
        queryClient.invalidateQueries({ queryKey: ['oneAlert'] })
        navigate('/alert-topic')
      },
      onError: (e) => {
        console.error('Create error', e)
        toast.error('Failed to delete sensor.')
      }
    }
  })

  useEffect(() => {
    console.log('Query status changed:', status)
    console.log('isLoading:', isLoading)
    console.log('isFetching:', isFetching)
    console.log('im sensor', sensors)
    if (sensors?.response) {
      console.log('im sensor new', sensors)
      const fixedRules = [] as { sensor_id: string, expectedValue: string }[];
      for (const alert of sensors.response.rules) {
        fixedRules.push({ sensor_id: alert.memoryAddress, expectedValue: alert.expectedValue })
      }
      setDefaultVal({
        name: sensors.response.name || '',
        message: sensors.response.message || '',
        alertType: sensors.response.alertType || '',
        agentId: sensors.response.agentId || '',
        rules: fixedRules || [],
      })
    }
    if (sensors?.response3) {
      const filtered = sensors.response3.map((sensor: any) => ({ value: sensor.id, label: sensor.name }));
      setDefaultValforRule(filtered);
    }
    if (isError) {
      console.error('Error details:', error)
    }
  }, [status, isLoading, isFetching, sensors, isError, error])

  const [defaultValForRule, setDefaultValforRule] = useState([]);
  const fields = [
    { name: 'name', label: 'Alert Topic name', placeholder: 'fire alarm', type: 'input' as const },
    {
      name: 'message',
      label: 'Alert Message',
      placeholder: "there's fire somewhere ",
      type: 'input' as const
    },
    {
      name: "rules",
      label: "Alert Triggers",
      placeholder: "512",
      type: "double-input" as const,
      sensorOptions: defaultValForRule, withVal: true
    },
    {
      name: "alertType",
      label: "Alert Type",
      placeholder: "alert",
      type: "select" as const,
      options: alertType
    }
  ]
  const onDelete = (): void => {
    deleteMutation.mutate()
  }
  const onSubmit = (data: z.infer<typeof formSchema>): void => {
    console.log(data)
    createMutation.mutate(data)
  }

  return (
    <div className="py-8 bg-gray-900 min-h-screen">
      <div className="flex flex-row text-xl justify-start w-full p-6 gap-6">
        {/* Card 1: Sensor Configuration */}
        <div className="w-1/2 p-6 bg-gray-800 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-2 text-white">Sensor Configuration</h2>
          <p className="text-sm text-gray-400 mb-6">Update the sensor details below.</p>
          <CustomForm
            onSubmit={onSubmit}
            formSchema={formSchema}
            fields={fields}
            defaultValues={defaultVal}
          />
        </div>
        {/* Card 2: Sensor Information */}
        {sensors && (
          <div className="w-1/3 p-6 bg-gray-800 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-2 text-white">Sensor Information</h2>
            <p className="text-sm text-gray-400 mb-6">Additional details about the sensor.</p>
            <div className="flex flex-col gap-4 pt-2">
              <p className="text-sm text-gray-400">
                <span className="font-medium text-gray-300">Created At:</span>{' '}
                {new Date(sensors.response.createdAt).toLocaleString()}
              </p>
              <p className="text-sm text-gray-400">
                <span className="font-medium text-gray-300">Status:</span> {sensors.response.status}
              </p>

              <Button
                onClick={onDelete}
                variant="destructive"
                className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white"
              >
                Remove Sensor
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
