import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
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

// 圆形进度环组件 - 宝塔风格
function CircularProgress({ value, size = 120, strokeWidth = 8, color = "#20a53a" }: { value: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e4e7ed"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-primary">{value.toFixed(0)}</span>
        <span className="text-xs text-muted-foreground">%</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: systemInfo, isLoading } = trpc.monitor.getSystemInfo.useQuery(undefined, {
    refetchInterval: 3000,
  });

  const [cpuHistory, setCpuHistory] = useState<Array<{ time: string; value: number }>>([]);
  const [memHistory, setMemHistory] = useState<Array<{ time: string; value: number }>>([]);

  useEffect(() => {
    if (systemInfo) {
      const now = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      setCpuHistory(prev => {
        const newData = [...prev, { time: now, value: systemInfo.cpu.usage }];
        return newData.slice(-30);
      });

      setMemHistory(prev => {
        const newData = [...prev, { time: now, value: systemInfo.memory.usagePercent }];
        return newData.slice(-30);
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

  const diskUsagePercent = (systemInfo.disk.used / systemInfo.disk.total) * 100;

  return (
    <div className="space-y-6 animate-fadeIn p-6">
      {/* 顶部系统状态卡片 - 宝塔风格 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* CPU卡片 */}
        <Card className="baota-stat-card">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <CircularProgress value={systemInfo.cpu.usage} color="#ff9800" />
            <div className="mt-4 text-center">
              <p className="text-sm font-medium text-foreground">CPU</p>
              <p className="text-xs text-muted-foreground mt-1">{systemInfo.cpu.cores}核心</p>
            </div>
          </CardContent>
        </Card>

        {/* 内存卡片 */}
        <Card className="baota-stat-card">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <CircularProgress value={systemInfo.memory.usagePercent} color="#2196f3" />
            <div className="mt-4 text-center">
              <p className="text-sm font-medium text-foreground">内存</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatBytes(systemInfo.memory.used)} / {formatBytes(systemInfo.memory.total)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 磁盘卡片 */}
        <Card className="baota-stat-card">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <CircularProgress value={diskUsagePercent} color="#20a53a" />
            <div className="mt-4 text-center">
              <p className="text-sm font-medium text-foreground">磁盘</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatBytes(systemInfo.disk.used)} / {formatBytes(systemInfo.disk.total)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 网络卡片 */}
        <Card className="baota-stat-card">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="flex flex-col items-center">
              <div className="text-center mb-2">
                <p className="text-2xl font-bold text-primary">活动</p>
              </div>
              <div className="w-full space-y-2 mt-4">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">↑ RX:</span>
                  <span className="font-medium">{formatBytes(systemInfo.network.rx)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">↓ TX:</span>
                  <span className="font-medium">{formatBytes(systemInfo.network.tx)}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm font-medium text-foreground">网络</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 系统信息卡片 */}
      <Card className="baota-stat-card">
        <CardHeader>
          <CardTitle className="text-base">系统信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">主机名</p>
              <p className="text-sm font-medium mt-1">{systemInfo.hostname}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">平台</p>
              <p className="text-sm font-medium mt-1">{systemInfo.platform}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">运行时间</p>
              <p className="text-sm font-medium mt-1">{formatUptime(systemInfo.uptime)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">平均负载 (1分钟)</p>
              <p className="text-sm font-medium mt-1">{systemInfo.loadAverage[0].toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CPU使用历史图表 - 宝塔风格 */}
      <Card className="baota-stat-card">
        <CardHeader>
          <CardTitle className="text-base">CPU 使用历史</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              value: {
                label: "CPU使用率",
                color: "#ff9800",
              },
            }}
            className="h-[200px]"
          >
            <AreaChart data={cpuHistory}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff9800" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff9800" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ed" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12, fill: '#999' }}
                tickLine={{ stroke: '#e4e7ed' }}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: '#999' }}
                tickLine={{ stroke: '#e4e7ed' }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#ff9800"
                strokeWidth={2}
                fill="url(#cpuGradient)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* 内存使用历史图表 - 宝塔风格 */}
      <Card className="baota-stat-card">
        <CardHeader>
          <CardTitle className="text-base">内存使用历史</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              value: {
                label: "内存使用率",
                color: "#2196f3",
              },
            }}
            className="h-[200px]"
          >
            <AreaChart data={memHistory}>
              <defs>
                <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2196f3" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2196f3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ed" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12, fill: '#999' }}
                tickLine={{ stroke: '#e4e7ed' }}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: '#999' }}
                tickLine={{ stroke: '#e4e7ed' }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#2196f3"
                strokeWidth={2}
                fill="url(#memGradient)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
