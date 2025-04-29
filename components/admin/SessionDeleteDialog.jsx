import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function SessionDeleteDialog({ isOpen, onClose, onConfirm, sessionId }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this session? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(sessionId)}>
            Delete Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 