import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import LoadingSpinner from "./LoadingSpinner";
import EmptyState from "./EmptyState";

export default function DataTable({ 
  columns, 
  data = [], 
  isLoading,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  emptyActionLabel,
  onRowClick
}) {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (data.length === 0) {
    return (
      <EmptyState 
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        actionLabel={emptyActionLabel}
      />
    );
  }

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              {columns.map((column, index) => (
                <TableHead 
                  key={index} 
                  className={`text-slate-600 font-semibold text-xs uppercase tracking-wider ${column.className || ''}`}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIndex) => (
              <TableRow 
                key={row.id || rowIndex} 
                className={`hover:bg-slate-50/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((column, colIndex) => (
                  <TableCell key={colIndex} className={`py-4 ${column.cellClassName || ''}`}>
                    {column.render ? column.render(row) : row[column.accessor]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}