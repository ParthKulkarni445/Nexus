export type PredefinedTemplateVariable = {
  key: string;
  label: string;
  aliases: string[];
  description: string;
};

export type AutoTemplateVariableValues = {
  companyName?: string | null;
  hrName?: string | null;
  spocName?: string | null;
  spocContact?: string | null;
  spocMail?: string | null;
};

export const PREDEFINED_TEMPLATE_VARIABLES: PredefinedTemplateVariable[] = [
  {
    key: "company_name",
    label: "Company Name",
    aliases: ["company_name", "company name"],
    description: "Auto-filled from the selected company.",
  },
  {
    key: "hr_name",
    label: "HR Name",
    aliases: ["hr_name", "hr name"],
    description: "Auto-filled from the selected contact.",
  },
  {
    key: "spoc_name",
    label: "SPOC Name",
    aliases: ["spoc_name", "spoc name"],
    description: "Auto-filled from the logged-in coordinator.",
  },
  {
    key: "spoc_contact",
    label: "SPOC Contact",
    aliases: ["spoc_contact", "spoc contact"],
    description: "Auto-filled when a TPO phone/contact is configured.",
  },
  {
    key: "spoc_mail",
    label: "SPOC Mail (TPO)",
    aliases: [
      "spoc_mail",
      "spoc mail",
      "spoc email",
      "tpo_mail",
      "tpo mail",
      "tpo_email",
      "tpo email",
    ],
    description: "Auto-filled from the shared TPO sender mailbox.",
  },
];

function normalizeVariableName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function getPredefinedTemplateVariable(variableName: string) {
  const normalizedName = normalizeVariableName(variableName);

  return (
    PREDEFINED_TEMPLATE_VARIABLES.find((variable) =>
      [variable.key, ...variable.aliases].some(
        (alias) => normalizeVariableName(alias) === normalizedName,
      ),
    ) ?? null
  );
}

export function buildAutoTemplateVariableMap(
  values: AutoTemplateVariableValues,
) {
  return {
    company_name: values.companyName?.trim() ?? "",
    hr_name: values.hrName?.trim() ?? "",
    spoc_name: values.spocName?.trim() ?? "",
    spoc_contact: values.spocContact?.trim() ?? "",
    spoc_mail: values.spocMail?.trim() ?? "",
  };
}

export function resolveTemplateVariableValue(
  variableName: string,
  autoValues: AutoTemplateVariableValues,
) {
  const predefined = getPredefinedTemplateVariable(variableName);
  if (!predefined) {
    return {
      predefined: null,
      autoValue: "",
      autoFilled: false,
    };
  }

  const autoValueMap = buildAutoTemplateVariableMap(autoValues);
  const autoValue = autoValueMap[predefined.key as keyof typeof autoValueMap] ?? "";

  return {
    predefined,
    autoValue,
    autoFilled: Boolean(autoValue),
  };
}

export function appendTemplateVariables(
  currentValue: string,
  variablesToAdd: string[],
) {
  const items = currentValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const normalizedItems = new Set(items.map((item) => item.toLowerCase()));

  for (const variable of variablesToAdd) {
    const trimmed = variable.trim();
    if (!trimmed) continue;
    const normalized = trimmed.toLowerCase();
    if (normalizedItems.has(normalized)) continue;
    items.push(trimmed);
    normalizedItems.add(normalized);
  }

  return items.join(", ");
}
