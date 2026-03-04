export enum Designation {
    TELEMARKETER = "telemarketer",
    TEAM_LEADER = "team_leader",
    HR_EXECUTIVE = "hr_executive",
    SOFTWARE_ENGINEER = "software_engineer",
    QUALITY_ASSURANCE = "quality_assurance",
    GRAPHIC_DESIGNER = "graphic_designer",
    PHOTO_EDITOR = "photo_editor",
    VIDEO_EDITOR = "video_editor",
    ADMINISTRATIVE_ASSISTANT = "administrative_assistant",
    OFFICE_BOY = "office_boy",
    OTHER = "other",
}

export const DESIGNATION_LABELS: Record<Designation, string> = {
    [Designation.TELEMARKETER]: "Telemarketer",
    [Designation.TEAM_LEADER]: "Team Leader",
    [Designation.HR_EXECUTIVE]: "HR Executive",
    [Designation.SOFTWARE_ENGINEER]: "Software Engineer",
    [Designation.QUALITY_ASSURANCE]: "Quality Assurance",
    [Designation.GRAPHIC_DESIGNER]: "Graphic Designer",
    [Designation.PHOTO_EDITOR]: "Photo Editor",
    [Designation.VIDEO_EDITOR]: "Video Editor",
    [Designation.ADMINISTRATIVE_ASSISTANT]: "Administrative Assistant",
    [Designation.OFFICE_BOY]: "Office Boy",
    [Designation.OTHER]: "Other",
};
