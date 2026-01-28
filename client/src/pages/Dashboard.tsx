import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Cpu, HardDrive, Network, Server } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

export default function Dashboard() {
  const { data: systemInfo, isLoading } = trpc.monitor.getSystemInfo.useQuery(undefined, {
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  const [cpuHistory, setCpuHistory] = useState<Array<{ time: string; value: number }>>([]);
  const [memHistory, setMemHistory] = useState<Array<{ time: string; value: number }>>([]);

  useEffect(() => {
    if (systemInfo) {
      const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      setCpuHistory(prev => {
        const newData = [...prev, { time: now, value: systemInfo.cpu.usage }];
        return newData.slice(-20); // Keep last 20 data points
      });

      setMemHistory(prev => {
        const newData = [...prev, { time: now, value: systemInfo.memory.usagePercent }];
        return newData.slice(-20);
      });
    }
  }, [systemInfo]);

  if (isLoading || !systemInfo) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-muted-foreground">正在加载系统信息...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* System Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU 使用率</CardTitle>
            <Cpu className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemInfo.cpu.usage.toFixed(1)}%</div>
            <Progress value={systemInfo.cpu.usage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {systemInfo.cpu.cores} cores • {systemInfo.cpu.model.substring(0, 30)}...
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">内存使用率</CardTitle>
            <Server className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemInfo.memory.usagePercent.toFixed(1)}%</div>
            <Progress value={systemInfo.memory.usagePercent} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {formatBytes(systemInfo.memory.used)} / {formatBytes(systemInfo.memory.total)}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">磁盘使用率</CardTitle>
            <HardDrive className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemInfo.disk.usagePercent.toFixed(1)}%</div>
            <Progress value={systemInfo.disk.usagePercent} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {formatBytes(systemInfo.disk.used)} / {formatBytes(systemInfo.disk.total)}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">网络</CardTitle>
            <Network className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">活动</div>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-muted-foreground">
                ↓ RX: {formatBytes(systemInfo.network.rx)}
              </p>
              <p className="text-xs text-muted-foreground">
                ↑ TX: {formatBytes(systemInfo.network.tx)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>系统信息</CardTitle>
          <CardDescription>服务器详细信息和状态</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">主机名</p>
              <p className="text-lg font-semibold">{systemInfo.hostname}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">平台</p>
              <p className="text-lg font-semibold capitalize">{systemInfo.platform}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">运行时间</p>
              <p className="text-lg font-semibold">{formatUptime(systemInfo.uptime)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">平均负载 (1分钟)</p>
              <p className="text-lg font-semibold">{systemInfo.loadAverage[0].toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">平均负载 (5分钟)</p>
              <p className="text-lg font-semibold">{systemInfo.loadAverage[1].toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">平均负载 (15分钟)</p>
              <p className="text-lg font-semibold">{systemInfo.loadAverage[2].toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>CPU 使用历史</CardTitle>
            <CardDescription>实时 CPU 利用率</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: {
                  label: "CPU %",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[200px]"
            >
              <AreaChart data={cpuHistory}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#cpuGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>内存使用历史</CardTitle>
            <CardDescription>实时内存利用率</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: {
                  label: "Memory %",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[200px]"
            >
              <AreaChart data={memHistory}>
                <defs>
                  <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--chart-2))"
                  fill="url(#memGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
