export type UserRole = "admin" | "supervisor";
export type InspectionStatus = "draft" | "submitted";
export type ResponseStatus = "ok" | "problem" | "na";
export type ChecklistItemType = "ok_problem" | "temperature" | "text";

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
};

export type Branch = {
  id: string;
  name: string;
  address: string;
  city: string;
  active: boolean;
  created_at: string;
};

export type BranchSupervisor = {
  branch_id: string;
  user_id: string;
};

export type ChecklistSection = {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  active: boolean;
};

export type ChecklistItem = {
  id: string;
  section_id: string;
  label: string;
  item_type: ChecklistItemType;
  unit: string;
  min_value: number | null;
  max_value: number | null;
  requires_photo_on_problem: boolean;
  sort_order: number;
  active: boolean;
};

export type Inspection = {
  id: string;
  branch_id: string;
  supervisor_id: string;
  status: InspectionStatus;
  general_notes: string;
  started_at: string;
  submitted_at: string | null;
};

export type InspectionResponse = {
  id: string;
  inspection_id: string;
  checklist_item_id: string;
  status: ResponseStatus | null;
  value: number | null;
  notes: string;
  photo_path: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      branches: {
        Row: Branch;
        Insert: Partial<Branch>;
        Update: Partial<Branch>;
        Relationships: [];
      };
      branch_supervisors: {
        Row: BranchSupervisor;
        Insert: BranchSupervisor;
        Update: Partial<BranchSupervisor>;
        Relationships: [
          {
            foreignKeyName: "branch_supervisors_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "branch_supervisors_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      checklist_sections: {
        Row: ChecklistSection;
        Insert: Partial<ChecklistSection>;
        Update: Partial<ChecklistSection>;
        Relationships: [];
      };
      checklist_items: {
        Row: ChecklistItem;
        Insert: Partial<ChecklistItem>;
        Update: Partial<ChecklistItem>;
        Relationships: [
          {
            foreignKeyName: "checklist_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "checklist_sections";
            referencedColumns: ["id"];
          },
        ];
      };
      inspections: {
        Row: Inspection;
        Insert: Partial<Inspection>;
        Update: Partial<Inspection>;
        Relationships: [
          {
            foreignKeyName: "inspections_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspections_supervisor_id_fkey";
            columns: ["supervisor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      inspection_responses: {
        Row: InspectionResponse;
        Insert: Partial<InspectionResponse>;
        Update: Partial<InspectionResponse>;
        Relationships: [
          {
            foreignKeyName: "inspection_responses_inspection_id_fkey";
            columns: ["inspection_id"];
            isOneToOne: false;
            referencedRelation: "inspections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspection_responses_checklist_item_id_fkey";
            columns: ["checklist_item_id"];
            isOneToOne: false;
            referencedRelation: "checklist_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspection_responses_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
