import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export default function Processes() {
  const { data: processes, isLoading, refetch } = trpc.monitor.getProcesses.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const killProcessMutation = trpc.monitor.killProcess.useMutation();
  const [pidToKill, setPidToKill] = useState<string | null>(null);

  const handleKillProcess = async (pid: string) => {
    try {
      await killProcessMutation.mutateAsync({ pid });
      toast.success("Process terminated successfully");
      refetch();
      setPidToKill(null);
    } catch (error) {
      toast.error("Failed to terminate process");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Process Management</h1>
          <p className="text-muted-foreground mt-1">Monitor and control running processes</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Running Processes</CardTitle>
          <CardDescription>Top 20 processes sorted by memory usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border custom-scrollbar overflow-auto max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>CPU %</TableHead>
                  <TableHead>Memory %</TableHead>
                  <TableHead>Command</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processes && processes.length > 0 ? (
                  processes.map((process) => (
                    <TableRow key={process.pid}>
                      <TableCell className="font-mono text-sm">{process.pid}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{process.user}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{process.cpu.toFixed(1)}%</span>
                          {process.cpu > 50 && (
                            <AlertCircle className="w-4 h-4 text-warning" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{process.mem.toFixed(1)}%</span>
                          {process.mem > 50 && (
                            <AlertCircle className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-md truncate">
                        {process.command}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPidToKill(process.pid)}
                          className="text-destructive hover:text-destructive"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No processes found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!pidToKill} onOpenChange={(open) => !open && setPidToKill(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Process</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to terminate process {pidToKill}? This action cannot be undone
              and may cause system instability if critical processes are terminated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pidToKill && handleKillProcess(pidToKill)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
