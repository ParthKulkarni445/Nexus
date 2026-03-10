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

export default function ContactModal({
  isOpen,
  onClose,
  contact,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  contact: CompanyContact | null;
  title?: string;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title ?? (contact ? "Edit Contact" : "Add Contact")}
      size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            {contact ? "Save Changes" : "Add Contact"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              defaultValue={contact?.name}
              className="input-base"
              placeholder="e.g. Neha Joshi"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Designation
            </label>
            <input
              defaultValue={contact?.designation}
              className="input-base"
              placeholder="e.g. HR Business Partner"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              defaultValue={contact?.email}
              className="input-base"
              placeholder="name@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              defaultValue={contact?.phone}
              className="input-base"
              placeholder="+91 98xxx xxxxx"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              LinkedIn URL
            </label>
            <input
              defaultValue={contact?.linkedin}
              className="input-base"
              placeholder="linkedin.com/in/..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Preferred Contact Method
            </label>
            <select
              defaultValue={contact?.preferredMethod}
              className="input-base"
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            rows={2}
            className="input-base"
            defaultValue={contact?.notes}
            placeholder="Any notes about this contact..."
          />
        </div>
      </div>
    </Modal>
  );
}
