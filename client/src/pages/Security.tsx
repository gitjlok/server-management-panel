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
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold">Security Settings</h1>
        <p className="text-muted-foreground mt-1">Manage firewall rules and IP access control</p>
      </div>

      <Tabs defaultValue="firewall" className="space-y-4">
        <TabsList>
          <TabsTrigger value="firewall">Firewall Rules</TabsTrigger>
          <TabsTrigger value="whitelist">IP Whitelist</TabsTrigger>
        </TabsList>

        <TabsContent value="firewall" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowFirewallDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </div>

          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Firewall Rules
              </CardTitle>
              <CardDescription>Configure port access rules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Port</TableHead>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Source IP</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                          <TableCell>{rule.sourceIp || "Any"}</TableCell>
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
                          No firewall rules configured
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
              Add IP
            </Button>
          </div>

          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                IP Whitelist
              </CardTitle>
              <CardDescription>Manage allowed IP addresses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                          No IP addresses in whitelist
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
            <DialogTitle>Add Firewall Rule</DialogTitle>
            <DialogDescription>Configure a new port access rule</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input value={firewallForm.name} onChange={(e) => setFirewallForm({ ...firewallForm, name: e.target.value })} placeholder="SSH Access" />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input type="number" value={firewallForm.port} onChange={(e) => setFirewallForm({ ...firewallForm, port: e.target.value })} placeholder="22" />
            </div>
            <div className="space-y-2">
              <Label>Protocol</Label>
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
              <Label>Action</Label>
              <Select value={firewallForm.action} onValueChange={(value) => setFirewallForm({ ...firewallForm, action: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="deny">Deny</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source IP (optional)</Label>
              <Input value={firewallForm.sourceIp} onChange={(e) => setFirewallForm({ ...firewallForm, sourceIp: e.target.value })} placeholder="0.0.0.0/0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFirewallDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateFirewall}>Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showIPDialog} onOpenChange={setShowIPDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add IP to Whitelist</DialogTitle>
            <DialogDescription>Allow access from a specific IP address</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>IP Address</Label>
              <Input value={ipForm.ipAddress} onChange={(e) => setIpForm({ ...ipForm, ipAddress: e.target.value })} placeholder="192.168.1.1" />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input value={ipForm.description} onChange={(e) => setIpForm({ ...ipForm, description: e.target.value })} placeholder="Office network" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIPDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateIP}>Add IP</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
