import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table"
import { useNavigate } from 'react-router-dom';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DataTableProps<TData, TValue> {
	route: string
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	maxHeight?: string // Optional prop to control the height
}

export function DataTable<TData, TValue>({
	route,
	columns,
	data,
	maxHeight = "600px" // Default height if not specified
}: DataTableProps<TData, TValue>) {
	const navigate = useNavigate();
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
	})

	return (
		<div className="rounded-md border w-full overflow-hidden">
			{/* Header stays visible; Scroll only the body */}
			<Table className="w-full bg-primary">
				<TableHeader className="bg-primary">
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead
									key={header.id}
									className="text-purple-300 sticky rounded-md top-0 bg-primary z-10"
								>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext()
										  )}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
			</Table>

			<ScrollArea
				className="w-full overflow-auto"
				style={{ maxHeight }}
			>
				<div className="min-w-full">
					<Table className="w-full">
						<TableBody>
							{table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map((row) => (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && "selected"}
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell
												key={cell.id}
												className="cursor-pointer hover:bg-muted/50"
												onClick={() =>
													navigate(`/${route}/${(cell.row.original as any).id}`)
												}
											>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext()
												)}
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell colSpan={columns.length} className="h-24 text-center">
										No results.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</ScrollArea>
		</div>
	)
}

