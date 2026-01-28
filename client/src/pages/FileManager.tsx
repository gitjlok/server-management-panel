import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { File, Folder, Home, ChevronRight, Trash2, FolderPlus, RefreshCw } from "lucide-react";
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString();
}

export default function FileManager() {
  const [currentPath, setCurrentPath] = useState("/");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);

  const { data: files, isLoading, refetch } = trpc.files.list.useQuery({ path: currentPath });
  const deleteFileMutation = trpc.files.delete.useMutation();
  const createDirectoryMutation = trpc.files.createDirectory.useMutation();

  const utils = trpc.useUtils();

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
  };

  const handleGoUp = () => {
    if (currentPath === "/") return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length > 0 ? "/" + parts.join("/") : "/");
  };

  const handleDelete = async (path: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    
    try {
      await deleteFileMutation.mutateAsync({ path });
      toast.success("Item deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete item");
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("Folder name cannot be empty");
      return;
    }

    try {
      await createDirectoryMutation.mutateAsync({
        path: currentPath,
        name: newFolderName,
      });
      toast.success("Folder created successfully");
      setNewFolderName("");
      setShowNewFolderDialog(false);
      refetch();
    } catch (error) {
      toast.error("Failed to create folder");
    }
  };

  const pathParts = currentPath.split("/").filter(Boolean);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">File Manager</h1>
          <p className="text-muted-foreground mt-1">Browse and manage server files</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowNewFolderDialog(true)} variant="outline" size="sm">
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Current Directory</CardTitle>
          <CardDescription>
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate("/")}
                className="h-7 px-2"
              >
                <Home className="w-4 h-4" />
              </Button>
              {pathParts.map((part, index) => (
                <div key={index} className="flex items-center">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigate("/" + pathParts.slice(0, index + 1).join("/"))}
                    className="h-7 px-2"
                  >
                    {part}
                  </Button>
                </div>
              ))}
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentPath !== "/" && (
            <Button
              variant="ghost"
              onClick={handleGoUp}
              className="mb-4 w-full justify-start"
            >
              <Folder className="w-4 h-4 mr-2" />
              .. (Parent Directory)
            </Button>
          )}

          <div className="rounded-md border custom-scrollbar overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Modified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : files && files.length > 0 ? (
                  files.map((file: any) => (
                    <TableRow
                      key={file.path}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => file.isDirectory && handleNavigate(file.path)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {file.isDirectory ? (
                            <Folder className="w-4 h-4 text-primary" />
                          ) : (
                            <File className="w-4 h-4 text-muted-foreground" />
                          )}
                          {file.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={file.isDirectory ? "default" : "secondary"}>
                          {file.isDirectory ? "Directory" : "File"}
                        </Badge>
                      </TableCell>
                      <TableCell>{file.isDirectory ? "-" : formatBytes(file.size)}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {file.permissions}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(file.modifiedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(file.path);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      This directory is empty
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder in {currentPath}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="my-folder"
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
