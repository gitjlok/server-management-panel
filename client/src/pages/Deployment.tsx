import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Server as ServerIcon, RefreshCw, Trash2, Play, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function Deployment() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    host: "",
    port: 22,
    username: "",
    authType: "password" as "password" | "key",
    password: "",
    privateKey: "",
    description: "",
  });

  const [deployData, setDeployData] = useState({
    deployType: "",
    command: "",
  });

  const { data: servers, refetch: refetchServers } = trpc.deployment.listServers.useQuery();
  const { data: history, refetch: refetchHistory } = trpc.deployment.getHistory.useQuery({});
  const createServer = trpc.deployment.createServer.useMutation();
  const testConnection = trpc.deployment.testConnection.useMutation();
  const deleteServer = trpc.deployment.deleteServer.useMutation();
  const deploy = trpc.deployment.deploy.useMutation();

  const handleCreate = async () => {
    if (!formData.name || !formData.host || !formData.username) {
      toast.error("请填写必填字段");
      return;
    }

    if (formData.authType === "password" && !formData.password) {
      toast.error("请输入密码");
      return;
    }

    if (formData.authType === "key" && !formData.privateKey) {
      toast.error("请输入私钥");
      return;
    }

    try {
      await createServer.mutateAsync(formData);
      toast.success("服务器连接已创建");
      setShowCreateDialog(false);
      setFormData({
        name: "",
        host: "",
        port: 22,
        username: "",
        authType: "password",
        password: "",
        privateKey: "",
        description: "",
      });
      refetchServers();
    } catch (error: any) {
      toast.error(error.message || "创建失败");
    }
  };

  const handleTest = async (id: number) => {
    try {
      const result = await testConnection.mutateAsync({ id });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      refetchServers();
    } catch (error: any) {
      toast.error(error.message || "测试连接失败");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除此服务器连接吗？")) return;

    try {
      await deleteServer.mutateAsync({ id });
      toast.success("服务器连接已删除");
      refetchServers();
    } catch (error: any) {
      toast.error(error.message || "删除失败");
    }
  };

  const handleDeploy = async () => {
    if (!selectedServerId || !deployData.deployType || !deployData.command) {
      toast.error("请填写所有字段");
      return;
    }

    try {
      await deploy.mutateAsync({
        serverId: selectedServerId,
        deployType: deployData.deployType,
        command: deployData.command,
      });
      toast.success("部署任务已启动");
      setShowDeployDialog(false);
      setDeployData({ deployType: "", command: "" });
      setSelectedServerId(null);
      refetchHistory();
    } catch (error: any) {
      toast.error(error.message || "部署失败");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />已连接</Badge>;
      case "disconnected":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />未连接</Badge>;
      case "error":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />错误</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDeployStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="default" className="bg-green-500">成功</Badge>;
      case "failed":
        return <Badge variant="destructive">失败</Badge>;
      case "running":
        return <Badge variant="default" className="bg-blue-500">运行中</Badge>;
      case "pending":
        return <Badge variant="secondary">等待中</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">服务器部署</h1>
          <p className="text-muted-foreground mt-1">管理服务器连接和部署任务</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          添加服务器
        </Button>
      </div>

      <Tabs defaultValue="servers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="servers">服务器列表</TabsTrigger>
          <TabsTrigger value="history">部署历史</TabsTrigger>
        </TabsList>

        <TabsContent value="servers" className="space-y-4">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ServerIcon className="w-5 h-5" />
                服务器连接
              </CardTitle>
              <CardDescription>管理远程服务器连接配置</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead>主机</TableHead>
                      <TableHead>端口</TableHead>
                      <TableHead>用户名</TableHead>
                      <TableHead>认证方式</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>最后连接</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servers && servers.length > 0 ? (
                      servers.map((server) => (
                        <TableRow key={server.id}>
                          <TableCell className="font-medium">{server.name}</TableCell>
                          <TableCell>{server.host}</TableCell>
                          <TableCell>{server.port}</TableCell>
                          <TableCell>{server.username}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {server.authType === "password" ? "密码" : "密钥"}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(server.status)}</TableCell>
                          <TableCell>
                            {server.lastConnected
                              ? new Date(server.lastConnected).toLocaleString("zh-CN")
                              : "从未连接"}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTest(server.id)}
                              disabled={testConnection.isPending}
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              测试
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedServerId(server.id);
                                setShowDeployDialog(true);
                              }}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              部署
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(server.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          未配置服务器连接。点击"添加服务器"创建一个。
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>部署历史</CardTitle>
              <CardDescription>查看所有部署任务的执行记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border custom-scrollbar overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>服务器ID</TableHead>
                      <TableHead>部署类型</TableHead>
                      <TableHead>命令</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>开始时间</TableHead>
                      <TableHead>完成时间</TableHead>
                      <TableHead>输出</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history && history.length > 0 ? (
                      history.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.serverId}</TableCell>
                          <TableCell>{item.deployType}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            <code className="text-xs bg-muted px-2 py-1 rounded">{item.command}</code>
                          </TableCell>
                          <TableCell>{getDeployStatusBadge(item.status)}</TableCell>
                          <TableCell>{new Date(item.startedAt).toLocaleString("zh-CN")}</TableCell>
                          <TableCell>
                            {item.completedAt
                              ? new Date(item.completedAt).toLocaleString("zh-CN")
                              : "-"}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {item.output || item.errorMessage || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          暂无部署历史
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Server Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加服务器连接</DialogTitle>
            <DialogDescription>配置新的远程服务器连接</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">服务器名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="生产服务器"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host">主机地址 *</Label>
                <Input
                  id="host"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="192.168.1.100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="port">端口</Label>
                <Input
                  id="port"
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                  placeholder="22"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">用户名 *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="root"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>认证方式</Label>
              <Select
                value={formData.authType}
                onValueChange={(value: "password" | "key") =>
                  setFormData({ ...formData, authType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="password">密码</SelectItem>
                  <SelectItem value="key">SSH密钥</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.authType === "password" ? (
              <div className="space-y-2">
                <Label htmlFor="password">密码 *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="privateKey">SSH私钥 *</Label>
                <Textarea
                  id="privateKey"
                  value={formData.privateKey}
                  onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
                  placeholder="-----BEGIN RSA PRIVATE KEY-----"
                  rows={6}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="服务器用途说明"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={createServer.isPending}>
              创建连接
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deploy Dialog */}
      <Dialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>执行部署</DialogTitle>
            <DialogDescription>在选定的服务器上执行部署任务</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deployType">部署类型 *</Label>
              <Input
                id="deployType"
                value={deployData.deployType}
                onChange={(e) => setDeployData({ ...deployData, deployType: e.target.value })}
                placeholder="应用部署"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="command">执行命令 *</Label>
              <Textarea
                id="command"
                value={deployData.command}
                onChange={(e) => setDeployData({ ...deployData, command: e.target.value })}
                placeholder="cd /var/www && git pull && npm install && pm2 restart app"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeployDialog(false)}>
              取消
            </Button>
            <Button onClick={handleDeploy} disabled={deploy.isPending}>
              开始部署
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
