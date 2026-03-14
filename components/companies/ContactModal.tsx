"use client";

import Modal from "@/components/ui/Modal";

export type CompanyContact = {
  name?: string;
  designation?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  preferredMethod?: "email" | "phone" | "linkedin";
  notes?: string;
};

type ContactModalProps = {
  isOpen: boolean;
  onClose: () => void;
  contact: CompanyContact | null;
  onSubmit: (values: CompanyContact) => Promise<void>;
  submitting?: boolean;
  errorMessage?: string | null;
  title?: string;
};

export default function ContactModal({
  isOpen,
  onClose,
  contact,
  onSubmit,
  submitting = false,
  errorMessage = null,
  title,
}: ContactModalProps) {
  const resolvedTitle = title ?? (contact ? "Edit Contact" : "Add Contact");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await onSubmit({
      name: String(formData.get("name") ?? "").trim(),
      designation: String(formData.get("designation") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      linkedin: String(formData.get("linkedin") ?? "").trim(),
      preferredMethod: String(formData.get("preferredMethod") ?? "email") as
        | "email"
        | "phone"
        | "linkedin",
      notes: String(formData.get("notes") ?? "").trim(),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={resolvedTitle}
      size="lg"
      footer={
        <>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            type="submit"
            form="company-contact-form"
            disabled={submitting}
          >
            {contact ? "Save Changes" : "Add Contact"}
          </button>
        </>
      }
    >
      <form
        id="company-contact-form"
        key={contact ? "edit-contact" : "new-contact"}
        onSubmit={handleSubmit}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {errorMessage && (
          <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Name *
          </label>
          <input
            name="name"
            className="input-base"
            defaultValue={contact?.name ?? ""}
            placeholder="e.g. Priya Sharma"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Designation
          </label>
          <input
            name="designation"
            className="input-base"
            defaultValue={contact?.designation ?? ""}
            placeholder="e.g. Talent Acquisition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <input
            name="email"
            className="input-base"
            type="email"
            defaultValue={contact?.email ?? ""}
            placeholder="name@company.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Phone
          </label>
          <input
            name="phone"
            className="input-base"
            defaultValue={contact?.phone ?? ""}
            placeholder="+91 98xxxxxx"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            LinkedIn
          </label>
          <input
            name="linkedin"
            className="input-base"
            defaultValue={contact?.linkedin ?? ""}
            placeholder="linkedin.com/in/..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Preferred Method
          </label>
          <select
            name="preferredMethod"
            className="input-base"
            defaultValue={contact?.preferredMethod ?? "email"}
          >
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="linkedin">LinkedIn</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            className="input-base"
            rows={3}
            defaultValue={contact?.notes ?? ""}
            placeholder="Context, follow-ups, and communication preferences"
          />
        </div>
      </form>
    </Modal>
  );
}
