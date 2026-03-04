// Centralized constants for designations and departments
// These replace the dynamic Metadata model

export const DESIGNATIONS = [
    { value: "telemarketer", label: "Telemarketer" },
    { value: "team_leader", label: "Team Leader" },
    { value: "hr_executive", label: "HR Executive" },
    { value: "software_engineer", label: "Software Engineer" },
    { value: "quality_assurance", label: "Quality Assurance" },
    { value: "graphic_designer", label: "Graphic Designer" },
    { value: "photo_editor", label: "Photo Editor" },
    { value: "video_editor", label: "Video Editor" },
    { value: "administrative_assistant", label: "Administrative Assistant" },
    { value: "office_boy", label: "Office Boy" },
    { value: "other", label: "Other" },
] as const;

export const DEPARTMENTS = [
    { value: "production", label: "Production" },
    { value: "marketing", label: "Marketing" },
    { value: "sales", label: "Sales" },
    { value: "hr", label: "Human Resources" },
    { value: "administration", label: "Administration" },
    { value: "it", label: "Information Technology" },
    { value: "finance", label: "Finance" },
    { value: "other", label: "Other" },
] as const;
