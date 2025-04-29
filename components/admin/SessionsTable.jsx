import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function SessionsTable({ 
  sessions, 
  onEdit, 
  onDelete, 
  onCreateNew, 
  onUpdateStatus,
  formatDate,
  formatTime
}) {
  // Filter and sorting state could be added here in the future
  
  // Add helper function for status badges
  const getStatusBadge = (status) => {
    let className = "";
    
    switch(status) {
      case 'NOT_STARTED':
        className = 'bg-yellow-100 text-yellow-800';
        break;
      case 'ACTIVE':
        className = 'bg-green-100 text-green-800';
        break;
      case 'PAUSED':
        className = 'bg-blue-100 text-blue-800';
        break;
      case 'COMPLETED':
        className = 'bg-gray-100 text-gray-800';
        break;
      case 'CANCELLED':
        className = 'bg-red-100 text-red-800';
        break;
      default:
        className = 'bg-gray-100 text-gray-800';
    }
    
    return <Badge className={className}>{status}</Badge>;
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>All Sessions</CardTitle>
            <CardDescription>
              View and manage all poker sessions.
            </CardDescription>
          </div>
          
          <Button onClick={onCreateNew}>
            Create New Session
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border mb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">No sessions found</TableCell>
                </TableRow>
              ) : (
                sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div>
                        <div>{session.title}</div>
                        <div className="text-xs text-muted-foreground">{session.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>{session.type}</TableCell>
                    <TableCell>
                      {formatDate(session.date)} {formatTime(session.startTime)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(session.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {session.status === 'NOT_STARTED' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8"
                            onClick={() => onUpdateStatus('ACTIVE', session.id)}
                          >
                            Start
                          </Button>
                        )}
                        
                        {session.status === 'ACTIVE' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8"
                            onClick={() => onUpdateStatus('COMPLETED', session.id)}
                          >
                            End
                          </Button>
                        )}
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8"
                          onClick={() => onEdit(session)}
                        >
                          Edit
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-red-600 hover:text-red-700"
                          onClick={() => onDelete(session.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
} 