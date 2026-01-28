import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Plus, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Security() {
  const [showFirewallDialog, setShowFirewallDialog] = useState(false);
  const [showIPDialog, setShowIPDialog] = useState(false);
  const [firewallForm, setFirewallForm] = useState({ name: "", port: "", protocol: "tcp", action: "allow", sourceIp: "" });
  const [ipForm, setIpForm] = useState({ ipAddress: "", description: "" });

  const { data: firewallRules, refetch: refetchFirewall } = trpc.firewall.list.useQuery();
  const { data: ipWhitelist, refetch: refetchIP } = trpc.ipWhitelist.list.useQuery();
  
  const createFirewallMutation = trpc.firewall.create.useMutation();
  const updateFirewallMutation = trpc.firewall.update.useMutation();
  const deleteFirewallMutation = trpc.firewall.delete.useMutation();
  
  const createIPMutation = trpc.ipWhitelist.create.useMutation();
  const deleteIPMutation = trpc.ipWhitelist.delete.useMutation();

  const handleCreateFirewall = async () => {
    if (!firewallForm.name || !firewallForm.port) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      await createFirewallMutation.mutateAsync({
        name: firewallForm.name,
        port: parseInt(firewallForm.port),
        protocol: firewallForm.protocol as "tcp" | "udp" | "both",
        action: firewallForm.action as "allow" | "deny",
        sourceIp: firewallForm.sourceIp || undefined,
      });
      toast.success("Firewall rule created");
      setFirewallForm({ name: "", port: "", protocol: "tcp", action: "allow", sourceIp: "" });
      setShowFirewallDialog(false);
      refetchFirewall();
    } catch (error) {
      toast.error("Failed to create firewall rule");
    }
  };

  const handleToggleFirewall = async (id: number, enabled: boolean) => {
    try {
      await updateFirewallMutation.mutateAsync({ id, enabled: !enabled });
      toast.success(`Rule ${!enabled ? "enabled" : "disabled"}`);
      refetchFirewall();
    } catch (error) {
      toast.error("Failed to update rule");
    }
  };

  const handleDeleteFirewall = async (id: number) => {
    if (!confirm("Delete this firewall rule?")) return;
    try {
      await deleteFirewallMutation.mutateAsync({ id });
      toast.success("Rule deleted");
      refetchFirewall();
    } catch (error) {
      toast.error("Failed to delete rule");
    }
  };

  const handleCreateIP = async () => {
    if (!ipForm.ipAddress) {
      toast.error("IP address is required");
      return;
    }

    try {
      await createIPMutation.mutateAsync(ipForm);
      toast.success("IP added to whitelist");
      setIpForm({ ipAddress: "", description: "" });
      setShowIPDialog(false);
      refetchIP();
    } catch (error) {
      toast.error("Failed to add IP");
    }
  };

  const handleDeleteIP = async (id: number) => {
    if (!confirm("Remove this IP from whitelist?")) return;
    try {
      await deleteIPMutation.mutateAsync({ id });
      toast.success("IP removed");
      refetchIP();
    } catch (error) {
      toast.error("Failed to remove IP");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn p-6">
      <div>
        <h1 className="text-2xl font-semibold">安全设置</h1>
        <p className="text-muted-foreground mt-1">管理防火墙规则和IP访问控制</p>
      </div>

      <Tabs defaultValue="firewall" className="space-y-4">
        <TabsList>
          <TabsTrigger value="firewall">防火墙规则</TabsTrigger>
          <TabsTrigger value="whitelist">IP白名单</TabsTrigger>
        </TabsList>

        <TabsContent value="firewall" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowFirewallDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              添加规则
            </Button>
          </div>

          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                防火墙规则
              </CardTitle>
              <CardDescription>配置端口访问规则</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead>端口</TableHead>
                      <TableHead>协议</TableHead>
                      <TableHead>动作</TableHead>
                      <TableHead>源IP</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {firewallRules && firewallRules.length > 0 ? (
                      firewallRules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">{rule.name}</TableCell>
                          <TableCell><Badge variant="outline">{rule.port}</Badge></TableCell>
                          <TableCell><Badge variant="secondary">{rule.protocol.toUpperCase()}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={rule.action === "allow" ? "default" : "destructive"}>
                              {rule.action.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{rule.sourceIp || "任意"}</TableCell>
                          <TableCell>
                            <Switch checked={rule.enabled} onCheckedChange={() => handleToggleFirewall(rule.id, rule.enabled)} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteFirewall(rule.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          未配置防火墙规则
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whitelist" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowIPDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              添加IP
            </Button>
          </div>

          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                IP白名单
              </CardTitle>
              <CardDescription>管理允许的IP地址</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP地址</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>添加时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ipWhitelist && ipWhitelist.length > 0 ? (
                      ipWhitelist.map((ip) => (
                        <TableRow key={ip.id}>
                          <TableCell className="font-mono font-medium">{ip.ipAddress}</TableCell>
                          <TableCell>{ip.description || "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(ip.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteIP(ip.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          白名单中没有IP地址
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

      <Dialog open={showFirewallDialog} onOpenChange={setShowFirewallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加防火墙规则</DialogTitle>
            <DialogDescription>配置新的端口访问规则</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>规则名称</Label>
              <Input value={firewallForm.name} onChange={(e) => setFirewallForm({ ...firewallForm, name: e.target.value })} placeholder="SSH Access" />
            </div>
            <div className="space-y-2">
              <Label>端口</Label>
              <Input type="number" value={firewallForm.port} onChange={(e) => setFirewallForm({ ...firewallForm, port: e.target.value })} placeholder="22" />
            </div>
            <div className="space-y-2">
              <Label>协议</Label>
              <Select value={firewallForm.protocol} onValueChange={(value) => setFirewallForm({ ...firewallForm, protocol: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tcp">TCP</SelectItem>
                  <SelectItem value="udp">UDP</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>动作</Label>
              <Select value={firewallForm.action} onValueChange={(value) => setFirewallForm({ ...firewallForm, action: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">允许</SelectItem>
                  <SelectItem value="deny">拒绝</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>源IP (可选)</Label>
              <Input value={firewallForm.sourceIp} onChange={(e) => setFirewallForm({ ...firewallForm, sourceIp: e.target.value })} placeholder="0.0.0.0/0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFirewallDialog(false)}>取消</Button>
            <Button onClick={handleCreateFirewall}>创建规则</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIPDialog} onOpenChange={setShowIPDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加IP到白名单</DialogTitle>
            <DialogDescription>允许来自特定IP地址的访问</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>IP地址</Label>
              <Input value={ipForm.ipAddress} onChange={(e) => setIpForm({ ...ipForm, ipAddress: e.target.value })} placeholder="192.168.1.1" />
            </div>
            <div className="space-y-2">
              <Label>描述 (可选)</Label>
              <Input value={ipForm.description} onChange={(e) => setIpForm({ ...ipForm, description: e.target.value })} placeholder="Office network" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIPDialog(false)}>取消</Button>
            <Button onClick={handleCreateIP}>添加IP</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
