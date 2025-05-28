import { useNavigate, useParams } from 'react-router-dom'
import { useAxiosMutation } from '@/hooks/mutate'
import { z } from 'zod'
import { remove, update } from '@/mutations/agent'
import { useAxiosQuery } from '@/hooks/get'
import { query } from '@/queries/agent'
import { ReactElement, useEffect, useState } from 'react'
import { CustomForm } from '../ui/custom-form'
import { Button } from '../ui/button'
import { toast } from 'sonner'
import { queryClient } from '@/main'

const formSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(2),
  plcId: z.string().min(2),
  locked: z.boolean().default(false)
})

export default function AgentDetails(): ReactElement {
  const { id } = useParams()

  const navigate = useNavigate()
  const deleteMutation = useAxiosMutation({
    mutationFn: () => remove('/agent/' + id),
    options: {
      onSuccess: () => {
        toast.success('Agent deleted successfully!')
        queryClient.invalidateQueries({ queryKey: ['oneAgent'] })
        navigate('/agents')
      },
      onError: (e) => {
        console.error('Create error', e)
        toast.error('Failed to delete agent.')
      }
    }
  })
  const createMutation = useAxiosMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => update('/agent/' + id, data),
    options: {
      onSuccess: () => {
        toast.success('Agent updated successfully!')
        queryClient.invalidateQueries({ queryKey: ['oneAgent'] })
      },
      onError: (e) => {
        console.error('Create error', e)
        toast.error('Failed to create process step.')
      }
    }
  })

  const [defaultVal, setDefaultVal] = useState({
    name: '',
    description: '',
    plcId: '',
    locked: false
  })

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
        console.log('Fetching sensors...')
        const response = await query('/agent/' + id)
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
  useEffect(() => {
    console.log('Query status changed:', status)
    console.log('isLoading:', isLoading)
    console.log('isFetching:', isFetching)
    console.log('im sensor', sensors)
    if (sensors) {
      console.log('im sensor new', sensors)
      setDefaultVal({
        name: sensors.name,
        description: sensors.description,
        plcId: sensors.plcId,
        locked: sensors.locked
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
    { name: 'plcId', label: 'PLC ID', placeholder: 'very awesome agent', type: 'input' as const },
    { name: 'locked', label: 'Locked', placeholder: 'true', type: 'checkbox' as const }
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
        {/* Card 1: Agent Configuration */}
        <div className="w-1/2 p-6 bg-gray-800 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-2 text-white">Agent Configuration</h2>
          <p className="text-sm text-gray-400 mb-6">Update the agent details below.</p>
          <CustomForm
            onSubmit={onSubmit}
            formSchema={formSchema}
            fields={fields}
            defaultValues={defaultVal}
          />
        </div>
        {/* Card 2: Agent Information */}
        {sensors && (
          <div className="w-1/3 p-6 bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <h2 className="text-2xl font-semibold mb-2 text-white">Agent Information</h2>
            <p className="text-sm text-gray-400 mb-6">Additional details about the agent.</p>
            <div className="flex flex-col gap-4 pt-2">
              <p className="text-sm text-gray-400">
                <span className="font-medium text-gray-300">Fingerprint:</span>{' '}
                {sensors.fingerprint}
              </p>
              <p className="text-sm text-gray-400">
                <span className="font-medium text-gray-300">Created At:</span>{' '}
                {new Date(sensors.createdAt).toLocaleString()}
              </p>
              <p className="text-sm text-gray-400">
                <span className="font-medium text-gray-300">Known:</span>{' '}
                {sensors.known ? 'true' : 'false'}
              </p>
              <p className="text-sm text-gray-400">
                <span className="font-medium text-gray-300">Status:</span> {sensors.status}
              </p>
              <Button
                onClick={onDelete}
                variant="destructive"
                className="w-full mt-4 bg-red-500 hover:bg-red-600 text-white"
              >
                Remove Agent
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
