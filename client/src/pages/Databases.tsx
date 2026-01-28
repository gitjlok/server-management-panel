import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database as DatabaseIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Databases() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({ name: "", username: "", password: "" });

  const { data: databases, refetch } = trpc.databases.list.useQuery();
  const createMutation = trpc.databases.create.useMutation();
  const deleteMutation = trpc.databases.delete.useMutation();

  const handleCreate = async () => {
    if (!formData.name || !formData.username || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await createMutation.mutateAsync(formData);
      toast.success("Database created successfully");
      setFormData({ name: "", username: "", password: "" });
      setShowCreateDialog(false);
      refetch();
    } catch (error) {
      toast.error("Failed to create database");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this database?")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Database deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete database");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Management</h1>
          <p className="text-muted-foreground mt-1">Manage MySQL databases</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Database
        </Button>
      </div>

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Databases</CardTitle>
          <CardDescription>All MySQL databases on this server</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {databases && databases.length > 0 ? (
                  databases.map((db) => (
                    <TableRow key={db.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <DatabaseIcon className="w-4 h-4 text-primary" />
                          {db.name}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{db.username}</Badge></TableCell>
                      <TableCell>{db.host}</TableCell>
                      <TableCell>{db.port}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(db.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(db.id)} className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No databases found. Click "Create Database" to add one.
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
            <DialogTitle>Create New Database</DialogTitle>
            <DialogDescription>Set up a new MySQL database</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dbname">Database Name</Label>
              <Input id="dbname" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="mydb" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="dbuser" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
