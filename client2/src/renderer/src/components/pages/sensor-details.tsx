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
  description: z.string().min(2),
  register: z.string().min(1),
  agentId: z.string().min(1)
})

export default function SensorDetails(): ReactElement {
  const { id } = useParams()

  const createMutation = useAxiosMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => update('/sensor/' + id, data),
    options: {
      onSuccess: () => {
        toast.success('Sensor updated successfully!')
        queryClient.invalidateQueries({ queryKey: ['oneSensor'] })
      },
      onError: (e) => {
        console.error('Create error', e)
        toast.error('Failed to update sensor.')
      }
    }
  })
  const [defaultVal, setDefaultVal] = useState({
    name: '',
    description: '',
    register: "",
    agentId: "",
  })

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
        console.log('Fetching sensors...')
        const response = await query('/sensor/' + id)
        console.log('im sensor', sensors)
        return response
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
    mutationFn: () => remove('/sensor/' + id),
    options: {
      onSuccess: () => {
        toast.success('Sensor deleted successfully!')
        queryClient.invalidateQueries({ queryKey: ['oneSensor'] })
        navigate('/sensors')
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
    if (sensors) {
      console.log('im sensor new', sensors)
      setDefaultVal({
        name: sensors.name || '',
        description: sensors.description || '',
        register: sensors.register || "",
        agentId: sensors.agentId || "",
      })
    }
    if (isError) {
      console.error('Error details:', error)
    }
  }, [status, isLoading, isFetching, sensors, isError, error])

  const fields = [
    { name: 'name', label: 'Label', placeholder: 'my-agent', type: 'input' as const },
    {
      name: 'description',
      label: 'Description',
      placeholder: 'very awesome agent',
      type: 'input' as const
    },
    {
      name: 'register',
      label: 'Register',
      placeholder: 'very awesome agent',
      type: 'input' as const
    },
  ]
  const onDelete = (): void => {
    deleteMutation.mutate()
  }
  const onSubmit = (data: z.infer<typeof formSchema>): void => {
    console.log("data to sub",data)
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
                {new Date(sensors.createdAt).toLocaleString()}
              </p>
              <p className="text-sm text-gray-400">
                <span className="font-medium text-gray-300">Status:</span> {sensors.status}
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
