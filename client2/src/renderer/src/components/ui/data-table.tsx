import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ReactElement } from 'react'

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
  maxHeight = '500px' // Default height if not specified
}: DataTableProps<TData, TValue>): ReactElement {
  const navigate = useNavigate()
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  return (
    <div className="rounded-md border w-full overflow-hidden">
      <ScrollArea className="w-full overflow-x-hidden" style={{ maxHeight }}>
        <Table className="w-full">
          <TableHeader className="sticky top-0 z-10 hover:bg-transparent">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='hover:bg-transparent'>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-gray-400 bg-transparent hover:bg-transparent"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/${route}/${(cell.row.original as any).id}`)}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
      </ScrollArea>
    </div>
  )
}
