import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, Plus, Trash2, Power, PowerOff, Shield } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function Websites() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    domain: "",
    path: "",
    port: "",
  });

  const { data: websites, refetch } = trpc.websites.list.useQuery();
  const createMutation = trpc.websites.create.useMutation();
  const updateMutation = trpc.websites.update.useMutation();
  const deleteMutation = trpc.websites.delete.useMutation();

  const handleCreate = async () => {
    if (!formData.name || !formData.domain || !formData.path) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: formData.name,
        domain: formData.domain,
        path: formData.path,
        port: formData.port ? parseInt(formData.port) : undefined,
      });
      toast.success("Website created successfully");
      setFormData({ name: "", domain: "", path: "", port: "" });
      setShowCreateDialog(false);
      refetch();
    } catch (error) {
      toast.error("Failed to create website");
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "running" ? "stopped" : "running";
    try {
      await updateMutation.mutateAsync({
        id,
        data: { status: newStatus },
      });
      toast.success(`Website ${newStatus === "running" ? "started" : "stopped"}`);
      refetch();
    } catch (error) {
      toast.error("Failed to update website status");
    }
  };

  const handleToggleSSL = async (id: number, currentSSL: boolean) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: { sslEnabled: !currentSSL },
      });
      toast.success(`SSL ${!currentSSL ? "enabled" : "disabled"}`);
      refetch();
    } catch (error) {
      toast.error("Failed to update SSL status");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this website?")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Website deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete website");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Website Management</h1>
          <p className="text-muted-foreground mt-1">Manage hosted websites and domains</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Website
        </Button>
      </div>

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Websites</CardTitle>
          <CardDescription>All managed websites on this server</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border custom-scrollbar overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SSL</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {websites && websites.length > 0 ? (
                  websites.map((website) => (
                    <TableRow key={website.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-primary" />
                          {website.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <a
                          href={`http://${website.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {website.domain}
                        </a>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {website.path}
                        </code>
                      </TableCell>
                      <TableCell>{website.port || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            website.status === "running"
                              ? "default"
                              : website.status === "error"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {website.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={website.sslEnabled}
                            onCheckedChange={() => handleToggleSSL(website.id, website.sslEnabled)}
                          />
                          {website.sslEnabled && <Shield className="w-4 h-4 text-success" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(website.id, website.status)}
                          >
                            {website.status === "running" ? (
                              <PowerOff className="w-4 h-4 text-destructive" />
                            ) : (
                              <Power className="w-4 h-4 text-success" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(website.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No websites configured. Click "Add Website" to create one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Website</DialogTitle>
            <DialogDescription>
              Configure a new website on this server
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Website Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Website"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Domain *</Label>
              <Input
                id="domain"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="path">Path *</Label>
              <Input
                id="path"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                placeholder="/var/www/html"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Port (optional)</Label>
              <Input
                id="port"
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                placeholder="80"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Website</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
