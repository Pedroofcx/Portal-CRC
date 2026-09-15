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
    <Card className="overflow-hidden border shadow-none">
      <div className="overflow-x-auto">
        <Table className="tabela-operacional">
          <TableHeader>
            <TableRow className="border-b border-border bg-muted hover:bg-muted">
              {columns.map((column, index) => (
                <TableHead
                  key={index}
                  className={`h-9 whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-muted-foreground ${column.className || ''}`}
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
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => {
                  // A regra pede operação por teclado: Enter abre a linha.
                  if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }}
                className={`border-b border-border transition-colors last:border-0 hover:bg-accent/60 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((column, colIndex) => (
                  <TableCell
                    key={colIndex}
                    className={`py-0 align-middle text-sm ${column.cellClassName || ''}`}
                  >
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