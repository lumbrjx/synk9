import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '../ui/data-table'
import { CustomDrawer } from '../ui/custom-drawer'
import { z } from 'zod'
import { useAxiosMutation } from '@/hooks/mutate'
import { create } from '@/mutations/agent'
import { useAxiosQuery } from '@/hooks/get'
import { query } from '@/queries/agent'
import { ReactElement, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { queryClient } from '@/main'
import {
  Gauge,
  Activity,
  Database,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  CircleDashed
} from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(2),
  register: z.string().min(1),
  agentId: z.string().min(2)
})

const defaultValues = { name: '', description: '', register: '',  }

export default function Sensors(): ReactElement {
  type Sensor = {
    id: string
    name: string
    description: string
    status: 'online' | 'offline' | 'error' | 'pending'
    plcId?: number
    start_register?:number
    register?:string
    end_register?:number
    agentId?: string
    lastUpdated?: string
  }

  const columns: ColumnDef<Sensor>[] = [
    {
      accessorKey: 'name',
      header: 'Sensor Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-medium">
          <Gauge className="h-4 w-4 text-sky-400" />
          {row.getValue('name')}
        </div>
      )
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate">
          {row.getValue('description') || 'No description'}
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ }) => {
        return (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-900/30 text-green-400 border border-green-900">
              <CheckCircle className="h-3 w-3 mr-1" />
              Online
            </span>
          </div>
        )
      }
    },
    {
      accessorKey: 'registers',
      header: 'Register',
      cell: ({ row }) => {
        const startReg = row.original.start_register
        const endReg= row.original.end_register
        const reg = row.original.register
        return (
          <div className="font-mono text-sm">
            {startReg != null  && endReg != null && reg!=null ?`${reg} : ${startReg} - ${endReg}` : 'N/A'}
          </div>
        )
      }
    },
    {
      accessorKey: 'lastUpdated',
      header: 'Last Updated',
      cell: ({ row }) => {
        return (
          <div className="text-sm text-muted-foreground">{row.original.lastUpdated || 'Never'}</div>
        )
      }
    }
  ]

  const {
    data: agents,
    isLoading,
    isError,
    error,
    isFetching,
    status,
    refetch
  } = useAxiosQuery({
    queryKey: ['sensors'],
    queryFn: async () => {
      try {
        console.log('Fetching agents...')
        const response = await query('/sensor')
        const response2 = await query('/agent')
        console.log('Fetch response:', response)

        // Add status and lastUpdated for demo purposes
        const fetchTime = new Date().toLocaleString()
        const enhancedResponse =
          response?.map((sensor: any) => ({
            ...sensor,
            status: 'online', // Always set status to online
            lastUpdated: fetchTime
          })) || []

        return { response: enhancedResponse, response2 }
      } catch (e) {
        console.error('Fetch error:', e)
        throw e
      }
    },
    options: {
      refetchOnWindowFocus: false,
      retry: 2
    }
  })

  const [drawerOpen, setDrawerOpen] = useState(false)

  const createMutation = useAxiosMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => create('/sensor', data),

    options: {
      onSuccess: () => {
        toast.success('Sensor created successfully!')
        queryClient.invalidateQueries({ queryKey: ['sensors'] })
        setDrawerOpen(false) // Close drawer when sensor is created
      },
      onError: (e) => {
        console.error('Create error', e)
        toast.error('Failed to create sensor.')
      }
    }
  })

  const [defaultVal, setDefaultVal] = useState([])

  const fields = [
    {
      name: 'name',
      label: 'Sensor Name',
      placeholder: 'temperature-sensor',
      type: 'input' as const
    },
    {
      name: 'description',
      label: 'Description',
      placeholder: 'Machine temperature sensor',
      type: 'input' as const
    },
    {
      name: 'register',
      label: 'Register',
      placeholder: '512',
      type: 'input' as const
    },
    {
      name: 'agentId',
      label: 'Agent',
      placeholder: 'Select an agent',
      type: 'select' as const,
      options: defaultVal || []
    }
  ]

  useEffect(() => {
    console.log('Query status changed:', status)
    console.log('isLoading:', isLoading)
    console.log('isFetching:', isFetching)
    if (agents?.response2) {
      const filtered = agents.response2.map((sensor: any) => ({
        value: sensor.id,
        label: sensor.name
      }))
      setDefaultVal(filtered)
    }
    if (isError) {
      console.error('Error details:', error)
    }
  }, [status, isLoading, isFetching, agents, isError, error])

  const onSubmit = (data: z.infer<typeof formSchema>): void => {
    console.log(data)
    createMutation.mutate(data)
  }

  // Calculate summary stats
  const sensorCount = agents?.response?.length || 0

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-16">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8 text-sky-400" />
            Sensors
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage your connected sensor devices
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 h-10 px-4 py-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors"
            disabled={isLoading || isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <CustomDrawer
            formSchema={formSchema}
            formFields={fields}
            defaultValues={defaultValues}
            onSubmit={(d: any) => onSubmit(d)}
            drawerDescription="Connect a new sensor to the system."
            drawerTitle="Add New Sensor"
            topic="Add Sensor"
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Total Sensors</p>
              <h3 className="text-3xl font-bold mt-1">{sensorCount}</h3>
            </div>
            <div className="bg-primary/20 p-3 rounded-full">
              <Gauge className="h-6 w-6 text-sky-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Online Sensors</p>
              <h3 className="text-3xl font-bold mt-1">{sensorCount}</h3>{' '}
              {/* All sensors are online */}
            </div>
            <div className="bg-green-500/20 p-3 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Offline Sensors</p>
              <h3 className="text-3xl font-bold mt-1">0</h3> {/* No offline sensors */}
            </div>
            <div className="bg-gray-500/20 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg shadow border border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-sky-400" />
              Sensor Inventory
            </h2>
          </div>
          <div className="h-px bg-gray-700 my-2" />

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin">
                <CircleDashed className="h-10 w-10 text-primary" />
              </div>
              <p className="text-muted-foreground mt-4">Loading sensors data...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium mb-1">Failed to load sensors</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                There was an error retrieving sensor data. Please try refreshing.
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : agents?.response?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No sensors found</h3>
              <p className="text-muted-foreground mb-4">
                You haven&apos;t added any sensors yet. Create your first sensor to get started.
              </p>
              <button
                onClick={() => setDrawerOpen(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Add Your First Sensor
              </button>
            </div>
          ) : (
            <div className="py-4">
              <DataTable route="sensor/details" columns={columns} data={agents?.response || []} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
