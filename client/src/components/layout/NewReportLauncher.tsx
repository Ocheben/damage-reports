"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Modal } from "@/components/layout/Modal";
import { NewReportForm } from "@/components/Reports/NewReport/NewReportForm";

export function NewReportLauncher() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        New report
      </button>
      {open && (
        <Modal onClose={close} labelledBy="new-report-title">
          <NewReportForm onClose={close} />
        </Modal>
      )}
    </>
  );
}
