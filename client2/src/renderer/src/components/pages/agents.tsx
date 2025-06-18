import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../ui/data-table";
import { CustomDrawer } from "../ui/custom-drawer";
import { z } from "zod";
import { useAxiosMutation } from "@/hooks/mutate";
import { create } from "@/mutations/agent";
import { useAxiosQuery } from "@/hooks/get";
import { query } from "@/queries/agent";
import { ReactElement, useEffect, useState } from "react";
import { toast } from "sonner";
import { queryClient } from "@/main";
import {
  Server,
  Activity,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  CircleDashed,
  Cpu,
  Fingerprint
} from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(2),
  plcId: z.string().min(2),
  fingerprint: z.string().min(2),
})

const fields = [
  { name: "name", label: "Agent Name", placeholder: "production-agent", type: "input" as const },
  { name: "description", label: "Description", placeholder: "Production line monitoring agent", type: "input" as const },
  { name: "plcId", label: "PLC ID", placeholder: "plc7x12ll", type: "input" as const },
  { name: "fingerprint", label: "Fingerprint", placeholder: "aASDV34ETWHvaxz", type: "input" as const },
]
const defaultValues = { name: "", description: "", plcId: '', fingerprint: "" };

export default function Agents(): ReactElement {
  type Agent = {
    id: string
    name: string
    description: string
    plcId: string
    fingerprint: string
    status: "online" | "offline" | "busy"
    lastUpdated?: string
  }

  const columns: ColumnDef<Agent>[] = [
    {
      accessorKey: "name",
      header: "Agent Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-medium">
          <Server className="h-4 w-4 text-sky-400" />
          {row.getValue("name")}
        </div>
      )
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate">
          {row.getValue("description") || "No description"}
        </div>
      )
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const state = (row.getValue("status") || "unknown") as string;

        // Define icons with correct typing
        const statusMap: Record<
          string,
          {
            label: string;
            color: string;
            icon: React.FC<{ className?: string }>;
          }
        > = {
          ready: {
            label: "Online",
            color: "green",
            icon: CheckCircle,
          },
          offline: {
            label: "Offline",
            color: "gray",
            icon: AlertTriangle,
          },
          busy: {
            label: "Busy",
            color: "yellow",
            icon: RefreshCw,
          },
          unknown: {
            label: "Unknown",
            color: "muted",
            icon: CircleDashed,
          },
        };

        const { icon: Icon, color, label } = statusMap[state.toLowerCase()] || statusMap["unknown"];

        return (
          <div className="flex items-center gap-2">
            <div
              className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium
          bg-${color}-900/30 text-${color}-400 border border-${color}-900`}
            >
              <Icon className="h-3 w-3 mr-1" />
              {label}
            </div>
          </div>
        );
      },
    }
    ,
    {
      accessorKey: "plcId",
      header: "PLC model",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Cpu className="h-3 w-3 text-sky-400 opacity-70" />
          <span className="font-mono text-sm">{row.getValue("plcId")}</span>
        </div>
      )
    },
    {
      accessorKey: "fingerprint",
      header: "Fingerprint",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Fingerprint className="h-3 w-3 text-sky-400 opacity-70" />
          <span className="font-mono text-xs text-muted-foreground truncate max-w-[100px]">
            {row.getValue("fingerprint")}
          </span>
        </div>
      )
    },
    {
      accessorKey: "lastUpdated",
      header: "Last Updated",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {row.original.lastUpdated || "Never"}
        </div>
      )
    },
  ]

  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    data: agents,
    isLoading,
    isError,
    error,
    isFetching,
    status,
    refetch
  } = useAxiosQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      try {
        console.log("Fetching agents...");
        const response = await query('/agent');
        console.log("Fetch response:", response);

        // Add status and lastUpdated for demo purposes
        const fetchTime = new Date().toLocaleString();
        const enhancedResponse = response?.map((agent: any) => ({
          ...agent,
          lastUpdated: fetchTime
        })) || [];

        return enhancedResponse;
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
        setDrawerOpen(false); // Close drawer when agent is created
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

  // Calculate summary stats
  const agentCount = agents?.length || 0

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-16">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Server className="h-8 w-8 text-sky-400" />
            Agents
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage your connected agent devices
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
            drawerDescription="Add a new agent to the system."
            drawerTitle="Add New Agent"
            topic="Add Agent"
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Total Agents</p>
              <h3 className="text-3xl font-bold mt-1">{agentCount}</h3>
            </div>
            <div className="bg-primary/20 p-3 rounded-full">
              <Server className="h-6 w-6 text-sky-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Online Agents</p>
              <h3 className="text-3xl font-bold mt-1">{agentCount}</h3> {/* All agents are online */}
            </div>
            <div className="bg-green-500/20 p-3 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg shadow p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Offline Agents</p>
              <h3 className="text-3xl font-bold mt-1">0</h3> {/* No offline agents */}
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
              Agent Inventory
            </h2>
          </div>
          <div className="h-px bg-gray-700 my-2" />

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin">
                <CircleDashed className="h-10 w-10 text-primary" />
              </div>
              <p className="text-muted-foreground mt-4">Loading agents data...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium mb-1">Failed to load agents</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                There was an error retrieving agent data. Please try refreshing.
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : agents?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Server className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No agents found</h3>
              <p className="text-muted-foreground mb-4">
                You haven't added any agents yet. Create your first agent to get started.
              </p>
              <button
                onClick={() => setDrawerOpen(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Add Your First Agent
              </button>
            </div>
          ) : (
            <div className="py-4">
              <DataTable
                route="agent/details"
                columns={columns}
                data={agents || []}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
