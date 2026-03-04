export enum Department {
    PRODUCTION = "production",
    MARKETING = "marketing",
    SALES = "sales",
    HR = "hr",
    ADMINISTRATION = "administration",
    IT = "it",
    FINANCE = "finance",
    OTHER = "other",
}

export const DEPARTMENT_LABELS: Record<Department, string> = {
    [Department.PRODUCTION]: "Production",
    [Department.MARKETING]: "Marketing",
    [Department.SALES]: "Sales",
    [Department.HR]: "Human Resources",
    [Department.ADMINISTRATION]: "Administration",
    [Department.IT]: "Information Technology",
    [Department.FINANCE]: "Finance",
    [Department.OTHER]: "Other",
};
