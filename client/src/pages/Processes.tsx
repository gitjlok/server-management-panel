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
    <div className="space-y-6 animate-fadeIn p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">进程管理</h1>
          <p className="text-muted-foreground mt-1">监控和控制运行中的进程</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </Button>
      </div>

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>运行中的进程</CardTitle>
          <CardDescription>按内存使用率排序的前 20 个进程</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border custom-scrollbar overflow-auto max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PID</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>CPU %</TableHead>
                  <TableHead>内存 %</TableHead>
                  <TableHead>命令</TableHead>
                  <TableHead className="text-right">操作</TableHead>
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
                      未找到进程
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
            <AlertDialogTitle>终止进程</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要终止进程 {pidToKill} 吗？此操作无法撤销，如果终止关键进程可能会导致系统不稳定。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pidToKill && handleKillProcess(pidToKill)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              终止
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
